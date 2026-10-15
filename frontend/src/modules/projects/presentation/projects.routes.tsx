import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const ProjectListPage = lazy(() => import('./pages/ProjectList.page'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetail.page'));

export const projectsRoutes: RouteObject[] = [
    {
        index: true,
        element: <ProjectListPage />,
    },
    {
        path: ':id',
        element: <ProjectDetailPage />,
    },
];
