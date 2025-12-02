#!/usr/bin/env node

/**
 * Simple Screeps Code Uploader
 * 
 * Usage:
 *   1. Create a .screepsrc file with your credentials:
 *      email=your@email.com
 *      password=yourpassword
 *      branch=default
 *   
 *   2. Run: node upload.js [--branch=<branch>]
 *   
 *   Examples:
 *     node upload.js                    # Uses branch from .screepsrc
 *     node upload.js --branch=dev       # Uploads to 'dev' branch
 *     node upload.js --branch=main      # Uploads to 'main' branch
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Parse command line arguments
function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    // Support --branch=value or --branch value
    if (arg.startsWith('--branch=')) {
      args.branch = arg.split('=')[1];
    } else if (arg === '--branch' && i + 1 < process.argv.length) {
      args.branch = process.argv[++i];
    } else if (arg.startsWith('-b=')) {
      args.branch = arg.split('=')[1];
    } else if (arg === '-b' && i + 1 < process.argv.length) {
      args.branch = process.argv[++i];
    } else if (!arg.startsWith('-') && !args.branch) {
      // If it's not a flag and we don't have a branch yet, treat it as branch name
      args.branch = arg;
    }
  }
  return args;
}

// Load configuration
function loadConfig() {
  const configPath = path.join(__dirname, '.screepsrc');
  const config = {};
  
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        config[match[1].trim()] = match[2].trim();
      }
    });
  } else {
    console.error('Error: .screepsrc file not found!');
    console.error('Create a .screepsrc file with:');
    console.error('  email=your@email.com');
    console.error('  password=yourpassword');
    console.error('  branch=default');
    process.exit(1);
  }
  
  if (!config.email || !config.password) {
    console.error('Error: email and password required in .screepsrc');
    process.exit(1);
  }
  
  // Override branch from command line if provided
  const args = parseArgs();
  if (args.branch) {
    config.branch = args.branch;
    console.log(`Using branch from command line: ${config.branch}`);
  }
  
  return config;
}

// Read all JS files from src directory (recursively, excluding old/)
function readModules(srcDir, baseDir = srcDir) {
  const modules = {};
  
  function readDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      
      // Skip old/ directory and node_modules
      if (entry.isDirectory()) {
        if (entry.name === 'old' || entry.name === 'node_modules') {
          continue;
        }
        readDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        const moduleName = relativePath.replace(/\.js$/, '');
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          modules[moduleName] = content;
        } catch (e) {
          console.warn(`Warning: Could not read ${fullPath}: ${e.message}`);
        }
      }
    }
  }
  
  readDir(srcDir);
  return modules;
}

// Make API request
function uploadCode(email, password, branch, modules) {
  return new Promise((resolve, reject) => {
    // First, authenticate to get token
    const authData = JSON.stringify({ email, password });
    
    const authOptions = {
      hostname: 'screeps.com',
      path: '/api/auth/signin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': authData.length
      }
    };
    
    const authReq = https.request(authOptions, (authRes) => {
      let authData = '';
      
      authRes.on('data', (chunk) => {
        authData += chunk;
      });
      
      authRes.on('end', () => {
        if (authRes.statusCode !== 200) {
          let errorMsg = `Authentication failed: ${authRes.statusCode}`;
          try {
            const errorJson = JSON.parse(authData);
            if (errorJson.error) {
              errorMsg += ` - ${errorJson.error}`;
            } else {
              errorMsg += ` - ${authData.substring(0, 200)}`;
            }
          } catch (e) {
            errorMsg += ` - ${authData.substring(0, 200)}`;
          }
          reject(new Error(errorMsg));
          return;
        }
        
        try {
          const authResult = JSON.parse(authData);
          const token = authResult.token;
          
          if (!token) {
            reject(new Error('No token received from authentication. Response: ' + authData.substring(0, 200)));
            return;
          }
          
          console.log('✓ Authentication successful');
          
          // Now upload code
          const codePayload = { branch, modules };
          
          // Validate JSON can be stringified
          let codeData;
          try {
            codeData = JSON.stringify(codePayload);
          } catch (e) {
            reject(new Error(`Failed to stringify modules: ${e.message}`));
            return;
          }
          
          const codeDataBuffer = Buffer.from(codeData, 'utf8');
          
          console.log(`Uploading ${codeDataBuffer.length} bytes...`);
          
          const codeOptions = {
            hostname: 'screeps.com',
            path: '/api/user/code',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'X-Token': token,
              'Content-Length': codeDataBuffer.length
            }
          };
          
          const codeReq = https.request(codeOptions, (codeRes) => {
            let codeResponse = '';
            
            codeRes.on('data', (chunk) => {
              codeResponse += chunk;
            });
            
            codeRes.on('end', () => {
              if (codeRes.statusCode === 200) {
                console.log('✓ Code uploaded successfully!');
                console.log(`  Branch: ${branch}`);
                console.log(`  Modules: ${Object.keys(modules).length}`);
                resolve();
              } else {
                // Try to parse error response
                let errorMsg = `Upload failed: ${codeRes.statusCode}`;
                try {
                  const errorJson = JSON.parse(codeResponse);
                  if (errorJson.error) {
                    errorMsg += ` - ${errorJson.error}`;
                  } else {
                    errorMsg += ` - ${codeResponse.substring(0, 200)}`;
                  }
                } catch (e) {
                  errorMsg += ` - ${codeResponse.substring(0, 200)}`;
                }
                reject(new Error(errorMsg));
              }
            });
          });
          
          codeReq.on('error', (err) => {
            reject(new Error(`Request error: ${err.message}`));
          });
          
          // Write data and end request
          codeReq.write(codeDataBuffer);
          codeReq.end();
          
        } catch (e) {
          reject(new Error(`Failed to parse auth response: ${e.message}`));
        }
      });
    });
    
    authReq.on('error', reject);
    authReq.write(authData);
    authReq.end();
  });
}

// Main
async function main() {
  const config = loadConfig();
  const srcDir = path.join(__dirname, 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error(`Error: src directory not found at ${srcDir}`);
    process.exit(1);
  }
  
  console.log('Reading modules from src/...');
  const modules = readModules(srcDir);
  const moduleCount = Object.keys(modules).length;
  console.log(`Found ${moduleCount} modules`);
  
  // Calculate total size
  const totalSize = JSON.stringify(modules).length;
  console.log(`Total code size: ${(totalSize / 1024).toFixed(2)} KB`);
  
  if (totalSize > 1024 * 1024) {
    console.warn('Warning: Code size exceeds 1MB, upload may fail');
  }
  
  console.log('Authenticating...');
  
  try {
    await uploadCode(
      config.email,
      config.password,
      config.branch || 'default',
      modules
    );
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

