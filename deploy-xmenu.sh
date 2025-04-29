#!/bin/bash
# XMenu Deployment Script
# This script deploys the XMenu application to a configured VPS

set -e # Exit on error

# Color codes for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Log function
log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
  exit 1
}

# Configuration
SERVER_USER="root"
SERVER_IP="your.server.ip" # Change to your server IP
APP_DIR="/var/www/xmenu" # Application directory on server
REPO_URL="" # Leave empty to deploy local files instead of Git repository
USE_GITHUB_ACTIONS=false # Set to true if using GitHub Actions for CI/CD

# Check if SSH key exists
if [ ! -f ~/.ssh/id_rsa ]; then
  log "SSH key not found. Generating new SSH key..."
  ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N "" || error "Failed to generate SSH key"
  
  log "Please add this public key to your server's authorized_keys file:"
  cat ~/.ssh/id_rsa.pub
  
  log "Press Enter when you've added the key to continue..."
  read -r
fi

# Check connection to server
log "Testing connection to server..."
ssh -o StrictHostKeyChecking=no "${SERVER_USER}@${SERVER_IP}" "echo Connection successful" || error "Failed to connect to server"

# Check if the app directory exists on the server
log "Checking if application directory exists..."
if ! ssh "${SERVER_USER}@${SERVER_IP}" "[ -d ${APP_DIR} ]"; then
  log "Application directory does not exist. Running setup script..."
  
  # Copy setup script to server
  scp setup-vps.sh "${SERVER_USER}@${SERVER_IP}:/tmp/setup-vps.sh" || error "Failed to copy setup script"
  scp backup-xmenu.sh "${SERVER_USER}@${SERVER_IP}:/tmp/backup-xmenu.sh" || error "Failed to copy backup script"
  
  # Make script executable and run it
  ssh "${SERVER_USER}@${SERVER_IP}" "chmod +x /tmp/setup-vps.sh && /tmp/setup-vps.sh" || error "Failed to run setup script"
fi

# Deploy application
log "Deploying application to server..."

# Check if we should use Git or local files
if [ -n "$REPO_URL" ] && [ "$USE_GITHUB_ACTIONS" = false ]; then
  log "Deploying from Git repository..."
  ssh "${SERVER_USER}@${SERVER_IP}" "cd ${APP_DIR} && git clone ${REPO_URL} . || git pull" || error "Failed to pull from repository"
else
  # Deploy local files
  log "Deploying local files..."
  rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' ./ "${SERVER_USER}@${SERVER_IP}:${APP_DIR}/" || error "Failed to sync files"
fi

# Install dependencies and build
log "Installing dependencies and building application..."
ssh "${SERVER_USER}@${SERVER_IP}" "cd ${APP_DIR} && ./build.sh" || error "Failed to build application"

# Start or restart application
log "Starting application..."
ssh "${SERVER_USER}@${SERVER_IP}" "cd ${APP_DIR} && pm2 restart xmenu || pm2 start npm --name \"xmenu\" -- start" || warning "Failed to start with PM2, trying systemd..."

# Try systemd if PM2 fails
if ssh "${SERVER_USER}@${SERVER_IP}" "systemctl is-active --quiet xmenu"; then
  ssh "${SERVER_USER}@${SERVER_IP}" "systemctl restart xmenu" || error "Failed to restart application with systemd"
  log "Application restarted with systemd"
else
  ssh "${SERVER_USER}@${SERVER_IP}" "systemctl start xmenu" || error "Failed to start application with systemd"
  log "Application started with systemd"
fi

# Save PM2 configuration
ssh "${SERVER_USER}@${SERVER_IP}" "pm2 save" || warning "Failed to save PM2 configuration"

# Run a test backup
log "Running test backup..."
ssh "${SERVER_USER}@${SERVER_IP}" "${APP_DIR}/backup.sh" || warning "Test backup failed"

log "Deployment completed successfully!"