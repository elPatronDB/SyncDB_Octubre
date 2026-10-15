import { useState } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    InputAdornment,
    IconButton,
    Alert,
    CircularProgress,
    Stack,
    Divider,
} from '@mui/material';
import { Visibility, VisibilityOff, TerminalOutlined } from '@mui/icons-material';
import { loginSchema, type LoginFormValues } from '../../domain/schemas/auth.schemas';
import { loginUser } from '../../infrastructure/services/auth.service';
import { useAuthStore } from '../../../../core/store/authStore';

const LoginPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const { setAuth } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
        setServerError(null);
        try {
            const response = await loginUser(values);
            setAuth(response.accessToken, response.user);
            navigate(from, { replace: true });
        } catch {
            setServerError('Credenciales inválidas. Por favor intenta de nuevo.');
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#000000', // Blackout
                p: 2,
            }}
        >
            <Box sx={{ width: '100%', maxWidth: 420 }}>
                {/* Brand header */}
                <Stack sx={{ alignItems: 'center', mb: 4, gap: 1.5 }}>
                    {/* Glowing Logo Icon */}
                    <Box
                        sx={{
                            width: 56,
                            height: 56,
                            borderRadius: '4px',
                            backgroundColor: '#0a0a0b',
                            border: '1px solid #34d59a',
                            boxShadow: '0 0 24px rgba(52, 213, 154, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#34d59a',
                            mb: 1,
                        }}
                    >
                        <TerminalOutlined sx={{ fontSize: 30 }} />
                    </Box>

                    <Typography
                        variant="h3"
                        sx={{
                            fontSize: '1.75rem',
                            fontWeight: 600,
                            color: '#ffffff',
                            textAlign: 'center',
                            letterSpacing: '-0.64px',
                        }}
                    >
                        SyncDB Console
                    </Typography>

                    <Typography
                        variant="body2"
                        sx={{
                            color: '#797d86',
                            textAlign: 'center',
                            fontSize: '13px',
                            letterSpacing: '-0.3px',
                        }}
                    >
                        Inicia sesión en tu espacio de trabajo acústico
                    </Typography>
                </Stack>

                {/* Card — Neon style: 4px radius, graphite deep, 1px graphite light border */}
                <Card
                    sx={{
                        borderRadius: '4px',
                        border: '1px solid #303236',
                        backgroundColor: '#151617',
                        boxShadow: 'rgba(0, 0, 0, 0.5) 0px 8px 24px 0px',
                    }}
                >
                    <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                        {/* Server error */}
                        {serverError && (
                            <Alert
                                severity="error"
                                sx={{
                                    mb: 3,
                                    borderRadius: '4px',
                                    backgroundColor: '#0a0a0b',
                                    border: '1px solid #ff3621',
                                    color: '#ff3621',
                                }}
                                onClose={() => setServerError(null)}
                            >
                                {serverError}
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} noValidate>
                            <Stack sx={{ gap: 2.5 }}>
                                {/* Email */}
                                <Controller
                                    name="email"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            id="login-email"
                                            label="Correo Electrónico"
                                            type="email"
                                            autoComplete="email"
                                            autoFocus
                                            fullWidth
                                            error={!!errors.email}
                                            helperText={errors.email?.message}
                                        />
                                    )}
                                />

                                {/* Password */}
                                <Controller
                                    name="password"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            id="login-password"
                                            label="Contraseña"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            fullWidth
                                            error={!!errors.password}
                                            helperText={errors.password?.message}
                                            slotProps={{
                                                input: {
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton
                                                                id="toggle-password-visibility"
                                                                aria-label="Toggle password visibility"
                                                                onClick={() => setShowPassword((v) => !v)}
                                                                edge="end"
                                                                size="small"
                                                                sx={{ color: '#797d86' }}
                                                            >
                                                                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                },
                                            }}
                                        />
                                    )}
                                />



                                {/* Submit — Primary Whiteout Pill Button per DESIGN.md */}
                                <Button
                                    id="login-submit"
                                    type="submit"
                                    variant="contained"
                                    color="secondary"
                                    size="large"
                                    fullWidth
                                    disabled={isSubmitting}
                                    sx={{
                                        mt: 1,
                                        py: 1.4,
                                        borderRadius: '9999px',
                                        backgroundColor: '#ffffff',
                                        color: '#151617',
                                        fontWeight: 600,
                                        '&:hover': {
                                            backgroundColor: '#c9cbcf',
                                        },
                                    }}
                                >
                                    {isSubmitting ? (
                                        <CircularProgress size={20} thickness={3} sx={{ color: '#151617' }} />
                                    ) : (
                                        'Iniciar Sesión'
                                    )}
                                </Button>
                            </Stack>
                        </form>

                        {/* Divider */}
                        <Box sx={{ my: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Divider sx={{ flex: 1, borderColor: '#303236' }} />
                            <Typography variant="caption" sx={{ color: '#797d86', fontSize: '11px', fontFamily: 'var(--font-geistmono, monospace)' }}>
                                ACCESO SEGURO
                            </Typography>
                            <Divider sx={{ flex: 1, borderColor: '#303236' }} />
                        </Box>

                        {/* Footnote */}
                        <Typography
                            variant="caption"
                            sx={{
                                display: 'block',
                                textAlign: 'center',
                                color: '#797d86',
                                fontSize: '11px',
                                fontFamily: 'var(--font-geistmono, monospace)',
                            }}
                        >
                            SyncDB Audio Calibration Engine
                        </Typography>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default LoginPage;
