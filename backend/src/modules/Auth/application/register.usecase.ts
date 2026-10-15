import AppError from "@shared/errors/AppError.js";
import type { HashProvider } from "@shared/domain/hash.provider.js";
import type { AuthRepository } from "../domain/auth.repository.js";
import type JwtProvider from "../domain/jwt.provider.js";

export interface RegisterDTO {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}

export interface RegisterResponse {
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

export class RegisterUseCase {
    constructor(
        private readonly authRepository: AuthRepository,
        private readonly jwtProvider: JwtProvider,
        private readonly hashProvider: HashProvider
    ) {}

    async execute(data: RegisterDTO): Promise<RegisterResponse> {
        const email = data.email.trim().toLowerCase();
        const firstName = data.firstName.trim();
        const lastName = data.lastName.trim();
        const password = data.password.trim();

        if (password.length < 8) {
            throw new AppError("Password must be at least 8 characters long", "INVALID_PASSWORD_LENGTH", 400);
        }

        const existingUser = await this.authRepository.findByEmail(email);
        if (existingUser) {
            throw new AppError("Email is already registered", "EMAIL_ALREADY_EXISTS", 409);
        }

        const passwordHash = await this.hashProvider.hash(password);

        const user = await this.authRepository.create({
            email,
            passwordHash,
            firstName,
            lastName,
        });

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
