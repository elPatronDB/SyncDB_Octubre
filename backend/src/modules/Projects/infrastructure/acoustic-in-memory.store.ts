import {
    type AcousticFrame,
    type DeviceAcousticState,
    type ProjectAcousticAggregate,
    type PARecommendation,
    ISO_THIRD_OCTAVE_FREQUENCIES,
} from "../domain/acoustic.entity.js";
import type { DeviceEntity } from "../domain/device.entity.js";

type SSESubscriber = (eventType: string, data: any) => void;

const STALE_FRAME_THRESHOLD_MS = 5000; // Frames older than 5s are considered stale
const ALPHA_TEMPORAL_AVG = 0.15;      // Exponential moving average factor in energy domain

export class AcousticInMemoryStore {
    private static instance: AcousticInMemoryStore;

    // projectId -> (deviceId -> DeviceAcousticState)
    private projectDevices: Map<string, Map<string, DeviceAcousticState>> = new Map();

    // projectId -> ProjectAcousticAggregate
    private projectAggregates: Map<string, ProjectAcousticAggregate> = new Map();

    // projectId -> Set<SSESubscriber>
    private subscribers: Map<string, Set<SSESubscriber>> = new Map();

    // Running aggregate peak and avg per project
    private projectGlobalPeaks: Map<string, number[]> = new Map();
    private projectGlobalAvgs: Map<string, number[]> = new Map();

    private constructor() {}

    public static getInstance(): AcousticInMemoryStore {
        if (!AcousticInMemoryStore.instance) {
            AcousticInMemoryStore.instance = new AcousticInMemoryStore();
        }
        return AcousticInMemoryStore.instance;
    }

    public subscribe(projectId: string, callback: SSESubscriber): () => void {
        if (!this.subscribers.has(projectId)) {
            this.subscribers.set(projectId, new Set());
        }
        this.subscribers.get(projectId)!.add(callback);

        return () => {
            const subs = this.subscribers.get(projectId);
            if (subs) {
                subs.delete(callback);
                if (subs.size === 0) {
                    this.subscribers.delete(projectId);
                }
            }
        };
    }

    private broadcast(projectId: string, eventType: string, data: any): void {
        const subs = this.subscribers.get(projectId);
        if (subs && subs.size > 0) {
            subs.forEach((cb) => {
                try {
                    cb(eventType, data);
                } catch {
                    // Ignore closed connection errors
                }
            });
        }
    }

    public updateDeviceFrame(frame: AcousticFrame, device: DeviceEntity): void {
        const { projectId, deviceId } = frame;

        if (!this.projectDevices.has(projectId)) {
            this.projectDevices.set(projectId, new Map());
        }

        const deviceMap = this.projectDevices.get(projectId)!;
        let state = deviceMap.get(deviceId);

        if (!state) {
            state = {
                deviceId,
                projectId,
                deviceName: device.name || (device.isAnchor ? 'Ancla' : 'Sonda Acústica'),
                role: device.role,
                isAnchor: device.isAnchor,
                isOnline: true,
                isMicActive: frame.isMicActive,
                isCalibrated: device.calibrationOffsetDb !== 0 || frame.isCalibrated,
                calibrationOffsetDb: device.calibrationOffsetDb || frame.calibrationOffsetDb || 0,
                sampleRate: frame.sampleRate,
                nyquist: frame.nyquist,
                lastSeenAcoustic: frame.timestamp,
                latestFrame: frame,
                peakHoldCurve: [...frame.bands],
                avgCurve: [...frame.bands],
                historyFramesCount: 1,
            };
            deviceMap.set(deviceId, state);
        } else {
            state.isOnline = true;
            state.isMicActive = frame.isMicActive;
            state.sampleRate = frame.sampleRate;
            state.nyquist = frame.nyquist;
            state.lastSeenAcoustic = frame.timestamp;
            state.latestFrame = frame;
            state.historyFramesCount += 1;
            state.calibrationOffsetDb = device.calibrationOffsetDb || frame.calibrationOffsetDb || state.calibrationOffsetDb;
            state.isCalibrated = state.calibrationOffsetDb !== 0 || frame.isCalibrated;

            if (frame.isMicActive && frame.bands && frame.bands.length > 0) {
                // Update running peak hold curve
                for (let i = 0; i < frame.bands.length; i++) {
                    const currentVal = frame.bands[i] ?? -100;
                    const prevPeak = state.peakHoldCurve[i] ?? -100;
                    state.peakHoldCurve[i] = Math.max(prevPeak, currentVal);

                    // Running energy average
                    const prevAvg = state.avgCurve[i] ?? -100;
                    const curLinearPower = Math.pow(10, currentVal / 10);
                    const prevLinearPower = Math.pow(10, prevAvg / 10);
                    const newLinearPower = ALPHA_TEMPORAL_AVG * curLinearPower + (1 - ALPHA_TEMPORAL_AVG) * prevLinearPower;
                    state.avgCurve[i] = 10 * Math.log10(Math.max(1e-10, newLinearPower));
                }
            }
        }

        // Broadcast individual frame
        this.broadcast(projectId, 'acoustic:frame', {
            deviceId,
            frame,
            state: {
                deviceId: state.deviceId,
                isMicActive: state.isMicActive,
                peakHoldCurve: state.peakHoldCurve,
                avgCurve: state.avgCurve,
                lastSeenAcoustic: state.lastSeenAcoustic,
                isCalibrated: state.isCalibrated,
                calibrationOffsetDb: state.calibrationOffsetDb,
            },
        });

        // Compute and broadcast updated project aggregate
        const aggregate = this.computeProjectAggregate(projectId);
        this.broadcast(projectId, 'project:aggregate', aggregate);
    }

