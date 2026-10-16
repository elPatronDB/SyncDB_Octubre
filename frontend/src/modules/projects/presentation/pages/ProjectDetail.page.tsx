import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Stack,
    Button,
    Chip,
    Grid,
    TextField,
    Snackbar,
    Alert,
    CircularProgress,
    Divider,
    Switch,
    FormControlLabel,
    Tabs,
    Tab,
} from '@mui/material';
import {
    ArrowBack,
    ContentCopy,
    OpenInNew,
    Refresh,
    AnchorOutlined,
    SensorsOutlined,
    DeleteOutlined,
    DashboardOutlined,
    EditOutlined,
    SwapHoriz,
    GraphicEq,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../../shared/components/common/PageHeader';
import ListTable, { type Column, type Action } from '../../../../shared/components/tables/ListTable';
import ConfirmDialog from '../../../../shared/components/dialog/ConfirmDialog';
import { ProjectFormDialog } from './ProjectForm.dialog';
import { ProjectAcousticSuite } from '../components/acoustic/ProjectAcousticSuite';
import {
    getProjectById,
    getProjectDevices,
    regenerateShareLink,
    updateProject,
    updateProjectDevice,
    deleteProjectDevice,
} from '../../infrastructure/services/project.service';
import type { Project, Device, DeviceRole } from '../../domain/project.types';
import type { ProjectFormData } from '../../domain/project.schemas';
import { formatDate } from '../../../../core/utils';

export const ProjectDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [devices, setDevices] = useState<Device[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [mainViewTab, setMainViewTab] = useState<'acoustic' | 'devices'>('acoustic');

    // Dialogs
    const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Regenerate Share Link Dialog
    const [isRegenerateOpen, setIsRegenerateOpen] = useState<boolean>(false);
    const [isRegenerating, setIsRegenerating] = useState<boolean>(false);

    // Delete Device Dialog
    const [deleteDeviceId, setDeleteDeviceId] = useState<string | null>(null);
    const [isDeletingDevice, setIsDeletingDevice] = useState<boolean>(false);

    // Toast
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!id) return;
        try {
            setIsLoading(true);
            const [proj, devs] = await Promise.all([
                getProjectById(id),
                getProjectDevices(id),
            ]);
            setProject(proj);
            setDevices(devs);
        } catch (error) {
            console.error('Error cargando detalle del proyecto:', error);
            setToastMessage('Error al cargar la información del proyecto');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCopyShareLink = () => {
        if (!project) return;
        const shareUrl = `${window.location.origin}/p/${project.accessCode}`;
        navigator.clipboard.writeText(shareUrl);
        setToastMessage(`Enlace copiado al portapapeles: ${shareUrl}`);
    };

    const handleRegenerateShareLink = async () => {
        if (!project) return;
        try {
            setIsRegenerating(true);
            const result = await regenerateShareLink(project.id);
            setProject((prev) => prev ? { ...prev, accessCode: result.accessCode, isShareActive: result.isShareActive } : null);
            setToastMessage('Enlace público regenerado con éxito. El enlace anterior ha quedado invalidado.');
            setIsRegenerateOpen(false);
        } catch (error) {
            console.error('Error regenerando enlace:', error);
            setToastMessage('Error al regenerar enlace');
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleToggleShareActive = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!project) return;
        const newActive = e.target.checked;
        try {
            await updateProject(project.id, { isShareActive: newActive });
            setProject((prev) => prev ? { ...prev, isShareActive: newActive } : null);
            setToastMessage(newActive ? 'Enlace de registro activado' : 'Enlace de registro desactivado');
        } catch (error) {
            console.error('Error actualizando estado de enlace:', error);
            setToastMessage('Error al actualizar estado del enlace');
        }
    };

    const handleToggleDeviceRole = async (device: Device) => {
        if (!project) return;
        const newRole: DeviceRole = device.role === 'ANCHOR' ? 'PROBE' : 'ANCHOR';
        try {
            const updated = await updateProjectDevice(project.id, device.id, {
                role: newRole,
                isAnchor: newRole === 'ANCHOR',
            });
            setDevices((prev) => prev.map((d) => (d.id === device.id ? updated : d)));
            setToastMessage(`Dispositivo clasificado como ${newRole === 'ANCHOR' ? 'ANCLA' : 'DISPOSITIVO NORMAL (SONDA)'}`);
        } catch (error) {
            console.error('Error cambiando clasificación:', error);
            setToastMessage('Error al cambiar clasificación del dispositivo');
        }
    };

    const handleDeleteDevice = async () => {
        if (!project || !deleteDeviceId) return;
        try {
            setIsDeletingDevice(true);
            await deleteProjectDevice(project.id, deleteDeviceId);
            setDevices((prev) => prev.filter((d) => d.id !== deleteDeviceId));
            setToastMessage('Dispositivo eliminado del proyecto');
            setDeleteDeviceId(null);
        } catch (error) {
            console.error('Error eliminando dispositivo:', error);
            setToastMessage('Error al eliminar dispositivo');
        } finally {
            setIsDeletingDevice(false);
        }
    };

    const handleUpdateProjectSubmit = async (data: ProjectFormData) => {
        if (!project) return;
        try {
            setIsSaving(true);
            const updated = await updateProject(project.id, data);
            setProject(updated);
            setIsEditOpen(false);
            setToastMessage('Proyecto actualizado');
        } catch (error) {
            console.error('Error actualizando proyecto:', error);
            setToastMessage('Error al actualizar proyecto');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress color="primary" />
            </Box>
        );
    }

    if (!project) {
        return (
            <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: '#ffffff', mb: 2 }}>Proyecto no encontrado</Typography>
                <Button variant="outlined" onClick={() => navigate('/projects')}>Volver a la lista</Button>
            </Box>
        );
    }

    const shareUrl = `${window.location.origin}/p/${project.accessCode}`;
    const anchors = devices.filter((d) => d.isAnchor || d.role === 'ANCHOR');
    const probes = devices.filter((d) => !d.isAnchor && d.role !== 'ANCHOR');

    const deviceColumns: Column[] = [
        {
            id: 'name',
            name: 'Dispositivo',
            format: (_, row: Device) => (
                <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#ffffff' }}>
                        {row.name || (row.isAnchor ? 'Ancla Sin Nombre' : 'Dispositivo Sonda')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#797d86', fontFamily: 'var(--font-geistmono, monospace)' }}>
                        {row.deviceModel || row.browserInfo || 'Cliente Web'}
                    </Typography>
                </Box>
            ),
        },
        {
            id: 'role',
            name: 'Clasificación',
            format: (_, row: Device) => {
                const isAnchor = row.isAnchor || row.role === 'ANCHOR';
                return (
                    <Chip
                        icon={isAnchor ? <AnchorOutlined sx={{ fontSize: '14px !important', color: '#fbbf24 !important' }} /> : <SensorsOutlined sx={{ fontSize: '14px !important', color: '#34d59a !important' }} />}
                        label={isAnchor ? 'ANCLA' : 'NORMAL (SONDA)'}
                        size="small"
                        sx={{
                            bgcolor: isAnchor ? 'rgba(251, 191, 36, 0.1)' : 'rgba(52, 213, 154, 0.1)',
                            color: isAnchor ? '#fbbf24' : '#34d59a',
                            borderColor: isAnchor ? 'rgba(251, 191, 36, 0.3)' : 'rgba(52, 213, 154, 0.3)',
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
            id: 'status',
            name: 'Conexión',
            format: (value: string) => {
                const isOnline = value === 'CONNECTED';
                return (
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Box
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: isOnline ? '#34d59a' : '#797d86',
                                boxShadow: isOnline ? '0 0 8px #34d59a' : 'none',
                            }}
                        />
                        <Typography
                            variant="caption"
                            sx={{
                                color: isOnline ? '#34d59a' : '#797d86',
                                fontFamily: 'var(--font-geistmono, monospace)',
                                fontWeight: 600,
                            }}
                        >
                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </Typography>
                    </Stack>
                );
            },
        },
        {
            id: 'coordinates',
            name: 'Coordenadas GPS',
            format: (_, row: Device) => {
                if (row.latitude !== null && row.longitude !== null && row.latitude !== undefined && row.longitude !== undefined) {
                    return (
                        <Box>
                            <Typography variant="caption" sx={{ color: '#ffffff', fontFamily: 'var(--font-geistmono, monospace)', display: 'block' }}>
                                {row.latitude.toFixed(6)}, {row.longitude.toFixed(6)}
                            </Typography>
                            {row.accuracy && (
                                <Typography variant="caption" sx={{ color: '#34d59a', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                    ±{Math.round(row.accuracy)}m precisión
                                </Typography>
                            )}
                        </Box>
                    );
                }
                return (
                    <Typography variant="caption" sx={{ color: '#ff6655', fontFamily: 'var(--font-geistmono, monospace)' }}>
                        Sin ubicación GPS
                    </Typography>
                );
            },
        },
        {
            id: 'spatial',
            name: 'Plano Local (X, Y)',
            format: (_, row: Device) => (
                <Typography variant="caption" sx={{ color: '#c9cbcf', fontFamily: 'var(--font-geistmono, monospace)' }}>
                    X: {row.positionX ?? 0}m, Y: {row.positionY ?? 0}m
                </Typography>
            ),
        },
        {
            id: 'lastSeen',
            name: 'Última Actividad',
            format: (_, row: Device) => (
                <Typography variant="caption" sx={{ color: '#797d86', fontFamily: 'var(--font-geistmono, monospace)' }}>
                    {formatDate(row.lastSeenAt || row.joinedAt)}
                </Typography>
            ),
        },
    ];

    const deviceActions: Action[] = [
        {
            name: 'Cambiar Clasificación (Ancla / Normal)',
            icon: <SwapHoriz sx={{ fontSize: 18 }} />,
            color: '#fbbf24',
            onClick: (row: Device) => handleToggleDeviceRole(row),
        },
        {
            name: 'Eliminar Dispositivo',
            icon: <DeleteOutlined sx={{ fontSize: 18 }} />,
            color: '#ff3621',
            onClick: (row: Device) => setDeleteDeviceId(row.id),
        },
    ];

    return (
        <Box sx={{ width: '100%', py: 1 }}>
            {/* Top Navigation */}
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
                <Button
                    variant="text"
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/projects')}
                    sx={{ color: '#797d86', '&:hover': { color: '#ffffff' } }}
                >
                    Volver a Proyectos
                </Button>
            </Stack>

            <PageHeader
                title={project.name}
                subtitle={project.description || 'Configuración del espacio y monitoreo de dispositivos'}
            >
                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="outlined"
                        startIcon={<EditOutlined />}
                        onClick={() => setIsEditOpen(true)}
                    >
                        Editar
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<DashboardOutlined />}
                        onClick={() => navigate(`/?projectId=${project.id}`)}
                    >
                        Ver en Consola Master
                    </Button>
                </Stack>
            </PageHeader>

            {/* View Mode Navigation Tabs */}
            <Box sx={{ borderBottom: '1px solid #303236', mb: 3, width: '100%', maxWidth: '100%' }}>
                <Tabs
                    value={mainViewTab}
                    onChange={(_, val) => setMainViewTab(val)}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    textColor="inherit"
                    indicatorColor="primary"
                    sx={{
                        minHeight: 48,
                        '& .MuiTabs-scrollButtons': {
                            color: '#34d59a',
                            '&.Mui-disabled': { opacity: 0.2 },
                        },
                        '& .MuiTabs-scroller': {
                            overflowX: 'auto !important',
                        },
                        '& .MuiTab-root': {
                            color: '#797d86',
                            fontWeight: 600,
                            fontSize: { xs: '13px', sm: '14px' },
                            minHeight: 48,
                            minWidth: { xs: 'auto', sm: 180 },
                            whiteSpace: 'nowrap',
                            px: { xs: 1.5, sm: 2.5 },
                            '&.Mui-selected': { color: '#34d59a' },
                        },
                    }}
                >
                    <Tab
                        icon={<GraphicEq sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        label="Análisis Acústico & Calibración PA"
                        value="acoustic"
                    />
                    <Tab
                        icon={<SensorsOutlined sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        label={`Dispositivos y Enlace Público (${devices.length})`}
                        value="devices"
                    />
                </Tabs>
            </Box>

            {mainViewTab === 'acoustic' ? (
                <ProjectAcousticSuite projectId={project.id} projectName={project.name} />
            ) : (
                <>
                    {/* Prominent Share Link Card */}
                    <Card
                sx={{
                    bgcolor: '#151617',
                    border: '1px solid #303236',
                    borderRadius: '4px',
                    p: 3,
                    mb: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        bgcolor: project.isShareActive ? '#34d59a' : '#797d86',
                    },
                }}
            >
                <CardContent sx={{ p: 0 }}>
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={3}
                        sx={{
                            justifyContent: 'space-between',
                            alignItems: { xs: 'flex-start', md: 'center' },
                        }}
                    >
                        <Box sx={{ flex: 1 }}>
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
                                <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                                    Enlace Público de Conexión de Dispositivos
                                </Typography>
                                <Chip
                                    label={project.isShareActive ? 'ENLACE ACTIVO' : 'ENLACE PAUSADO'}
                                    size="small"
                                    sx={{
                                        bgcolor: project.isShareActive ? 'rgba(52, 213, 154, 0.1)' : 'rgba(255, 54, 33, 0.1)',
                                        color: project.isShareActive ? '#34d59a' : '#ff3621',
                                        borderColor: project.isShareActive ? 'rgba(52, 213, 154, 0.3)' : 'rgba(255, 54, 33, 0.3)',
                                        borderWidth: '1px',
                                        borderStyle: 'solid',
                                        fontFamily: 'var(--font-geistmono, monospace)',
                                        fontWeight: 600,
                                        fontSize: '11px',
                                    }}
                                />
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#797d86', maxWidth: 640, mb: 2 }}>
                                Comparte este enlace con los teléfonos o dispositivos que participarán como anclas de referencia o sondas móviles. Al abrir el enlace, el navegador se identificará automáticamente y reportará sus coordenadas GPS.
                            </Typography>

                            {/* Share URL Input */}
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'center' }}>
                                <TextField
                                    value={shareUrl}
                                    fullWidth
                                    slotProps={{
                                        input: {
                                            readOnly: true,
                                            sx: {
                                                bgcolor: '#0a0a0b',
                                                color: '#34d59a',
                                                fontFamily: 'var(--font-geistmono, monospace)',
                                                fontSize: '13px',
                                            },
                                        },
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<ContentCopy />}
                                    onClick={handleCopyShareLink}
                                    sx={{ whiteSpace: 'nowrap', minWidth: 140 }}
                                >
                                    Copiar Enlace
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<OpenInNew />}
                                    onClick={() => window.open(shareUrl, '_blank')}
                                    sx={{ whiteSpace: 'nowrap' }}
                                >
                                    Abrir Registro
                                </Button>
                            </Stack>
                        </Box>

                        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, borderColor: '#303236' }} />

                        <Box sx={{ minWidth: 200 }}>
                            <Typography variant="caption" sx={{ color: '#797d86', display: 'block', mb: 1 }}>
                                Control de Acceso:
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={project.isShareActive}
                                        onChange={handleToggleShareActive}
                                        color="primary"
                                    />
                                }
                                label={<Typography variant="body2" sx={{ color: '#ffffff' }}>Permitir registros</Typography>}
                            />
                            <Button
                                size="small"
                                variant="text"
                                color="warning"
                                startIcon={<Refresh />}
                                onClick={() => setIsRegenerateOpen(true)}
                                sx={{ mt: 1, display: 'block', p: 0, textTransform: 'none', fontSize: '12px' }}
                            >
                                Regenerar enlace público
                            </Button>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>

            {/* Recinto Parameters & KPI Grid */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 2 }}>
                        <Typography variant="caption" sx={{ color: '#797d86', textTransform: 'uppercase', fontFamily: 'var(--font-geistmono, monospace)' }}>
                            Dispositivos Conectados
                        </Typography>
                        <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 600, mt: 0.5 }}>
                            {devices.length}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#34d59a' }}>
                            {devices.filter((d) => d.status === 'CONNECTED').length} activos ahora
                        </Typography>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                    <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 2 }}>
                        <Typography variant="caption" sx={{ color: '#797d86', textTransform: 'uppercase', fontFamily: 'var(--font-geistmono, monospace)' }}>
                            Anclas de Referencia
                        </Typography>
                        <Typography variant="h4" sx={{ color: '#fbbf24', fontWeight: 600, mt: 0.5 }}>
                            {anchors.length}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#c9cbcf' }}>
                            {probes.length} sondas móviles
                        </Typography>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                    <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 2 }}>
                        <Typography variant="caption" sx={{ color: '#797d86', textTransform: 'uppercase', fontFamily: 'var(--font-geistmono, monospace)' }}>
                            Dimensiones del Recinto
                        </Typography>
                        <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 600, mt: 0.5, fontFamily: 'var(--font-geistmono, monospace)' }}>
                            {project.roomWidth ? `${project.roomWidth}m × ${project.roomLength}m` : 'No configurado'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#797d86' }}>
                            {project.roomHeight ? `Altura: ${project.roomHeight}m` : 'Altura estándar'}
                        </Typography>
                    </Card>
                </Grid>
            </Grid>

            {/* Devices Section */}
            <Box sx={{ mb: 2 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                            Dispositivos del Proyecto ({devices.length})
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#797d86' }}>
                            Gestiona la clasificación (Ancla vs Normal) y verifica las coordenadas GPS de cada terminal conectado.
                        </Typography>
                    </Box>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={loadData}
                        size="small"
                        sx={{ borderRadius: '9999px' }}
                    >
                        Refrescar
                    </Button>
                </Stack>

                    <ListTable
                        data={devices}
                        columns={deviceColumns}
                        actions={deviceActions}
                        emptyMessage="No hay dispositivos registrados aún. Comparte el enlace superior para comenzar."
                    />
                </Box>
            </>
            )}

            {/* Edit Project Dialog */}
            <ProjectFormDialog
                open={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                onSubmit={handleUpdateProjectSubmit}
                project={project}
                isLoading={isSaving}
            />

            {/* Regenerate Link Confirmation */}
            <ConfirmDialog
                open={isRegenerateOpen}
                title="¿Regenerar Enlace Público?"
                description="Al regenerar el enlace, el código de acceso anterior dejará de funcionar inmediatamente. Cualquier dispositivo que intente registrarse con el enlace viejo será rechazado. ¿Deseas continuar?"
                confirmText="Regenerar Enlace"
                confirmColor="warning"
                isLoading={isRegenerating}
                onClose={() => setIsRegenerateOpen(false)}
                onConfirm={handleRegenerateShareLink}
            />

            {/* Delete Device Confirmation */}
            <ConfirmDialog
                open={Boolean(deleteDeviceId)}
                title="¿Eliminar Dispositivo del Proyecto?"
                description="El dispositivo será desvinculado del proyecto y sus mediciones asociadas serán eliminadas. ¿Deseas continuar?"
                confirmText="Eliminar Dispositivo"
                confirmColor="error"
                isLoading={isDeletingDevice}
                onClose={() => setDeleteDeviceId(null)}
                onConfirm={handleDeleteDevice}
            />

            {/* Snackbar Feedback */}
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

export default ProjectDetailPage;
