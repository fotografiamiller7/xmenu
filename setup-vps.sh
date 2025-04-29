#!/bin/bash
# XMenu VPS Setup Script
# This script automates the setup of XMenu on a VPS

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

warning() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  error "Please run as root"
fi

# Configuration variables - CHANGE THESE
APP_NAME="xmenu"
DOMAIN="xmenu.yourdomain.com" # Change to your actual domain
NODE_VERSION="20" # Updated for Ubuntu 24.04 compatibility
DB_NAME="xmenu_db"
DB_USER="xmenu_user"
DB_PASSWORD="$(openssl rand -base64 16)" # Generate random password
APP_PORT="3000"

# Supabase Configuration
SUPABASE_URL="https://zuhwlqvwytqlpuwlfymc.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1aHdscXZ3eXRxbHB1d2xmeW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzMDkwNTEsImV4cCI6MjA1NDg4NTA1MX0.imgeTmOFwKlYtzWFDhPAso1zLVioaW-GMzRcA13vzZo"
SUPABASE_SERVICE_ROLE="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1aHdscXZ3eXRxbHB1d2xmeW1jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTMwOTA1MSwiZXhwIjoyMDU0ODg1MDUxfQ.A8vtI8Q5dkMDM2NXg-k5141zvh8NzwiSCwTKB8-fdVs"
JWT_SECRET="QUdj7kTL9RC09SnYb0ZfKLprGwbIMUH4IEYkJU/HxwvZOU/aUBDe+P/UPtZFMrGeJYh/+QZvRh0pg4YfNSlxTQ=="

# Paths
APP_DIR="/var/www/${APP_NAME}"
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"

log "Starting XMenu VPS setup..."

# Update system
log "Updating system packages..."
apt-get update && apt-get upgrade -y || error "Failed to update system packages"

# Install dependencies for Ubuntu 24.04
log "Installing dependencies for Ubuntu 24.04..."
apt-get install -y curl git nginx postgresql postgresql-contrib build-essential certbot python3-certbot-nginx || error "Failed to install dependencies"

# Setup Node.js
log "Setting up Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - || error "Failed to setup Node.js repository"
apt-get install -y nodejs || error "Failed to install Node.js"

# Install PM2 globally
log "Installing PM2 process manager..."
npm install -g pm2 || error "Failed to install PM2"

# Setup PostgreSQL
log "Setting up PostgreSQL database..."
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" || warning "Database user may already exist"
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" || warning "Database may already exist"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" || warning "Failed to grant privileges"

# Clone repository or create app directory
if [ ! -d "$APP_DIR" ]; then
  log "Creating application directory..."
  mkdir -p "$APP_DIR" || error "Failed to create application directory"
fi

# Set directory permissions
log "Setting directory permissions..."
chown -R www-data:www-data "$APP_DIR" || error "Failed to set directory permissions"

# Create .env file
log "Creating environment configuration..."
cat > "${APP_DIR}/.env" << EOF
# Database Configuration
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}

# Application Configuration
PORT=${APP_PORT}
NODE_ENV=production

# Supabase Configuration
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
REACT_APP_SUPABASE_URL=${SUPABASE_URL}
REACT_APP_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE}
JWT_SECRET=${JWT_SECRET}
EOF

# Configure Nginx
log "Configuring Nginx..."
cat > "$NGINX_CONF" << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    
    # Root directory for static files
    root ${APP_DIR}/dist;
    index index.html;

    # API proxy for Supabase Edge Functions
    location /functions/ {
        proxy_pass ${SUPABASE_URL}/functions/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Handle SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
EOF

# Enable site and restart Nginx
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/ || error "Failed to enable Nginx site"
systemctl restart nginx || error "Failed to restart Nginx"

# Setup SSL with Certbot (optional)
log "Would you like to setup SSL with Let's Encrypt? (y/n)"
read -r setup_ssl

if [ "$setup_ssl" = "y" ]; then
  log "Installing Certbot..."
  apt-get install -y certbot python3-certbot-nginx || error "Failed to install Certbot"
  
  log "Setting up SSL certificate..."
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@example.com || error "Failed to setup SSL certificate"
fi

# Create deployment and build scripts
log "Creating deployment and build scripts..."
cat > "${APP_DIR}/build.sh" << 'EOF'
#!/bin/bash
set -e

# Install dependencies
npm ci

# Build the application
npm run build
EOF

cat > "${APP_DIR}/deploy.sh" << 'EOF'
#!/bin/bash
set -e

# Pull latest changes if using git
if [ -d ".git" ]; then
  git pull
fi

# Run build script
./build.sh

# Restart the application
pm2 restart xmenu || pm2 start npm --name "xmenu" -- start

# Save PM2 configuration
pm2 save

echo "Deployment completed successfully!"
EOF

chmod +x "${APP_DIR}/deploy.sh" || error "Failed to make deployment script executable"
chmod +x "${APP_DIR}/build.sh" || error "Failed to make build script executable"

# Setup PM2 to start on boot
log "Setting up PM2 to start on boot..."
pm2 startup || warning "Failed to setup PM2 startup script"
env PATH=$PATH:/usr/bin pm2 startup systemd -u www-data --hp /var/www || warning "Failed to setup PM2 startup script"

# Print summary
log "Setting up cron job for daily backups..."
cat > "/etc/cron.d/xmenu-backup" << EOF
# Daily backup at 2 AM
0 2 * * * root /var/www/${APP_NAME}/backup.sh >> /var/log/xmenu-backup.log 2>&1
EOF

# Copy backup script to app directory
log "Creating backup script..."
cp /tmp/backup-xmenu.sh "${APP_DIR}/backup.sh" || warning "Failed to copy backup script"
chmod +x "${APP_DIR}/backup.sh" || warning "Failed to make backup script executable"

# Create logs directory
mkdir -p /var/log/xmenu || warning "Failed to create logs directory"
log "XMenu VPS setup completed successfully!"
echo ""
echo "Summary:"
echo "=========="
echo "Application directory: ${APP_DIR}"
echo "Database name: ${DB_NAME}"
echo "Database user: ${DB_USER}"
echo "Database password: ${DB_PASSWORD}"
echo "Application URL: http://${DOMAIN}"
echo ""
echo "Next steps:"
echo "1. Upload your application files to ${APP_DIR}"
echo "2. Run 'cd ${APP_DIR} && npm install && npm run build'"
echo "3. Start the application with 'pm2 start npm --name \"${APP_NAME}\" -- start'"
echo ""
echo "For future deployments, use the deploy.sh script in ${APP_DIR}"
echo ""

# Save database credentials to a secure file
echo "Database credentials have been saved to /root/.${APP_NAME}_db_credentials"
cat > "/root/.${APP_NAME}_db_credentials" << EOF
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE=${SUPABASE_SERVICE_ROLE}
JWT_SECRET=${JWT_SECRET}
EOF
chmod 600 "/root/.${APP_NAME}_db_credentials" || warning "Failed to secure credentials file"

# Create a systemd service for the application
log "Creating systemd service..."
cat > "/etc/systemd/system/${APP_NAME}.service" << EOF
[Unit]
Description=XMenu Application
After=network.target

[Service]
User=www-data
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${APP_NAME}.service" || warning "Failed to enable systemd service"

log "Setup complete!"