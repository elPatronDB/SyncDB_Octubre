import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Card,
    Typography,
    Stack,
    Button,
    Chip,
    MenuItem,
    TextField,
    Grid,
    IconButton,
    Tooltip,
    ToggleButtonGroup,
    ToggleButton,
    Switch,
    FormControlLabel,
} from '@mui/material';
import {
    MapOutlined,
    GridOnOutlined,
    Refresh,
    CenterFocusStrongOutlined,
    Add,
    TuneOutlined,
} from '@mui/icons-material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { PageHeader } from '../components/common/PageHeader';
import { getProjects, getProjectDevices, getProjectById } from '../../modules/projects/infrastructure/services/project.service';
import type { Project, Device } from '../../modules/projects/domain/project.types';
import { formatDate } from '../../core/utils/formatDate';

// SVG Icons for Custom Leaflet DivIcons
const createAnchorIconHtml = (isOnline: boolean) => `
    <div style="
        position: relative;
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
    ">
        ${isOnline ? `
            <div style="
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: rgba(251, 191, 36, 0.25);
                animation: pulse-radar 2s infinite ease-out;
            "></div>
        ` : ''}
        <div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #151617;
            border: 2px solid ${isOnline ? '#fbbf24' : '#797d86'};
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${isOnline ? '#fbbf24' : '#797d86'};
            box-shadow: ${isOnline ? '0 0 14px rgba(251, 191, 36, 0.6)' : 'none'};
        ">
            <svg style="width: 18px; height: 18px; fill: currentColor;" viewBox="0 0 24 24">
                <path d="M12 2a3 3 0 0 0-3 3c0 1.31.84 2.41 2 2.83V11H7a5 5 0 0 0-5 5v1h2v-1a3 3 0 0 1 3-3h4v8.17A3.001 3.001 0 0 0 12 24a3.001 3.001 0 0 0 1-2.83V13h4a3 3 0 0 1 3 3v1h2v-1a5 5 0 0 0-5-5h-4V7.83c1.16-.42 2-1.52 2-2.83a3 3 0 0 0-3-3zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>
        </div>
    </div>
`;

const createProbeIconHtml = (isOnline: boolean) => `
    <div style="
        position: relative;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
    ">
        ${isOnline ? `
            <div style="
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: rgba(52, 213, 154, 0.25);
                animation: pulse-radar 2s infinite ease-out;
            "></div>
        ` : ''}
        <div style="
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #151617;
            border: 2px solid ${isOnline ? '#34d59a' : '#797d86'};
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${isOnline ? '#34d59a' : '#797d86'};
            box-shadow: ${isOnline ? '0 0 14px rgba(52, 213, 154, 0.6)' : 'none'};
        ">
            <svg style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
        </div>
    </div>
`;

