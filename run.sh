#!/bin/bash

# Help message
show_help() {
    echo "NFT Auction System Management Script"
    echo ""
    echo "Usage: ./run.sh [command] [environment] [options]"
    echo ""
    echo "Commands:"
    echo "  setup     - Initialize environment and create required files/folders"
    echo "  start     - Start all or specific services"
    echo "  stop      - Stop all services"
    echo "  restart   - Restart all or specific services"
    echo "  logs      - View service logs"
    echo "  status    - Check service status"
    echo "  backup    - Create system backup"
    echo "  clean     - Clean up system resources"
    echo ""
    echo "Environments:"
    echo "  local     - Local development environment"
    echo "  vps       - VPS environment"
    echo ""
    echo "Options:"
    echo "  --stage [stage]     - Deployment stage (dev|prod) - default: dev"
    echo "  --service [name]    - Target specific service"
    echo "  --lines [number]    - Number of log lines to show"
    echo "  --type [type]       - Backup type (full|db|logs)"
    echo "  --clean [target]    - Clean target (all|docker|data)"
    echo ""
    echo "Examples:"
    echo "  ./run.sh setup local --stage dev"
    echo "  ./run.sh start vps --stage prod"
    echo "  ./run.sh logs local --service auction-manager --lines 100"
    echo "  ./run.sh backup vps --type full"
    echo "  ./run.sh clean local --clean all"
}

# Check for help flag
if [ "$1" == "--help" ] || [ "$1" == "-h" ] || [ "$#" -lt 2 ]; then
    show_help
    exit 0
fi

# Parse main arguments
COMMAND=$1
ENVIRONMENT=$2
shift 2

# Default values
STAGE="dev"
SERVICE=""
LINES="100"
BACKUP_TYPE="full"
CLEAN_TARGET="all"

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --stage)
            STAGE="$2"
            shift 2
            ;;
        --service)
            SERVICE="$2"
            shift 2
            ;;
        --lines)
            LINES="$2"
            shift 2
            ;;
        --type)
            BACKUP_TYPE="$2"
            shift 2
            ;;
        --clean)
            CLEAN_TARGET="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate inputs
if [[ ! "$ENVIRONMENT" =~ ^(local|vps)$ ]]; then
    echo "Error: environment must be 'local' or 'vps'"
    exit 1
fi

if [[ ! "$STAGE" =~ ^(dev|prod)$ ]]; then
    echo "Error: stage must be 'dev' or 'prod'"
    exit 1
fi

# Set root directory and env file path
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"

# Set Docker Compose profiles
COMPOSE_PROFILES="--profile $STAGE"
if [ "$ENVIRONMENT" = "vps" ]; then
    COMPOSE_PROFILES="$COMPOSE_PROFILES --profile vps"
fi
if [ "$STAGE" = "prod" ]; then
    COMPOSE_PROFILES="$COMPOSE_PROFILES --profile monitoring"
fi

# Setup environment
setup_env() {
    echo "Setting up $ENVIRONMENT-$STAGE environment..."
    
    # Create directory structure
    mkdir -p "$ROOT_DIR"/{data/{redis,prometheus,grafana,auction,stream,shape-l2,eliza,backups},logs}
    
    # Create monitoring directories if in prod
    if [ "$STAGE" = "prod" ]; then
        mkdir -p "$ROOT_DIR/monitoring/{prometheus,grafana/{dashboards,provisioning}}"
    fi
    
    # Check for example environment file
    EXAMPLE_ENV_FILE="$ROOT_DIR/.env.example"
    if [ ! -f "$EXAMPLE_ENV_FILE" ]; then
        echo "Error: .env.example file not found in root directory"
        exit 1
    fi

    # Create environment file if it doesn't exist
    if [ ! -f "$ENV_FILE" ]; then
        echo "Creating environment file: $ENV_FILE"
        cp "$EXAMPLE_ENV_FILE" "$ENV_FILE"
        
        # Update environment-specific variables
        sed -i "s/NODE_ENV=.*/NODE_ENV=$STAGE/" "$ENV_FILE"
        
        if [ "$STAGE" = "prod" ]; then
            sed -i "s/USE_MOCK_APIS=.*/USE_MOCK_APIS=false/" "$ENV_FILE"
            sed -i "s/USE_MOCK_BLOCKCHAIN=.*/USE_MOCK_BLOCKCHAIN=false/" "$ENV_FILE"
            sed -i "s/ENABLE_DEBUG_ENDPOINTS=.*/ENABLE_DEBUG_ENDPOINTS=false/" "$ENV_FILE"
            sed -i "s/LOG_LEVEL=.*/LOG_LEVEL=info/" "$ENV_FILE"
        fi
        
        chmod 600 "$ENV_FILE"
    fi

    echo "Setup complete! Use './run.sh start $ENVIRONMENT --stage $STAGE' to start services"
}

# Manage services
manage_services() {
    # Load environment variables
    if [ -f "$ENV_FILE" ]; then
        export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    fi

    case $1 in
        start)
            echo "Starting services..."
            docker-compose $COMPOSE_PROFILES up -d $SERVICE
            ;;
        stop)
            echo "Stopping services..."
            docker-compose down
            ;;
        restart)
            echo "Restarting services..."
            docker-compose down
            docker-compose $COMPOSE_PROFILES up -d $SERVICE
            ;;
        logs)
            if [ -n "$SERVICE" ]; then
                docker-compose logs -f --tail=$LINES $SERVICE
            else
                docker-compose logs -f --tail=$LINES
            fi
            ;;
        status)
            docker-compose ps
            ;;
    esac
}

# Create backup
create_backup() {
    BACKUP_DIR="$ROOT_DIR/data/backups/$ENVIRONMENT/$STAGE/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    case $BACKUP_TYPE in
        full)
            echo "Creating full backup..."
            tar -czf "$BACKUP_DIR/data.tar.gz" -C "$ROOT_DIR/data" .
            ;;
        db)
            echo "Creating database backup..."
            tar -czf "$BACKUP_DIR/redis.tar.gz" -C "$ROOT_DIR/data/redis" .
            ;;
        logs)
            echo "Creating logs backup..."
            tar -czf "$BACKUP_DIR/logs.tar.gz" -C "$ROOT_DIR/logs" .
            ;;
        *)
            echo "Invalid backup type: $BACKUP_TYPE"
            exit 1
            ;;
    esac
    
    echo "Backup created in: $BACKUP_DIR"
}

# Clean environment
clean_env() {
    case $CLEAN_TARGET in
        all)
            echo "Cleaning everything..."
            docker-compose down -v
            rm -rf "$ROOT_DIR/data"/*
            ;;
        docker)
            echo "Cleaning Docker resources..."
            docker-compose down -v
            ;;
        data)
            echo "Cleaning data directory..."
            rm -rf "$ROOT_DIR/data"/*
            ;;
        *)
            echo "Invalid clean target: $CLEAN_TARGET"
            exit 1
            ;;
    esac
    
    echo "Clean complete!"
}

# Main command execution
case $COMMAND in
    setup)
        setup_env
        ;;
    start|stop|restart|logs|status)
        manage_services $COMMAND
        ;;
    backup)
        create_backup
        ;;
    clean)
        clean_env
        ;;
    *)
        echo "Invalid command: $COMMAND"
        show_help
        exit 1
        ;;
esac 