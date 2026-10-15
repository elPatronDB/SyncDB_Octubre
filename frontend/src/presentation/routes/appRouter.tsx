import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { authRoutes } from '../../modules/auth/presentation/auth.routes';
import { profileRoutes } from '../../modules/profile/presentation/profile.routes';
import { projectsRoutes } from '../../modules/projects/presentation/projects.routes';
import ProtectedRoute from './ProtectedRoute';

import { FullPageLoader } from '../../shared/components/loaders';
import DashboardPage from '../../shared/pages/Dashboard.page';

const BlankLayout = lazy(() => import('../layouts/blankLayout'));
const FullLayout = lazy(() => import('../layouts/fullLayout'));
const PublicDeviceRegisterPage = lazy(
    () => import('../../modules/projects/presentation/public/PublicDeviceRegister.page')
);

export const appRouter = createBrowserRouter([
    // ── Public routes (unauthenticated) ──────────────────────────────────────
    {
        path: '/auth',
        element: (
            <Suspense fallback={<FullPageLoader />}>
                <BlankLayout />
            </Suspense>
        ),
        children: [...authRoutes],
    },

    // ── Public Device Join routes ────────────────────────────────────────────
    {
        path: '/p/:accessCode',
        element: (
            <Suspense fallback={<FullPageLoader />}>
                <BlankLayout />
            </Suspense>
        ),
        children: [
            {
                index: true,
                element: <PublicDeviceRegisterPage />,
            },
        ],
    },
    {
        path: '/join/:accessCode',
        element: (
            <Suspense fallback={<FullPageLoader />}>
                <BlankLayout />
            </Suspense>
        ),
        children: [
            {
                index: true,
                element: <PublicDeviceRegisterPage />,
            },
        ],
    },

    // ── Protected routes (authenticated) ─────────────────────────────────────
    {
        path: '/',
        element: (
            <Suspense fallback={<FullPageLoader />}>
                <ProtectedRoute />
            </Suspense>
        ),
        children: [
            {
                element: (
                    <Suspense fallback={<FullPageLoader />}>
                        <FullLayout />
                    </Suspense>
                ),
                children: [
                    // Master Console / Dashboard
                    {
                        index: true,
                        element: <DashboardPage />,
                    },

                    // Projects CRUD & Details
                    {
                        path: 'projects',
                        children: [...projectsRoutes],
                    },

                    // User Profile
                    {
                        path: 'profile',
                        children: [...profileRoutes],
                    },
                ],
            },
        ],
    },

    // ── Catch-all — redirect unknown paths to home ────────────────────────────
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);
