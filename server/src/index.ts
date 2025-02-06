/**
 * @fileoverview Express server entry point for DJ XU application.
 */

import express from 'express';
import cors from 'cors';
import { logger } from './utils/logger';
import vertexRoutes from './routes/vertex';
import { errorHandler } from './middleware/error';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware setup
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/vertex', vertexRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV,
  });
});

// Global error handlers
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled rejection', {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
  });
  process.exit(1);
});