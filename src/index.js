import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';
import { z } from 'zod';
import http from 'http';

// Define the MCP server
const server = new McpServer({
  name: 'NGINX MCP Server',
  version: '1.0.0',
});

// Health check endpoint
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

healthServer.listen(8000, () => {
  console.log('Health check server listening on port 8000');
});

// Tool: Get NGINX status
server.registerTool('get_nginx_status', {
  description: 'Get the current status of the NGINX server',
  inputSchema: z.object({
    endpoint: z.string().url().optional().describe('Status endpoint URL (default: http://nginx:8080/status)'),
  }),
}, async ({ endpoint = 'http://nginx:8080/status' }) => {
  try {
    const response = await axios.get(endpoint);
    return {
      content: [
        { type: 'text', text: response.data },
      ],
    };
  } catch (error) {
    return {
      content: [
        { type: 'text', text: `Error fetching NGINX status: ${error.message}` },
      ],
    };
  }
});

// Resource: Expose NGINX configuration
server.registerResource('nginx-config', 'nginx://config', {
  description: 'NGINX configuration file content',
  title: 'NGINX Configuration'
}, async () => {
  try {
    const response = await axios.get('http://nginx:8080/nginx_conf');
    return {
      content: [
        { type: 'text', text: response.data },
      ],
    };
  } catch (error) {
    return {
      content: [
        { type: 'text', text: `Error reading NGINX config: ${error.message}` },
      ],
    };
  }
});

// Tool: Reload NGINX
server.registerTool('reload_nginx', {
  description: 'Simulate an NGINX reload operation',
  inputSchema: z.object({}),
}, async () => {
  try {
    // Since we can't execute docker commands from within container,
    // we'll provide a simulated response or alternative approach
    return { 
      content: [{ 
        type: 'text', 
        text: 'NGINX reload command would be executed. In a production environment, this would trigger a reload via API or signal.' 
      }] 
    };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
  }
});

// Tool: Test NGINX connectivity
server.registerTool('test_nginx_connectivity', {
  description: 'Test connectivity to the NGINX server',
  inputSchema: z.object({}),
}, async () => {
  try {
    const response = await axios.get('http://nginx:8080/status');
    return {
      content: [{
        type: 'text',
        text: `NGINX is responsive. Status: ${response.status}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `NGINX connectivity test failed: ${error.message}`
      }]
    };
  }
});

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('MCP server is running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});