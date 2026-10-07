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
import {
  notFoundHandler,
  errorHandler,
} from './middlewares/errorMiddlewares.js';

dotenv.config();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.resolve('uploads')));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Community Reporting System API is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

// Root API index
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
      health: '/health',
    },
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subcategoryRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`Auth endpoints available at http://localhost:${PORT}/api/auth`);
    console.log(`Report endpoints available at http://localhost:${PORT}/api/reports`);
    console.log(`Category endpoints available at http://localhost:${PORT}/api/categories`);
    console.log(`Subcategory endpoints available at http://localhost:${PORT}/api/subcategories`);
  });
}

export default app;
