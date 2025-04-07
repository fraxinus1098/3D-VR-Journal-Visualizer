import json
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import numpy as np
import os
import matplotlib.colors as mcolors

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

# Define RGB values for emotions (lowercase keys)
emotion_colors_rgb = {
    'joy': np.array([1.0, 1.0, 0.0]),         # yellow
    'trust': np.array([0.0, 0.8, 0.0]),       # green
    'fear': np.array([0.6, 1.0, 0.6]),        # light green
    'surprise': np.array([0.0, 0.8, 0.8]),    # turquoise
    'sadness': np.array([0.0, 0.0, 1.0]),     # blue
    'disgust': np.array([0.5, 0.0, 0.5]),     # purple
    'anger': np.array([1.0, 0.0, 0.0]),       # red
    'anticipation': np.array([1.0, 0.5, 0.0]) # orange
}

# Gray color for unrecognized emotions
GRAY_COLOR = np.array([0.7, 0.7, 0.7])

# Case-insensitive mapping for emotion names
def normalize_emotion_name(name):
    if not name:
        return None
    # Convert to lowercase for matching
    name_lower = name.lower()
    for emotion in emotion_colors_rgb.keys():
        if emotion in name_lower:
            return emotion
    return name_lower

# Function to blend colors based on emotion weights
def blend_emotion_colors(emotions):
    if not emotions or len(emotions) == 0:
        return GRAY_COLOR  # Default gray for no emotions
    
    # Normalize emotion names to handle case sensitivity
    normalized_emotions = {}
    for emotion, value in emotions.items():
        norm_name = normalize_emotion_name(emotion)
        if norm_name in emotion_colors_rgb:  # Only keep recognized emotions
            normalized_emotions[norm_name] = value
    
    if not normalized_emotions:
        return GRAY_COLOR  # No recognized emotions
    
    # Sort emotions by value (highest first)
    sorted_emotions = sorted(normalized_emotions.items(), key=lambda x: x[1], reverse=True)
    
    # If there's only one emotion or the top one is very dominant
    if len(sorted_emotions) == 1 or sorted_emotions[0][1] > 0.7:
        emotion_name = sorted_emotions[0][0]
        return emotion_colors_rgb[emotion_name]
    
    # Get top two emotions
    top_emotion = sorted_emotions[0][0]
    second_emotion = sorted_emotions[1][0] if len(sorted_emotions) > 1 else top_emotion
    
    # Get weights (normalized to sum to 1.0)
    top_val = sorted_emotions[0][1]
    second_val = sorted_emotions[1][1] if len(sorted_emotions) > 1 else 0
    
    total = top_val + second_val
    if total == 0:
        return GRAY_COLOR
        
    w1 = top_val / total
    w2 = second_val / total
    
    # Blend the colors
    c1 = emotion_colors_rgb[top_emotion]
    c2 = emotion_colors_rgb[second_emotion]
    blended = c1 * w1 + c2 * w2
    return blended

# Calculate emotional intensity
def get_emotion_intensity(emotions):
    if not emotions:
        return 0
    return sum(emotions.values()) / len(emotions)

# Function to check if a color is gray (for statistics)
def is_gray_color(color):
    return np.allclose(color, GRAY_COLOR)

# Track statistics
entries_without_emotions = 0
entries_with_emotions = 0
mixed_emotion_entries = 0
unrecognized_emotions = 0

# Debug: Track first few keys to identify capitalization
if len(data['entries']) > 0 and 'emotions' in data['entries'][0]:
    first_entry_emotions = data['entries'][0]['emotions']
    print(f"First entry emotion keys: {list(first_entry_emotions.keys())}")

# Extract coordinates and determine colors
for entry in data['entries']:
    if 'coordinates' in entry:
        x_coords.append(entry['coordinates']['x'])
        y_coords.append(entry['coordinates']['y'])
        z_coords.append(entry['coordinates']['z'])
        
        # Analyze emotions
        emotions = entry.get('emotions', {})
        
        # Debug random entry emotions
        if 'emotions' in entry and np.random.random() < 0.01:  # Check 1% of entries
            print(f"Sample emotion keys: {list(entry['emotions'].keys())}")
        
        if emotions:
            entries_with_emotions += 1
            
            # Check if it's a mixed emotion entry
            if len(emotions) > 1:
                sorted_vals = sorted(emotions.values(), reverse=True)
                if len(sorted_vals) > 1 and sorted_vals[0] - sorted_vals[1] < 0.3:
                    mixed_emotion_entries += 1
        else:
            entries_without_emotions += 1
        
        # Blend colors based on emotion weights
        blended_color = blend_emotion_colors(emotions)
        
        # Track gray orbs (unrecognized emotions)
        if is_gray_color(blended_color) and emotions:
            unrecognized_emotions += 1
            
        colors.append(blended_color)
        
        # Determine opacity based on overall emotional intensity
        intensity = get_emotion_intensity(emotions)
        alphas.append(0.3 + (intensity * 0.7))
        
        # Size based on total emotional intensity
        sizes.append(6 + (intensity * 7))

# Print statistics
print(f"Entries with emotions: {entries_with_emotions}")
print(f"Entries with mixed emotions: {mixed_emotion_entries}")
print(f"Entries without emotions: {entries_without_emotions}")
print(f"Entries with unrecognized emotions: {unrecognized_emotions}")

# Create the 3D plot
print("Creating 3D visualization...")
fig = plt.figure(figsize=(10, 8))
ax = fig.add_subplot(111, projection='3d')

# Plot the points with blended colors
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

# Add a legend for pure emotion colors
from matplotlib.lines import Line2D
legend_elements = [Line2D([0], [0], marker='o', color='w', 
                   label=emotion.capitalize(), markerfacecolor=tuple(color), markersize=8)
                   for emotion, color in emotion_colors_rgb.items()]
                   
# Add examples of blended emotions
legend_elements.append(Line2D([0], [0], marker='o', color='w', 
                      label='Mixed emotions', markerfacecolor=(0.5, 0.75, 0.5), markersize=8))
legend_elements.append(Line2D([0], [0], marker='o', color='w', 
                      label='No emotions', markerfacecolor=tuple(GRAY_COLOR), markersize=6))

ax.legend(handles=legend_elements, loc='upper right')

# Add note about blending
plt.figtext(0.5, 0.01, "Note: Colors are blended for mixed emotions; opacity shows emotional intensity", 
           ha='center', fontsize=9)

# Show the plot
plt.tight_layout()
print("Displaying visualization. Close the window to exit.")
plt.show() 