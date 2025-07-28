# NGINX MCP Server - Setup Guide

## Quick Setup Instructions

### 1. Prerequisites
- Node.js installed on Windows
- Docker Desktop running
- Claude Desktop installed

### 2. Installation
```bash
git clone https://github.com/DylenTurnbull/mcp-server-prototype.git
cd mcp-server-prototype
npm install
```

### 3. Configuration (Optional)
```bash
# Copy environment template and customize if needed
cp .env.example .env
# Edit .env to change NGINX host/port if different from localhost:8080
```

### 4. Start NGINX Server
```bash
docker compose up nginx -d
```

### 5. Configure Claude Desktop
Copy the contents of `claude-desktop-config.json` to:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Important**: Update the paths in the configuration to match your installation directory.

### 6. Restart Claude Desktop
Close and reopen Claude Desktop completely.

### 7. Test the Integration
Ask Claude Desktop: "What NGINX tools do you have available?"

## Available Tools
- `nginx_connectivity_test` - Test server connectivity with timestamps
- `nginx_simple_status` - Get raw NGINX status metrics
- `nginx_server_info` - Get server configuration and environment info
- `nginx_get_config` - Read the complete NGINX configuration file

## Configuration Options

### Environment Variables
- `NGINX_HOST` (default: localhost) - Target NGINX server
- `NGINX_PORT` (default: 8080) - Target NGINX port
- `NODE_ENV` - Node.js environment setting

### Monitoring Different NGINX Instances
To monitor a different NGINX server:
1. Create a `.env` file with custom `NGINX_HOST` and `NGINX_PORT`
2. Ensure the target NGINX has `/status` endpoint enabled
3. Restart Claude Desktop

## Troubleshooting
- Ensure NGINX is running: `docker compose ps`
- Check Claude Desktop logs in `%APPDATA%\Claude\logs\`
- Verify Node.js is in system PATH: `node --version`
- Test connectivity: `curl http://localhost:8080/status`
