import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Chip,
    Stack,
    Tooltip,
    Typography,
    Snackbar,
    Alert,
} from '@mui/material';
import {
    Add,
    EditOutlined,
    DeleteOutlined,
    TuneOutlined,
    ContentCopy,
    AnchorOutlined,
    SensorsOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../../shared/components/common/PageHeader';
import { GoogleSearchBar } from '../../../../shared/components/common/GoogleSearchBar';
import ListTable, { type Column, type Action } from '../../../../shared/components/tables/ListTable';
import ConfirmDialog from '../../../../shared/components/dialog/ConfirmDialog';
import { ProjectFormDialog } from './ProjectForm.dialog';
import {
    getProjects,
    createProject,
    updateProject,
    deleteProject,
} from '../../infrastructure/services/project.service';
import type { Project, ProjectStatus } from '../../domain/project.types';
import type { ProjectFormData } from '../../domain/project.schemas';
import { formatDate } from '../../../../core/utils/formatDate';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string; border: string }> = {
    DRAFT: { label: 'Borrador', color: '#94979e', bg: 'rgba(148, 151, 158, 0.1)', border: '#303236' },
    ACTIVE: { label: 'Activo', color: '#34d59a', bg: 'rgba(52, 213, 154, 0.1)', border: 'rgba(52, 213, 154, 0.3)' },
    CALIBRATING: { label: 'Calibrando', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)' },
    COMPLETED: { label: 'Completado', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)', border: 'rgba(96, 165, 250, 0.3)' },
    ARCHIVED: { label: 'Archivado', color: '#797d86', bg: 'rgba(121, 125, 134, 0.1)', border: '#303236' },
};

