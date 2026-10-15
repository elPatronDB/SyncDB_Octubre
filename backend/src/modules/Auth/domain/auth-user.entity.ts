export interface AuthUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string | null;
    avatarUrl?: string | null;
    isActive: boolean;
    isVerify: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}