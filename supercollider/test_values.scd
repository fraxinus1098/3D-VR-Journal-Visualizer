/*
Warhol Emotions - Test Values
=============================

This script provides a simple way to test different emotion combinations
without needing to run the full web application.

Make sure to run warholEmotions.scd first!
*/

// Helper functions to send test values
~testValues = {|joy=0.5, trust=0.6, fear=0.2, surprise=0.3, sadness=0.4, disgust=0.3, anger=0.2, anticipation=0.5|
	NetAddr("127.0.0.1", 57121).sendMsg("/warhol/entry/emotions", joy, trust, fear, surprise, sadness, disgust, anger, anticipation);
};

// Function to play a single emotion for testing
~playOneEmotion = {|emotion, value=0.8|
	var values = Array.fill(8, 0);
	var index;
	
	// Map emotion name to index
	index = [
		\joy, \trust, \fear, \surprise, 
		\sadness, \disgust, \anger, \anticipation
	].indexOf(emotion);
	
	if(index.isNil, {
		"Invalid emotion name. Use: joy, trust, fear, surprise, sadness, disgust, anger, anticipation".postln;
	}, {
		values[index] = value;
		NetAddr("127.0.0.1", 57121).sendMsg("/warhol/entry/emotions", *values);
		("Playing " ++ emotion ++ " with intensity " ++ value).postln;
	});
};

// Test sequences
~testSequences = (
	// Pure emotions - test each one individually
	allJoy: { ~testValues.value(1, 0, 0, 0, 0, 0, 0, 0) },
	allTrust: { ~testValues.value(0, 1, 0, 0, 0, 0, 0, 0) },
	allFear: { ~testValues.value(0, 0, 1, 0, 0, 0, 0, 0) },
	allSurprise: { ~testValues.value(0, 0, 0, 1, 0, 0, 0, 0) },
	allSadness: { ~testValues.value(0, 0, 0, 0, 1, 0, 0, 0) },
	allDisgust: { ~testValues.value(0, 0, 0, 0, 0, 1, 0, 0) },
	allAnger: { ~testValues.value(0, 0, 0, 0, 0, 0, 1, 0) },
	allAnticipation: { ~testValues.value(0, 0, 0, 0, 0, 0, 0, 1) },
	
	// Common combinations
	happy: { ~testValues.value(0.8, 0.6, 0, 0.2, 0, 0, 0, 0.3) },
	sad: { ~testValues.value(0, 0.1, 0.3, 0, 0.9, 0.2, 0, 0) },
	anxious: { ~testValues.value(0, 0, 0.7, 0.3, 0.2, 0, 0, 0.8) },
	angry: { ~testValues.value(0, 0, 0.3, 0, 0.2, 0.6, 0.9, 0.1) },
	balanced: { ~testValues.value(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5) },
	mixed: { ~testValues.value(0.3, 0.7, 0.2, 0.5, 0.8, 0.1, 0.4, 0.6) }
);

// Function to test ramping up an emotion from 0 to 1
~rampEmotion = {|emotion, duration=5|
	var values = Array.fill(8, 0);
	var index, steps=20;
	
	// Map emotion name to index
	index = [
		\joy, \trust, \fear, \surprise, 
		\sadness, \disgust, \anger, \anticipation
	].indexOf(emotion);
	
	if(index.isNil, {
		"Invalid emotion name. Use: joy, trust, fear, surprise, sadness, disgust, anger, anticipation".postln;
	}, {
		("Ramping " ++ emotion ++ " from 0 to 1 over " ++ duration ++ " seconds").postln;
		
		// Create a routine to gradually increase the value
		Routine({
			steps.do({|i|
				var value = i / (steps-1);
				values[index] = value;
				NetAddr("127.0.0.1", 57121).sendMsg("/warhol/entry/emotions", *values);
				(duration/steps).wait;
			});
			
			"Ramp complete.".postln;
		}).play;
	});
};

// UI for testing
(
Window.closeAll;
w = Window("Warhol Emotion Tester", Rect(100, 100, 600, 400)).front;
w.view.layout = VLayout(
	HLayout(
		StaticText().string_("Emotion Tester - Select a preset or adjust individual values"),
		nil
	),
	HLayout(
		// Preset buttons
		VLayout(
			StaticText().string_("Presets:"),
			Button()
				.states_([["All Joy"]])
				.action_({ ~testSequences.allJoy.value }),
			Button()
				.states_([["All Trust"]])
				.action_({ ~testSequences.allTrust.value }),
			Button()
				.states_([["All Fear"]])
				.action_({ ~testSequences.allFear.value }),
			Button()
				.states_([["All Surprise"]])
				.action_({ ~testSequences.allSurprise.value }),
			Button()
				.states_([["All Sadness"]])
				.action_({ ~testSequences.allSadness.value }),
			Button()
				.states_([["All Disgust"]])
				.action_({ ~testSequences.allDisgust.value }),
			Button()
				.states_([["All Anger"]])
				.action_({ ~testSequences.allAnger.value }),
			Button()
				.states_([["All Anticipation"]])
				.action_({ ~testSequences.allAnticipation.value }),
			nil
		),
		VLayout(
			StaticText().string_("Combinations:"),
			Button()
				.states_([["Happy"]])
				.action_({ ~testSequences.happy.value }),
			Button()
				.states_([["Sad"]])
				.action_({ ~testSequences.sad.value }),
			Button()
				.states_([["Anxious"]])
				.action_({ ~testSequences.anxious.value }),
			Button()
				.states_([["Angry"]])
				.action_({ ~testSequences.angry.value }),
			Button()
				.states_([["Balanced"]])
				.action_({ ~testSequences.balanced.value }),
			Button()
				.states_([["Mixed"]])
				.action_({ ~testSequences.mixed.value }),
			Button()
				.states_([["Stop All"]])
				.action_({ ~testValues.value(0, 0, 0, 0, 0, 0, 0, 0) }),
			nil
		),
		// Individual sliders
		VLayout(
			StaticText().string_("Individual Controls:"),
			*[
				[\joy, "Joy"], 
				[\trust, "Trust"], 
				[\fear, "Fear"], 
				[\surprise, "Surprise"],
				[\sadness, "Sadness"], 
				[\disgust, "Disgust"], 
				[\anger, "Anger"], 
				[\anticipation, "Anticipation"]
			].collect({|item|
				var emotion = item[0], name = item[1];
				var slider, label, val=0;
				
				HLayout(
					StaticText().string_(name).minWidth_(80),
					Slider().orientation_(\horizontal)
						.action_({|sl| 
							val = sl.value;
							~playOneEmotion.value(emotion, val);
						}),
					StaticText().string_("0.0").minWidth_(30)
						.align_(\center)
						.background_(Color.black)
						.stringColor_(Color.white)
				);
			})
		)
	)
);
)

// Example usage:
// ~testValues.value(0.8, 0.2, 0.1, 0.5, 0.3, 0.0, 0.0, 0.7);  // Custom values
// ~testSequences.happy.value;  // Play happy preset
// ~rampEmotion.value(\joy, 10);  // Ramp joy from 0 to 1 over 10 seconds
// ~playOneEmotion.value(\sadness, 0.7);  // Play just sadness at 0.7 intensity 