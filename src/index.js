#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { spawn, exec, execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

let config;
try {
  config = JSON.parse(readFileSync(join(__dirname, '..', 'config.json'), 'utf8'));
} catch (error) {
  console.error(error.code === 'ENOENT' ? 
    '❌ Config file not found. Please copy config.json.example to config.json and configure it.' : 
    `❌ Error reading config file: ${error.message}`);
  process.exit(1);
}

const PROJECT_DIR = process.env.PROJECT_DIR || config.project.directory;
const NGINX_URL = `http://${config.nginx.host}:${config.nginx.port}`;
const TIMEOUT = 15000;
const DOCKER_ENV = { ...process.env, PATH: process.env.PATH };
const AXIOS_CONFIG = { timeout: 5000, headers: { 'User-Agent': 'NGINX-MCP-Server/1.0' } };

const server = new McpServer({
  name: 'nginx-tools',
  version: '1.0.0',
  description: 'NGINX Tools MCP Server - Comprehensive NGINX container management with Docker integration'
});

const createResult = (stdout, stderr, code, method, command, error = null, timeout = false) => ({
  stdout, stderr, code: code || 0, success: code === 0,
  debug: { 
    command: command || '', 
    method, 
    ...(error && { error }), 
    ...(timeout && { timeout }), 
    timestamp: new Date().toISOString() 
  }
});

async function executeDockerCommand(args) {
  return new Promise((resolve) => {
    const child = spawn('docker', args, { cwd: PROJECT_DIR, env: DOCKER_ENV, stdio: ['inherit', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const command = `docker ${args.join(' ')}`;
    
    child.stdout?.on('data', (data) => stdout += data.toString());
    child.stderr?.on('data', (data) => stderr += data.toString());

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      resolve(createResult('', 'Command timed out after 15 seconds', 124, 'spawn', command, null, true));
    }, TIMEOUT);

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve(createResult(stdout, stderr, code, 'spawn', command));
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve(createResult('', error.message, 1, 'spawn', command, error.message));
    });
  });
}

async function executeDockerCommandAlt(args) {
  const command = `docker ${args.join(' ')}`;
  try {
    const { stdout, stderr } = await execAsync(command, { cwd: PROJECT_DIR, timeout: TIMEOUT, env: DOCKER_ENV });
    return createResult(stdout, stderr, 0, 'exec', command);
  } catch (error) {
    return createResult(error.stdout || '', error.stderr || error.message, error.code || 1, 'exec', command, error.message);
  }
}

function executeDockerCommandSync(args) {
  const command = `docker ${args.join(' ')}`;
  try {
    const result = execSync(command, { cwd: PROJECT_DIR, encoding: 'utf8', timeout: TIMEOUT, env: DOCKER_ENV });
    return createResult(result, '', 0, 'execSync', command);
  } catch (error) {
    return createResult('', error.stderr || error.message, error.status || 1, 'execSync', command, error.message);
  }
}

async function executeDockerCommandRobust(args) {
  const spawnResult = await executeDockerCommand(args);
  if (spawnResult.success) return spawnResult;
  
  const execResult = await executeDockerCommandAlt(args);
  if (execResult.success) return { ...execResult, debug: { ...execResult.debug, fallbackUsed: true, primaryError: spawnResult.stderr } };
  
  const syncResult = executeDockerCommandSync(args);
  if (syncResult.success) return { ...syncResult, debug: { ...syncResult.debug, fallbackUsed: true, primaryError: spawnResult.stderr, secondaryError: execResult.stderr } };
  
  return createResult('', `All execution methods failed. Last error: ${syncResult.stderr}`, 1, 'all_failed', `docker ${args.join(' ')}`);
}

const createResponse = (text) => ({ content: [{ type: 'text', text }] });
const timestamp = () => new Date().toISOString();

