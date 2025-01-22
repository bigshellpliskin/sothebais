#!/bin/bash

# Help message
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: ./cleanup.sh [options]"
    echo ""
    echo "Options:"
    echo "  --all        Clean everything (workspace and Docker)"
    echo "  --docker     Clean only Docker resources"
    echo "  --workspace  Clean only workspace (node_modules, dist)"
    echo "  --compose    Remove Docker compose files"
    exit 0
fi

CLEAN_ALL=0
CLEAN_DOCKER=0
CLEAN_WORKSPACE=0
CLEAN_COMPOSE=0

# Parse arguments
if [ $# -eq 0 ]; then
    CLEAN_ALL=1
else
    for arg in "$@"; do
        case $arg in
            --all)
                CLEAN_ALL=1
                ;;
            --docker)
                CLEAN_DOCKER=1
                ;;
            --workspace)
                CLEAN_WORKSPACE=1
                ;;
            --compose)
                CLEAN_COMPOSE=1
                ;;
            *)
                echo "Invalid option: $arg"
                echo "Use --help to see available options"
                exit 1
                ;;
        esac
    done
fi

# If --all is specified, set all flags
if [ $CLEAN_ALL -eq 1 ]; then
    CLEAN_DOCKER=1
    CLEAN_WORKSPACE=1
    CLEAN_COMPOSE=1
fi

# Clean Docker resources
if [ $CLEAN_DOCKER -eq 1 ]; then
    echo "Cleaning Docker resources..."
    
    # Stop all containers
    docker compose down 2>/dev/null || true
    
    # Remove all volumes
    docker compose down -v 2>/dev/null || true
    
    # Remove unused Docker resources
    docker system prune -f
    
    echo "Docker resources cleaned!"
fi

# Clean workspace
if [ $CLEAN_WORKSPACE -eq 1 ]; then
    echo "Cleaning workspace..."
    
    # Remove node_modules and dist directories
    find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
    find . -type d -name "dist" -exec rm -rf {} + 2>/dev/null || true
    
    # Clean package manager cache
    pnpm store prune || true
    
    echo "Workspace cleaned!"
fi

# Clean compose files
if [ $CLEAN_COMPOSE -eq 1 ]; then
    echo "Removing Docker compose files..."
    
    # Remove generated compose files
    rm -f docker-compose.vps-dev.yaml
    rm -f docker-compose.prod.yaml
    
    echo "Docker compose files removed!"
fi

echo "Cleanup completed!" 