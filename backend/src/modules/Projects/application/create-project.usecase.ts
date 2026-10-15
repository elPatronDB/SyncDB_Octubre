import type { IProjectRepository, CreateProjectInput } from "../domain/project.repository.js";
import type { ProjectEntity } from "../domain/project.entity.js";
import AppError from "@shared/errors/AppError.js";

export class CreateProjectUseCase {
    constructor(private readonly projectRepository: IProjectRepository) {}

    async execute(input: CreateProjectInput): Promise<ProjectEntity> {
        if (!input.name || input.name.trim() === '') {
            throw new AppError("El nombre del proyecto es obligatorio", "VALIDATION_ERROR", 400);
        }

        return this.projectRepository.create({
            ...input,
            name: input.name.trim(),
        });
    }
}
