#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load configuration from external file
const configPath = join(__dirname, '..', 'config.json');
const configExamplePath = join(__dirname, '..', 'config.json.example');
let config;
try {
  config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`❌ Configuration file not found: ${configPath}`);
    console.error(`💡 Please copy config.json.example to config.json and customize it:`);
    console.error(`   cp config.json.example config.json`);
    console.error(`   # Then edit config.json with your specific paths`);
  } else {
    console.error(`❌ Failed to parse configuration from ${configPath}:`, error.message);
  }
  process.exit(1);
}

// Configuration from config file with environment variable overrides
const NGINX_HOST = process.env.NGINX_HOST || config.nginx.host;
const NGINX_PORT = process.env.NGINX_PORT || config.nginx.port;
const NGINX_BASE_URL = `http://${NGINX_HOST}:${NGINX_PORT}`;

// Project directory for Docker Compose operations
const PROJECT_DIR = process.env.PROJECT_DIR || config.project.directory;

// Server configuration
const SERVER_NAME = process.env.SERVER_NAME || config.server.name;
const SERVER_VERSION = process.env.SERVER_VERSION || config.server.version;

// Timeout configuration
const HTTP_TIMEOUT = process.env.HTTP_TIMEOUT || config.timeouts.httpRequest;

const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
});

server.registerResource('nginx://config', {
  description: 'NGINX server configuration file',
  mimeType: 'text/plain',
}, async () => {
  try {
    const response = await axios.get(`${NGINX_BASE_URL}/nginx_conf`, { timeout: HTTP_TIMEOUT });
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
      const configPath = path.join(PROJECT_DIR, 'nginx.conf');
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
    const response = await axios.get(`${NGINX_BASE_URL}/status`, { timeout: HTTP_TIMEOUT });
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
    const response = await axios.get(`${NGINX_BASE_URL}/status`, { timeout: HTTP_TIMEOUT });
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
        text: `📋 NGINX Server Information:\n\n🌐 Service URL: ${NGINX_BASE_URL}\n📂 Status Endpoint: /status\n📄 Config Endpoint: /nginx_conf\n🐳 Container: nginx (Docker)\n⚡ Port: ${NGINX_PORT}\n📦 Environment: Docker Compose\n🔧 Image: nginx:latest\n\n🛠️ Available MCP Tools:\n- nginx_connectivity_test: Test server connectivity\n- nginx_simple_status: Get raw status metrics\n- nginx_get_config: Read configuration file\n- nginx_server_info: This server information\n- nginx_start: Start NGINX container\n- nginx_stop: Stop NGINX container\n- nginx_reload: Reload NGINX configuration\n- nginx_test_config: Test configuration syntax\n- nginx_quit: Quit NGINX process gracefully (waits for connections)\n- nginx_version: Get NGINX version information\n\n📚 Available Resources:\n- nginx://config: Configuration file content\n\n🚀 Quick Commands:\n- Start: docker compose up nginx -d\n- Stop: docker compose stop nginx\n- Logs: docker compose logs nginx\n- Status: docker compose ps\n\n💡 Note: This shows server setup info, not live metrics. Use nginx_simple_status for current connection data.`
      },
    ],
  };
});

