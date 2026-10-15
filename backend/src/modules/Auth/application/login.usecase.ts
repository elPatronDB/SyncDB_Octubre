import AppError from "@shared/errors/AppError.js";
import type { HashProvider } from "@shared/domain/hash.provider.js";
import type { AuthRepository } from "../domain/auth.repository.js";
import type JwtProvider from "../domain/jwt.provider.js";

interface LoginDTO {
    email: string;
    password: string;
}

interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        name: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl?: string | null;
        isVerify: boolean;
    };
}

export class LoginUseCase {
    constructor(
        private readonly authRepository: AuthRepository,
        private readonly jwtProvider: JwtProvider,
        private readonly hashProvider: HashProvider
    ) { }

    async execute(data: LoginDTO): Promise<LoginResponse> {
        const { email, password } = data;

        const user = await this.authRepository.findByEmail(email.trim().toLowerCase());

        if (!user) {
            throw new AppError("Invalid credentials", "INVALID_CREDENTIALS", 401);
        }

        if (user.passwordHash === null) {
            throw new AppError("User has no password", "USER_NO_PASSWORD", 403);
        }

        if (!user.isActive) {
            throw new AppError("User is inactive", "USER_INACTIVE", 403);
        }

        let isValid = false;
        try {
            isValid = await this.hashProvider.compare(password, user.passwordHash);
        } catch (error) {
            console.error("Error comparing password", error);
            throw new AppError("Error comparing password", "INVALID_CREDENTIALS", 401);
        }

        if (!isValid) {
            throw new AppError("Invalid credentials", "INVALID_CREDENTIALS", 401);
        }

        const { accessToken, refreshToken } = await this.jwtProvider.generateTokens(
            user.id,
            user.email
        );

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await this.authRepository.upsertSession(
            user.id,
            refreshToken,
            expiresAt
        );

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: `${user.firstName} ${user.lastName}`.trim(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                avatarUrl: user.avatarUrl,
                isVerify: user.isVerify,
            }
        };
    }
}