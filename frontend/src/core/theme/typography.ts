import type { TypographyVariantsOptions } from '@mui/material/styles';

/**
 * Typography Tokens — Neon DESIGN.md
 *
 * Font: Inter (primary) & GeistMono (code/labels)
 * Strict negative tracking on headings per DESIGN.md
 */
export const typography: TypographyVariantsOptions = {
    fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",

    h1: {
        fontSize: '3rem',           // 48px (heading-lg)
        fontWeight: 500,
        lineHeight: 1.13,
        letterSpacing: '-1.2px',
    },
    h2: {
        fontSize: '2rem',            // 32px (heading)
        fontWeight: 500,
        lineHeight: 1.25,
        letterSpacing: '-0.64px',
    },
    h3: {
        fontSize: '1.5rem',          // 24px (heading-sm)
        fontWeight: 500,
        lineHeight: 1.25,
        letterSpacing: '-0.24px',
    },
    h4: {
        fontSize: '1.125rem',        // 18px (subheading)
        fontWeight: 500,
        lineHeight: 1.38,
        letterSpacing: '-0.36px',
    },
    h5: {
        fontSize: '1rem',            // 16px
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: '-0.43px',
    },
    h6: {
        fontSize: '0.875rem',        // 14px
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: '-0.7px',
    },
    subtitle1: {
        fontSize: '1rem',            // 16px
        fontWeight: 500,
        lineHeight: 1.5,
        letterSpacing: '-0.43px',
    },
    subtitle2: {
        fontSize: '0.875rem',        // 14px
        fontWeight: 500,
        lineHeight: 1.5,
        letterSpacing: '-0.7px',
    },
    body1: {
        fontSize: '1rem',            // 16px (body)
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: '-0.43px',
    },
    body2: {
        fontSize: '0.875rem',        // 14px (body-sm)
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: '-0.7px',
    },
    caption: {
        fontSize: '0.75rem',         // 12px (caption)
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: '-0.7px',
    },
    button: {
        fontSize: '0.875rem',        // 14px
        fontWeight: 500,
        lineHeight: 1.5,
        letterSpacing: '-0.2px',
        textTransform: 'none',
    },
};
