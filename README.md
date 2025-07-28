# NGINX MCP Server

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://docs.docker.com/compose/)

A **Model Context Protocol (MCP)** server that provides AI assistants with tools for monitoring and managing NGINX instances. Built with the official MCP SDK and fully tested with Claude Desktop for production use.

## What is MCP?

The [Model Context Protocol](https://modelcontextprotocol.io/) is an open standard that enables AI systems to securely connect to data sources and tools. This server implements MCP to allow AI assistants like Claude to interact with NGINX servers through a standardized interface.

## Features

- **🔍 Real-time Monitoring**: Live NGINX status and connection metrics
- **📄 Configuration Access**: Retrieve and analyze NGINX config files  
- **⚡ Health Checks**: Built-in connectivity testing with timestamps
- **🛠️ MCP Compliant**: Built with official SDK v1.15.1, tested with Claude Desktop
- **🐳 Containerized**: Complete Docker setup with NGINX instance
- **💡 Smart Error Handling**: Graceful fallbacks and helpful suggestions
- **🎯 Production Ready**: Clean, tested, and fully functional

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/DylenTurnbull/mcp-server-prototype.git
cd mcp-server-prototype
npm install
```

### 2. Start NGINX Server

```bash
docker compose up nginx -d
```

### 3. Configure Claude Desktop

Copy the configuration to Claude Desktop:

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

**Important Notes:**
- Replace `<FULL_PATH_TO_PROJECT>` with your actual project directory path
- Use relative path `./src/index.js` in the `args` field for better portability
- Example Windows path: `"C:\\Users\\YourName\\Documents\\mcp-server-prototype"`
- Example Unix path: `"/home/username/projects/mcp-server-prototype"`

### 4. Restart Claude Desktop

Close and reopen Claude Desktop to load the MCP server.

## MCP Tools

The server provides these tools for AI assistants:

| Tool | Description | Purpose |
|------|-------------|---------|
| `nginx_connectivity_test` | Test connectivity to NGINX server and get status with timestamps | Connection verification with detailed metrics |
| `nginx_simple_status` | Get raw NGINX server status metrics and connection data | Live server statistics and activity |  
| `nginx_server_info` | Get NGINX server configuration details, environment info, and available operations | Server setup and operational information |
| `nginx_get_config` | Read and display the complete NGINX configuration file content | Configuration analysis and debugging |

## MCP Resources

- **`nginx://config`**: NGINX configuration file content (text/plain) - accessible as a resource

## Using with Claude Desktop

Once configured, you can interact with your NGINX server through Claude using natural language:

### 🔍 **Discovery Commands**
```
What NGINX tools do you have available?
List all available NGINX monitoring capabilities
```

### ⚡ **Basic Monitoring**
```
Test NGINX connectivity
Check NGINX status
Get current NGINX metrics
Show me the server health
```

### 📊 **Detailed Analysis**
```
Get NGINX server information
Show me the NGINX configuration
Analyze the NGINX setup
Check server configuration details
```

### 🧪 **Advanced Usage**
```
Check NGINX health and analyze the configuration
Monitor NGINX status and tell me about any issues
Get complete server information including metrics and config
Test connectivity and show me detailed server information
```

### 📝 **Expected Responses**

**Connectivity Test:**
```
✅ NGINX connectivity test successful!

📊 Status: HTTP 200
📝 Response:
Active connections: 1 
server accepts handled requests
 22 22 22
Reading: 0 Writing: 1 Waiting: 0

🕐 Timestamp: 2025-07-27T15:30:45.123Z
```

**Server Information:**
```
📋 NGINX Server Information:

🌐 Service URL: http://localhost:8080
📂 Status Endpoint: /status
📄 Config Endpoint: /nginx_conf
🐳 Container: nginx (Docker)
⚡ Port: 8080
📦 Environment: Docker Compose
🔧 Image: nginx:latest

🛠️ Available MCP Tools:
- nginx_connectivity_test: Test server connectivity
- nginx_simple_status: Get raw status metrics
- nginx_get_config: Read configuration file
- nginx_server_info: This server information

💡 Note: This shows server setup info, not live metrics.
```

## Project Structure

```
mcp-server-prototype/
├── src/
│   └── index.js                  # Main MCP server implementation
├── claude-desktop-config.json    # Claude Desktop integration config
├── docker-compose.yml            # NGINX service orchestration  
├── nginx.conf                    # NGINX server configuration
├── package.json                  # Node.js dependencies and scripts
├── Dockerfile                    # Container build configuration
└── README.md                     # This documentation
```

## Development

### Available Scripts

- `npm start` - Run MCP server in production mode
- `npm run dev` - Run with file watching for development

### Local Development Setup

```bash
# Install dependencies
npm install

# Start NGINX only (for development)
docker compose up nginx -d

# Run MCP server with auto-reload
npm run dev
```

### Testing the MCP Server

```bash
# Check syntax
node --check src/index.js

# Test NGINX connectivity
curl http://localhost:8080/status

# Verify container status
docker compose ps
```

## Configuration

### Environment Variables

The MCP server supports configuration through environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `NGINX_HOST` | `localhost` | NGINX server hostname or IP address |
| `NGINX_PORT` | `8080` | NGINX server port number |
| `NODE_ENV` | - | Node.js environment (development/production) |

### Configuration File

Copy `.env.example` to `.env` and modify as needed:

```bash
cp .env.example .env
```

Example `.env` file:
```env
NGINX_HOST=localhost
NGINX_PORT=8080
NODE_ENV=production
```

### Custom NGINX Configuration

To monitor a different NGINX instance:
1. Update environment variables or `.env` file
2. Ensure the target NGINX has status endpoint enabled
3. Restart Claude Desktop to reload the MCP server

## Architecture

```
┌─────────────────┐    JSON-RPC/MCP    ┌─────────────────┐
│   Claude        │◄─────────────────►│   MCP Server    │
│   Desktop       │      stdio        │   (Node.js)     │  
└─────────────────┘                   └─────────┬───────┘
                                                │ HTTP
                                      ┌─────────▼───────┐
                                      │   NGINX Server  │
                                      │   (Docker)      │
                                      └─────────────────┘
```

## Configuration

### NGINX Endpoints

- `http://localhost:8080/status` - Server status metrics (restricted access)
- `http://localhost:8080/` - Default page / health check

### Security Notes

- NGINX status endpoint restricted to localhost and Docker networks
- No authentication required (development/testing use)
- File access limited to project directory with multiple fallback paths

### Customization

To modify the NGINX configuration:

1. Edit `nginx.conf`
2. Restart the container: `docker compose restart nginx`
3. Test changes with Claude: "Test NGINX connectivity"

## Troubleshooting

### Common Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Port conflict** | `docker compose up` fails | Change port in `docker-compose.yml` or stop conflicting service |
| **MCP tools not found** | Claude doesn't see tools | Verify `cwd` path in Claude Desktop config matches your project location |
| **Config file not found** | Tools report config errors | Ensure MCP server runs from project directory |
| **Connection refused** | Connectivity tests fail | Start NGINX: `docker compose up nginx -d` |
| **Claude doesn't respond** | No tool execution | Restart Claude Desktop after config changes |

### Debug Commands

```bash
# Verify NGINX is running
docker compose ps
curl http://localhost:8080/status

# Check NGINX logs
docker compose logs nginx

# Test MCP server startup
node src/index.js
# (Should show: ✅ NGINX Tools MCP Server started successfully)

# View containers
docker compose ps

# Stop/restart services
docker compose down
docker compose up nginx -d
```

## Advanced Usage

### Multiple NGINX Instances

To monitor multiple NGINX servers, modify the tools in `src/index.js` to accept hostname parameters or create multiple MCP server instances.

### Custom Tools

Add new tools by registering them in `src/index.js`:

```javascript
server.registerTool('custom_tool', {
  description: 'Description of your custom tool',
}, async () => {
  // Your implementation
  return {
    content: [{ type: 'text', text: 'Tool response' }]
  };
});
```

## Technical Notes

### MCP Implementation Details

- **Transport**: stdio (Standard Input/Output)
- **Protocol**: JSON-RPC 2.0 over MCP
- **SDK Version**: @modelcontextprotocol/sdk ^1.15.1
- **Compatibility**: Tested with Claude Desktop v0.12.55+

### Known Limitations

- Avoids `inputSchema` in tool definitions (causes validation issues)
- Single NGINX instance monitoring (can be extended)
- Windows path handling with multiple fallbacks

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test with Claude Desktop
5. Submit a pull request

## License

ISC License - see [LICENSE](LICENSE) file.

## Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP SDK on GitHub](https://github.com/modelcontextprotocol/sdk)
- [Claude Desktop Download](https://claude.ai/desktop)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

---

**🎉 Ready to monitor NGINX with AI assistance!**