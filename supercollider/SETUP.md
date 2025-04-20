# Setting Up SuperCollider Audio for the 3D Journal Visualizer

This guide will help you set up the SuperCollider audio system to work with the 3D Journal Visualizer.

## Prerequisites

1. [SuperCollider](https://supercollider.github.io/) (version 3.13.0 or later)
2. Node.js and npm (already installed if you're running the visualization)

## Setup Steps

### 1. Start the WebSocket-OSC Bridge

First, you need to start the WebSocket-OSC bridge server that connects the web application to SuperCollider:

```bash
# In the root directory of the project:
npm run bridge
```

You should see output similar to:
```
Starting WebSocket to OSC Bridge Server
=======================================
This server connects your browser application to SuperCollider
Make sure SuperCollider is running with warholEmotions.scd loaded
WebSocket server started on port 8080
OSC UDP connection ready, sending to 127.0.0.1:57121
Bridge server is ready to connect browser with SuperCollider!
```

**Keep this terminal window open while using the visualization.**

### 2. Launch SuperCollider

1. Open SuperCollider
2. Open the file `supercollider/warholEmotions.scd` in SuperCollider
3. Start the SuperCollider server by pressing `Ctrl+B` or clicking "Boot Server"
4. Run the script by selecting all code and pressing `Ctrl+Enter` or using "Evaluate Selection"
5. You should see messages in the SuperCollider post window confirming the OSC responders are set up

### 3. Load the Visualization

1. In another terminal window, start the visualization:
```bash
npm run dev
```
2. Open the provided URL in your browser
3. When you click on a journal entry, you should now hear sound generated based on the entry's emotion values

## Troubleshooting

If you're not hearing sound when selecting journal entries:

1. Check that both the WebSocket-OSC bridge and SuperCollider are running
2. Verify the SuperCollider post window for any error messages
3. In the browser console, look for WebSocket connection messages
4. Ensure the bridge server says "Browser connected to WebSocket server" when you load the page
5. Make sure SuperCollider's server is booted and the script is evaluated

## Advanced: Testing Audio Independently

You can test the SuperCollider system without the full visualization:

1. In SuperCollider, with the server running and the script loaded, run:
```supercollider
// Test with equal values for all emotions
~testEmotions.value([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);

// Test with high joy value
~testEmotions.value([0.9, 0.2, 0.1, 0.3, 0.1, 0.0, 0.0, 0.4]);

// Stop all sounds
~stopAllSounds.value;
```

## Architecture Overview

The audio system uses three components:

1. **Web Application** - Sends emotion data via WebSocket when entries are selected
2. **WebSocket-OSC Bridge** - Converts WebSocket messages to OSC messages
3. **SuperCollider** - Receives OSC messages and generates algorithmic music

The emotion values control different parameters of the sound synthesis, creating a unique sonic representation of each journal entry's emotional content. 