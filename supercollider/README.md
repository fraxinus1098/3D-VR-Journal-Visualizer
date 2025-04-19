# SuperCollider Audio Implementation

This directory contains SuperCollider files for generating dynamic, algorithmic music based on journal entry emotion values.

## Overview

The SuperCollider implementation replaces the previous Web Audio API approach with real-time algorithmic composition. Each emotion (joy, trust, fear, surprise, sadness, disgust, anger, anticipation) has its own unique instrument with parameterized tempo and timbre characteristics.

## Files

- `warholEmotions.scd` - Main SuperCollider file containing SynthDefs, patterns, and OSC responders
- `emotion_presets.scd` - Preset configurations for testing different emotion combinations
- `osc_responders.scd` - Separated OSC communication handlers
- `test_values.scd` - Test script for auditioning different emotion values

## Setup

1. Install [SuperCollider](https://supercollider.github.io/) version 3.13.0 or later
2. Open `warholEmotions.scd` in SuperCollider
3. Start the SuperCollider server by pressing Ctrl+B or clicking "Boot Server"
4. Run the script by pressing Ctrl+Enter or selecting all code and clicking "Evaluate Selection"
5. The SuperCollider server will start listening for OSC messages on port 57121

## Communication

The web application communicates with SuperCollider via the Open Sound Control (OSC) protocol:

- Web app sends emotion values (0-1) for each emotion when a journal entry is selected
- SuperCollider receives these values and adjusts instrument parameters accordingly
- All instruments play simultaneously, with their characteristics determined by the emotion values

## Example OSC Message

```
/warhol/entry/emotions
[0.5, 0.6, 0.2, 0.3, 0.4, 0.3, 0.2, 0.5]
```

These values correspond to [joy, trust, fear, surprise, sadness, disgust, anger, anticipation].

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

## Testing

Use `test_values.scd` to audition different emotion combinations without needing to run the web application. 