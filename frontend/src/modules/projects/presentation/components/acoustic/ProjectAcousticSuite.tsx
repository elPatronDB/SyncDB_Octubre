import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Stack,
    Button,
    Grid,
    Tabs,
    Tab,
    CircularProgress,
    Alert,
    Snackbar,
    Divider,
} from '@mui/material';
import {
    GraphicEq,
    Sensors,
    Tune,
    Refresh,
    SaveOutlined,
} from '@mui/icons-material';
import {
    getAcousticSnapshot,
    connectAcousticStream,
    resetAcousticCurves,
    saveAcousticMeasurement,
    updateDeviceCalibration,
} from '../../../infrastructure/services/acoustic.service';
import type {
    DeviceAcousticState,
    ProjectAcousticAggregate,
    TargetCurveType,
} from '../../../domain/acoustic.types';
import { GlobalSpectrumGraph } from './GlobalSpectrumGraph';
import { SpectrogramWaterfall } from './SpectrogramWaterfall';
import { DeviceAcousticCard } from './DeviceAcousticCard';
import { DeviceAcousticDetailModal } from './DeviceAcousticDetailModal';
import { PACalibrationRecommendations } from './PACalibrationRecommendations';

interface ProjectAcousticSuiteProps {
    projectId: string;
    projectName: string;
}

