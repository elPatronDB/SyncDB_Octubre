export type TargetCurveType = 'FLAT' | 'HARMAN_HOUSE' | 'CLUB_BASS' | 'SPEECH_CLARITY';

export interface AcousticBandLevel {
    bandIndex: number;
    centerFreq: number; // Hz (e.g. 1000)
    levelDb: number;    // dBFS (or dB SPL if calibrated)
}

export interface AcousticFrame {
    deviceId: string;
    projectId: string;
    timestamp: number;
    sampleRate: number;
    nyquist: number;
    fftSize: number;
    rmsDb: number;              // Relative dBFS
    splDb: number | null;       // Calibrated dB SPL if offset available
    peakFreq: number;           // Dominant frequency in Hz
    bands: number[];            // 31 1/3-octave bands in dBFS
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

export type PAFilterType = 'PEQ_BELL' | 'HIGH_PASS' | 'LOW_SHELF' | 'HIGH_SHELF' | 'NOTCH';

export interface PARecommendation {
    id: string;
    filterType: PAFilterType;
    centerFreq: number;         // Hz
    gainDb: number;             // Suggested dB adjustment (negative for cut, limited boost)
    qFactor: number;            // Filter Q
    bandwidthOctaves: number;   // Bandwidth in octaves
    bandName: string;           // E.g. "Low-Mid (250 Hz)"
    reason: string;             // Detailed acoustic justification
    confidence: 'HIGH' | 'MEDIUM' | 'CAUTION';
    affectedDevicesCount: number;
    warning: string | null;     // E.g. "Possible room mode or phase cancellation"
}

// 31 Standard ISO 1/3-octave center frequencies (Hz)
export const ISO_THIRD_OCTAVE_FREQUENCIES = [
    20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800,
    1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
];
