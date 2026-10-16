import type { IProjectRepository } from "../domain/project.repository.js";
import { AcousticInMemoryStore } from "../infrastructure/acoustic-in-memory.store.js";
import type { DeviceAcousticState, ProjectAcousticAggregate } from "../domain/acoustic.entity.js";
import AppError from "@shared/errors/AppError.js";

export interface AcousticSnapshotResponse {
    projectId: string;
    projectName: string;
    aggregate: ProjectAcousticAggregate;
    devices: DeviceAcousticState[];
}

export class GetAcousticSnapshotUseCase {
    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly acousticStore: AcousticInMemoryStore = AcousticInMemoryStore.getInstance()
    ) {}

    async execute(projectId: string, userId: string): Promise<AcousticSnapshotResponse> {
        const project = await this.projectRepository.findById(projectId, userId);
        if (!project) {
            throw new AppError("Proyecto no encontrado o no autorizado", "NOT_FOUND", 404);
        }

        const dbDevices = await this.projectRepository.findDevicesByProjectId(projectId);
        const { aggregate, devices: memoryDevices } = this.acousticStore.getSnapshot(projectId);

        // Ensure all DB devices are represented in the list even if no audio frames have been received yet
        const memoryDeviceMap = new Map<string, DeviceAcousticState>();
        memoryDevices.forEach((d) => memoryDeviceMap.set(d.deviceId, d));

        const mergedDevices: DeviceAcousticState[] = dbDevices.map((dbDev) => {
            const memDev = memoryDeviceMap.get(dbDev.id);
            if (memDev) {
                return {
                    ...memDev,
                    deviceName: dbDev.name || memDev.deviceName,
                    role: dbDev.role,
                    isAnchor: dbDev.isAnchor,
                    isOnline: dbDev.status === 'CONNECTED',
                    calibrationOffsetDb: dbDev.calibrationOffsetDb,
                    isCalibrated: dbDev.calibrationOffsetDb !== 0 || memDev.isCalibrated,
                };
            }

            return {
                deviceId: dbDev.id,
                projectId: dbDev.projectId,
                deviceName: dbDev.name || (dbDev.isAnchor ? 'Ancla' : 'Sonda Acústica'),
                role: dbDev.role,
                isAnchor: dbDev.isAnchor,
                isOnline: dbDev.status === 'CONNECTED',
                isMicActive: false,
                isCalibrated: dbDev.calibrationOffsetDb !== 0,
                calibrationOffsetDb: dbDev.calibrationOffsetDb,
                sampleRate: 0,
                nyquist: 0,
                lastSeenAcoustic: null,
                latestFrame: null,
                peakHoldCurve: new Array(31).fill(-100),
                avgCurve: new Array(31).fill(-100),
                historyFramesCount: 0,
            };
        });

        return {
            projectId: project.id,
            projectName: project.name,
            aggregate,
            devices: mergedDevices,
        };
    }
}
