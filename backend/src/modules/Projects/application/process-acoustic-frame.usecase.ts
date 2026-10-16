import type { IProjectRepository } from "../domain/project.repository.js";
import { AcousticInMemoryStore } from "../infrastructure/acoustic-in-memory.store.js";
import type { AcousticFrame } from "../domain/acoustic.entity.js";
import AppError from "@shared/errors/AppError.js";

export interface ProcessAcousticFrameDTO {
    deviceToken: string;
    timestamp?: number;
    sampleRate: number;
    nyquist: number;
    fftSize: number;
    rmsDb: number;
    peakFreq: number;
    bands: number[];
    spectrum?: number[];
    isMicActive: boolean;
    calibrationOffsetDb?: number;
}

export class ProcessAcousticFrameUseCase {
    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly acousticStore: AcousticInMemoryStore = AcousticInMemoryStore.getInstance()
    ) {}

    async execute(dto: ProcessAcousticFrameDTO): Promise<{ success: boolean; deviceId: string; timestamp: number }> {
        const device = await this.projectRepository.findDeviceByToken(dto.deviceToken);

        if (!device) {
            throw new AppError("Dispositivo no encontrado o token inválido", "NOT_FOUND", 404);
        }

        const now = dto.timestamp || Date.now();
        const effectiveOffset = dto.calibrationOffsetDb !== undefined
            ? dto.calibrationOffsetDb
            : device.calibrationOffsetDb;

        const isCalibrated = effectiveOffset !== 0;
        const splDb = isCalibrated ? dto.rmsDb + effectiveOffset : null;

        const frame: AcousticFrame = {
            deviceId: device.id,
            projectId: device.projectId,
            timestamp: now,
            sampleRate: dto.sampleRate,
            nyquist: dto.nyquist,
            fftSize: dto.fftSize,
            rmsDb: dto.rmsDb,
            splDb,
            peakFreq: dto.peakFreq,
            bands: dto.bands,
            spectrum: dto.spectrum || [],
            isCalibrated,
            calibrationOffsetDb: effectiveOffset,
            isMicActive: dto.isMicActive,
        };

        this.acousticStore.updateDeviceFrame(frame, device);

        return {
            success: true,
            deviceId: device.id,
            timestamp: now,
        };
    }
}
