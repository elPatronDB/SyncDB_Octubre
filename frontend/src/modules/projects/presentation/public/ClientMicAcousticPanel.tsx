import React, { useRef, useEffect } from 'react';
import {
    Card,
    CardContent,
    Box,
    Typography,
    Stack,
    Button,
    Chip,
    Alert,
    LinearProgress,
} from '@mui/material';
import {
    Mic,
    MicOff,
    GraphicEq,
    Security,
} from '@mui/icons-material';
import { useAudioAnalyzer } from './useAudioAnalyzer';
import { SpectrogramWaterfall } from '../components/acoustic/SpectrogramWaterfall';

interface ClientMicAcousticPanelProps {
    deviceToken: string | null;
    initialCalibrationOffsetDb?: number;
}

export const ClientMicAcousticPanel: React.FC<ClientMicAcousticPanelProps> = ({
    deviceToken,
    initialCalibrationOffsetDb = 0,
}) => {
    const analyzer = useAudioAnalyzer({
        deviceToken,
        initialCalibrationOffsetDb,
        transmitIntervalMs: 250, // 4 frames/sec
    });

    const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // Live Mini Spectrum Drawing on local canvas
    useEffect(() => {
        const canvas = spectrumCanvasRef.current;
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

        const bands = analyzer.bands;
        const numBands = bands.length;

        if (analyzer.isCapturing && numBands > 0) {
            const barWidth = Math.max(1, (w - (numBands - 1) * 1.5) / numBands);

            for (let i = 0; i < numBands; i++) {
                const db = bands[i] ?? -100;
                const norm = Math.max(0, Math.min(1, (db + 100) / 100));
                const barHeight = norm * (h - 4);

                // Color gradient
                if (norm > 0.85) ctx.fillStyle = '#ef4444';
                else if (norm > 0.65) ctx.fillStyle = '#fbbf24';
                else ctx.fillStyle = '#34d59a';

                ctx.fillRect(i * (barWidth + 1.5), h - barHeight, barWidth, barHeight);
            }
        } else {
            ctx.fillStyle = '#50545c';
            ctx.font = '11px var(--font-geistmono, monospace)';
            ctx.textAlign = 'center';
            ctx.fillText(analyzer.status === 'REQUESTING_PERMISSION' ? 'SOLICITANDO PERMISO...' : 'MICRÓFONO EN ESPERA', w / 2, h / 2 + 4);
        }
    }, [analyzer.bands, analyzer.isCapturing, analyzer.status]);

    return (
        <Card
            sx={{
                bgcolor: '#151617',
                border: '1px solid',
                borderColor: analyzer.isCapturing ? '#34d59a' : '#303236',
                borderRadius: '4px',
                p: 2.5,
                mt: 3,
                boxShadow: analyzer.isCapturing ? '0 0 20px rgba(52, 213, 154, 0.15)' : 'none',
                transition: 'all 0.3s ease',
            }}
        >
            <CardContent sx={{ p: 0 }}>
                {/* Header */}
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Box
                            sx={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                bgcolor: analyzer.isCapturing ? 'rgba(52, 213, 154, 0.15)' : '#0a0a0b',
                                border: '1.5px solid',
                                borderColor: analyzer.isCapturing ? '#34d59a' : '#303236',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: analyzer.isCapturing ? '#34d59a' : '#797d86',
                            }}
                        >
                            {analyzer.isCapturing ? <GraphicEq /> : <Mic />}
                        </Box>

                        <Box>
                            <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600 }}>
                                Sensor de Audio en Tiempo Real
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#797d86' }}>
                                Captura de espectro acústico para calibración del sistema PA
                            </Typography>
                        </Box>
                    </Stack>

                    <Chip
                        icon={
                            analyzer.isCapturing ? (
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#34d59a', ml: 1, animation: 'pulse-radar 1.5s infinite ease-out' }} />
                            ) : undefined
                        }
                        label={analyzer.isCapturing ? 'TRANSMITIENDO EN VIVO' : 'INACTIVO'}
                        size="small"
                        sx={{
                            bgcolor: analyzer.isCapturing ? 'rgba(52, 213, 154, 0.1)' : 'rgba(121, 125, 134, 0.1)',
                            color: analyzer.isCapturing ? '#34d59a' : '#797d86',
                            border: '1px solid',
                            borderColor: analyzer.isCapturing ? 'rgba(52, 213, 154, 0.3)' : 'rgba(121, 125, 134, 0.2)',
                            fontFamily: 'var(--font-geistmono, monospace)',
                            fontWeight: 600,
                            fontSize: '10px',
                        }}
                    />
                </Stack>

                {/* Privacy & Hardware Notice */}
                {!analyzer.isCapturing && (
                    <Box sx={{ p: 2, bgcolor: '#0a0a0b', border: '1px solid #303236', borderRadius: '4px', mb: 2 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                            <Security sx={{ fontSize: 18, color: '#34d59a', mt: 0.2 }} />
                            <Typography variant="caption" sx={{ color: '#c9cbcf', lineHeight: 1.4 }}>
                                <strong>Privacidad y Procesamiento Local:</strong> Tu señal de audio se analiza directamente en tu navegador mediante Web Audio API. <strong>No se graba ni se transmite voz ni audio crudo</strong>; únicamente se transmiten los valores numéricos del espectro de frecuencias a la Consola Master.
                            </Typography>
                        </Stack>
                    </Box>
                )}

                {/* Error Banner */}
                {analyzer.errorMessage && (
                    <Alert severity="error" sx={{ mb: 2, py: 0.5 }}>
                        {analyzer.errorMessage}
                    </Alert>
                )}

                {/* Main Action Buttons */}
                <Box sx={{ mb: 2.5 }}>
                    {!analyzer.isCapturing ? (
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            size="large"
                            startIcon={<Mic />}
                            onClick={analyzer.startCapture}
                            disabled={analyzer.status === 'REQUESTING_PERMISSION' || !deviceToken}
                            sx={{ py: 1.4, fontWeight: 700, fontSize: '14px', letterSpacing: '0.2px' }}
                        >
                            {analyzer.status === 'REQUESTING_PERMISSION' ? 'Solicitando Permiso...' : 'Habilitar Micrófono para Análisis'}
                        </Button>
                    ) : (
                        <Button
                            fullWidth
                            variant="outlined"
                            size="large"
                            startIcon={<MicOff />}
                            onClick={analyzer.stopCapture}
                            sx={{
                                py: 1.2,
                                color: '#ff6655',
                                borderColor: 'rgba(255, 102, 85, 0.4)',
                                '&:hover': {
                                    borderColor: '#ff6655',
                                    bgcolor: 'rgba(255, 102, 85, 0.08)',
                                },
                            }}
                        >
                            Detener Captura y Liberar Micrófono
                        </Button>
                    )}
                </Box>

                {/* Real-Time Metrics & Visualizers (When capturing or has data) */}
                {analyzer.isCapturing && (
                    <Stack spacing={2}>
                        {/* Level & Frequency Grid */}
                        <Box sx={{ p: 2, bgcolor: '#0a0a0b', border: '1px solid #303236', borderRadius: '4px' }}>
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="caption" sx={{ color: '#797d86' }}>
                                    Nivel de Señal Instantáneo:
                                </Typography>
                                <Typography variant="subtitle1" sx={{ color: analyzer.isCalibrated ? '#fbbf24' : '#34d59a', fontWeight: 700, fontFamily: 'var(--font-geistmono, monospace)' }}>
                                    {analyzer.isCalibrated && analyzer.splDb !== null
                                        ? `${analyzer.splDb.toFixed(1)} dB SPL`
                                        : `${analyzer.rmsDb.toFixed(1)} dBFS`}
                                </Typography>
                            </Stack>

                            {/* VU Bar */}
                            <LinearProgress
                                variant="determinate"
                                value={Math.max(0, Math.min(100, (analyzer.rmsDb + 100)))}
                                sx={{
                                    height: 8,
                                    borderRadius: '4px',
                                    bgcolor: '#202225',
                                    '& .MuiLinearProgress-bar': {
                                        bgcolor: analyzer.rmsDb > -10 ? '#ef4444' : analyzer.rmsDb > -30 ? '#fbbf24' : '#34d59a',
                                    },
                                }}
                            />

                            <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 1.5 }}>
                                <Typography variant="caption" sx={{ color: '#797d86' }}>
                                    Frecuencia Dominante:
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 600, fontFamily: 'var(--font-geistmono, monospace)' }}>
                                    {analyzer.peakFreq > 0 ? `${analyzer.peakFreq} Hz` : '--'}
                                </Typography>
                            </Stack>

                            <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.5 }}>
                                <Typography variant="caption" sx={{ color: '#797d86' }}>
                                    Frecuencia de Muestreo:
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#c9cbcf', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                    {(analyzer.sampleRate / 1000).toFixed(1)} kHz (Nyquist: {(analyzer.nyquist / 1000).toFixed(1)} kHz)
                                </Typography>
                            </Stack>
                        </Box>

                        {/* Live 31-Band Mini Spectrum */}
                        <Box>
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="caption" sx={{ color: '#797d86', fontWeight: 600 }}>
                                    Espectro de Frecuencias (20 Hz - 20 kHz)
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#50545c', fontFamily: 'var(--font-geistmono, monospace)', fontSize: '9px' }}>
                                    31 BANDAS 1/3 OCTAVA
                                </Typography>
                            </Stack>

                            <Box sx={{ width: '100%', height: 70, borderRadius: '4px', overflow: 'hidden', border: '1px solid #303236', bgcolor: '#0a0a0b' }}>
                                <canvas ref={spectrumCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
                            </Box>
                        </Box>

                        {/* Local Waterfall Spectrogram */}
                        <Box sx={{ mt: 1 }}>
                            <SpectrogramWaterfall
                                spectrum={analyzer.bands}
                                isLive={analyzer.isCapturing}
                                height={150}
                                title="Evolución Temporal en Vivo (Espectrograma)"
                            />
                        </Box>
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
};
