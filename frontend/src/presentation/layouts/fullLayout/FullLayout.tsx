import React from 'react';
import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Navbar from './navbar/Navbar.component';
import Sidebar from './sidebar/Sidebar.component';
import {
    SidebarProvider,
    useSidebar,
    SIDEBAR_EXPANDED_WIDTH,
    SIDEBAR_COLLAPSED_WIDTH,
} from './sidebar/SidebarContext';

const FullLayoutInner: React.FC = () => {
    const { isCollapsed } = useSidebar();
    const currentSidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000000' }}>
            {/* Top Navigation */}
            <Navbar />

            {/* Left Navigation (Desktop Mini/Expanded & Mobile Drawer) */}
            <Sidebar />

            {/* Main Content Area */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    width: { xs: '100%', md: `calc(100% - ${currentSidebarWidth}px)` },
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'width 0.25s ease',
                    minHeight: '100vh',
                    backgroundColor: '#000000',
                }}
            >
                {/* Spacer pushes content below fixed AppBar */}
                <Toolbar sx={{ minHeight: 64 }} />

                <Box
                    sx={{
                        flex: 1,
                        p: { xs: 2, sm: 3, md: 4 },
                        maxWidth: '1400px',
                        width: '100%',
                        mx: 'auto',
                    }}
                >
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
};

export const FullLayout: React.FC = () => {
    return (
        <SidebarProvider>
            <FullLayoutInner />
        </SidebarProvider>
    );
};

export default FullLayout;
