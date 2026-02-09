import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './database/db'; // Initialize database

import authRoutes from './routes/auth';
import palletizeRoutes from './routes/palletize';
import palletsRoutes from './routes/pallets';
import itemsRoutes from './routes/items';
import usersRoutes from './routes/users';
import batchRoutes from './routes/batch';
import pdfRoutes from './routes/pdf';
import exportRoutes from './routes/export';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS configuration - allow all origins for development
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Increase body size limit to handle image data (10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/palletize', palletizeRoutes);
app.use('/api/pallets', palletsRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/export-pdf', pdfRoutes);
app.use('/api/export', exportRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces for external access

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Access from other devices: http://<your-ip>:${PORT}`);
});
