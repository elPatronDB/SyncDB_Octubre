import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    Box,
    Stack,
    Typography,
    IconButton,
    Tooltip,
    Button,
    Select,
    MenuItem,
} from '@mui/material';
import {
    PlayArrow,
    Pause,
    DeleteOutlined,
} from '@mui/icons-material';

interface SpectrogramWaterfallProps {
    spectrum: number[]; // 31 bands or 64 bins from recent frame
    isLive: boolean;
    height?: number;
    title?: string;
}

// Thermo-acoustic color palette mapping (-100 dBFS to 0 dBFS)
const dbToColor = (db: number): [number, number, number] => {
    const val = Math.max(-100, Math.min(0, db));
    const norm = (val + 100) / 100; // 0 to 1

    if (norm < 0.15) {
        const t = norm / 0.15;
        return [Math.round(10 + 20 * t), Math.round(10 + 25 * t), Math.round(15 + 70 * t)];
    } else if (norm < 0.35) {
        const t = (norm - 0.15) / 0.20;
        return [Math.round(30 + 10 * t), Math.round(35 + 130 * t), Math.round(85 + 140 * t)];
    } else if (norm < 0.55) {
        const t = (norm - 0.35) / 0.20;
        return [Math.round(40 + 12 * t), Math.round(165 + 48 * t), Math.round(225 - 71 * t)];
    } else if (norm < 0.75) {
        const t = (norm - 0.55) / 0.20;
        return [Math.round(52 + 199 * t), Math.round(213 - 22 * t), Math.round(154 - 118 * t)];
    } else if (norm < 0.90) {
        const t = (norm - 0.75) / 0.15;
        return [Math.round(251 - 12 * t), Math.round(191 - 123 * t), Math.round(36 + 32 * t)];
    } else {
        const t = (norm - 0.90) / 0.10;
        return [Math.round(239 + 16 * t), Math.round(68 + 187 * t), Math.round(68 + 187 * t)];
    }
};

