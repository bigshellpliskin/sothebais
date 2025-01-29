#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Help message
show_help() {
    echo "NFT Auction System Management Script"
    echo ""
    echo "Usage: ./run.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  setup     - Initialize environment and create required files/folders"
    echo "  start     - Start all or specific services"
    echo "  stop      - Stop all services"
    echo "  restart   - Restart all or specific services"
    echo "  logs      - View service logs"
    echo "  status    - Check service status"
    echo ""
    echo "Options:"
    echo "  --stage [stage]     - Deployment stage (dev|prod) - default: dev"
    echo "  --service [name]    - Target specific service"
    echo "  --lines [number]    - Number of log lines to show"
    echo ""
    echo "Examples:"
    echo "  ./run.sh setup --stage dev"
    echo "  ./run.sh start --stage prod"
    echo "  ./run.sh logs --service auction-manager --lines 100"
}

# Check for help flag
if [ "$1" == "--help" ] || [ "$1" == "-h" ] || [ -z "$1" ]; then
    show_help
    exit 0
fi

# Parse main arguments
COMMAND=$1
shift

# Default values
STAGE="dev"
SERVICE=""
LINES="100"

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
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate stage
if [[ ! "$STAGE" =~ ^(dev|prod)$ ]]; then
    echo -e "${RED}Error: stage must be 'dev' or 'prod'${NC}"
    exit 1
fi

# Set root directory and env file path
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"

# Function to create directory if it doesn't exist
create_dir() {
    local dir=$1
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo -e "${GREEN}Created directory:${NC} $dir"
    else
        echo -e "${YELLOW}Directory already exists:${NC} $dir"
    fi
}

# Setup environment
setup_env() {
    echo -e "${GREEN}Setting up $STAGE environment...${NC}"
    
    # Create data directories for persistent storage
    echo -e "\n${GREEN}Setting up data directories...${NC}"
    local data_dirs=(
        "data/traefik/letsencrypt"
        "data/auction"
        "data/event-handler"
        "logs"
    )
    
    for dir in "${data_dirs[@]}"; do
        create_dir "$ROOT_DIR/$dir"
    done

    # Setup Traefik SSL
    local acme_file="$ROOT_DIR/data/traefik/letsencrypt/acme.json"
    if [ ! -f "$acme_file" ]; then
        touch "$acme_file"
        echo -e "${GREEN}Created acme.json${NC}"
    fi
    chmod 600 "$acme_file"
    
    # Create environment file if it doesn't exist
    if [ ! -f "$ENV_FILE" ]; then
        if [ ! -f "$ROOT_DIR/.env.example" ]; then
            echo -e "${RED}Error: .env.example file not found${NC}"
            exit 1
        fi
        echo -e "\n${GREEN}Creating environment file from example...${NC}"
        cp "$ROOT_DIR/.env.example" "$ENV_FILE"
        chmod 600 "$ENV_FILE"
        
        # Update stage-specific variables
        sed -i "s/NODE_ENV=.*/NODE_ENV=$STAGE/" "$ENV_FILE"
        if [ "$STAGE" = "prod" ]; then
            sed -i "s/LOG_LEVEL=.*/LOG_LEVEL=info/" "$ENV_FILE"
        fi
    else
        echo -e "${YELLOW}Environment file already exists${NC}"
    fi

    echo -e "\n${GREEN}Setup complete! Use './run.sh start --stage $STAGE' to start services${NC}"
}

# Manage services
manage_services() {
    # Load environment variables
    if [ -f "$ENV_FILE" ]; then
        export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    fi

    local compose_opts="--profile $STAGE"
    [ "$STAGE" = "prod" ] && compose_opts="$compose_opts --profile monitoring"

    case $1 in
        start)
            echo -e "${GREEN}Starting services...${NC}"
            docker compose $compose_opts up -d $SERVICE
            ;;
        stop)
            echo -e "${YELLOW}Stopping services...${NC}"
            docker compose down
            ;;
        restart)
            echo -e "${YELLOW}Restarting services...${NC}"
            docker compose down
            docker compose $compose_opts up -d $SERVICE
            ;;
        logs)
            if [ -n "$SERVICE" ]; then
                docker compose logs -f --tail=$LINES $SERVICE
            else
                docker compose logs -f --tail=$LINES
            fi
            ;;
        status)
            docker compose ps
            ;;
    esac
}

# Main command execution
case $COMMAND in
    setup)
        setup_env
        ;;
    start|stop|restart|logs|status)
        manage_services $COMMAND
        ;;
    *)
        echo -e "${RED}Invalid command: $COMMAND${NC}"
        show_help
        exit 1
        ;;
esac 