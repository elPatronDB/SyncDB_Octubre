import { Router } from "express";
import { projectsController, acousticController } from "../projects.module.js";
import { AuthMiddleware } from "@app/middleware/Auth.middleware.js";
import { ValidatedMiddleware } from "@app/middleware/Validated.middleware.js";
import { createProjectSchema, updateProjectSchema } from "./validators/project.schema.js";
import { adminUpdateDeviceSchema } from "./validators/device.schema.js";
import { saveMeasurementSchema, updateCalibrationSchema } from "./validators/acoustic.schema.js";

const authMiddleware = new AuthMiddleware();
const validatedMiddleware = new ValidatedMiddleware();

const router = Router();

// Apply auth protection to all projects routes
router.use(authMiddleware.routeProtect);

router.get('/', projectsController.list);
router.post('/', validatedMiddleware.validateBody(createProjectSchema), projectsController.create);
router.get('/:id', projectsController.getById);
router.put('/:id', validatedMiddleware.validateBody(updateProjectSchema), projectsController.update);
router.delete('/:id', projectsController.delete);
router.post('/:id/regenerate-share-link', projectsController.regenerateShareLink);

// Device management within a project
router.get('/:id/devices', projectsController.getDevices);
router.patch('/:id/devices/:deviceId', validatedMiddleware.validateBody(adminUpdateDeviceSchema), projectsController.updateDevice);
router.delete('/:id/devices/:deviceId', projectsController.deleteDevice);

// Acoustic Monitoring & PA Calibration (Master Console)
router.get('/:id/acoustic/snapshot', acousticController.getSnapshot);
router.get('/:id/acoustic/stream', acousticController.streamEvents);
router.post('/:id/acoustic/reset', acousticController.resetCurves);
router.post('/:id/acoustic/measurements', validatedMiddleware.validateBody(saveMeasurementSchema), acousticController.saveMeasurement);
router.patch('/:id/devices/:deviceId/calibration', validatedMiddleware.validateBody(updateCalibrationSchema), acousticController.updateCalibration);

export default router;
