import { createTheme } from '@mui/material/styles';
import { palette, designTokens } from './palette';
import { typography } from './typography';

const {
    neonGlow,
    whiteout,
    graphiteLight,
    graphiteDeep,
    depth,
    blackout,
    shadowLg,
} = designTokens;

/**
 * MUI Theme — Neon DESIGN.md
 * Server Room After Dark. A deep black environment where data and interactions are the only sources of light.
 *
 * Rules enforced:
 * - Pure Blackout (#000000) for all page backgrounds
 * - Layered near-black surfaces: Graphite Deep (#151617) & Depth (#0a0a0b)
 * - Strict dichotomy of shapes: 9999px radius for buttons, 4px for all other containers/inputs
 * - Vibrant Neon Glow (#34d59a) for active indicators, focus, data highlights
 * - Whiteout (#ffffff) pill buttons for primary calls to action
 * - Inter font with negative letter tracking on headings
 */
export const theme = createTheme({
    palette,
    typography,

    spacing: 4, // Base unit: 4px per DESIGN.md

    shape: {
        borderRadius: 4, // Cards, inputs, containers: 4px
    },

    shadows: [
        'none',
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
        shadowLg,
    ],

    components: {
        // ── Global baseline ──────────────────────────────────────────────────
        MuiCssBaseline: {
            styleOverrides: {
                '*': {
                    boxSizing: 'border-box',
                    margin: 0,
                    padding: 0,
                },
                html: {
                    MozOsxFontSmoothing: 'grayscale',
                    WebkitFontSmoothing: 'antialiased',
                    textRendering: 'optimizeLegibility',
                    scrollBehavior: 'smooth',
                    backgroundColor: blackout,
                },
                body: {
                    backgroundColor: blackout,
                    color: whiteout,
                    scrollbarWidth: 'thin',
                    scrollbarColor: `${graphiteLight} ${blackout}`,
                },
                '::-webkit-scrollbar': { width: '6px', height: '6px' },
                '::-webkit-scrollbar-track': { background: blackout },
                '::-webkit-scrollbar-thumb': { background: graphiteLight, borderRadius: '2px' },
                '::-webkit-scrollbar-thumb:hover': { background: neonGlow },
            },
        },

        // ── Buttons: 9999px Pill Radius per DESIGN.md ───────────────────────
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {
                    borderRadius: 9999,      // Strict pill shape from DESIGN.md
                    fontSize: '0.875rem',    // 14px
                    fontWeight: 500,
                    textTransform: 'none',
                    letterSpacing: '-0.2px',
                    padding: '8px 24px',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                },
                contained: ({ ownerState }) => ({
                    ...(ownerState.color === 'primary' && {
                        backgroundColor: neonGlow,
                        color: '#000000',
                        fontWeight: 600,
                        '&:hover': {
                            backgroundColor: '#4ade80',
                            boxShadow: '0 0 20px rgba(52, 213, 154, 0.4)',
                        },
                    }),
                    ...(ownerState.color === 'secondary' && {
                        backgroundColor: whiteout,
                        color: graphiteDeep,
                        fontWeight: 600,
                        '&:hover': {
                            backgroundColor: '#c9cbcf',
                        },
                    }),
                }),
                outlined: {
                    backgroundColor: 'transparent',
                    color: whiteout,
                    border: `1px solid ${graphiteLight}`,
                    '&:hover': {
                        borderColor: neonGlow,
                        backgroundColor: 'rgba(52, 213, 154, 0.08)',
                        boxShadow: '0 0 12px rgba(52, 213, 154, 0.2)',
                    },
                },
                text: {
                    color: '#c9cbcf',
                    '&:hover': {
                        color: whiteout,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    },
                },
            },
        },

        // ── Cards & Paper: 4px Radius & Layered Graphite Deep ────────────────
        MuiPaper: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: {
                    backgroundColor: graphiteDeep,
                    border: `1px solid ${graphiteLight}`,
                    borderRadius: 4,
                    backgroundImage: 'none',
                },
            },
        },

        MuiCard: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: {
                    backgroundColor: graphiteDeep,
                    border: `1px solid ${graphiteLight}`,
                    borderRadius: 4,
                    backgroundImage: 'none',
                },
            },
        },

        // ── Input Fields: 4px Radius & Depth Background ─────────────────────
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 4,
                    backgroundColor: depth,
                    color: whiteout,
                    fontSize: '0.875rem',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: graphiteLight,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#797d86',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: neonGlow,
                        borderWidth: '1px',
                    },
                    '&.Mui-focused': {
                        boxShadow: '0 0 0 1px rgba(52, 213, 154, 0.35)',
                    },
                },
                input: {
                    padding: '10px 14px',
                    '&::placeholder': {
                        color: '#797d86',
                        opacity: 1,
                    },
                },
            },
        },

        MuiInputLabel: {
            styleOverrides: {
                root: {
                    color: '#797d86',
                    fontSize: '0.875rem',
                    '&.Mui-focused': {
                        color: neonGlow,
                    },
                },
            },
        },

        // ── Chips & Badges: 4px Radius ──────────────────────────────────────
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 4,
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    letterSpacing: '-0.2px',
                },
                outlined: {
                    borderColor: graphiteLight,
                    color: whiteout,
                    backgroundColor: depth,
                },
            },
        },

        // ── Divider ──────────────────────────────────────────────────────────
        MuiDivider: {
            styleOverrides: {
                root: {
                    borderColor: graphiteLight,
                },
            },
        },

        // ── Dialogs ──────────────────────────────────────────────────────────
        MuiDialog: {
            styleOverrides: {
                paper: {
                    backgroundColor: graphiteDeep,
                    border: `1px solid ${graphiteLight}`,
                    borderRadius: 4,
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
                },
            },
        },

        // ── Alerts ───────────────────────────────────────────────────────────
        MuiAlert: {
            styleOverrides: {
                root: {
                    borderRadius: 4,
                    border: `1px solid ${graphiteLight}`,
                    backgroundColor: depth,
                },
            },
        },
    },
});

export default theme;
