#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';

// Configuration from environment variables or defaults
const NGINX_HOST = process.env.NGINX_HOST || 'localhost';
const NGINX_PORT = process.env.NGINX_PORT || '8080';
const NGINX_BASE_URL = `http://${NGINX_HOST}:${NGINX_PORT}`;

const server = new McpServer({
  name: 'NGINX Tools',
  version: '1.0.0',
});

server.registerResource('nginx://config', {
  description: 'NGINX server configuration file',
  mimeType: 'text/plain',
}, async () => {
  try {
    const response = await axios.get(`${NGINX_BASE_URL}/nginx_conf`, { timeout: 5000 });
    return {
      contents: [
        {
          uri: 'nginx://config',
          mimeType: 'text/plain',
          text: response.data,
        },
      ],
    };
  } catch (error) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const configPath = path.join(process.cwd(), 'nginx.conf');
      const configContent = await fs.readFile(configPath, 'utf8');
      return {
        contents: [
          {
            uri: 'nginx://config',
            mimeType: 'text/plain',
            text: configContent,
          },
        ],
      };
    } catch (fallbackError) {
      return {
        contents: [
          {
            uri: 'nginx://config',
            mimeType: 'text/plain',
            text: `❌ Cannot access NGINX configuration\n\nAPI Error: ${error.message}\nFile Error: ${fallbackError.message}\n\n💡 Suggestions:\n- Ensure NGINX container is running\n- Check if nginx.conf exists in project directory\n- Verify NGINX config endpoint is available`,
          },
        ],
      };
    }
  }
});

server.registerTool('nginx_connectivity_test', {
  description: 'Test connectivity to NGINX server and get status with timestamps',
}, async () => {
  try {
    const response = await axios.get(`${NGINX_BASE_URL}/status`, { timeout: 5000 });
    return {
      content: [
        { 
          type: 'text', 
          text: `✅ NGINX connectivity test successful!\n\n📊 Status: HTTP ${response.status}\n📝 Response:\n${response.data}\n\n🕐 Timestamp: ${new Date().toISOString()}`
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        { 
          type: 'text', 
          text: `❌ NGINX connectivity test failed!\n\n⚠️ Error: ${error.message}\n\n💡 Suggestions:\n- Start NGINX: docker compose up nginx -d\n- Check if NGINX is running on port ${NGINX_PORT}\n- Verify Docker network connectivity`
        },
      ],
    };
  }
});

server.registerTool('nginx_simple_status', {
  description: 'Get raw NGINX server status metrics and connection data',
}, async () => {
  try {
    const response = await axios.get(`${NGINX_BASE_URL}/status`, { timeout: 5000 });
    return {
      content: [
        { type: 'text', text: `NGINX Status Response:\n${response.data}` },
      ],
    };
  } catch (error) {
    return {
      content: [
        { type: 'text', text: `Cannot connect to NGINX: ${error.message}` },
      ],
    };
  }
});

server.registerTool('nginx_server_info', {
  description: 'Get NGINX server configuration details, environment info, and available operations',
}, async () => {
  return {
    content: [
      { 
        type: 'text', 
        text: `📋 NGINX Server Information:\n\n🌐 Service URL: ${NGINX_BASE_URL}\n📂 Status Endpoint: /status\n📄 Config Endpoint: /nginx_conf\n🐳 Container: nginx (Docker)\n⚡ Port: ${NGINX_PORT}\n📦 Environment: Docker Compose\n🔧 Image: nginx:latest\n\n🛠️ Available MCP Tools:\n- nginx_connectivity_test: Test server connectivity\n- nginx_simple_status: Get raw status metrics\n- nginx_get_config: Read configuration file\n- nginx_server_info: This server information\n\n📚 Available Resources:\n- nginx://config: Configuration file content\n\n🚀 Quick Commands:\n- Start: docker compose up nginx -d\n- Stop: docker compose down\n- Logs: docker compose logs nginx\n- Status: docker compose ps\n\n💡 Note: This shows server setup info, not live metrics. Use nginx_simple_status for current connection data.`
      },
    ],
  };
});

server.registerTool('nginx_get_config', {
  description: 'Read and display the complete NGINX configuration file content',
}, async () => {
  try {
    // Try to get config from NGINX web endpoint
    const response = await axios.get(`${NGINX_BASE_URL}/nginx_conf`, { timeout: 5000 });
    return {
      content: [
        { 
          type: 'text', 
          text: `📄 NGINX Configuration (from server):\n🌐 Source: ${NGINX_BASE_URL}/nginx_conf\n\n\`\`\`nginx\n${response.data}\n\`\`\``
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        { 
          type: 'text', 
          text: `❌ Unable to retrieve real NGINX configuration\n\n� Error: ${error.message}\n\n⚠️ This tool can only access the actual running NGINX server configuration through the web endpoint. Local file fallbacks have been disabled to ensure data authenticity.\n\n💡 Troubleshooting:\n- Ensure NGINX container is running: docker compose ps\n- Check NGINX service status: docker compose logs nginx\n- Verify web endpoint: curl ${NGINX_BASE_URL}/nginx_conf\n- Confirm container port mapping: docker compose port nginx 8080\n\n🔧 To fix:\n1. Start NGINX: docker compose up nginx -d\n2. Wait for container to be healthy\n3. Try this tool again`
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✅ NGINX Tools MCP Server started successfully');
}

main().catch((error) => {
  console.error('❌ NGINX Tools MCP Server error:', error);
  process.exit(1);
});