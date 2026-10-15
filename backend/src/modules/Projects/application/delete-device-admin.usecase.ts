import type { IProjectRepository } from "../domain/project.repository.js";
import AppError from "@shared/errors/AppError.js";

export class DeleteDeviceAdminUseCase {
    constructor(private readonly projectRepository: IProjectRepository) {}

    async execute(projectId: string, deviceId: string, userId: string): Promise<void> {
        const project = await this.projectRepository.findById(projectId, userId);
        if (!project) {
            throw new AppError("Proyecto no encontrado", "PROJECT_NOT_FOUND", 404);
        }

        const device = await this.projectRepository.findDeviceById(deviceId, projectId);
        if (!device) {
            throw new AppError("Dispositivo no encontrado", "DEVICE_NOT_FOUND", 404);
        }

        await this.projectRepository.deleteDevice(deviceId, projectId);
    }
}
