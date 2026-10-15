import type { IProjectRepository } from "../domain/project.repository.js";
import type { DeviceEntity } from "../domain/device.entity.js";
import AppError from "@shared/errors/AppError.js";

export class GetProjectDevicesUseCase {
    constructor(private readonly projectRepository: IProjectRepository) {}

    async execute(projectId: string, userId: string): Promise<DeviceEntity[]> {
        const project = await this.projectRepository.findById(projectId, userId);
        if (!project) {
            throw new AppError("Proyecto no encontrado", "PROJECT_NOT_FOUND", 404);
        }

        return this.projectRepository.findDevicesByProjectId(projectId);
    }
}
