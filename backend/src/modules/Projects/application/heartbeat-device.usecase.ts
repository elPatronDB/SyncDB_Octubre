import type { IProjectRepository } from "../domain/project.repository.js";
import AppError from "@shared/errors/AppError.js";

export class HeartbeatDeviceUseCase {
    constructor(private readonly projectRepository: IProjectRepository) {}

    async execute(deviceToken: string): Promise<void> {
        if (!deviceToken || deviceToken.trim() === '') {
            throw new AppError("Token de dispositivo no proporcionado", "DEVICE_TOKEN_REQUIRED", 401);
        }

        const device = await this.projectRepository.findDeviceByToken(deviceToken.trim());
        if (!device) {
            throw new AppError("Dispositivo no encontrado o token revocado", "DEVICE_NOT_FOUND", 401);
        }

        await this.projectRepository.heartbeatDevice(device.id);
    }
}
