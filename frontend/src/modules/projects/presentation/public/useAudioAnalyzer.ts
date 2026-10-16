import { useState, useRef, useCallback, useEffect } from 'react';
import { ISO_THIRD_OCTAVE_FREQUENCIES } from '../../domain/acoustic.types';
import { sendAcousticFrame } from '../../infrastructure/services/acoustic.service';

export type MicStatus = 'IDLE' | 'REQUESTING_PERMISSION' | 'ACTIVE' | 'DENIED' | 'UNSUPPORTED' | 'ERROR';

export interface UseAudioAnalyzerOptions {
    deviceToken?: string | null;
    initialCalibrationOffsetDb?: number;
    transmitIntervalMs?: number; // Default 250ms (4 fps)
}

export interface UseAudioAnalyzerReturn {
    isCapturing: boolean;
    status: MicStatus;
    errorMessage: string | null;
    sampleRate: number;
    nyquist: number;
    fftSize: number;
    rmsDb: number;
    splDb: number | null;
    peakFreq: number;
    bands: number[];
    spectrum: number[];
    peakHoldCurve: number[];
    avgCurve: number[];
    calibrationOffsetDb: number;
    isCalibrated: boolean;
    startCapture: () => Promise<void>;
    stopCapture: () => void;
    setCalibrationOffset: (offset: number) => void;
    resetCurves: () => void;
}

