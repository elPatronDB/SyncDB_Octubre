import axios from 'axios';
import { api as axiosInstance } from '../../../../core/api/axios.instance';
import { API_BASE_URL } from '../../../../core/api/config';
import { useAuthStore } from '../../../../core/store/authStore';
import type {
    AcousticFrame,
    AcousticSnapshot,
    ProjectAcousticAggregate,
    DeviceAcousticState,
} from '../../domain/acoustic.types';

const PUBLIC_BASE_URL = `${API_BASE_URL}/public`;

interface ApiResponse<T> {
    status: string;
    message: string;
    data: T;
}

/**
 * Sends a real-time spectral frame from a client device microphone
 */
export const sendAcousticFrame = async (payload: {
    deviceToken: string;
    timestamp: number;
    sampleRate: number;
    nyquist: number;
    fftSize: number;
    rmsDb: number;
    peakFreq: number;
    bands: number[];
    spectrum?: number[];
    isMicActive: boolean;
    calibrationOffsetDb?: number;
}): Promise<void> => {
    await axios.post<ApiResponse<any>>(
        `${PUBLIC_BASE_URL}/devices/acoustic-data`,
        payload,
        {
            headers: {
                Authorization: `Bearer ${payload.deviceToken}`,
            },
        }
    );
};

/**
 * Fetches the current acoustic state and aggregate for a project
 */
export const getAcousticSnapshot = async (projectId: string): Promise<AcousticSnapshot> => {
    const response = await axiosInstance.get<ApiResponse<AcousticSnapshot>>(
        `/projects/${projectId}/acoustic/snapshot`
    );
    return response.data.data;
};

/**
 * Resets the running peak hold curves and running averages for a project
 */
export const resetAcousticCurves = async (projectId: string): Promise<void> => {
    await axiosInstance.post<ApiResponse<null>>(
        `/projects/${projectId}/acoustic/reset`
    );
};

/**
 * Saves a persistent snapshot measurement to MySQL
 */
export const saveAcousticMeasurement = async (
    projectId: string,
    payload: {
        deviceId: string;
        decibels: number;
        peakDb?: number | null;
        frequency?: number | null;
        coordX?: number;
        coordY?: number;
        coordZ?: number | null;
    }
): Promise<any> => {
    const response = await axiosInstance.post<ApiResponse<any>>(
        `/projects/${projectId}/acoustic/measurements`,
        payload
    );
    return response.data.data;
};

/**
 * Updates a device's calibration offset in dB
 */
export const updateDeviceCalibration = async (
    projectId: string,
    deviceId: string,
    payload: {
        calibrationOffsetDb: number;
        audioSpecs?: any;
    }
): Promise<any> => {
    const response = await axiosInstance.patch<ApiResponse<any>>(
        `/projects/${projectId}/devices/${deviceId}/calibration`,
        payload
    );
    return response.data.data;
};

/**
 * Connects to the real-time Server-Sent Events (SSE) acoustic stream for a project
 */
export const connectAcousticStream = (
    projectId: string,
    callbacks: {
        onInitialSnapshot?: (snapshot: AcousticSnapshot) => void;
        onDeviceFrame?: (data: { deviceId: string; frame: AcousticFrame; state: Partial<DeviceAcousticState> }) => void;
        onAggregateUpdate?: (aggregate: ProjectAcousticAggregate) => void;
        onError?: (error: any) => void;
    }
): (() => void) => {
    const token = useAuthStore.getState().accessToken;
    const url = `${API_BASE_URL}/projects/${projectId}/acoustic/stream?token=${encodeURIComponent(token || '')}`;

    const eventSource = new EventSource(url, { withCredentials: true });

    eventSource.addEventListener('initial_snapshot', (e: MessageEvent) => {
        try {
            const data = JSON.parse(e.data);
            callbacks.onInitialSnapshot?.(data);
        } catch (err) {
            console.error('Error parsing initial_snapshot SSE:', err);
        }
    });

    eventSource.addEventListener('acoustic:frame', (e: MessageEvent) => {
        try {
            const data = JSON.parse(e.data);
            callbacks.onDeviceFrame?.(data);
        } catch (err) {
            console.error('Error parsing acoustic:frame SSE:', err);
        }
    });

    eventSource.addEventListener('project:aggregate', (e: MessageEvent) => {
        try {
            const data = JSON.parse(e.data);
            callbacks.onAggregateUpdate?.(data);
        } catch (err) {
            console.error('Error parsing project:aggregate SSE:', err);
        }
    });

    eventSource.onerror = (err) => {
        console.warn('Acoustic SSE connection warning:', err);
        callbacks.onError?.(err);
    };

    return () => {
        eventSource.close();
    };
};
