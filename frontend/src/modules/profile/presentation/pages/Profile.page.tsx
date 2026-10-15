import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    CircularProgress,
    Chip,
    Avatar,
    IconButton,
    Tooltip,
    Alert,
    Snackbar,
} from '@mui/material';
import {
    PersonOutlineOutlined,
    EmailOutlined,
    SecurityOutlined,
    CheckCircle,
    CalendarMonthOutlined,
    ContentCopyOutlined,
    FingerprintOutlined,
    Check,
    LockResetOutlined,
    SpaceDashboardOutlined,
} from '@mui/icons-material';
import { useAuthStore } from '../../../../core/store/authStore';
import { getCurrentUser } from '../../../auth/infrastructure/services/auth.service';
import type { AuthUser } from '../../../auth/domain/interfaces/auth.interfaces';

interface ProfileRowProps {
    icon?: React.ReactNode;
    label: string;
    value: React.ReactNode;
    isLast?: boolean;
}

const ProfileRow: React.FC<ProfileRowProps> = ({ icon, label, value, isLast = false }) => (
    <Box
        sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            py: 1.75,
            px: { xs: 2.5, sm: 3 },
            borderBottom: isLast ? 'none' : '1px solid #303236',
            transition: 'background-color 0.15s ease',
            '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.02)',
            },
            gap: 1,
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 240 }}>
            {icon && (
                <Box sx={{ color: '#797d86', display: 'flex', alignItems: 'center', fontSize: '18px' }}>
                    {icon}
                </Box>
            )}
            <Typography
                variant="body2"
                sx={{
                    color: '#797d86',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05rem',
                    fontSize: '11px',
                    fontFamily: 'var(--font-geistmono, monospace)',
                }}
            >
                {label}
            </Typography>
        </Box>

        <Box
            sx={{
                color: '#ffffff',
                fontWeight: 400,
                fontSize: '13px',
                textAlign: { xs: 'left', sm: 'right' },
                wordBreak: 'break-word',
            }}
        >
            {value || '-'}
        </Box>
    </Box>
);