    public computeProjectAggregate(projectId: string): ProjectAcousticAggregate {
        const deviceMap = this.projectDevices.get(projectId);
        const now = Date.now();

        if (!deviceMap || deviceMap.size === 0) {
            const emptyAgg: ProjectAcousticAggregate = {
                projectId,
                timestamp: now,
                activeDeviceCount: 0,
                contributingDevices: [],
                currentSpectrum: new Array(31).fill(-100),
                peakSpectrum: new Array(31).fill(-100),
                avgSpectrum: new Array(31).fill(-100),
                overallRmsDb: -100,
                overallSplDb: null,
                recommendations: [],
            };
            this.projectAggregates.set(projectId, emptyAgg);
            return emptyAgg;
        }

        const contributing: DeviceAcousticState[] = [];

        deviceMap.forEach((dev) => {
            const isRecent = dev.lastSeenAcoustic && (now - dev.lastSeenAcoustic) < STALE_FRAME_THRESHOLD_MS;
            if (isRecent && dev.isMicActive && dev.latestFrame && dev.latestFrame.bands?.length === 31) {
                contributing.push(dev);
            }
        });

        const numContributing = contributing.length;

        if (numContributing === 0) {
            const prev = this.projectAggregates.get(projectId);
            const emptyAgg: ProjectAcousticAggregate = {
                projectId,
                timestamp: now,
                activeDeviceCount: 0,
                contributingDevices: [],
                currentSpectrum: prev ? prev.currentSpectrum : new Array(31).fill(-100),
                peakSpectrum: prev ? prev.peakSpectrum : new Array(31).fill(-100),
                avgSpectrum: prev ? prev.avgSpectrum : new Array(31).fill(-100),
                overallRmsDb: -100,
                overallSplDb: null,
                recommendations: [],
            };
            this.projectAggregates.set(projectId, emptyAgg);
            return emptyAgg;
        }

        // Energy averaging across contributing devices:
        // L_prom = 10 * log10( 1/N * sum( 10^(L_i / 10) ) )
        const currentSpectrum = new Array(31).fill(0);
        let rmsSumLinear = 0;
        let splSumLinear = 0;
        let calibratedCount = 0;

        for (let b = 0; b < 31; b++) {
            let bandEnergySum = 0;
            for (let i = 0; i < numContributing; i++) {
                const bandVal = contributing[i]!.latestFrame!.bands[b] ?? -100;
                bandEnergySum += Math.pow(10, bandVal / 10);
            }
            const meanEnergy = bandEnergySum / numContributing;
            currentSpectrum[b] = 10 * Math.log10(Math.max(1e-10, meanEnergy));
        }

        for (let i = 0; i < numContributing; i++) {
            const f = contributing[i]!.latestFrame!;
            rmsSumLinear += Math.pow(10, f.rmsDb / 10);
            if (f.splDb !== null && f.isCalibrated) {
                splSumLinear += Math.pow(10, f.splDb / 10);
                calibratedCount++;
            }
        }

        const overallRmsDb = 10 * Math.log10(Math.max(1e-10, rmsSumLinear / numContributing));
        const overallSplDb = calibratedCount > 0
            ? 10 * Math.log10(Math.max(1e-10, splSumLinear / calibratedCount))
            : null;

        // Running global peaks & avgs
        if (!this.projectGlobalPeaks.has(projectId)) {
            this.projectGlobalPeaks.set(projectId, [...currentSpectrum]);
            this.projectGlobalAvgs.set(projectId, [...currentSpectrum]);
        }

        const globalPeaks = this.projectGlobalPeaks.get(projectId)!;
        const globalAvgs = this.projectGlobalAvgs.get(projectId)!;

        for (let b = 0; b < 31; b++) {
            globalPeaks[b] = Math.max(globalPeaks[b] ?? -100, currentSpectrum[b]!);
            const curEnergy = Math.pow(10, currentSpectrum[b]! / 10);
            const prevEnergy = Math.pow(10, (globalAvgs[b] ?? -100) / 10);
            const newEnergy = ALPHA_TEMPORAL_AVG * curEnergy + (1 - ALPHA_TEMPORAL_AVG) * prevEnergy;
            globalAvgs[b] = 10 * Math.log10(Math.max(1e-10, newEnergy));
        }

        // Generate PA Calibration & Equalization Recommendations
        const recommendations = this.generatePARecommendations(currentSpectrum, globalAvgs, contributing);

        const aggregate: ProjectAcousticAggregate = {
            projectId,
            timestamp: now,
            activeDeviceCount: numContributing,
            contributingDevices: contributing.map((d) => d.deviceId),
            currentSpectrum,
            peakSpectrum: [...globalPeaks],
            avgSpectrum: [...globalAvgs],
            overallRmsDb,
            overallSplDb,
            recommendations,
        };

        this.projectAggregates.set(projectId, aggregate);
        return aggregate;
    }

