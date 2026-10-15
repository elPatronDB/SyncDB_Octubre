import z from "zod";

export const createProjectSchema = z.object({
    name: z.string().min(1, "El nombre del proyecto es requerido").max(200),
    description: z.string().max(2000).optional().nullable(),
    status: z.enum(['DRAFT', 'ACTIVE', 'CALIBRATING', 'COMPLETED', 'ARCHIVED']).optional(),
    roomWidth: z.number().positive("El ancho debe ser mayor a 0").optional().nullable(),
    roomLength: z.number().positive("El largo debe ser mayor a 0").optional().nullable(),
    roomHeight: z.number().positive("La altura debe ser mayor a 0").optional().nullable(),
});

export const updateProjectSchema = z.object({
    name: z.string().min(1, "El nombre del proyecto no puede estar vacío").max(200).optional(),
    description: z.string().max(2000).optional().nullable(),
    status: z.enum(['DRAFT', 'ACTIVE', 'CALIBRATING', 'COMPLETED', 'ARCHIVED']).optional(),
    isShareActive: z.boolean().optional(),
    roomWidth: z.number().positive("El ancho debe ser mayor a 0").optional().nullable(),
    roomLength: z.number().positive("El largo debe ser mayor a 0").optional().nullable(),
    roomHeight: z.number().positive("La altura debe ser mayor a 0").optional().nullable(),
});
