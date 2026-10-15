import type { IProjectRepository } from "../domain/project.repository.js";
import type { ProjectEntity } from "../domain/project.entity.js";
import AppError from "@shared/errors/AppError.js";

export class GetProjectByIdUseCase {
    constructor(private readonly projectRepository: IProjectRepository) {}

    async execute(id: string, userId: string): Promise<ProjectEntity> {
        const project = await this.projectRepository.findById(id, userId);
        if (!project) {
            throw new AppError("Proyecto no encontrado", "PROJECT_NOT_FOUND", 404);
        }
        return project;
    }
}
