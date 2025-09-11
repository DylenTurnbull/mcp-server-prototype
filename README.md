# MCP Server Prototype 🔒

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://docs.docker.com/compose/)

A **Model Context Protocol (MCP)** server that provides AI assistants with comprehensive tools for monitoring and managing NGINX instances, including advanced SSL/TLS certificate management. Built with the official MCP SDK and tested with Claude Desktop.

## Features

- **🔒 SSL/TLS Certificate Management**: Complete SSL toolkit with Let's Encrypt integration, self-signed certificates, and security validation
- **📋 Advanced Log Management**: Access recent, extended, timestamped, and real-time NGINX logs
- **⏱️ Near Real-time Monitoring**: Smart 10-second monitoring windows with activity detection
- **🔍 Live Status Monitoring**: NGINX status and connection metrics with health checks
- **📄 Configuration Access**: Retrieve and analyze NGINX config files
- **⚡ Health Checks**: Built-in connectivity testing with timestamps
- **🚀 Runtime Control**: Start, stop, reload, and manage NGINX containers
- **🔧 Configuration Management**: Test and reload NGINX configs without restart
- **⚙️ External Configuration**: JSON config file with environment variable overrides
- **🛠️ MCP Compliant**: Built with official SDK v1.15.1 with triple-fallback execution
- **🐳 Containerized**: Complete Docker setup with NGINX instance

- **� SSL/TLS Certificate Management**: Complete SSL toolkit with Let's Encrypt integration, self-signed certificates, and security validation
- **�📋 Advanced Log Management**: Access recent, extended, timestamped, and real-time NGINX logs
- **⏱️ Near Real-time Monitoring**: Smart 10-second monitoring windows with activity detection
- **🔍 Live Status Monitoring**: NGINX status and connection metrics with health checks
- **📄 Configuration Access**: Retrieve and analyze NGINX config files  
- **⚡ Health Checks**: Built-in connectivity testing with timestamps
- **🚀 Runtime Control**: Start, stop, reload, and manage NGINX containers
- **🔧 Configuration Management**: Test and reload NGINX configs without restart
- **⚙️ External Configuration**: JSON config file with environment variable overrides
- **🛠️ MCP Compliant**: Built with official SDK v1.15.1 with triple-fallback execution
- **🐳 Containerized**: Complete Docker setup with NGINX instance

## Quick Setup

### Prerequisites