export const DashboardPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [devices, setDevices] = useState<Device[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(true);
    const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(false);

    // View: 'map' (GPS) vs 'floorplan' (2D Room local)
    const [viewMode, setViewMode] = useState<'map' | 'floorplan'>('map');

    // Filter markers on map: 'all' | 'anchors' | 'probes'
    const [markerFilter, setMarkerFilter] = useState<'all' | 'anchors' | 'probes'>('all');

    // Auto-refresh interval (15s)
    const [autoSync, setAutoSync] = useState<boolean>(true);

    // Leaflet References
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersGroupRef = useRef<L.FeatureGroup | null>(null);

    // 1. Load Projects List on mount
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                setIsLoadingProjects(true);
                const res = await getProjects({ page: 1, perPage: 100 });
                setProjects(res.data);

                // Check URL parameter for preselection
                const urlProjId = searchParams.get('projectId');
                if (urlProjId && res.data.some((p) => p.id === urlProjId)) {
                    setSelectedProjectId(urlProjId);
                } else if (res.data.length > 0 && res.data[0]) {
                    setSelectedProjectId(res.data[0].id);
                }
            } catch (err) {
                console.error('Error fetching projects:', err);
            } finally {
                setIsLoadingProjects(false);
            }
        };

        fetchProjects();
    }, [searchParams]);

    // 2. Load Selected Project Details & Devices
    const loadProjectData = useCallback(async (projId: string) => {
        if (!projId) return;
        try {
            setIsLoadingDevices(true);
            const [proj, devs] = await Promise.all([
                getProjectById(projId),
                getProjectDevices(projId),
            ]);
            setSelectedProject(proj);
            setDevices(devs);
        } catch (err) {
            console.error('Error loading project devices:', err);
        } finally {
            setIsLoadingDevices(false);
        }
    }, []);

    useEffect(() => {
        if (selectedProjectId) {
            setSearchParams({ projectId: selectedProjectId }, { replace: true });
            loadProjectData(selectedProjectId);
        }
    }, [selectedProjectId, loadProjectData, setSearchParams]);

    // 3. Auto-sync polling every 15s
    useEffect(() => {
        if (!autoSync || !selectedProjectId) return;
        const interval = setInterval(() => {
            loadProjectData(selectedProjectId);
        }, 15000);
        return () => clearInterval(interval);
    }, [autoSync, selectedProjectId, loadProjectData]);

    // 4. Initialize Leaflet Map
    useEffect(() => {
        if (viewMode !== 'map' || !mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current, {
                center: [20, 0],
                zoom: 2,
                zoomControl: true,
                attributionControl: true,
            });

            // Capa de mapas oscura 100% libre sin API key requerida (Esri World Dark Gray Base)
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 16,
                attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
            }).addTo(map);

            // Capa de etiquetas y nombres de calles en modo oscuro
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 16,
                attribution: '',
            }).addTo(map);

            const featureGroup = L.featureGroup().addTo(map);
            markersGroupRef.current = featureGroup;
            mapInstanceRef.current = map;
        }
    }, [viewMode]);

    // 5. Update Map Markers when devices or filter changes
    useEffect(() => {
        if (viewMode !== 'map' || !mapInstanceRef.current || !markersGroupRef.current) return;

        const group = markersGroupRef.current;
        group.clearLayers();

        const devicesWithLocation = devices.filter((d) => {
            const hasLocation = d.latitude !== null && d.longitude !== null && d.latitude !== undefined && d.longitude !== undefined;
            if (!hasLocation) return false;
            if (markerFilter === 'anchors') return d.isAnchor || d.role === 'ANCHOR';
            if (markerFilter === 'probes') return !d.isAnchor && d.role !== 'ANCHOR';
            return true;
        });

        devicesWithLocation.forEach((d) => {
            const isAnchor = d.isAnchor || d.role === 'ANCHOR';
            const isOnline = d.status === 'CONNECTED';

            const icon = L.divIcon({
                className: 'syncdb-map-marker',
                html: isAnchor ? createAnchorIconHtml(isOnline) : createProbeIconHtml(isOnline),
                iconSize: [38, 38],
                iconAnchor: [19, 19],
                popupAnchor: [0, -20],
            });

            const marker = L.marker([d.latitude!, d.longitude!], { icon });

            const popupHtml = `
                <div style="font-family: Inter, sans-serif; min-width: 200px; color: #ffffff; padding: 2px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 11px; font-weight: 700; color: ${isAnchor ? '#fbbf24' : '#34d59a'}; letter-spacing: 0.5px; text-transform: uppercase;">
                            ${isAnchor ? 'ANCLA DE REFERENCIA' : 'DISPOSITIVO SONDA'}
                        </span>
                        <span style="font-size: 10px; color: ${isOnline ? '#34d59a' : '#797d86'}; font-weight: 600;">
                            ${isOnline ? '● ONLINE' : '○ OFFLINE'}
                        </span>
                    </div>
                    <div style="font-size: 14px; font-weight: 600; color: #ffffff; margin-bottom: 4px;">
                        ${d.name || 'Dispositivo sin nombre'}
                    </div>
                    <div style="font-size: 11px; color: #797d86; margin-bottom: 8px;">
                        ${d.deviceModel || d.browserInfo || 'Cliente Web'}
                    </div>
                    <div style="background: #0a0a0b; border: 1px solid #303236; border-radius: 4px; padding: 6px; font-size: 11px; font-family: monospace; color: #c9cbcf; margin-bottom: 6px;">
                        Lat: ${d.latitude!.toFixed(6)}<br/>
                        Lng: ${d.longitude!.toFixed(6)}<br/>
                        ${d.accuracy ? `Precisión: ±${Math.round(d.accuracy)}m` : ''}
                    </div>
                    <div style="font-size: 10px; color: #797d86;">
                        Última actividad: ${formatDate(d.lastSeenAt || d.joinedAt)}
                    </div>
                </div>
            `;

            marker.bindPopup(popupHtml, {
                className: 'syncdb-dark-popup',
            });

            group.addLayer(marker);
        });

        // Fit map bounds to encompass all devices
        if (devicesWithLocation.length > 0) {
            const bounds = group.getBounds();
            if (bounds.isValid()) {
                mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
            }
        }
    }, [devices, viewMode, markerFilter]);

    const handleCenterMap = () => {
        if (!mapInstanceRef.current || !markersGroupRef.current) return;
        const bounds = markersGroupRef.current.getBounds();
        if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
        }
    };

    const devicesWithLocation = devices.filter((d) => d.latitude !== null && d.longitude !== null && d.latitude !== undefined && d.longitude !== undefined);
    const devicesWithoutLocation = devices.filter((d) => d.latitude === null || d.longitude === null || d.latitude === undefined || d.longitude === undefined);
    const anchors = devices.filter((d) => d.isAnchor || d.role === 'ANCHOR');
    const probes = devices.filter((d) => !d.isAnchor && d.role !== 'ANCHOR');
    const onlineCount = devices.filter((d) => d.status === 'CONNECTED').length;

    return (
        <Box sx={{ width: '100%', py: 1 }}>
            {/* Radar Animation CSS for Leaflet Markers */}
            <style>{`
                @keyframes pulse-radar {
                    0% { transform: scale(0.8); opacity: 0.8; }
                    100% { transform: scale(2.2); opacity: 0; }
                }
                .leaflet-popup-content-wrapper {
                    background: #151617 !important;
                    border: 1px solid #303236 !important;
                    border-radius: 4px !important;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8) !important;
                }
                .leaflet-popup-tip {
                    background: #151617 !important;
                    border: 1px solid #303236 !important;
                }
            `}</style>

            <PageHeader
                title="Consola Master"
                subtitle="Monitoreo de anclas acústicas y distribución espacial de dispositivos"
            >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={autoSync}
                                onChange={(e) => setAutoSync(e.target.checked)}
                                color="primary"
                                size="small"
                            />
                        }
                        label={
                            <Typography variant="caption" sx={{ color: autoSync ? '#34d59a' : '#797d86', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                {autoSync ? 'SYNC EN VIVO' : 'PAUSADO'}
                            </Typography>
                        }
                    />
                    <Tooltip title="Actualizar datos ahora">
                        <IconButton
                            onClick={() => selectedProjectId && loadProjectData(selectedProjectId)}
                            disabled={isLoadingDevices}
                            sx={{ border: '1px solid #303236', color: '#c9cbcf', bgcolor: '#151617' }}
                        >
                            <Refresh sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </PageHeader>

            {/* Project Selector Bar */}
            <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 2, mb: 3 }}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    sx={{
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', md: 'center' },
                    }}
                >
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', width: { xs: '100%', md: 'auto' }, flex: 1 }}>
                        <TextField
                            select
                            label="Proyecto Activo"
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            sx={{ minWidth: { xs: '100%', sm: 320 } }}
                            disabled={isLoadingProjects || projects.length === 0}
                        >
                            {projects.map((p) => (
                                <MenuItem key={p.id} value={p.id}>
                                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.name}</Typography>
                                        <Chip
                                            label={p.status}
                                            size="small"
                                            sx={{
                                                fontSize: '10px',
                                                height: 18,
                                                bgcolor: p.status === 'ACTIVE' ? 'rgba(52, 213, 154, 0.1)' : '#0a0a0b',
                                                color: p.status === 'ACTIVE' ? '#34d59a' : '#797d86',
                                                borderColor: '#303236',
                                                borderWidth: '1px',
                                                borderStyle: 'solid',
                                            }}
                                        />
                                    </Stack>
                                </MenuItem>
                            ))}
                        </TextField>

                        {selectedProject && (
                            <Button
                                variant="text"
                                size="small"
                                startIcon={<TuneOutlined />}
                                onClick={() => navigate(`/projects/${selectedProject.id}`)}
                                sx={{ color: '#797d86', '&:hover': { color: '#34d59a' }, whiteSpace: 'nowrap' }}
                            >
                                Configuración
                            </Button>
                        )}
                    </Stack>

                    {/* View Switch: GPS Map vs Local 2D Floorplan */}
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_, next) => next && setViewMode(next)}
                        size="small"
                        sx={{
                            bgcolor: '#0a0a0b',
                            border: '1px solid #303236',
                            borderRadius: '4px',
                            '& .MuiToggleButton-root': {
                                color: '#797d86',
                                px: 2,
                                py: 0.7,
                                textTransform: 'none',
                                fontSize: '13px',
                                '&.Mui-selected': {
                                    bgcolor: 'rgba(52, 213, 154, 0.12)',
                                    color: '#34d59a',
                                    fontWeight: 600,
                                },
                            },
                        }}
                    >
                        <ToggleButton value="map">
                            <MapOutlined sx={{ fontSize: 16, mr: 1 }} />
                            Mapa Geográfico (GPS)
                        </ToggleButton>
                        <ToggleButton value="floorplan">
                            <GridOnOutlined sx={{ fontSize: 16, mr: 1 }} />
                            Plano del Recinto (2D)
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Stack>
            </Card>

            {/* Zero Projects State */}
            {!isLoadingProjects && projects.length === 0 && (
                <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 6, textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 600, mb: 1 }}>
                        No tienes proyectos de calibración
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#797d86', mb: 3, maxWidth: 480, mx: 'auto' }}>
                        Crea tu primer proyecto para generar un enlace público, registrar anclas acústicas y visualizar sus posiciones en el mapa.
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                        onClick={() => navigate('/projects')}
                    >
                        Crear Primer Proyecto
                    </Button>
                </Card>
            )}

            {/* Selected Project Content */}
            {selectedProject && (
                <>
                    {/* KPI Quick Stats */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 2 }}>
                                <Typography variant="caption" sx={{ color: '#797d86', fontFamily: 'var(--font-geistmono, monospace)', textTransform: 'uppercase' }}>
                                    Total Dispositivos
                                </Typography>
                                <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 600, mt: 0.5 }}>
                                    {devices.length}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#34d59a' }}>
                                    {onlineCount} Online
                                </Typography>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 2 }}>
                                <Typography variant="caption" sx={{ color: '#797d86', fontFamily: 'var(--font-geistmono, monospace)', textTransform: 'uppercase' }}>
                                    Anclas de Referencia
                                </Typography>
                                <Typography variant="h4" sx={{ color: '#fbbf24', fontWeight: 600, mt: 0.5 }}>
                                    {anchors.length}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#c9cbcf' }}>
                                    {anchors.filter((a) => a.status === 'CONNECTED').length} activas
                                </Typography>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 2 }}>
                                <Typography variant="caption" sx={{ color: '#797d86', fontFamily: 'var(--font-geistmono, monospace)', textTransform: 'uppercase' }}>
                                    Sondas / Normales
                                </Typography>
                                <Typography variant="h4" sx={{ color: '#34d59a', fontWeight: 600, mt: 0.5 }}>
                                    {probes.length}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#c9cbcf' }}>
                                    Móviles
                                </Typography>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 2 }}>
                                <Typography variant="caption" sx={{ color: '#797d86', fontFamily: 'var(--font-geistmono, monospace)', textTransform: 'uppercase' }}>
                                    Con Coordenadas GPS
                                </Typography>
                                <Typography variant="h4" sx={{ color: '#60a5fa', fontWeight: 600, mt: 0.5 }}>
                                    {devicesWithLocation.length}
                                </Typography>
                                <Typography variant="caption" sx={{ color: devicesWithoutLocation.length > 0 ? '#ff6655' : '#797d86' }}>
                                    {devicesWithoutLocation.length} sin GPS
                                </Typography>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* View: Primary Map View */}
                    {viewMode === 'map' && (
                        <Card
                            sx={{
                                bgcolor: '#151617',
                                border: '1px solid #303236',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                mb: 3,
                            }}
                        >
                            {/* Map Action / Filter Bar */}
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                sx={{
                                    justifyContent: 'space-between',
                                    alignItems: { xs: 'flex-start', sm: 'center' },
                                    p: 2,
                                    borderBottom: '1px solid #303236',
                                    bgcolor: '#0a0a0b',
                                }}
                            >
                                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                                    <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                                        Distribución Cartográfica
                                    </Typography>
                                    <Chip
                                        label={`${devicesWithLocation.length} ubicados`}
                                        size="small"
                                        sx={{
                                            bgcolor: 'rgba(52, 213, 154, 0.1)',
                                            color: '#34d59a',
                                            borderColor: 'rgba(52, 213, 154, 0.3)',
                                            borderWidth: '1px',
                                            borderStyle: 'solid',
                                            fontFamily: 'var(--font-geistmono, monospace)',
                                            fontSize: '11px',
                                        }}
                                    />
                                </Stack>

                                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                                    {/* Legend / Filter */}
                                    <ToggleButtonGroup
                                        value={markerFilter}
                                        exclusive
                                        onChange={(_, next) => next && setMarkerFilter(next)}
                                        size="small"
                                        sx={{
                                            height: 28,
                                            '& .MuiToggleButton-root': {
                                                color: '#797d86',
                                                px: 1.5,
                                                fontSize: '11px',
                                                borderColor: '#303236',
                                                '&.Mui-selected': {
                                                    color: '#ffffff',
                                                    bgcolor: '#202225',
                                                },
                                            },
                                        }}
                                    >
                                        <ToggleButton value="all">Todos</ToggleButton>
                                        <ToggleButton value="anchors">Solo Anclas</ToggleButton>
                                        <ToggleButton value="probes">Solo Sondas</ToggleButton>
                                    </ToggleButtonGroup>

                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<CenterFocusStrongOutlined />}
                                        onClick={handleCenterMap}
                                        sx={{
                                            borderColor: '#303236',
                                            color: '#c9cbcf',
                                            borderRadius: '9999px',
                                            fontSize: '11px',
                                            py: 0.4,
                                        }}
                                    >
                                        Centrar Dispositivos
                                    </Button>
                                </Stack>
                            </Stack>

                            {/* Leaflet Canvas Container */}
                            <Box
                                ref={mapContainerRef}
                                sx={{
                                    width: '100%',
                                    height: { xs: 400, sm: 540, md: 620 },
                                    bgcolor: '#000000',
                                    position: 'relative',
                                }}
                            />

                            {/* Map Footer Legend */}
                            <Stack
                                direction="row"
                                spacing={3}
                                sx={{ p: 1.5, bgcolor: '#0a0a0b', borderTop: '1px solid #303236', flexWrap: 'wrap', gap: 1 }}
                            >
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }} />
                                    <Typography variant="caption" sx={{ color: '#c9cbcf', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                        Ancla de Referencia
                                    </Typography>
                                </Stack>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#34d59a', boxShadow: '0 0 8px #34d59a' }} />
                                    <Typography variant="caption" sx={{ color: '#c9cbcf', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                        Dispositivo Normal (Sonda)
                                    </Typography>
                                </Stack>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#797d86' }} />
                                    <Typography variant="caption" sx={{ color: '#797d86', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                        Desconectado (Offline)
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Card>
                    )}

                    {/* View: 2D Recinto Local Floorplan */}
                    {viewMode === 'floorplan' && (
                        <Card
                            sx={{
                                bgcolor: '#151617',
                                border: '1px solid #303236',
                                borderRadius: '4px',
                                p: 3,
                                mb: 3,
                            }}
                        >
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Box>
                                    <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                                        Plano del Recinto Acústico (2D)
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#797d86' }}>
                                        Proyección espacial relativa según las dimensiones configuradas ({selectedProject.roomWidth ?? 10}m × {selectedProject.roomLength ?? 8}m).
                                    </Typography>
                                </Box>
                                <Chip
                                    label={`Espacio: ${((selectedProject.roomWidth || 10) * (selectedProject.roomLength || 8)).toFixed(1)} m²`}
                                    size="small"
                                    sx={{
                                        bgcolor: '#0a0a0b',
                                        color: '#34d59a',
                                        borderColor: '#303236',
                                        borderWidth: '1px',
                                        borderStyle: 'solid',
                                        fontFamily: 'var(--font-geistmono, monospace)',
                                        fontSize: '12px',
                                    }}
                                />
                            </Stack>

                            {/* SVG Local Grid Canvas */}
                            <Box
                                sx={{
                                    width: '100%',
                                    height: { xs: 360, sm: 480 },
                                    bgcolor: '#0a0a0b',
                                    border: '1px solid #303236',
                                    borderRadius: '4px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <svg
                                    style={{ width: '90%', height: '90%' }}
                                    viewBox={`0 0 ${Math.max(10, selectedProject.roomWidth || 10) * 50} ${Math.max(8, selectedProject.roomLength || 8) * 50}`}
                                >
                                    {/* Grid Lines */}
                                    <defs>
                                        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                                            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#202225" strokeWidth="1" />
                                        </pattern>
                                    </defs>
                                    <rect width="100%" height="100%" fill="url(#grid)" />

                                    {/* Recinto Boundary */}
                                    <rect
                                        x="0"
                                        y="0"
                                        width={(selectedProject.roomWidth || 10) * 50}
                                        height={(selectedProject.roomLength || 8) * 50}
                                        fill="none"
                                        stroke="#34d59a"
                                        strokeWidth="2"
                                        strokeDasharray="4"
                                    />

                                    {/* Plot Devices inside Room */}
                                    {devices.map((d) => {
                                        const isAnchor = d.isAnchor || d.role === 'ANCHOR';
                                        const x = Math.min(Math.max((d.positionX ?? 1) * 50, 20), (selectedProject.roomWidth || 10) * 50 - 20);
                                        const y = Math.min(Math.max((d.positionY ?? 1) * 50, 20), (selectedProject.roomLength || 8) * 50 - 20);

                                        return (
                                            <g key={d.id} transform={`translate(${x}, ${y})`}>
                                                <circle
                                                    r="14"
                                                    fill="#151617"
                                                    stroke={isAnchor ? '#fbbf24' : '#34d59a'}
                                                    strokeWidth="2"
                                                />
                                                <circle
                                                    r="5"
                                                    fill={isAnchor ? '#fbbf24' : '#34d59a'}
                                                />
                                                <text
                                                    x="0"
                                                    y="26"
                                                    textAnchor="middle"
                                                    fill="#ffffff"
                                                    fontSize="11"
                                                    fontFamily="Inter, sans-serif"
                                                    fontWeight="500"
                                                >
                                                    {d.name || (isAnchor ? 'Ancla' : 'Sonda')}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </svg>
                            </Box>
                        </Card>
                    )}

                    {/* Section: Devices Without Coordinates */}
                    {devicesWithoutLocation.length > 0 && (
                        <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 3, mb: 3 }}>
                            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600, mb: 0.5 }}>
                                Dispositivos Sin Coordenadas GPS ({devicesWithoutLocation.length})
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#797d86', mb: 2 }}>
                                Estos dispositivos se encuentran conectados pero no han otorgado permiso de ubicación o su GPS aún no ha emitido coordenadas. No se muestran en el mapa para evitar posicionamientos falsos.
                            </Typography>

                            <Grid container spacing={2}>
                                {devicesWithoutLocation.map((d) => {
                                    const isAnchor = d.isAnchor || d.role === 'ANCHOR';
                                    return (
                                        <Grid key={d.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                            <Card sx={{ bgcolor: '#0a0a0b', border: '1px solid #303236', borderRadius: '4px', p: 2 }}>
                                                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                    <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                                                        {d.name || 'Dispositivo'}
                                                    </Typography>
                                                    <Chip
                                                        label={isAnchor ? 'ANCLA' : 'SONDA'}
                                                        size="small"
                                                        sx={{
                                                            fontSize: '10px',
                                                            bgcolor: isAnchor ? 'rgba(251, 191, 36, 0.1)' : 'rgba(52, 213, 154, 0.1)',
                                                            color: isAnchor ? '#fbbf24' : '#34d59a',
                                                            fontFamily: 'var(--font-geistmono, monospace)',
                                                        }}
                                                    />
                                                </Stack>
                                                <Typography variant="caption" sx={{ color: '#797d86', display: 'block', mb: 1 }}>
                                                    {d.deviceModel || d.browserInfo || 'Cliente Web'}
                                                </Typography>
                                                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="caption" sx={{ color: '#ff6655' }}>
                                                        Sin coordenadas
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: '#797d86', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                                        {formatDate(d.lastSeenAt || d.joinedAt)}
                                                    </Typography>
                                                </Stack>
                                            </Card>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Card>
                    )}
                </>
            )}
        </Box>
    );
};

export default DashboardPage;
