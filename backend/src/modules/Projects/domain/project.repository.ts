import type { ProjectEntity } from "./project.entity.js";
import type { DeviceEntity } from "./device.entity.js";
import type { Paginated } from "@shared/domain/paginated.js";
import type { Pagination } from "@shared/domain/pagination.js";

export interface CreateProjectInput {
    userId: string;
    name: string;
    description?: string | null;
    status?: any;
    roomWidth?: number | null;
    roomLength?: number | null;
    roomHeight?: number | null;
}

export interface UpdateProjectInput {
    name?: string;
    description?: string | null;
    status?: any;
    isShareActive?: boolean;
    roomWidth?: number | null;
    roomLength?: number | null;
    roomHeight?: number | null;
}

export interface UpsertDeviceInput {
    projectId: string;
    browserIdentifier: string;
    name?: string | null;
    role?: 'ANCHOR' | 'PROBE';
    isAnchor?: boolean;
    deviceModel?: string | null;
    browserInfo?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
    altitude?: number | null;
    hasLocationPermission?: boolean;
    ipAddress?: string | null;
}

export interface UpdateDeviceLocationInput {
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
    altitude?: number | null;
    hasLocationPermission: boolean;
}

export interface IProjectRepository {
    findById(id: string, userId?: string): Promise<ProjectEntity | null>;
    findByAccessCode(accessCode: string): Promise<ProjectEntity | null>;
    findMany(userId: string, filters: { search?: string; status?: string }, pagination: Pagination): Promise<Paginated<ProjectEntity>>;
    create(data: CreateProjectInput): Promise<ProjectEntity>;
    update(id: string, userId: string, data: UpdateProjectInput): Promise<ProjectEntity>;
    delete(id: string, userId: string): Promise<void>;
    regenerateAccessCode(id: string, userId: string): Promise<ProjectEntity>;

    // Dispositivos
    findDevicesByProjectId(projectId: string): Promise<DeviceEntity[]>;
    findDeviceById(deviceId: string, projectId?: string): Promise<DeviceEntity | null>;
    findDeviceByBrowserId(projectId: string, browserIdentifier: string): Promise<DeviceEntity | null>;
    findDeviceByToken(deviceToken: string): Promise<DeviceEntity | null>;
    upsertDevice(data: UpsertDeviceInput): Promise<{ device: DeviceEntity; deviceToken: string; isNew: boolean }>;
    updateDeviceLocation(deviceId: string, locationData: UpdateDeviceLocationInput): Promise<DeviceEntity>;
    updateDevice(deviceId: string, projectId: string, data: Partial<DeviceEntity>): Promise<DeviceEntity>;
    deleteDevice(deviceId: string, projectId: string): Promise<void>;
    heartbeatDevice(deviceId: string): Promise<void>;
    createMeasurement(data: {
        projectId: string;
        deviceId: string;
        decibels: number;
        peakDb?: number | null;
        frequency?: number | null;
        coordX?: number;
        coordY?: number;
        coordZ?: number | null;
    }): Promise<any>;
}
