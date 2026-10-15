import { PrismaClient } from "@prisma/client";
import { PrismaProjectRepository } from "./infrastructure/prisma-project.repository.js";
import { CreateProjectUseCase } from "./application/create-project.usecase.js";
import { GetProjectsUseCase } from "./application/get-projects.usecase.js";
import { GetProjectByIdUseCase } from "./application/get-project-by-id.usecase.js";
import { UpdateProjectUseCase } from "./application/update-project.usecase.js";
import { DeleteProjectUseCase } from "./application/delete-project.usecase.js";
import { RegenerateShareLinkUseCase } from "./application/regenerate-share-link.usecase.js";
import { GetProjectDevicesUseCase } from "./application/get-project-devices.usecase.js";
import { UpdateDeviceAdminUseCase } from "./application/update-device-admin.usecase.js";
import { DeleteDeviceAdminUseCase } from "./application/delete-device-admin.usecase.js";
import { GetPublicProjectUseCase } from "./application/get-public-project.usecase.js";
import { RegisterDeviceUseCase } from "./application/register-device.usecase.js";
import { UpdateDeviceLocationUseCase } from "./application/update-device-location.usecase.js";
import { HeartbeatDeviceUseCase } from "./application/heartbeat-device.usecase.js";
import { ProjectsController } from "./presentation/projects.controller.js";
import { PublicController } from "./presentation/public.controller.js";

const prisma = new PrismaClient();

const projectRepository = new PrismaProjectRepository(prisma);

const createProjectUseCase = new CreateProjectUseCase(projectRepository);
const getProjectsUseCase = new GetProjectsUseCase(projectRepository);
const getProjectByIdUseCase = new GetProjectByIdUseCase(projectRepository);
const updateProjectUseCase = new UpdateProjectUseCase(projectRepository);
const deleteProjectUseCase = new DeleteProjectUseCase(projectRepository);
const regenerateShareLinkUseCase = new RegenerateShareLinkUseCase(projectRepository);
const getProjectDevicesUseCase = new GetProjectDevicesUseCase(projectRepository);
const updateDeviceAdminUseCase = new UpdateDeviceAdminUseCase(projectRepository);
const deleteDeviceAdminUseCase = new DeleteDeviceAdminUseCase(projectRepository);

const getPublicProjectUseCase = new GetPublicProjectUseCase(projectRepository);
const registerDeviceUseCase = new RegisterDeviceUseCase(projectRepository);
const updateDeviceLocationUseCase = new UpdateDeviceLocationUseCase(projectRepository);
const heartbeatDeviceUseCase = new HeartbeatDeviceUseCase(projectRepository);

export const projectsController = new ProjectsController(
    createProjectUseCase,
    getProjectsUseCase,
    getProjectByIdUseCase,
    updateProjectUseCase,
    deleteProjectUseCase,
    regenerateShareLinkUseCase,
    getProjectDevicesUseCase,
    updateDeviceAdminUseCase,
    deleteDeviceAdminUseCase,
);

export const publicController = new PublicController(
    getPublicProjectUseCase,
    registerDeviceUseCase,
    updateDeviceLocationUseCase,
    heartbeatDeviceUseCase,
);
