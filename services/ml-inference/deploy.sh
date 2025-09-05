#!/bin/bash

# ML Inference Service Deployment Script
# Usage: ./deploy.sh [environment] [action]
# Examples:
#   ./deploy.sh dev up
#   ./deploy.sh prod deploy
#   ./deploy.sh k8s apply

set -e

ENVIRONMENT=${1:-dev}
ACTION=${2:-up}

echo "🚀 ML Inference Service Deployment"
echo "Environment: $ENVIRONMENT"
echo "Action: $ACTION"

case $ENVIRONMENT in
  "dev")
    case $ACTION in
      "up")
        echo "Starting development environment..."
        docker-compose up --build ml-inference-dev ollama prometheus grafana
        ;;
      "down")
        echo "Stopping development environment..."
        docker-compose down
        ;;
      "logs")
        echo "Showing logs..."
        docker-compose logs -f ml-inference-dev
        ;;
      "shell")
        echo "Opening shell..."
        docker-compose exec ml-inference-dev bash
        ;;
      *)
        echo "Unknown action: $ACTION"
        exit 1
        ;;
    esac
    ;;

  "prod")
    case $ACTION in
      "deploy")
        echo "Deploying production environment..."
        docker-compose up -d --build ml-inference-prod ollama prometheus grafana
        ;;
      "gpu")
        echo "Deploying GPU-enabled production environment..."
        docker-compose up -d --build ml-inference-gpu ollama prometheus grafana
        ;;
      "stop")
        echo "Stopping production environment..."
        docker-compose down
        ;;
      "logs")
        echo "Showing production logs..."
        docker-compose logs -f ml-inference-prod
        ;;
      "health")
        echo "Checking health..."
        curl -f http://localhost:8000/health || echo "Service not healthy"
        ;;
      *)
        echo "Unknown action: $ACTION"
        exit 1
        ;;
    esac
    ;;

  "k8s")
    case $ACTION in
      "apply")
        echo "Applying Kubernetes manifests..."
        kubectl apply -f k8s/deployment.yaml
        ;;
      "delete")
        echo "Deleting Kubernetes resources..."
        kubectl delete -f k8s/deployment.yaml
        ;;
      "status")
        echo "Checking Kubernetes status..."
        kubectl get pods -n cortex-os -l app=ml-inference
        kubectl get svc -n cortex-os -l app=ml-inference
        ;;
      "logs")
        echo "Showing Kubernetes logs..."
        kubectl logs -n cortex-os -l app=ml-inference -f
        ;;
      *)
        echo "Unknown action: $ACTION"
        exit 1
        ;;
    esac
    ;;

  *)
    echo "Unknown environment: $ENVIRONMENT"
    echo "Available environments: dev, prod, k8s"
    exit 1
    ;;
esac

echo "✅ Operation completed successfully!"
