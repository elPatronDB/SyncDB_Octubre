import { z } from 'zod';

export const projectFormSchema = z.object({
    name: z.string().min(1, 'El nombre del proyecto es obligatorio').max(200, 'Máximo 200 caracteres'),
    description: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'CALIBRATING', 'COMPLETED', 'ARCHIVED']).default('DRAFT'),
    roomWidth: z
        .preprocess((val) => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().positive('El ancho debe ser mayor a 0').optional()),
    roomLength: z
        .preprocess((val) => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().positive('El largo debe ser mayor a 0').optional()),
    roomHeight: z
        .preprocess((val) => (val === '' || val === null || val === undefined ? undefined : Number(val)), z.number().positive('La altura debe ser mayor a 0').optional()),
});

export type ProjectFormData = z.infer<typeof projectFormSchema>;
