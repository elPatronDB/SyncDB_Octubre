import type { IProjectRepository } from "../domain/project.repository.js";
import type { DeviceEntity } from "../domain/device.entity.js";
import AppError from "@shared/errors/AppError.js";

export interface UpdateDeviceCalibrationDTO {
    projectId: string;
    userId: string;
    deviceId: string;
    calibrationOffsetDb: number;
    audioSpecs?: any;
}

export class UpdateDeviceCalibrationUseCase {
    constructor(private readonly projectRepository: IProjectRepository) {}

    async execute(dto: UpdateDeviceCalibrationDTO): Promise<DeviceEntity> {
        const project = await this.projectRepository.findById(dto.projectId, dto.userId);
        if (!project) {
            throw new AppError("Proyecto no encontrado o no autorizado", "NOT_FOUND", 404);
        }

        const device = await this.projectRepository.findDeviceById(dto.deviceId, dto.projectId);
        if (!device) {
            throw new AppError("Dispositivo no encontrado en este proyecto", "NOT_FOUND", 404);
        }

        const updated = await this.projectRepository.updateDevice(dto.deviceId, dto.projectId, {
            calibrationOffsetDb: dto.calibrationOffsetDb,
            audioSpecs: dto.audioSpecs ?? device.audioSpecs,
        });

        return updated;
    }
}
