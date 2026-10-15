import type { Project, Device } from "@prisma/client";
import type { ProjectEntity } from "../../domain/project.entity.js";
import type { DeviceEntity } from "../../domain/device.entity.js";

export class ProjectMapper {
    static toEntity(raw: Project & { _count?: { devices?: number }; devices?: Device[] }): ProjectEntity {
        let anchorCount: number | undefined;
        if (raw.devices) {
            anchorCount = raw.devices.filter((d: Device) => d.isAnchor || d.role === 'ANCHOR').length;
        }

        return {
            id: raw.id,
            userId: raw.userId,
            name: raw.name,
            description: raw.description,
            accessCode: raw.accessCode,
            isShareActive: raw.isShareActive,
            status: raw.status as any,
            roomWidth: raw.roomWidth,
            roomLength: raw.roomLength,
            roomHeight: raw.roomHeight,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            deviceCount: raw._count?.devices ?? raw.devices?.length,
            anchorCount,
        };
    }

    static deviceToEntity(raw: Device): DeviceEntity {
        return {
            id: raw.id,
            projectId: raw.projectId,
            socketId: raw.socketId,
            browserIdentifier: raw.browserIdentifier,
            deviceToken: raw.deviceToken,
            name: raw.name,
            role: raw.role as any,
            isAnchor: raw.isAnchor,
            status: raw.status as any,
            deviceModel: raw.deviceModel,
            browserInfo: raw.browserInfo,
            audioSpecs: raw.audioSpecs,
            positionX: raw.positionX,
            positionY: raw.positionY,
            positionZ: raw.positionZ,
            latitude: raw.latitude,
            longitude: raw.longitude,
            accuracy: raw.accuracy,
            altitude: raw.altitude,
            hasLocationPermission: raw.hasLocationPermission,
            lastLocationAt: raw.lastLocationAt,
            ipAddress: raw.ipAddress,
            calibrationOffsetDb: raw.calibrationOffsetDb,
            lastSeenAt: raw.lastSeenAt,
            joinedAt: raw.joinedAt,
            updatedAt: raw.updatedAt,
        };
    }
}