export const SpectrogramWaterfall: React.FC<SpectrogramWaterfallProps> = ({
    spectrum,
    isLive,
    height = 240,
    title = 'Espectrograma Temporal Acústico (Evolución de Frecuencia vs Tiempo)',
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [historyDuration, setHistoryDuration] = useState<number>(30); // 30 seconds

    const historyColumnsRef = useRef<number[][]>([]);
    const lastPushedTimeRef = useRef<number>(0);

    const clearHistory = () => {
        historyColumnsRef.current = [];
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    useEffect(() => {
        if (!isLive || isPaused || !spectrum || spectrum.length === 0) return;

        const now = Date.now();
        if (now - lastPushedTimeRef.current < 65) return;
        lastPushedTimeRef.current = now;

        const history = historyColumnsRef.current;
        history.push([...spectrum]);

        if (history.length > 350) {
            history.shift();
        }
    }, [spectrum, isLive, isPaused]);

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
        const paddingRight = 44;
        const paddingTop = 16;
        const paddingBottom = 26;
        const plotWidth = width - paddingLeft - paddingRight;
        const plotHeight = h - paddingTop - paddingBottom;

        ctx.fillStyle = '#0a0a0b';
        ctx.fillRect(0, 0, width, h);

        const history = historyColumnsRef.current;
        const numCols = history.length;
        const colWidth = Math.max(1, plotWidth / (historyDuration * 10));

        if (numCols > 0) {
            const startX = paddingLeft + Math.max(0, plotWidth - numCols * colWidth);

            for (let c = 0; c < numCols; c++) {
                const colData = history[c]!;
                const colX = startX + c * colWidth;

                if (colX < paddingLeft || colX > width - paddingRight) continue;

                const numBands = colData.length;
                const bandHeight = plotHeight / numBands;

                for (let b = 0; b < numBands; b++) {
                    const dbVal = colData[b] ?? -100;
                    const [r, g, bCol] = dbToColor(dbVal);
                    ctx.fillStyle = `rgb(${r},${g},${bCol})`;

                    const bandY = paddingTop + plotHeight - (b + 1) * bandHeight;
                    ctx.fillRect(colX, bandY, Math.ceil(colWidth), Math.ceil(bandHeight));
                }
            }
        }

        const guideFreqs = [
            { f: 20, label: '20 Hz', yRatio: 0.0 },
            { f: 100, label: '100 Hz', yRatio: 0.23 },
            { f: 500, label: '500 Hz', yRatio: 0.46 },
            { f: 2000, label: '2 kHz', yRatio: 0.69 },
            { f: 10000, label: '10 kHz', yRatio: 0.90 },
            { f: 20000, label: '20 kHz', yRatio: 1.0 },
        ];

        guideFreqs.forEach((g) => {
            const y = paddingTop + plotHeight - g.yRatio * plotHeight;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(paddingLeft, y);
            ctx.lineTo(width - paddingRight, y);
            ctx.stroke();

            ctx.fillStyle = '#797d86';
            ctx.font = '9px var(--font-geistmono, monospace)';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(g.label, paddingLeft - 6, y);
        });

        ctx.fillStyle = '#797d86';
        ctx.font = '9px var(--font-geistmono, monospace)';
        ctx.textAlign = 'left';
        ctx.fillText(`-${historyDuration}s`, paddingLeft, h - 8);
        ctx.textAlign = 'center';
        ctx.fillText(`-${Math.round(historyDuration / 2)}s`, paddingLeft + plotWidth / 2, h - 8);
        ctx.textAlign = 'right';
        ctx.fillText('Ahora (0s)', width - paddingRight, h - 8);

        const colorBarX = width - paddingRight + 12;
        const colorBarWidth = 10;
        const colorBarHeight = plotHeight;

        for (let y = 0; y < colorBarHeight; y++) {
            const norm = 1 - y / colorBarHeight;
            const dbVal = -100 + norm * 100;
            const [r, g, bCol] = dbToColor(dbVal);
            ctx.fillStyle = `rgb(${r},${g},${bCol})`;
            ctx.fillRect(colorBarX, paddingTop + y, colorBarWidth, 1);
        }

        ctx.strokeStyle = '#303236';
        ctx.strokeRect(colorBarX, paddingTop, colorBarWidth, colorBarHeight);

        ctx.fillStyle = '#797d86';
        ctx.font = '8px var(--font-geistmono, monospace)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('0 dB', colorBarX + colorBarWidth + 4, paddingTop + 2);
        ctx.fillText('-50', colorBarX + colorBarWidth + 4, paddingTop + colorBarHeight / 2);
        ctx.fillText('-100', colorBarX + colorBarWidth + 4, paddingTop + colorBarHeight - 2);

        ctx.strokeStyle = '#303236';
        ctx.lineWidth = 1;
        ctx.strokeRect(paddingLeft, paddingTop, plotWidth, plotHeight);
    }, [height, historyDuration]);

    useEffect(() => {
        let animId: number;
        const tick = () => {
            render();
            animId = requestAnimationFrame(tick);
        };
        animId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animId);
    }, [render]);

    return (
        <Box sx={{ width: '100%' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 600, letterSpacing: '-0.2px' }}>
                    {title}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Select
                        size="small"
                        value={historyDuration}
                        onChange={(e) => setHistoryDuration(Number(e.target.value))}
                        sx={{
                            fontSize: '11px',
                            height: 24,
                            color: '#c9cbcf',
                            bgcolor: '#151617',
                            borderColor: '#303236',
                            '& .MuiSelect-select': { py: 0.2, px: 1 },
                        }}
                    >
                        <MenuItem value={15}>Ventana 15s</MenuItem>
                        <MenuItem value={30}>Ventana 30s</MenuItem>
                        <MenuItem value={60}>Ventana 60s</MenuItem>
                    </Select>

                    <Tooltip title={isPaused ? 'Reanudar espectrograma' : 'Pausar espectrograma'}>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setIsPaused(!isPaused)}
                            startIcon={isPaused ? <PlayArrow sx={{ fontSize: 14 }} /> : <Pause sx={{ fontSize: 14 }} />}
                            sx={{
                                py: 0.2,
                                px: 1,
                                fontSize: '11px',
                                minHeight: 24,
                                borderColor: isPaused ? '#fbbf24' : '#303236',
                                color: isPaused ? '#fbbf24' : '#ffffff',
                            }}
                        >
                            {isPaused ? 'Reanudar' : 'Pausar'}
                        </Button>
                    </Tooltip>

                    <Tooltip title="Limpiar historial">
                        <IconButton size="small" onClick={clearHistory} sx={{ color: '#797d86', p: 0.4 }}>
                            <DeleteOutlined sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            <Box
                sx={{
                    width: '100%',
                    height,
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid #303236',
                    bgcolor: '#0a0a0b',
                }}
            >
                <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', touchAction: 'pan-y' }} />
            </Box>
        </Box>
    );
};
