/*
Test Values for Warhol Emotions
===============================

This file provides various test functions for auditioning the emotion-based
instruments in the warholEmotions.scd file without needing to run the web application.

Usage:
1. First execute the warholEmotions.scd file to load all SynthDefs and patterns
2. Then execute this entire file to load the test functions
3. Finally, call any of the test functions from the post window

*/

(
// Test a single emotion with specified intensity
~testEmotion = {|emotion, intensity=0.7|
	var values = Array.fill(8, 0.0);
	var emotions = ["joy", "trust", "fear", "surprise", "sadness", "disgust", "anger", "anticipation"];
	var index;
	
	// Handle both symbols and strings
	if(emotion.isKindOf(Symbol)) {
		emotion = emotion.asString;
	};
	
	// Find the index in a case-insensitive way
	index = emotions.detectIndex({|name| 
		name.asString.toLower == emotion.asString.toLower
	});
	
	if(index.notNil) {
		values[index] = intensity;
		NetAddr("127.0.0.1", 57121).sendMsg("/warhol/entry/emotions", *values);
		("Testing " ++ emotion ++ " with intensity " ++ intensity).postln;
	} {
		"Unknown emotion. Use one of: joy, trust, fear, surprise, sadness, disgust, anger, anticipation".postln;
	};
};

// Test a specific emotion in isolation with varying intensities
~emotionIntensitySweep = {|emotion, steps=5, duration=2|
	var values;
	var emotions = ["joy", "trust", "fear", "surprise", "sadness", "disgust", "anger", "anticipation"];
	var index;
	
	// Handle both symbols and strings
	if(emotion.isKindOf(Symbol)) {
		emotion = emotion.asString;
	};
	
	// Find the index in a case-insensitive way
	index = emotions.detectIndex({|name| 
		name.asString.toLower == emotion.asString.toLower
	});
	
	if(index.notNil) {
		("Testing " ++ emotion ++ " with intensity sweep...").postln;
		
		// Loop through intensities from 0.2 to 1.0
		Routine({
			(steps+1).do({|i|
				var intensity = i.linlin(0, steps, 0.2, 1.0);
				values = Array.fill(8, 0.0);
				values[index] = intensity;
				
				NetAddr("127.0.0.1", 57121).sendMsg("/warhol/entry/emotions", *values);
				(emotion ++ " intensity: " ++ intensity.round(0.01)).postln;
				
				duration.wait;
			});
			
			// Reset to zero
			values = Array.fill(8, 0.0);
			NetAddr("127.0.0.1", 57121).sendMsg("/warhol/entry/emotions", *values);
			("Reset " ++ emotion ++ " to zero").postln;
			
		}).play;
	} {
		"Unknown emotion. Use one of: joy, trust, fear, surprise, sadness, disgust, anger, anticipation".postln;
	};
};

// Test all emotions one by one
~testAllEmotions = {|intensity=0.8, duration=5|
	var emotions = ["joy", "trust", "fear", "surprise", "sadness", "disgust", "anger", "anticipation"];
	
	("Testing all emotions one by one at intensity " ++ intensity ++ "...").postln;
	
	Routine({
		emotions.do({|emotion|
			("Now playing: " ++ emotion).postln;
			~testEmotion.value(emotion, intensity);
			duration.wait;
		});
		
		// Reset all to zero
		NetAddr("127.0.0.1", 57121).sendMsg("/warhol/entry/emotions", *Array.fill(8, 0.0));
		"All emotions reset to zero".postln;
	}).play;
};

// Test emotion pairs
~testEmotionPair = {|emotion1, emotion2, intensity1=0.7, intensity2=0.7|
	var values = Array.fill(8, 0.0);
	var emotions = ["joy", "trust", "fear", "surprise", "sadness", "disgust", "anger", "anticipation"];
	var index1, index2;
	
	// Handle both symbols and strings
	if(emotion1.isKindOf(Symbol)) { emotion1 = emotion1.asString; };
	if(emotion2.isKindOf(Symbol)) { emotion2 = emotion2.asString; };
	
	// Find indices in a case-insensitive way
	index1 = emotions.detectIndex({|name| name.asString.toLower == emotion1.asString.toLower });
	index2 = emotions.detectIndex({|name| name.asString.toLower == emotion2.asString.toLower });
	
	if(index1.notNil and: { index2.notNil }) {
		values[index1] = intensity1;
		values[index2] = intensity2;
		
		NetAddr("127.0.0.1", 57121).sendMsg("/warhol/entry/emotions", *values);
		("Testing " ++ emotion1 ++ "(" ++ intensity1 ++ ") + " ++ emotion2 ++ "(" ++ intensity2 ++ ")").postln;
	} {
		"Unknown emotion(s). Use any of: joy, trust, fear, surprise, sadness, disgust, anger, anticipation".postln;
	};
};

// Test common emotional combinations
~testCommonCombinations = {|duration=8|
	var combinations = [
		// Happy combinations
		["joy", "trust", 0.8, 0.6],
		["joy", "anticipation", 0.7, 0.5],
		
		// Anxious combinations
		["fear", "anticipation", 0.6, 0.7],
		["surprise", "fear", 0.5, 0.6],
		
		// Sad combinations
		["sadness", "disgust", 0.7, 0.4],
		["sadness", "fear", 0.8, 0.3],
		
		// Angry combinations
		["anger", "disgust", 0.8, 0.5],
		["anger", "surprise", 0.7, 0.4]
	];
	
	"Testing common emotional combinations...".postln;
	
	Routine({
		combinations.do({|combo|
			("Now playing: " ++ combo[0] ++ " + " ++ combo[1]).postln;
			~testEmotionPair.value(combo[0], combo[1], combo[2], combo[3]);
			duration.wait;
		});
		
		// Reset all to zero
		NetAddr("127.0.0.1", 57121).sendMsg("/warhol/entry/emotions", *Array.fill(8, 0.0));
		"All emotions reset to zero".postln;
	}).play;
};

// Test a journal entry emotion profile
~testEmotionProfile = {|joy=0, trust=0, fear=0, surprise=0, sadness=0, disgust=0, anger=0, anticipation=0|
	NetAddr("127.0.0.1", 57121).sendMsg("/warhol/entry/emotions", 
		joy, trust, fear, surprise, sadness, disgust, anger, anticipation);
		
	"Testing custom emotion profile:".postln;
	"  Joy: %".format(joy).postln;
	"  Trust: %".format(trust).postln;
	"  Fear: %".format(fear).postln;
	"  Surprise: %".format(surprise).postln;
	"  Sadness: %".format(sadness).postln;
	"  Disgust: %".format(disgust).postln;
	"  Anger: %".format(anger).postln;
	"  Anticipation: %".format(anticipation).postln;
};

// Test some sample journal entry profiles
~testSampleEntries = {|duration=15|
	var entries = [
		// A joyful day
		[0.8, 0.7, 0.1, 0.3, 0.1, 0.0, 0.0, 0.5],
		
		// An anxious day
		[0.2, 0.1, 0.7, 0.6, 0.4, 0.3, 0.2, 0.6],
		
		// A sad day
		[0.1, 0.2, 0.3, 0.1, 0.8, 0.4, 0.2, 0.1],
		
		// An angry day
		[0.1, 0.0, 0.4, 0.3, 0.3, 0.6, 0.8, 0.5],
		
		// A mixed/complex day
		[0.4, 0.3, 0.5, 0.6, 0.5, 0.2, 0.4, 0.7]
	];
	
	var descriptions = [
		"A joyful day",
		"An anxious day",
		"A sad day",
		"An angry day",
		"A complex/mixed day"
	];
	
	"Testing sample journal entry profiles...".postln;
	
	Routine({
		entries.do({|entry, i|
			("Now playing: " ++ descriptions[i]).postln;
			NetAddr("127.0.0.1", 57121).sendMsg("/warhol/entry/emotions", *entry);
			duration.wait;
		});
		
		// Reset all to zero
		NetAddr("127.0.0.1", 57121).sendMsg("/warhol/entry/emotions", *Array.fill(8, 0.0));
		"All emotions reset to zero".postln;
	}).play;
};

// Stop all patterns and reset - delegates to warholEmotions.scd
~reset = {
	// Call stopAllPatterns from warholEmotions.scd
	~stopAllPatterns.value;
};
)

// Display available test functions
(
"Warhol Emotions Test Functions:".postln;
"----------------------------".postln;
"~testEmotion.(\"joy\", 0.8)                - Test a single emotion".postln;
"~emotionIntensitySweep.(\"joy\", 5, 2)      - Sweep through intensity levels".postln;
"~testAllEmotions.(0.8, 5)                - Test each emotion one by one".postln;
"~testEmotionPair.(\"joy\", \"trust\", 0.7, 0.6) - Test two emotions together".postln;
"~testCommonCombinations.(8)              - Test common emotional combinations".postln;
"~testEmotionProfile.(0.8, 0.6, 0.1, 0.3, 0.2, 0.1, 0.2, 0.4) - Test a custom emotion profile".postln;
"~testSampleEntries.(15)                  - Test predefined sample entries".postln;
"~reset.()                               - Stop all patterns and reset".postln;
"----------------------------".postln;
"To use: Select any function above and evaluate it (Ctrl+Enter)".postln;
"NOTE: You can use either format: ~testEmotion.(\"joy\", 0.8) or ~testEmotion.value(\"joy\", 0.8)".postln;
)

// Example to try (uncomment and select/execute to test)
// ~testEmotion.("joy", 0.8); 