const NeonCard: React.FC<{
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}> = ({ title, subtitle, icon, children }) => (
    <Paper
        elevation={0}
        sx={{
            borderRadius: '4px',
            border: '1px solid #303236',
            bgcolor: '#151617',
            mb: 3,
            overflow: 'hidden',
        }}
    >
        <Box
            sx={{
                px: { xs: 2.5, sm: 3 },
                py: 2,
                borderBottom: '1px solid #303236',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                bgcolor: '#0a0a0b',
            }}
        >
            {icon && (
                <Box sx={{ color: '#34d59a', display: 'flex', alignItems: 'center' }}>
                    {icon}
                </Box>
            )}
            <Box>
                <Typography variant="h6" sx={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="caption" sx={{ color: '#797d86', display: 'block', fontSize: '12px' }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>
        </Box>

        <Box sx={{ p: 0 }}>
            {children}
        </Box>
    </Paper>
);

export const ProfilePage: React.FC = () => {
    const { user: cachedUser, accessToken, setUser } = useAuthStore();
    const [profile, setProfile] = useState<AuthUser | null>(cachedUser);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'error' }>({
        open: false,
        message: '',
        severity: 'info',
    });

    useEffect(() => {
        if (!accessToken) return;

        const loadProfile = async () => {
            setLoading(true);
            try {
                const freshUser = await getCurrentUser(accessToken);
                setProfile(freshUser);
                setUser(freshUser);
            } catch {
                setError('Error al actualizar la información del perfil');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [accessToken, setUser]);

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopied(true);
        setSnackbar({
            open: true,
            message: 'ID copiado al portapapeles',
            severity: 'info',
        });
        setTimeout(() => setCopied(false), 2000);
    };

    const displayUser = profile || cachedUser;

    if (loading && !displayUser) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress sx={{ color: '#34d59a' }} />
            </Box>
        );
    }

    if (!displayUser) return null;

    const initials = displayUser.name
        ? displayUser.name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
        : (displayUser.email?.charAt(0).toUpperCase() || 'U');

    const firstName = displayUser.firstName || displayUser.name?.split(' ')[0] || '';
    const lastName = displayUser.lastName || displayUser.name?.split(' ').slice(1).join(' ') || '';

    const formattedDate = displayUser.createdAt
        ? new Date(displayUser.createdAt).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : 'Activo en el sistema';

    return (
        <Box sx={{ maxWidth: 860, mx: 'auto', py: 2, px: { xs: 1, sm: 2 } }}>
            {error && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: '4px', bgcolor: '#151617', color: '#ff3621', border: '1px solid #303236' }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Header Banner */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    py: 4,
                    mb: 2,
                }}
            >
                <Avatar
                    sx={{
                        width: 80,
                        height: 80,
                        bgcolor: '#0a0a0b',
                        color: '#34d59a',
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        mb: 2,
                        border: '1px solid #34d59a',
                        boxShadow: '0 0 20px rgba(52, 213, 154, 0.25)',
                    }}
                >
                    {initials}
                </Avatar>

                <Typography variant="h3" sx={{ fontWeight: 600, fontSize: '24px', letterSpacing: '-0.64px', mb: 0.5, color: '#ffffff' }}>
                    {displayUser.name}
                </Typography>

                <Typography variant="body2" sx={{ color: '#797d86', fontSize: '13px', mb: 2 }}>
                    {displayUser.email}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Chip
                        icon={<SpaceDashboardOutlined sx={{ fontSize: 16, color: '#34d59a !important' }} />}
                        label="Consola Master"
                        size="small"
                        variant="outlined"
                        sx={{
                            fontWeight: 600,
                            fontSize: '11px',
                            borderRadius: '4px',
                            borderColor: 'rgba(52, 213, 154, 0.3)',
                            color: '#34d59a',
                            bgcolor: 'rgba(52, 213, 154, 0.08)',
                            fontFamily: 'var(--font-geistmono, monospace)',
                        }}
                    />

                    <Chip
                        icon={<CheckCircle sx={{ fontSize: 16, color: '#34d59a !important' }} />}
                        label={displayUser.isActive !== false ? 'Cuenta Activa' : 'Cuenta Inactiva'}
                        size="small"
                        variant="outlined"
                        sx={{
                            fontWeight: 500,
                            fontSize: '11px',
                            borderRadius: '4px',
                            borderColor: '#303236',
                            color: '#ffffff',
                            bgcolor: '#0a0a0b',
                            fontFamily: 'var(--font-geistmono, monospace)',
                        }}
                    />
                </Box>
            </Box>

            {/* Card 1: Información Personal */}
            <NeonCard
                title="Información personal"
                subtitle="Datos de identidad y cuenta"
                icon={<PersonOutlineOutlined />}
            >
                <ProfileRow
                    icon={<PersonOutlineOutlined />}
                    label="Nombre Completo"
                    value={displayUser.name}
                />
                {firstName && (
                    <ProfileRow
                        icon={<PersonOutlineOutlined />}
                        label="Nombres"
                        value={firstName}
                    />
                )}
                {lastName && (
                    <ProfileRow
                        icon={<PersonOutlineOutlined />}
                        label="Apellidos"
                        value={lastName}
                    />
                )}
                <ProfileRow
                    icon={<EmailOutlined />}
                    label="Correo Electrónico"
                    isLast
                    value={displayUser.email}
                />
            </NeonCard>

            {/* Card 2: Seguridad y Credenciales */}
            <NeonCard
                title="Seguridad y Credenciales"
                subtitle="Opciones de autenticación y claves de acceso"
                icon={<SecurityOutlined />}
            >
                <ProfileRow
                    icon={<CheckCircle />}
                    label="Estado de la Cuenta"
                    value={
                        <Chip
                            icon={<CheckCircle fontSize="small" sx={{ color: '#34d59a !important' }} />}
                            label={displayUser.isActive !== false ? 'Activa y Verificada' : 'Inactiva'}
                            size="small"
                            sx={{
                                bgcolor: 'rgba(52, 213, 154, 0.1)',
                                color: '#34d59a',
                                fontWeight: 600,
                                borderRadius: '4px',
                                border: '1px solid rgba(52, 213, 154, 0.3)',
                                fontFamily: 'var(--font-geistmono, monospace)',
                            }}
                        />
                    }
                />
                <ProfileRow
                    icon={<LockResetOutlined />}
                    label="Credenciales"
                    value={
                        <Typography variant="body2" sx={{ color: '#797d86', fontSize: '13px', fontFamily: 'var(--font-geistmono, monospace)' }}>
                            Protegida con hash Argon2
                        </Typography>
                    }
                />
                <ProfileRow
                    icon={<CalendarMonthOutlined />}
                    label="Miembro Desde"
                    value={formattedDate}
                />
                <ProfileRow
                    icon={<FingerprintOutlined />}
                    label="ID de Usuario"
                    isLast
                    value={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                                variant="caption"
                                sx={{
                                    fontFamily: 'var(--font-geistmono, monospace)',
                                    bgcolor: '#0a0a0b',
                                    border: '1px solid #303236',
                                    color: '#c9cbcf',
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    userSelect: 'all',
                                }}
                            >
                                {displayUser.id}
                            </Typography>
                            <Tooltip title={copied ? '¡Copiado!' : 'Copiar ID'}>
                                <IconButton size="small" onClick={() => handleCopyId(displayUser.id)} sx={{ color: '#797d86', '&:hover': { color: '#34d59a' } }}>
                                    {copied ? (
                                        <Check fontSize="small" sx={{ color: '#34d59a' }} />
                                    ) : (
                                        <ContentCopyOutlined fontSize="small" />
                                    )}
                                </IconButton>
                            </Tooltip>
                        </Box>
                    }
                />
            </NeonCard>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    sx={{ width: '100%', borderRadius: '4px', bgcolor: '#151617', color: '#ffffff', border: '1px solid #303236' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ProfilePage;
