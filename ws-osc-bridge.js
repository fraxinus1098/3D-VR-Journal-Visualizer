#!/usr/bin/env node

/**
 * WebSocket to OSC Bridge Server
 * 
 * This server creates a WebSocket server that forwards messages to SuperCollider via OSC.
 * It acts as a bridge between the browser application and SuperCollider.
 * 
 * Run this with: npm run bridge
 * 
 * Make sure SuperCollider is running with the warholEmotions.scd file loaded before starting
 * this bridge server.
 */

import { WebSocketServer } from 'ws';
import osc from 'osc';

console.log('Starting WebSocket to OSC Bridge Server');
console.log('=======================================');
console.log('This server connects your browser application to SuperCollider');
console.log('Make sure SuperCollider is running with warholEmotions.scd loaded');

// Create WebSocket server
const wss = new WebSocketServer({ port: 8080 });
console.log('WebSocket server started on port 8080');

// Create OSC UDP connection to SuperCollider
const udpPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 57122,
  remoteAddress: "127.0.0.1",
  remotePort: 57121,
  metadata: true
});

// Open the OSC UDP connection
udpPort.open();

udpPort.on("ready", () => {
  console.log(`OSC UDP connection ready, sending to 127.0.0.1:57121`);
  console.log('Bridge server is ready to connect browser with SuperCollider!');
});

udpPort.on("error", (error) => {
  console.error("OSC UDP connection error:", error);
  console.error("Make sure SuperCollider is running and listening on port 57121");
});

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('Browser connected to WebSocket server');
  
  // Send a welcome message back to the client
  ws.send(JSON.stringify({ status: 'connected', message: 'Connected to WebSocket OSC bridge' }));
  
  // Handle incoming messages from the browser
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received message from browser:', data);
      
      // Check if it's a valid OSC message
      if (data.address && data.values && Array.isArray(data.values)) {
        // Convert to OSC message format
        const oscMessage = {
          address: data.address,
          args: data.values.map(value => ({ type: "f", value }))
        };
        
        // Send to SuperCollider
        udpPort.send(oscMessage);
        console.log('Forwarded message to SuperCollider:', oscMessage);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Handle WebSocket connection close
  ws.on('close', () => {
    console.log('Browser disconnected from WebSocket server');
    
    // Send all zeros to SuperCollider to stop any active sounds
    const stopMessage = {
      address: "/warhol/entry/emotions",
      args: Array(8).fill({ type: "f", value: 0 })
    };
    
    udpPort.send(stopMessage);
    console.log('Sent stop message to SuperCollider');
  });
});

// Handle server shutdown
process.on('SIGINT', () => {
  console.log('Shutting down WebSocket OSC bridge server...');
  
  // Send all zeros to SuperCollider
  const stopMessage = {
    address: "/warhol/entry/emotions",
    args: Array(8).fill({ type: "f", value: 0 })
  };
  
  udpPort.send(stopMessage);
  
  // Close OSC connection
  udpPort.close();
  
  // Close all WebSocket connections
  wss.clients.forEach(client => {
    client.close();
  });
  
  // Close WebSocket server
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});

console.log('WebSocket to OSC bridge server running...');
console.log('Press Ctrl+C to stop'); 