import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

with open('debug_log.txt', 'w') as log_file:
    log_file.write("Debug script started\n")
    
    # Load env vars
    load_dotenv()
    log_file.write("Loaded .env file\n")
    
    # Print env vars
    api_key = os.getenv('OPENAI_API_KEY')
    log_file.write(f"OPENAI_API_KEY exists: {bool(api_key)}\n")
    if api_key:
        log_file.write(f"API key first few chars: {api_key[:10]}...\n")
    
    output_dir = os.getenv('OUTPUT_DIR')
    log_file.write(f"OUTPUT_DIR: {output_dir}\n")
    
    # Check current directory
    log_file.write(f"Current directory: {os.getcwd()}\n")
    
    # Check output directory
    output_dir = os.getenv("OUTPUT_DIR", "../output")
    log_file.write(f"Output directory to use: {output_dir}\n")
    
    # Check if output dir exists
    output_path = Path(output_dir)
    log_file.write(f"Output dir absolute path: {output_path.absolute()}\n")
    log_file.write(f"Output dir exists: {output_path.exists()}\n")
    
    # List directory contents if it exists
    if output_path.exists():
        log_file.write("Output directory contents:\n")
        for item in output_path.iterdir():
            log_file.write(f"  - {item.name}\n")
    
    # Check parsed entries file
    entries_file = os.path.join(output_dir, "parsed_entries.json")
    log_file.write(f"Entries file path: {entries_file}\n")
    entries_path = Path(entries_file)
    log_file.write(f"Entries file absolute path: {entries_path.absolute()}\n")
    log_file.write(f"Entries file exists: {entries_path.exists()}\n")
    
    # Try to load entries file
    if entries_path.exists():
        try:
            with open(entries_file, 'r', encoding='utf-8') as ef:
                data = json.load(ef)
                log_file.write(f"Successfully loaded entries file\n")
                log_file.write(f"Number of entries: {len(data.get('entries', []))}\n")
                
                # Check for 1976 entries
                entries_1976 = [e for e in data.get('entries', []) if e.get('date', '').startswith('1976')]
                log_file.write(f"Number of 1976 entries: {len(entries_1976)}\n")
                
                if entries_1976:
                    log_file.write(f"Sample entry ID: {entries_1976[0].get('id')}\n")
                    log_file.write(f"Sample entry date: {entries_1976[0].get('date')}\n")
        except Exception as e:
            log_file.write(f"Error loading entries file: {str(e)}\n")
            import traceback
            traceback.print_exc(file=log_file)
    else:
        log_file.write("Entries file does not exist!\n")
    
    log_file.write("Debug script completed\n") 