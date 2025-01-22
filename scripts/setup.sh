#!/bin/bash

# Default to local environment
ENVIRONMENT=${1:-local}

# Help message
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: ./setup.sh [environment]"
    echo "Environments:"
    echo "  local       Local development environment (default)"
    echo "  vps-dev     VPS development environment"
    echo "  vps-prod    VPS production environment"
    exit 0
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(local|vps-dev|vps-prod)$ ]]; then
    echo "Invalid environment. Use 'local', 'vps-dev', or 'vps-prod'"
    exit 1
fi

# Set environment file based on environment
case $ENVIRONMENT in
    "local")
        ENV_FILE=.env.dev
        ;;
    "vps-dev")
        ENV_FILE=.env.vps-dev
        ;;
    "vps-prod")
        ENV_FILE=.env.prod
        ;;
esac

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    export $(cat $ENV_FILE | grep -v '^#' | xargs)
else
    echo "Creating $ENV_FILE from example..."
    cp .env.example "$ENV_FILE"
fi

echo "Setting up $ENVIRONMENT environment..."

# Create necessary directories
mkdir -p storage/{redis,prometheus,grafana,auction,stream,shape-l2,eliza/{db,data,cache}}
mkdir -p monitoring/{prometheus,grafana/{dashboards,provisioning}}
mkdir -p eliza/characters

# Set correct permissions
chmod -R 755 storage
chmod -R 755 monitoring
chmod -R 755 eliza/characters

# Environment-specific setup
case $ENVIRONMENT in
    "local")
        # Install development dependencies
        npm install -g pnpm
        pnpm install

        # Setup git hooks
        if [ -d ".git" ]; then
            cp scripts/hooks/* .git/hooks/
            chmod +x .git/hooks/*
        fi

        # Create development SSL certificates (self-signed)
        mkdir -p nginx/ssl
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/dev.key -out nginx/ssl/dev.crt \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        ;;
        
    "vps-dev")
        # VPS development specific setup
        chmod 600 "$ENV_FILE"
        mkdir -p nginx/ssl
        chmod 700 nginx/ssl
        
        # Install dependencies
        npm install -g pnpm
        pnpm install
        ;;
        
    "vps-prod")
        # Production specific setup
        chmod 600 "$ENV_FILE"
        mkdir -p nginx/ssl
        chmod 700 nginx/ssl
        
        # Ensure production environment is secure
        find . -type f -name "*.key" -exec chmod 600 {} \;
        find . -type f -name "*.crt" -exec chmod 644 {} \;
        ;;
esac

echo "Setup complete for $ENVIRONMENT environment!"
echo "Next steps:"
case $ENVIRONMENT in
    "local")
        echo "1. Edit $ENV_FILE with your development settings"
        echo "2. Run: ./scripts/dev.sh start local"
        ;;
    "vps-dev")
        echo "1. Edit $ENV_FILE with your VPS development settings"
        echo "2. Ensure SSL certificates are in place"
        echo "3. Run: ./scripts/deploy.sh vps-dev"
        ;;
    "vps-prod")
        echo "1. Edit $ENV_FILE with your production settings"
        echo "2. Ensure SSL certificates are in place"
        echo "3. Run: ./scripts/deploy.sh vps-prod"
        ;;
esac 