import React, { useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Stack,
    Box,
    Typography,
    CircularProgress,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectFormSchema, type ProjectFormData } from '../../domain/project.schemas';
import type { Project } from '../../domain/project.types';

interface ProjectFormDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: ProjectFormData) => Promise<void>;
    project?: Project | null;
    isLoading?: boolean;
}

export const ProjectFormDialog: React.FC<ProjectFormDialogProps> = ({
    open,
    onClose,
    onSubmit,
    project,
    isLoading = false,
}) => {
    const isEdit = Boolean(project);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ProjectFormData>({
        resolver: zodResolver(projectFormSchema) as any,
        defaultValues: {
            name: '',
            description: '',
            status: 'DRAFT',
            roomWidth: undefined,
            roomLength: undefined,
            roomHeight: undefined,
        },
    });

    useEffect(() => {
        if (project) {
            reset({
                name: project.name,
                description: project.description || '',
                status: project.status,
                roomWidth: project.roomWidth ?? undefined,
                roomLength: project.roomLength ?? undefined,
                roomHeight: project.roomHeight ?? undefined,
            });
        } else {
            reset({
                name: '',
                description: '',
                status: 'DRAFT',
                roomWidth: undefined,
                roomLength: undefined,
                roomHeight: undefined,
            });
        }
    }, [project, reset, open]);

    const handleFormSubmit = async (data: ProjectFormData) => {
        await onSubmit(data);
    };

    return (
        <Dialog
            open={open}
            onClose={() => !isLoading && onClose()}
            maxWidth="sm"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        bgcolor: '#151617',
                        border: '1px solid #303236',
                        borderRadius: '4px',
                        p: 1,
                    },
                },
            }}
        >
            <form onSubmit={handleSubmit(handleFormSubmit)}>
                <DialogTitle sx={{ color: '#ffffff', fontWeight: 600, fontSize: '1.125rem', pb: 1 }}>
                    {isEdit ? 'Editar Proyecto de Calibración' : 'Nuevo Proyecto de Calibración'}
                </DialogTitle>

                <DialogContent sx={{ pt: 1 }}>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Nombre del Proyecto"
                                    placeholder="Ej: Sala de Grabación Principal"
                                    fullWidth
                                    required
                                    error={Boolean(errors.name)}
                                    helperText={errors.name?.message}
                                />
                            )}
                        />

                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    label="Descripción (Opcional)"
                                    placeholder="Detalles del recinto acústico o notas de medición"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    error={Boolean(errors.description)}
                                    helperText={errors.description?.message}
                                />
                            )}
                        />

                        <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    select
                                    label="Estado del Proyecto"
                                    fullWidth
                                    error={Boolean(errors.status)}
                                    helperText={errors.status?.message}
                                >
                                    <MenuItem value="DRAFT">Borrador (DRAFT)</MenuItem>
                                    <MenuItem value="ACTIVE">Activo (ACTIVE)</MenuItem>
                                    <MenuItem value="CALIBRATING">Calibrando (CALIBRATING)</MenuItem>
                                    <MenuItem value="COMPLETED">Completado (COMPLETED)</MenuItem>
                                    <MenuItem value="ARCHIVED">Archivado (ARCHIVED)</MenuItem>
                                </TextField>
                            )}
                        />

                        <Box sx={{ borderTop: '1px solid #303236', pt: 2 }}>
                            <Typography
                                variant="caption"
                                sx={{
                                    display: 'block',
                                    color: '#34d59a',
                                    fontWeight: 600,
                                    fontFamily: 'var(--font-geistmono, monospace)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    mb: 1.5,
                                }}
                            >
                                Dimensiones de Referencia del Recinto (Metros)
                            </Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <Controller
                                    name="roomWidth"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            label="Ancho (m)"
                                            type="number"
                                            fullWidth
                                            slotProps={{ htmlInput: { step: '0.1', min: '0' } }}
                                            error={Boolean(errors.roomWidth)}
                                            helperText={errors.roomWidth?.message}
                                        />
                                    )}
                                />

                                <Controller
                                    name="roomLength"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            label="Largo (m)"
                                            type="number"
                                            fullWidth
                                            slotProps={{ htmlInput: { step: '0.1', min: '0' } }}
                                            error={Boolean(errors.roomLength)}
                                            helperText={errors.roomLength?.message}
                                        />
                                    )}
                                />

                                <Controller
                                    name="roomHeight"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            label="Alto (m)"
                                            type="number"
                                            fullWidth
                                            slotProps={{ htmlInput: { step: '0.1', min: '0' } }}
                                            error={Boolean(errors.roomHeight)}
                                            helperText={errors.roomHeight?.message}
                                        />
                                    )}
                                />
                            </Stack>
                        </Box>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 2, pt: 1, gap: 1 }}>
                    <Button
                        onClick={onClose}
                        disabled={isLoading}
                        variant="outlined"
                        sx={{
                            color: '#797d86',
                            borderColor: '#303236',
                            '&:hover': { borderColor: '#797d86', color: '#ffffff' },
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isLoading}
                        startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                        {isLoading ? 'Guardando...' : isEdit ? 'Actualizar Proyecto' : 'Crear Proyecto'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
