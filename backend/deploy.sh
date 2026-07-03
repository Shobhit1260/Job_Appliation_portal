#!/bin/bash
set -euo pipefail

# Define variables
APP_DIR="/home/ubuntu/Job_Appliation_portal"
API_IMAGE="${DOCKER_USERNAME}/job-tracker-api:latest"

echo "Deploying to $APP_DIR..."
cd "$APP_DIR/backend"

# Create config files
cat <<EOF > docker-compose.ec2.yml
services:
  api:
    image: "$API_IMAGE"
    pull_policy: always
EOF

# Run deployment
docker login -u "$DOCKER_USERNAME" -p "$DOCKER_PASSWORD"
docker compose -f docker-compose.yml -f docker-compose.ec2.yml up -d
echo "Deployment Finished!"