export const useAudioAnalyzer = (options: UseAudioAnalyzerOptions = {}): UseAudioAnalyzerReturn => {
    const {
        deviceToken,
        initialCalibrationOffsetDb = 0,
        transmitIntervalMs = 250,
    } = options;

    const [isCapturing, setIsCapturing] = useState<boolean>(false);
    const [status, setStatus] = useState<MicStatus>('IDLE');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [sampleRate, setSampleRate] = useState<number>(44100);
    const [nyquist, setNyquist] = useState<number>(22050);
    const fftSize = 2048;

    const [rmsDb, setRmsDb] = useState<number>(-100);
    const [splDb, setSplDb] = useState<number | null>(null);
    const [peakFreq, setPeakFreq] = useState<number>(0);
    const [bands, setBands] = useState<number[]>(() => new Array(31).fill(-100));
    const [spectrum, setSpectrum] = useState<number[]>(() => new Array(64).fill(-100));
    const [peakHoldCurve, setPeakHoldCurve] = useState<number[]>(() => new Array(31).fill(-100));
    const [avgCurve, setAvgCurve] = useState<number[]>(() => new Array(31).fill(-100));

    const [calibrationOffsetDb, setCalibrationOffsetDb] = useState<number>(initialCalibrationOffsetDb);

    // Audio Context References
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const lastTransmitTimeRef = useRef<number>(0);

    // Peak and Average tracking refs
    const localPeakCurveRef = useRef<number[]>(new Array(31).fill(-100));
    const localAvgCurveRef = useRef<number[]>(new Array(31).fill(-100));

    const isCalibrated = calibrationOffsetDb !== 0;

    const resetCurves = useCallback(() => {
        localPeakCurveRef.current = new Array(31).fill(-100);
        localAvgCurveRef.current = new Array(31).fill(-100);
        setPeakHoldCurve(new Array(31).fill(-100));
        setAvgCurve(new Array(31).fill(-100));
    }, []);

    const stopCapture = useCallback(() => {
        if (animFrameRef.current !== null) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }

        if (sourceNodeRef.current) {
            sourceNodeRef.current.disconnect();
            sourceNodeRef.current = null;
        }

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }

        setIsCapturing(false);
        setStatus('IDLE');

        // Transmit final frame indicating mic stopped
        if (deviceToken) {
            sendAcousticFrame({
                deviceToken,
                timestamp: Date.now(),
                sampleRate,
                nyquist,
                fftSize,
                rmsDb: -100,
                peakFreq: 0,
                bands: new Array(31).fill(-100),
                spectrum: new Array(64).fill(-100),
                isMicActive: false,
                calibrationOffsetDb,
            }).catch(() => {});
        }
    }, [deviceToken, sampleRate, nyquist, fftSize, calibrationOffsetDb]);

    const startCapture = useCallback(async () => {
        if (isCapturing) return;

        // Security check for mediaDevices
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setStatus('UNSUPPORTED');
            setErrorMessage('El navegador no soporta captura de audio o requiere contexto seguro (HTTPS).');
            return;
        }

        try {
            setStatus('REQUESTING_PERMISSION');
            setErrorMessage(null);

            // Request raw audio without distortion filters where possible
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                    },
                });
            } catch {
                // Fallback to basic audio constraint if specific constraints are rejected
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }

            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtxClass) {
                setStatus('UNSUPPORTED');
                setErrorMessage('Web Audio API no soportada en este dispositivo.');
                return;
            }

            const ctx = new AudioCtxClass();
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            const analyser = ctx.createAnalyser();
            analyser.fftSize = fftSize;
            analyser.smoothingTimeConstant = 0.25;
            analyser.minDecibels = -100;
            analyser.maxDecibels = 0;

            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);

            audioContextRef.current = ctx;
            mediaStreamRef.current = stream;
            sourceNodeRef.current = source;
            analyserRef.current = analyser;

            const curSampleRate = ctx.sampleRate;
            const curNyquist = curSampleRate / 2;

            setSampleRate(curSampleRate);
            setNyquist(curNyquist);
            setIsCapturing(true);
            setStatus('ACTIVE');

            // Handle track ending (e.g. mic unplugged or permission revoked)
            stream.getAudioTracks().forEach((track) => {
                track.onended = () => {
                    stopCapture();
                    setStatus('ERROR');
                    setErrorMessage('El micrófono se ha desconectado o el permiso ha sido revocado.');
                };
            });

            // Buffer setup
            const binCount = analyser.frequencyBinCount; // 1024 bins
            const freqData = new Float32Array(binCount);
            const timeData = new Float32Array(binCount);
            const binWidth = curSampleRate / fftSize;

            const processLoop = () => {
                if (!analyserRef.current || !audioContextRef.current) return;

                analyserRef.current.getFloatFrequencyData(freqData);
                analyserRef.current.getFloatTimeDomainData(timeData);

                // 1. Compute true RMS from time domain
                let sumSquares = 0;
                for (let i = 0; i < timeData.length; i++) {
                    const sample = timeData[i] ?? 0;
                    sumSquares += sample * sample;
                }
                const rawRms = Math.sqrt(sumSquares / timeData.length);
                const curRmsDb = rawRms > 1e-5 ? 20 * Math.log10(rawRms) : -100;
                const clampedRmsDb = Math.max(-100, Math.min(0, curRmsDb));

                // 2. Compute 31 ISO 1/3-octave bands
                const newBands = new Array(31).fill(-100);
                for (let b = 0; b < 31; b++) {
                    const fc = ISO_THIRD_OCTAVE_FREQUENCIES[b]!;

                    // If above Nyquist, cannot measure
                    if (fc > curNyquist) {
                        newBands[b] = -100;
                        continue;
                    }

                    const fLow = fc * Math.pow(2, -1 / 6);
                    const fHigh = fc * Math.pow(2, 1 / 6);

                    const binStart = Math.max(0, Math.floor(fLow / binWidth));
                    const binEnd = Math.min(binCount - 1, Math.ceil(fHigh / binWidth));

                    let bandPower = 0;
                    let count = 0;
                    for (let bin = binStart; bin <= binEnd; bin++) {
                        const valDb = freqData[bin] ?? -100;
                        if (valDb > -120) {
                            bandPower += Math.pow(10, valDb / 10);
                            count++;
                        }
                    }

                    if (count > 0 && bandPower > 1e-10) {
                        newBands[b] = Math.max(-100, Math.min(0, 10 * Math.log10(bandPower / count)));
                    } else {
                        newBands[b] = -100;
                    }
                }

                // 3. Compute 64 log-spaced spectrum points for fine rendering
                const newSpectrum = new Array(64).fill(-100);
                const minF = 20;
                const maxF = Math.min(20000, curNyquist);
                for (let s = 0; s < 64; s++) {
                    const logF = minF * Math.pow(maxF / minF, s / 63);
                    const bin = Math.min(binCount - 1, Math.round(logF / binWidth));
                    newSpectrum[s] = Math.max(-100, Math.min(0, freqData[bin] ?? -100));
                }

                // 4. Find dominant peak frequency with parabolic interpolation
                let maxBinVal = -150;
                let maxBinIdx = 0;
                for (let i = 1; i < binCount - 1; i++) {
                    const v = freqData[i] ?? -150;
                    if (v > maxBinVal) {
                        maxBinVal = v;
                        maxBinIdx = i;
                    }
                }

                let dominantFreq = 0;
                if (maxBinVal > -80 && maxBinIdx > 0 && maxBinIdx < binCount - 1) {
                    const alpha = freqData[maxBinIdx - 1] ?? maxBinVal;
                    const beta = maxBinVal;
                    const gamma = freqData[maxBinIdx + 1] ?? maxBinVal;
                    const delta = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma || 1);
                    dominantFreq = Math.round((maxBinIdx + delta) * binWidth);
                }

                // 5. Update Peak Hold and Running Temporal Average
                const curPeaks = localPeakCurveRef.current;
                const curAvgs = localAvgCurveRef.current;
                const alphaAvg = 0.12;

                for (let b = 0; b < 31; b++) {
                    const v = newBands[b] ?? -100;
                    curPeaks[b] = Math.max(curPeaks[b] ?? -100, v);

                    const prevAvg = curAvgs[b] ?? -100;
                    const curPower = Math.pow(10, v / 10);
                    const prevPower = Math.pow(10, prevAvg / 10);
                    const newPower = alphaAvg * curPower + (1 - alphaAvg) * prevPower;
                    curAvgs[b] = 10 * Math.log10(Math.max(1e-10, newPower));
                }

                // Update component state
                setRmsDb(clampedRmsDb);
                setSplDb(calibrationOffsetDb !== 0 ? clampedRmsDb + calibrationOffsetDb : null);
                setPeakFreq(dominantFreq);
                setBands(newBands);
                setSpectrum(newSpectrum);
                setPeakHoldCurve([...curPeaks]);
                setAvgCurve([...curAvgs]);

                // 6. Network transmission throttled to transmitIntervalMs
                const now = Date.now();
                if (deviceToken && now - lastTransmitTimeRef.current >= transmitIntervalMs) {
                    lastTransmitTimeRef.current = now;
                    sendAcousticFrame({
                        deviceToken,
                        timestamp: now,
                        sampleRate: curSampleRate,
                        nyquist: curNyquist,
                        fftSize,
                        rmsDb: clampedRmsDb,
                        peakFreq: dominantFreq,
                        bands: newBands,
                        spectrum: newSpectrum,
                        isMicActive: true,
                        calibrationOffsetDb,
                    }).catch(() => {});
                }

                animFrameRef.current = requestAnimationFrame(processLoop);
            };

            animFrameRef.current = requestAnimationFrame(processLoop);
        } catch (err: any) {
            console.error('Audio capture error:', err);
            setIsCapturing(false);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setStatus('DENIED');
                setErrorMessage('Permiso de micrófono denegado. Permite el acceso al micrófono en la barra del navegador para continuar.');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setStatus('ERROR');
                setErrorMessage('No se encontró ningún micrófono disponible en este dispositivo.');
            } else {
                setStatus('ERROR');
                setErrorMessage(err.message || 'Error al inicializar la captura de audio.');
            }
        }
    }, [isCapturing, deviceToken, transmitIntervalMs, fftSize, calibrationOffsetDb, stopCapture]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animFrameRef.current !== null) {
                cancelAnimationFrame(animFrameRef.current);
            }
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(() => {});
            }
        };
    }, []);

    return {
        isCapturing,
        status,
        errorMessage,
        sampleRate,
        nyquist,
        fftSize,
        rmsDb,
        splDb,
        peakFreq,
        bands,
        spectrum,
        peakHoldCurve,
        avgCurve,
        calibrationOffsetDb,
        isCalibrated,
        startCapture,
        stopCapture,
        setCalibrationOffset: setCalibrationOffsetDb,
        resetCurves,
    };
};
