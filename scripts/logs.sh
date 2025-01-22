#!/bin/bash

# Default service is eliza if none specified
SERVICE=${1:-eliza}

# Follow logs for the specified service
docker compose logs -f $SERVICE 