#!/usr/bin/env node

/**
 * WebSocket-OSC Bridge Server Test
 * This script checks if the WebSocket-OSC bridge server is correctly
 * listening on port 8080.
 * 
 * Run with: node test-bridge.js
 */

import { createServer } from 'http';
import WebSocket from 'ws';
import { networkInterfaces } from 'os';

console.log('WebSocket-OSC Bridge Server Test');
console.log('===============================');

// Check if port 8080 is already in use
function checkPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`✓ Port ${port} is in use - this is expected if the bridge server is running`);
        resolve(true);
      } else {
        console.error(`Error checking port ${port}:`, err);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      console.error(`✗ Port ${port} is NOT in use - this means the bridge server is NOT running`);
      server.close();
      resolve(false);
    });
    
    server.listen(port);
  });
}

// Try to connect to the WebSocket server
function testWebSocketConnection(url) {
  return new Promise((resolve) => {
    console.log(`Testing WebSocket connection to ${url}...`);
    
    const socket = new WebSocket(url);
    let isResolved = false;
    
    // Set a timeout
    const timeout = setTimeout(() => {
      if (!isResolved) {
        console.error(`✗ Connection to ${url} timed out after 5 seconds`);
        if (socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
        isResolved = true;
        resolve(false);
      }
    }, 5000);
    
    socket.on('open', () => {
      console.log(`✓ Successfully connected to ${url}`);
      
      // Try sending a test message
      try {
        const testMessage = {
          address: "/warhol/test",
          values: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
        };
        
        socket.send(JSON.stringify(testMessage));
        console.log(`✓ Test message sent to ${url}`);
      } catch (error) {
        console.error(`✗ Error sending test message:`, error.message);
      }
      
      clearTimeout(timeout);
      
      // Close the socket after a brief delay to allow the message to be sent
      setTimeout(() => {
        socket.close();
        if (!isResolved) {
          isResolved = true;
          resolve(true);
        }
      }, 1000);
    });
    
    socket.on('message', (data) => {
      console.log(`✓ Received response from server:`, data.toString());
    });
    
    socket.on('error', (error) => {
      console.error(`✗ WebSocket error:`, error.message);
      clearTimeout(timeout);
      if (!isResolved) {
        isResolved = true;
        resolve(false);
      }
    });
    
    socket.on('close', (code, reason) => {
      console.log(`Connection closed (code: ${code}, reason: ${reason || 'none'})`);
      if (!isResolved) {
        isResolved = true;
        resolve(code === 1000); // Normal closure
      }
    });
  });
}

// Get local IP addresses
function getLocalIPs() {
  const interfaces = networkInterfaces();
  const addresses = [];
  
  Object.keys(interfaces).forEach((name) => {
    interfaces[name].forEach((iface) => {
      // Skip internal/non-IPv4 addresses
      if (!iface.internal && iface.family === 'IPv4') {
        addresses.push(iface.address);
      }
    });
  });
  
  return addresses;
}

async function runTests() {
  console.log('\nChecking if the bridge server is running...');
  const portInUse = await checkPort(8080);
  
  if (!portInUse) {
    console.error('\n✗ The bridge server is NOT running on port 8080');
    console.error('Please start it with: npm run bridge');
    return;
  }
  
  // Try connecting to different URLs
  console.log('\nTesting WebSocket connections:');
  
  const urls = [
    'ws://localhost:8080',
    'ws://127.0.0.1:8080'
  ];
  
  // Add local IPs
  const localIPs = getLocalIPs();
  localIPs.forEach(ip => {
    urls.push(`ws://${ip}:8080`);
  });
  
  let anySuccess = false;
  
  for (const url of urls) {
    const success = await testWebSocketConnection(url);
    if (success) {
      anySuccess = true;
      console.log(`✓ Connection to ${url} was successful`);
    }
  }
  
  if (anySuccess) {
    console.log('\n✓ The bridge server is running and accepting WebSocket connections');
    console.log('Your browser should be able to connect to it');
  } else {
    console.log('\n✗ Could not connect to the bridge server via WebSocket');
    console.log('Possible issues:');
    console.log('1. The server is running but not accepting WebSocket connections');
    console.log('2. A firewall is blocking connections');
    console.log('3. The server is listening on a different port');
  }
  
  console.log('\nNext steps:');
  console.log('1. Check for errors in the terminal where you ran "npm run bridge"');
  console.log('2. Make sure SuperCollider is running with the warholEmotions.scd file loaded');
  console.log('3. Try restarting the bridge server');
  console.log('4. Open the test-connection.html file in your browser for interactive testing');
}

runTests().catch(error => {
  console.error('Error running tests:', error);
}); 