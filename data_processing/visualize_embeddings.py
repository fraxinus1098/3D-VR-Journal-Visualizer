import json
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import numpy as np
import os

# Set path to the JSON file
json_path = os.path.join('..', 'output', 'warhol_final.json')
print(f"Loading data from {json_path}...")

# Load the JSON data with utf-8 encoding
try:
    with open(json_path, 'r', encoding='utf-8') as file:
        data = json.load(file)
except UnicodeDecodeError:
    # Try with a different encoding if utf-8 fails
    print("UTF-8 encoding failed, trying with utf-8-sig...")
    with open(json_path, 'r', encoding='utf-8-sig') as file:
        data = json.load(file)

# Extract coordinates
print(f"Processing {len(data['entries'])} entries...")
x_coords = []
y_coords = []
z_coords = []
colors = []
alphas = []  # Opacity values
sizes = []   # Point sizes

# Define a color mapping for emotions
emotion_colors = {
    'joy': 'yellow',
    'trust': 'green',
    'fear': 'lightgreen',  # More of a lime green
    'surprise': 'turquoise',  # Blue-green color
    'sadness': 'blue',
    'disgust': 'purple',
    'anger': 'red',
    'anticipation': 'orange'
}

# Function to analyze emotions and return dominant emotion, its value, and clarity
def analyze_emotions(emotions):
    if not emotions or len(emotions) == 0:
        return None, 0, 0
    
    # Sort emotions by value (highest first)
    sorted_emotions = sorted(emotions.items(), key=lambda x: x[1], reverse=True)
    
    # Get the dominant emotion
    dominant_emotion = sorted_emotions[0][0]
    dominant_value = sorted_emotions[0][1]
    
    # Calculate emotional clarity (difference between top and second)
    clarity = 0
    if len(sorted_emotions) > 1:
        clarity = dominant_value - sorted_emotions[1][1]
    else:
        clarity = dominant_value
    
    return dominant_emotion, dominant_value, clarity

# Track statistics
entries_without_emotions = 0
entries_with_emotions = 0

# Extract coordinates and determine colors
for entry in data['entries']:
    if 'coordinates' in entry:
        x_coords.append(entry['coordinates']['x'])
        y_coords.append(entry['coordinates']['y'])
        z_coords.append(entry['coordinates']['z'])
        
        # Analyze emotions
        emotions = entry.get('emotions', {})
        
        if emotions:
            entries_with_emotions += 1
        else:
            entries_without_emotions += 1
        
        dominant_emotion, dominant_value, clarity = analyze_emotions(emotions)
        
        if dominant_emotion and dominant_emotion in emotion_colors:
            colors.append(emotion_colors[dominant_emotion])
            
            # Set opacity based on emotional clarity (how dominant is the top emotion)
            # Scale from 0.3 (very mixed) to 1.0 (very clear)
            alpha = min(0.3 + (clarity * 0.7), 1.0)
            alphas.append(alpha)
            
            # Make stronger emotions slightly larger
            size = 8 + (dominant_value * 5)
            sizes.append(size)
        else:
            colors.append('grey')
            alphas.append(0.3)  # Low opacity for unclear emotions
            sizes.append(6)     # Smaller size for unclear emotions

# Print statistics
print(f"Entries with emotions: {entries_with_emotions}")
print(f"Entries without emotions: {entries_without_emotions}")

# Create the 3D plot
print("Creating 3D visualization...")
fig = plt.figure(figsize=(10, 8))
ax = fig.add_subplot(111, projection='3d')

# Plot the points with individual opacity values
for i in range(len(x_coords)):
    ax.scatter(
        x_coords[i], y_coords[i], z_coords[i], 
        c=[colors[i]], 
        alpha=alphas[i], 
        s=sizes[i]
    )

# Set labels
ax.set_xlabel('X')
ax.set_ylabel('Y')
ax.set_zlabel('Z')
ax.set_title('3D UMAP Visualization of Warhol Journal Entries')

# Add a legend for emotions
from matplotlib.lines import Line2D
legend_elements = [Line2D([0], [0], marker='o', color='w', 
                   label=emotion, markerfacecolor=color, markersize=8)
                   for emotion, color in emotion_colors.items()]
# Add an entry for gray (no clear emotion)
legend_elements.append(Line2D([0], [0], marker='o', color='w', 
                      label='no clear emotion', markerfacecolor='grey', markersize=6))

ax.legend(handles=legend_elements, loc='upper right')

# Add note about opacity
plt.figtext(0.5, 0.01, "Note: Higher opacity indicates stronger emotional clarity", 
           ha='center', fontsize=9)

# Show the plot
plt.tight_layout()
print("Displaying visualization. Close the window to exit.")
plt.show() 