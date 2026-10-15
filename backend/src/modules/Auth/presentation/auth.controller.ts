import ResponseHttp from "@app/http/response.http.js";
import type { LoginUseCase } from "../application/login.usecase.js";
import type { RegisterUseCase } from "../application/register.usecase.js";
import type { Request, Response, NextFunction } from "express";
import AppError from "@shared/errors/AppError.js";
import type { RefreshTokenUseCase } from "../application/refresh-token.usecase.js";
import type { GetProfileUseCase } from "../application/get-profile.usecase.js";
import type { LogoutUseCase } from "../application/logout.usecase.js";
import BaseController from "@presentation/base.controller.js";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
};

const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

export class AuthController extends BaseController {
    constructor(
        private readonly loginUseCase: LoginUseCase,
        private readonly registerUseCase: RegisterUseCase,
        private readonly refreshTokenUseCase: RefreshTokenUseCase,
        private readonly getProfileUseCase: GetProfileUseCase,
        private readonly logoutUseCase: LogoutUseCase
    ) {
        super();
    }

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email, password } = req.body;

            const { accessToken, refreshToken, user } = await this.loginUseCase.execute({ email, password });

            res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);

            return res.status(200).json(
                ResponseHttp.success("Login successful", { accessToken, user })
            );
        } catch (error) {
            next(error);
        }
    };

    register = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email, password, firstName, lastName } = req.body;

            const { accessToken, refreshToken, user } = await this.registerUseCase.execute({
                email,
                password,
                firstName,
                lastName,
            });

            res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);

            return res.status(201).json(
                ResponseHttp.success("Registration successful", { accessToken, user })
            );
        } catch (error) {
            next(error);
        }
    };

    logout = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userCtx = res.locals.user;

            if (userCtx?.id) {
                await this.logoutUseCase.execute(userCtx.id);
            }

            res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: 'strict',
                path: '/'
            });

            return res.status(200).json(
                ResponseHttp.success("Logout successful", null)
            );
        } catch (error) {
            next(error);
        }
    };

    refresh = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tokenReceived = req.cookies.refreshToken;

            if (!tokenReceived) {
                throw new AppError("You must log in again", "MISSING_COOKIE", 401);
            }

            const { accessToken, refreshToken, user } = await this.refreshTokenUseCase.execute(tokenReceived);

            res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);

            return res.status(200).json(
                ResponseHttp.success("Token renewed", { accessToken, user })
            );

        } catch (error) {
            next(error);
        }
    };

    getProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userCtx = res.locals.user;
            if (!userCtx) {
                throw new AppError("Unauthenticated user", "UNAUTHORIZED", 401);
            }

            const profile = await this.getProfileUseCase.execute(userCtx.id);

            return res.status(200).json(
                ResponseHttp.success("Profile fetched", profile)
            );
        } catch (error) {
            next(error);
        }
    };
}