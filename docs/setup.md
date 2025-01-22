env
Traefik Configuration
ACME_EMAIL=your-email@domain.com
MONITORING_DOMAIN=your-monitoring-domain.com
Redis Configuration
REDIS_PASSWORD=your-secure-password
Twitter Credentials (for Stream Manager)
TWITTER_USERNAME=your-twitter-username
TWITTER_PASSWORD=your-twitter-password
TWITTER_EMAIL=your-twitter-email
Shape L2 Configuration
WALLET_SECRET_SALT=your-secure-salt
SOL_RPC_URL=https://api.mainnet-beta.solana.com
ElizaOS Configuration
DISCORD_APPLICATION_ID=your-discord-app-id
DISCORD_API_TOKEN=your-discord-token
ELEVENLABS_XI_API_KEY=your-elevenlabs-key
TEE_MODE=production
Grafana Configuration
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your-secure-password
bash
mkdir -p storage/{traefik/letsencrypt,auction,stream,shape-l2,redis,prometheus,grafana}
mkdir -p storage/eliza/{db,data,cache}
mkdir -p monitoring/{prometheus,grafana/{dashboards,provisioning}}
bash
./scripts/build.sh
bash
docker network create --driver overlay --attachable auction_net
bash
docker compose up -d
bash
docker compose ps
bash
View logs for all services
docker compose logs
View logs for specific service
docker compose logs [service-name]
Follow logs in real-time
docker compose logs -f [service-name]
bash
git pull origin main
bash
./scripts/build.sh
bash
docker compose up -d
bash
Stop all services
docker compose down
Stop and remove volumes
docker compose down -v
I've created a properly formatted markdown file that can be saved as SETUP.md in your project root. This document provides clear instructions for setting up and running your application using Docker and the associated scripts.