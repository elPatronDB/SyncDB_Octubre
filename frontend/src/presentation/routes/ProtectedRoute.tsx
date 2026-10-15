import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../core/store/authStore';
import { FullPageLoader } from '../../shared/components/loaders';
import { refreshSession } from '../../modules/auth/infrastructure/services/auth.service';

/**
 * ProtectedRoute — global authentication guard.
 *
 * Responsibilities:
 * 1. If accessToken exists but user is null (page reload), restores session via refreshSession().
 * 2. Shows FullPageLoader during session restoration.
 * 3. If no token or refresh fails, redirects to /auth/login preserving location state.
 * 4. Once user and accessToken are present, renders child routes (FullLayout + module routes).
 */
const ProtectedRoute = () => {
    const location = useLocation();
    const {
        accessToken,
        user,
        isRestoringSession,
        setAuth,
        setIsRestoringSession,
        clearAuth
    } = useAuthStore();

    useEffect(() => {
        const restoreSession = async () => {
            // Only restore if we have an accessToken and no user in memory
            if (accessToken && !user && !isRestoringSession) {
                setIsRestoringSession(true);
                try {
                    const session = await refreshSession();
                    setAuth(session.accessToken, session.user);
                } catch {
                    clearAuth();
                } finally {
                    setIsRestoringSession(false);
                }
            }
        };

        restoreSession();
    }, [accessToken, user, isRestoringSession, setAuth, setIsRestoringSession, clearAuth]);

    if (isRestoringSession) {
        return <FullPageLoader message="Restoring session..." />;
    }

    if (!accessToken) {
        return (
            <Navigate
                to="/auth/login"
                replace
                state={{ from: location }}
            />
        );
    }


    return <Outlet />;
};

export default ProtectedRoute;
