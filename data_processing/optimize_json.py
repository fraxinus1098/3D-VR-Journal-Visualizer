import json
import os

# Define file paths relative to the script location
input_file_path = os.path.join('data_processing', 'output', 'warhol_final.json')
output_file_path = os.path.join('data_processing', 'output', 'warhol_final_optimized.json')

# Ensure the output directory exists
output_dir = os.path.dirname(output_file_path)
os.makedirs(output_dir, exist_ok=True)

try:
    # Read the input JSON file
    print(f"Reading from: {os.path.abspath(input_file_path)}")
    with open(input_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print("Successfully read the input file.")

    # Check if 'entries' key exists and is a list
    if 'entries' in data and isinstance(data['entries'], list):
        entries_processed = 0
        # Iterate through entries and remove the 'embedding' key
        for entry in data['entries']:
            if 'embedding' in entry:
                del entry['embedding']
                entries_processed += 1
        print(f"Processed {entries_processed} entries, removing 'embedding' key.")
    else:
        print(f"Error: 'entries' key not found or not a list in {input_file_path}")
        exit(1) # Exit with an error code

    # Write the modified data to the output JSON file
    print(f"Writing to: {os.path.abspath(output_file_path)}")
    with open(output_file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2) # Use indent=2 for readability

    print(f"Successfully removed embeddings and saved to {output_file_path}")

except FileNotFoundError:
    print(f"Error: Input file not found at {input_file_path}")
    print(f"Absolute path checked: {os.path.abspath(input_file_path)}")
    exit(1)
except json.JSONDecodeError:
    print(f"Error: Could not decode JSON from {input_file_path}")
    exit(1)
except Exception as e:
    print(f"An unexpected error occurred: {e}")
    exit(1) 