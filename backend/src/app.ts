import express from 'express';
import cors from 'cors';
import routes from './routes/index.routes.js';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, mobile apps, server-to-server) or from allowed origins
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-API-KEY']
}));
app.set('trust proxy', true);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// System Admin API (consumed by frontend at /api)
app.use('/api', routes);

export default app;