export const ProjectListPage: React.FC = () => {
    const navigate = useNavigate();

    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(10);

    // Dialog state
    const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Delete dialog
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    // Toast / Feedback
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const loadProjects = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await getProjects({
                page,
                perPage: limit,
                search: searchTerm,
                status: selectedStatus || undefined,
            });
            setProjects(res.data);
            setTotal(res.total);
        } catch (error) {
            console.error('Error cargando proyectos:', error);
            setToastMessage('Error al cargar la lista de proyectos');
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, searchTerm, selectedStatus]);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    const handleCreateOrUpdate = async (data: ProjectFormData) => {
        try {
            setIsSaving(true);
            if (editingProject) {
                await updateProject(editingProject.id, data);
                setToastMessage('Proyecto actualizado exitosamente');
            } else {
                await createProject(data);
                setToastMessage('Proyecto creado exitosamente');
            }
            setIsFormOpen(false);
            setEditingProject(null);
            await loadProjects();
        } catch (error) {
            console.error('Error guardando proyecto:', error);
            setToastMessage('Error al guardar el proyecto');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteId) return;
        try {
            setIsDeleting(true);
            await deleteProject(deleteId);
            setToastMessage('Proyecto eliminado exitosamente');
            setDeleteId(null);
            await loadProjects();
        } catch (error) {
            console.error('Error eliminando proyecto:', error);
            setToastMessage('Error al eliminar el proyecto');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCopyShareLink = (accessCode: string) => {
        const shareUrl = `${window.location.origin}/p/${accessCode}`;
        navigator.clipboard.writeText(shareUrl);
        setToastMessage(`Enlace público copiado al portapapeles: ${shareUrl}`);
    };

    const columns: Column[] = [
        {
            id: 'name',
            name: 'Proyecto',
            format: (_, row: Project) => (
                <Box>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 600,
                            color: '#ffffff',
                            cursor: 'pointer',
                            '&:hover': { color: '#34d59a' },
                        }}
                        onClick={() => navigate(`/projects/${row.id}`)}
                    >
                        {row.name}
                    </Typography>
                    {row.description && (
                        <Typography
                            variant="caption"
                            sx={{
                                color: '#797d86',
                                display: '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                maxWidth: 320,
                            }}
                        >
                            {row.description}
                        </Typography>
                    )}
                </Box>
            ),
        },
        {
            id: 'status',
            name: 'Estado',
            format: (value: ProjectStatus) => {
                const conf = STATUS_CONFIG[value] || STATUS_CONFIG.DRAFT;
                return (
                    <Chip
                        label={conf.label}
                        size="small"
                        sx={{
                            bgcolor: conf.bg,
                            color: conf.color,
                            borderColor: conf.border,
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            fontFamily: 'var(--font-geistmono, monospace)',
                            fontWeight: 600,
                            fontSize: '11px',
                        }}
                    />
                );
            },
        },
        {
            id: 'devices',
            name: 'Dispositivos & Anclas',
            format: (_, row: Project) => {
                const totalDevices = row.deviceCount ?? 0;
                const anchors = row.anchorCount ?? 0;
                return (
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Tooltip title="Total de dispositivos conectados">
                            <Chip
                                icon={<SensorsOutlined sx={{ fontSize: '14px !important', color: '#34d59a !important' }} />}
                                label={`${totalDevices} Disp.`}
                                size="small"
                                sx={{
                                    bgcolor: '#0a0a0b',
                                    color: '#c9cbcf',
                                    borderColor: '#303236',
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    fontFamily: 'var(--font-geistmono, monospace)',
                                    fontSize: '11px',
                                }}
                            />
                        </Tooltip>
                        <Tooltip title="Anclas de referencia">
                            <Chip
                                icon={<AnchorOutlined sx={{ fontSize: '14px !important', color: '#fbbf24 !important' }} />}
                                label={`${anchors} Anclas`}
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(251, 191, 36, 0.08)',
                                    color: '#fbbf24',
                                    borderColor: 'rgba(251, 191, 36, 0.3)',
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    fontFamily: 'var(--font-geistmono, monospace)',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                }}
                            />
                        </Tooltip>
                    </Stack>
                );
            },
        },
        {
            id: 'dimensions',
            name: 'Dimensiones Recinto',
            format: (_, row: Project) => {
                if (!row.roomWidth && !row.roomLength && !row.roomHeight) {
                    return <Typography variant="caption" sx={{ color: '#797d86' }}>No definidas</Typography>;
                }
                return (
                    <Typography
                        variant="caption"
                        sx={{
                            color: '#c9cbcf',
                            fontFamily: 'var(--font-geistmono, monospace)',
                        }}
                    >
                        {row.roomWidth ?? '?'}m × {row.roomLength ?? '?'}m × {row.roomHeight ?? '?'}m
                    </Typography>
                );
            },
        },
        {
            id: 'share',
            name: 'Enlace Público',
            format: (_, row: Project) => (
                <Tooltip title="Copiar enlace para conectar dispositivos">
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ContentCopy sx={{ fontSize: 14 }} />}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCopyShareLink(row.accessCode);
                        }}
                        sx={{
                            fontFamily: 'var(--font-geistmono, monospace)',
                            fontSize: '11px',
                            py: 0.5,
                            px: 1.5,
                            borderRadius: '9999px',
                            borderColor: '#303236',
                            color: '#34d59a',
                            '&:hover': {
                                borderColor: '#34d59a',
                                bgcolor: 'rgba(52, 213, 154, 0.08)',
                            },
                        }}
                    >
                        Copiar Enlace
                    </Button>
                </Tooltip>
            ),
        },
        {
            id: 'updatedAt',
            name: 'Actualizado',
            format: (value: string) => (
                <Typography variant="caption" sx={{ color: '#797d86', fontFamily: 'var(--font-geistmono, monospace)' }}>
                    {formatDate(value)}
                </Typography>
            ),
        },
    ];

    const actions: Action[] = [
        {
            name: 'Configurar y Dispositivos',
            icon: <TuneOutlined sx={{ fontSize: 18 }} />,
            color: '#34d59a',
            onClick: (row: Project) => navigate(`/projects/${row.id}`),
        },
        {
            name: 'Editar Proyecto',
            icon: <EditOutlined sx={{ fontSize: 18 }} />,
            color: '#c9cbcf',
            onClick: (row: Project) => {
                setEditingProject(row);
                setIsFormOpen(true);
            },
        },
        {
            name: 'Eliminar Proyecto',
            icon: <DeleteOutlined sx={{ fontSize: 18 }} />,
            color: '#ff3621',
            onClick: (row: Project) => setDeleteId(row.id),
        },
    ];

    return (
        <Box sx={{ width: '100%', py: 1 }}>
            <PageHeader
                title="Proyectos de Calibración"
                subtitle="Gestión de recintos, anclas acústicas y enlaces para registro de dispositivos"
            >
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Add />}
                    onClick={() => {
                        setEditingProject(null);
                        setIsFormOpen(true);
                    }}
                >
                    Nuevo Proyecto
                </Button>
            </PageHeader>

            {/* Filter Bar */}
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{
                    alignItems: { xs: 'stretch', md: 'center' },
                    justifyContent: 'space-between',
                    mb: 3,
                }}
            >
                <Box sx={{ maxWidth: { xs: '100%', md: 360 } }}>
                    <GoogleSearchBar
                        value={searchTerm}
                        onChange={(val: string) => setSearchTerm(val)}
                        onSubmit={(e: React.FormEvent) => {
                            e.preventDefault();
                            loadProjects();
                        }}
                        placeholder="Buscar por nombre o descripción..."
                    />
                </Box>

                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Chip
                        label="Todos"
                        clickable
                        onClick={() => setSelectedStatus('')}
                        variant={selectedStatus === '' ? 'filled' : 'outlined'}
                        sx={{
                            bgcolor: selectedStatus === '' ? '#34d59a' : '#0a0a0b',
                            color: selectedStatus === '' ? '#000000' : '#c9cbcf',
                            fontWeight: selectedStatus === '' ? 600 : 400,
                            borderColor: '#303236',
                        }}
                    />
                    {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
                        <Chip
                            key={key}
                            label={conf.label}
                            clickable
                            onClick={() => setSelectedStatus(key)}
                            variant={selectedStatus === key ? 'filled' : 'outlined'}
                            sx={{
                                bgcolor: selectedStatus === key ? conf.color : '#0a0a0b',
                                color: selectedStatus === key ? '#000000' : '#c9cbcf',
                                fontWeight: selectedStatus === key ? 600 : 400,
                                borderColor: '#303236',
                            }}
                        />
                    ))}
                </Stack>
            </Stack>

            {/* Table */}
            <ListTable
                data={projects}
                columns={columns}
                actions={actions}
                emptyMessage={isLoading ? 'Cargando proyectos...' : 'No se encontraron proyectos registrados'}
                pagination={{
                    total,
                    limit,
                    offset: (page - 1) * limit,
                    onPageChange: (newPage) => setPage(newPage + 1),
                    onRowsPerPageChange: (newLimit) => {
                        setLimit(newLimit);
                        setPage(1);
                    },
                }}
            />

            {/* Project Form Dialog */}
            <ProjectFormDialog
                open={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setEditingProject(null);
                }}
                onSubmit={handleCreateOrUpdate}
                project={editingProject}
                isLoading={isSaving}
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={Boolean(deleteId)}
                title="¿Eliminar Proyecto de Calibración?"
                description="Esta acción eliminará el proyecto junto con todos sus dispositivos y mediciones asociadas de forma irreversible. ¿Deseas continuar?"
                confirmText="Eliminar Proyecto"
                confirmColor="error"
                isLoading={isDeleting}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDeleteConfirm}
            />

            {/* Feedback Snackbar */}
            <Snackbar
                open={Boolean(toastMessage)}
                autoHideDuration={4000}
                onClose={() => setToastMessage(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity="success"
                    onClose={() => setToastMessage(null)}
                    sx={{
                        bgcolor: '#151617',
                        color: '#ffffff',
                        border: '1px solid #34d59a',
                        borderRadius: '4px',
                    }}
                >
                    {toastMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ProjectListPage;
