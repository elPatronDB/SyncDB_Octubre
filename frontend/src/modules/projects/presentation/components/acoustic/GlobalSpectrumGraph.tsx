import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    Box,
    Stack,
    Typography,
    Chip,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Refresh,
} from '@mui/icons-material';
import {
    ISO_THIRD_OCTAVE_FREQUENCIES,
    type TargetCurveType,
    TARGET_CURVES,
} from '../../../domain/acoustic.types';

interface GlobalSpectrumGraphProps {
    currentSpectrum: number[];      // 31 bands (or fine spectrum)
    peakSpectrum: number[];         // 31 bands
    avgSpectrum: number[];          // 31 bands
    targetCurveType?: TargetCurveType;
    contributingDevicesCount: number;
    isLive: boolean;
    onResetCurves?: () => void;
    height?: number;
    showControls?: boolean;
}

const MIN_FREQ = 20;
const MAX_FREQ = 20000;
const MIN_DB = -100;
const MAX_DB = 0;

// Log frequency to X coordinate
const freqToX = (freq: number, width: number, paddingLeft: number, paddingRight: number): number => {
    const plotWidth = width - paddingLeft - paddingRight;
    const minLog = Math.log10(MIN_FREQ);
    const maxLog = Math.log10(MAX_FREQ);
    const fLog = Math.log10(Math.max(MIN_FREQ, Math.min(MAX_FREQ, freq)));
    return paddingLeft + ((fLog - minLog) / (maxLog - minLog)) * plotWidth;
};

// dB to Y coordinate
const dbToY = (db: number, height: number, paddingTop: number, paddingBottom: number): number => {
    const plotHeight = height - paddingTop - paddingBottom;
    const clampedDb = Math.max(MIN_DB, Math.min(MAX_DB, db));
    const normalized = (clampedDb - MIN_DB) / (MAX_DB - MIN_DB);
    return paddingTop + (1 - normalized) * plotHeight;
};

