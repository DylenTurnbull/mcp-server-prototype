# NGINX MCP Server

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://docs.docker.com/compose/)

A **Model Context Protocol (MCP)** server that provides AI assistants with tools for monitoring and managing NGINX instances. Built with the official MCP SDK and tested with Claude Desktop.

## Features

- **🔍 Real-time Monitoring**: Live NGINX status and connection metrics
- **📄 Configuration Access**: Retrieve and analyze NGINX config files  
- **⚡ Health Checks**: Built-in connectivity testing with timestamps
- **🛠️ MCP Compliant**: Built with official SDK v1.15.1
- **🐳 Containerized**: Complete Docker setup with NGINX instance

## Quick Setup

### Prerequisites
- Node.js 18+
- Docker Desktop
- Claude Desktop

### Installation
```bash
git clone https://github.com/DylenTurnbull/mcp-server-prototype.git
cd mcp-server-prototype
npm install
```

### Start NGINX Server
```bash
docker compose up nginx -d
```

### Configure Claude Desktop
Add to your Claude Desktop config file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "nginx-mcp-server": {
      "command": "node",
      "args": ["./src/index.js"],
      "cwd": "<FULL_PATH_TO_PROJECT>"
    }
  }
}
```

Replace `<FULL_PATH_TO_PROJECT>` with your actual project directory path.

### Test Integration
1. Restart Claude Desktop
2. Ask Claude: "What NGINX tools do you have available?"

## Available Tools

| Tool | Description |
|------|-------------|
| `nginx_connectivity_test` | Test connectivity and get status with timestamps |
| `nginx_simple_status` | Get raw NGINX status metrics |
| `nginx_server_info` | Get server configuration and environment info |
| `nginx_get_config` | Read the complete NGINX configuration file |

## Usage Examples

Ask Claude Desktop:
```
Test NGINX connectivity
Check NGINX status  
Show me the NGINX configuration
Get server information
```

## Configuration

### Environment Variables
Create a `.env` file to customize settings:

```env
NGINX_HOST=localhost
NGINX_PORT=8080
NODE_ENV=production
```

### Monitor Different NGINX Instances
1. Update `.env` with custom `NGINX_HOST` and `NGINX_PORT`
2. Ensure target NGINX has `/status` endpoint enabled
3. Restart Claude Desktop

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port conflict | Change port in `docker-compose.yml` |
| MCP tools not found | Verify `cwd` path in Claude config |
| Connection refused | Start NGINX: `docker compose up nginx -d` |
| Claude doesn't respond | Restart Claude Desktop |

### Debug Commands
```bash
# Verify NGINX is running
docker compose ps
curl http://localhost:8080/status

# Test MCP server
node --check src/index.js
```

## Development

```bash
# Development with auto-reload
npm run dev

# Production mode
npm start
```

## Project Structure

```
mcp-server-prototype/
├── src/index.js              # Main MCP server
├── nginx.conf                # NGINX configuration
├── docker-compose.yml        # Docker setup
├── claude-desktop-config.json # Claude integration
└── package.json              # Dependencies
```

## Resources

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP SDK](https://github.com/modelcontextprotocol/sdk)
- [Claude Desktop](https://claude.ai/desktop)

## License

ISC License - see [LICENSE](LICENSE) file.