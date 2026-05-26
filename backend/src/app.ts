import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { swaggerUiAssets } from './config/swagger-ui-assets';
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import medicationScheduleRoutes from './routes/medication-schedule.routes';
import medicationLogRoutes from './routes/medication-log.routes';
import adherenceRoutes from './routes/adherence.routes';
import foodAiRoutes from './routes/food-ai.routes';
import prescriptionRoutes from './routes/prescription.routes';
import notificationRoutes from './routes/notification.routes';
import auditLogRoutes from './routes/audit-log.routes';
import nurseRoutes from './routes/nurse.routes';
import alertRoutes from './routes/alert.routes';
import publicStatsRoutes from './routes/public-stats.routes';
import activityReadRoutes from './routes/activity-read.routes';
import adminDashboardRoutes from './routes/admin-dashboard.routes';

const app = express();
const publicDir = path.resolve(process.cwd(), 'public');

app.set('trust proxy', 1);

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((origin) => origin.trim());

// CORS must run before rate limiting so preflight requests get CORS headers.
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Security: HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // Dinonaktifkan agar Swagger UI bisa berjalan
  crossOriginEmbedderPolicy: false,
}));

// Security: Rate limiting untuk mencegah brute-force & abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // Maksimal 100 request per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production'
    || req.path === '/v1/auth/login'
    || req.path === '/v1/auth/register'
    || req.path === '/v1/auth/status'
    || req.path.startsWith('/v1/auth/admin-approvals')
    || req.path.startsWith('/v1/audit-logs'),
  message: {
    status: 'gagal',
    message: 'Terlalu banyak permintaan, silakan coba lagi nanti.',
  },
});
app.use('/api', limiter);

// Body parser dengan limit untuk mencegah payload attack
app.use(express.json({ limit: '1mb' }));

// Public access for locally stored uploaded files.
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

app.use('/swagger-assets/logo', express.static(path.join(publicDir, 'images/logo')));
app.use('/swagger-assets', express.static(publicDir));

// Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    persistAuthorization: true,
  },
  customCssUrl: swaggerUiAssets.customCssUrl,
  customJs: swaggerUiAssets.customJs,
  customSiteTitle: "Dokumentasi API | Jivara",
  customfavIcon: '/swagger-assets/favicon.ico'
}));

const mountApiRoutes = (basePath: string) => {
  app.use(`${basePath}/auth`, authRoutes);
  app.use(`${basePath}/public`, publicStatsRoutes);
  app.use(`${basePath}/patients`, patientRoutes);
  app.use(`${basePath}/nurses`, nurseRoutes);
  app.use(`${basePath}/prescriptions`, prescriptionRoutes);
  app.use(`${basePath}/medication-schedules`, medicationScheduleRoutes);
  app.use(`${basePath}/medication-logs`, medicationLogRoutes);
  app.use(`${basePath}/adherence`, adherenceRoutes);
  app.use(`${basePath}/notifications`, notificationRoutes);
  app.use(`${basePath}/audit-logs`, auditLogRoutes);
  app.use(`${basePath}/alerts`, alertRoutes);
  app.use(`${basePath}/activity-reads`, activityReadRoutes);
  app.use(`${basePath}/admin-dashboard`, adminDashboardRoutes);
  app.use(basePath, foodAiRoutes);
};

mountApiRoutes('/api/v1');

// Pengecekan API
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'Berjalan', message: 'Backend Jivara berjalan dengan baik' });
});

// Rute Utama
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Jivara API',
    version: '1.0.0',
    framework: 'Express.js',
    status: 'Berjalan',
    docs: '/api-docs'
  });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ status: 'gagal', message: 'Endpoint tidak ditemukan' });
});

// Global Error Handler
app.use((err: { status?: number; message?: string }, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.status || 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    // console.error('[Error Internal]:', err);
  }

  res.status(statusCode).json({
    status: 'gagal',
    message: isServerError ? 'Terjadi kesalahan pada server' : (err.message || 'Terjadi kesalahan'),
  });
});

export default app;