- [Node.js 18+](https://nodejs.org/en/download/) - Download and install the latest LTS version
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) - Required for running the NGINX container
- [Claude Desktop](https://claude.ai/download) - The AI assistant that will use this MCP server

### Installation

#### Option 1: Download Manually

1. Go to the [repository page](https://github.com/DylenTurnbull/mcp-server-prototype)
2. Click the green "Code" button, then "Download ZIP"
3. Extract the ZIP file to your desired location
4. Open a terminal/command prompt in the extracted folder

#### Option 2: Using Git

If you have Git installed, you can clone the repository:

```bash
git clone https://github.com/DylenTurnbull/mcp-server-prototype.git
cd mcp-server-prototype
```

#### Install Dependencies

```bash
npm install
```

#### Setup Configuration

```bash
# Copy the example configuration and customize it
cp config.json.example config.json

# Edit config.json with your specific project path
# (The file is in .gitignore so your local paths stay private)
```

### Start NGINX Server

```bash
docker compose up nginx -d
```

## Configuration

The server uses a hierarchical configuration system with multiple sources:

### 1. Configuration Setup

**First, create your local configuration file:**

```bash
# Copy the example configuration and customize it
cp config.json.example config.json

# Edit config.json with your specific paths
# The file is in .gitignore so your local paths stay private
```

### 2. Configuration File (`config.json`)

Your local configuration file (not committed to git):

```json
{
  "nginx": {
    "host": "localhost",
    "port": "8080"
  },
  "project": {
    "directory": "/your/actual/path/to/mcp-server-prototype"
  },
  "server": {
    "name": "NGINX Tools",
    "version": "1.0.0"
  },
  "timeouts": {
    "httpRequest": 5000
  }
}
```

**Note**: The MCP server connects to NGINX on port 8080 (HTTP). NGINX itself serves HTTPS on port 8443 for SSL/TLS testing.

### 3. Environment Variables (Override config.json)

Create a `.env` file or set environment variables to override config file values:

```bash
# Copy .env.example to .env and modify as needed
cp .env.example .env
```

Available environment variables:

- `NGINX_HOST` - NGINX server hostname
- `NGINX_PORT` - NGINX server port
- `PROJECT_DIR` - Project directory path
- `SERVER_NAME` - MCP server name
- `SERVER_VERSION` - MCP server version
- `HTTP_TIMEOUT` - HTTP request timeout (ms)

### 4. Configuration Priority

Environment variables > config.json (local) > defaults

**Note**: `config.json` is in `.gitignore` - your local paths stay private!

## SSL/TLS Certificate Setup

The MCP server includes comprehensive SSL/TLS management tools. For production SSL certificates, you'll need:

### Prerequisites for SSL Tools

- **Domain Name**: A registered domain pointing to your server (required for Let's Encrypt)
- **Port 80 Access**: Must be accessible from the internet for HTTP-01 challenge
- **Certbot**: Automatically installed via Docker when needed

### SSL Certificate Types Supported

- **Self-Signed**: For development/testing (no domain required)
- **Let's Encrypt**: Free production certificates (domain required)
- **Custom Certificates**: Install your own certificates from files

### SSL Directory Structure

SSL certificates are stored in the `ssl/` directory:

```text
ssl/
├── selfsigned.crt    # Self-signed certificate
├── selfsigned.key    # Self-signed private key
├── yourdomain.crt    # Let's Encrypt or custom certificate
└── yourdomain.key    # Let's Encrypt or custom private key
```

**Note**: The `ssl/` directory is in `.gitignore` for security.

## ⚠️ **CRITICAL: Claude Desktop Configuration**

This step is **essential** for the MCP tools to work. Follow these instructions carefully:

### Step 1: Locate Claude Desktop Config File

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

### Step 2: Create/Edit Configuration

**⚠️ IMPORTANT:** Both `args` and `cwd` MUST use **full absolute paths**. Relative paths will NOT work.

#### Windows Example

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

#### macOS/Linux Example

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
3. **Restart Claude Desktop**

### ❌ Common Configuration Mistakes

| ❌ Wrong | ✅ Correct |
|----------|------------|
| `"args": "./src/index.js"` | `"args": ["C:\\full\\path\\src\\index.js"]` |
| `"cwd": "."` | `"cwd": "C:\\full\\path\\to\\project"` |
| `"C:\path\file.js"` | `"C:\\path\\file.js"` |
| Relative paths | Full absolute paths |

### Test Integration

1. Ask Claude: "What NGINX tools do you have available?"

## 🔧 **VS Code MCP Integration**

For developers using VS Code with MCP integration (such as with GitHub Copilot), you can use this NGINX MCP server directly within VS Code.

### VS Code Prerequisites

- **VS Code** with MCP-compatible extension (GitHub Copilot, etc.)
- **Node.js 18+** and **Docker Desktop** (same as Claude Desktop setup)
- **MCP Server Configuration** in your VS Code workspace

### VS Code Setup

#### Option 1: Using MCP Extension Settings

1. Install an MCP-compatible extension in VS Code
2. Open your workspace settings (`.vscode/settings.json`)
3. Add the MCP server configuration:

```json
{
  "mcp.servers": {
    "nginx-tools": {
      "command": "node",
      "args": ["./src/index.js"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

#### Option 2: Using Extension-Specific Configuration

Different MCP extensions may have their own configuration methods. Check your extension's documentation for specific setup instructions.

### Testing VS Code Integration

1. Open this project in VS Code
2. Ensure the NGINX container is running: `docker compose up nginx -d`
3. Try asking your AI assistant: "Test the NGINX connectivity"
4. Or use any of the available NGINX tools listed below

### VS Code Workflow Benefits

- **Integrated Development**: Manage NGINX directly from VS Code
- **Real-time Monitoring**: Check logs and status without leaving your editor
- **Configuration Management**: Test and reload configs during development
- **SSL Management**: Generate and manage certificates for local development

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

### Log Management Tools (5 tools)

| Tool | Description |
|------|-------------|
| `nginx_logs_recent` | Get recent NGINX logs (last 5 lines) |
| `nginx_logs_extended` | Get extended NGINX logs (last 25 lines) |
| `nginx_logs_with_timestamps` | Get NGINX logs with Docker timestamps (last 10 lines) |
| `nginx_logs_basic` | Get NGINX logs (last 10 lines) |
| `nginx_logs_realtime` | Monitor NGINX logs with 10-second activity window, progress updates, and streaming guidance |

### Monitoring & Diagnostics Tools (3 tools)

| Tool | Description |
|------|-------------|
| `nginx_connectivity_test` | Test connectivity and get status with timestamps |
| `nginx_simple_status` | Get raw NGINX status metrics |
| `nginx_docker_diagnostics` | Comprehensive Docker container diagnostics and health checks |

### Configuration Management Tools (3 tools)

| Tool | Description |
|------|-------------|
| `nginx_get_config` | Read the complete NGINX configuration file |
| `nginx_reload` | Reload NGINX configuration without restart |
| `nginx_test_config` | Test NGINX configuration syntax |

### Runtime Control Tools (3 tools)

| Tool | Description |
|------|-------------|
| `nginx_start` | Start the NGINX container |
| `nginx_stop` | Stop the NGINX container |
| `nginx_version` | Get NGINX version information from the running container |

### SSL/TLS Management Tools (8 tools)

| Tool | Description |
|------|-------------|
| `nginx_ssl_generate_self_signed` | Generate self-signed SSL certificate for development/testing |
| `nginx_ssl_install_lets_encrypt` | Install Let's Encrypt certificate with automatic renewal |
| `nginx_ssl_check_expiry` | Check SSL certificate expiration dates |
| `nginx_ssl_validate_config` | Validate SSL configuration and certificate chain |
| `nginx_ssl_setup_redirect` | Configure HTTP to HTTPS redirect |
| `nginx_ssl_renew_certificates` | Renew expiring SSL certificates automatically |
| `nginx_ssl_enforce_security` | Apply SSL security best practices (HSTS, cipher suites, etc.) |
| `nginx_ssl_install_custom_cert` | Install custom SSL certificate from file paths |

## Usage Examples

Once everything is set up, you can ask Claude natural questions about your NGINX server. Here are some examples you can copy and paste:

### Log Management Examples

**View recent NGINX logs:**

```text
Show me the recent NGINX logs
```

**Get more detailed log history:**

```text
Show me extended NGINX logs with more entries
```

**View logs with timestamps:**

```text
Show me NGINX logs with timestamps
```

**Basic log retrieval:**

```text
Get basic NGINX logs
```

**Monitor logs in real-time:**

```text
Monitor NGINX logs in real-time
```

### Monitoring Examples

**Check if NGINX is running:**

```text
Is my NGINX server running and healthy?
```

**Get server performance metrics:**

```text
Show me the current NGINX status and connection statistics
```

**View configuration details:**

```text
Can you show me my NGINX configuration file?
```

**Run Docker diagnostics:**

```text
Run comprehensive Docker diagnostics on my NGINX container
```

### Runtime Control Examples

**Start NGINX container:**

```text
Start my NGINX container
```

**Stop NGINX container:**

```text
Stop my NGINX container
```

**Reload configuration:**

```text
Reload my NGINX configuration after I made changes
```

**Test configuration:**

```text
Test my NGINX configuration for syntax errors before reloading
```

**Get version information:**

```text
What version of NGINX is running?
```

### SSL/TLS Management Examples

**Generate self-signed certificate for development:**

```text
Generate a self-signed SSL certificate for localhost
```

**Check SSL certificate expiry:**

```text
Check when my SSL certificates expire
```

**Validate SSL configuration:**

```text
Validate my SSL certificate configuration and chain
```

**Set up HTTP to HTTPS redirect:**

```text
Configure HTTP to HTTPS redirect for my domain
```

**Apply SSL security best practices:**

```text
Apply SSL security best practices to my NGINX configuration
```

**Install custom SSL certificate:**

```text
Install a custom SSL certificate from /path/to/cert.pem and /path/to/key.pem
```

**Install Let's Encrypt certificate:**

```text
Install a Let's Encrypt certificate for mydomain.com with email admin@mydomain.com
```

**Renew SSL certificates:**

```text
Renew my expiring SSL certificates
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `config.json` missing | Copy from template: `cp config.json.example config.json` |
| Port conflict | Change port in `config.json` or set `NGINX_PORT` env var |
| MCP tools not found | Verify `cwd` path in Claude config |
| Connection refused | Start NGINX: Ask Claude to "start NGINX" or `docker compose up nginx -d` |
| Claude doesn't respond | Restart Claude Desktop |
| Runtime commands fail | Check Docker is running and containers exist |
| SSL tools require domain | Some SSL tools need a domain for full testing |
| Let's Encrypt needs port 80 | Ensure port 80 is accessible for certificate validation |

### Debug Commands

```bash
# Verify NGINX is running
docker compose ps
curl http://localhost:8080/status

# Test MCP server
node --check src/index.js

# Check configuration
cat config.json

# SSL Debugging
# Check SSL certificates
ls -la ssl/
# Test SSL certificate
openssl x509 -in ssl/selfsigned.crt -text -noout
# Check NGINX SSL configuration
docker compose exec nginx nginx -t
```

## Development

```bash
# Development with auto-reload
npm run dev

# Production mode
npm start
```

## Project Structure

```text
mcp-server-prototype/
├── src/
│   ├── index.js              # Main MCP server with 22 tools (14 core + 8 SSL)
│   └── index_commented.js    # Fully commented version of index.js
├── config.json.example       # Configuration template (safe for git)
├── config.json               # Local configuration (ignored by git)
├── .env.example              # Environment variables template
├── nginx.conf                # NGINX configuration with SSL support
├── docker-compose.yml        # Docker setup with NGINX service
├── ssl/                      # SSL certificates directory (ignored by git)
├── package.json              # Dependencies and scripts
└── README.md                 # This documentation
```

## Resources

- [Anthropic](https://www.anthropic.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP SDKs](https://modelcontextprotocol.io/docs/sdk#sdks)
