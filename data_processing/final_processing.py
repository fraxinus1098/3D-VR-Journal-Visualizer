import json
import os
import time
import numpy as np
import traceback
import sys
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity
from umap import UMAP
from tqdm import tqdm
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set paths
OUTPUT_DIR = os.getenv("OUTPUT_DIR")
if not OUTPUT_DIR:
    OUTPUT_DIR = "../output"
    print(f"Warning: OUTPUT_DIR not set in environment variables, using default: {OUTPUT_DIR}")

# Create output directory if it doesn't exist
Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

def load_processed_entries():
    """Load the processed entries from the JSON file."""
    processed_file = os.path.join(OUTPUT_DIR, "warhol_all_processed.json")
    try:
        print(f"Loading processed entries from {processed_file}...")
        with open(processed_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"Loaded {len(data['entries'])} processed entries")
            return data["entries"]
    except FileNotFoundError:
        print(f"ERROR: File not found: {processed_file}")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"ERROR: Invalid JSON in file: {processed_file}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Failed to load entries: {e}")
        traceback.print_exc()
        sys.exit(1)

def extract_embeddings(entries):
    """Extract embeddings from entries and create a mapping of indices to entry IDs."""
    print("Extracting embeddings...")
    embeddings = []
    id_to_index = {}
    index_to_id = {}
    
    for i, entry in enumerate(entries):
        if "embedding" in entry:
            embeddings.append(entry["embedding"])
            id_to_index[entry["id"]] = i
            index_to_id[i] = entry["id"]
    
    print(f"Extracted {len(embeddings)} embeddings")
    return np.array(embeddings), id_to_index, index_to_id

def apply_dimensionality_reduction(embeddings):
    """Apply UMAP to reduce dimensionality to 3D."""
    print("Applying UMAP for dimensionality reduction...")
    umap_3d = UMAP(n_components=3, random_state=42, n_neighbors=15, min_dist=0.1)
    coordinates = umap_3d.fit_transform(embeddings)
    
    # Scale coordinates to a reasonable range for Three.js visualization
    scale_factor = 20.0  # Adjust as needed
    coordinates = coordinates * scale_factor
    
    print(f"Generated 3D coordinates for {len(coordinates)} entries")
    return coordinates

def find_related_entries(embeddings, id_to_index, index_to_id, num_related=5):
    """Find related entries based on cosine similarity."""
    print("Computing cosine similarities between entries...")
    # Calculate cosine similarity matrix
    similarity_matrix = cosine_similarity(embeddings)
    
    # Find related entries for each entry
    related_entries = {}
    for i in range(len(embeddings)):
        # Get similarity scores for this entry, sort them, and get indices of top matches
        # Skip the first one (always the entry itself with similarity 1.0)
        sim_scores = similarity_matrix[i]
        top_indices = np.argsort(sim_scores)[::-1][1:num_related+1]
        
        # Map indices back to entry IDs
        entry_id = index_to_id[i]
        related_ids = [index_to_id[idx] for idx in top_indices]
        related_entries[entry_id] = related_ids
    
    print(f"Found {num_related} related entries for {len(related_entries)} entries")
    return related_entries

def update_entries_with_data(entries, coordinates, related_entries, id_to_index):
    """Update entries with 3D coordinates and related entries."""
    print("Updating entries with 3D coordinates and related entries...")
    updated_entries = []
    
    for entry in entries:
        entry_id = entry["id"]
        if entry_id in id_to_index:
            idx = id_to_index[entry_id]
            entry_coords = coordinates[idx]
            
            # Add coordinates
            entry["coordinates"] = {
                "x": float(entry_coords[0]),
                "y": float(entry_coords[1]),
                "z": float(entry_coords[2])
            }
            
            # Add related entries if available
            if entry_id in related_entries:
                entry["relatedEntries"] = related_entries[entry_id]
            else:
                entry["relatedEntries"] = []
            
            updated_entries.append(entry)
    
    print(f"Updated {len(updated_entries)} entries with coordinates and related entries")
    return updated_entries

def main():
    try:
        # 1. Load processed entries
        entries = load_processed_entries()
        
        # 2. Extract embeddings
        embeddings, id_to_index, index_to_id = extract_embeddings(entries)
        
        # 3. Apply dimensionality reduction
        coordinates = apply_dimensionality_reduction(embeddings)
        
        # 4. Find related entries
        related_entries = find_related_entries(embeddings, id_to_index, index_to_id)
        
        # 5. Update entries with coordinates and related entries
        updated_entries = update_entries_with_data(entries, coordinates, related_entries, id_to_index)
        
        # 6. Save the final result
        final_file = os.path.join(OUTPUT_DIR, "warhol_final.json")
        with open(final_file, 'w', encoding='utf-8') as f:
            json.dump({"entries": updated_entries}, f, ensure_ascii=False, indent=2)
        print(f"Final processing complete! Results saved to {final_file}")
        print(f"Processed {len(updated_entries)} entries in total")
        
    except Exception as e:
        print(f"ERROR: {e}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main() 