export const GlobalSpectrumGraph: React.FC<GlobalSpectrumGraphProps> = ({
    currentSpectrum,
    peakSpectrum,
    avgSpectrum,
    targetCurveType = 'HARMAN_HOUSE',
    contributingDevicesCount,
    isLive,
    onResetCurves,
    height = 360,
    showControls = true,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Curve visibility toggles
    const [showCurrent, setShowCurrent] = useState<boolean>(true);
    const [showPeak, setShowPeak] = useState<boolean>(true);
    const [showAvg, setShowAvg] = useState<boolean>(true);
    const [showTarget, setShowTarget] = useState<boolean>(true);

    // Hover tooltip state
    const [hoverInfo, setHoverInfo] = useState<{
        x: number;
        y: number;
        freq: number;
        curVal: number;
        peakVal: number;
        avgVal: number;
    } | null>(null);

    const targetDef = TARGET_CURVES[targetCurveType] || TARGET_CURVES.FLAT;

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.clientWidth;
        const h = height;

        canvas.width = width * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);

        const paddingLeft = 46;
        const paddingRight = 20;
        const paddingTop = 24;
        const paddingBottom = 34;
        const plotWidth = width - paddingLeft - paddingRight;
        const plotHeight = h - paddingTop - paddingBottom;

        // Clear canvas with dark background
        ctx.fillStyle = '#0a0a0b';
        ctx.fillRect(0, 0, width, h);

        // Draw Sub-Bass / Bass / Mid / High subtle zone bands
        const freqBands = [
            { f1: 20, f2: 60, name: 'SUB-BASS', color: 'rgba(255, 255, 255, 0.015)' },
            { f1: 60, f2: 250, name: 'BASS', color: 'rgba(255, 255, 255, 0.025)' },
            { f1: 250, f2: 2000, name: 'MIDRANGE', color: 'rgba(255, 255, 255, 0.015)' },
            { f1: 2000, f2: 6000, name: 'HIGH-MID', color: 'rgba(255, 255, 255, 0.025)' },
            { f1: 6000, f2: 20000, name: 'PRESENCE / AIR', color: 'rgba(255, 255, 255, 0.015)' },
        ];

        freqBands.forEach((b) => {
            const x1 = freqToX(b.f1, width, paddingLeft, paddingRight);
            const x2 = freqToX(b.f2, width, paddingLeft, paddingRight);
            ctx.fillStyle = b.color;
            ctx.fillRect(x1, paddingTop, x2 - x1, plotHeight);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.font = '9px var(--font-geistmono, monospace)';
            ctx.textAlign = 'center';
            ctx.fillText(b.name, (x1 + x2) / 2, paddingTop + 14);
        });

        // 1. Grid Lines & Axis (dB Vertical lines)
        ctx.strokeStyle = '#202225';
        ctx.lineWidth = 1;

        for (let db = MIN_DB; db <= MAX_DB; db += 10) {
            const y = dbToY(db, h, paddingTop, paddingBottom);
            ctx.beginPath();
            ctx.moveTo(paddingLeft, y);
            ctx.lineTo(width - paddingRight, y);
            ctx.stroke();

            // Label
            ctx.fillStyle = db === 0 ? '#ff6655' : '#797d86';
            ctx.font = '10px var(--font-geistmono, monospace)';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${db}`, paddingLeft - 8, y);
        }

        // 2. Frequency Grid Lines & Labels (Logarithmic)
        const guideFreqs = [20, 50, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 20000];
        guideFreqs.forEach((freq) => {
            const x = freqToX(freq, width, paddingLeft, paddingRight);
            ctx.beginPath();
            ctx.moveTo(x, paddingTop);
            ctx.lineTo(x, h - paddingBottom);
            ctx.strokeStyle = '#202225';
            ctx.stroke();

            // Frequency text
            const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
            ctx.fillStyle = '#797d86';
            ctx.font = '10px var(--font-geistmono, monospace)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(label, x, h - paddingBottom + 8);
        });

        // Hz Unit label
        ctx.fillStyle = '#50545c';
        ctx.textAlign = 'right';
        ctx.fillText('Hz', width - paddingRight, h - paddingBottom + 8);
        ctx.fillText('dBFS', paddingLeft - 8, paddingTop - 12);

        // 3. Draw Target Curve if enabled (Dashed Magenta)
        if (showTarget && targetDef) {
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = '#e879f9';
            ctx.lineWidth = 1.5;
            ctx.beginPath();

            const baseRefDb = -32;
            for (let i = 0; i < 31; i++) {
                const f = ISO_THIRD_OCTAVE_FREQUENCIES[i]!;
                const targetDb = baseRefDb + (targetDef.offsets[i] ?? 0);
                const x = freqToX(f, width, paddingLeft, paddingRight);
                const y = dbToY(targetDb, h, paddingTop, paddingBottom);

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
        }

        // 4. Draw Peak Hold Curve (Amber #fbbf24)
        if (showPeak && peakSpectrum && peakSpectrum.length === 31) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.5;
            ctx.beginPath();

            for (let i = 0; i < 31; i++) {
                const f = ISO_THIRD_OCTAVE_FREQUENCIES[i]!;
                const val = peakSpectrum[i] ?? -100;
                const x = freqToX(f, width, paddingLeft, paddingRight);
                const y = dbToY(val, h, paddingTop, paddingBottom);

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Peak dots
            ctx.fillStyle = '#fbbf24';
            for (let i = 0; i < 31; i++) {
                const f = ISO_THIRD_OCTAVE_FREQUENCIES[i]!;
                const val = peakSpectrum[i] ?? -100;
                if (val > -95) {
                    const x = freqToX(f, width, paddingLeft, paddingRight);
                    const y = dbToY(val, h, paddingTop, paddingBottom);
                    ctx.beginPath();
                    ctx.arc(x, y, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // 5. Draw Running Temporal Average Curve (Sky Blue #38bdf8)
        if (showAvg && avgSpectrum && avgSpectrum.length === 31) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.0;
            ctx.beginPath();

            for (let i = 0; i < 31; i++) {
                const f = ISO_THIRD_OCTAVE_FREQUENCIES[i]!;
                const val = avgSpectrum[i] ?? -100;
                const x = freqToX(f, width, paddingLeft, paddingRight);
                const y = dbToY(val, h, paddingTop, paddingBottom);

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // 6. Draw Current Instantaneous Spectrum (Neon Green #34d59a with area fill)
        if (showCurrent && currentSpectrum && currentSpectrum.length === 31) {
            const grad = ctx.createLinearGradient(0, paddingTop, 0, h - paddingBottom);
            grad.addColorStop(0, 'rgba(52, 213, 154, 0.35)');
            grad.addColorStop(1, 'rgba(52, 213, 154, 0.02)');

            ctx.fillStyle = grad;
            ctx.beginPath();

            const startX = freqToX(ISO_THIRD_OCTAVE_FREQUENCIES[0]!, width, paddingLeft, paddingRight);
            const bottomY = h - paddingBottom;
            ctx.moveTo(startX, bottomY);

            for (let i = 0; i < 31; i++) {
                const f = ISO_THIRD_OCTAVE_FREQUENCIES[i]!;
                const val = currentSpectrum[i] ?? -100;
                const x = freqToX(f, width, paddingLeft, paddingRight);
                const y = dbToY(val, h, paddingTop, paddingBottom);
                ctx.lineTo(x, y);
            }

            const endX = freqToX(ISO_THIRD_OCTAVE_FREQUENCIES[30]!, width, paddingLeft, paddingRight);
            ctx.lineTo(endX, bottomY);
            ctx.closePath();
            ctx.fill();

            // Outline
            ctx.strokeStyle = '#34d59a';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            for (let i = 0; i < 31; i++) {
                const f = ISO_THIRD_OCTAVE_FREQUENCIES[i]!;
                const val = currentSpectrum[i] ?? -100;
                const x = freqToX(f, width, paddingLeft, paddingRight);
                const y = dbToY(val, h, paddingTop, paddingBottom);

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // 7. Hover Guide and Crosshair
        if (hoverInfo) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(hoverInfo.x, paddingTop);
            ctx.lineTo(hoverInfo.x, h - paddingBottom);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Border around plot area
        ctx.strokeStyle = '#303236';
        ctx.lineWidth = 1;
        ctx.strokeRect(paddingLeft, paddingTop, plotWidth, plotHeight);
    }, [
        currentSpectrum,
        peakSpectrum,
        avgSpectrum,
        targetDef,
        showCurrent,
        showPeak,
        showAvg,
        showTarget,
        hoverInfo,
        height,
    ]);

    useEffect(() => {
        render();
    }, [render]);

    useEffect(() => {
        const handleResize = () => render();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [render]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const paddingLeft = 46;
        const paddingRight = 20;
        const plotWidth = rect.width - paddingLeft - paddingRight;

        if (clientX < paddingLeft || clientX > rect.width - paddingRight) {
            setHoverInfo(null);
            return;
        }

        const normalizedX = (clientX - paddingLeft) / plotWidth;
        const minLog = Math.log10(MIN_FREQ);
        const maxLog = Math.log10(MAX_FREQ);
        const targetLog = minLog + normalizedX * (maxLog - minLog);
        const mouseFreq = Math.pow(10, targetLog);

        let closestIdx = 0;
        let minDist = Infinity;
        for (let i = 0; i < 31; i++) {
            const dist = Math.abs(ISO_THIRD_OCTAVE_FREQUENCIES[i]! - mouseFreq);
            if (dist < minDist) {
                minDist = dist;
                closestIdx = i;
            }
        }

        const snappedFreq = ISO_THIRD_OCTAVE_FREQUENCIES[closestIdx]!;
        const snappedX = freqToX(snappedFreq, rect.width, paddingLeft, paddingRight);

        setHoverInfo({
            x: snappedX,
            y: e.clientY - rect.top,
            freq: snappedFreq,
            curVal: currentSpectrum[closestIdx] ?? -100,
            peakVal: peakSpectrum[closestIdx] ?? -100,
            avgVal: avgSpectrum[closestIdx] ?? -100,
        });
    };

    const handleMouseLeave = () => setHoverInfo(null);

    return (
        <Box sx={{ width: '100%', position: 'relative' }} ref={containerRef}>
            {showControls && (
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    sx={{
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        justifyContent: 'space-between',
                        mb: 1.5,
                    }}
                >
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                            <Box
                                sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    bgcolor: isLive ? '#34d59a' : '#797d86',
                                    boxShadow: isLive ? '0 0 10px #34d59a' : 'none',
                                    animation: isLive ? 'pulse-radar 1.8s infinite ease-out' : 'none',
                                }}
                            />
                            <Typography
                                variant="caption"
                                sx={{
                                    color: isLive ? '#34d59a' : '#797d86',
                                    fontFamily: 'var(--font-geistmono, monospace)',
                                    fontWeight: 700,
                                    letterSpacing: '0.5px',
                                }}
                            >
                                {isLive ? 'STREAMING EN VIVO' : 'PAUSADO'}
                            </Typography>
                        </Stack>

                        <Chip
                            label={`${contributingDevicesCount} ${contributingDevicesCount === 1 ? 'dispositivo activo' : 'dispositivos activos'}`}
                            size="small"
                            sx={{
                                bgcolor: contributingDevicesCount > 0 ? 'rgba(52, 213, 154, 0.1)' : 'rgba(121, 125, 134, 0.1)',
                                color: contributingDevicesCount > 0 ? '#34d59a' : '#797d86',
                                border: '1px solid',
                                borderColor: contributingDevicesCount > 0 ? 'rgba(52, 213, 154, 0.3)' : 'rgba(121, 125, 134, 0.2)',
                                fontFamily: 'var(--font-geistmono, monospace)',
                                fontSize: '11px',
                                fontWeight: 600,
                            }}
                        />
                    </Stack>

                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                        <Chip
                            size="small"
                            label="Actual"
                            onClick={() => setShowCurrent(!showCurrent)}
                            sx={{
                                bgcolor: showCurrent ? 'rgba(52, 213, 154, 0.15)' : 'transparent',
                                color: showCurrent ? '#34d59a' : '#797d86',
                                border: '1px solid',
                                borderColor: showCurrent ? '#34d59a' : '#303236',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '11px',
                            }}
                        />

                        <Chip
                            size="small"
                            label="Máximos (Peak Hold)"
                            onClick={() => setShowPeak(!showPeak)}
                            sx={{
                                bgcolor: showPeak ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                                color: showPeak ? '#fbbf24' : '#797d86',
                                border: '1px solid',
                                borderColor: showPeak ? '#fbbf24' : '#303236',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '11px',
                            }}
                        />

                        <Chip
                            size="small"
                            label="Media Temporal"
                            onClick={() => setShowAvg(!showAvg)}
                            sx={{
                                bgcolor: showAvg ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                                color: showAvg ? '#38bdf8' : '#797d86',
                                border: '1px solid',
                                borderColor: showAvg ? '#38bdf8' : '#303236',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '11px',
                            }}
                        />

                        <Chip
                            size="small"
                            label={`Objetivo (${targetDef.name})`}
                            onClick={() => setShowTarget(!showTarget)}
                            sx={{
                                bgcolor: showTarget ? 'rgba(232, 121, 249, 0.15)' : 'transparent',
                                color: showTarget ? '#e879f9' : '#797d86',
                                border: '1px solid',
                                borderColor: showTarget ? '#e879f9' : '#303236',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '11px',
                            }}
                        />

                        {onResetCurves && (
                            <Tooltip title="Reiniciar curva de máximos y medias">
                                <IconButton
                                    size="small"
                                    onClick={onResetCurves}
                                    sx={{ color: '#797d86', '&:hover': { color: '#ffffff' } }}
                                >
                                    <Refresh sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Stack>
            )}

            <Box
                sx={{
                    width: '100%',
                    height,
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid #303236',
                    bgcolor: '#0a0a0b',
                    position: 'relative',
                }}
            >
                <canvas
                    ref={canvasRef}
                    style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair', touchAction: 'pan-y' }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                />

                {hoverInfo && (
                    <Box
                        sx={{
                            position: 'absolute',
                            left: Math.min(hoverInfo.x + 12, (containerRef.current?.clientWidth || 300) - 160),
                            top: 14,
                            bgcolor: 'rgba(21, 22, 23, 0.95)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid #303236',
                            borderRadius: '4px',
                            p: 1.2,
                            pointerEvents: 'none',
                            zIndex: 10,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                        }}
                    >
                        <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 700, display: 'block', fontFamily: 'var(--font-geistmono, monospace)' }}>
                            {hoverInfo.freq >= 1000 ? `${(hoverInfo.freq / 1000).toFixed(1)} kHz` : `${hoverInfo.freq} Hz`}
                        </Typography>
                        <Stack spacing={0.3} sx={{ mt: 0.5 }}>
                            <Typography variant="caption" sx={{ color: '#34d59a', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                Actual: {hoverInfo.curVal > -95 ? `${hoverInfo.curVal.toFixed(1)} dBFS` : '-∞'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#fbbf24', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                Máximo: {hoverInfo.peakVal > -95 ? `${hoverInfo.peakVal.toFixed(1)} dBFS` : '-∞'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#38bdf8', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                Media: {hoverInfo.avgVal > -95 ? `${hoverInfo.avgVal.toFixed(1)} dBFS` : '-∞'}
                            </Typography>
                        </Stack>
                    </Box>
                )}
            </Box>
        </Box>
    );
};
