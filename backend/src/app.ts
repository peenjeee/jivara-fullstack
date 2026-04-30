import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import medicationScheduleRoutes from './routes/medication-schedule.routes';
import medicationLogRoutes from './routes/medication-log.routes';
import adherenceRoutes from './routes/adherence.routes';
import foodAiRoutes from './routes/food-ai.routes';

const app = express();
const PORT = process.env.PORT || 3001;

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
  message: {
    status: 'gagal',
    message: 'Terlalu banyak permintaan, silakan coba lagi nanti.',
  },
});
app.use('/api/', limiter);

// CORS configuration - allow frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parser dengan limit untuk mencegah payload attack
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    persistAuthorization: true,
  },
  customCss: `
    html.lenis { height: auto; }
    .lenis.lenis-smooth { scroll-behavior: auto !important; }
    .lenis.lenis-smooth [data-lenis-prevent] { overscroll-behavior: contain; }
    .lenis.lenis-stopped { overflow: hidden; }
    .lenis.lenis-scrolling iframe { pointer-events: none; }

    .swagger-ui .topbar { display: none }
    /* Premium Scrollbar styling */
    ::-webkit-scrollbar { width: 10px; }
    ::-webkit-scrollbar-track { background: #0f172a; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 5px; border: 2px solid #0f172a; }
    ::-webkit-scrollbar-thumb:hover { background: #10b981; }
  `,
  customJs: '/swagger-custom.js',
  customSiteTitle: "Dokumentasi API Jivara"
}));

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/medication-schedules', medicationScheduleRoutes);
app.use('/api/medication-logs', medicationLogRoutes);
app.use('/api/adherence', adherenceRoutes);
app.use('/api', foodAiRoutes);

// Custom JS untuk Smooth Scroll Swagger (Lenis)
app.get('/swagger-custom.js', (req: Request, res: Response) => {
  res.type('application/javascript');
  res.send(`
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lenis@1.1.18/dist/lenis.min.js';
    script.onload = () => {
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
      });

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
      
      // Ubah ukuran otomatis lenis pada perubahan konten swagger yang dinamis
      const observer = new MutationObserver(() => {
        lenis.resize();
      });
      observer.observe(document.body, { childList: true, subtree: true });

      window.lenis = lenis;
    };
    document.head.appendChild(script);
  `);
});

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

app.listen(PORT, () => {
  // console.log(`[server]: Server berjalan di http://localhost:${PORT}`);
});
