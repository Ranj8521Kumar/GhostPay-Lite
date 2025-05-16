const promClient = require('prom-client');

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add default metrics to the registry
promClient.collectDefaultMetrics({ register });

// Create custom metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const cardCreationCounter = new promClient.Counter({
  name: 'cards_created_total',
  help: 'Total number of cards created'
});

const cardRetrievalCounter = new promClient.Counter({
  name: 'cards_retrieved_total',
  help: 'Total number of card retrievals'
});

// Register the custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestCounter);
register.registerMetric(cardCreationCounter);
register.registerMetric(cardRetrievalCounter);

// Middleware to collect metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Record end time and calculate duration on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    
    // Record metrics
    httpRequestDurationMicroseconds
      .labels(method, route, statusCode)
      .observe(duration / 1000);
    
    httpRequestCounter
      .labels(method, route, statusCode)
      .inc();
    
    // Record card-specific metrics
    if (method === 'POST' && route === '/' && statusCode === 201) {
      cardCreationCounter.inc();
    }
    
    if (method === 'GET' && route === '/:id' && statusCode === 200) {
      cardRetrievalCounter.inc();
    }
  });
  
  next();
};

// Setup metrics endpoints and middleware
const setupMetrics = (app) => {
  // Expose metrics endpoint
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
  
  // Use metrics middleware
  app.use(metricsMiddleware);
};

module.exports = {
  setupMetrics,
  register,
  httpRequestDurationMicroseconds,
  httpRequestCounter,
  cardCreationCounter,
  cardRetrievalCounter
};
