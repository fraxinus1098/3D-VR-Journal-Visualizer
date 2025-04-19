/*
Warhol Emotions - SuperCollider Implementation
==============================================

This script generates dynamic music based on emotion values from Andy Warhol's journal entries.
Each of the 8 emotions has its own instrument with parameters controlled by intensity values (0-1).

Communication happens via OSC from the web application.
*/

// Server configuration
(
s.options.numBuffers = 1024 * 16;
s.options.memSize = 8192 * 16;
s.options.numOutputBusChannels = 2;
s.options.numInputBusChannels = 2;
)

// Boot the server if not already running
s.waitForBoot({
	"Server booted successfully!".postln;
	
	// Global variables to store emotion values
	~emotions = (
		joy: 0,
		trust: 0,
		fear: 0,
		surprise: 0,
		sadness: 0, 
		disgust: 0,
		anger: 0,
		anticipation: 0
	);
	
	// Master effects
	~masterOut = Bus.audio(s, 2);
	
	// Create SynthDefs for each emotion
	// ================================
	
	// 1. Joy - Bright, major key synth with bouncy rhythm
	SynthDef(\joy, {|amp=0.5, freq=440, intensity=0|
		var sig, env, rate;
		// Map intensity to musical parameters
		rate = intensity.linexp(0, 1, 0.5, 4); // Tempo increases with intensity
		
		// Simple placeholder implementation
		env = EnvGen.kr(Env.perc(0.01, 2), timeScale: 1/rate, doneAction: 2);
		sig = SinOsc.ar(freq) * env * amp * intensity;
		
		Out.ar(~masterOut, sig ! 2);
	}).add;
	
	// 2. Trust - Warm pad sounds with stable harmony
	SynthDef(\trust, {|amp=0.5, freq=220, intensity=0|
		var sig, env;
		
		// Simple placeholder implementation
		env = EnvGen.kr(Env.adsr(1, 0.2, 0.7, 2), timeScale: 4, doneAction: 2);
		sig = LPF.ar(Saw.ar(freq) + Saw.ar(freq * 1.01), intensity.linexp(0, 1, 500, 4000)) * env * amp * intensity;
		
		Out.ar(~masterOut, sig ! 2);
	}).add;
	
	// 3. Fear - Dissonant, atonal elements with irregular timing
	SynthDef(\fear, {|amp=0.5, freq=100, intensity=0|
		var sig, env, mod;
		
		// Simple placeholder implementation
		mod = LFNoise2.kr(8) * intensity * 30;
		env = EnvGen.kr(Env.adsr(0.5, 0.1, 0.4, 1), timeScale: 2, doneAction: 2);
		sig = HPF.ar(WhiteNoise.ar(0.1) + SinOsc.ar(freq + mod), 800) * env * amp * intensity;
		
		Out.ar(~masterOut, sig ! 2);
	}).add;
	
	// 4. Surprise - Sudden, staccato patterns with unexpected pitch changes
	SynthDef(\surprise, {|amp=0.5, freq=300, intensity=0|
		var sig, env, trig;
		
		// Simple placeholder implementation
		trig = Dust.kr(intensity.linexp(0, 1, 0.5, 10));
		env = EnvGen.kr(Env.perc(0.001, 0.3), trig, doneAction: 0);
		sig = SinOsc.ar(freq * LFNoise1.kr(5).range(0.8, 1.2)) * env * amp * intensity;
		
		Out.ar(~masterOut, sig ! 2);
	}).add;
	
	// 5. Sadness - Minor key, slow decay sounds with subdued dynamics
	SynthDef(\sadness, {|amp=0.5, freq=220, intensity=0|
		var sig, env;
		
		// Simple placeholder implementation
		env = EnvGen.kr(Env.adsr(1, 0.2, 0.8, 4), timeScale: 8, doneAction: 2);
		sig = LPF.ar(Pulse.ar(freq, 0.3) * 0.2 + (SinOsc.ar(freq/2) * 0.7), 500) * env * amp * intensity;
		
		Out.ar(~masterOut, sig ! 2);
	}).add;
	
	// 6. Disgust - Distorted, gritty textures with unstable tuning
	SynthDef(\disgust, {|amp=0.5, freq=80, intensity=0|
		var sig, env;
		
		// Simple placeholder implementation
		env = EnvGen.kr(Env.adsr(0.1, 0.2, 0.4, 0.6), timeScale: 2, doneAction: 2);
		sig = HPF.ar(Clip.ar(SinOsc.ar(freq * LFNoise2.kr(2).range(0.9, 1.1)) * 10, -0.7, 0.7), 100) * 0.2 * env * amp * intensity;
		
		Out.ar(~masterOut, sig ! 2);
	}).add;
	
	// 7. Anger - Percussive, harsh timbres with driving rhythms
	SynthDef(\anger, {|amp=0.5, freq=60, intensity=0|
		var sig, env, rate;
		
		// Map intensity to tempo
		rate = intensity.linexp(0, 1, 1, 8);
		
		// Simple placeholder implementation
		env = EnvGen.kr(Env.perc(0.005, 0.3), Impulse.kr(rate), doneAction: 0);
		sig = HPF.ar(WhiteNoise.ar(0.5) + Saw.ar(freq) * 3, 100) * env * amp * intensity;
		
		Out.ar(~masterOut, sig ! 2);
	}).add;
	
	// 8. Anticipation - Arpeggiated, building patterns with rising tension
	SynthDef(\anticipation, {|amp=0.5, freq=220, intensity=0|
		var sig, env, rate, trig;
		
		// Map intensity to pattern speed
		rate = intensity.linexp(0, 1, 1, 16);
		trig = Impulse.kr(rate);
		
		// Simple placeholder implementation
		env = EnvGen.kr(Env.perc(0.01, 0.2), trig, doneAction: 0);
		sig = SinOsc.ar(freq * Select.kr(LFSaw.kr(rate/8).range(0, 7).round, [1, 1.2, 1.5, 2, 2.5, 3, 4, 5])) * env * amp * intensity;
		
		Out.ar(~masterOut, sig ! 2);
	}).add;
	
	// Master effect synth (reverb, compression)
	SynthDef(\master, {|out=0|
		var sig = In.ar(~masterOut, 2);
		
		// Apply effects
		sig = FreeVerb.ar(sig, 0.2, 0.7, 0.3);
		sig = Limiter.ar(sig, 0.8, 0.01);
		
		Out.ar(out, sig);
	}).add;
	
	s.sync; // Wait for all SynthDefs to be added
	
	// Start master effects
	~masterSynth = Synth(\master, [\out, 0]);
	
	// OSC Communication
	// ================
	
	// Set up OSC responder for receiving emotion values
	~emotionResponder = OSCdef(\emotionValues, {|msg, time, addr, recvPort|
		var values = msg[1..];
		
		// Log incoming values
		"Received emotion values:".postln;
		[
			"Joy", "Trust", "Fear", "Surprise", 
			"Sadness", "Disgust", "Anger", "Anticipation"
		].do({|name, i|
			("  " ++ name ++ ": " ++ values[i]).postln;
		});
		
		// Update global emotion values
		~emotions.joy = values[0];
		~emotions.trust = values[1];
		~emotions.fear = values[2];
		~emotions.surprise = values[3];
		~emotions.sadness = values[4];
		~emotions.disgust = values[5];
		~emotions.anger = values[6];
		~emotions.anticipation = values[7];
		
		// Trigger instruments with new values
		Synth(\joy, [\intensity, ~emotions.joy, \freq, 440]);
		Synth(\trust, [\intensity, ~emotions.trust, \freq, 220]);
		Synth(\fear, [\intensity, ~emotions.fear, \freq, 100]);
		Synth(\surprise, [\intensity, ~emotions.surprise, \freq, 300]);
		Synth(\sadness, [\intensity, ~emotions.sadness, \freq, 220]);
		Synth(\disgust, [\intensity, ~emotions.disgust, \freq, 80]);
		Synth(\anger, [\intensity, ~emotions.anger, \freq, 60]);
		Synth(\anticipation, [\intensity, ~emotions.anticipation, \freq, 220]);
		
	}, '/warhol/entry/emotions');
	
	// Status update
	"Warhol Emotions ready! Listening for OSC messages on /warhol/entry/emotions".postln;
	"Example command to test:\n  NetAddr(\"127.0.0.1\", 57121).sendMsg(\"/warhol/entry/emotions\", 0.5, 0.6, 0.2, 0.3, 0.4, 0.3, 0.2, 0.5);".postln;
});

// Function to test with sample values (run this line to test)
~testValues = {|joy=0.5, trust=0.6, fear=0.2, surprise=0.3, sadness=0.4, disgust=0.3, anger=0.2, anticipation=0.5|
	NetAddr("127.0.0.1", 57121).sendMsg("/warhol/entry/emotions", joy, trust, fear, surprise, sadness, disgust, anger, anticipation);
};

// Test values when script is executed
// Uncomment the line below to automatically test when running this file
// ~testValues.value; 