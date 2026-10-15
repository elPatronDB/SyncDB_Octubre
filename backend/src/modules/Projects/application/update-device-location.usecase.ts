import type { IProjectRepository, UpdateDeviceLocationInput } from "../domain/project.repository.js";
import type { DeviceEntity } from "../domain/device.entity.js";
import AppError from "@shared/errors/AppError.js";

export interface UpdateDeviceLocationDto {
    deviceToken: string;
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
    altitude?: number | null;
    hasLocationPermission: boolean;
}

export class UpdateDeviceLocationUseCase {
    constructor(private readonly projectRepository: IProjectRepository) {}

    async execute(input: UpdateDeviceLocationDto): Promise<DeviceEntity> {
        if (!input.deviceToken || input.deviceToken.trim() === '') {
            throw new AppError("Token de dispositivo no proporcionado", "DEVICE_TOKEN_REQUIRED", 401);
        }

        const device = await this.projectRepository.findDeviceByToken(input.deviceToken.trim());
        if (!device) {
            throw new AppError("Dispositivo no encontrado o token inválido", "DEVICE_NOT_FOUND", 401);
        }

        if (input.latitude !== undefined && input.latitude !== null) {
            if (input.latitude < -90 || input.latitude > 90) {
                throw new AppError("Latitud fuera del rango permitido (-90 a 90)", "INVALID_COORDINATES", 400);
            }
        }

        if (input.longitude !== undefined && input.longitude !== null) {
            if (input.longitude < -180 || input.longitude > 180) {
                throw new AppError("Longitud fuera del rango permitido (-180 a 180)", "INVALID_COORDINATES", 400);
            }
        }

        if (input.accuracy !== undefined && input.accuracy !== null && input.accuracy < 0) {
            throw new AppError("La precisión de ubicación debe ser un número positivo", "INVALID_ACCURACY", 400);
        }

        const locationInput: UpdateDeviceLocationInput = {
            latitude: input.latitude ?? null,
            longitude: input.longitude ?? null,
            accuracy: input.accuracy ?? null,
            altitude: input.altitude ?? null,
            hasLocationPermission: input.hasLocationPermission,
        };

        return this.projectRepository.updateDeviceLocation(device.id, locationInput);
    }
}
