require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { setupMetrics } = require('./metrics');
const logger = require('./logger');
const { pool } = require('./db/pool');
const cardRoutes = require('./routes/cardRoutes');

const app = express();
const PORT = process.env.CARD_SERVICE_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Setup Prometheus metrics
setupMetrics(app);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    
    res.status(200).json({
      status: 'UP',
      database: 'UP',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'DOWN',
      database: 'DOWN',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Card routes
app.use('/cards', cardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Card Service listening on port ${PORT}`);
});
