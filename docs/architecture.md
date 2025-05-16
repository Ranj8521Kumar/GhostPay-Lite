# GhostPay-Lite Architecture

## Overview

GhostPay-Lite is a microservice-based payment token API that issues single-use virtual cards and processes charges. The system is designed to be secure, scalable, and highly available.

## System Components

### API Gateway

The API Gateway serves as the entry point for all client requests. It is responsible for:

- Authenticating requests using JWT tokens
- Rate limiting requests based on API key
- Routing requests to the appropriate microservice
- Implementing circuit breakers to prevent cascading failures
- Enforcing HTTPS and mTLS between services

### Card Service

The Card Service is responsible for issuing and managing single-use virtual cards. It:

- Creates new virtual cards with specified amount and currency
- Stores card data in PostgreSQL
- Provides card status information
- Ensures cards can only be used once

### Charge Service

The Charge Service processes charges against virtual cards. It:

- Validates charge requests against card data
- Updates card status after successful charges
- Stores charge data in PostgreSQL
- Ensures idempotency of charge operations

### Auth Service

The Auth Service manages authentication and authorization. It:

- Issues JWT tokens for authenticated users
- Validates JWT tokens
- Manages role-based access control (admin, merchant, user)
- Handles key rotation without downtime
- Integrates with Vault for secrets management

### Analytics Service

The Analytics Service collects and analyzes usage data. It:

- Logs all API requests and responses
- Stores analytics data in MongoDB
- Provides usage patterns and insights
- Supports business intelligence and reporting

## Data Flow

1. Client sends a request to the API Gateway
2. API Gateway authenticates the request and applies rate limiting
3. API Gateway routes the request to the appropriate microservice
4. Microservice processes the request and interacts with the database
5. Microservice returns the response to the API Gateway
6. API Gateway returns the response to the client
7. Analytics Service logs the request and response

## Database Design

### PostgreSQL (Transactional Data)

PostgreSQL is used for transactional data that requires ACID compliance:

- Cards table: Stores card information (ID, status, amount, currency, etc.)
- Charges table: Stores charge information (ID, card ID, status, amount, currency, etc.)
- Users table: Stores user information (ID, role, API key, etc.)

### MongoDB (Analytics Data)

MongoDB is used for analytics data that benefits from schema flexibility:

- Logs collection: Stores API request and response logs
- Usage collection: Stores usage patterns and metrics
- Performance collection: Stores performance metrics

## Security

### Authentication and Authorization

- JWT-based authentication using asymmetric signing keys
- Role-based access control (admin, merchant, user)
- API keys for client identification

### Data Protection

- Encryption of sensitive data at rest and in transit
- HTTPS for all external communications
- mTLS for service-to-service communication

### Secrets Management

- Vault for storing and rotating secrets
- No hard-coded secrets in the codebase
- Dynamic secret retrieval at runtime

## Scalability and High Availability

- Containerized microservices deployed to Kubernetes
- Minimum of 2 replicas per service across 2 availability zones
- Horizontal scaling based on CPU and memory usage
- Load balancing using AWS ALB or similar
- Circuit breakers to prevent cascading failures

## Observability

- Prometheus for metrics collection
- OpenTelemetry for distributed tracing
- Grafana for dashboards and visualization
- Alerts for error rates, latency, and resource usage

## Deployment

- CI/CD pipeline using GitHub Actions
- Blue/Green deployment strategy for zero downtime
- Automated testing and validation
- Automatic rollbacks on failure

## SLOs

- 99.9% availability
- 95th percentile latency < 100ms
- Error rate < 1%
- Rate limit: 100 requests per minute per API key
