#!/usr/bin/env python3
"""
Utility script to inspect specific entries in the parsed JSON file
"""

import json
import argparse
import sys

def main():
    parser = argparse.ArgumentParser(description="Inspect specific entries in parsed JSON file")
    parser.add_argument('--input', required=True, help="Path to the parsed entries JSON file")
    parser.add_argument('--id', type=int, default=1, help="ID of the entry to inspect")
    
    args = parser.parse_args()
    
    try:
        with open(args.input, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Get the entry with the specified ID
        entry_id = str(args.id)
        entry = next((e for e in data['entries'] if e['id'] == entry_id), None)
        
        if entry:
            print(json.dumps(entry, indent=2, ensure_ascii=False))
        else:
            print(f"No entry found with ID {args.id}")
            
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 