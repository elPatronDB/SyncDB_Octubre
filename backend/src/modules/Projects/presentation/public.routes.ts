import { Router } from "express";
import { publicController, acousticController } from "../projects.module.js";
import { ValidatedMiddleware } from "@app/middleware/Validated.middleware.js";
import { registerDeviceSchema, updateLocationSchema, heartbeatSchema } from "./validators/device.schema.js";
import { postAcousticFrameSchema } from "./validators/acoustic.schema.js";

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

// Real-time Acoustic Spectrum Transmission from Device (authenticated via deviceToken)
router.post(
    '/devices/acoustic-data',
    validatedMiddleware.validateBody(postAcousticFrameSchema),
    acousticController.postAcousticData
);

export default router;
