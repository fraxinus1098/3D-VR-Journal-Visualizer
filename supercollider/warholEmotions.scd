/*
Warhol Emotions - SuperCollider Implementation
==============================================

This script generates dynamic music based on emotion values from Andy Warhol's journal entries.
Each of the 8 emotions has its own instrument with parameters controlled by intensity values (0-1).

Communication happens via OSC from the web application.
*/

// Server configuration and waitForBoot
(
// Configure server options
s.options.numBuffers = 1024 * 16;
s.options.memSize = 8192 * 16;
s.options.numOutputBusChannels = 2;
s.options.numInputBusChannels = 2;

// Force output to hardware device
// s.options.outDevice = "Speakers / Headphones (Realtek";  // Uncomment and modify this if needed

// Boot the server if not already running
s.waitForBoot({
	"Server booted successfully!".postln;
	
	// Print a list of audio devices to help troubleshoot
	"Available audio devices:".postln;
	ServerOptions.devices.do({ |dev, i|
		("  " ++ i ++ ": " ++ dev).postln;
	});
	
	"Current output device: ".post; s.options.outDevice.postln;
	"Current input device: ".post; s.options.inDevice.postln;
	
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
	
	// Initialize pattern players (will store references to active patterns)
	~patterns = (
		joy: nil,
		trust: nil,
		fear: nil,
		surprise: nil,
		sadness: nil,
		disgust: nil,
		anger: nil,
		anticipation: nil
	);
	
	// Master effects
	~masterOut = Bus.audio(s, 2);
	
	// Create master synth FIRST to ensure proper routing
	~masterSynth = Synth(\master, [\out, 0, \in, ~masterOut], addAction: \addToHead);
	"Master synth created, connected bus to hardware output".postln;
	
	// Test the master bus
	{
		var sig = SinOsc.ar(330) * EnvGen.kr(Env.perc(0.01, 1), doneAction: 2) * 0.5;
		Out.ar(~masterOut, sig ! 2);
	}.play;
	"Test sound sent to master bus".postln;
	
	// Play a direct sound to hardware to confirm audio routing
	{
		var sig = SinOsc.ar(440) * EnvGen.kr(Env.perc(0.01, 0.5), doneAction: 2) * 0.3;
		Out.ar(0, sig ! 2); // Direct to hardware
	}.play;
	"Direct test sound played to hardware output".postln;
	
	// Create scales and chords for patterns
	~scales = (
		major: Scale.major,
		minor: Scale.minor,
		dorian: Scale.dorian,
		phrygian: Scale.phrygian,
		lydian: Scale.lydian,
		mixolydian: Scale.mixolydian,
		aeolian: Scale.aeolian
	);
	
	// Root notes for patterns (can be modulated based on emotions)
	~rootNote = 60; // Middle C
	
	// Create SynthDefs for each emotion
	// ================================
	
	// 1. Joy - Bright, major key synth with bouncy rhythm
	SynthDef(\joy, {|out=0, amp=0.5, freq=440, intensity=0, pan=0, gate=1, atk=0.01, rel=1, dec=0.3, sus=0.7|
		var sig, env, modfreq, detune;
		
		// Map intensity to musical parameters
		detune = intensity.linlin(0, 1, 0.001, 0.02);
		modfreq = intensity.linlin(0, 1, 2, 8);
		
		// More sophisticated implementation
		env = EnvGen.kr(Env.adsr(atk, dec, sus, rel), gate, doneAction: 2);
		
		// Bright FM synthesis with slight chorus effect
		sig = SinOsc.ar(freq * SinOsc.kr(modfreq, 0, intensity * 0.1, 1));
		sig = sig + SinOsc.ar(freq * (1 + detune));
		sig = sig + SinOsc.ar(freq * 1.5, 0, 0.3); // Add a fifth
		
		// Slight chorus effect
		sig = sig + DelayC.ar(sig, 0.03, SinOsc.kr(0.3).range(0.01, 0.02) * intensity);
		
		// Apply envelope and panning
		sig = sig * env * amp * intensity.linlin(0, 1, 0.5, 1.0);
		sig = Pan2.ar(sig, pan);
		
		Out.ar(out, sig);
	}).add;
	
	// 2. Trust - Warm pad sounds with stable harmony
	SynthDef(\trust, {|out=0, amp=0.5, freq=220, intensity=0, pan=0, gate=1, atk=1, rel=2|
		var sig, env, filtfreq, filtres;
		
		// Map intensity to parameters
		filtfreq = intensity.linexp(0, 1, 500, 5000);
		filtres = intensity.linlin(0, 1, 0.2, 0.8);
		
		// Rich pad sound with multiple oscillators
		env = EnvGen.kr(Env.asr(atk, 1, rel), gate, doneAction: 2);
		
		// Layered oscillators for rich chord
		sig = Saw.ar(freq) * 0.3;
		sig = sig + Saw.ar(freq * 0.99) * 0.3; // Slight detune
		sig = sig + Saw.ar(freq * 2.02) * 0.2; // Octave up
		sig = sig + Saw.ar(freq * 1.49) * 0.15; // Perfect fifth
		sig = sig + Saw.ar(freq * 1.26) * 0.1; // Major third
		
		// Mellow filter
		sig = LPF.ar(sig, filtfreq, filtres);
		sig = sig + (HPF.ar(sig, filtfreq * 2) * 0.1 * intensity); // Add some high harmonics based on intensity
		
		// Apply envelope and spatial effects
		sig = sig * env * amp * intensity.linlin(0, 1, 0.2, 1.0);
		sig = Pan2.ar(sig, pan);
		
		Out.ar(out, sig);
	}).add;
	
	// 3. Fear - Dissonant, atonal elements with irregular timing
	SynthDef(\fear, {|out=0, amp=0.5, freq=100, intensity=0, pan=0, gate=1, rel=1|
		var sig, env, mod, noise, lfo;
		
		// Map intensity to parameters
		mod = LFNoise2.kr(intensity.linlin(0, 1, 1, 12)) * intensity * 60;
		lfo = LFNoise1.kr(intensity.linlin(0, 1, 0.2, 4));
		
		// Create unstable, wavering sound
		env = EnvGen.kr(Env.asr(0.5, 1, rel), gate, doneAction: 2);
		
		// Base tone with unstable frequency
		sig = SinOsc.ar(freq + mod) * 0.4;
		
		// Add dissonant upper tones
		sig = sig + SinOsc.ar(freq * 2.02 + (mod * 1.5)) * 0.2;
		sig = sig + SinOsc.ar(freq * 2.41 + (mod * 2)) * 0.15; // Dissonant interval
		
		// Add noise component
		noise = HPF.ar(PinkNoise.ar(0.7 * intensity), 1000) * lfo;
		sig = sig + noise;
		
		// Irregular amplitude modulation
		sig = sig * SinOsc.kr(LFNoise1.kr(2).range(0.2, 12) * intensity).range(0.6, 1);
		
		// Apply envelope and spatial effects
		sig = sig * env * amp * intensity.linlin(0, 1, 0.3, 1.0);
		sig = Pan2.ar(sig, lfo.range(-0.8, 0.8)); // Unstable stereo image
		
		Out.ar(out, sig);
	}).add;
	
	// 4. Surprise - Sudden, staccato patterns with unexpected pitch changes
	SynthDef(\surprise, {|out=0, amp=0.5, freq=300, intensity=0, pan=0, gate=1, rel=0.3|
		var sig, env, trig, pitch;
		
		// Map intensity to parameters
		trig = Dust.kr(intensity.linexp(0, 1, 0.5, 15));
		pitch = Latch.kr(LFNoise0.kr(40), trig);
		
		// Create sudden, unexpected sounds
		env = EnvGen.kr(Env.perc(0.001, rel), trig, doneAction: 0);
		
		// Random pitched FM sound
		sig = SinOsc.ar(freq * pitch.exprange(0.5, 2) * SinOsc.ar(freq * 4, 0, intensity * 5));
		
		// Add click element
		sig = sig + (HPF.ar(Impulse.ar(0.01), 5000) * 0.2);
		
		// Apply envelope and spatial effects
		sig = sig * env * amp * intensity.linlin(0, 1, 0.2, 1.0);
		sig = Pan2.ar(sig, TRand.kr(-0.8, 0.8, trig)); // Random panning
		
		Out.ar(out, sig);
	}).add;
	
	// 5. Sadness - Minor key, slow decay sounds with subdued dynamics
	SynthDef(\sadness, {|out=0, amp=0.5, freq=220, intensity=0, pan=0, gate=1, atk=1, rel=4|
		var sig, env, chorus;
		
		// Create slow-evolving, melancholic sound
		env = EnvGen.kr(Env.asr(atk, 1, rel), gate, doneAction: 2);
		
		// Mellow oscillator blend
		sig = SinOsc.ar(freq) * 0.5;
		sig = sig + (Pulse.ar(freq, 0.3) * 0.15); // Add some harmonic content
		sig = sig + (SinOsc.ar(freq/2) * 0.35); // Add lower octave
		
		// Subtle chorus
		chorus = DelayC.ar(sig, 0.03, SinOsc.kr([0.13, 0.17]).range(0.01, 0.025));
		sig = (sig * 0.7) + (chorus * 0.3 * intensity);
		
		// Low pass filter
		sig = LPF.ar(sig, intensity.linlin(0, 1, 500, 2000));
		
		// Subtle tremolo (increasing with intensity)
		sig = sig * SinOsc.kr(intensity.linlin(0, 1, 2, 5)).range(0.7, 1);
		
		// Apply envelope and spatial effects
		sig = sig * env * amp * intensity.linlin(0, 1, 0.2, 0.7); // Keep maximum volume subdued
		sig = Pan2.ar(sig, pan);
		
		Out.ar(out, sig);
	}).add;
	
	// 6. Disgust - Distorted, gritty textures with unstable tuning
	SynthDef(\disgust, {|out=0, amp=0.5, freq=80, intensity=0, pan=0, gate=1, rel=0.6|
		var sig, env, dist, fold;
		
		// Map intensity to parameters
		fold = intensity.linlin(0, 1, 1, 8); // Distortion amount
		
		// Create harsh, unpleasant texture
		env = EnvGen.kr(Env.asr(0.1, 1, rel), gate, doneAction: 2);
		
		// Start with saw wave with unstable tuning
		sig = Saw.ar(freq * LFNoise2.kr(4).range(0.94, 1.06));
		sig = sig + Saw.ar(freq * 1.03); // Add beating frequency
		
		// Apply distortion techniques
		sig = sig * 4; // Drive signal hot
		sig = Fold.ar(sig, -1 * fold, fold); // Fold distortion
		sig = sig * 0.25; // Bring level back down
		
		// Harsh resonant filter
		sig = BPF.ar(sig, LFNoise1.kr(2).exprange(500, 3000), 0.2, 2);
		
		// Apply envelope and spatial effects
		sig = sig * env * amp * intensity.linlin(0, 1, 0.2, 0.8);
		sig = Pan2.ar(sig, pan);
		
		Out.ar(out, sig);
	}).add;
	
	// 7. Anger - Percussive, harsh timbres with driving rhythms
	SynthDef(\anger, {|out=0, amp=0.5, freq=60, intensity=0, pan=0, gate=1, rel=0.3|
		var sig, env, noise, rate, osc;
		
		// Map intensity to rhythm and distortion
		rate = intensity.linexp(0, 1, 2, 16);
		
		// Create aggressive, percussive sound
		env = EnvGen.kr(Env.perc(0.005, rel), Impulse.kr(rate), doneAction: 0);
		
		// Layered oscillators with noise
		osc = Saw.ar(freq) * 0.4;
		osc = osc + Saw.ar(freq * 1.98) * 0.3; // Almost octave
		
		// Noise component
		noise = HPF.ar(WhiteNoise.ar(0.7), 200);
		sig = osc + (noise * env * 0.3);
		
		// Apply distortion
		sig = sig * 3;
		sig = Clip.ar(sig, -0.9, 0.9) * 0.33;
		
		// Resonant filter sweep
		sig = BPF.ar(sig, EnvGen.kr(Env([3000, 1000], [0.08]), Impulse.kr(rate)), 0.3, 2);
		
		// Apply envelope and spatial effects
		sig = sig * env * amp * intensity.linlin(0, 1, 0.2, 1.0);
		sig = Pan2.ar(sig, pan);
		
		Out.ar(out, sig);
	}).add;
	
	// 8. Anticipation - Arpeggiated, building patterns with rising tension
	SynthDef(\anticipation, {|out=0, amp=0.5, freq=220, intensity=0, pan=0, gate=1, rel=0.3|
		var sig, env, rate, trig, filt;
		
		// Map intensity to pattern speed and filter
		rate = intensity.linexp(0, 1, 2, 24);
		filt = intensity.linlin(0, 1, 500, 4000);
		
		// Create arpeggiated pattern that builds
		trig = Impulse.kr(rate);
		env = EnvGen.kr(Env.perc(0.01, rel), trig, doneAction: 0);
		
		// Main oscillator 
		sig = Saw.ar(freq) * 0.3 + Pulse.ar(freq, 0.3) * 0.2;
		
		// Apply rising filter
		sig = RLPF.ar(sig, Line.kr(filt * 0.5, filt, 30) * LFSaw.kr(rate/16).range(0.7, 1), 0.2);
		
		// Apply envelope and spatial effects
		sig = sig * env * amp * intensity.linlin(0, 1, 0.2, 1.0);
		sig = Pan2.ar(sig, pan * LFNoise1.kr(rate/8).range(-0.5, 0.5)); // Moving pan
		
		Out.ar(out, sig);
	}).add;
	
	// Master effect synth (reverb, compression)
	SynthDef(\master, {|out=0, in=0|
		var sig = In.ar(in, 2);
		
		// Apply effects
		sig = FreeVerb.ar(sig, 0.15, 0.7, 0.3);
		
		// Multi-band compression
		sig = Compander.ar(sig, sig, 0.3, 1, 0.5, 0.01, 0.1);
		
		// Final limiter
		sig = Limiter.ar(sig, 0.9, 0.01);
		
		Out.ar(out, sig);
	}).add;
	
	s.sync; // Wait for all SynthDefs to be added
	
	// Start master effects
	if(~masterSynth.isNil) {
		~masterSynth = Synth(\master, [\out, 0, \in, ~masterOut], addAction: \addToHead);
		"Created master synth at end of initialization".postln;
	};
	
	// Helper function to create emotion patterns
	~createEmotionPattern = {|emotion, intensity|
		var pattern;
		
		// Create patterns based on emotion
		case
		// 1. Joy - Bright, bouncy pattern in major scale
		{emotion == \joy} {
			pattern = Pbind(
				\instrument, \joy,
				\out, ~masterOut,
				\scale, ~scales.major,
				\octave, 5,
				\degree, Pseq([0, 2, 4, 7, 4, 2, 0, 2], inf),
				\dur, Pswitch([
					Pseq([0.25, 0.25, 0.25, 0.25], 1),
					Pseq([0.125, 0.125, 0.25, 0.5], 1)
				], Pfunc{ intensity > 0.5 }),
				\amp, 0.6,  // Increase amplitude
				\atk, 0.01,
				\rel, Pfunc{ 1 / intensity.linlin(0, 1, 1, 4) },
				\pan, Pwhite(-0.5, 0.5, inf),
				\intensity, intensity
			);
		}
		
		// 2. Trust - Warm, stable pattern
		{emotion == \trust} {
			pattern = Pbind(
				\instrument, \trust,
				\out, ~masterOut,
				\scale, ~scales.major,
				\octave, 4,
				\degree, Pseq([
					[0, 2, 4], 
					[0, 2, 4], 
					[-1, 2, 4], 
					[0, 2, 5]
				], inf),
				\dur, 4,
				\amp, 0.5,
				\atk, Pfunc{ intensity.linlin(0, 1, 0.5, 2) },
				\rel, Pfunc{ intensity.linlin(0, 1, 1, 3) },
				\pan, Pseq([-0.3, 0.3], inf),
				\intensity, intensity
			);
		}
		
		// 3. Fear - Dissonant, unstable pattern
		{emotion == \fear} {
			pattern = Pbind(
				\instrument, \fear,
				\out, ~masterOut,
				\scale, ~scales.phrygian,
				\octave, Pswitch([3, 2], Pfunc{ intensity > 0.7 }),
				\degree, Pxrand([0, 1, 3, 6, 10], inf),
				\dur, Pwhite(0.5, 2.5, inf) * Pfunc{ 1 / intensity.linlin(0, 1, 0.5, 1.5) },
				\amp, 0.4,
				\rel, Pwhite(0.5, 3.0, inf),
				\pan, Pwhite(-0.7, 0.7, inf),
				\intensity, intensity
			);
		}
		
		// 4. Surprise - Unexpected, staccato pattern
		{emotion == \surprise} {
			pattern = Pbind(
				\instrument, \surprise,
				\out, ~masterOut,
				\freq, Pwhite(200, 2000, inf),
				\dur, Pfunc{ intensity.linexp(0, 1, 0.3, 0.05) },
				\amp, 0.3,
				\rel, Pwhite(0.05, 0.2, inf),
				\pan, Pwhite(-0.9, 0.9, inf),
				\intensity, intensity
			);
		}
		
		// 5. Sadness - Slow, minor pattern
		{emotion == \sadness} {
			pattern = Pbind(
				\instrument, \sadness,
				\out, ~masterOut,
				\scale, ~scales.minor,
				\octave, 4,
				\degree, Pseq([[0, 3, 7], [0, 3, 5], [-2, 0, 3], [-4, 0, 3]], inf),
				\dur, Pfunc{ intensity.linlin(0, 1, 6, 4) },
				\amp, 0.5,
				\atk, Pfunc{ intensity.linlin(0, 1, 0.5, 1.5) },
				\rel, Pfunc{ intensity.linlin(0, 1, 2, 4) },
				\pan, Pseries(-0.5, 0.1, inf).fold(-0.5, 0.5),
				\intensity, intensity
			);
		}
		
		// 6. Disgust - Gritty, unstable pattern
		{emotion == \disgust} {
			pattern = Pbind(
				\instrument, \disgust,
				\out, ~masterOut,
				\freq, Pwhite(60, 100, inf) * Pfunc{ intensity.linlin(0, 1, 1, 1.2) },
				\dur, Pwhite(0.1, 0.4, inf),
				\amp, 0.4,
				\rel, Pwhite(0.3, 0.8, inf),
				\pan, Pwhite(-0.6, 0.6, inf),
				\intensity, intensity
			);
		}
		
		// 7. Anger - Aggressive, driving pattern
		{emotion == \anger} {
			pattern = Pbind(
				\instrument, \anger,
				\out, ~masterOut,
				\freq, Pseq([60, 60, 65, 55], inf),
				\dur, Pfunc{ intensity.linexp(0, 1, 0.4, 0.1) },
				\amp, 0.4,
				\rel, Pfunc{ intensity.linlin(0, 1, 0.2, 0.4) },
				\pan, Pseq([-0.6, 0.6], inf),
				\intensity, intensity
			);
		}
		
		// 8. Anticipation - Building pattern
		{emotion == \anticipation} {
			pattern = Pbind(
				\instrument, \anticipation,
				\out, ~masterOut,
				\scale, ~scales.lydian,
				\octave, 4,
				\degree, Pseq([0, 1, 2, 3, 4, 5, 6, 7], inf),
				\dur, Pfunc{ intensity.linexp(0, 1, 0.3, 0.1) },
				\amp, 0.4,
				\rel, Pfunc{ intensity.linlin(0, 1, 0.2, 0.4) },
				\pan, Pseries(-0.8, 0.1, 16).fold(-0.8, 0.8),
				\intensity, intensity
			);
		};
		
		// Return the pattern
		pattern;
	};
	
	// OSC Communication
	// ================
	
	// Set up OSC responder for receiving emotion values
	~emotionResponder = OSCdef(\emotionValues, {|msg, time, addr, recvPort|
		var values = msg[1..];
		var emotionNames = [
			"joy", "trust", "fear", "surprise", 
			"sadness", "disgust", "anger", "anticipation"
		];
		var hasNonZeroValue = false;
		
		// Log incoming values with more detail
		"================================================".postln;
		"RECEIVED EMOTION VALUES FROM WEB APPLICATION".postln;
		"================================================".postln;
		
		// Check if any value is non-zero to help debug
		emotionNames.do({|name, i|
			var intensity = values[i];
			var emotionKey = name.asSymbol; // Convert to lowercase symbol
			var nameCapitalized;
			
			// Check for non-zero values
			if(intensity > 0.01) { hasNonZeroValue = true };
			
			// Safe capitalization
			nameCapitalized = name[0].toUpper ++ name[1..];
			
			// Log the emotion and intensity
			("  " ++ nameCapitalized ++ ": " ++ intensity.round(0.01)).postln;
			
			// Update global emotion values
			~emotions.put(emotionKey, intensity);
			
			// Update patterns
			~updateEmotionPattern.value(emotionKey, intensity);
		});
		
		if(hasNonZeroValue) {
			"At least one emotion has non-zero value, sound should play".postln;
		} {
			"All emotion values are zero or near zero, no sound will play".postln;
		};
		"================================================".postln;
		
	}, '/warhol/entry/emotions');
	
	// Function to update patterns based on new emotion values
	~updateEmotionPattern = {|emotion, intensity|
		var pat;
		
		// Stop existing pattern if intensity is very low
		if(intensity < 0.1) {
			if(~patterns[emotion].notNil) {
				~patterns[emotion].stop;
				~patterns[emotion] = nil;
				(emotion.asString + " pattern stopped").postln;
			};
			^this; // Return early
		};
		
		// Create new pattern if we don't have one or intensity changed significantly
		if(~patterns[emotion].isNil) {
			pat = ~createEmotionPattern.value(emotion, intensity);
			if(pat.notNil) {
				~patterns[emotion] = pat.play;
				(emotion.asString + " pattern started with intensity " + intensity).postln;
			} {
				("Error: Could not create pattern for " + emotion).postln;
			};
		} {
			// Update running pattern with new values if needed
			~patterns[emotion].stop;
			pat = ~createEmotionPattern.value(emotion, intensity);
			if(pat.notNil) {
				~patterns[emotion] = pat.play;
				(emotion.asString + " pattern updated with intensity " + intensity).postln;
			} {
				("Error: Could not update pattern for " + emotion).postln;
			};
		};
	};
	
	// Status update
	"Warhol Emotions ready! Listening for OSC messages on /warhol/entry/emotions".postln;
	"Example command to test:\n  NetAddr(\"127.0.0.1\", 57121).sendMsg(\"/warhol/entry/emotions\", 0.5, 0.6, 0.2, 0.3, 0.4, 0.3, 0.2, 0.5);".postln;
	"Master output bus set to: ".post; ~masterOut.postln;
	"Master synth: ".post; ~masterSynth.postln;
	
	// Run test values to verify everything is working
	AppClock.sched(1, {
		"RUNNING AUTOMATIC TEST - YOU SHOULD HEAR SOUND".postln;
		~testValues.value(0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.8);
		nil; // Don't repeat
	});
});
)

