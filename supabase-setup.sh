#!/bin/bash
# XMenu Supabase Setup Script
# This script configures Supabase Edge Functions and other Supabase-related settings

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

# Configuration
SUPABASE_URL="https://zuhwlqvwytqlpuwlfymc.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1aHdscXZ3eXRxbHB1d2xmeW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzMDkwNTEsImV4cCI6MjA1NDg4NTA1MX0.imgeTmOFwKlYtzWFDhPAso1zLVioaW-GMzRcA13vzZo"
SUPABASE_SERVICE_ROLE="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1aHdscXZ3eXRxbHB1d2xmeW1jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTMwOTA1MSwiZXhwIjoyMDU0ODg1MDUxfQ.A8vtI8Q5dkMDM2NXg-k5141zvh8NzwiSCwTKB8-fdVs"
JWT_SECRET="QUdj7kTL9RC09SnYb0ZfKLprGwbIMUH4IEYkJU/HxwvZOU/aUBDe+P/UPtZFMrGeJYh/+QZvRh0pg4YfNSlxTQ=="
APP_DIR="/var/www/xmenu"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  error "Please run as root"
fi

log "Starting Supabase configuration..."

# Create Supabase configuration directory
mkdir -p "${APP_DIR}/supabase" || error "Failed to create Supabase directory"
mkdir -p "${APP_DIR}/supabase/functions" || error "Failed to create Supabase functions directory"

# Create Supabase environment file
log "Creating Supabase environment file..."
cat > "${APP_DIR}/.env.supabase" << EOF
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE}
JWT_SECRET=${JWT_SECRET}
EOF

# Create a script to sync Edge Functions
log "Creating Edge Functions sync script..."
cat > "${APP_DIR}/sync-edge-functions.sh" << 'EOF'
#!/bin/bash
set -e

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

# Load environment variables
source .env.supabase

# Check if curl is installed
if ! command -v curl &> /dev/null; then
  error "curl is required but not installed. Please install curl."
fi

# Get list of functions from local directory
FUNCTIONS_DIR="./supabase/functions"
if [ ! -d "$FUNCTIONS_DIR" ]; then
  error "Functions directory not found: $FUNCTIONS_DIR"
fi

log "Syncing Edge Functions..."

# Loop through each function directory
for FUNC_DIR in "$FUNCTIONS_DIR"/*; do
  if [ -d "$FUNC_DIR" ]; then
    FUNC_NAME=$(basename "$FUNC_DIR")
    FUNC_FILE="$FUNC_DIR/index.ts"
    
    if [ -f "$FUNC_FILE" ]; then
      log "Deploying function: $FUNC_NAME"
      
      # Read function code
      FUNC_CODE=$(cat "$FUNC_FILE")
      
      # Create JSON payload
      JSON_PAYLOAD=$(cat <<EOF
{
  "name": "$FUNC_NAME",
  "code": $(jq -Rs . <<< "$FUNC_CODE")
}
EOF
)
      
      # Deploy function using Supabase API
      RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -d "$JSON_PAYLOAD" \
        "$SUPABASE_URL/functions/v1/deploy")
      
      echo "$RESPONSE" | grep -q "error" && error "Failed to deploy function: $FUNC_NAME" || log "Function deployed: $FUNC_NAME"
    else
      log "Skipping $FUNC_NAME: No index.ts file found"
    fi
  fi
done

log "Edge Functions sync completed successfully!"
EOF

chmod +x "${APP_DIR}/sync-edge-functions.sh" || error "Failed to make Edge Functions sync script executable"

# Create a script to test Edge Functions
log "Creating Edge Functions test script..."
cat > "${APP_DIR}/test-edge-functions.sh" << 'EOF'
#!/bin/bash
set -e

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

# Load environment variables
source .env.supabase

# Check if curl is installed
if ! command -v curl &> /dev/null; then
  error "curl is required but not installed. Please install curl."
fi

# Get list of functions from local directory
FUNCTIONS_DIR="./supabase/functions"
if [ ! -d "$FUNCTIONS_DIR" ]; then
  error "Functions directory not found: $FUNCTIONS_DIR"
fi

log "Testing Edge Functions..."

# Loop through each function directory
for FUNC_DIR in "$FUNCTIONS_DIR"/*; do
  if [ -d "$FUNC_DIR" ]; then
    FUNC_NAME=$(basename "$FUNC_DIR")
    
    log "Testing function: $FUNC_NAME"
    
    # Test function using Supabase API
    RESPONSE=$(curl -s \
      -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
      "$SUPABASE_URL/functions/v1/$FUNC_NAME")
    
    echo "Response: $RESPONSE"
  fi
done

log "Edge Functions testing completed!"
EOF

chmod +x "${APP_DIR}/test-edge-functions.sh" || error "Failed to make Edge Functions test script executable"

# Create a script to monitor Edge Functions
log "Creating Edge Functions monitoring script..."
cat > "${APP_DIR}/monitor-edge-functions.sh" << 'EOF'
#!/bin/bash
set -e

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

# Load environment variables
source .env.supabase

# Check if curl is installed
if ! command -v curl &> /dev/null; then
  error "curl is required but not installed. Please install curl."
fi

log "Monitoring Edge Functions..."

# Get list of functions
RESPONSE=$(curl -s \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/functions/v1/")

echo "$RESPONSE"

log "Edge Functions monitoring completed!"
EOF

chmod +x "${APP_DIR}/monitor-edge-functions.sh" || error "Failed to make Edge Functions monitoring script executable"

log "Supabase configuration completed successfully!"
echo ""
echo "Supabase Configuration Summary:"
echo "=============================="
echo "Supabase URL: ${SUPABASE_URL}"
echo "Environment file: ${APP_DIR}/.env.supabase"
echo "Edge Functions sync script: ${APP_DIR}/sync-edge-functions.sh"
echo "Edge Functions test script: ${APP_DIR}/test-edge-functions.sh"
echo "Edge Functions monitoring script: ${APP_DIR}/monitor-edge-functions.sh"
echo ""
echo "To sync Edge Functions, run:"
echo "cd ${APP_DIR} && ./sync-edge-functions.sh"
echo ""

log "Setup complete!"