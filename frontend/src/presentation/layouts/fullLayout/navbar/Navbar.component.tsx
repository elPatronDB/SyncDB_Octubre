import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Avatar,
    Box,
    Tooltip,
    Menu,
    MenuItem,
    ListItemIcon,
    Divider,
} from '@mui/material';
import {
    MenuOutlined,
    MenuOpenOutlined,
    PersonOutlined,
    LogoutOutlined,
} from '@mui/icons-material';
import { useAuthStore } from '../../../../core/store/authStore';
import { useSidebar, SIDEBAR_EXPANDED_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '../sidebar/SidebarContext';
import { api } from '../../../../core/api/axios.instance';

export const Navbar: React.FC = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const { user, clearAuth } = useAuthStore();
    const { toggleSidebar, isCollapsed } = useSidebar();
    const navigate = useNavigate();
    const location = useLocation();

    const currentSidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleNavigateProfile = () => {
        handleCloseMenu();
        navigate('/profile');
    };

    const handleLogout = async () => {
        handleCloseMenu();
        try {
            await api.post('/auth/logout');
        } catch (err) {
            console.error('Logout error on server:', err);
        } finally {
            clearAuth();
            navigate('/auth/login', { state: { from: location } });
        }
    };

    const initials = user?.name
        ? user.name
            .split(' ')
            .slice(0, 2)
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
        : 'U';

    return (
        <AppBar
            position="fixed"
            elevation={0}
            sx={{
                width: { md: `calc(100% - ${currentSidebarWidth}px)` },
                ml: { md: `${currentSidebarWidth}px` },
                transition: 'width 0.25s ease, margin-left 0.25s ease',
                backgroundColor: '#0a0a0b',
                borderBottom: '1px solid #303236',
                color: '#ffffff',
            }}
        >
            <Toolbar sx={{ minHeight: 64, px: { xs: 2, sm: 3 } }}>
                {/* Toggle Button */}
                <Tooltip title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} arrow>
                    <IconButton
                        id="navbar-toggle-sidebar"
                        aria-label="Toggle navigation sidebar"
                        edge="start"
                        onClick={toggleSidebar}
                        sx={{
                            color: '#797d86',
                            mr: 1.5,
                            borderRadius: '4px',
                            border: '1px solid #303236',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                color: '#ffffff',
                                borderColor: '#34d59a',
                            },
                        }}
                    >
                        {isCollapsed ? <MenuOpenOutlined /> : <MenuOutlined />}
                    </IconButton>
                </Tooltip>

                {/* App Brand / Context Title */}
                <Typography
                    variant="h6"
                    noWrap
                    component="div"
                    sx={{
                        flexGrow: 1,
                        fontWeight: 600,
                        color: '#ffffff',
                        fontSize: '1rem',
                        letterSpacing: '-0.3px',
                    }}
                >
                    Master Console
                </Typography>

                {/* User Profile Avatar & Menu */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#ffffff', lineHeight: 1.2 }}>
                            {user?.name ?? 'User'}
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{
                                color: '#34d59a',
                                fontSize: '11px',
                                fontFamily: 'var(--font-geistmono, monospace)',
                            }}
                        >
                            ONLINE
                        </Typography>
                    </Box>

                    <Tooltip title="Account menu" arrow>
                        <IconButton
                            id="navbar-user-menu-button"
                            onClick={handleOpenMenu}
                            size="small"
                            sx={{ p: 0.25 }}
                            aria-controls={anchorEl ? 'user-account-menu' : undefined}
                            aria-haspopup="true"
                            aria-expanded={anchorEl ? 'true' : undefined}
                        >
                            <Avatar
                                sx={{
                                    width: 36,
                                    height: 36,
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    backgroundColor: '#34d59a',
                                    color: '#000000',
                                    border: '1px solid rgba(52, 213, 154, 0.6)',
                                    boxShadow: '0 0 10px rgba(52, 213, 154, 0.3)',
                                }}
                            >
                                {initials}
                            </Avatar>
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Dropdown Menu */}
                <Menu
                    id="user-account-menu"
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleCloseMenu}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    slotProps={{
                        paper: {
                            sx: {
                                minWidth: 220,
                                mt: 1,
                                borderRadius: '4px',
                                border: '1px solid #303236',
                                backgroundColor: '#151617',
                                boxShadow: 'rgba(0, 0, 0, 0.5) 0px 8px 24px 0px',
                            },
                        },
                    }}
                >
                    <Box sx={{ px: 2, py: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                            {user?.name ?? 'User'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#797d86', display: 'block', fontSize: '11px' }}>
                            {user?.email ?? ''}
                        </Typography>
                    </Box>

                    <Divider sx={{ borderColor: '#303236' }} />

                    <MenuItem
                        id="navbar-menu-profile"
                        onClick={handleNavigateProfile}
                        sx={{
                            py: 1,
                            gap: 1.5,
                            '&:hover': {
                                backgroundColor: 'rgba(52, 213, 154, 0.08)',
                            },
                        }}
                    >
                        <ListItemIcon sx={{ color: '#797d86', minWidth: 0 }}>
                            <PersonOutlined fontSize="small" />
                        </ListItemIcon>
                        <Typography variant="body2" sx={{ color: '#ffffff', fontSize: '13px' }}>
                            My Profile
                        </Typography>
                    </MenuItem>

                    <Divider sx={{ borderColor: '#303236' }} />

                    <MenuItem
                        id="navbar-menu-logout"
                        onClick={handleLogout}
                        sx={{
                            py: 1,
                            gap: 1.5,
                            '&:hover': {
                                backgroundColor: 'rgba(255, 54, 33, 0.1)',
                            },
                        }}
                    >
                        <ListItemIcon sx={{ color: '#ff3621', minWidth: 0 }}>
                            <LogoutOutlined fontSize="small" />
                        </ListItemIcon>
                        <Typography variant="body2" sx={{ color: '#ff3621', fontWeight: 500, fontSize: '13px' }}>
                            Sign out
                        </Typography>
                    </MenuItem>
                </Menu>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;
