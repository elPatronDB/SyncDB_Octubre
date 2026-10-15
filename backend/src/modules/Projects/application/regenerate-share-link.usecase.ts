import type { IProjectRepository } from "../domain/project.repository.js";
import type { ProjectEntity } from "../domain/project.entity.js";
import AppError from "@shared/errors/AppError.js";

export class RegenerateShareLinkUseCase {
    constructor(private readonly projectRepository: IProjectRepository) {}

    async execute(id: string, userId: string): Promise<ProjectEntity> {
        const existing = await this.projectRepository.findById(id, userId);
        if (!existing) {
            throw new AppError("Proyecto no encontrado", "PROJECT_NOT_FOUND", 404);
        }

        return this.projectRepository.regenerateAccessCode(id, userId);
    }
}
