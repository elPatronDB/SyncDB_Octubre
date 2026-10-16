import { z } from "zod";

export const postAcousticFrameSchema = z.object({
    deviceToken: z.string().min(1, "El deviceToken es requerido"),
    timestamp: z.number().optional(),
    sampleRate: z.number().min(8000, "Frecuencia de muestreo mínima 8 kHz").max(192000),
    nyquist: z.number().min(4000).max(96000),
    fftSize: z.number().min(128).max(16384),
    rmsDb: z.number().min(-150).max(50),
    peakFreq: z.number().min(0).max(48000),
    bands: z.array(z.number()).min(1, "Se requieren bandas espectrales"),
    spectrum: z.array(z.number()).optional(),
    isMicActive: z.boolean(),
    calibrationOffsetDb: z.number().optional(),
});

export const saveMeasurementSchema = z.object({
    deviceId: z.string().uuid("ID de dispositivo inválido"),
    decibels: z.number(),
    peakDb: z.number().optional().nullable(),
    frequency: z.number().optional().nullable(),
    coordX: z.number().optional(),
    coordY: z.number().optional(),
    coordZ: z.number().optional(),
});

export const updateCalibrationSchema = z.object({
    calibrationOffsetDb: z.number().min(-120).max(120),
    audioSpecs: z.record(z.string(), z.any()).optional().nullable(),
});
