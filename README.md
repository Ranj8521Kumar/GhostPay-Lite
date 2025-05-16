# GhostPay-Lite

A lightweight, microservice-based payment token API that issues single-use virtual cards and processes charges.

## Architecture

GhostPay-Lite is built using a microservice architecture with the following components:

- **API Gateway Service**: Handles authentication, rate limiting, and routing
- **Card Service**: Issues and manages single-use virtual cards
- **Charge Service**: Processes charges against virtual cards
- **Auth Service**: Manages JWT generation, validation, and key rotation
- **Analytics Service**: Collects and stores usage data

## Technology Stack

- **Backend**: Node.js with Express
- **Databases**: PostgreSQL (transactional data), MongoDB (analytics data)
- **Caching/Rate Limiting**: Redis
- **Secrets Management**: Vault
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **Observability**: Prometheus, OpenTelemetry, Grafana
- **CI/CD**: GitHub Actions

## Getting Started

See the [Setup Guide](docs/setup-guide.md) for instructions on how to run the project.

## API Documentation

The API is documented using OpenAPI/Swagger. See the [OpenAPI specification](openapi.yaml) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
