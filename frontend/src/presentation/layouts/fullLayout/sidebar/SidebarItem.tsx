import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Tooltip,
    Collapse,
    List,
    Box,
    Divider,
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import type { MenuItem } from './menuItems';
import { useSidebar } from './SidebarContext';

interface SidebarItemProps {
    item: MenuItem;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ item }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isCollapsed, closeMobileSidebar } = useSidebar();
    const [openSubmenu, setOpenSubmenu] = useState(false);

    // 1. Group Header
    if (item.group) {
        if (isCollapsed) {
            return <Divider sx={{ my: 1, borderColor: '#303236' }} />;
        }
        return (
            <Box sx={{ px: 3, pt: 2.5, pb: 0.5 }}>
                <Typography
                    variant="caption"
                    sx={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#797d86',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08rem',
                        fontFamily: 'var(--font-geistmono, monospace)',
                    }}
                >
                    {item.group}
                </Typography>
            </Box>
        );
    }

    const IconComponent = item.icon;
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const isActive = item.link
        ? item.link === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.link)
        : false;

    const handleClick = () => {
        if (hasChildren) {
            setOpenSubmenu(!openSubmenu);
        } else if (item.link) {
            navigate(item.link);
            closeMobileSidebar();
        }
    };

    const buttonContent = (
        <ListItemButton
            selected={isActive}
            onClick={handleClick}
            sx={{
                minHeight: 40,
                px: isCollapsed ? 1.5 : 2,
                py: 0.85,
                mx: isCollapsed ? 1 : 1.5,
                my: 0.35,
                borderRadius: '4px',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                backgroundColor: isActive ? 'rgba(52, 213, 154, 0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(52, 213, 154, 0.3)' : '1px solid transparent',
                transition: 'all 0.15s ease',
                '&:hover': {
                    backgroundColor: isActive ? 'rgba(52, 213, 154, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: isActive ? '#34d59a' : '#303236',
                },
                '&.Mui-selected': {
                    backgroundColor: 'rgba(52, 213, 154, 0.12)',
                    '&:hover': {
                        backgroundColor: 'rgba(52, 213, 154, 0.18)',
                    },
                },
            }}
        >
            {IconComponent && (
                <ListItemIcon
                    sx={{
                        minWidth: 0,
                        mr: isCollapsed ? 0 : 1.5,
                        justifyContent: 'center',
                        color: isActive ? '#34d59a' : '#797d86',
                        transition: 'color 0.15s ease',
                    }}
                >
                    <IconComponent sx={{ fontSize: 20 }} />
                </ListItemIcon>
            )}

            {!isCollapsed && (
                <ListItemText
                    primary={item.name}
                    slotProps={{
                        primary: {
                            variant: 'body2',
                            sx: {
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? '#ffffff' : '#c9cbcf',
                                fontSize: '13px',
                                letterSpacing: '-0.3px',
                            },
                        },
                    }}
                />
            )}

            {!isCollapsed && hasChildren && (
                openSubmenu ? <ExpandLess sx={{ fontSize: 18, color: '#797d86' }} /> : <ExpandMore sx={{ fontSize: 18, color: '#797d86' }} />
            )}
        </ListItemButton>
    );

    return (
        <>
            {isCollapsed ? (
                <Tooltip title={item.name ?? ''} placement="right" arrow>
                    {buttonContent}
                </Tooltip>
            ) : (
                buttonContent
            )}

            {hasChildren && !isCollapsed && (
                <Collapse in={openSubmenu} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ pl: 2 }}>
                        {item.children?.map((child, idx) => (
                            <SidebarItem key={child.name || idx} item={child} />
                        ))}
                    </List>
                </Collapse>
            )}
        </>
    );
};

export default SidebarItem;
