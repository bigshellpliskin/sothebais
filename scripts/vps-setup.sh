#!/bin/bash

# Update system
apt-get update && apt-get upgrade -y

# Install Docker and Docker Compose
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up Docker repository
echo \
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create necessary directories
mkdir -p storage/{redis,prometheus,grafana,auction,stream,shape-l2,eliza/{db,data,cache}}
mkdir -p monitoring/{prometheus,grafana/{dashboards,provisioning}}

# Set proper permissions
chown -R 472:472 storage/grafana  # Grafana user needs write permissions

# Install useful monitoring tools
apt-get install -y \
    htop \
    iftop \
    net-tools \
    nmon

echo "VPS setup completed! You can now deploy the application." 