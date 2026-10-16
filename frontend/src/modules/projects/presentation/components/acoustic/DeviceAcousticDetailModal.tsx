import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Stack,
    Button,
    Chip,
    Grid,
    TextField,
    InputAdornment,
    Alert,
} from '@mui/material';
import {
    AnchorOutlined,
    SensorsOutlined,
    Close,
    Mic,
    MicOff,
} from '@mui/icons-material';
import type { DeviceAcousticState } from '../../../domain/acoustic.types';
import { GlobalSpectrumGraph } from './GlobalSpectrumGraph';
import { SpectrogramWaterfall } from './SpectrogramWaterfall';

interface DeviceAcousticDetailModalProps {
    open: boolean;
    onClose: () => void;
    device: DeviceAcousticState | null;
    onSaveCalibration?: (deviceId: string, offsetDb: number) => Promise<void>;
}

export const DeviceAcousticDetailModal: React.FC<DeviceAcousticDetailModalProps> = ({
    open,
    onClose,
    device,
    onSaveCalibration,
}) => {
    const [calibrationInput, setCalibrationInput] = useState<string>('0.0');
    const [isSavingCal, setIsSavingCal] = useState<boolean>(false);
    const [calSuccess, setCalSuccess] = useState<string | null>(null);

    // Sync input when device changes
    React.useEffect(() => {
        if (device) {
            setCalibrationInput(device.calibrationOffsetDb.toString());
            setCalSuccess(null);
        }
    }, [device]);

    if (!device) return null;

    const frame = device.latestFrame;
    const isOnline = device.isOnline;
    const isMicActive = device.isMicActive;
    const isCalibrated = device.isCalibrated;

    const handleApplyCalibration = async () => {
        if (!onSaveCalibration) return;
        const offset = parseFloat(calibrationInput);
        if (isNaN(offset)) return;

        try {
            setIsSavingCal(true);
            await onSaveCalibration(device.deviceId, offset);
            setCalSuccess(`Offset de calibración guardado (+${offset} dB)`);
        } catch (err) {
            console.error('Error saving calibration:', err);
        } finally {
            setIsSavingCal(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        bgcolor: '#151617',
                        border: '1px solid #303236',
                        borderRadius: '4px',
                        color: '#ffffff',
                    },
                },
            }}
        >
            <DialogTitle sx={{ borderBottom: '1px solid #202225', pb: 2 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        {device.isAnchor ? (
                            <AnchorOutlined sx={{ color: '#fbbf24' }} />
                        ) : (
                            <SensorsOutlined sx={{ color: '#34d59a' }} />
                        )}
                        <Box>
                            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                                {device.deviceName || 'Dispositivo'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#797d86', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                ID: {device.deviceId} &bull; {device.isAnchor ? 'ANCLA DE REFERENCIA' : 'SONDA MÓVIL'}
                            </Typography>
                        </Box>
                    </Stack>

                    <Button
                        size="small"
                        onClick={onClose}
                        sx={{ color: '#797d86', minWidth: 'auto', p: 0.5 }}
                    >
                        <Close />
                    </Button>
                </Stack>
            </DialogTitle>

            <DialogContent sx={{ py: 3 }}>
                {/* Status Badges */}
                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', mb: 3 }}>
                    <Chip
                        icon={isOnline ? <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#34d59a', ml: 1 }} /> : undefined}
                        label={isOnline ? 'CONEXIÓN: ONLINE' : 'CONEXIÓN: OFFLINE'}
                        size="small"
                        sx={{
                            bgcolor: isOnline ? 'rgba(52, 213, 154, 0.1)' : 'rgba(121, 125, 134, 0.1)',
                            color: isOnline ? '#34d59a' : '#797d86',
                            border: '1px solid',
                            borderColor: isOnline ? 'rgba(52, 213, 154, 0.3)' : 'rgba(121, 125, 134, 0.2)',
                            fontFamily: 'var(--font-geistmono, monospace)',
                            fontWeight: 600,
                            fontSize: '11px',
                        }}
                    />

                    <Chip
                        icon={isMicActive ? <Mic sx={{ fontSize: '14px !important', color: '#34d59a !important' }} /> : <MicOff sx={{ fontSize: '14px !important', color: '#797d86 !important' }} />}
                        label={isMicActive ? 'MICRÓFONO: CAPTURANDO' : 'MICRÓFONO: INACTIVO'}
                        size="small"
                        sx={{
                            bgcolor: isMicActive ? 'rgba(52, 213, 154, 0.1)' : 'rgba(121, 125, 134, 0.1)',
                            color: isMicActive ? '#34d59a' : '#797d86',
                            border: '1px solid',
                            borderColor: isMicActive ? 'rgba(52, 213, 154, 0.3)' : 'rgba(121, 125, 134, 0.2)',
                            fontFamily: 'var(--font-geistmono, monospace)',
                            fontWeight: 600,
                            fontSize: '11px',
                        }}
                    />

                    <Chip
                        label={isCalibrated ? `CALIBRADO (${device.calibrationOffsetDb > 0 ? '+' : ''}${device.calibrationOffsetDb} dB)` : 'MEDICIÓN RELATIVA (dBFS)'}
                        size="small"
                        sx={{
                            bgcolor: isCalibrated ? 'rgba(251, 191, 36, 0.1)' : 'rgba(121, 125, 134, 0.1)',
                            color: isCalibrated ? '#fbbf24' : '#797d86',
                            border: '1px solid',
                            borderColor: isCalibrated ? 'rgba(251, 191, 36, 0.3)' : 'rgba(121, 125, 134, 0.2)',
                            fontFamily: 'var(--font-geistmono, monospace)',
                            fontWeight: 600,
                            fontSize: '11px',
                        }}
                    />

                    {device.sampleRate > 0 && (
                        <Chip
                            label={`${(device.sampleRate / 1000).toFixed(1)} kHz (Nyquist: ${(device.nyquist / 1000).toFixed(1)} kHz)`}
                            size="small"
                            sx={{
                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                                color: '#c9cbcf',
                                border: '1px solid #303236',
                                fontFamily: 'var(--font-geistmono, monospace)',
                                fontSize: '11px',
                            }}
                        />
                    )}
                </Stack>

                {/* Metrics Summary */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ p: 2, bgcolor: '#0a0a0b', border: '1px solid #303236', borderRadius: '4px' }}>
                            <Typography variant="caption" sx={{ color: '#797d86', display: 'block', mb: 0.5 }}>
                                Nivel Instantáneo RMS
                            </Typography>
                            <Typography variant="h5" sx={{ color: isCalibrated ? '#fbbf24' : '#34d59a', fontWeight: 700, fontFamily: 'var(--font-geistmono, monospace)' }}>
                                {frame ? `${(isCalibrated && frame.splDb !== null ? frame.splDb : frame.rmsDb).toFixed(1)} ${isCalibrated ? 'dB SPL' : 'dBFS'}` : '--'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#797d86' }}>
                                {isCalibrated ? 'Nivel calibrado con offset' : 'Magnitud digital relativa (no calibrado)'}
                            </Typography>
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ p: 2, bgcolor: '#0a0a0b', border: '1px solid #303236', borderRadius: '4px' }}>
                            <Typography variant="caption" sx={{ color: '#797d86', display: 'block', mb: 0.5 }}>
                                Frecuencia Dominante (Pico)
                            </Typography>
                            <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 700, fontFamily: 'var(--font-geistmono, monospace)' }}>
                                {frame && frame.peakFreq > 0 ? (frame.peakFreq >= 1000 ? `${(frame.peakFreq / 1000).toFixed(2)} kHz` : `${frame.peakFreq} Hz`) : '--'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#797d86' }}>
                                Componente espectral con mayor energía
                            </Typography>
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ p: 2, bgcolor: '#0a0a0b', border: '1px solid #303236', borderRadius: '4px' }}>
                            <Typography variant="caption" sx={{ color: '#797d86', display: 'block', mb: 0.5 }}>
                                Ancho de Banda Medible
                            </Typography>
                            <Typography variant="h5" sx={{ color: device.nyquist >= 20000 ? '#34d59a' : '#fbbf24', fontWeight: 700, fontFamily: 'var(--font-geistmono, monospace)' }}>
                                {device.sampleRate > 0 ? `20 Hz - ${(device.nyquist / 1000).toFixed(1)} kHz` : 'Desconocido'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#797d86' }}>
                                {device.nyquist < 20000 ? 'Aviso: Límite de Nyquist bajo 20 kHz' : 'Cubre el rango audible completo'}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>

                {/* Calibration Offset Editor */}
                <Box sx={{ p: 2, bgcolor: '#0a0a0b', border: '1px solid #303236', borderRadius: '4px', mb: 3 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 600, mb: 0.5 }}>
                                Calibración Acústica de Sensibilidad (dB SPL)
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#797d86', display: 'block' }}>
                                Ajusta la compensación respecto a un calibrador sonómetro patrón (ej: señal de 94 dB SPL @ 1 kHz).
                            </Typography>
                        </Box>

                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                            <TextField
                                size="small"
                                label="Offset"
                                value={calibrationInput}
                                onChange={(e) => setCalibrationInput(e.target.value)}
                                slotProps={{
                                    input: {
                                        endAdornment: <InputAdornment position="end">dB</InputAdornment>,
                                    },
                                }}
                                sx={{ width: 120 }}
                            />
                            <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                onClick={handleApplyCalibration}
                                disabled={isSavingCal}
                                sx={{ borderRadius: '9999px', px: 2, height: 38 }}
                            >
                                Aplicar
                            </Button>
                        </Stack>
                    </Stack>
                    {calSuccess && (
                        <Alert severity="success" sx={{ mt: 1.5, py: 0.2 }}>
                            {calSuccess}
                        </Alert>
                    )}
                </Box>

                {/* Individual Spectrum Graph */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 600, mb: 1.5 }}>
                        Respuesta de Frecuencia Individual (Actual, Máximos y Media)
                    </Typography>
                    {isMicActive && frame ? (
                        <GlobalSpectrumGraph
                            currentSpectrum={frame.bands}
                            peakSpectrum={device.peakHoldCurve}
                            avgSpectrum={device.avgCurve}
                            contributingDevicesCount={1}
                            isLive={isMicActive}
                            height={280}
                            showControls={true}
                        />
                    ) : (
                        <Box sx={{ p: 6, textAlign: 'center', bgcolor: '#0a0a0b', border: '1px dashed #303236', borderRadius: '4px' }}>
                            <MicOff sx={{ fontSize: 40, color: '#797d86', mb: 1 }} />
                            <Typography variant="body2" sx={{ color: '#797d86' }}>
                                El micrófono de este dispositivo no está activo o no se han recibido muestras recientes.
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Individual Spectrogram Waterfall */}
                <Box>
                    {isMicActive && frame ? (
                        <SpectrogramWaterfall
                            spectrum={frame.bands}
                            isLive={isMicActive}
                            height={180}
                            title={`Espectrograma Temporal (${device.deviceName})`}
                        />
                    ) : null}
                </Box>
            </DialogContent>

            <DialogActions sx={{ borderTop: '1px solid #202225', p: 2 }}>
                <Button variant="outlined" onClick={onClose} sx={{ color: '#797d86' }}>
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    );
};
