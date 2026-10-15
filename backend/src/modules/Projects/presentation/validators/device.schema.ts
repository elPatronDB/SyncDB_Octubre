import z from "zod";

export const registerDeviceSchema = z.object({
    browserIdentifier: z.string().min(8, "Identificador persistente de navegador requerido"),
    name: z.string().max(100).optional().nullable(),
    role: z.enum(['ANCHOR', 'PROBE']).optional(),
    isAnchor: z.boolean().optional(),
    deviceModel: z.string().max(150).optional().nullable(),
    browserInfo: z.string().max(250).optional().nullable(),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    accuracy: z.number().min(0).optional().nullable(),
    altitude: z.number().optional().nullable(),
    hasLocationPermission: z.boolean().optional(),
});

export const updateLocationSchema = z.object({
    deviceToken: z.string().min(1, "Token de dispositivo requerido"),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    accuracy: z.number().min(0).optional().nullable(),
    altitude: z.number().optional().nullable(),
    hasLocationPermission: z.boolean(),
});

export const heartbeatSchema = z.object({
    deviceToken: z.string().min(1, "Token de dispositivo requerido"),
});

export const adminUpdateDeviceSchema = z.object({
    name: z.string().max(100).optional(),
    role: z.enum(['ANCHOR', 'PROBE']).optional(),
    isAnchor: z.boolean().optional(),
    positionX: z.number().optional().nullable(),
    positionY: z.number().optional().nullable(),
    positionZ: z.number().optional().nullable(),
    status: z.enum(['CONNECTED', 'DISCONNECTED']).optional(),
});
