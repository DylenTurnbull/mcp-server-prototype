# MCP Server Prototype

A Model Context Protocol (MCP) server designed to interact with and monitor NGINX instances. This project demonstrates how to build an MCP server that provides tools and resources for NGINX management through a containerized architecture.

## Features

- **NGINX Status Monitoring**: Get real-time status information from NGINX
- **Configuration Access**: Retrieve NGINX configuration through MCP resources
- **Health Checks**: Built-in health monitoring for both services
- **Containerized**: Fully dockerized setup with Docker Compose
- **MCP Compliant**: Built using the official Model Context Protocol SDK

## Architecture

The project consists of two main services:
- **MCP Server**: Node.js application implementing the MCP protocol
- **NGINX**: Web server with status endpoint and configuration exposure

Both services run in Docker containers and communicate over a dedicated network.

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/DylenTurnbull/mcp-server-prototype.git
   cd mcp-server-prototype
   ```

2. **Start the services**
   ```bash
   docker compose up --build
   ```

3. **Verify the setup**
   - MCP Server health check: http://localhost:8000/health
   - NGINX status: http://localhost:8080/status

## Available MCP Tools

### `get_nginx_status`
Retrieves the current status of the NGINX server.

**Parameters:**
- `endpoint` (optional): Status endpoint URL (default: http://nginx:8080/status)

**Example Response:**
```
Active connections: 1 
server accepts handled requests
 1 1 1 
Reading: 0 Writing: 1 Waiting: 0
```

### `reload_nginx`
Simulates an NGINX reload operation.

**Note**: In this prototype, this provides a simulated response. In production, this would trigger an actual reload.

### `test_nginx_connectivity`
Tests connectivity to the NGINX server to ensure it's responsive.

## Available MCP Resources

### `nginx://config`
Exposes the NGINX configuration file content.

**URI**: `nginx://config`

## Development

### Local Development
```bash
# Install dependencies
npm install

# Run in development mode (with file watching)
npm run dev

# Run normally
npm start
```

### Docker Development
```bash
# Build and run with Docker Compose
docker compose up --build

# Run in detached mode
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## Configuration

### Environment Variables
Currently, the application uses default configurations. You can extend this by adding environment variables to the docker-compose.yml file.

### NGINX Configuration
The NGINX configuration is mounted from `./nginx.conf`. Key endpoints:
- `/status`: Provides server status information
- `/nginx_conf`: Returns configuration content

## Health Checks

Both services include health checks:
- **MCP Server**: HTTP check on `/health` endpoint
- **NGINX**: HTTP check on `/status` endpoint

Health check status can be viewed with:
```bash
docker compose ps
```

## API Documentation

The MCP server implements the Model Context Protocol specification. It provides:
- **Tools**: Executable functions for NGINX management
- **Resources**: Read-only access to NGINX configuration and status

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 8000 and 8080 are available
2. **Container communication**: Check that both containers are on the same network
3. **Health check failures**: Verify endpoints are accessible within containers

### Debugging
```bash
# Check container logs
docker compose logs mcp-server
docker compose logs nginx

# Check container status
docker compose ps

# Execute commands inside containers
docker compose exec mcp-server bash
docker compose exec nginx bash
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License. See the LICENSE file for details.

## Future Enhancements

- Authentication and authorization
- Real NGINX reload functionality
- Configuration validation
- Metrics collection
- Support for multiple NGINX instances
- WebSocket support for real-time monitoring