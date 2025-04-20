# SuperCollider Audio Implementation

This directory contains SuperCollider files for generating dynamic, algorithmic music based on journal entry emotion values.

## Overview

The SuperCollider implementation replaces the previous Web Audio API approach with real-time algorithmic composition. Each emotion (joy, trust, fear, surprise, sadness, disgust, anger, anticipation) has its own unique instrument with parameterized tempo and timbre characteristics.

## Files

- `warholEmotions.scd` - Main SuperCollider file containing SynthDefs, patterns, and test functions

## Setup

1. Install [SuperCollider](https://supercollider.github.io/) version 3.13.0 or later
2. Open `warholEmotions.scd` in SuperCollider
3. Start the SuperCollider server by pressing Ctrl+B or clicking "Boot Server"
4. Run the main code block by selecting all code in the first large section and pressing Ctrl+Enter
5. After you see "Warhol Emotions ready!" in the post window, you can begin testing emotions

## Usage (Modified Approach)

Instead of using OSC communication, we've switched to a direct triggering approach:

1. Start both the web application and SuperCollider
2. As you explore the 3D visualization and select journal entries, manually trigger the corresponding emotions in SuperCollider
3. Use the following function to trigger emotions:

```
~superDirectTest.value("emotion", intensity);
```

Where:
- `emotion` is one of: "joy", "trust", "fear", "surprise", "sadness", "disgust", "anger", "anticipation"
- `intensity` is a value between 0.0 and 1.0

### Example Commands

```
// Trigger joy emotion with intensity 0.8
~superDirectTest.value("joy", 0.8);

// Trigger sadness emotion with intensity 0.7
~superDirectTest.value("sadness", 0.7);

// Stop all currently playing patterns
~stopAllPatterns.value;
```

### Additional Test Functions

Several test functions are available for different purposes:

- `~superDirectTest.value("emotion", intensity)` - Best option for reliable sound output
- `~directTestEmotionHardware.value("emotion", intensity)` - Direct hardware output for some emotions
- `~veryLoudDirectTest.value()` - Play a loud test tone directly to hardware
- `~directBeep.value()` - Simple test beep to verify audio output
- `~simpleBeep.value()` - Alternative test beep
- `~stopAllPatterns.value()` - Stop all playing patterns

## Troubleshooting

If you encounter issues with audio playback:

1. Verify your audio device is working with `~directBeep.value()`
2. Check if SuperCollider server is running (you should see "localhost" in the bottom status bar)
3. Make sure you've evaluated the main code block before running test functions
4. Try restarting the SuperCollider server with `s.reboot`
5. Use explicit audio device selection if needed (uncomment and modify the device name in the setup section)

## Instrument Design Principles

Each emotion's instrument has been designed with specific characteristics:

- **Joy**: Bright, major key synth with bouncy rhythm
- **Trust**: Warm pad sounds with stable harmony
- **Fear**: Dissonant, atonal elements with irregular timing
- **Surprise**: Sudden, staccato patterns with unexpected pitch changes
- **Sadness**: Minor key, slow decay sounds with subdued dynamics
- **Disgust**: Distorted, gritty textures with unstable tuning
- **Anger**: Percussive, harsh timbres with driving rhythms
- **Anticipation**: Arpeggiated, building patterns with rising tension 