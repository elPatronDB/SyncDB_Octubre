import type { RouteObject } from 'react-router-dom';
import { ProfilePage } from './profile.lazy';

export const profileRoutes: RouteObject[] = [
    {
        index: true,
        element: <ProfilePage />,
    },
];
