#!/bin/bash

# Default values
COMMAND=${1:-start}
ENVIRONMENT=${2:-local}
SERVICE=${3:-all}
LINES=${4:-100}

# Help message
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: ./dev.sh [command] [environment] [service] [lines]"
    echo "Commands:"
    echo "  start       Start environment"
    echo "  stop        Stop environment"
    echo "  restart     Restart environment"
    echo "  rebuild     Rebuild and start environment"
    echo "  logs        View logs (optional: service name, line count)"
    echo "  status      Check service status"
    echo "  services    List available services"
    echo ""
    echo "Environments:"
    echo "  local       Local development (default)"
    echo "  vps-dev     VPS development environment"
    echo "  vps-prod    VPS production environment"
    echo ""
    echo "Services for logs:"
    echo "  all, auction-manager, event-handler, stream-manager,"
    echo "  shape-l2, eliza, redis, prometheus, grafana"
    exit 0
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(local|vps-dev|vps-prod)$ ]]; then
    echo "Invalid environment. Use 'local', 'vps-dev', or 'vps-prod'"
    exit 1
fi

# Set environment variables based on environment
case $ENVIRONMENT in
    "local")
        export NODE_ENV=development
        ENV_FILE=.env.dev
        COMPOSE_FILES="-f docker-compose.yaml -f docker-compose.dev.yaml"
        ;;
    "vps-dev")
        export NODE_ENV=development
        ENV_FILE=.env.vps-dev
        COMPOSE_FILES="-f docker-compose.yaml -f docker-compose.vps-dev.yaml"
        ;;
    "vps-prod")
        export NODE_ENV=production
        ENV_FILE=.env.prod
        COMPOSE_FILES="-f docker-compose.yaml -f docker-compose.prod.yaml"
        ;;
esac

# Load environment variables
if [ -f $ENV_FILE ]; then
    export $(cat $ENV_FILE | grep -v '^#' | xargs)
else
    echo "Error: $ENV_FILE file not found"
    echo "Run ./setup.sh $ENVIRONMENT first"
    exit 1
fi

# Function to check if services are running
check_services() {
    docker-compose $COMPOSE_FILES ps
}

# Function to list available services
list_services() {
    echo "Available services:"
    echo "  auction-manager   (port 4100)"
    echo "  event-handler    (port 4300)"
    echo "  stream-manager   (port 4200)"
    echo "  shape-l2        (port 4000)"
    echo "  eliza           (port 4400)"
    echo "  admin-frontend  (port 3000)"
    echo "  redis           (port 6379)"
    echo "  prometheus      (port 9090)"
    echo "  grafana         (port 3001)"
    echo "  adminer         (port 6380)"
    echo "  traefik         (ports 80,443)"
}

# Function to view logs
view_logs() {
    local service=$1
    local lines=$2
    
    case $service in
        "all")
            echo "Showing last $lines lines of all services..."
            docker-compose $COMPOSE_FILES logs --tail=$lines -f
            ;;
        "auction-manager"|"event-handler"|"stream-manager"|"shape-l2"|"eliza"|"admin-frontend"|"redis"|"prometheus"|"grafana"|"traefik")
            echo "Showing last $lines lines of $service..."
            docker-compose $COMPOSE_FILES logs --tail=$lines -f $service
            ;;
        *)
            echo "Invalid service. Available services are:"
            list_services
            exit 1
            ;;
    esac
}

# Function to start services
start_services() {
    echo "Starting $ENVIRONMENT environment..."
    docker-compose $COMPOSE_FILES up -d
    echo "$ENVIRONMENT environment started!"
    check_services
}

# Function to stop services
stop_services() {
    echo "Stopping $ENVIRONMENT environment..."
    docker-compose $COMPOSE_FILES down
    echo "$ENVIRONMENT environment stopped!"
}

# Function to rebuild services
rebuild_services() {
    echo "Rebuilding $ENVIRONMENT environment..."
    docker-compose $COMPOSE_FILES down
    docker-compose $COMPOSE_FILES build --no-cache
    docker-compose $COMPOSE_FILES up -d
    echo "$ENVIRONMENT environment rebuilt and started!"
    check_services
}

# Main logic
case $COMMAND in
    "start")
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        stop_services
        start_services
        ;;
    "rebuild")
        rebuild_services
        ;;
    "logs")
        view_logs "$SERVICE" "$LINES"
        ;;
    "status")
        check_services
        ;;
    "services")
        list_services
        ;;
    *)
        echo "Invalid command. Use --help to see available commands."
        exit 1
        ;;
esac 