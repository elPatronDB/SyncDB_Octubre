import AppError from "@shared/errors/AppError.js";
import type { AuthRepository } from "../domain/auth.repository.js";

interface GetProfileResponse {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
    isActive: boolean;
    isVerify: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export class GetProfileUseCase {
    constructor(
        private readonly authRepository: AuthRepository
    ) { }

    async execute(userId: string): Promise<GetProfileResponse> {
        const user = await this.authRepository.findById(userId);

        if (!user) {
            throw new AppError("User not found", "NOT_FOUND", 404);
        }

        return {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`.trim(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            avatarUrl: user.avatarUrl,
            isActive: user.isActive,
            isVerify: user.isVerify,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
