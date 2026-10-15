import { api } from '../../../../core/api';
import type {
    Project,
    Device,
    CreateProjectFormValues,
    UpdateProjectFormValues
} from '../../domain/project.types';

interface ApiResponse<T> {
    status: string;
    message: string;
    data: T;
    meta?: {
        total: number;
        limit: number;
        offset: number;
    };
}

export interface GetProjectsParams {
    page?: number;
    perPage?: number;
    search?: string;
    status?: string;
}

export interface PaginatedProjectsResponse {
    data: Project[];
    total: number;
    limit: number;
    offset: number;
}

export const getProjects = async (params?: GetProjectsParams): Promise<PaginatedProjectsResponse> => {
    const response = await api.get<ApiResponse<Project[]>>('/projects', { params });
    return {
        data: response.data.data,
        total: response.data.meta?.total ?? response.data.data.length,
        limit: response.data.meta?.limit ?? (params?.perPage ?? 10),
        offset: response.data.meta?.offset ?? 0,
    };
};

export const getProjectById = async (id: string): Promise<Project> => {
    const response = await api.get<ApiResponse<Project>>(`/projects/${id}`);
    return response.data.data;
};

export const createProject = async (data: CreateProjectFormValues): Promise<Project> => {
    const response = await api.post<ApiResponse<Project>>('/projects', data);
    return response.data.data;
};

export const updateProject = async (id: string, data: UpdateProjectFormValues): Promise<Project> => {
    const response = await api.put<ApiResponse<Project>>(`/projects/${id}`, data);
    return response.data.data;
};

export const deleteProject = async (id: string): Promise<void> => {
    await api.delete<ApiResponse<null>>(`/projects/${id}`);
};

export const regenerateShareLink = async (id: string): Promise<{ accessCode: string; isShareActive: boolean }> => {
    const response = await api.post<ApiResponse<{ accessCode: string; isShareActive: boolean }>>(
        `/projects/${id}/regenerate-share-link`
    );
    return response.data.data;
};

export const getProjectDevices = async (projectId: string): Promise<Device[]> => {
    const response = await api.get<ApiResponse<Device[]>>(`/projects/${projectId}/devices`);
    return response.data.data;
};

export const updateProjectDevice = async (
    projectId: string,
    deviceId: string,
    data: Partial<Device>
): Promise<Device> => {
    const response = await api.patch<ApiResponse<Device>>(`/projects/${projectId}/devices/${deviceId}`, data);
    return response.data.data;
};

export const deleteProjectDevice = async (projectId: string, deviceId: string): Promise<void> => {
    await api.delete<ApiResponse<null>>(`/projects/${projectId}/devices/${deviceId}`);
};
