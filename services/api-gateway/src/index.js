require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { setupMetrics } = require('./metrics');
const logger = require('./logger');

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Setup Prometheus metrics
setupMetrics(app);

// Redis client for rate limiting
let redisClient;
(async () => {
  redisClient = createClient({
    url: process.env.REDIS_URI || 'redis://localhost:6379'
  });
  
  redisClient.on('error', (err) => logger.error('Redis Client Error', err));
  
  await redisClient.connect();
})();

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests, please try again later.'
  }
});

// Apply rate limiting to all requests
app.use(limiter);

// JWT Authentication middleware
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'No authorization header provided'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'No token provided'
      });
    }

    // Read public key from file
    const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || path.join(__dirname, '../../..', 'keys/public.key');
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

    // Verify token
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Invalid token'
    });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

// Service routes with authentication
app.use('/v1/cards', authenticate, createProxyMiddleware({
  target: `http://card-service:${process.env.CARD_SERVICE_PORT || 3001}`,
  changeOrigin: true,
  pathRewrite: {
    '^/v1/cards': '/cards'
  }
}));

app.use('/v1/charges', authenticate, createProxyMiddleware({
  target: `http://charge-service:${process.env.CHARGE_SERVICE_PORT || 3002}`,
  changeOrigin: true,
  pathRewrite: {
    '^/v1/charges': '/charges'
  }
}));

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
  logger.info(`API Gateway listening on port ${PORT}`);
});
