#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required tools
if ! command_exists docker; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Default position configuration
POSITION=${POSITION:-"default"}
ENV_FILE=".env.${POSITION}"

# Function to validate position configuration
validate_position() {
    if [ ! -f "$ENV_FILE" ]; then
        echo "Error: Position configuration file $ENV_FILE not found"
        echo "Available positions:"
        ls -1 .env.* 2>/dev/null | sed 's/\.env\./  /'
        exit 1
    fi
}

# Function to start development environment
start_dev() {
    echo "Starting development environment for position: $POSITION"
    validate_position
    
    # Export position-specific environment variables
    export $(cat $ENV_FILE | grep -v '^#' | xargs)
    
    # Start with position-specific config
    docker-compose --env-file $ENV_FILE up --build -d
    
    echo "Development environment started for position: $POSITION"
    echo "Access the application at http://localhost:3000"
    echo "Health check endpoint: http://localhost:3000/health"
    echo "State snapshot endpoint: http://localhost:3000/state"
    echo "Position configuration: $ENV_FILE"
}

# Function to stop development environment
stop_dev() {
    echo "Stopping development environment..."
    docker-compose down
}

# Function to show logs
show_logs() {
    docker-compose logs -f
}

# Function to run tests
run_tests() {
    echo "Running tests..."
    validate_position
    docker-compose --env-file $ENV_FILE exec app npm test
}

# Function to list available positions
list_positions() {
    echo "Available positions:"
    ls -1 .env.* 2>/dev/null | sed 's/\.env\./  /'
}

# Function to show current position status
show_status() {
    echo "Current position: $POSITION"
    echo "Using config file: $ENV_FILE"
    
    if [ -f "$ENV_FILE" ]; then
        echo "Configuration variables:"
        grep -v '^#' "$ENV_FILE" | sed 's/^/  /'
    else
        echo "Warning: Configuration file not found"
    fi
    
    echo ""
    echo "Container status:"
    docker-compose ps
}

# Function to show help
show_help() {
    echo "Usage: ./dev.sh [command] [position]"
    echo ""
    echo "Commands:"
    echo "  start    Start development environment"
    echo "  stop     Stop development environment"
    echo "  logs     Show logs"
    echo "  test     Run tests"
    echo "  status   Show current position status"
    echo "  list     List available positions"
    echo "  help     Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  POSITION  Set the position configuration (default: 'default')"
    echo ""
    echo "Example:"
    echo "  POSITION=stream1 ./dev.sh start"
}

# Parse command line arguments
case "$1" in
    start)
        start_dev
        ;;
    stop)
        stop_dev
        ;;
    logs)
        show_logs
        ;;
    test)
        run_tests
        ;;
    status)
        show_status
        ;;
    list)
        list_positions
        ;;
    help)
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        show_help
        exit 1
        ;;
esac 