    /**
     * Algoritmo de análisis acústico y generación fundamentada de recomendaciones para PA:
     * - Detección de resonancias y picos acústicos estrechos.
     * - Detección de valles o cancelaciones acústicas por fase/modos de sala.
     * - Exceso de energía subsónica o acumulación en bajas frecuencias.
     * - Falta de inteligibilidad o aspereza en altas frecuencias.
     * - Consistencia espacial entre diferentes dispositivos.
     */
    private generatePARecommendations(
        current: number[],
        avg: number[],
        devices: DeviceAcousticState[]
    ): PARecommendation[] {
        const recommendations: PARecommendation[] = [];
        if (devices.length === 0) return recommendations;

        // Calcular nivel medio de referencia en la banda de inteligibilidad vocal (500 Hz a 2000 Hz)
        // Índices en ISO_THIRD_OCTAVE_FREQUENCIES:
        // 500Hz: index 14, 630: 15, 800: 16, 1000: 17, 1250: 18, 1600: 19, 2000: 20
        let vocalEnergy = 0;
        let vocalCount = 0;
        for (let i = 14; i <= 20; i++) {
            if (avg[i] !== undefined && avg[i]! > -90) {
                vocalEnergy += Math.pow(10, avg[i]! / 10);
                vocalCount++;
            }
        }
        const refMidDb = vocalCount > 0 ? 10 * Math.log10(vocalEnergy / vocalCount) : -40;

        // 1. Análisis de Resonancias / Picos Modales (Q estrecho, ganancia negativa sugerida)
        for (let i = 1; i < 30; i++) {
            const freq = ISO_THIRD_OCTAVE_FREQUENCIES[i]!;
            const centerLvl = avg[i] ?? -100;
            const leftLvl = avg[i - 1] ?? -100;
            const rightLvl = avg[i + 1] ?? -100;

            const neighborAvg = (leftLvl + rightLvl) / 2;
            const prominence = centerLvl - neighborAvg;
            const deltaRef = centerLvl - refMidDb;

            // Pico prominente (> 5 dB sobre vecinos y > 4 dB sobre referencia de medios)
            if (prominence >= 4.5 && deltaRef >= 4.0 && centerLvl > -75) {
                const suggestedCut = -Math.min(7.0, Math.max(2.0, Math.round((prominence * 0.75) * 10) / 10));
                const q = Math.round((freq / 60) * 10) / 10;
                const safeQ = Math.min(6.0, Math.max(2.5, q));

                recommendations.push({
                    id: `peak_${freq}`,
                    filterType: prominence > 7.0 ? 'NOTCH' : 'PEQ_BELL',
                    centerFreq: freq,
                    gainDb: suggestedCut,
                    qFactor: safeQ,
                    bandwidthOctaves: Math.round((1 / safeQ) * 100) / 100,
                    bandName: `${freq >= 1000 ? (freq / 1000) + ' kHz' : freq + ' Hz'}`,
                    reason: `Resonancia modal acústica persistente detectada con prominencia de +${prominence.toFixed(1)} dB sobre las bandas colindantes.`,
                    confidence: devices.length >= 2 ? 'HIGH' : 'MEDIUM',
                    affectedDevicesCount: devices.length,
                    warning: prominence > 8
                        ? 'Resonancia severa en el recinto. Verificar modos de onda estacionaria antes de atenuar drásticamente.'
                        : null,
                });
            }
        }

        // 2. Análisis de Acumulación Subsónica / Rumble en Graves (< 50 Hz)
        const subBassAvg = ((avg[0] ?? -100) + (avg[1] ?? -100) + (avg[2] ?? -100)) / 3;
        if (subBassAvg > refMidDb + 7 && subBassAvg > -70) {
            recommendations.push({
                id: 'hpf_subbass',
                filterType: 'HIGH_PASS',
                centerFreq: 35,
                gainDb: -12,
                qFactor: 0.71,
                bandwidthOctaves: 1.0,
                bandName: 'Filtro Pasa-Altos (HPF / Low Cut)',
                reason: 'Energía subsónica excesiva (< 40 Hz) que consume potencia innecesaria en amplificadores y sobre-excursiona conos de altavoces sin aportar musicalidad.',
                confidence: 'HIGH',
                affectedDevicesCount: devices.length,
                warning: 'Activación recomendada de filtro paso-altos (Butterworth 18dB/oct a 35 Hz) en DSP o procesador de PA.',
            });
        }

        // 3. Análisis de Valles / Posible Cancelación Acústica
        for (let i = 2; i < 28; i++) {
            const freq = ISO_THIRD_OCTAVE_FREQUENCIES[i]!;
            const centerLvl = avg[i] ?? -100;
            const leftLvl = avg[i - 1] ?? -100;
            const rightLvl = avg[i + 1] ?? -100;
            const neighborAvg = (leftLvl + rightLvl) / 2;
            const dip = neighborAvg - centerLvl;

            if (dip >= 6.0 && centerLvl < refMidDb - 5.0 && centerLvl > -85) {
                recommendations.push({
                    id: `dip_${freq}`,
                    filterType: 'PEQ_BELL',
                    centerFreq: freq,
                    gainDb: Math.min(2.5, Math.round((dip * 0.3) * 10) / 10), // Boost seguro limitado a máx +2.5 dB
                    qFactor: 2.0,
                    bandwidthOctaves: 0.7,
                    bandName: `${freq >= 1000 ? (freq / 1000) + ' kHz' : freq + ' Hz'}`,
                    reason: `Caída pronunciada de -${dip.toFixed(1)} dB. Probable cancelación de fase acústica (filtro peine o reflexión en límites).`,
                    confidence: 'CAUTION',
                    affectedDevicesCount: devices.length,
                    warning: 'ADVERTENCIA: No apliques un aumento excesivo de ganancia con ecualizador si se debe a una cancelación física de fase o desalineación de cajas acústicas.',
                });
            }
        }

        // 4. Verificación de Varianza Espacial (si hay 2 o más dispositivos)
        if (devices.length >= 2) {
            let maxVarianceBand = 0;
            let maxVarianceFreq = 1000;
            for (let b = 5; b < 25; b++) {
                const values = devices.map((d) => d.latestFrame?.bands[b] ?? -100).filter((v) => v > -90);
                if (values.length >= 2) {
                    const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
                    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
                    const stdDev = Math.sqrt(variance);
                    if (stdDev > maxVarianceBand) {
                        maxVarianceBand = stdDev;
                        maxVarianceFreq = ISO_THIRD_OCTAVE_FREQUENCIES[b]!;
                    }
                }
            }

            if (maxVarianceBand >= 6.0) {
                recommendations.push({
                    id: 'spatial_variance',
                    filterType: 'LOW_SHELF',
                    centerFreq: maxVarianceFreq,
                    gainDb: 0,
                    qFactor: 1.0,
                    bandwidthOctaves: 1.0,
                    bandName: `Dispersión Espacial (${maxVarianceFreq} Hz)`,
                    reason: `Desviación acústica de ±${maxVarianceBand.toFixed(1)} dB entre las distintas posiciones de los dispositivos. Cobertura acústica no homogénea en el recinto.`,
                    confidence: 'MEDIUM',
                    affectedDevicesCount: devices.length,
                    warning: 'Revisar apuntamiento físico, cobertura angular de las bocinas PA o retardos (delay) de cajas auxiliares antes de ecualizar.',
                });
            }
        }

        return recommendations.slice(0, 8); // Top 8 most critical actionable recommendations
    }

    public getSnapshot(projectId: string): {
        aggregate: ProjectAcousticAggregate;
        devices: DeviceAcousticState[];
    } {
        const aggregate = this.computeProjectAggregate(projectId);
        const deviceMap = this.projectDevices.get(projectId);
        const devices = deviceMap ? Array.from(deviceMap.values()) : [];

        return {
            aggregate,
            devices,
        };
    }

    public resetPeaksAndAverages(projectId: string): void {
        this.projectGlobalPeaks.delete(projectId);
        this.projectGlobalAvgs.delete(projectId);

        const deviceMap = this.projectDevices.get(projectId);
        if (deviceMap) {
            deviceMap.forEach((dev) => {
                if (dev.latestFrame && dev.latestFrame.bands) {
                    dev.peakHoldCurve = [...dev.latestFrame.bands];
                    dev.avgCurve = [...dev.latestFrame.bands];
                }
            });
        }

        const aggregate = this.computeProjectAggregate(projectId);
        this.broadcast(projectId, 'project:aggregate', aggregate);
    }
}
