import React from 'react';
import {
    Box,
    Drawer,
    List,
    Typography,
    Stack,
    Divider,
} from '@mui/material';
import MenuItems from './menuItems';
import SidebarItem from './SidebarItem';
import {
    useSidebar,
    SIDEBAR_EXPANDED_WIDTH,
    SIDEBAR_COLLAPSED_WIDTH,
} from './SidebarContext';

const SidebarContent: React.FC = () => {
    const { isCollapsed } = useSidebar();

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                backgroundColor: '#0a0a0b',
                borderRight: '1px solid #303236',
                overflowX: 'hidden',
            }}
        >
            {/* Header with Logo */}
            <Stack
                direction="row"
                sx={{
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    gap: 1.5,
                    px: isCollapsed ? 1 : 2.5,
                    minHeight: 64,
                    borderBottom: '1px solid #303236',
                }}
            >
                {/* Logo Mark with Neon Glow ring */}
                <Box
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '4px',
                        backgroundColor: '#151617',
                        border: '1px solid #34d59a',
                        boxShadow: '0 0 10px rgba(52, 213, 154, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#34d59a',
                        fontWeight: 700,
                        fontSize: '14px',
                        fontFamily: 'var(--font-geistmono, monospace)',
                    }}
                >
                    S
                </Box>

                {!isCollapsed && (
                    <Box>
                        <Typography
                            variant="h6"
                            noWrap
                            sx={{
                                fontWeight: 600,
                                color: '#ffffff',
                                fontSize: '1rem',
                                letterSpacing: '-0.3px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            SyncDB
                            <Box
                                component="span"
                                sx={{
                                    fontSize: '9px',
                                    bgcolor: 'rgba(52, 213, 154, 0.12)',
                                    color: '#34d59a',
                                    border: '1px solid rgba(52, 213, 154, 0.3)',
                                    px: 0.75,
                                    py: 0.15,
                                    borderRadius: '4px',
                                    fontWeight: 600,
                                    fontFamily: 'var(--font-geistmono, monospace)',
                                }}
                            >
                                MASTER
                            </Box>
                        </Typography>
                    </Box>
                )}
            </Stack>

            {/* Navigation items list */}
            <List sx={{ flex: 1, py: 1.5, px: 0, overflowY: 'auto' }}>
                {MenuItems.map((item, index) => (
                    <SidebarItem key={item.name || item.group || index} item={item} />
                ))}
            </List>

            <Divider sx={{ borderColor: '#303236' }} />

            {/* Footer version */}
            <Box
                sx={{
                    px: isCollapsed ? 1 : 2.5,
                    py: 1.5,
                    textAlign: isCollapsed ? 'center' : 'left',
                }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        color: '#797d86',
                        fontSize: '11px',
                        fontFamily: 'var(--font-geistmono, monospace)',
                    }}
                >
                    {isCollapsed ? 'v2' : 'SyncDB Console v2.0'}
                </Typography>
            </Box>
        </Box>
    );
};

export const Sidebar: React.FC = () => {
    const { isMobileOpen, closeMobileSidebar, isCollapsed } = useSidebar();

    const currentWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

    return (
        <Box
            component="nav"
            sx={{
                width: { md: currentWidth },
                flexShrink: { md: 0 },
                transition: 'width 0.25s ease',
            }}
        >
            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                open={isMobileOpen}
                onClose={closeMobileSidebar}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        width: SIDEBAR_EXPANDED_WIDTH,
                        boxSizing: 'border-box',
                        backgroundColor: '#0a0a0b',
                        borderRight: '1px solid #303236',
                    },
                }}
            >
                <SidebarContent />
            </Drawer>

            {/* Desktop Permanent Drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': {
                        width: currentWidth,
                        boxSizing: 'border-box',
                        transition: 'width 0.25s ease',
                        overflowX: 'hidden',
                        backgroundColor: '#0a0a0b',
                        borderRight: '1px solid #303236',
                    },
                }}
                open
            >
                <SidebarContent />
            </Drawer>
        </Box>
    );
};

export default Sidebar;
