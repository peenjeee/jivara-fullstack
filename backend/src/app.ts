import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { apiReference } from '@scalar/express-api-reference';
import { swaggerSpec } from './config/swagger';
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import medicationScheduleRoutes from './routes/medication-schedule.routes';
import medicationLogRoutes from './routes/medication-log.routes';
import adherenceRoutes from './routes/adherence.routes';
import foodAiRoutes from './routes/food-ai.routes';
import notificationRoutes from './routes/notification.routes';
import auditLogRoutes from './routes/audit-log.routes';
import nurseRoutes from './routes/nurse.routes';
import alertRoutes from './routes/alert.routes';
import publicStatsRoutes from './routes/public-stats.routes';
import activityReadRoutes from './routes/activity-read.routes';
import activityEventRoutes from './routes/activity-event.routes';
import adminDashboardRoutes from './routes/admin-dashboard.routes';
import { authenticateToken } from './middleware/auth.middleware';
import { authorizeFoodScanUpload } from './middleware/upload-access.middleware';

const app = express();
const publicDir = path.resolve(process.cwd(), 'public');

app.set('trust proxy', 1);

app.use((req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  const writeHead = res.writeHead.bind(res);

  res.writeHead = ((...args: Parameters<Response['writeHead']>) => {
    const durationMs = Date.now() - startedAt;
    res.setHeader('X-Jivara-Backend-Ms', String(durationMs));
    res.setHeader('Server-Timing', `jivara-backend;dur=${durationMs}`);
    return writeHead(...args);
  }) as Response['writeHead'];

  next();
});

const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://www.jivara.web.id',
  'https://jivara.web.id',
];
const allowedOrigins = (process.env.FRONTEND_URL || defaultAllowedOrigins.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOriginSet = new Set(allowedOrigins);

// CORS must run before rate limiting so preflight requests get CORS headers.
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOriginSet.has(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Jivara-Backend-Ms', 'Server-Timing'],
  credentials: true,
  maxAge: 86_400,
  optionsSuccessStatus: 204,
}));

// Security: HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // Dinonaktifkan agar dokumentasi Scalar bisa berjalan
  crossOriginEmbedderPolicy: { policy: 'credentialless' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' },
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
    || req.path === '/v1/auth/status',
  message: {
    status: 'gagal',
    message: 'Terlalu banyak permintaan, silakan coba lagi nanti.',
  },
});
app.use('/api', limiter);

// Body parser dengan limit untuk mencegah payload attack
app.use(express.json({ limit: '1mb' }));

// Locally stored uploaded food scans are protected by scan ownership.
app.use('/uploads', authenticateToken, authorizeFoodScanUpload, express.static(path.resolve(process.cwd(), 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  },
}));

app.use('/docs-assets/logo', express.static(path.join(publicDir, 'images/logo')));
app.use('/docs-assets', express.static(publicDir));

// Routes
app.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(swaggerSpec);
});

app.use('/api-docs', apiReference({
  url: '/openapi.json',
  theme: 'saturn',
  layout: 'modern',
  darkMode: false,
  pageTitle: 'Dokumentasi API | Jivara',
  favicon: '/docs-assets/favicon.ico',
  metaData: {
    title: 'Dokumentasi API | Jivara',
  },
  onLoaded: () => {
    const clientDocument = (globalThis as unknown as {
      document: {
        querySelector: (selectors: string) => unknown;
        createElement: (tagName: string) => { src: string; defer: boolean; dataset: Record<string, string> };
        head: { appendChild: (node: unknown) => void };
      };
    }).document;
    if (clientDocument.querySelector('script[data-jivara-scalar-docs]')) return;

    const script = clientDocument.createElement('script');
    script.src = '/docs-assets/api-docs.js';
    script.defer = true;
    script.dataset.jivaraScalarDocs = 'true';
    clientDocument.head.appendChild(script);
  },
}));

const mountApiRoutes = (basePath: string) => {
  app.use(`${basePath}/auth`, authRoutes);
  app.use(`${basePath}/public`, publicStatsRoutes);
  app.use(`${basePath}/patients`, patientRoutes);
  app.use(`${basePath}/nurses`, nurseRoutes);
  app.use(`${basePath}/medication-schedules`, medicationScheduleRoutes);
  app.use(`${basePath}/medication-logs`, medicationLogRoutes);
  app.use(`${basePath}/adherence`, adherenceRoutes);
  app.use(`${basePath}/notifications`, notificationRoutes);
  app.use(`${basePath}/audit-logs`, auditLogRoutes);
  app.use(`${basePath}/alerts`, alertRoutes);
  app.use(`${basePath}/activity-reads`, activityReadRoutes);
  app.use(`${basePath}/activity-events`, activityEventRoutes);
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
