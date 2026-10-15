import type { IProjectRepository, UpsertDeviceInput } from "../domain/project.repository.js";
import type { DeviceEntity } from "../domain/device.entity.js";
import AppError from "@shared/errors/AppError.js";

export interface RegisterDeviceDto {
    accessCode: string;
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

export interface RegisterDeviceResult {
    device: DeviceEntity;
    deviceToken: string;
    isNew: boolean;
    projectName: string;
}

export class RegisterDeviceUseCase {
    constructor(private readonly projectRepository: IProjectRepository) {}

    async execute(input: RegisterDeviceDto): Promise<RegisterDeviceResult> {
        if (!input.accessCode || input.accessCode.trim() === '') {
            throw new AppError("Código de acceso requerido", "INVALID_ACCESS_CODE", 400);
        }

        const project = await this.projectRepository.findByAccessCode(input.accessCode.trim());
        if (!project) {
            throw new AppError("Proyecto no encontrado o enlace incorrecto", "PROJECT_NOT_FOUND", 404);
        }

        if (!project.isShareActive) {
            throw new AppError("El enlace para registrar dispositivos ha sido desactivado", "SHARE_LINK_INACTIVE", 403);
        }

        if (project.status === 'ARCHIVED') {
            throw new AppError("El proyecto está archivado y no admite registros de dispositivos", "PROJECT_ARCHIVED", 403);
        }

        if (!input.browserIdentifier || input.browserIdentifier.trim().length < 8) {
            throw new AppError("Identificador persistente del navegador inválido", "INVALID_BROWSER_ID", 400);
        }

        // Validate geographic coordinates if provided
        if (input.latitude !== undefined && input.latitude !== null) {
            if (input.latitude < -90 || input.latitude > 90) {
                throw new AppError("La latitud debe estar comprendida entre -90 y 90 grados", "INVALID_COORDINATES", 400);
            }
        }

        if (input.longitude !== undefined && input.longitude !== null) {
            if (input.longitude < -180 || input.longitude > 180) {
                throw new AppError("La longitud debe estar comprendida entre -180 y 180 grados", "INVALID_COORDINATES", 400);
            }
        }

        if (input.accuracy !== undefined && input.accuracy !== null && input.accuracy < 0) {
            throw new AppError("La precisión de ubicación no puede ser negativa", "INVALID_ACCURACY", 400);
        }

        const upsertData: UpsertDeviceInput = {
            projectId: project.id,
            browserIdentifier: input.browserIdentifier.trim(),
            name: input.name ? input.name.trim() : null,
            role: input.role,
            isAnchor: input.isAnchor,
            deviceModel: input.deviceModel ?? null,
            browserInfo: input.browserInfo ?? null,
            latitude: input.latitude ?? null,
            longitude: input.longitude ?? null,
            accuracy: input.accuracy ?? null,
            altitude: input.altitude ?? null,
            hasLocationPermission: input.hasLocationPermission ?? (input.latitude !== null && input.latitude !== undefined),
            ipAddress: input.ipAddress ?? null,
        };

        const result = await this.projectRepository.upsertDevice(upsertData);

        return {
            device: result.device,
            deviceToken: result.deviceToken,
            isNew: result.isNew,
            projectName: project.name,
        };
    }
}
