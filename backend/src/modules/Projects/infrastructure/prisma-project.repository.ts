import type { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import type {
    IProjectRepository,
    CreateProjectInput,
    UpdateProjectInput,
    UpsertDeviceInput,
    UpdateDeviceLocationInput
} from "../domain/project.repository.js";
import type { ProjectEntity } from "../domain/project.entity.js";
import type { DeviceEntity } from "../domain/device.entity.js";
import type { Paginated } from "@shared/domain/paginated.js";
import type { Pagination } from "@shared/domain/pagination.js";
import { ProjectMapper } from "./mappers/project.mapper.js";

export class PrismaProjectRepository implements IProjectRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async findById(id: string, userId?: string): Promise<ProjectEntity | null> {
        const where: Prisma.ProjectWhereInput = { id };
        if (userId) {
            where.userId = userId;
        }

        const project = await this.prisma.project.findFirst({
            where,
            include: {
                devices: true,
                _count: {
                    select: { devices: true }
                }
            }
        });

        if (!project) return null;
        return ProjectMapper.toEntity(project);
    }

    async findByAccessCode(accessCode: string): Promise<ProjectEntity | null> {
        const project = await this.prisma.project.findUnique({
            where: { accessCode },
            include: {
                devices: true,
                _count: {
                    select: { devices: true }
                }
            }
        });

        if (!project) return null;
        return ProjectMapper.toEntity(project);
    }

    async findMany(
        userId: string,
        filters: { search?: string; status?: string },
        pagination: Pagination
    ): Promise<Paginated<ProjectEntity>> {
        const where: Prisma.ProjectWhereInput = {
            userId,
        };

        if (filters.status) {
            where.status = filters.status as any;
        }

        if (filters.search && filters.search.trim() !== '') {
            const searchTerm = filters.search.trim();
            where.OR = [
                { name: { contains: searchTerm } },
                { description: { contains: searchTerm } },
            ];
        }

        const page = Math.max(1, pagination.page || 1);
        const perPage = Math.max(1, pagination.perPage || 10);
        const skip = (page - 1) * perPage;

        const [total, rawProjects] = await Promise.all([
            this.prisma.project.count({ where }),
            this.prisma.project.findMany({
                where,
                skip,
                take: perPage,
                orderBy: { updatedAt: 'desc' },
                include: {
                    devices: true,
                    _count: {
                        select: { devices: true }
                    }
                }
            })
        ]);

        const data = rawProjects.map((p: any) => ProjectMapper.toEntity(p));

        return {
            data,
            total,
            page,
            perPage
        };
    }

    async create(data: CreateProjectInput): Promise<ProjectEntity> {
        const project = await this.prisma.project.create({
            data: {
                userId: data.userId,
                name: data.name,
                description: data.description ?? null,
                status: data.status || 'DRAFT',
                accessCode: randomUUID(),
                isShareActive: true,
                roomWidth: data.roomWidth ?? null,
                roomLength: data.roomLength ?? null,
                roomHeight: data.roomHeight ?? null,
            },
            include: {
                devices: true,
                _count: {
                    select: { devices: true }
                }
            }
        });

        return ProjectMapper.toEntity(project);
    }

    async update(id: string, userId: string, data: UpdateProjectInput): Promise<ProjectEntity> {
        const updateData: Prisma.ProjectUpdateInput = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.isShareActive !== undefined) updateData.isShareActive = data.isShareActive;
        if (data.roomWidth !== undefined) updateData.roomWidth = data.roomWidth;
        if (data.roomLength !== undefined) updateData.roomLength = data.roomLength;
        if (data.roomHeight !== undefined) updateData.roomHeight = data.roomHeight;

        const updated = await this.prisma.project.update({
            where: { id },
            data: updateData,
            include: {
                devices: true,
                _count: {
                    select: { devices: true }
                }
            }
        });

        return ProjectMapper.toEntity(updated);
    }

    async delete(id: string, userId: string): Promise<void> {
        await this.prisma.project.delete({
            where: {
                id,
                userId
            }
        });
    }

    async regenerateAccessCode(id: string, userId: string): Promise<ProjectEntity> {
        const updated = await this.prisma.project.update({
            where: {
                id,
                userId
            },
            data: {
                accessCode: randomUUID(),
                isShareActive: true,
            },
            include: {
                devices: true,
                _count: {
                    select: { devices: true }
                }
            }
        });

        return ProjectMapper.toEntity(updated);
    }

    // ── Devices ─────────────────────────────────────────────────────────────

    async findDevicesByProjectId(projectId: string): Promise<DeviceEntity[]> {
        const devices = await this.prisma.device.findMany({
            where: { projectId },
            orderBy: [
                { isAnchor: 'desc' },
                { lastSeenAt: 'desc' }
            ]
        });

        return devices.map((d: any) => ProjectMapper.deviceToEntity(d));
    }

    async findDeviceById(deviceId: string, projectId?: string): Promise<DeviceEntity | null> {
        const where: Prisma.DeviceWhereInput = { id: deviceId };
        if (projectId) where.projectId = projectId;

        const device = await this.prisma.device.findFirst({ where });
        if (!device) return null;
        return ProjectMapper.deviceToEntity(device);
    }

    async findDeviceByBrowserId(projectId: string, browserIdentifier: string): Promise<DeviceEntity | null> {
        const device = await this.prisma.device.findUnique({
            where: {
                projectId_browserIdentifier: {
                    projectId,
                    browserIdentifier
                }
            }
        });

        if (!device) return null;
        return ProjectMapper.deviceToEntity(device);
    }

    async findDeviceByToken(deviceToken: string): Promise<DeviceEntity | null> {
        const device = await this.prisma.device.findUnique({
            where: { deviceToken }
        });

        if (!device) return null;
        return ProjectMapper.deviceToEntity(device);
    }

    async upsertDevice(data: UpsertDeviceInput): Promise<{ device: DeviceEntity; deviceToken: string; isNew: boolean }> {
        const existing = await this.prisma.device.findUnique({
            where: {
                projectId_browserIdentifier: {
                    projectId: data.projectId,
                    browserIdentifier: data.browserIdentifier
                }
            }
        });

        const now = new Date();
        const role = data.role ?? (data.isAnchor ? 'ANCHOR' : 'PROBE');
        const isAnchor = data.isAnchor ?? (role === 'ANCHOR');

        if (existing) {
            const token = existing.deviceToken ?? randomUUID();
            const updatePayload: Prisma.DeviceUpdateInput = {
                status: 'CONNECTED',
                lastSeenAt: now,
                role: role as any,
                isAnchor,
            };

            if (data.name) updatePayload.name = data.name;
            if (data.deviceModel) updatePayload.deviceModel = data.deviceModel;
            if (data.browserInfo) updatePayload.browserInfo = data.browserInfo;
            if (data.ipAddress) updatePayload.ipAddress = data.ipAddress;
            if (!existing.deviceToken) updatePayload.deviceToken = token;

            if (data.latitude !== undefined && data.latitude !== null && data.longitude !== undefined && data.longitude !== null) {
                updatePayload.latitude = data.latitude;
                updatePayload.longitude = data.longitude;
                updatePayload.accuracy = data.accuracy ?? null;
                updatePayload.altitude = data.altitude ?? null;
                updatePayload.hasLocationPermission = true;
                updatePayload.lastLocationAt = now;
            } else if (data.hasLocationPermission !== undefined) {
                updatePayload.hasLocationPermission = data.hasLocationPermission;
            }

            const updated = await this.prisma.device.update({
                where: { id: existing.id },
                data: updatePayload
            });

            return {
                device: ProjectMapper.deviceToEntity(updated),
                deviceToken: token,
                isNew: false
            };
        }

        // Create new device
        const newToken = randomUUID();
        const hasLocation = data.latitude !== undefined && data.latitude !== null && data.longitude !== undefined && data.longitude !== null;

        const created = await this.prisma.device.create({
            data: {
                projectId: data.projectId,
                browserIdentifier: data.browserIdentifier,
                deviceToken: newToken,
                name: data.name ?? (isAnchor ? 'Ancla de Referencia' : 'Dispositivo Móvil'),
                role: role as any,
                isAnchor,
                status: 'CONNECTED',
                deviceModel: data.deviceModel ?? null,
                browserInfo: data.browserInfo ?? null,
                latitude: hasLocation ? data.latitude : null,
                longitude: hasLocation ? data.longitude : null,
                accuracy: hasLocation ? (data.accuracy ?? null) : null,
                altitude: hasLocation ? (data.altitude ?? null) : null,
                hasLocationPermission: data.hasLocationPermission ?? hasLocation,
                lastLocationAt: hasLocation ? now : null,
                ipAddress: data.ipAddress ?? null,
                lastSeenAt: now,
                joinedAt: now,
            }
        });

        return {
            device: ProjectMapper.deviceToEntity(created),
            deviceToken: newToken,
            isNew: true
        };
    }

    async updateDeviceLocation(deviceId: string, locationData: UpdateDeviceLocationInput): Promise<DeviceEntity> {
        const now = new Date();
        const hasCoords = locationData.latitude !== undefined && locationData.latitude !== null && locationData.longitude !== undefined && locationData.longitude !== null;

        const updateData: Prisma.DeviceUpdateInput = {
            hasLocationPermission: locationData.hasLocationPermission,
            lastSeenAt: now,
            status: 'CONNECTED'
        };

        if (hasCoords) {
            updateData.latitude = locationData.latitude;
            updateData.longitude = locationData.longitude;
            updateData.accuracy = locationData.accuracy ?? null;
            updateData.altitude = locationData.altitude ?? null;
            updateData.lastLocationAt = now;
        }

        const updated = await this.prisma.device.update({
            where: { id: deviceId },
            data: updateData
        });

        return ProjectMapper.deviceToEntity(updated);
    }

    async updateDevice(deviceId: string, projectId: string, data: Partial<DeviceEntity>): Promise<DeviceEntity> {
        const updateData: Prisma.DeviceUpdateInput = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.role !== undefined) {
            updateData.role = data.role as any;
            updateData.isAnchor = data.role === 'ANCHOR';
        } else if (data.isAnchor !== undefined) {
            updateData.isAnchor = data.isAnchor;
            updateData.role = data.isAnchor ? 'ANCHOR' : 'PROBE';
        }
        if (data.status !== undefined) updateData.status = data.status as any;
        if (data.positionX !== undefined) updateData.positionX = data.positionX;
        if (data.positionY !== undefined) updateData.positionY = data.positionY;
        if (data.positionZ !== undefined) updateData.positionZ = data.positionZ;

        const updated = await this.prisma.device.update({
            where: {
                id: deviceId,
                projectId
            },
            data: updateData
        });

        return ProjectMapper.deviceToEntity(updated);
    }

    async deleteDevice(deviceId: string, projectId: string): Promise<void> {
        await this.prisma.device.delete({
            where: {
                id: deviceId,
                projectId
            }
        });
    }

    async heartbeatDevice(deviceId: string): Promise<void> {
        await this.prisma.device.update({
            where: { id: deviceId },
            data: {
                lastSeenAt: new Date(),
                status: 'CONNECTED'
            }
        });
    }
}
