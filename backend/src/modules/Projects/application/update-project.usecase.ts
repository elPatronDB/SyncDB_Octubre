import type { IProjectRepository, UpdateProjectInput } from "../domain/project.repository.js";
import type { ProjectEntity } from "../domain/project.entity.js";
import AppError from "@shared/errors/AppError.js";

export class UpdateProjectUseCase {
    constructor(private readonly projectRepository: IProjectRepository) {}

    async execute(id: string, userId: string, data: UpdateProjectInput): Promise<ProjectEntity> {
        const existing = await this.projectRepository.findById(id, userId);
        if (!existing) {
            throw new AppError("Proyecto no encontrado", "PROJECT_NOT_FOUND", 404);
        }

        if (data.name !== undefined && data.name.trim() === '') {
            throw new AppError("El nombre del proyecto no puede estar vacío", "VALIDATION_ERROR", 400);
        }

        return this.projectRepository.update(id, userId, {
            ...data,
            name: data.name ? data.name.trim() : undefined,
        });
    }
}
