import type { IProjectRepository } from "../domain/project.repository.js";
import AppError from "@shared/errors/AppError.js";

export interface PublicProjectDto {
    id: string;
    name: string;
    description: string | null;
    status: string;
    isShareActive: boolean;
    accessCode: string;
    deviceCount?: number;
    anchorCount?: number;
}

export class GetPublicProjectUseCase {
    constructor(private readonly projectRepository: IProjectRepository) {}

    async execute(accessCode: string): Promise<PublicProjectDto> {
        if (!accessCode || accessCode.trim() === '') {
            throw new AppError("Código de acceso inválido", "INVALID_ACCESS_CODE", 400);
        }

        const project = await this.projectRepository.findByAccessCode(accessCode.trim());
        if (!project) {
            throw new AppError("Proyecto no encontrado o enlace incorrecto", "PROJECT_NOT_FOUND", 404);
        }

        if (!project.isShareActive) {
            throw new AppError("El enlace de este proyecto ha sido desactivado o revocado", "SHARE_LINK_INACTIVE", 403);
        }

        if (project.status === 'ARCHIVED') {
            throw new AppError("El proyecto se encuentra archivado y no acepta nuevos registros", "PROJECT_ARCHIVED", 403);
        }

        return {
            id: project.id,
            name: project.name,
            description: project.description,
            status: project.status,
            isShareActive: project.isShareActive,
            accessCode: project.accessCode,
            deviceCount: project.deviceCount,
            anchorCount: project.anchorCount,
        };
    }
}
