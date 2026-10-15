export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'CALIBRATING' | 'COMPLETED' | 'ARCHIVED';
export type DeviceRole = 'ANCHOR' | 'PROBE';
export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED';

export interface Project {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    accessCode: string;
    isShareActive: boolean;
    status: ProjectStatus;
    roomWidth: number | null;
    roomLength: number | null;
    roomHeight: number | null;
    createdAt: string;
    updatedAt: string;
    deviceCount?: number;
    anchorCount?: number;
}

export interface Device {
    id: string;
    projectId: string;
    socketId: string | null;
    browserIdentifier: string;
    deviceToken?: string | null;
    name: string | null;
    role: DeviceRole;
    isAnchor: boolean;
    status: ConnectionStatus;
    deviceModel: string | null;
    browserInfo: string | null;
    audioSpecs?: any;
    positionX: number | null;
    positionY: number | null;
    positionZ: number | null;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    altitude: number | null;
    hasLocationPermission: boolean;
    lastLocationAt: string | null;
    ipAddress: string | null;
    calibrationOffsetDb: number;
    lastSeenAt: string;
    joinedAt: string;
    updatedAt: string;
}

export interface CreateProjectFormValues {
    name: string;
    description?: string;
    status?: ProjectStatus;
    roomWidth?: number;
    roomLength?: number;
    roomHeight?: number;
}

export interface UpdateProjectFormValues extends Partial<CreateProjectFormValues> {
    isShareActive?: boolean;
}

export interface PublicProject {
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    isShareActive: boolean;
    accessCode: string;
    deviceCount?: number;
    anchorCount?: number;
}

export interface RegisterDevicePayload {
    browserIdentifier: string;
    name?: string;
    role: DeviceRole;
    isAnchor: boolean;
    deviceModel?: string;
    browserInfo?: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    altitude?: number;
    hasLocationPermission?: boolean;
}

export interface RegisterDeviceResponse {
    device: Device;
    deviceToken: string;
    isNew: boolean;
    projectName: string;
}
