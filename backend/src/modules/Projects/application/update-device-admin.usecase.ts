import type { IProjectRepository } from "../domain/project.repository.js";
import type { DeviceEntity } from "../domain/device.entity.js";
import AppError from "@shared/errors/AppError.js";

export interface UpdateDeviceAdminInput {
    name?: string;
    role?: 'ANCHOR' | 'PROBE';
    isAnchor?: boolean;
    status?: 'CONNECTED' | 'DISCONNECTED';
    positionX?: number | null;
    positionY?: number | null;
    positionZ?: number | null;
}

export class UpdateDeviceAdminUseCase {
    constructor(private readonly projectRepository: IProjectRepository) {}

    async execute(
        projectId: string,
        deviceId: string,
        userId: string,
        data: UpdateDeviceAdminInput
    ): Promise<DeviceEntity> {
        const project = await this.projectRepository.findById(projectId, userId);
        if (!project) {
            throw new AppError("Proyecto no encontrado", "PROJECT_NOT_FOUND", 404);
        }

        const device = await this.projectRepository.findDeviceById(deviceId, projectId);
        if (!device) {
            throw new AppError("Dispositivo no encontrado", "DEVICE_NOT_FOUND", 404);
        }

        return this.projectRepository.updateDevice(deviceId, projectId, data);
    }
}
