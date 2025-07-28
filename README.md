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
- [Node.js 18+](https://nodejs.org/en/download/) - Download and install the latest LTS version
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) - Required for running the NGINX container
- [Claude Desktop](https://claude.ai/download) - The AI assistant that will use this MCP server

### Installation

**Option 1: Download Manually**
1. Go to the [repository page](https://github.com/DylenTurnbull/mcp-server-prototype)
2. Click the green "Code" button, then "Download ZIP"
3. Extract the ZIP file to your desired location
4. Open a terminal/command prompt in the extracted folder

**Option 2: Using Git**
If you have Git installed, you can clone the repository:
```bash
git clone https://github.com/DylenTurnbull/mcp-server-prototype.git
cd mcp-server-prototype
```

**Install Dependencies**
```bash
npm install
```

### Start NGINX Server
```bash
docker compose up nginx -d
```

## ⚠️ **CRITICAL: Claude Desktop Configuration**

This step is **essential** for the MCP tools to work. Follow these instructions carefully:

### Step 1: Locate Claude Desktop Config File

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

### Step 2: Create/Edit Configuration

**⚠️ IMPORTANT:** Both `args` and `cwd` MUST use **full absolute paths**. Relative paths will NOT work.

#### Windows Example:
```json
{
  "mcpServers": {
    "nginx-mcp-server": {
      "command": "node",
      "args": ["C:\\Users\\YourUsername\\Documents\\source\\mcp-server-prototype\\src\\index.js"],
      "cwd": "C:\\Users\\YourUsername\\Documents\\source\\mcp-server-prototype"
    }
  }
}
```

#### macOS/Linux Example:
```json
{
  "mcpServers": {
    "nginx-mcp-server": {
      "command": "node",
      "args": ["/full/path/to/your/project/src/index.js"],
      "cwd": "/full/path/to/your/project"
    }
  }
}
```

Replace `<FULL_PATH_TO_PROJECT>` with your actual project directory path.


1. **Completely close Claude Desktop**
2. **Wait 10 seconds**
2. **Restart Claude Desktop**  

### ❌ Common Configuration Mistakes

| ❌ Wrong | ✅ Correct |
|----------|------------|
| `"args": "./src/index.js"` | `"args": ["C:\\full\\path\\src\\index.js"]` |
| `"cwd": "."` | `"cwd": "C:\\full\\path\\to\\project"` |
| `"C:\path\file.js"` | `"C:\\path\\file.js"` |
| Relative paths | Full absolute paths |

### Test Integration
1. Ask Claude: "What NGINX tools do you have available?"

## Manual Setup Steps

If you prefer to set everything up step by step:

1. **Install Prerequisites**: Make sure you have Node.js, Docker Desktop, and Claude Desktop installed
2. **Download the Project**: Get the code using one of the installation methods above
3. **Install Dependencies**: Run `npm install` in the project directory
4. **Start NGINX**: Run `docker compose up nginx -d` to start the NGINX container
5. **Configure Claude**: Add the MCP server configuration to your Claude Desktop config file
6. **Restart Claude**: Close and reopen Claude Desktop to load the new MCP server
7. **Test**: Ask Claude about available NGINX tools to verify everything works

## Available Tools

| Tool | Description |
|------|-------------|
| `nginx_connectivity_test` | Test connectivity and get status with timestamps |
| `nginx_simple_status` | Get raw NGINX status metrics |
| `nginx_server_info` | Get server configuration and environment info |
| `nginx_get_config` | Read the complete NGINX configuration file |

## Usage Examples

Once everything is set up, you can ask Claude natural questions about your NGINX server. Here are some examples you can copy and paste:

**Check if NGINX is running:**
```
Is my NGINX server running and healthy?
```

**Get server performance metrics:**
```
Show me the current NGINX status and connection statistics
```

**View configuration details:**
```
Can you show me my NGINX configuration file?
```

**Get detailed server information:**
```
What can you tell me about my NGINX server setup and environment?
```

**Test connectivity with timestamps:**
```
Test the connectivity to my NGINX server and show me when it was last checked
```

**Troubleshoot connection issues:**
```
Help me diagnose why I can't connect to my NGINX server
```

## Configuration

### Environment Variables
Create a `.env` file to customize settings:

```env
NGINX_HOST=localhost
NGINX_PORT=8080
NODE_ENV=production
```

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

- [Anthrop/c](https://www.anthropic.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP SDKs](https://modelcontextprotocol.io/docs/sdk#sdks)
