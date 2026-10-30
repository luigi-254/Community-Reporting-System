import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';

import authRoutes from './routes/authroutes.js';
import reportRoutes from './routes/reportroutes.js';
import categoryRoutes from './routes/categoryroutes.js';
import subcategoryRoutes from './routes/subcategoryroutes.js';
import locationRoutes from './routes/locationroutes.js';
import departmentRoutes from './routes/departmentroutes.js';
import officerRoutes from './routes/officerroutes.js';
import assignmentRoutes from './routes/assignmentroutes.js';
import routingRuleRoutes from './routes/routingruleRoutes.js';
import notificationRoutes from './routes/notificationroutes.js';
import officialRoutes from './routes/officialroutes.js';
import escalationRoutes from './routes/escalationroutes.js';
import dashboardRoutes from './routes/dashboardroutes.js';
import auditLogRoutes from './routes/auditlogroutes.js';
import { autoEscalateOverdueReports } from './services/slaService.js';

import {
  notFoundHandler,
  errorHandler,
} from './middlewares/errorMiddlewares.js';

dotenv.config();

const app = express();

// --------------------------------------------------
// SECURITY AND CORS CONFIGURATION
// --------------------------------------------------

app.use(helmet());


const configuredOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => {
    const trimmed = origin.trim();
    if (!trimmed) return null;

    try {
      return new URL(trimmed).origin;
    } catch {
      return trimmed.replace(/\/+$/, "");
    }
  })
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header.
      if (!origin) {
        return callback(null, true);
      }

      // Read explicitly configured frontend origins.
      const configuredOrigins = (process.env.CLIENT_URL || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (configuredOrigins.includes(origin)) {
        return callback(null, true);
      }

      // During local development, allow Next.js frontends
      // on localhost, including ports 3000, 3001 and 3002.
      try {
        const url = new URL(origin);

        if (
          process.env.NODE_ENV !== "production" &&
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(url.hostname)
        ) {
          return callback(null, true);
        }
      } catch {
        // Reject an invalid origin below.
      }

      return callback(
        new Error(`Origin not allowed by CORS: ${origin}`)
      );
    },
    credentials: true,
  })
);

// --------------------------------------------------
// GENERAL MIDDLEWARE
// --------------------------------------------------

app.use(compression());
app.use(cookieParser());

app.use(express.json({ limit: '10mb' }));
app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

// Serve uploaded report images and other media.
app.use('/uploads', express.static(path.resolve('uploads')));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Community Reporting System API is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

// --------------------------------------------------
// API INFORMATION
// --------------------------------------------------

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    service: 'Community Reporting System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      reports: '/api/reports',
      categories: '/api/categories',
      subcategories: '/api/subcategories',
      locations: '/api/locations',
      departments: '/api/departments',
      officers: '/api/officers',
      assignments: '/api/assignments',
      routingRules: '/api/routing-rules',
      notifications: '/api/notifications',
      escalations: '/api/escalations',
      dashboard: '/api/dashboard',
      auditLogs: '/api/audit-logs',
      health: '/health',
    },
  });
});

// --------------------------------------------------
// API ROUTES
// --------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subcategoryRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/routing-rules', routingRuleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/officials', officialRoutes);
app.use('/api/escalations', escalationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// --------------------------------------------------
// ERROR HANDLING
// --------------------------------------------------

app.use(notFoundHandler);
app.use(errorHandler);

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(
      `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
    );

    console.log(`API base URL: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Auth endpoints: http://localhost:${PORT}/api/auth`);
    console.log(`Report endpoints: http://localhost:${PORT}/api/reports`);
    console.log(`Category endpoints: http://localhost:${PORT}/api/categories`);
    console.log(`Subcategory endpoints: http://localhost:${PORT}/api/subcategories`);
  });

  // --------------------------------------------------
  // AUTOMATIC ESCALATION SCHEDULER
  // --------------------------------------------------
  // Enabled via ENABLE_ESCALATION_SCHEDULER=true. Runs every 5 minutes by default.
  if (process.env.ENABLE_ESCALATION_SCHEDULER === 'true') {
    const intervalMs = Number(process.env.ESCALATION_SCHEDULER_INTERVAL_MS) || 300000;
    setInterval(async () => {
      try {
        const created = await autoEscalateOverdueReports();
        if (created.length > 0) {
          console.log(`[SLA] Auto-escalated ${created.length} overdue report(s).`);
        }
      } catch (err) {
        console.error('[SLA] Auto-escalation scheduler error:', err.message);
      }
    }, intervalMs);
    console.log(`[SLA] Escalation scheduler enabled (interval: ${intervalMs}ms).`);
  }
}

export default app;