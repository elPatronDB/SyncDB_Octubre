import React, { useRef, useEffect } from 'react';
import {
    Card,
    CardContent,
    Box,
    Typography,
    Stack,
    Chip,
    Button,
    Checkbox,
    FormControlLabel,
} from '@mui/material';
import {
    AnchorOutlined,
    SensorsOutlined,
    OpenInFull,
} from '@mui/icons-material';
import type { DeviceAcousticState } from '../../../domain/acoustic.types';

interface DeviceAcousticCardProps {
    device: DeviceAcousticState;
    isIncludedInAggregate: boolean;
    onToggleAggregateInclusion: (deviceId: string) => void;
    onOpenDetail: (device: DeviceAcousticState) => void;
}

export const DeviceAcousticCard: React.FC<DeviceAcousticCardProps> = ({
    device,
    isIncludedInAggregate,
    onToggleAggregateInclusion,
    onOpenDetail,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const frame = device.latestFrame;
    const isOnline = device.isOnline;
    const isMicActive = device.isMicActive;
    const isCalibrated = device.isCalibrated;

    // Render Mini-Spectrum Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#0a0a0b';
        ctx.fillRect(0, 0, w, h);

        const bands = frame?.bands || [];
        const numBands = bands.length;

        if (numBands > 0 && isMicActive) {
            const barWidth = Math.max(1, (w - (numBands - 1) * 1) / numBands);

            for (let i = 0; i < numBands; i++) {
                const db = bands[i] ?? -100;
                const norm = Math.max(0, Math.min(1, (db + 100) / 100));
                const barHeight = norm * h;

                // Color based on level
                if (norm > 0.85) ctx.fillStyle = '#ef4444';
                else if (norm > 0.65) ctx.fillStyle = '#fbbf24';
                else ctx.fillStyle = '#34d59a';

                ctx.fillRect(i * (barWidth + 1), h - barHeight, barWidth, barHeight);
            }
        } else {
            ctx.strokeStyle = '#202225';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, h - 2);
            ctx.lineTo(w, h - 2);
            ctx.stroke();

            ctx.fillStyle = '#50545c';
            ctx.font = '10px var(--font-geistmono, monospace)';
            ctx.textAlign = 'center';
            ctx.fillText(isOnline ? 'SIN MEDICIÓN' : 'OFFLINE', w / 2, h / 2 + 3);
        }
    }, [frame, isMicActive, isOnline]);

    return (
        <Card
            sx={{
                bgcolor: '#151617',
                border: '1px solid',
                borderColor: isMicActive ? '#303236' : '#25272a',
                borderRadius: '4px',
                p: 2,
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color 0.2s ease',
                '&:hover': {
                    borderColor: '#404349',
                },
            }}
        >
            <CardContent sx={{ p: 0 }}>
                {/* Header: Name, Role & Status */}
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ maxWidth: '65%' }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                            {device.isAnchor ? (
                                <AnchorOutlined sx={{ fontSize: 16, color: '#fbbf24' }} />
                            ) : (
                                <SensorsOutlined sx={{ fontSize: 16, color: '#34d59a' }} />
                            )}
                            <Typography variant="subtitle2" noWrap sx={{ color: '#ffffff', fontWeight: 600 }}>
                                {device.deviceName || 'Dispositivo'}
                            </Typography>
                        </Stack>

                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                            <Box
                                sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    bgcolor: isOnline ? (isMicActive ? '#34d59a' : '#fbbf24') : '#797d86',
                                    boxShadow: isOnline && isMicActive ? '0 0 6px #34d59a' : 'none',
                                }}
                            />
                            <Typography variant="caption" sx={{ color: '#797d86', fontFamily: 'var(--font-geistmono, monospace)', fontSize: '10px' }}>
                                {isOnline ? (isMicActive ? 'CAPTURANDO' : 'CONECTADO (SIN AUDIO)') : 'DESCONECTADO'}
                            </Typography>
                        </Stack>
                    </Box>

                    {/* Calibrated Badge */}
                    <Chip
                        label={isCalibrated ? 'CALIBRADO' : 'RELATIVO'}
                        size="small"
                        sx={{
                            height: 20,
                            bgcolor: isCalibrated ? 'rgba(251, 191, 36, 0.1)' : 'rgba(121, 125, 134, 0.1)',
                            color: isCalibrated ? '#fbbf24' : '#797d86',
                            border: '1px solid',
                            borderColor: isCalibrated ? 'rgba(251, 191, 36, 0.3)' : 'rgba(121, 125, 134, 0.2)',
                            fontFamily: 'var(--font-geistmono, monospace)',
                            fontWeight: 600,
                            fontSize: '9px',
                        }}
                    />
                </Stack>

                {/* Level Readout & Nyquist info */}
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: '#797d86' }}>
                        Nivel actual:
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            color: isMicActive ? (isCalibrated ? '#fbbf24' : '#34d59a') : '#797d86',
                            fontWeight: 700,
                            fontFamily: 'var(--font-geistmono, monospace)',
                        }}
                    >
                        {isMicActive && frame
                            ? `${(isCalibrated && frame.splDb !== null ? frame.splDb : frame.rmsDb).toFixed(1)} ${isCalibrated ? 'dB SPL' : 'dBFS'}`
                            : '--'}
                    </Typography>
                </Stack>

                {/* Mini Spectrum Canvas */}
                <Box sx={{ width: '100%', height: 50, borderRadius: '2px', overflow: 'hidden', bgcolor: '#0a0a0b', border: '1px solid #202225', mb: 1.5 }}>
                    <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
                </Box>

                {/* Footer Controls */}
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                size="small"
                                checked={isIncludedInAggregate}
                                onChange={() => onToggleAggregateInclusion(device.deviceId)}
                                sx={{ p: 0.5, color: '#797d86', '&.Mui-checked': { color: '#34d59a' } }}
                            />
                        }
                        label={
                            <Typography variant="caption" sx={{ color: '#797d86', fontSize: '10px' }}>
                                Aportar a global
                            </Typography>
                        }
                    />

                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => onOpenDetail(device)}
                        startIcon={<OpenInFull sx={{ fontSize: 13 }} />}
                        sx={{
                            fontSize: '10px',
                            py: 0.2,
                            px: 1,
                            minHeight: 24,
                            borderRadius: '9999px',
                            color: '#ffffff',
                            borderColor: '#303236',
                        }}
                    >
                        Detalle
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    );
};
