import type { User } from "@prisma/client";
import type { AuthUser } from "../../domain/auth-user.entity.js";

export class AuthMapper {
    static toDomain(user: User): AuthUser {
        return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            passwordHash: user.passwordHash,
            avatarUrl: user.avatarUrl,
            isActive: user.isActive,
            isVerify: Boolean(user.isVerify),
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}