server.registerTool('nginx_connectivity_test', {
  description: 'Test connectivity to NGINX server and get basic status information',
}, async () => {
  try {
    const response = await axios.get(`${NGINX_URL}/nginx_status`, AXIOS_CONFIG);
    return createResponse(`✅ NGINX connectivity test successful!\n\n📊 Status: HTTP ${response.status}\n📝 Response:\n${response.data}\n\n🕐 Timestamp: ${timestamp()}`);
  } catch (error) {
    return createResponse(`❌ NGINX connectivity test failed!\n\n⚠️ Error: ${error.message}\n🌐 URL: ${NGINX_URL}/nginx_status\n🕐 Timestamp: ${timestamp()}\n\n💡 Ensure NGINX container is running: docker compose up nginx -d`);
  }
});

server.registerTool('nginx_simple_status', {
  description: 'Get raw NGINX status metrics without formatting',
}, async () => {
  try {
    const response = await axios.get(`${NGINX_URL}/nginx_status`, AXIOS_CONFIG);
    return createResponse(response.data);
  } catch (error) {
    return createResponse(`Error: ${error.message}`);
  }
});

server.registerTool('nginx_docker_diagnostics', {
  description: 'Run comprehensive Docker environment diagnostics for NGINX container',
}, async () => {
  try {
    const [dockerVersion, composeVersion, containerStatus] = await Promise.all([
      executeDockerCommandRobust(['--version']),
      executeDockerCommandRobust(['compose', 'version']),
      executeDockerCommandRobust(['compose', 'ps'])
    ]);
    
    const diagnostics = [
      `✅ Docker Version: ${dockerVersion.stdout.trim()}`,
      `✅ Docker Compose: ${composeVersion.stdout.trim()}`,
      `✅ Container Status:\n${containerStatus.stdout.trim()}`
    ];
    
    const envInfo = [`- Working Directory: ${PROJECT_DIR}`, `- Platform: ${process.platform}`, `- Node Version: ${process.version}`, `- NGINX URL: ${NGINX_URL}`];
    return createResponse(`🔍 Docker Environment Diagnostics\n🕐 Timestamp: ${timestamp()}\n\n${diagnostics.join('\n')}\n\n📂 Environment Information:\n${envInfo.join('\n')}`);
  } catch (error) {
    return createResponse(`❌ Docker diagnostics failed: ${error.message}`);
  }
});

const logTools = [
  ['nginx_logs_recent', 'Get recent NGINX logs (last 5 lines)', '5'],
  ['nginx_logs_extended', 'Get extended NGINX logs (last 25 lines)', '25'],
  ['nginx_logs_with_timestamps', 'Get NGINX logs with Docker timestamps (last 10 lines)', '10', '--timestamps']
];

logTools.forEach(([name, desc, lines, ...flags]) => {
  server.registerTool(name, { description: desc }, async () => {
    try {
      const result = await executeDockerCommandRobust(['compose', 'logs', '--tail', lines, ...flags, 'nginx']);
      return result.success ? 
        createResponse(`📋 ${desc.replace('Get ', '').replace(/^\w/, c => c.toUpperCase())}\n🕐 ${timestamp()}\n\n${result.stdout}`) :
        createResponse(`❌ Error: ${result.stderr}`);
    } catch (error) {
      return createResponse(`❌ Error: ${error.message}`);
    }
  });
});

server.registerTool('nginx_logs_basic', {
  description: 'Get NGINX logs (last 10 lines)',
}, async () => {
  try {
    const result = await executeDockerCommandRobust(['compose', 'logs', '--tail', '10', 'nginx']);
    if (result.success) {
      const method = result.debug.syncFallback ? 'Synchronous' : result.debug.fallbackUsed ? 'Async Fallback' : 'Primary Async';
      return createResponse(`📋 NGINX Logs (10 most recent lines)\n\n🔧 Method: ${method}\n📝 Command: docker compose logs --tail 10 nginx\n🕐 Retrieved: ${result.debug.timestamp}\n\n📄 Logs:\n${result.stdout}`);
    }
    return createResponse(`❌ Error: ${result.stderr}`);
  } catch (error) {
    return createResponse(`❌ Error: ${error.message}`);
  }
});

