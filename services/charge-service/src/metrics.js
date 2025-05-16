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

const chargeCreationCounter = new promClient.Counter({
  name: 'charges_created_total',
  help: 'Total number of charges created',
  labelNames: ['status']
});

const chargeAmountTotal = new promClient.Counter({
  name: 'charge_amount_total',
  help: 'Total amount charged',
  labelNames: ['currency', 'status']
});

// Register the custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestCounter);
register.registerMetric(chargeCreationCounter);
register.registerMetric(chargeAmountTotal);

// Middleware to collect metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Store the original json method
  const originalJson = res.json;
  
  // Override the json method
  res.json = function(body) {
    // If this is a charge creation response
    if (req.method === 'POST' && req.path === '/' && res.statusCode === 201 && body && body.status) {
      // Increment charge creation counter
      chargeCreationCounter.labels(body.status).inc();
      
      // Increment charge amount total
      if (body.amount && body.currency) {
        chargeAmountTotal.labels(body.currency, body.status).inc(body.amount);
      }
    }
    
    // Call the original method
    return originalJson.call(this, body);
  };
  
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
  chargeCreationCounter,
  chargeAmountTotal
};
