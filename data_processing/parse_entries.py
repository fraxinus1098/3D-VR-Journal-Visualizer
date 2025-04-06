#!/usr/bin/env python3
"""
Entry Parsing Module for Andy Warhol's Diaries
Phase 1.2: Parse extracted text into structured entries
"""

import os
import sys
import re
import json
import argparse
from pathlib import Path
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)

def check_dependencies():
    """Check and install required dependencies."""
    try:
        import tqdm
    except ImportError:
        print("Installing required packages...")
        try:
            import subprocess
            subprocess.check_call([sys.executable, "-m", "pip", "install", "tqdm"])
            print("Required packages installed successfully.")
        except Exception as e:
            print(f"Error installing packages: {e}")
            print("Please install the required packages manually:")
            print("pip install tqdm")
            sys.exit(1)

# Import dependencies
check_dependencies()
from tqdm import tqdm

def parse_entries(text):
    """
    Parse the extracted text into structured journal entries.
    
    Args:
        text (str): The raw extracted text from the PDF.
        
    Returns:
        list: A list of dictionaries, each representing a journal entry.
    """
    logger.info("Parsing journal entries from extracted text")
    
    # Pattern for entry headers: Day, Month DD, YYYY—Location
    # The locations can be multiple and are separated by em dash (—)
    entry_pattern = r'(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})(?:—(.+?))?(?=\n|$)'
    
    # Find all matches of entry headers
    matches = re.finditer(entry_pattern, text)
    
    entries = []
    prev_end = 0
    entry_count = 0
    
    # Extract entry start positions
    entry_positions = []
    for match in matches:
        entry_positions.append((match.start(), match.group()))
    
    # Process each entry by extracting content between headers
    for i, (start_pos, header) in enumerate(tqdm(entry_positions, desc="Parsing entries")):
        # Skip first match if it's too close to the beginning (likely part of a table of contents)
        if i == 0 and start_pos < 1000:
            prev_end = start_pos + len(header)
            continue
        
        # Extract content from previous entry end to current entry start
        if i > 0:
            content = text[prev_end:start_pos].strip()
            
            # Parse the previous header
            prev_header = entry_positions[i-1][1]
            day, month, day_num, year, locations = re.match(entry_pattern, prev_header).groups()
            
            # Parse locations (if present)
            location_list = []
            if locations:
                location_list = [loc.strip() for loc in locations.split('—') if loc.strip()]
            
            # Create date string in ISO format
            month_num = {
                'January': 1, 'February': 2, 'March': 3, 'April': 4,
                'May': 5, 'June': 6, 'July': 7, 'August': 8,
                'September': 9, 'October': 10, 'November': 11, 'December': 12
            }[month]
            
            date_str = f"{year}-{month_num:02d}-{int(day_num):02d}"
            
            # Create entry dictionary
            entry = {
                "id": str(entry_count),
                "date": date_str,
                "day_of_week": day,
                "locations": location_list,
                "text": content
            }
            
            entries.append(entry)
            entry_count += 1
        
        prev_end = start_pos + len(header)
    
    # Handle the last entry
    if entry_positions:
        last_pos, last_header = entry_positions[-1]
        content = text[last_pos + len(last_header):].strip()
        
        # Parse the last header
        day, month, day_num, year, locations = re.match(entry_pattern, last_header).groups()
        
        # Parse locations (if present)
        location_list = []
        if locations:
            location_list = [loc.strip() for loc in locations.split('—') if loc.strip()]
        
        # Create date string in ISO format
        month_num = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4,
            'May': 5, 'June': 6, 'July': 7, 'August': 8,
            'September': 9, 'October': 10, 'November': 11, 'December': 12
        }[month]
        
        date_str = f"{year}-{month_num:02d}-{int(day_num):02d}"
        
        # Create entry dictionary
        entry = {
            "id": str(entry_count),
            "date": date_str,
            "day_of_week": day,
            "locations": location_list,
            "text": content
        }
        
        entries.append(entry)
    
    logger.info(f"Parsed {len(entries)} journal entries")
    return entries

def save_entries_to_json(entries, output_path):
    """
    Save parsed entries to a JSON file.
    
    Args:
        entries (list): List of entry dictionaries.
        output_path (str): Path where to save the JSON file.
    """
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump({"entries": entries}, f, indent=2, ensure_ascii=False)
        logger.info(f"Entries saved to {output_path}")
    except Exception as e:
        logger.error(f"Error saving entries to file: {e}")
        raise

def main():
    parser = argparse.ArgumentParser(description="Parse journal entries from extracted text")
    parser.add_argument('--input', required=True, help="Path to the extracted text file")
    parser.add_argument('--output', required=True, help="Path to save the parsed entries JSON")
    
    args = parser.parse_args()
    
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(args.output)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
        logger.info(f"Created output directory: {output_dir}")
    
    # Read extracted text
    try:
        with open(args.input, 'r', encoding='utf-8') as f:
            text = f.read()
        logger.info(f"Read {len(text)} characters from {args.input}")
    except Exception as e:
        logger.error(f"Error reading input file: {e}")
        sys.exit(1)
    
    # Parse entries from text
    entries = parse_entries(text)
    
    # Save entries to JSON
    save_entries_to_json(entries, args.output)
    
    logger.info("Entry parsing completed successfully")

if __name__ == "__main__":
    main() 