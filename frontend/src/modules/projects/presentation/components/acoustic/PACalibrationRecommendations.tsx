import React, { useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Stack,
    Select,
    MenuItem,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Chip,
    Alert,
} from '@mui/material';
import {
    Tune,
    CheckCircleOutlined,
    Security,
} from '@mui/icons-material';
import {
    ISO_THIRD_OCTAVE_FREQUENCIES,
    type TargetCurveType,
    TARGET_CURVES,
    type PARecommendation,
    type DeviceAcousticState,
} from '../../../domain/acoustic.types';

interface PACalibrationRecommendationsProps {
    recommendations: PARecommendation[];
    currentSpectrum: number[];
    avgSpectrum: number[];
    targetCurveType: TargetCurveType;
    onSelectTargetCurve: (curve: TargetCurveType) => void;
    contributingDevices: DeviceAcousticState[];
}

export const PACalibrationRecommendations: React.FC<PACalibrationRecommendationsProps> = ({
    recommendations,
    currentSpectrum: _currentSpectrum,
    avgSpectrum,
    targetCurveType,
    onSelectTargetCurve,
    contributingDevices,
}) => {
    const targetDef = TARGET_CURVES[targetCurveType] || TARGET_CURVES.FLAT;

    // Calculate band-by-band analysis for critical bands
    const bandAnalysis = useMemo(() => {
        // Find reference mid level (around 1 kHz, index 17)
        const refLevel = avgSpectrum[17] && avgSpectrum[17] > -90 ? avgSpectrum[17] : -35;

        return ISO_THIRD_OCTAVE_FREQUENCIES.map((freq, idx) => {
            const measuredLvl = avgSpectrum[idx] ?? -100;
            const targetOffset = targetDef.offsets[idx] ?? 0;
            const targetLvl = refLevel + targetOffset;
            const deltaDb = measuredLvl > -95 ? measuredLvl - targetLvl : 0;

            // Room variance across active devices
            let stdDev = 0;
            const activeVals = contributingDevices
                .map((d) => d.latestFrame?.bands[idx] ?? -100)
                .filter((v) => v > -90);

            if (activeVals.length >= 2) {
                const mean = activeVals.reduce((a, b) => a + b, 0) / activeVals.length;
                const variance = activeVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / activeVals.length;
                stdDev = Math.sqrt(variance);
            }

            let status: 'NORMAL' | 'PEAK' | 'DIP' | 'SUB_BOOM' = 'NORMAL';
            if (measuredLvl > -95) {
                if (deltaDb >= 5.0) status = 'PEAK';
                else if (deltaDb <= -6.0) status = 'DIP';
                else if (freq < 50 && deltaDb >= 4.0) status = 'SUB_BOOM';
            }

            return {
                freq,
                measuredLvl,
                targetLvl,
                deltaDb,
                stdDev,
                status,
            };
        });
    }, [avgSpectrum, targetDef, contributingDevices]);

    return (
        <Box sx={{ width: '100%' }}>
            {/* Header & Target Curve Selector */}
            <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 2.5, mb: 3 }}>
                <CardContent sx={{ p: 0 }}>
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={3}
                        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}
                    >
                        <Box sx={{ maxWidth: 600 }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                                <Tune sx={{ color: '#34d59a' }} />
                                <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                                    Calibración y Recomendaciones Acústicas para Sistema PA
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: '#797d86' }}>
                                Propuestas fundamentadas de ecualización paramétrica (PEQ) calculadas a partir del espectro agregado
                                y la dispersión espacial entre dispositivos.
                            </Typography>
                        </Box>

                        {/* Target Curve Selector */}
                        <Box sx={{ minWidth: 260 }}>
                            <Typography variant="caption" sx={{ color: '#c9cbcf', fontWeight: 600, display: 'block', mb: 0.8 }}>
                                Curva de Referencia Objetivo:
                            </Typography>
                            <Select
                                fullWidth
                                size="small"
                                value={targetCurveType}
                                onChange={(e) => onSelectTargetCurve(e.target.value as TargetCurveType)}
                                sx={{
                                    bgcolor: '#0a0a0b',
                                    color: '#ffffff',
                                    borderColor: '#303236',
                                    fontSize: '13px',
                                }}
                            >
                                {Object.values(TARGET_CURVES).map((tc) => (
                                    <MenuItem key={tc.id} value={tc.id} sx={{ fontSize: '13px' }}>
                                        {tc.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>

            {/* Crucial Acoustic Notice */}
            <Alert
                severity="info"
                icon={<Security sx={{ color: '#38bdf8' }} />}
                sx={{
                    bgcolor: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    color: '#c9cbcf',
                    mb: 3,
                    '& .MuiAlert-icon': { color: '#38bdf8' },
                }}
            >
                <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 600, mb: 0.5 }}>
                    Principios de Seguridad y Limitaciones Físicas de la Calibración Acústica
                </Typography>
                <Typography variant="caption" sx={{ color: '#c9cbcf', display: 'block', lineHeight: 1.5 }}>
                    1. <strong>Nunca compenses cancelaciones de fase acústica aumentando ganancia:</strong> Si una banda presenta una caída pronunciada debido a reflexiones destructivas de sala o desalineación de cajas PA, inyectar +6 o +9 dB solo sobrecalentará las etapas de potencia sin corregir la interferencia destructiva.
                    <br />
                    2. <strong>Prioriza filtros de atenuación (corte) sobre aumentos:</strong> Para domar resonancias modales estrechas del recinto, aplica filtros Notch o Bell con corte negativo (-2 a -6 dB).
                    <br />
                    3. <strong>Equipos de medición:</strong> Las lecturas de teléfonos móviles son excelentes para contrastar homogeneidad relativa entre puntos del recinto, pero no sustituyen un sonómetro homologado Clase 1 para certificación de presión sonora dB SPL.
                </Typography>
            </Alert>

            {/* Actionable Filter Recommendations Table */}
            <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 3, mb: 3 }}>
                <CardContent sx={{ p: 0 }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box>
                            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                                Ajustes Sugeridos para Ecualizador Paramétrico (PEQ / DSP)
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#797d86' }}>
                                {recommendations.length > 0
                                    ? `Se detectaron ${recommendations.length} puntos críticos de corrección acústica fundamentados en las mediciones.`
                                    : 'No se detectan resonancias anormales severas con los datos actuales.'}
                            </Typography>
                        </Box>
                    </Stack>

                    {recommendations.length > 0 ? (
                        <Box sx={{ overflowX: 'auto' }}>
                            <Table size="small" sx={{ minWidth: 650 }}>
                                <TableHead>
                                    <TableRow sx={{ borderBottom: '1px solid #303236' }}>
                                        <TableCell sx={{ color: '#797d86', fontSize: '11px', fontWeight: 600 }}>TIPO FILTRO</TableCell>
                                        <TableCell sx={{ color: '#797d86', fontSize: '11px', fontWeight: 600 }}>FRECUENCIA</TableCell>
                                        <TableCell sx={{ color: '#797d86', fontSize: '11px', fontWeight: 600 }}>GANANCIA</TableCell>
                                        <TableCell sx={{ color: '#797d86', fontSize: '11px', fontWeight: 600 }}>FACTOR Q (ANCHO)</TableCell>
                                        <TableCell sx={{ color: '#797d86', fontSize: '11px', fontWeight: 600 }}>JUSTIFICACIÓN ACÚSTICA</TableCell>
                                        <TableCell sx={{ color: '#797d86', fontSize: '11px', fontWeight: 600 }}>CONFIANZA</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {recommendations.map((rec) => {
                                        const isCut = rec.gainDb < 0;
                                        return (
                                            <TableRow key={rec.id} sx={{ borderBottom: '1px solid #202225', '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                                <TableCell>
                                                    <Chip
                                                        label={rec.filterType}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: rec.filterType === 'NOTCH' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(52, 213, 154, 0.15)',
                                                            color: rec.filterType === 'NOTCH' ? '#ef4444' : '#34d59a',
                                                            border: '1px solid',
                                                            borderColor: rec.filterType === 'NOTCH' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(52, 213, 154, 0.3)',
                                                            fontFamily: 'var(--font-geistmono, monospace)',
                                                            fontWeight: 600,
                                                            fontSize: '10px',
                                                        }}
                                                    />
                                                </TableCell>

                                                <TableCell sx={{ color: '#ffffff', fontWeight: 600, fontFamily: 'var(--font-geistmono, monospace)' }}>
                                                    {rec.centerFreq >= 1000 ? `${(rec.centerFreq / 1000).toFixed(1)} kHz` : `${rec.centerFreq} Hz`}
                                                </TableCell>

                                                <TableCell sx={{ fontFamily: 'var(--font-geistmono, monospace)', fontWeight: 700, color: isCut ? '#38bdf8' : '#fbbf24' }}>
                                                    {rec.gainDb > 0 ? `+${rec.gainDb}` : rec.gainDb} dB
                                                </TableCell>

                                                <TableCell sx={{ color: '#c9cbcf', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                                    Q = {rec.qFactor.toFixed(1)} ({rec.bandwidthOctaves} oct)
                                                </TableCell>

                                                <TableCell sx={{ maxWidth: 320 }}>
                                                    <Typography variant="caption" sx={{ color: '#ffffff', display: 'block', mb: 0.3 }}>
                                                        {rec.reason}
                                                    </Typography>
                                                    {rec.warning && (
                                                        <Typography variant="caption" sx={{ color: '#fbbf24', fontStyle: 'italic', display: 'block' }}>
                                                            {rec.warning}
                                                        </Typography>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    <Chip
                                                        label={rec.confidence}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: rec.confidence === 'HIGH' ? 'rgba(52, 213, 154, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                                                            color: rec.confidence === 'HIGH' ? '#34d59a' : '#fbbf24',
                                                            fontSize: '9px',
                                                            fontWeight: 600,
                                                            fontFamily: 'var(--font-geistmono, monospace)',
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </Box>
                    ) : (
                        <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#0a0a0b', border: '1px dashed #303236', borderRadius: '4px' }}>
                            <CheckCircleOutlined sx={{ fontSize: 40, color: '#34d59a', mb: 1 }} />
                            <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                                Respuesta de Frecuencia Homogénea
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#797d86' }}>
                                No se detectan anomalías extremas ni resonancias que requieran ecualización agresiva.
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Band by Band ISO 1/3 Octave Matrix */}
            <Card sx={{ bgcolor: '#151617', border: '1px solid #303236', borderRadius: '4px', p: 3 }}>
                <CardContent sx={{ p: 0 }}>
                    <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600, mb: 1 }}>
                        Diagnóstico por Bandas Normalizadas (1/3 Octava ISO 266)
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#797d86', display: 'block', mb: 2 }}>
                        Comparativa de nivel promedio medido contra la curva objetivo y desviación estándar entre dispositivos en el recinto.
                    </Typography>

                    <Box sx={{ overflowX: 'auto', maxHeight: 320 }}>
                        <Table size="small" stickyHeader sx={{ minWidth: 600 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ bgcolor: '#151617', color: '#797d86', fontSize: '11px' }}>BANDA (Hz)</TableCell>
                                    <TableCell sx={{ bgcolor: '#151617', color: '#797d86', fontSize: '11px' }}>NIVEL MEDIDO</TableCell>
                                    <TableCell sx={{ bgcolor: '#151617', color: '#797d86', fontSize: '11px' }}>OBJETIVO</TableCell>
                                    <TableCell sx={{ bgcolor: '#151617', color: '#797d86', fontSize: '11px' }}>DELTA (&Delta;)</TableCell>
                                    <TableCell sx={{ bgcolor: '#151617', color: '#797d86', fontSize: '11px' }}>DISPERSIÓN SALA (&plusmn;&sigma;)</TableCell>
                                    <TableCell sx={{ bgcolor: '#151617', color: '#797d86', fontSize: '11px' }}>DIAGNÓSTICO</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {bandAnalysis.map((b) => (
                                    <TableRow key={b.freq} sx={{ borderBottom: '1px solid #202225' }}>
                                        <TableCell sx={{ color: '#ffffff', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                            {b.freq >= 1000 ? `${(b.freq / 1000).toFixed(1)}k` : b.freq}
                                        </TableCell>

                                        <TableCell sx={{ color: '#c9cbcf', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                            {b.measuredLvl > -95 ? `${b.measuredLvl.toFixed(1)} dBFS` : '--'}
                                        </TableCell>

                                        <TableCell sx={{ color: '#797d86', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                            {b.targetLvl.toFixed(1)} dBFS
                                        </TableCell>

                                        <TableCell
                                            sx={{
                                                fontFamily: 'var(--font-geistmono, monospace)',
                                                fontWeight: 600,
                                                color: b.deltaDb > 4 ? '#fbbf24' : b.deltaDb < -5 ? '#38bdf8' : '#34d59a',
                                            }}
                                        >
                                            {b.deltaDb > 0 ? `+${b.deltaDb.toFixed(1)}` : b.deltaDb.toFixed(1)} dB
                                        </TableCell>

                                        <TableCell sx={{ color: '#797d86', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                            {b.stdDev > 0 ? `±${b.stdDev.toFixed(1)} dB` : '--'}
                                        </TableCell>

                                        <TableCell>
                                            {b.status === 'PEAK' ? (
                                                <Chip label="PICO / RESONANCIA" size="small" sx={{ height: 18, fontSize: '9px', bgcolor: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }} />
                                            ) : b.status === 'DIP' ? (
                                                <Chip label="VALLE / CANCELACIÓN" size="small" sx={{ height: 18, fontSize: '9px', bgcolor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }} />
                                            ) : b.status === 'SUB_BOOM' ? (
                                                <Chip label="EXCESO GRAVES" size="small" sx={{ height: 18, fontSize: '9px', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} />
                                            ) : (
                                                <Typography variant="caption" sx={{ color: '#797d86' }}>Aceptable</Typography>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};
