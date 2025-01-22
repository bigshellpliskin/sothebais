#!/bin/bash

# Default values
ENV=${1:-prod}
BACKUP_TYPE=${2:-full}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Help message
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: ./backup.sh [env] [type]"
    echo "  env: Environment to backup (dev|prod). Defaults to prod"
    echo "  type: Backup type (full|db|logs). Defaults to full"
    exit 0
fi

# Load environment variables
if [ -f ".env.$ENV" ]; then
    export $(cat .env.$ENV | grep -v '^#' | xargs)
else
    echo "Error: .env.$ENV file not found"
    exit 1
fi

# Create backup directory
BACKUP_DIR="storage/backups/$ENV/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

# Backup function
backup_data() {
    local source=$1
    local target=$2
    
    if [ -d "$source" ]; then
        tar -czf "$target" -C "$source" .
        echo "Backed up $source to $target"
    else
        echo "Warning: Source directory $source not found"
    fi
}

# Backup Redis
backup_redis() {
    docker-compose exec -T redis redis-cli SAVE
    backup_data "storage/redis" "$BACKUP_DIR/redis.tar.gz"
}

# Full backup
backup_full() {
    # Backup all persistent data
    backup_data "storage/auction" "$BACKUP_DIR/auction.tar.gz"
    backup_data "storage/stream" "$BACKUP_DIR/stream.tar.gz"
    backup_data "storage/shape-l2" "$BACKUP_DIR/shape-l2.tar.gz"
    backup_data "storage/eliza" "$BACKUP_DIR/eliza.tar.gz"
    backup_data "characters" "$BACKUP_DIR/characters.tar.gz"
    
    # Backup Redis
    backup_redis
    
    # Backup monitoring data if in production
    if [ "$ENV" == "prod" ]; then
        backup_data "storage/prometheus" "$BACKUP_DIR/prometheus.tar.gz"
        backup_data "storage/grafana" "$BACKUP_DIR/grafana.tar.gz"
    fi
}

# Database-only backup
backup_db() {
    backup_redis
}

# Logs backup
backup_logs() {
    backup_data "storage/logs" "$BACKUP_DIR/logs.tar.gz"
}

# Execute backup based on type
case $BACKUP_TYPE in
    "full")
        echo "Performing full backup..."
        backup_full
        ;;
    "db")
        echo "Performing database-only backup..."
        backup_db
        ;;
    "logs")
        echo "Performing logs backup..."
        backup_logs
        ;;
    *)
        echo "Invalid backup type. Use 'full', 'db', or 'logs'"
        exit 1
        ;;
esac

# Create backup manifest
cat > "$BACKUP_DIR/manifest.txt" << EOF
Backup Information
-----------------
Environment: $ENV
Type: $BACKUP_TYPE
Timestamp: $TIMESTAMP
EOF

# Compress entire backup
cd storage/backups/$ENV
tar -czf "$TIMESTAMP.tar.gz" "$TIMESTAMP"
rm -rf "$TIMESTAMP"

# Upload to S3 if in production and AWS credentials are set
if [ "$ENV" == "prod" ] && [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
    echo "Uploading backup to S3..."
    aws s3 cp "$TIMESTAMP.tar.gz" "s3://$BACKUP_S3_BUCKET/$ENV/$TIMESTAMP.tar.gz"
    
    # Clean up old backups based on retention policy
    if [ ! -z "$BACKUP_RETENTION_DAYS" ]; then
        echo "Cleaning up old backups..."
        find . -name "*.tar.gz" -mtime +$BACKUP_RETENTION_DAYS -delete
        if [ ! -z "$BACKUP_S3_BUCKET" ]; then
            aws s3 ls "s3://$BACKUP_S3_BUCKET/$ENV/" | \
                awk '{print $4}' | \
                while read -r file; do
                    timestamp=$(echo "$file" | cut -d. -f1)
                    if [ $(( ($(date +%s) - $(date -d "${timestamp:0:8}" +%s)) / 86400 )) -gt $BACKUP_RETENTION_DAYS ]; then
                        aws s3 rm "s3://$BACKUP_S3_BUCKET/$ENV/$file"
                    fi
                done
        fi
    fi
fi

echo "Backup completed successfully!" 