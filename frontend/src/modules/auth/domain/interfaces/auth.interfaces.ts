export interface AuthUser {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
    isActive?: boolean;
    isVerify?: boolean;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken?: string;
}
