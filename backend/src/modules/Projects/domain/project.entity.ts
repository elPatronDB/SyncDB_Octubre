export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'CALIBRATING' | 'COMPLETED' | 'ARCHIVED';

export interface ProjectEntity {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    accessCode: string;
    isShareActive: boolean;
    status: ProjectStatus;
    roomWidth: number | null;
    roomLength: number | null;
    roomHeight: number | null;
    createdAt: Date;
    updatedAt: Date;
    deviceCount?: number;
    anchorCount?: number;
}
