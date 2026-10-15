import type { Request, Response, NextFunction } from "express";
import ResponseHttp from "@app/http/response.http.js";
import type { GetPublicProjectUseCase } from "../application/get-public-project.usecase.js";
import type { RegisterDeviceUseCase } from "../application/register-device.usecase.js";
import type { UpdateDeviceLocationUseCase } from "../application/update-device-location.usecase.js";
import type { HeartbeatDeviceUseCase } from "../application/heartbeat-device.usecase.js";

export class PublicController {
    constructor(
        private readonly getPublicProjectUseCase: GetPublicProjectUseCase,
        private readonly registerDeviceUseCase: RegisterDeviceUseCase,
        private readonly updateDeviceLocationUseCase: UpdateDeviceLocationUseCase,
        private readonly heartbeatDeviceUseCase: HeartbeatDeviceUseCase,
    ) {}

    getProject = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { accessCode } = req.params;
            const project = await this.getPublicProjectUseCase.execute(accessCode as string);

            return res.status(200).json(
                ResponseHttp.success("Información del proyecto obtenida", project)
            );
        } catch (error) {
            next(error);
        }
    };

    registerDevice = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { accessCode } = req.params;
            const {
                browserIdentifier,
                name,
                role,
                isAnchor,
                deviceModel,
                browserInfo,
                latitude,
                longitude,
                accuracy,
                altitude,
                hasLocationPermission
            } = req.body;

            const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null;

            const result = await this.registerDeviceUseCase.execute({
                accessCode: accessCode as string,
                browserIdentifier,
                name,
                role,
                isAnchor,
                deviceModel,
                browserInfo,
                latitude,
                longitude,
                accuracy,
                altitude,
                hasLocationPermission,
                ipAddress: clientIp,
            });

            return res.status(result.isNew ? 201 : 200).json(
                ResponseHttp.success(
                    result.isNew ? "Dispositivo registrado exitosamente" : "Dispositivo sincronizado exitosamente",
                    result
                )
            );
        } catch (error) {
            next(error);
        }
    };

    updateLocation = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Bearer token or body token
            let token = req.body.deviceToken;
            const authHeader = req.headers.authorization;
            if (!token && authHeader?.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1];
            }

            const {
                latitude,
                longitude,
                accuracy,
                altitude,
                hasLocationPermission,
            } = req.body;

            const device = await this.updateDeviceLocationUseCase.execute({
                deviceToken: token,
                latitude,
                longitude,
                accuracy,
                altitude,
                hasLocationPermission: hasLocationPermission ?? true,
            });

            return res.status(200).json(
                ResponseHttp.success("Ubicación geográfica actualizada exitosamente", {
                    deviceId: device.id,
                    latitude: device.latitude,
                    longitude: device.longitude,
                    accuracy: device.accuracy,
                    lastLocationAt: device.lastLocationAt,
                    status: device.status,
                })
            );
        } catch (error) {
            next(error);
        }
    };

    heartbeat = async (req: Request, res: Response, next: NextFunction) => {
        try {
            let token = req.body.deviceToken;
            const authHeader = req.headers.authorization;
            if (!token && authHeader?.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1];
            }

            await this.heartbeatDeviceUseCase.execute(token);

            return res.status(200).json(
                ResponseHttp.success("Latido de actividad recibido", { status: 'CONNECTED' })
            );
        } catch (error) {
            next(error);
        }
    };
}
