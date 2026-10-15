import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Stack,
    Button,
    TextField,
    Alert,
    CircularProgress,
    Chip,
    Divider,
    Grid,
    Switch,
    FormControlLabel,
} from '@mui/material';
import {
    AnchorOutlined,
    SensorsOutlined,
    MyLocationOutlined,
    CheckCircleOutlined,
    ErrorOutlined,
    Refresh,
    WifiTethering,
    Security,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import {
    getPublicProject,
    registerPublicDevice,
    updateDeviceLocation,
    sendDeviceHeartbeat,
    getOrCreatePersistentBrowserId,
    getStoredDeviceToken,
} from '../../infrastructure/services/publicDevice.service';
import type { PublicProject, Device, DeviceRole } from '../../domain/project.types';

export const PublicDeviceRegisterPage: React.FC = () => {
    const { accessCode } = useParams<{ accessCode: string }>();

    const [project, setProject] = useState<PublicProject | null>(null);
    const [isLoadingProject, setIsLoadingProject] = useState<boolean>(true);
    const [projectError, setProjectError] = useState<string | null>(null);

    // Registration Form State
    const [deviceName, setDeviceName] = useState<string>('');
    const [selectedRole, setSelectedRole] = useState<DeviceRole>('PROBE');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Location State
    const [locationCoords, setLocationCoords] = useState<{
        latitude: number | null;
        longitude: number | null;
        accuracy: number | null;
        altitude: number | null;
    }>({
        latitude: null,
        longitude: null,
        accuracy: null,
        altitude: null,
    });
    const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported'>('idle');
    const [locationErrorMsg, setLocationErrorMsg] = useState<string | null>(null);

    // Registered Device State
    const [registeredDevice, setRegisteredDevice] = useState<Device | null>(null);
    const [deviceToken, setDeviceToken] = useState<string | null>(null);

    // Live Tracking & Heartbeat
    const [isLiveTracking, setIsLiveTracking] = useState<boolean>(false);
    const watchIdRef = useRef<number | null>(null);
    const heartbeatIntervalRef = useRef<any>(null);

    // Auto-detect device model / browser
    useEffect(() => {
        const ua = navigator.userAgent;
        let suggestedName = 'Dispositivo Web';
        if (/iPhone/i.test(ua)) suggestedName = 'Apple iPhone';
        else if (/iPad/i.test(ua)) suggestedName = 'Apple iPad';
        else if (/Android/i.test(ua)) suggestedName = 'Dispositivo Android';
        else if (/Macintosh/i.test(ua)) suggestedName = 'MacBook / Mac OS';
        else if (/Windows/i.test(ua)) suggestedName = 'PC Windows';
        else if (/Linux/i.test(ua)) suggestedName = 'Linux Client';

        setDeviceName(suggestedName);
    }, []);

    // Load Project & Check Existing Device Token
    useEffect(() => {
        if (!accessCode) {
            setProjectError('Código de acceso no proporcionado');
            setIsLoadingProject(false);
            return;
        }

        const fetchProject = async () => {
            try {
                setIsLoadingProject(true);
                const proj = await getPublicProject(accessCode);
                setProject(proj);

                // Check if already registered
                const storedToken = getStoredDeviceToken(accessCode);
                if (storedToken) {
                    setDeviceToken(storedToken);
                }
            } catch (err: any) {
                const message = err.response?.data?.message || 'El enlace de compartición es inválido, ha expirado o el proyecto está inactivo.';
                setProjectError(message);
            } finally {
                setIsLoadingProject(false);
            }
        };

        fetchProject();
    }, [accessCode]);

    // Request Geolocation
    const requestGeolocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationStatus('unsupported');
            setLocationErrorMsg('Tu navegador no soporta la API de Geolocalización');
            return;
        }

        setLocationStatus('requesting');
        setLocationErrorMsg(null);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocationCoords({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    altitude: pos.coords.altitude,
                });
                setLocationStatus('granted');
            },
            (err) => {
                console.warn('Geolocation error:', err);
                setLocationStatus('denied');
                if (err.code === err.PERMISSION_DENIED) {
                    setLocationErrorMsg('Permiso de ubicación denegado por el usuario.');
                } else if (err.code === err.POSITION_UNAVAILABLE) {
                    setLocationErrorMsg('La ubicación no está disponible en este momento.');
                } else {
                    setLocationErrorMsg('Tiempo de espera agotado al obtener ubicación.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 5000,
            }
        );
    }, []);

    // Initial Auto-Request Location on load if supported
    useEffect(() => {
        if (project && !registeredDevice) {
            requestGeolocation();
        }
    }, [project, registeredDevice, requestGeolocation]);

    // Handle Device Registration
    const handleRegister = async () => {
        if (!accessCode || !project) return;

        try {
            setIsSubmitting(true);
            setSubmitError(null);

            const persistentBrowserId = getOrCreatePersistentBrowserId();

            const res = await registerPublicDevice(accessCode, {
                browserIdentifier: persistentBrowserId,
                name: deviceName.trim() || undefined,
                role: selectedRole,
                isAnchor: selectedRole === 'ANCHOR',
                deviceModel: navigator.userAgent.substring(0, 100),
                browserInfo: `${navigator.vendor} (${navigator.platform})`,
                latitude: locationCoords.latitude ?? undefined,
                longitude: locationCoords.longitude ?? undefined,
                accuracy: locationCoords.accuracy ?? undefined,
                altitude: locationCoords.altitude ?? undefined,
                hasLocationPermission: locationStatus === 'granted',
            });

            setRegisteredDevice(res.device);
            setDeviceToken(res.deviceToken);
        } catch (err: any) {
            console.error('Error registrando dispositivo:', err);
            setSubmitError(err.response?.data?.message || 'Error al conectar el dispositivo al proyecto');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Heartbeat Keepalive
    useEffect(() => {
        if (!deviceToken) return;

        // Run immediately
        sendDeviceHeartbeat(deviceToken).catch(() => {});

        // Then every 25 seconds
        heartbeatIntervalRef.current = setInterval(() => {
            sendDeviceHeartbeat(deviceToken).catch(() => {});
        }, 25000);

        return () => {
            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        };
    }, [deviceToken]);

    // Live Tracking WatchPosition
    useEffect(() => {
        if (isLiveTracking && deviceToken && navigator.geolocation) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                async (pos) => {
                    setLocationCoords({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                        altitude: pos.coords.altitude,
                    });
                    await updateDeviceLocation({
                        deviceToken,
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                        altitude: pos.coords.altitude,
                        hasLocationPermission: true,
                    }).catch(() => {});
                },
                (err) => console.warn('WatchPosition error:', err),
                { enableHighAccuracy: true, maximumAge: 10000 }
            );
        } else if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [isLiveTracking, deviceToken]);

    // Manual Refresh Location
    const handleRefreshLocation = async () => {
        if (!navigator.geolocation || !deviceToken) return;

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                setLocationCoords({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    altitude: pos.coords.altitude,
                });
                setLocationStatus('granted');
                await updateDeviceLocation({
                    deviceToken,
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    altitude: pos.coords.altitude,
                    hasLocationPermission: true,
                });
            },
            () => {},
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    if (isLoadingProject) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
                <CircularProgress color="primary" />
            </Box>
        );
    }

    if (projectError || !project) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
                <Card sx={{ maxWidth: 440, width: '100%', bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 2 }}>
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                        <ErrorOutlined sx={{ fontSize: 56, color: '#ff3621', mb: 2 }} />
                        <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 600, mb: 1 }}>
                            Enlace No Disponible
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#797d86', mb: 3 }}>
                            {projectError || 'El proyecto no existe o el enlace ha sido revocado por el administrador.'}
                        </Typography>
                        <Button variant="outlined" onClick={() => window.location.reload()}>
                            Reintentar
                        </Button>
                    </CardContent>
                </Card>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#000000', py: { xs: 3, sm: 6 }, px: 2 }}>
            <Box sx={{ maxWidth: 540, mx: 'auto' }}>
                {/* Brand Header */}
                <Stack spacing={1} sx={{ textAlign: 'center', mb: 4 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#34d59a', boxShadow: '0 0 12px #34d59a' }} />
                        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700, letterSpacing: '-0.4px' }}>
                            SyncDB Mobile Node
                        </Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ color: '#797d86', fontFamily: 'var(--font-geistmono, monospace)' }}>
                        SISTEMA DE SINCRONIZACIÓN Y CALIBRACIÓN ESPACIAL
                    </Typography>
                </Stack>

                {/* Project Badge */}
                <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 2, mb: 3 }}>
                    <CardContent sx={{ p: 1 }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="caption" sx={{ color: '#797d86', textTransform: 'uppercase', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                    Proyecto Destino
                                </Typography>
                                <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                                    {project.name}
                                </Typography>
                            </Box>
                            <Chip
                                label="ENLACE VERIFICADO"
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(52, 213, 154, 0.1)',
                                    color: '#34d59a',
                                    border: '1px solid rgba(52, 213, 154, 0.3)',
                                    fontFamily: 'var(--font-geistmono, monospace)',
                                    fontWeight: 600,
                                    fontSize: '11px',
                                }}
                            />
                        </Stack>
                    </CardContent>
                </Card>

                {/* Main Card: Registration or Active State */}
                {!registeredDevice ? (
                    <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 3 }}>
                        <CardContent sx={{ p: 0 }}>
                            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600, mb: 0.5 }}>
                                Identificación del Dispositivo
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#797d86', mb: 3 }}>
                                Configura cómo participará este dispositivo en la calibración y el mapa del proyecto.
                            </Typography>

                            {submitError && (
                                <Alert severity="error" sx={{ mb: 3 }}>
                                    {submitError}
                                </Alert>
                            )}

                            <Stack spacing={3}>
                                {/* Device Name */}
                                <TextField
                                    label="Nombre del Dispositivo"
                                    value={deviceName}
                                    onChange={(e) => setDeviceName(e.target.value)}
                                    placeholder="Ej: iPhone 15 Pro - Kevin"
                                    fullWidth
                                    required
                                    helperText="Nombre con el que aparecerá en el mapa de la Consola Master"
                                />

                                {/* Classification Selection: Anchor vs Normal */}
                                <Box>
                                    <Typography variant="caption" sx={{ color: '#c9cbcf', fontWeight: 600, display: 'block', mb: 1.5 }}>
                                        Selecciona la Función del Dispositivo:
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Box
                                                onClick={() => setSelectedRole('ANCHOR')}
                                                sx={{
                                                    p: 2,
                                                    borderRadius: '4px',
                                                    border: '1.5px solid',
                                                    borderColor: selectedRole === 'ANCHOR' ? '#fbbf24' : '#303236',
                                                    bgcolor: selectedRole === 'ANCHOR' ? 'rgba(251, 191, 36, 0.08)' : '#0a0a0b',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': { borderColor: '#fbbf24' },
                                                }}
                                            >
                                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                                                    <AnchorOutlined sx={{ color: '#fbbf24' }} />
                                                    <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                                                        Ancla
                                                    </Typography>
                                                </Stack>
                                                <Typography variant="caption" sx={{ color: '#797d86', display: 'block' }}>
                                                    Dispositivo de referencia fijo. Define los límites o centro del plano acústico.
                                                </Typography>
                                            </Box>
                                        </Grid>

                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Box
                                                onClick={() => setSelectedRole('PROBE')}
                                                sx={{
                                                    p: 2,
                                                    borderRadius: '4px',
                                                    border: '1.5px solid',
                                                    borderColor: selectedRole === 'PROBE' ? '#34d59a' : '#303236',
                                                    bgcolor: selectedRole === 'PROBE' ? 'rgba(52, 213, 154, 0.08)' : '#0a0a0b',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': { borderColor: '#34d59a' },
                                                }}
                                            >
                                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                                                    <SensorsOutlined sx={{ color: '#34d59a' }} />
                                                    <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                                                        Normal (Sonda)
                                                    </Typography>
                                                </Stack>
                                                <Typography variant="caption" sx={{ color: '#797d86', display: 'block' }}>
                                                    Dispositivo móvil de toma de audio o seguimiento en tiempo real.
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Box>

                                {/* Location Status Card */}
                                <Card sx={{ bgcolor: '#0a0a0b', border: '1px solid #303236', borderRadius: '4px', p: 2 }}>
                                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                                            <MyLocationOutlined sx={{ color: locationStatus === 'granted' ? '#34d59a' : '#797d86' }} />
                                            <Box>
                                                <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 500 }}>
                                                    Permisos de Ubicación Geográfica
                                                </Typography>
                                                {locationStatus === 'granted' && locationCoords.latitude !== null ? (
                                                    <Typography variant="caption" sx={{ color: '#34d59a', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                                        GPS: {locationCoords.latitude.toFixed(5)}, {locationCoords.longitude?.toFixed(5)} (±{Math.round(locationCoords.accuracy || 0)}m)
                                                    </Typography>
                                                ) : locationStatus === 'requesting' ? (
                                                    <Typography variant="caption" sx={{ color: '#fbbf24' }}>
                                                        Obteniendo coordenadas GPS...
                                                    </Typography>
                                                ) : (
                                                    <Typography variant="caption" sx={{ color: '#797d86' }}>
                                                        {locationErrorMsg || 'Se solicita para ubicar este nodo en el mapa master.'}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Stack>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={requestGeolocation}
                                            disabled={locationStatus === 'requesting'}
                                            sx={{ fontSize: '11px', borderRadius: '9999px', whiteSpace: 'nowrap' }}
                                        >
                                            {locationStatus === 'granted' ? 'Actualizar' : 'Permitir GPS'}
                                        </Button>
                                    </Stack>
                                </Card>

                                {/* Persistent Browser Notice */}
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <Security sx={{ fontSize: 16, color: '#797d86' }} />
                                    <Typography variant="caption" sx={{ color: '#797d86' }}>
                                        Este navegador será recordado automáticamente en futuras visitas sin duplicar tu registro.
                                    </Typography>
                                </Stack>

                                {/* Submit Button */}
                                <Button
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    onClick={handleRegister}
                                    disabled={isSubmitting || !deviceName.trim()}
                                    startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <WifiTethering />}
                                    sx={{ py: 1.5, fontWeight: 600 }}
                                >
                                    {isSubmitting ? 'Sincronizando...' : 'Conectar y Registrar Dispositivo'}
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                ) : (
                    /* Active Connected Node Screen */
                    <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 3 }}>
                        <CardContent sx={{ p: 0, textAlign: 'center' }}>
                            <Box
                                sx={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: '50%',
                                    bgcolor: '#0a0a0b',
                                    border: '2px solid #34d59a',
                                    color: '#34d59a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mx: 'auto',
                                    mb: 2,
                                    boxShadow: '0 0 24px rgba(52, 213, 154, 0.3)',
                                }}
                            >
                                <CheckCircleOutlined sx={{ fontSize: 40 }} />
                            </Box>

                            <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 600, mb: 0.5 }}>
                                Dispositivo Sincronizado
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#797d86', mb: 3 }}>
                                Conexión activa con el proyecto <strong>{project.name}</strong>. Tu nodo ahora es visible en la Consola Master.
                            </Typography>

                            {/* Node Info Box */}
                            <Box sx={{ bgcolor: '#0a0a0b', border: '1px solid #303236', borderRadius: '4px', p: 2.5, mb: 3, textAlign: 'left' }}>
                                <Stack spacing={1.5}>
                                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                                        <Typography variant="caption" sx={{ color: '#797d86' }}>Nombre de Nodo:</Typography>
                                        <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 600 }}>{registeredDevice.name}</Typography>
                                    </Stack>
                                    <Divider sx={{ borderColor: '#202225' }} />
                                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                                        <Typography variant="caption" sx={{ color: '#797d86' }}>Clasificación:</Typography>
                                        <Chip
                                            label={registeredDevice.isAnchor ? 'ANCLA DE REFERENCIA' : 'DISPOSITIVO NORMAL'}
                                            size="small"
                                            sx={{
                                                bgcolor: registeredDevice.isAnchor ? 'rgba(251, 191, 36, 0.1)' : 'rgba(52, 213, 154, 0.1)',
                                                color: registeredDevice.isAnchor ? '#fbbf24' : '#34d59a',
                                                fontSize: '10px',
                                                fontWeight: 600,
                                                fontFamily: 'var(--font-geistmono, monospace)',
                                            }}
                                        />
                                    </Stack>
                                    <Divider sx={{ borderColor: '#202225' }} />
                                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                                        <Typography variant="caption" sx={{ color: '#797d86' }}>Estado de Red:</Typography>
                                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#34d59a', boxShadow: '0 0 6px #34d59a' }} />
                                            <Typography variant="caption" sx={{ color: '#34d59a', fontWeight: 600, fontFamily: 'var(--font-geistmono, monospace)' }}>
                                                ONLINE (Pulsando)
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                    <Divider sx={{ borderColor: '#202225' }} />
                                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                                        <Typography variant="caption" sx={{ color: '#797d86' }}>Coordenadas GPS:</Typography>
                                        <Typography variant="caption" sx={{ color: locationCoords.latitude ? '#ffffff' : '#ff6655', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                            {locationCoords.latitude !== null
                                                ? `${locationCoords.latitude.toFixed(5)}, ${locationCoords.longitude?.toFixed(5)}`
                                                : 'No reportadas'}
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </Box>

                            {/* Tracking Controls */}
                            <Stack spacing={2}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={isLiveTracking}
                                            onChange={(e) => setIsLiveTracking(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label={
                                        <Typography variant="body2" sx={{ color: '#ffffff' }}>
                                            Rastreo continuo de ubicación en vivo
                                        </Typography>
                                    }
                                />

                                <Button
                                    variant="outlined"
                                    startIcon={<Refresh />}
                                    onClick={handleRefreshLocation}
                                    fullWidth
                                    sx={{ py: 1 }}
                                >
                                    Reportar Ubicación GPS Ahora
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                )}
            </Box>
        </Box>
    );
};

export default PublicDeviceRegisterPage;
