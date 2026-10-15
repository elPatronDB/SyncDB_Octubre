import type { PaletteOptions } from '@mui/material/styles';

/**
 * Neon Design System Palette
 * Server Room After Dark — pure black void with glowing accents.
 * Source: DESIGN.md
 */
export const palette: PaletteOptions = {
    mode: 'dark',

    primary: {
        main: '#34d59a',       // Neon Glow — key brand accent, active indicators, terminal glow
        light: '#5eead4',
        dark: '#285d49',        // Neon Muted
        contrastText: '#000000',
    },

    secondary: {
        main: '#ffffff',       // Whiteout — primary text, primary CTA button fill
        light: '#ffffff',
        dark: '#c9cbcf',       // Cloud
        contrastText: '#151617', // Graphite Deep
    },

    background: {
        default: '#000000',    // Blackout — pure page canvas
        paper: '#151617',      // Graphite Deep — card backgrounds, containers
    },

    text: {
        primary: '#ffffff',    // Whiteout — primary text
        secondary: '#797d86',  // Ash — secondary text, inactive links
        disabled: '#94979e',   // Pewter — metadata, placeholder text
    },

    divider: '#303236',        // Graphite Light — borders, subtle UI structure

    error: {
        main: '#ff3621',       // System Warning
        light: '#ff6655',
        dark: '#cc1a06',
        contrastText: '#ffffff',
    },

    warning: {
        main: '#ff3621',
        light: '#ff6655',
        dark: '#cc1a06',
        contrastText: '#ffffff',
    },

    success: {
        main: '#34d59a',       // Neon Glow
        light: '#5eead4',
        dark: '#285d49',
        contrastText: '#000000',
    },

    info: {
        main: '#39a57d',       // Scanline Fade
        light: '#5eead4',
        dark: '#285d49',
        contrastText: '#ffffff',
    },

    action: {
        hover: 'rgba(255, 255, 255, 0.05)',
        selected: 'rgba(52, 213, 154, 0.12)',
        disabledBackground: '#151617',
        disabled: '#797d86',
        active: '#34d59a',
    },
};

export const designTokens = {
    neonGlow: '#34d59a',
    neonMuted: '#285d49',
    scanlineFade: '#39a57d',
    systemWarning: '#ff3621',
    whiteout: '#ffffff',
    ash: '#797d86',
    pewter: '#94979e',
    cloud: '#c9cbcf',
    graphiteLight: '#303236',
    graphite: '#242628',
    graphiteDeep: '#151617',
    depth: '#0a0a0b',
    blackout: '#000000',

    // Shadows & Elevation
    shadowLg: 'rgba(0, 0, 0, 0.4) 0px 8px 20px 0px',
};
