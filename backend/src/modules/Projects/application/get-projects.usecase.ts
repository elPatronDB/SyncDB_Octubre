import type { IProjectRepository } from "../domain/project.repository.js";
import type { ProjectEntity } from "../domain/project.entity.js";
import type { Paginated } from "@shared/domain/paginated.js";
import type { Pagination } from "@shared/domain/pagination.js";

export class GetProjectsUseCase {
    constructor(private readonly projectRepository: IProjectRepository) {}

    async execute(
        userId: string,
        filters: { search?: string; status?: string },
        pagination: Pagination
    ): Promise<Paginated<ProjectEntity>> {
        return this.projectRepository.findMany(userId, filters, pagination);
    }
}
