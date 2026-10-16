import type { IProjectRepository } from "../domain/project.repository.js";
import AppError from "@shared/errors/AppError.js";

export interface SaveAcousticMeasurementDTO {
    projectId: string;
    userId: string;
    deviceId: string;
    decibels: number;
    peakDb?: number | null;
    frequency?: number | null;
    coordX?: number;
    coordY?: number;
    coordZ?: number | null;
}

export class SaveAcousticMeasurementUseCase {
    constructor(private readonly projectRepository: IProjectRepository) {}

    async execute(dto: SaveAcousticMeasurementDTO): Promise<any> {
        const project = await this.projectRepository.findById(dto.projectId, dto.userId);
        if (!project) {
            throw new AppError("Proyecto no encontrado o no autorizado", "NOT_FOUND", 404);
        }

        const device = await this.projectRepository.findDeviceById(dto.deviceId, dto.projectId);
        if (!device) {
            throw new AppError("Dispositivo no encontrado en este proyecto", "NOT_FOUND", 404);
        }

        const measurement = await this.projectRepository.createMeasurement({
            projectId: dto.projectId,
            deviceId: dto.deviceId,
            decibels: dto.decibels,
            peakDb: dto.peakDb,
            frequency: dto.frequency,
            coordX: dto.coordX ?? device.positionX ?? 0,
            coordY: dto.coordY ?? device.positionY ?? 0,
            coordZ: dto.coordZ ?? device.positionZ ?? 0,
        });

        return measurement;
    }
}
