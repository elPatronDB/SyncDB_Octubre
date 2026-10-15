import type { Request, Response, NextFunction } from "express";
import BaseController from "@presentation/base.controller.js";
import ResponseHttp from "@app/http/response.http.js";
import type { CreateProjectUseCase } from "../application/create-project.usecase.js";
import type { GetProjectsUseCase } from "../application/get-projects.usecase.js";
import type { GetProjectByIdUseCase } from "../application/get-project-by-id.usecase.js";
import type { UpdateProjectUseCase } from "../application/update-project.usecase.js";
import type { DeleteProjectUseCase } from "../application/delete-project.usecase.js";
import type { RegenerateShareLinkUseCase } from "../application/regenerate-share-link.usecase.js";
import type { GetProjectDevicesUseCase } from "../application/get-project-devices.usecase.js";
import type { UpdateDeviceAdminUseCase } from "../application/update-device-admin.usecase.js";
import type { DeleteDeviceAdminUseCase } from "../application/delete-device-admin.usecase.js";

export class ProjectsController extends BaseController {
    constructor(
        private readonly createProjectUseCase: CreateProjectUseCase,
        private readonly getProjectsUseCase: GetProjectsUseCase,
        private readonly getProjectByIdUseCase: GetProjectByIdUseCase,
        private readonly updateProjectUseCase: UpdateProjectUseCase,
        private readonly deleteProjectUseCase: DeleteProjectUseCase,
        private readonly regenerateShareLinkUseCase: RegenerateShareLinkUseCase,
        private readonly getProjectDevicesUseCase: GetProjectDevicesUseCase,
        private readonly updateDeviceAdminUseCase: UpdateDeviceAdminUseCase,
        private readonly deleteDeviceAdminUseCase: DeleteDeviceAdminUseCase,
    ) {
        super();
    }

    list = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const page = parseInt(req.query.page as string, 10) || 1;
            const perPage = parseInt(req.query.perPage as string, 10) || 10;
            const search = (req.query.search as string) || '';
            const status = (req.query.status as string) || undefined;

            const result = await this.getProjectsUseCase.execute(
                user.id,
                { search, status },
                { page, perPage }
            );

            return res.status(200).json(
                ResponseHttp.pagination(
                    "Proyectos obtenidos exitosamente",
                    result.data,
                    result.total,
                    result.perPage,
                    (result.page - 1) * result.perPage
                )
            );
        } catch (error) {
            next(error);
        }
    };

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const { id } = req.params;

            const project = await this.getProjectByIdUseCase.execute(id as string, user.id);

            return res.status(200).json(
                ResponseHttp.success("Proyecto obtenido exitosamente", project)
            );
        } catch (error) {
            next(error);
        }
    };

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const { name, description, status, roomWidth, roomLength, roomHeight } = req.body;

            const project = await this.createProjectUseCase.execute({
                userId: user.id,
                name,
                description,
                status,
                roomWidth,
                roomLength,
                roomHeight,
            });

            return res.status(201).json(
                ResponseHttp.success("Proyecto creado exitosamente", project)
            );
        } catch (error) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const { id } = req.params;
            const { name, description, status, isShareActive, roomWidth, roomLength, roomHeight } = req.body;

            const project = await this.updateProjectUseCase.execute(id as string, user.id, {
                name,
                description,
                status,
                isShareActive,
                roomWidth,
                roomLength,
                roomHeight,
            });

            return res.status(200).json(
                ResponseHttp.success("Proyecto actualizado exitosamente", project)
            );
        } catch (error) {
            next(error);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const { id } = req.params;

            await this.deleteProjectUseCase.execute(id as string, user.id);

            return res.status(200).json(
                ResponseHttp.success("Proyecto eliminado exitosamente", null)
            );
        } catch (error) {
            next(error);
        }
    };

    regenerateShareLink = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const { id } = req.params;

            const project = await this.regenerateShareLinkUseCase.execute(id as string, user.id);

            return res.status(200).json(
                ResponseHttp.success("Enlace de compartición regenerado exitosamente", {
                    accessCode: project.accessCode,
                    isShareActive: project.isShareActive,
                })
            );
        } catch (error) {
            next(error);
        }
    };

    getDevices = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const { id } = req.params;

            const devices = await this.getProjectDevicesUseCase.execute(id as string, user.id);

            return res.status(200).json(
                ResponseHttp.success("Dispositivos obtenidos exitosamente", devices)
            );
        } catch (error) {
            next(error);
        }
    };

    updateDevice = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const { id, deviceId } = req.params;
            const { name, role, isAnchor, positionX, positionY, positionZ, status } = req.body;

            const updatedDevice = await this.updateDeviceAdminUseCase.execute(
                id as string,
                deviceId as string,
                user.id,
                { name, role, isAnchor, positionX, positionY, positionZ, status }
            );

            return res.status(200).json(
                ResponseHttp.success("Dispositivo actualizado exitosamente", updatedDevice)
            );
        } catch (error) {
            next(error);
        }
    };

    deleteDevice = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = this.obtenerEntorno(res);
            const { id, deviceId } = req.params;

            await this.deleteDeviceAdminUseCase.execute(id as string, deviceId as string, user.id);

            return res.status(200).json(
                ResponseHttp.success("Dispositivo eliminado del proyecto", null)
            );
        } catch (error) {
            next(error);
        }
    };
}