// Test functions (these can be evaluated separately after the server is running)
(
// Function to test with sample values
~testValues = {|joy=0.5, trust=0.6, fear=0.2, surprise=0.3, sadness=0.4, disgust=0.3, anger=0.2, anticipation=0.5|
	if(~masterOut.isNil) {
		"Error: Master output bus not initialized. Run the main script first.".postln;
		^this;
	};
	NetAddr("127.0.0.1", 57121).sendMsg("/warhol/entry/emotions", joy, trust, fear, surprise, sadness, disgust, anger, anticipation);
	"Test values sent via OSC - you should hear sounds shortly.".postln;
};

// Function to test individual emotions
~testEmotion = {|emotion, intensity=0.7|
	var values = Array.fill(8, 0.0);
	var emotionMap = (
		joy: 0, 
		trust: 1, 
		fear: 2, 
		surprise: 3, 
		sadness: 4, 
		disgust: 5, 
		anger: 6, 
		anticipation: 7
	);
	var index;
	
	if(~masterOut.isNil) {
		"Error: Master output bus not initialized. Run the main script first.".postln;
		^this;
	};
	
	// Convert emotion to lowercase symbol if it's a string
	if(emotion.isKindOf(String)) {
		emotion = emotion.toLower.asSymbol;
	};
	
	// Get index from the map
	index = emotionMap[emotion];
	
	if(index.notNil) {
		values[index] = intensity;
		NetAddr("127.0.0.1", 57121).sendMsg("/warhol/entry/emotions", *values);
		("Testing " ++ emotion.asString ++ " with intensity " ++ intensity).postln;
		"You should hear sounds shortly.".postln;
	} {
		"Unknown emotion. Use one of: joy, trust, fear, surprise, sadness, disgust, anger, anticipation".postln;
	};
};

// Super direct test that bypasses all OSC and runs the pattern directly
~superDirectTest = {|emotion="joy", intensity=0.7|
	var emotionSymbol, pattern;
	
	// Make sure we have a master bus
	if(~masterOut.isNil) {
		~masterOut = Bus.audio(s, 2);
		"Created new master bus".postln;
	};
	
	// Make sure we have a master synth directly connected to hardware
	if(~masterSynth.isNil || ~masterSynth.isPlaying.not) {
		~masterSynth = Synth(\master, [\out, 0, \in, ~masterOut]);
		"Created new master effect synth".postln;
	};
	
	// Convert emotion to symbol if needed
	emotionSymbol = if(emotion.isKindOf(String)) { emotion.toLower.asSymbol } { emotion };
	
	// Stop any existing patterns for this emotion
	if(~patterns[emotionSymbol].notNil) {
		~patterns[emotionSymbol].stop;
		~patterns[emotionSymbol] = nil;
		(emotionSymbol.asString + " pattern stopped").postln;
	};
	
	// Create pattern directly
	pattern = ~createEmotionPattern.value(emotionSymbol, intensity);
	if(pattern.notNil) {
		// Play the pattern
		~patterns[emotionSymbol] = pattern.play;
		("Super direct test of " ++ emotionSymbol ++ " with intensity " ++ intensity ++ " started").postln;
		"You should hear sounds immediately.".postln;
	} {
		("Error: Could not create pattern for " ++ emotionSymbol).postln;
	};
};

// Function to stop all patterns and audio
~stopAllPatterns = {
	// Stop all active patterns first
	~patterns.do({|pat| 
		if(pat.notNil) { pat.stop };
	});
	~patterns = ~patterns.collect({|pat| nil });
	
	// Send zeroes to all emotions to ensure all synths stop
	NetAddr("127.0.0.1", 57121).sendMsg("/warhol/entry/emotions", 
		0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
	
	// Reset emotion values
	~emotions.keysValuesDo({|k, v| 
		~emotions[k] = 0;
	});
	
	// For more controlled cleanup
	s.makeBundle(nil, {
		// Free any remaining synths
		s.defaultGroup.freeAll;
		
		// Re-create the master synth
		if(~masterOut.notNil) {
			~masterSynth = Synth(\master, [\out, 0]);
		};
	});
	
	"All patterns and synths stopped.".postln;
};

// Simple beep - most basic audio test
~simpleBeep = {
	{
		SinOsc.ar(440, 0, 0.5) * EnvGen.kr(Env.perc(0.01, 0.5), doneAction: 2)
	}.play;
	"Simple beep played".postln;
};

// Direct beep - no SynthDefs, just direct output
~directBeep = {
	{
		var env = EnvGen.kr(Env.perc(0.01, 0.5), doneAction: 2);
		var sig = SinOsc.ar(660) * env * 0.5;
		Out.ar(0, sig ! 2)
	}.play;
	"Direct beep played".postln;
};

// Previously used testAudio - fixed to not use sync
~testAudio = {
	"Playing test tone - this doesn't use s.sync anymore".postln;
	{
		var env = EnvGen.kr(Env.perc(0.01, 1), doneAction: 2);
		var sig = SinOsc.ar(880) * env * 0.5;
		Out.ar(0, sig ! 2)
	}.play;
};

// Loud, direct output test - bypasses any bus routing issues
~veryLoudDirectTest = {
	{
		var env = EnvGen.kr(Env.perc(0.01, 2), doneAction: 2);
		var sig = SinOsc.ar(440) * env * 0.9; // Very loud!
		Out.ar(0, sig ! 2) // Directly to hardware outputs
	}.play;
	"Very loud direct beep played - this bypasses all routing".postln;
};

// Enhanced direct test function for emotions with direct output
~directTestEmotionHardware = {|emotion, intensity=0.7|
	var emotionSymbol, synth;
	
	// Convert emotion to symbol if needed
	emotionSymbol = if(emotion.isKindOf(String)) { emotion.toLower.asSymbol } { emotion };
	
	// Create and play synth directly to hardware
	case
	{emotionSymbol == \joy} {
		synth = {
			var sig, env, modfreq, detune;
			
			// Map intensity to musical parameters
			detune = intensity.linlin(0, 1, 0.001, 0.02);
			modfreq = intensity.linlin(0, 1, 2, 8);
			
			env = EnvGen.kr(Env.adsr(0.01, 0.3, 0.7, 1), 1, doneAction: 2);
			
			// Bright FM synthesis with slight chorus effect
			sig = SinOsc.ar(440 * SinOsc.kr(modfreq, 0, intensity * 0.1, 1));
			sig = sig + SinOsc.ar(440 * (1 + detune));
			sig = sig + SinOsc.ar(440 * 1.5, 0, 0.3); // Add a fifth
			
			sig = sig * env * 0.6 * intensity.linlin(0, 1, 0.5, 1.0);
			
			// Direct output!
			Out.ar(0, sig ! 2);
		}.play;
	}
	{emotionSymbol == \sadness} {
		synth = {
			var sig, env;
			
			// Create slow-evolving, melancholic sound
			env = EnvGen.kr(Env.asr(1, 1, 4), 1, doneAction: 2);
			
			// Mellow oscillator blend
			sig = SinOsc.ar(220) * 0.5;
			sig = sig + (Pulse.ar(220, 0.3) * 0.15); // Add some harmonic content
			sig = sig + (SinOsc.ar(220/2) * 0.35); // Add lower octave
			
			// Low pass filter
			sig = LPF.ar(sig, intensity.linlin(0, 1, 500, 2000));
			
			sig = sig * env * 0.7 * intensity.linlin(0, 1, 0.2, 0.7);
			
			// Direct output!
			Out.ar(0, sig ! 2);
		}.play;
	}
	{true} {
		// Default for any other emotion - simple tone
		synth = {
			var env = EnvGen.kr(Env.perc(0.01, 2), doneAction: 2);
			var sig = SinOsc.ar(550) * env * 0.7;
			Out.ar(0, sig ! 2)
		}.play;
	};
	
	("Direct hardware test of " ++ emotionSymbol ++ " with intensity " ++ intensity).postln;
	"You should definitely hear sound within 2 seconds.".postln;
};
)

// Example test commands (run these one at a time after everything is initialized)
// ~testEmotion.value("joy", 0.8);
// ~testEmotion.value("sadness", 0.7);
// ~testValues.value(0, 0, 0, 0, 0.7, 0, 0, 0); // Test just sadness
// ~superDirectTest.value("joy", 0.8); // Try the super direct test
// ~simpleBeep.value; // Simplest possible audio test
// ~directBeep.value; // Alternative direct beep
// ~testAudio.value; // Previous test function, fixed
// ~stopAllPatterns.value; 