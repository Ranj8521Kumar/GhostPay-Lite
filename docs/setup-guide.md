# GhostPay-Lite Setup Guide

This guide provides step-by-step instructions for setting up and running GhostPay-Lite.

## Prerequisites

- Docker and Docker Compose
- Kubernetes (minikube or kind for local development)
- Node.js 18+ and npm
- kubectl CLI
- Helm

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ghostpay-lite.git
cd ghostpay-lite
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ghostpay
MONGO_URI=mongodb://mongo:27017/ghostpay

# Redis
REDIS_URI=redis://redis:6379

# JWT
JWT_PRIVATE_KEY_PATH=/path/to/private.key
JWT_PUBLIC_KEY_PATH=/path/to/public.key
JWT_EXPIRY=1h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Services
API_GATEWAY_PORT=3000
CARD_SERVICE_PORT=3001
CHARGE_SERVICE_PORT=3002
AUTH_SERVICE_PORT=3003
ANALYTICS_SERVICE_PORT=3004
```

### 3. Generate JWT Keys

```bash
mkdir -p keys
openssl genrsa -out keys/private.key 2048
openssl rsa -in keys/private.key -pubout -out keys/public.key
```

### 4. Start the Services with Docker Compose

```bash
docker-compose up -d
```

This will start all the services, databases, and dependencies.

### 5. Verify the Setup

```bash
curl http://localhost:3000/health
```

You should see a response indicating that all services are healthy.

## Kubernetes Deployment

### 1. Set Up Kubernetes Cluster

For local development, you can use minikube:

```bash
minikube start --cpus 4 --memory 8192
```

### 2. Create Kubernetes Secrets

```bash
kubectl create namespace ghostpay

# Create JWT key secrets
kubectl create secret generic jwt-keys \
  --from-file=private.key=./keys/private.key \
  --from-file=public.key=./keys/public.key \
  --namespace ghostpay

# Create database secrets
kubectl create secret generic db-credentials \
  --from-literal=postgres-password=postgres \
  --from-literal=mongo-uri=mongodb://mongo:27017/ghostpay \
  --namespace ghostpay
```

### 3. Deploy with Helm

```bash
helm install ghostpay ./k8s/helm --namespace ghostpay
```

### 4. Verify the Deployment

```bash
kubectl get pods -n ghostpay
```

You should see all the pods running.

### 5. Access the API

```bash
# Get the API Gateway URL
export API_URL=$(minikube service api-gateway --namespace ghostpay --url)

# Test the API
curl $API_URL/health
```

## Production Deployment

For production deployment, follow these additional steps:

### 1. Set Up Infrastructure

Use Terraform to provision the required infrastructure:

```bash
cd terraform
terraform init
terraform apply
```

### 2. Configure CI/CD

Set up GitHub Actions for CI/CD by creating the necessary secrets in your GitHub repository:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `KUBE_CONFIG`

### 3. Deploy to Production

Push to the main branch to trigger the CI/CD pipeline, which will:

1. Build and test the code
2. Build Docker images
3. Push images to the container registry
4. Deploy to Kubernetes using Helm
5. Run smoke tests
6. Perform blue/green deployment

## Monitoring and Observability

### 1. Access Grafana

```bash
kubectl port-forward svc/grafana 3000:3000 -n monitoring
```

Then open http://localhost:3000 in your browser.

### 2. Access Prometheus

```bash
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
```

Then open http://localhost:9090 in your browser.

## Troubleshooting

### Common Issues

1. **Services not starting**: Check the logs with `docker-compose logs` or `kubectl logs`.
2. **Database connection issues**: Verify that the database secrets are correctly set up.
3. **JWT authentication failures**: Ensure that the JWT keys are correctly generated and mounted.

### Getting Help

If you encounter any issues, please open an issue on GitHub or contact support@ghostpay-lite.example.com.