const configTools = [
  ['nginx_get_config', 'Retrieve the current NGINX configuration', async () => {
    const response = await axios.get(`${NGINX_URL}/nginx_conf`, { timeout: 10000, headers: AXIOS_CONFIG.headers });
    return `📄 NGINX Configuration\n🕐 Retrieved: ${timestamp()}\n\n${response.data}`;
  }],
  ['nginx_reload', 'Reload NGINX configuration without stopping the server', async () => {
    const result = await executeDockerCommandRobust(['compose', 'exec', 'nginx', 'nginx', '-s', 'reload']);
    return result.success ? 
      `✅ NGINX configuration reloaded successfully!\n🕐 ${timestamp()}\n\n📝 Output: ${result.stdout || 'Configuration reloaded without errors'}` :
      `❌ Failed to reload NGINX configuration: ${result.stderr}`;
  }],
  ['nginx_test_config', 'Test NGINX configuration syntax without applying changes', async () => {
    const result = await executeDockerCommandRobust(['compose', 'exec', 'nginx', 'nginx', '-t']);
    return result.success ? 
      `✅ NGINX configuration test passed!\n🕐 ${timestamp()}\n\n📝 Output: ${result.stderr || result.stdout || 'Configuration syntax is OK'}` :
      `❌ NGINX configuration test failed!\n\n⚠️ Error: ${result.stderr}\n\n💡 Fix the configuration errors before reloading NGINX.`;
  }]
];

configTools.forEach(([name, desc, handler]) => {
  server.registerTool(name, { description: desc }, async () => {
    try {
      return createResponse(await handler());
    } catch (error) {
      return createResponse(`❌ Error: ${error.message}`);
    }
  });
});

const serviceTools = [
  ['nginx_stop', 'Stop the NGINX container', ['compose', 'stop', 'nginx'], '✅ NGINX container stopped successfully!', 'Container stopped'],
  ['nginx_start', 'Start the NGINX container', ['compose', 'up', 'nginx', '-d'], '✅ NGINX container started successfully!', 'Container started in detached mode', `\n\n🌐 NGINX should be available at: ${NGINX_URL}`],
  ['nginx_version', 'Get NGINX version information from the running container', ['compose', 'exec', 'nginx', 'nginx', '-v'], '📦 NGINX Version Information', null]
];

serviceTools.forEach(([name, desc, command, successMsg, defaultOutput, suffix = '']) => {
  server.registerTool(name, { description: desc }, async () => {
    try {
      const result = await executeDockerCommandRobust(command);
      if (result.success) {
        const output = name === 'nginx_version' ? (result.stderr || result.stdout) : (result.stdout || defaultOutput);
        return createResponse(`${successMsg}\n🕐 ${timestamp()}\n\n${name === 'nginx_version' ? '' : '📝 Output: '}${output}${suffix}`);
      }
      return createResponse(`❌ Failed to ${desc.toLowerCase()}: ${result.stderr}`);
    } catch (error) {
      return createResponse(`❌ Error ${desc.toLowerCase().replace('get ', 'getting ')}: ${error.message}`);
    }
  });
});

server.registerResource('nginx://config', {
  description: 'NGINX configuration file content',
  mimeType: 'text/plain'
}, async () => {
  const response = await axios.get(`${NGINX_URL}/nginx_conf`, { timeout: 10000, headers: AXIOS_CONFIG.headers });
  return { contents: [{ uri: 'nginx://config', mimeType: 'text/plain', text: response.data }] };
});

async function main() {
  await server.connect(new StdioServerTransport());
  console.error('✅ NGINX Tools MCP Server started successfully');
}

main().catch((error) => {
  console.error('❌ NGINX Tools MCP Server error:', error);
  process.exit(1);
});
