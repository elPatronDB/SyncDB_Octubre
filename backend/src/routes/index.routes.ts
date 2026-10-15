import { Router } from "express";
import { ErrorMiddleware } from "../app/middleware/Error.middleware.js";
import AuthRoutes from "../modules/Auth/presentation/auth.routes.js";
import ProjectsRoutes from "../modules/Projects/presentation/projects.routes.js";
import PublicRoutes from "../modules/Projects/presentation/public.routes.js";

const router = Router();

router.use('/auth', AuthRoutes);
router.use('/projects', ProjectsRoutes);
router.use('/public', PublicRoutes);

router.use(ErrorMiddleware);

export default router;
