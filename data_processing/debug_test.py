import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

def main():
    print("Debug script started")
    
    # Load env vars
    load_dotenv()
    print(f"Loaded .env file")
    
    # Print env vars
    api_key = os.getenv('OPENAI_API_KEY')
    print(f"OPENAI_API_KEY exists: {bool(api_key)}")
    if api_key:
        print(f"API key first few chars: {api_key[:10]}...")
    
    output_dir = os.getenv('OUTPUT_DIR')
    print(f"OUTPUT_DIR: {output_dir}")
    
    # Check current directory
    print(f"Current directory: {os.getcwd()}")
    
    # Check output directory
    output_dir = os.getenv("OUTPUT_DIR", "../output")
    print(f"Output directory to use: {output_dir}")
    
    # Check if output dir exists
    output_path = Path(output_dir)
    print(f"Output dir absolute path: {output_path.absolute()}")
    print(f"Output dir exists: {output_path.exists()}")
    
    # Check parsed entries file
    entries_file = os.path.join(output_dir, "parsed_entries.json")
    print(f"Entries file path: {entries_file}")
    entries_path = Path(entries_file)
    print(f"Entries file absolute path: {entries_path.absolute()}")
    print(f"Entries file exists: {entries_path.exists()}")
    
    # Try to load entries file
    if entries_path.exists():
        try:
            with open(entries_file, 'r', encoding='utf-8') as ef:
                data = json.load(ef)
                print(f"Successfully loaded entries file")
                print(f"Number of entries: {len(data.get('entries', []))}")
                
                # Check for 1976 entries
                entries_1976 = [e for e in data.get('entries', []) if e.get('date', '').startswith('1976')]
                print(f"Number of 1976 entries: {len(entries_1976)}")
                
                if entries_1976:
                    print(f"Sample entry ID: {entries_1976[0].get('id')}")
                    print(f"Sample entry date: {entries_1976[0].get('date')}")
        except Exception as e:
            print(f"Error loading entries file: {str(e)}")
            import traceback
            traceback.print_exc()
    else:
        print("Entries file does not exist!")
    
    print("Debug script completed")

if __name__ == "__main__":
    main() 