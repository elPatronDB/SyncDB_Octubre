// 31 Standard ISO 1/3-octave center frequencies (Hz) according to ISO 266
export const ISO_THIRD_OCTAVE_FREQUENCIES = [
    20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800,
    1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
];

export type TargetCurveType = 'FLAT' | 'HARMAN_HOUSE' | 'CLUB_BASS' | 'SPEECH_CLARITY';

export interface TargetCurveDefinition {
    id: TargetCurveType;
    name: string;
    description: string;
    offsets: number[]; // 31 band target offsets in dB relative to 1 kHz (0 dB)
}

export const TARGET_CURVES: Record<TargetCurveType, TargetCurveDefinition> = {
    FLAT: {
        id: 'FLAT',
        name: 'Respuesta Plana (Flat)',
        description: 'Referencia teórica lineal 0 dB en todo el espectro audible.',
        offsets: new Array(31).fill(0),
    },
    HARMAN_HOUSE: {
        id: 'HARMAN_HOUSE',
        name: 'Curva Harman / Live PA House Curve',
        description: 'Realce suave en sub-graves (+4 dB a 40 Hz) y caída suave en agudos (-1 dB/oct sobre 4 kHz). Ideal para sonido en vivo.',
        offsets: [
            4.0, 4.0, 4.0, 3.8, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.2, 0.0, 0.0, 0.0, 0.0, 0.0,
            0.0, 0.0, 0.0, 0.0, -0.3, -0.6, -1.0, -1.5, -2.0, -2.5, -3.2, -4.0, -5.0, -6.0
        ],
    },
    CLUB_BASS: {
        id: 'CLUB_BASS',
        name: 'Club / Baile / Sub-Bass Boost',
        description: 'Refuerzo pronunciado de sub-graves (+6 dB a 50 Hz) para música electrónica y eventos de baile.',
        offsets: [
            6.0, 6.0, 6.0, 5.8, 5.5, 5.0, 4.0, 3.0, 2.0, 1.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
            0.0, 0.0, 0.0, 0.0, -0.5, -1.0, -1.5, -2.0, -2.5, -3.0, -3.5, -4.5, -5.5, -6.5
        ],
    },
    SPEECH_CLARITY: {
        id: 'SPEECH_CLARITY',
        name: 'Voz / Conferencia / Inteligibilidad',
        description: 'Corte pasa-altos en graves (< 80 Hz) para eliminar golpes de aire y siseos, con ligero realce en presencia vocal (2-4 kHz).',
        offsets: [
            -18.0, -15.0, -12.0, -9.0, -6.0, -3.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.5, 1.0, 1.5, 2.0, 2.0, 2.5,
            2.5, 2.5, 2.5, 2.0, 1.5, 1.0, 0.5, 0.0, -0.5, -1.0, -2.0, -3.0, -4.0, -6.0
        ],
    },
};

export interface AcousticFrame {
    deviceId: string;
    projectId: string;
    timestamp: number;
    sampleRate: number;
    nyquist: number;
    fftSize: number;
    rmsDb: number;              // Relative dBFS
    splDb: number | null;       // Calibrated dB SPL (null if not calibrated)
    peakFreq: number;           // Dominant frequency in Hz
    bands: number[];            // 31 1/3-octave values in dBFS
    spectrum: number[];         // 64 log-spaced bins in dBFS
    isCalibrated: boolean;
    calibrationOffsetDb: number;
    isMicActive: boolean;
}

export interface DeviceAcousticState {
    deviceId: string;
    projectId: string;
    deviceName: string | null;
    role: 'ANCHOR' | 'PROBE';
    isAnchor: boolean;
    isOnline: boolean;
    isMicActive: boolean;
    isCalibrated: boolean;
    calibrationOffsetDb: number;
    sampleRate: number;
    nyquist: number;
    lastSeenAcoustic: number | null;
    latestFrame: AcousticFrame | null;
    peakHoldCurve: number[];     // Running maximum per band
    avgCurve: number[];          // Running temporal average per band
    historyFramesCount: number;
}

export type PAFilterType = 'PEQ_BELL' | 'HIGH_PASS' | 'LOW_SHELF' | 'HIGH_SHELF' | 'NOTCH';

export interface PARecommendation {
    id: string;
    filterType: PAFilterType;
    centerFreq: number;         // Hz
    gainDb: number;             // Suggested dB adjustment
    qFactor: number;            // Filter Q
    bandwidthOctaves: number;   // Bandwidth in octaves
    bandName: string;           // E.g. "Low-Mid (250 Hz)"
    reason: string;             // Detailed acoustic justification
    confidence: 'HIGH' | 'MEDIUM' | 'CAUTION';
    affectedDevicesCount: number;
    warning: string | null;     // E.g. "Posible cancelación de fase acústica"
}

export interface ProjectAcousticAggregate {
    projectId: string;
    timestamp: number;
    activeDeviceCount: number;
    contributingDevices: string[];
    currentSpectrum: number[];   // Energy-averaged dBFS across contributing devices
    peakSpectrum: number[];      // Maximum across contributing devices
    avgSpectrum: number[];       // Temporal running average of aggregate
    overallRmsDb: number;
    overallSplDb: number | null;
    recommendations: PARecommendation[];
}

export interface AcousticSnapshot {
    projectId: string;
    projectName: string;
    aggregate: ProjectAcousticAggregate;
    devices: DeviceAcousticState[];
}
