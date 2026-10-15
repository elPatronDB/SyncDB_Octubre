import {
    DashboardOutlined,
    FolderOutlined,
    PersonOutlineOutlined,
} from '@mui/icons-material';
import type { ElementType } from 'react';

export interface MenuItem {
    name?: string;
    module?: string;
    group?: string;
    link?: string;
    icon?: ElementType;
    children?: MenuItem[];
}

const MenuItems: MenuItem[] = [
    { group: 'Workspace' },
    {
        name: 'Master Console',
        icon: DashboardOutlined,
        link: '/',
    },
    {
        name: 'Proyectos',
        icon: FolderOutlined,
        link: '/projects',
    },

    { group: 'Account' },
    {
        name: 'My Profile',
        icon: PersonOutlineOutlined,
        link: '/profile',
    },
];

export default MenuItems;
