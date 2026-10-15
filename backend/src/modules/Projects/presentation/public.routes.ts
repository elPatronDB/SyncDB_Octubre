import { Router } from "express";
import { publicController } from "../projects.module.js";
import { ValidatedMiddleware } from "@app/middleware/Validated.middleware.js";
import { registerDeviceSchema, updateLocationSchema, heartbeatSchema } from "./validators/device.schema.js";

const validatedMiddleware = new ValidatedMiddleware();

const router = Router();

// Public Project Information by accessCode (for share link verification)
router.get('/projects/:accessCode', publicController.getProject);

// Public Device Registration / Reconnect
router.post(
    '/projects/:accessCode/devices/register',
    validatedMiddleware.validateBody(registerDeviceSchema),
    publicController.registerDevice
);

// Location Updates (authenticated via deviceToken in body or Bearer header)
router.post(
    '/devices/location',
    validatedMiddleware.validateBody(updateLocationSchema),
    publicController.updateLocation
);

// Device Heartbeat (keepalive)
router.post(
    '/devices/heartbeat',
    validatedMiddleware.validateBody(heartbeatSchema),
    publicController.heartbeat
);

export default router;