server.registerTool('nginx_get_config', {
  description: 'Read and display the complete NGINX configuration file content',
}, async () => {
  try {
    // Try to get config from NGINX web endpoint
    const response = await axios.get(`${NGINX_BASE_URL}/nginx_conf`, { timeout: HTTP_TIMEOUT });
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

server.registerTool('nginx_reload', {
  description: 'Reload NGINX configuration by executing nginx -s reload inside the container',
}, async () => {
  try {
    const { spawn } = await import('child_process');
    const { promisify } = await import('util');
    const execFile = promisify(spawn);
    
    // Execute docker compose exec nginx nginx -s reload
    const result = await new Promise((resolve, reject) => {
      const childProcess = spawn('docker', ['compose', 'exec', '-T', 'nginx', 'nginx', '-s', 'reload'], {
        cwd: PROJECT_DIR,
        stdio: 'pipe'
      });
      
      let stdout = '';
      let stderr = '';
      
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
      
      childProcess.on('error', (error) => {
        reject(error);
      });
    });
    
    return {
      content: [
        { 
          type: 'text', 
          text: `✅ NGINX configuration reloaded successfully!\n\n📝 Command: docker compose exec nginx nginx -s reload\n🕐 Timestamp: ${new Date().toISOString()}\n\n📋 Output:\n${result.stdout || 'No output (normal for successful reload)'}\n${result.stderr ? `\n⚠️ Stderr: ${result.stderr}` : ''}`
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        { 
          type: 'text', 
          text: `❌ Failed to reload NGINX configuration!\n\n⚠️ Error: ${error.message}\n\n💡 Troubleshooting:\n- Ensure NGINX container is running: docker compose ps\n- Check container logs: docker compose logs nginx\n- Verify configuration syntax: nginx -t\n- Make sure Docker is running and accessible\n\n🔧 Try starting container: docker compose up nginx -d`
        },
      ],
    };
  }
});

server.registerTool('nginx_test_config', {
  description: 'Test NGINX configuration syntax by executing nginx -t inside the container',
}, async () => {
  try {
    const { spawn } = await import('child_process');
    
    // Execute docker compose exec nginx nginx -t
    const result = await new Promise((resolve, reject) => {
      const childProcess = spawn('docker', ['compose', 'exec', '-T', 'nginx', 'nginx', '-t'], {
        cwd: PROJECT_DIR,
        stdio: 'pipe'
      });
      
      let stdout = '';
      let stderr = '';
      
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      childProcess.on('close', (code) => {
        resolve({ stdout, stderr, code });
      });
      
      childProcess.on('error', (error) => {
        reject(error);
      });
    });
    
    if (result.code === 0) {
      return {
        content: [
          { 
            type: 'text', 
            text: `✅ NGINX configuration test passed!\n\n📝 Command: docker compose exec nginx nginx -t\n🕐 Timestamp: ${new Date().toISOString()}\n\n📋 Output:\n${result.stderr || result.stdout || 'Configuration syntax is ok'}`
          },
        ],
      };
    } else {
      return {
        content: [
          { 
            type: 'text', 
            text: `❌ NGINX configuration test failed!\n\n📝 Command: docker compose exec nginx nginx -t\n🕐 Timestamp: ${new Date().toISOString()}\n\n⚠️ Configuration errors:\n${result.stderr}\n${result.stdout ? `\nStdout: ${result.stdout}` : ''}\n\n💡 Fix the configuration errors before reloading NGINX.`
          },
        ],
      };
    }
  } catch (error) {
    return {
      content: [
        { 
          type: 'text', 
          text: `❌ Failed to test NGINX configuration!\n\n⚠️ Error: ${error.message}\n\n💡 Troubleshooting:\n- Ensure NGINX container is running: docker compose ps\n- Check container logs: docker compose logs nginx\n- Make sure Docker is running and accessible\n\n🔧 Try starting container: docker compose up nginx -d`
        },
      ],
    };
  }
});

server.registerTool('nginx_stop', {
  description: 'Stop the NGINX container using Docker Compose',
}, async () => {
  try {
    const { spawn } = await import('child_process');
    
    // Execute docker compose stop nginx
    const result = await new Promise((resolve, reject) => {
      const childProcess = spawn('docker', ['compose', 'stop', 'nginx'], {
        cwd: PROJECT_DIR,
        stdio: 'pipe'
      });
      
      let stdout = '';
      let stderr = '';
      
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      childProcess.on('close', (code) => {
        resolve({ stdout, stderr, code });
      });
      
      childProcess.on('error', (error) => {
        reject(error);
      });
    });
    
    if (result.code === 0) {
      return {
        content: [
          { 
            type: 'text', 
            text: `✅ NGINX container stopped successfully!\n\n📝 Command: docker compose stop nginx\n🕐 Timestamp: ${new Date().toISOString()}\n\n📋 Output:\n${result.stdout || result.stderr || 'Container stopped gracefully'}\n\n💡 The NGINX container has been stopped. Use nginx_start to restart it.\n\n🔄 Note: This is the complement to nginx_start - it stops the entire container, not just the NGINX process.`
          },
        ],
      };
    } else {
      return {
        content: [
          { 
            type: 'text', 
            text: `⚠️ NGINX stop command completed with exit code ${result.code}\n\n📝 Command: docker compose stop nginx\n🕐 Timestamp: ${new Date().toISOString()}\n\n📋 Output:\n${result.stderr || result.stdout || 'No output'}\n\n💡 The container may already be stopped.`
          },
        ],
      };
    }
  } catch (error) {
    return {
      content: [
        { 
          type: 'text', 
          text: `❌ Failed to stop NGINX container!\n\n⚠️ Error: ${error.message}\n\n💡 Troubleshooting:\n- Check if NGINX container is running: docker compose ps\n- Make sure Docker is running and accessible\n- Verify docker-compose.yml exists in project directory\n\n🔧 Container may already be stopped. Use nginx_start to start it.`
        },
      ],
    };
  }
});

server.registerTool('nginx_quit', {
  description: 'Quit NGINX gracefully by executing nginx -s quit inside the container (waits for active connections to finish)',
}, async () => {
  try {
    const { spawn } = await import('child_process');
    
    // Execute docker compose exec nginx nginx -s quit
    const result = await new Promise((resolve, reject) => {
      const childProcess = spawn('docker', ['compose', 'exec', '-T', 'nginx', 'nginx', '-s', 'quit'], {
        cwd: PROJECT_DIR,
        stdio: 'pipe'
      });
      
      let stdout = '';
      let stderr = '';
      
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      childProcess.on('close', (code) => {
        resolve({ stdout, stderr, code });
      });
      
      childProcess.on('error', (error) => {
        reject(error);
      });
    });
    
    if (result.code === 0) {
      return {
        content: [
          { 
            type: 'text', 
            text: `✅ NGINX quit gracefully!\n\n📝 Command: docker compose exec nginx nginx -s quit\n🕐 Timestamp: ${new Date().toISOString()}\n\n📋 Output:\n${result.stdout || result.stderr || 'NGINX process quit gracefully'}\n\n💡 Note: nginx -s quit waits for active connections to finish before stopping, unlike nginx -s stop which stops immediately. The container will restart NGINX automatically.`
          },
        ],
      };
    } else {
      return {
        content: [
          { 
            type: 'text', 
            text: `⚠️ NGINX quit command completed with exit code ${result.code}\n\n📝 Command: docker compose exec nginx nginx -s quit\n🕐 Timestamp: ${new Date().toISOString()}\n\n📋 Output:\n${result.stderr || result.stdout || 'No output'}\n\n💡 This may be normal if NGINX was already stopped.`
          },
        ],
      };
    }
  } catch (error) {
    return {
      content: [
        { 
          type: 'text', 
          text: `❌ Failed to quit NGINX!\n\n⚠️ Error: ${error.message}\n\n💡 Troubleshooting:\n- Ensure NGINX container is running: docker compose ps\n- Check container logs: docker compose logs nginx\n- Make sure Docker is running and accessible\n- NGINX may already be stopped\n\n🔧 To restart: docker compose restart nginx`
        },
      ],
    };
  }
});

server.registerTool('nginx_start', {
  description: 'Start the NGINX container using Docker Compose',
}, async () => {
  try {
    const { spawn } = await import('child_process');
    
    // Execute docker compose up nginx -d
    const result = await new Promise((resolve, reject) => {
      const childProcess = spawn('docker', ['compose', 'up', 'nginx', '-d'], {
        cwd: PROJECT_DIR,
        stdio: 'pipe'
      });
      
      let stdout = '';
      let stderr = '';
      
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      childProcess.on('close', (code) => {
        resolve({ stdout, stderr, code });
      });
      
      childProcess.on('error', (error) => {
        reject(error);
      });
    });
    
    if (result.code === 0) {
      return {
        content: [
          { 
            type: 'text', 
            text: `✅ NGINX container started successfully!\n\n📝 Command: docker compose up nginx -d\n🕐 Timestamp: ${new Date().toISOString()}\n\n📋 Output:\n${result.stdout || result.stderr || 'Container started in detached mode'}\n\n🌐 NGINX should now be accessible at: http://localhost:8080\n\n💡 Use nginx_connectivity_test to verify the server is responding.`
          },
        ],
      };
    } else {
      return {
        content: [
          { 
            type: 'text', 
            text: `⚠️ NGINX start command completed with exit code ${result.code}\n\n📝 Command: docker compose up nginx -d\n🕐 Timestamp: ${new Date().toISOString()}\n\n📋 Output:\n${result.stderr || result.stdout || 'No output'}\n\n💡 The container may already be running or there might be a configuration issue.`
          },
        ],
      };
    }
  } catch (error) {
    return {
      content: [
        { 
          type: 'text', 
          text: `❌ Failed to start NGINX container!\n\n⚠️ Error: ${error.message}\n\n💡 Troubleshooting:\n- Make sure Docker is running and accessible\n- Check if docker-compose.yml exists in project directory\n- Verify Docker Compose is installed\n- Check for port conflicts on port 8080\n\n🔧 Try manually: docker compose up nginx -d`
        },
      ],
    };
  }
});

server.registerTool('nginx_version', {
  description: 'Get NGINX version and configuration details by executing nginx -V inside the container',
}, async () => {
  try {
    const { spawn } = await import('child_process');
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Check if docker-compose.yml exists in the current working directory
    const dockerComposeFile = path.join(process.cwd(), 'docker-compose.yml');
    let dockerComposeExists = false;
    try {
      await fs.access(dockerComposeFile);
      dockerComposeExists = true;
    } catch {
      dockerComposeExists = false;
    }
    
    // Execute docker compose exec nginx nginx -V
    const result = await new Promise((resolve, reject) => {
      const childProcess = spawn('docker', ['compose', 'exec', '-T', 'nginx', 'nginx', '-V'], {
        cwd: PROJECT_DIR,
        stdio: 'pipe',
        env: process.env
      });
      
      let stdout = '';
      let stderr = '';
      
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      childProcess.on('close', (code) => {
        resolve({ stdout, stderr, code });
      });
      
      childProcess.on('error', (error) => {
        reject(error);
      });
    });
    
    // Check if we got the expected output or an error
    if (result.stderr && result.stderr.includes('no configuration file provided')) {
      return {
        content: [
          { 
            type: 'text', 
            text: `📊 NGINX Version Information:\n\n📝 Command: docker compose exec nginx nginx -V\n🕐 Timestamp: ${new Date().toISOString()}\n\n⚠️ Docker Compose Error: ${result.stderr}\n\n🔍 Debug info:\n- Working directory: ${process.cwd()}\n- Docker compose file exists: ${dockerComposeExists}\n- Exit code: ${result.code}\n\n💡 This error suggests the docker-compose.yml file isn't found in the working directory when the MCP server runs.`
          },
        ],
      };
    }
    
    // nginx -V outputs to stderr, not stdout
    const output = result.stderr || result.stdout;
    
    return {
      content: [
        { 
          type: 'text', 
          text: `📊 NGINX Version Information:\n\n📝 Command: docker compose exec nginx nginx -V\n🕐 Timestamp: ${new Date().toISOString()}\n\n📋 Output:\n${output || 'No version information available'}`
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        { 
          type: 'text', 
          text: `❌ Failed to get NGINX version!\n\n⚠️ Error: ${error.message}\n\n� Debug info:\n- Working directory: ${process.cwd()}\n- Command attempted: docker compose exec -T nginx nginx -V\n\n�💡 Troubleshooting:\n- Ensure NGINX container is running: docker compose ps\n- Check container logs: docker compose logs nginx\n- Make sure Docker is running and accessible\n\n🔧 Try starting container: docker compose up nginx -d`
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