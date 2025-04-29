# XMenu VPS Setup and Deployment

This repository contains scripts to automate the setup and deployment of XMenu on a VPS (Virtual Private Server).

## Files Included

1. `setup-vps.sh` - Initial server setup script
2. `deploy-xmenu.sh` - Deployment script for XMenu
3. `nginx-xmenu.conf` - Nginx configuration for XMenu
4. `backup-xmenu.sh` - Backup script for database and application files
5. `supabase-setup.sh` - Supabase configuration script

## Prerequisites

- A VPS running Ubuntu 24.04.2 LTS x86_64 (Py3.12.3)
- Root access to the VPS
- A domain name pointing to your VPS (for SSL setup)
- Supabase project (already configured)

## Setup Instructions

### 1. Initial Server Setup

1. Upload the `setup-vps.sh` script to your server:
   ```
   scp setup-vps.sh root@your-server-ip:/tmp/
   ```

2. SSH into your server:
   ```
   ssh root@your-server-ip
   ```

3. Make the script executable and run it:
   ```
   chmod +x /tmp/setup-vps.sh
   /tmp/setup-vps.sh
   ```

4. Follow the prompts to complete the setup.

### 1.1 Supabase Configuration

After the initial setup, configure Supabase:

1. Upload the `supabase-setup.sh` script to your server:
   ```
   scp supabase-setup.sh root@your-server-ip:/tmp/
   ```

2. Make it executable and run it:
   ```
   ssh root@your-server-ip "chmod +x /tmp/supabase-setup.sh && /tmp/supabase-setup.sh"
   ```

### 2. Deployment

1. Edit the `deploy-xmenu.sh` script to update:
   - `SERVER_IP` - Your server's IP address
   - `REPO_URL` - Your Git repository URL (if using Git)

2. Run the deployment script:
   ```
   ./deploy-xmenu.sh
   ```

### 3. Nginx Configuration

1. Upload the Nginx configuration file to your server:
   ```
   scp nginx-xmenu.conf root@your-server-ip:/etc/nginx/sites-available/xmenu
   ```

2. Create a symbolic link to enable the site:
   ```
   ssh root@your-server-ip "ln -sf /etc/nginx/sites-available/xmenu /etc/nginx/sites-enabled/"
   ```

3. Test and reload Nginx:
   ```
   ssh root@your-server-ip "nginx -t && systemctl reload nginx"
   ```

### 4. Setting Up Backups

1. Upload the backup script to your server:
   ```
   scp backup-xmenu.sh root@your-server-ip:/root/
   ```

2. Make it executable:
   ```
   ssh root@your-server-ip "chmod +x /root/backup-xmenu.sh"
   ```

3. Set up a cron job to run daily backups:
   ```
   ssh root@your-server-ip "echo '0 2 * * * /root/backup-xmenu.sh >> /var/log/xmenu-backup.log 2>&1' | crontab -"
   ```

## Maintenance

### Updating the Application

To update the application, run the deployment script again:
```
./deploy-xmenu.sh
```

### Manual Backup

To manually create a backup, run:
```
ssh root@your-server-ip "/root/backup-xmenu.sh"
```

### Checking Logs

Application logs:
```
ssh root@your-server-ip "pm2 logs xmenu"
```

Nginx access logs:
```
ssh root@your-server-ip "tail -f /var/log/nginx/xmenu.access.log"
```

Nginx error logs:
```
ssh root@your-server-ip "tail -f /var/log/nginx/xmenu.error.log"
```

## Security Considerations

- Random database password is generated during setup
- SSL is configured with Let's Encrypt for secure HTTPS
- Database and Supabase credentials are stored in protected files
- Nginx is configured with security headers and CORS settings
- JWT secret is properly configured for authentication
- Systemd service runs with limited privileges

## Troubleshooting

If you encounter issues:

1. Check the application logs:
   ```
   pm2 logs xmenu
   ```

2. Check the Nginx error logs:
   ```
   tail -f /var/log/nginx/xmenu.error.log
   ```

3. Verify the application is running:
   ```
   pm2 status
   ```

4. Check if the database is running:
   ```
   systemctl status postgresql