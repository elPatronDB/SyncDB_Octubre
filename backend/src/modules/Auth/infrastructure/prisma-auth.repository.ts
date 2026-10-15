import type { PrismaClient } from "@prisma/client";
import type { AuthRepository, CreateAuthUserData } from "../domain/auth.repository.js";
import type { AuthUser } from "../domain/auth-user.entity.js";
import type { AuthSession } from "../domain/auth-session.entity.js";
import { AuthMapper } from "./mappers/auth.mapper.js";

export class PrismaAuthRespository implements AuthRepository {
    constructor(private readonly db: PrismaClient) { }

    async findByEmail(email: AuthUser["email"]): Promise<AuthUser | null> {
        const user = await this.db.user.findFirst({
            where: { email }
        });

        if (!user) return null;

        return AuthMapper.toDomain(user);
    }

    async findById(id: AuthUser["id"]): Promise<AuthUser | null> {
        const user = await this.db.user.findUnique({
            where: { id }
        });

        if (!user) return null;

        return AuthMapper.toDomain(user);
    }

    async upsertSession(
        userId: AuthUser["id"],
        token: AuthSession['token'],
        expiresAt: Date
    ): Promise<void> {
        await this.db.userSession.upsert({
            where: { userId },
            update: {
                token,
                expiresAt
            },
            create: {
                userId,
                token,
                expiresAt
            }
        });
    }

    async findSessionByToken(token: AuthSession["token"]): Promise<AuthSession | null> {
        const sessionDb = await this.db.userSession.findUnique({
            where: { token }
        });

        if (!sessionDb) return null;

        return {
            id: sessionDb.id,
            token: sessionDb.token,
            userId: sessionDb.userId,
            expiresAt: sessionDb.expiresAt,
            createdAt: sessionDb.createdAt
        };
    }

    async findSessionByUserId(userId: AuthUser["id"]): Promise<AuthSession | null> {
        const sessionDb = await this.db.userSession.findFirst({
            where: { userId }
        });

        if (!sessionDb) return null;

        return {
            id: sessionDb.id,
            token: sessionDb.token,
            userId: sessionDb.userId,
            expiresAt: sessionDb.expiresAt,
            createdAt: sessionDb.createdAt
        };
    }

    async deleteSession(userId: AuthUser["id"]): Promise<void> {
        await this.db.userSession.deleteMany({
            where: { userId }
        });
    }

    async create(data: CreateAuthUserData): Promise<AuthUser> {
        const user = await this.db.user.create({
            data: {
                email: data.email,
                passwordHash: data.passwordHash,
                firstName: data.firstName,
                lastName: data.lastName,
                isActive: true,
                isVerify: false,
            }
        });

        return AuthMapper.toDomain(user);
    }

    async updatePassword(userId: AuthUser["id"], passwordHash: string): Promise<void> {
        await this.db.user.update({
            where: { id: userId },
            data: { passwordHash }
        });
    }

    async updateVerification(userId: AuthUser["id"], isVerify: boolean): Promise<void> {
        await this.db.user.update({
            where: { id: userId },
            data: { isVerify }
        });
    }
}