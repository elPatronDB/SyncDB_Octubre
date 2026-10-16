import type { Request, Response, NextFunction } from "express";
import JwtProvider from "@modules/Auth/domain/jwt.provider.js";
import AppError from "@shared/errors/AppError.js";

export class AuthMiddleware {
    private readonly jwtProvider: JwtProvider;

    constructor() {
        this.jwtProvider = new JwtProvider();
    }

    /**
     * Middleware principal para proteger rutas mediante Bearer JWT
     */
    public routeProtect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            let token: string | undefined;
            const authHeader = req.headers.authorization;

            if (authHeader && authHeader.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1];
            } else if (req.query.token && typeof req.query.token === "string") {
                token = req.query.token;
            }

            if (!token) {
                throw new AppError("Unauthorized: Token not provided", "UNAUTHORIZED", 401);
            }

            const payload = await this.jwtProvider.verifyToken(String(token));

            res.locals.user = {
                id: payload.sub as string,
                email: payload.email as string,
            };

            (req as any).user = res.locals.user;

            next();
        } catch (error: any) {
            if (error.code === 'ERR_JWT_EXPIRED') {
                next(new AppError("the token has expired", "TOKEN_EXPIRED", 401));
                return;
            }

            if (error instanceof AppError) {
                next(error);
            } else {
                next(new AppError("Invalid Token", "INVALID_TOKEN", 401));
            }
        }
    };
}