export const ProjectAcousticSuite: React.FC<ProjectAcousticSuiteProps> = ({
    projectId,
    projectName: _projectName,
}) => {
    const [activeTab, setActiveTab] = useState<'aggregate' | 'devices' | 'pa_calibration'>('aggregate');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(false);
    const [streamError, setStreamError] = useState<string | null>(null);

    // Acoustic Data States
    const [devices, setDevices] = useState<DeviceAcousticState[]>([]);
    const [aggregate, setAggregate] = useState<ProjectAcousticAggregate | null>(null);
    const [targetCurve, setTargetCurve] = useState<TargetCurveType>('HARMAN_HOUSE');

    // Devices included in the calculation of the global aggregate
    const [includedDeviceIds, setIncludedDeviceIds] = useState<Set<string>>(new Set());

    // Selected device for full detail modal
    const [selectedDeviceForModal, setSelectedDeviceForModal] = useState<DeviceAcousticState | null>(null);

    // Toast notification
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Initial Load Snapshot
    const loadSnapshot = useCallback(async () => {
        try {
            setIsLoading(true);
            const snapshot = await getAcousticSnapshot(projectId);
            setDevices(snapshot.devices);
            setAggregate(snapshot.aggregate);
            setIncludedDeviceIds(new Set(snapshot.devices.map((d) => d.deviceId)));
            setStreamError(null);
        } catch (err: any) {
            console.error('Error loading acoustic snapshot:', err);
            setStreamError('No se pudo cargar el estado acústico inicial.');
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadSnapshot();
    }, [loadSnapshot]);

    // Connect Server-Sent Events (SSE) Stream
    useEffect(() => {
        if (!projectId) return;

        const unsubscribe = connectAcousticStream(projectId, {
            onInitialSnapshot: (snap) => {
                setDevices(snap.devices);
                setAggregate(snap.aggregate);
                setIsLiveStreaming(true);
                setStreamError(null);
            },
            onDeviceFrame: ({ deviceId, frame, state }) => {
                setIsLiveStreaming(true);
                setDevices((prev) =>
                    prev.map((d) => {
                        if (d.deviceId === deviceId) {
                            return {
                                ...d,
                                isOnline: true,
                                isMicActive: frame.isMicActive,
                                latestFrame: frame,
                                peakHoldCurve: state.peakHoldCurve || d.peakHoldCurve,
                                avgCurve: state.avgCurve || d.avgCurve,
                                lastSeenAcoustic: frame.timestamp,
                                sampleRate: frame.sampleRate,
                                nyquist: frame.nyquist,
                            };
                        }
                        return d;
                    })
                );
            },
            onAggregateUpdate: (agg) => {
                setAggregate(agg);
            },
            onError: () => {
                setIsLiveStreaming(false);
            },
        });

        return () => {
            unsubscribe();
        };
    }, [projectId]);

    const handleToggleInclusion = (deviceId: string) => {
        setIncludedDeviceIds((prev) => {
            const next = new Set(prev);
            if (next.has(deviceId)) next.delete(deviceId);
            else next.add(deviceId);
            return next;
        });
    };

    const handleResetCurves = async () => {
        try {
            await resetAcousticCurves(projectId);
            setToastMessage('Curvas de máximos y medias reiniciadas exitosamente');
        } catch (err) {
            console.error('Error resetting curves:', err);
            setToastMessage('Error al reiniciar curvas');
        }
    };

    const handleSaveSnapshot = async () => {
        if (!aggregate || devices.length === 0) return;
        const activeDev = devices.find((d) => d.isMicActive) || devices[0];
        if (!activeDev) return;

        try {
            await saveAcousticMeasurement(projectId, {
                deviceId: activeDev.deviceId,
                decibels: aggregate.overallSplDb || aggregate.overallRmsDb,
                peakDb: Math.max(...(aggregate.peakSpectrum || [-100])),
                frequency: null,
            });
            setToastMessage('Toma de calibración persistida en la base de datos');
        } catch (err) {
            console.error('Error saving measurement:', err);
            setToastMessage('Error al persistir medición');
        }
    };

    const handleSaveCalibration = async (deviceId: string, offsetDb: number) => {
        await updateDeviceCalibration(projectId, deviceId, {
            calibrationOffsetDb: offsetDb,
        });
        setDevices((prev) =>
            prev.map((d) =>
                d.deviceId === deviceId
                    ? { ...d, calibrationOffsetDb: offsetDb, isCalibrated: offsetDb !== 0 }
                    : d
            )
        );
        setToastMessage(`Dispositivo calibrado con éxito (+${offsetDb} dB)`);
    };

    // Calculate KPI summaries
    const activeMicCount = useMemo(() => devices.filter((d) => d.isMicActive).length, [devices]);
    const calibratedCount = useMemo(() => devices.filter((d) => d.isCalibrated).length, [devices]);

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress color="primary" />
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>
            {/* KPI Status Bar */}
            <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 2.5, mb: 3 }}>
                <CardContent sx={{ p: 0 }}>
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={3}
                        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}
                    >
                        {/* Live Indicator & Counts */}
                        <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                            {/* Live Badge */}
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <Box
                                    sx={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        bgcolor: isLiveStreaming ? '#34d59a' : '#fbbf24',
                                        boxShadow: isLiveStreaming ? '0 0 10px #34d59a' : 'none',
                                    }}
                                />
                                <Box>
                                    <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 700 }}>
                                        {isLiveStreaming ? 'STREAMING EN VIVO (SSE)' : 'CONECTANDO...'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#797d86', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                        CANAL REAL-TIME MASTER
                                    </Typography>
                                </Box>
                            </Stack>

                            <Divider orientation="vertical" flexItem sx={{ borderColor: '#303236' }} />

                            {/* Mic Active Count */}
                            <Box>
                                <Typography variant="caption" sx={{ color: '#797d86', display: 'block' }}>
                                    Micrófonos Capturando
                                </Typography>
                                <Typography variant="h6" sx={{ color: activeMicCount > 0 ? '#34d59a' : '#797d86', fontWeight: 700, fontFamily: 'var(--font-geistmono, monospace)' }}>
                                    {activeMicCount} / {devices.length}
                                </Typography>
                            </Box>

                            <Divider orientation="vertical" flexItem sx={{ borderColor: '#303236' }} />

                            {/* Calibrated Count */}
                            <Box>
                                <Typography variant="caption" sx={{ color: '#797d86', display: 'block' }}>
                                    Calibración SPL
                                </Typography>
                                <Typography variant="h6" sx={{ color: calibratedCount > 0 ? '#fbbf24' : '#797d86', fontWeight: 700, fontFamily: 'var(--font-geistmono, monospace)' }}>
                                    {calibratedCount} calibrados
                                </Typography>
                            </Box>

                            <Divider orientation="vertical" flexItem sx={{ borderColor: '#303236' }} />

                            {/* Overall Level */}
                            <Box>
                                <Typography variant="caption" sx={{ color: '#797d86', display: 'block' }}>
                                    Nivel Agregado
                                </Typography>
                                <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700, fontFamily: 'var(--font-geistmono, monospace)' }}>
                                    {aggregate && aggregate.activeDeviceCount > 0
                                        ? `${(aggregate.overallSplDb !== null ? aggregate.overallSplDb : aggregate.overallRmsDb).toFixed(1)} ${aggregate.overallSplDb !== null ? 'dB SPL' : 'dBFS'}`
                                        : '--'}
                                </Typography>
                            </Box>
                        </Stack>

                        {/* Top Action Buttons */}
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Refresh />}
                                onClick={handleResetCurves}
                                sx={{ borderRadius: '9999px', fontSize: '11px', color: '#c9cbcf', borderColor: '#303236' }}
                            >
                                Reiniciar Curvas
                            </Button>

                            <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<SaveOutlined />}
                                onClick={handleSaveSnapshot}
                                disabled={activeMicCount === 0}
                                sx={{ borderRadius: '9999px', fontSize: '11px' }}
                            >
                                Guardar Snapshot
                            </Button>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>

            {/* Error banner if stream lost */}
            {streamError && (
                <Alert severity="warning" sx={{ mb: 3 }} action={<Button size="small" onClick={loadSnapshot}>Reintentar</Button>}>
                    {streamError}
                </Alert>
            )}

            {/* Navigation Tabs */}
            <Box sx={{ borderBottom: '1px solid #303236', mb: 3, width: '100%', maxWidth: '100%' }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, val) => setActiveTab(val)}
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
                            fontSize: { xs: '12px', sm: '13px' },
                            minHeight: 48,
                            minWidth: { xs: 'auto', sm: 160 },
                            whiteSpace: 'nowrap',
                            px: { xs: 1.5, sm: 2.5 },
                            '&.Mui-selected': { color: '#34d59a' },
                        },
                    }}
                >
                    <Tab icon={<GraphicEq sx={{ fontSize: 18 }} />} iconPosition="start" label="Espectro General Agregado" value="aggregate" />
                    <Tab
                        icon={<Sensors sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        label={`Monitoreo Dispositivos (${devices.length})`}
                        value="devices"
                    />
                    <Tab
                        icon={<Tune sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        label="Calibración y Recomendaciones PA"
                        value="pa_calibration"
                    />
                </Tabs>
            </Box>

            {/* TAB 1: ESPECTRO GENERAL AGREGADO */}
            {activeTab === 'aggregate' && (
                <Stack spacing={3}>
                    {/* Global Spectrum Graph */}
                    <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 3 }}>
                        <CardContent sx={{ p: 0 }}>
                            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600, mb: 0.5 }}>
                                Respuesta de Frecuencia Agregada (20 Hz - 20 kHz)
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#797d86', mb: 2 }}>
                                Promedio energético de magnitudes espectrales de todos los dispositivos activos en el recinto.
                            </Typography>

                            <GlobalSpectrumGraph
                                currentSpectrum={aggregate?.currentSpectrum || new Array(31).fill(-100)}
                                peakSpectrum={aggregate?.peakSpectrum || new Array(31).fill(-100)}
                                avgSpectrum={aggregate?.avgSpectrum || new Array(31).fill(-100)}
                                targetCurveType={targetCurve}
                                contributingDevicesCount={aggregate?.activeDeviceCount || 0}
                                isLive={isLiveStreaming}
                                onResetCurves={handleResetCurves}
                                height={380}
                            />
                        </CardContent>
                    </Card>

                    {/* Global Spectrogram Waterfall */}
                    <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 3 }}>
                        <CardContent sx={{ p: 0 }}>
                            <SpectrogramWaterfall
                                spectrum={aggregate?.currentSpectrum || new Array(31).fill(-100)}
                                isLive={isLiveStreaming && activeMicCount > 0}
                                height={240}
                                title="Espectrograma Temporal Global Acumulado (Waterfall)"
                            />
                        </CardContent>
                    </Card>
                </Stack>
            )}

            {/* TAB 2: MONITOREO MULTISDISPOSITIVO */}
            {activeTab === 'devices' && (
                <Box>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600 }}>
                            Nodos y Micrófonos Conectados
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#797d86' }}>
                            Haz clic en "Detalle" en cualquier tarjeta para abrir su espectrograma y calibrar su sensibilidad.
                        </Typography>
                    </Stack>

                    {devices.length > 0 ? (
                        <Grid container spacing={2}>
                            {devices.map((device) => (
                                <Grid key={device.deviceId} size={{ xs: 12, sm: 6, md: 4 }}>
                                    <DeviceAcousticCard
                                        device={device}
                                        isIncludedInAggregate={includedDeviceIds.has(device.deviceId)}
                                        onToggleAggregateInclusion={handleToggleInclusion}
                                        onOpenDetail={(dev) => setSelectedDeviceForModal(dev)}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 6, textAlign: 'center' }}>
                            <Sensors sx={{ fontSize: 48, color: '#797d86', mb: 1.5 }} />
                            <Typography variant="h6" sx={{ color: '#ffffff', mb: 0.5 }}>
                                No hay dispositivos conectados
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#797d86', maxWidth: 440, mx: 'auto' }}>
                                Comparte el enlace de conexión del proyecto con los teléfonos o computadoras para comenzar a capturar audio.
                            </Typography>
                        </Card>
                    )}
                </Box>
            )}

            {/* TAB 3: CALIBRACIÓN Y RECOMENDACIONES PA */}
            {activeTab === 'pa_calibration' && (
                <PACalibrationRecommendations
                    recommendations={aggregate?.recommendations || []}
                    currentSpectrum={aggregate?.currentSpectrum || new Array(31).fill(-100)}
                    avgSpectrum={aggregate?.avgSpectrum || new Array(31).fill(-100)}
                    targetCurveType={targetCurve}
                    onSelectTargetCurve={setTargetCurve}
                    contributingDevices={devices.filter((d) => d.isMicActive)}
                />
            )}

            {/* Individual Device Detail Modal */}
            <DeviceAcousticDetailModal
                open={Boolean(selectedDeviceForModal)}
                onClose={() => setSelectedDeviceForModal(null)}
                device={selectedDeviceForModal}
                onSaveCalibration={handleSaveCalibration}
            />

            {/* Notification Toast */}
            <Snackbar
                open={Boolean(toastMessage)}
                autoHideDuration={4000}
                onClose={() => setToastMessage(null)}
                message={toastMessage}
            />
        </Box>
    );
};
