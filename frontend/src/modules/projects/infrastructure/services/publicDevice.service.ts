import axios from 'axios';
import { API_BASE_URL } from '../../../../core/api/config';
import type {
    PublicProject,
    RegisterDevicePayload,
    RegisterDeviceResponse,
} from '../../domain/project.types';

const PUBLIC_BASE_URL = `${API_BASE_URL}/public`;

interface ApiResponse<T> {
    status: string;
    message: string;
    data: T;
}

const BROWSER_ID_STORAGE_KEY = 'syncdb_persistent_browser_id';

/**
 * Returns a cryptographically secure, persistent UUID stored in the browser's localStorage.
 * If not present, generates a new one.
 */
export const getOrCreatePersistentBrowserId = (): string => {
    let id = localStorage.getItem(BROWSER_ID_STORAGE_KEY);
    if (!id || id.trim().length < 8) {
        id = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `client_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
        localStorage.setItem(BROWSER_ID_STORAGE_KEY, id);
    }
    return id;
};

export const getStoredDeviceToken = (accessCode: string): string | null => {
    return localStorage.getItem(`syncdb_token_${accessCode}`);
};

export const setStoredDeviceToken = (accessCode: string, token: string): void => {
    localStorage.setItem(`syncdb_token_${accessCode}`, token);
};

export const getPublicProject = async (accessCode: string): Promise<PublicProject> => {
    const response = await axios.get<ApiResponse<PublicProject>>(
        `${PUBLIC_BASE_URL}/projects/${accessCode}`
    );
    return response.data.data;
};

export const registerPublicDevice = async (
    accessCode: string,
    payload: RegisterDevicePayload
): Promise<RegisterDeviceResponse> => {
    const response = await axios.post<ApiResponse<RegisterDeviceResponse>>(
        `${PUBLIC_BASE_URL}/projects/${accessCode}/devices/register`,
        payload
    );
    if (response.data.data?.deviceToken) {
        setStoredDeviceToken(accessCode, response.data.data.deviceToken);
    }
    return response.data.data;
};

export const updateDeviceLocation = async (payload: {
    deviceToken: string;
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
    altitude?: number | null;
    hasLocationPermission: boolean;
}): Promise<{ lastLocationAt: string; status: string }> => {
    const response = await axios.post<ApiResponse<{ lastLocationAt: string; status: string }>>(
        `${PUBLIC_BASE_URL}/devices/location`,
        payload
    );
    return response.data.data;
};

export const sendDeviceHeartbeat = async (deviceToken: string): Promise<void> => {
    await axios.post<ApiResponse<null>>(`${PUBLIC_BASE_URL}/devices/heartbeat`, {
        deviceToken,
    });
};
