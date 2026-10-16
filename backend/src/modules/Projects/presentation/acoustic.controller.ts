import type { Request, Response, NextFunction } from "express";
import ResponseHttp from "@app/http/response.http.js";
import type { ProcessAcousticFrameUseCase } from "../application/process-acoustic-frame.usecase.js";
import type { GetAcousticSnapshotUseCase } from "../application/get-acoustic-snapshot.usecase.js";
import type { SaveAcousticMeasurementUseCase } from "../application/save-acoustic-measurement.usecase.js";
import type { UpdateDeviceCalibrationUseCase } from "../application/update-device-calibration.usecase.js";
import { AcousticInMemoryStore } from "../infrastructure/acoustic-in-memory.store.js";
import type { IProjectRepository } from "../domain/project.repository.js";
import AppError from "@shared/errors/AppError.js";

export class AcousticController {
    constructor(
        private readonly processAcousticFrameUseCase: ProcessAcousticFrameUseCase,
        private readonly getAcousticSnapshotUseCase: GetAcousticSnapshotUseCase,
        private readonly saveAcousticMeasurementUseCase: SaveAcousticMeasurementUseCase,
        private readonly updateDeviceCalibrationUseCase: UpdateDeviceCalibrationUseCase,
        private readonly projectRepository: IProjectRepository,
        private readonly acousticStore: AcousticInMemoryStore = AcousticInMemoryStore.getInstance()
    ) {}

    /**
     * Endpoint público para transmisión de datos espectrales desde dispositivos cliente
     * POST /api/public/devices/acoustic-data
     */
    postAcousticData = async (req: Request, res: Response, next: NextFunction) => {
        try {
            let token = req.body.deviceToken;
            const authHeader = req.headers.authorization;
            if (!token && authHeader?.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1];
            }

            if (!token) {
                throw new AppError("Token de dispositivo requerido", "UNAUTHORIZED", 401);
            }

            const result = await this.processAcousticFrameUseCase.execute({
                deviceToken: token,
                timestamp: req.body.timestamp,
                sampleRate: req.body.sampleRate,
                nyquist: req.body.nyquist,
                fftSize: req.body.fftSize,
                rmsDb: req.body.rmsDb,
                peakFreq: req.body.peakFreq,
                bands: req.body.bands,
                spectrum: req.body.spectrum,
                isMicActive: req.body.isMicActive,
                calibrationOffsetDb: req.body.calibrationOffsetDb,
            });

            return res.status(200).json(
                ResponseHttp.success("Muestra espectral recibida", result)
            );
        } catch (error) {
            next(error);
        }
    };

    /**
     * Consulta instantánea del estado acústico del proyecto para la Consola Master
     * GET /api/projects/:id/acoustic/snapshot
     */
    getSnapshot = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;

            const snapshot = await this.getAcousticSnapshotUseCase.execute(id as string, userId);

            return res.status(200).json(
                ResponseHttp.success("Estado acústico obtenido exitosamente", snapshot)
            );
        } catch (error) {
            next(error);
        }
    };

    /**
     * Canal Server-Sent Events (SSE) en tiempo real para la Consola Master
     * GET /api/projects/:id/acoustic/stream
     */
    streamEvents = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;

            // Verificar pertenencia y acceso al proyecto
            const project = await this.projectRepository.findById(id as string, userId);
            if (!project) {
                return res.status(404).json(ResponseHttp.error("Proyecto no encontrado o no autorizado", "NOT_FOUND"));
            }

            // Headers estándar SSE
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("X-Accel-Buffering", "no"); // Deshabilita buffering en Nginx
            if (typeof (res as any).flushHeaders === "function") {
                (res as any).flushHeaders();
            }

            // Enviar snapshot inicial
            const initialSnapshot = await this.getAcousticSnapshotUseCase.execute(id as string, userId);
            res.write(`event: initial_snapshot\ndata: ${JSON.stringify(initialSnapshot)}\n\n`);

            // Suscribirse a los eventos del proyecto
            const unsubscribe = this.acousticStore.subscribe(id as string, (eventType, data) => {
                res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
            });

            // Keepalive ping cada 15 segundos para evitar desconexiones de proxies o NAT
            const pingInterval = setInterval(() => {
                res.write(": keepalive\n\n");
            }, 15000);

            // Limpieza al cerrar la conexión
            req.on("close", () => {
                clearInterval(pingInterval);
                unsubscribe();
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Reiniciar curvas de máximos y medias temporales
     * POST /api/projects/:id/acoustic/reset
     */
    resetCurves = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;

            const project = await this.projectRepository.findById(id as string, userId);
            if (!project) {
                throw new AppError("Proyecto no encontrado", "NOT_FOUND", 404);
            }

            this.acousticStore.resetPeaksAndAverages(id as string);

            return res.status(200).json(
                ResponseHttp.success("Curvas de máximos y promedios reiniciadas con éxito", null)
            );
        } catch (error) {
            next(error);
        }
    };

    /**
     * Guardar una medición acústica persistente en la base de datos
     * POST /api/projects/:id/acoustic/measurements
     */
    saveMeasurement = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;
            const { deviceId, decibels, peakDb, frequency, coordX, coordY, coordZ } = req.body;

            const measurement = await this.saveAcousticMeasurementUseCase.execute({
                projectId: id as string,
                userId,
                deviceId,
                decibels,
                peakDb,
                frequency,
                coordX,
                coordY,
                coordZ,
            });

            return res.status(201).json(
                ResponseHttp.success("Medición acústica guardada exitosamente", measurement)
            );
        } catch (error) {
            next(error);
        }
    };

    /**
     * Actualizar compensación de calibración acústica de un dispositivo
     * PATCH /api/projects/:id/devices/:deviceId/calibration
     */
    updateCalibration = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id, deviceId } = req.params;
            const userId = (req as any).user?.id;
            const { calibrationOffsetDb, audioSpecs } = req.body;

            const updatedDevice = await this.updateDeviceCalibrationUseCase.execute({
                projectId: id as string,
                userId,
                deviceId: deviceId as string,
                calibrationOffsetDb,
                audioSpecs,
            });

            return res.status(200).json(
                ResponseHttp.success("Calibración del dispositivo actualizada", updatedDevice)
            );
        } catch (error) {
            next(error);
        }
    };
}
