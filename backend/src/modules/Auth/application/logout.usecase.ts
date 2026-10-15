import type { AuthRepository } from "../domain/auth.repository.js";

export class LogoutUseCase {
    constructor(
        private readonly authRepository: AuthRepository
    ) { }

    async execute(userId: string): Promise<void> {
        await this.authRepository.deleteSession(userId);
    }
}
