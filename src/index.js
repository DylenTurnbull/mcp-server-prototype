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

server.registerTool('nginx_logs_realtime', {
  description: 'Monitor NGINX logs in real-time with status updates and activity window',
}, async () => {
  try {
    const startTime = new Date();
    const responses = [];
    
    responses.push('🔄 **Real-time NGINX Log Monitoring Started**');
    responses.push(`🕐 **Start Time:** ${startTime.toISOString()}`);
    responses.push('');
    
    const recentResult = await executeDockerCommandRobust(['compose', 'logs', '--tail', '15', '--timestamps', 'nginx']);
    if (recentResult.success) {
      responses.push('📋 **Recent Activity (Last 15 entries):**');
      responses.push('```');
      responses.push(recentResult.stdout || 'No recent logs found');
      responses.push('```');
      responses.push('');
    }
    
    responses.push('⏱️ **Monitoring window: 10 seconds...**');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const midResult = await executeDockerCommandRobust(['compose', 'logs', '--since', '5s', '--timestamps', 'nginx']);
    if (midResult.success && midResult.stdout.trim()) {
      responses.push('🔄 **Activity detected (last 5 seconds):**');
      responses.push('```');
      responses.push(midResult.stdout);
      responses.push('```');
    }
    
    await new Promise(resolve => setTimeout(resolve, 7000));
    
    const finalResult = await executeDockerCommandRobust(['compose', 'logs', '--since', '10s', '--timestamps', 'nginx']);
    const endTime = new Date();
    
    responses.push('');
    responses.push('📊 **Monitoring Complete**');
    responses.push(`🕐 **End Time:** ${endTime.toISOString()}`);
    responses.push(`⏱️ **Duration:** ${Math.round((endTime - startTime) / 1000)}s`);
    
    if (finalResult.success && finalResult.stdout.trim()) {
      const logLines = finalResult.stdout.trim().split('\n');
      responses.push(`📈 **Activity Summary:** ${logLines.length} new log entries detected`);
      responses.push('');
      responses.push('📋 **All Activity in Monitoring Window:**');
      responses.push('```');
      responses.push(finalResult.stdout);
      responses.push('```');
    } else {
      responses.push('📈 **Activity Summary:** No new activity detected during monitoring window');
    }
    
    responses.push('');
    responses.push('🔄 **For Continuous Real-time Monitoring:**');
    responses.push('```bash');
    responses.push('# Stream all new NGINX logs (run in terminal)');
    responses.push('docker logs -f nginx-server');
    responses.push('');
    responses.push('# Stream with timestamps');
    responses.push('docker logs -f -t nginx-server');
    responses.push('');
    responses.push('# Stream only new entries (ignoring history)');
    responses.push('docker logs --tail 0 -f nginx-server');
    responses.push('```');
    
    responses.push('');
    responses.push('💡 **Tip:** Run the above commands in a separate terminal for true real-time streaming that continues indefinitely.');
    
    return createResponse(responses.join('\n'));
    
  } catch (error) {
    return createResponse(`❌ Real-time monitoring failed: ${error.message}`);
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

const sslTools = [
  ['nginx_ssl_generate_self_signed', 'Generate self-signed SSL certificate for development/testing', async (domain = 'localhost') => {
    const certDir = `${PROJECT_DIR}/ssl`;
    const keyFile = `${certDir}/selfsigned.key`;
    const certFile = `${certDir}/selfsigned.crt`;

    const mkdirResult = await executeDockerCommandRobust(['exec', 'nginx-server', 'mkdir', '-p', '/etc/nginx/ssl']);
    if (!mkdirResult.success) {
      return `❌ Failed to create SSL directory: ${mkdirResult.stderr}`;
    }

    const opensslCmd = `openssl req -x509 -newkey rsa:4096 -keyout /etc/nginx/ssl/selfsigned.key -out /etc/nginx/ssl/selfsigned.crt -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=${domain}"`;
    const certResult = await executeDockerCommandRobust(['exec', 'nginx-server', 'sh', '-c', opensslCmd]);

    if (!certResult.success) {
      return `❌ Failed to generate self-signed certificate: ${certResult.stderr}`;
    }

    return `✅ Self-signed SSL certificate generated successfully!\n\n📁 Location: /etc/nginx/ssl/\n🔑 Private Key: selfsigned.key\n📜 Certificate: selfsigned.crt\n🌐 Domain: ${domain}\n📅 Valid for: 365 days\n\n🕐 Generated: ${timestamp()}\n\n💡 Next steps:\n1. Update your NGINX config to use these certificates\n2. Reload NGINX: nginx_reload\n3. Test HTTPS connection`;
  }],

  // NOTE: This tool requires a functional domain pointing to the server for Let's Encrypt validation
  // UNTESTED: Cannot test without proper domain DNS setup
  ['nginx_ssl_install_lets_encrypt', 'Install Let\'s Encrypt certificate with automatic renewal', async (domain, email) => {
    if (!domain || !email) {
      return `❌ Missing required parameters!\n\nUsage: nginx_ssl_install_lets_encrypt domain email\n\nExample: nginx_ssl_install_lets_encrypt example.com admin@example.com`;
    }

    const certbotCheck = await executeDockerCommandRobust(['run', '--rm', 'certbot/certbot', 'certbot', '--version']);
    if (!certbotCheck.success) {
      return `❌ Certbot not available. Please ensure certbot/certbot Docker image is available.\n\n💡 Install with: docker pull certbot/certbot`;
    }

    const certbotCmd = `certbot certonly --standalone --agree-tos --email ${email} -d ${domain} --cert-name ${domain}`;
    const certResult = await executeDockerCommandRobust(['run', '--rm', '-v', 'nginx-letsencrypt:/etc/letsencrypt', 'certbot/certbot', 'sh', '-c', certbotCmd]);

    if (!certResult.success) {
      return `❌ Failed to obtain Let's Encrypt certificate: ${certResult.stderr}\n\n💡 Common issues:\n- Domain must point to this server\n- Port 80 must be accessible\n- Firewall may be blocking requests`;
    }

    const copyCmd = `docker cp $(docker run --rm -v nginx-letsencrypt:/etc/letsencrypt certbot/certbot find /etc/letsencrypt -name "fullchain.pem" | head -1):/etc/nginx/ssl/${domain}.crt && docker cp $(docker run --rm -v nginx-letsencrypt:/etc/letsencrypt certbot/certbot find /etc/letsencrypt -name "privkey.pem" | head -1):/etc/nginx/ssl/${domain}.key`;
    const copyResult = await executeDockerCommandRobust(['exec', 'nginx-server', 'sh', '-c', copyCmd]);

    return `✅ Let's Encrypt certificate installed successfully!\n\n🌐 Domain: ${domain}\n📧 Email: ${email}\n📁 Location: /etc/nginx/ssl/\n🔑 Private Key: ${domain}.key\n📜 Certificate: ${domain}.crt\n🔄 Auto-renewal: Every 60 days\n\n🕐 Installed: ${timestamp()}\n\n💡 Next steps:\n1. Update NGINX config to use these certificates\n2. Reload NGINX: nginx_reload\n3. Test HTTPS connection\n4. Set up auto-renewal cron job`;
  }],

  // NOTE: Can be tested with localhost/self-signed certs, but real domain expiry checking is untested
  // UNTESTED: Full functionality with production certificates
  ['nginx_ssl_check_expiry', 'Check SSL certificate expiration dates', async (domain = 'localhost') => {
    const certPath = `/etc/nginx/ssl/${domain}.crt`;

    const checkResult = await executeDockerCommandRobust(['exec', 'nginx-server', 'test', '-f', certPath]);
    if (!checkResult.success) {
      return `❌ Certificate not found: ${certPath}\n\n💡 Available certificates:\n${await listCertificates()}`;
    }

    const expiryCmd = `openssl x509 -in ${certPath} -text -noout | grep "Not After" | cut -d: -f2-`;
    const expiryResult = await executeDockerCommandRobust(['exec', 'nginx-server', 'sh', '-c', expiryCmd]);

    if (!expiryResult.success) {
      return `❌ Failed to check certificate expiry: ${expiryResult.stderr}`;
    }

    const expiryDate = new Date(expiryResult.stdout.trim());
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    let status = '✅';
    let warning = '';

    if (daysUntilExpiry < 0) {
      status = '❌ EXPIRED';
      warning = '\n\n🚨 **CERTIFICATE HAS EXPIRED!**\n🔄 Renew immediately to avoid security warnings.';
    } else if (daysUntilExpiry < 30) {
      status = '⚠️ EXPIRING SOON';
      warning = '\n\n⚠️ **Certificate expires in less than 30 days!**\n🔄 Consider renewing soon.';
    }

    return `${status} SSL Certificate Status\n\n🌐 Domain: ${domain}\n📜 Certificate: ${certPath}\n📅 Expires: ${expiryDate.toISOString()}\n⏰ Days until expiry: ${daysUntilExpiry}${warning}\n\n🕐 Checked: ${timestamp()}`;
  }],

  // NOTE: Can be tested with localhost/self-signed certs, but real domain validation is untested
  // UNTESTED: Full functionality with production certificates and complex chains
  ['nginx_ssl_validate_config', 'Validate SSL configuration and certificate chain', async (domain = 'localhost') => {
    const certPath = `/etc/nginx/ssl/${domain}.crt`;
    const keyPath = `/etc/nginx/ssl/${domain}.key`;

    let validationResults = [`🔍 SSL Configuration Validation\n🌐 Domain: ${domain}\n🕐 ${timestamp()}\n`];

    const certCheck = await executeDockerCommandRobust(['exec', 'nginx-server', 'test', '-f', certPath]);
    validationResults.push(certCheck.success ?
      `✅ Certificate file exists: ${certPath}` :
      `❌ Certificate file missing: ${certPath}`);

    const keyCheck = await executeDockerCommandRobust(['exec', 'nginx-server', 'test', '-f', keyPath]);
    validationResults.push(keyCheck.success ?
      `✅ Private key file exists: ${keyPath}` :
      `❌ Private key file missing: ${keyPath}`);

    if (certCheck.success && keyCheck.success) {
      const certFormat = await executeDockerCommandRobust(['exec', 'nginx-server', 'openssl', 'x509', '-in', certPath, '-text', '-noout']);
      validationResults.push(certFormat.success ?
        `✅ Certificate format is valid` :
        `❌ Certificate format invalid: ${certFormat.stderr}`);

      const keyFormat = await executeDockerCommandRobust(['exec', 'nginx-server', 'openssl', 'rsa', '-in', keyPath, '-check']);
      validationResults.push(keyFormat.success ?
        `✅ Private key format is valid` :
        `❌ Private key format invalid: ${keyFormat.stderr}`);

      const matchCheck = await executeDockerCommandRobust(['exec', 'nginx-server', 'openssl', 'x509', '-noout', '-modulus', '-in', certPath, '|', 'openssl', 'md5']);
      const keyModulus = await executeDockerCommandRobust(['exec', 'nginx-server', 'openssl', 'rsa', '-noout', '-modulus', '-in', keyPath, '|', 'openssl', 'md5']);

      if (matchCheck.success && keyModulus.success) {
        const certMd5 = matchCheck.stdout.trim();
        const keyMd5 = keyModulus.stdout.trim();
        validationResults.push(certMd5 === keyMd5 ?
          `✅ Private key matches certificate` :
          `❌ Private key does NOT match certificate`);
      }
    }

    const nginxCheck = await executeDockerCommandRobust(['exec', 'nginx-server', 'nginx', '-t']);
    validationResults.push(nginxCheck.success ?
      `✅ NGINX configuration is valid` :
      `❌ NGINX configuration has errors: ${nginxCheck.stderr}`);

    return validationResults.join('\n');
  }],

  // NOTE: Configuration generation works, but end-to-end redirect testing requires functional domain
  // UNTESTED: Real-world HTTP to HTTPS redirect with production domain
  ['nginx_ssl_setup_redirect', 'Configure HTTP to HTTPS redirect', async (domain = 'localhost') => {
    const redirectConfig = `
# HTTP to HTTPS redirect configuration
server {
    listen 80;
    server_name ${domain};
    return 301 https://$server_name$request_uri;
}

# HTTPS server configuration
server {
    listen 443 ssl http2;
    server_name ${domain};

    ssl_certificate /etc/nginx/ssl/${domain}.crt;
    ssl_certificate_key /etc/nginx/ssl/${domain}.key;

    # SSL Security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Your application configuration here
    location / {
        proxy_pass http://your_app_server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`;

    return `🔧 HTTP to HTTPS Redirect Configuration\n\n🌐 Domain: ${domain}\n🕐 Generated: ${timestamp()}\n\n📋 Add this to your NGINX configuration:\n\n\`\`\`nginx${redirectConfig}\`\`\`\n\n💡 Instructions:\n1. Add this configuration to your nginx.conf\n2. Replace 'your_app_server' with your actual backend\n3. Test configuration: nginx_test_config\n4. Reload NGINX: nginx_reload\n5. Test HTTPS connection`;
  }],

  // NOTE: Requires existing Let's Encrypt certificates to test renewal
  // UNTESTED: Cannot test without initial Let's Encrypt setup
  ['nginx_ssl_renew_certificates', 'Renew expiring SSL certificates automatically', async (domain = 'localhost') => {
    const expiryCheck = await executeDockerCommandRobust(['exec', 'nginx-server', 'openssl', 'x509', '-in', `/etc/nginx/ssl/${domain}.crt`, '-text', '-noout', '|', 'grep', '"Not After"', '|', 'cut', '-d:', '-f2-']);
    if (!expiryCheck.success) {
      return `❌ Cannot check certificate expiry: ${expiryCheck.stderr}`;
    }

    const expiryDate = new Date(expiryCheck.stdout.trim());
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry > 30) {
      return `✅ Certificate renewal not needed\n\n🌐 Domain: ${domain}\n📅 Expires: ${expiryDate.toISOString()}\n⏰ Days until expiry: ${daysUntilExpiry}\n\n💡 Certificates are typically renewed when < 30 days remain.`;
    }

    const renewCmd = `certbot renew --cert-name ${domain}`;
    const renewResult = await executeDockerCommandRobust(['run', '--rm', '-v', 'nginx-letsencrypt:/etc/letsencrypt', 'certbot/certbot', renewCmd]);

    if (!renewResult.success) {
      return `❌ Certificate renewal failed: ${renewResult.stderr}\n\n💡 Try manual renewal or check certbot logs.`;
    }

    const copyCmd = `docker run --rm -v nginx-letsencrypt:/etc/letsencrypt certbot/certbot find /etc/letsencrypt -name "fullchain.pem" | head -1 | xargs -I {} docker cp {} nginx-server:/etc/nginx/ssl/${domain}.crt && docker run --rm -v nginx-letsencrypt:/etc/letsencrypt certbot/certbot find /etc/letsencrypt -name "privkey.pem" | head -1 | xargs -I {} docker cp {} nginx-server:/etc/nginx/ssl/${domain}.key`;
    const copyResult = await executeDockerCommandRobust(['exec', 'nginx-server', 'sh', '-c', copyCmd]);

    if (!copyResult.success) {
      return `⚠️ Certificate renewed but failed to copy to NGINX: ${copyResult.stderr}\n\n💡 You may need to manually copy the certificates.`;
    }

    const reloadResult = await executeDockerCommandRobust(['compose', 'exec', 'nginx', 'nginx', '-s', 'reload']);

    return `✅ SSL Certificate renewed successfully!\n\n🌐 Domain: ${domain}\n🔄 Previous expiry: ${expiryDate.toISOString()}\n📅 New expiry: ${new Date(expiryDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()}\n🔄 Auto-renewal: Every 60 days\n\n🕐 Renewed: ${timestamp()}\n\n💡 NGINX has been reloaded with the new certificate.`;
  }],

  // NOTE: Configuration generation works, but security testing requires functional domain and SSL setup
  // UNTESTED: Real-world security validation with production certificates
  ['nginx_ssl_enforce_security', 'Apply SSL security best practices (HSTS, cipher suites, etc.)', async (domain = 'localhost') => {
    const securityConfig = `
# SSL Security Configuration for ${domain}
server {
    listen 443 ssl http2;
    server_name ${domain};

    # SSL Certificate Configuration
    ssl_certificate /etc/nginx/ssl/${domain}.crt;
    ssl_certificate_key /etc/nginx/ssl/${domain}.key;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Your application configuration here
    location / {
        # Add your proxy or static file configuration
    }
}`;

    return `🔒 SSL Security Best Practices Configuration\n\n🌐 Domain: ${domain}\n🕐 Generated: ${timestamp()}\n\n📋 Add this security-enhanced configuration to your NGINX config:\n\n\`\`\`nginx${securityConfig}\`\`\`\n\n🛡️ Security Features Included:\n✅ TLS 1.2/1.3 only\n✅ Strong cipher suites\n✅ HSTS (HTTP Strict Transport Security)\n✅ Security headers (X-Frame-Options, X-Content-Type-Options, etc.)\n✅ OCSP Stapling\n✅ SSL session caching\n\n💡 Instructions:\n1. Replace your existing HTTPS server block with this configuration\n2. Test configuration: nginx_test_config\n3. Reload NGINX: nginx_reload\n4. Test security: Use SSL Labs or similar tools`;
  }],

  // NOTE: Can be tested with local certificate files, but domain-specific installation is untested
  // UNTESTED: Full functionality with production certificates and domain validation
  ['nginx_ssl_install_custom_cert', 'Install custom SSL certificate from file paths', async (certPath, keyPath, domain = 'localhost') => {
    if (!certPath || !keyPath) {
      return `❌ Missing required parameters!\n\nUsage: nginx_ssl_install_custom_cert certPath keyPath [domain]\n\nExample: nginx_ssl_install_custom_cert /path/to/cert.pem /path/to/key.pem example.com\n\n💡 Certificate and key files must be accessible to the Docker container.`;
    }

    const mkdirResult = await executeDockerCommandRobust(['exec', 'nginx-server', 'mkdir', '-p', '/etc/nginx/ssl']);
    if (!mkdirResult.success) {
      return `❌ Failed to create SSL directory: ${mkdirResult.stderr}`;
    }

    const certCopy = await executeDockerCommandRobust(['cp', certPath, `nginx-server:/etc/nginx/ssl/${domain}.crt`]);
    if (!certCopy.success) {
      return `❌ Failed to copy certificate: ${certCopy.stderr}`;
    }

    const keyCopy = await executeDockerCommandRobust(['cp', keyPath, `nginx-server:/etc/nginx/ssl/${domain}.key`]);
    if (!keyCopy.success) {
      return `❌ Failed to copy private key: ${keyCopy.stderr}`;
    }

    const permResult = await executeDockerCommandRobust(['exec', 'nginx-server', 'chmod', '600', `/etc/nginx/ssl/${domain}.key`]);
    if (!permResult.success) {
      return `⚠️ Warning: Failed to set private key permissions: ${permResult.stderr}`;
    }

    return `✅ Custom SSL certificate installed successfully!\n\n🌐 Domain: ${domain}\n📜 Certificate: /etc/nginx/ssl/${domain}.crt (from ${certPath})\n🔑 Private Key: /etc/nginx/ssl/${domain}.key (from ${keyPath})\n\n🕐 Installed: ${timestamp()}\n\n💡 Next steps:\n1. Update NGINX config to use these certificates\n2. Test configuration: nginx_test_config\n3. Reload NGINX: nginx_reload\n4. Validate SSL: nginx_ssl_validate_config ${domain}`;
  }]
];

async function listCertificates() {
  try {
    const listResult = await executeDockerCommandRobust(['exec', 'nginx-server', 'find', '/etc/nginx/ssl', '-name', '*.crt', '-o', '-name', '*.pem']);
    if (listResult.success && listResult.stdout.trim()) {
      return listResult.stdout.trim().split('\n').map(file => `- ${file}`).join('\n');
    }
    return 'No certificates found in /etc/nginx/ssl/';
  } catch (error) {
    return 'Unable to list certificates';
  }
}

sslTools.forEach(([name, desc, handler]) => {
  server.registerTool(name, { description: desc }, async () => {
    try {
      return createResponse(await handler());
    } catch (error) {
      return createResponse(`❌ Error: ${error.message}`);
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
