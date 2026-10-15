export type DeviceRole = 'ANCHOR' | 'PROBE';
export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED';

export interface DeviceEntity {
    id: string;
    projectId: string;
    socketId: string | null;
    browserIdentifier: string;
    deviceToken: string | null;
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
    lastLocationAt: Date | null;
    ipAddress: string | null;
    calibrationOffsetDb: number;
    lastSeenAt: Date;
    joinedAt: Date;
    updatedAt: Date;
}
