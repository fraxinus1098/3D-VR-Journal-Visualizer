import json
import os
import time
import openai
import traceback
import sys
import argparse
from dotenv import load_dotenv
from tqdm import tqdm
import numpy as np
from pathlib import Path

# Load environment variables
load_dotenv()

# Configure OpenAI API
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    print("ERROR: OPENAI_API_KEY not found in environment variables")
    sys.exit(1)

# Set paths
OUTPUT_DIR = os.getenv("OUTPUT_DIR")
if not OUTPUT_DIR:
    OUTPUT_DIR = "../output"
    print(f"Warning: OUTPUT_DIR not set in environment variables, using default: {OUTPUT_DIR}")

# Create output directory if it doesn't exist
Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

# Load parsed entries
def load_entries():
    entries_file = os.path.join(OUTPUT_DIR, "parsed_entries.json")
    try:
        with open(entries_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data["entries"]
    except FileNotFoundError:
        print(f"ERROR: File not found: {entries_file}")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"ERROR: Invalid JSON in file: {entries_file}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Failed to load entries: {e}")
        traceback.print_exc()
        sys.exit(1)

# Filter entries by year
def filter_entries_by_year(entries, year):
    return [entry for entry in entries if entry["date"].startswith(year)]

# Group entries by year
def group_entries_by_year(entries):
    entries_by_year = {}
    for entry in entries:
        year = entry["date"].split("-")[0]
        if year not in entries_by_year:
            entries_by_year[year] = []
        entries_by_year[year].append(entry)
    return entries_by_year

# Analyze emotions, topics, and entities using GPT-4o mini
def analyze_entries_batch(entries_batch):
    # Prepare batch of entries for analysis
    entries_text = "\n\n".join([f"[{entry['id']}]: {entry['text']}" for entry in entries_batch])
    
    comprehensive_prompt = f"""
    Analyze the following journal entries from Andy Warhol and provide:
    
    1. Emotion rating: Rate the intensity of each emotion on a scale of 0.0 to 1.0:
       - Joy
       - Trust
       - Fear
       - Surprise
       - Sadness
       - Disgust
       - Anger
       - Anticipation
    
    2. Topics: Identify 1-5 main topics discussed in each entry (e.g., art, business, celebrities, etc.)
    
    3. Entities: Extract named entities in these categories:
       - People: Names of individuals mentioned
       - Places: Locations mentioned
    
    Return a JSON array where each object contains:
    - "id" field matching the entry ID
    - "emotions" object with the emotions as keys and intensities as values
    - "topics" array with topic strings
    - "entities" object with "people" and "places" arrays
    
    Entries:
    {entries_text}
    """
    
    try:
        print(f"Sending request to OpenAI API (GPT-4o mini)...")
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You analyze text and return structured JSON."},
                {"role": "user", "content": comprehensive_prompt}
            ],
            response_format={"type": "json_object"}
        )
        print(f"Response received from OpenAI API")
        
        try:
            result = json.loads(response.choices[0].message.content)
            print(f"Successfully parsed response JSON")
            
            # Print the structure for debugging
            print(f"Response structure: {type(result)}")
            if isinstance(result, dict):
                print(f"Keys in response: {list(result.keys())}")
            
            # Ensure result is a list
            if isinstance(result, dict) and "results" in result:
                return result["results"]
            elif isinstance(result, list):
                return result
            elif isinstance(result, dict) and "data" in result:
                return result["data"]
            elif isinstance(result, dict) and "entries" in result:
                return result["entries"]
            else:
                # Try to find any array in the response
                for key, value in result.items():
                    if isinstance(value, list):
                        print(f"Found list under key: {key}")
                        return value
                print(f"Couldn't find a valid results array in response: {result}")
                return []
        except json.JSONDecodeError:
            print(f"Failed to parse JSON from response: {response.choices[0].message.content}")
            return None
    except Exception as e:
        print(f"Error in API call: {e}")
        traceback.print_exc()
        time.sleep(20)  # Simple backoff
        return None

# Generate embeddings using text-embedding-3-large
def get_embeddings_batch(texts):
    try:
        print(f"Sending request to OpenAI API (text-embedding-3-large)...")
        response = openai.embeddings.create(
            model="text-embedding-3-large",
            input=texts,
            dimensions=3072  # Specify full dimensions
        )
        print(f"Response received from OpenAI API")
        return [item.embedding for item in response.data]
    except Exception as e:
        print(f"Error in embeddings API call: {e}")
        traceback.print_exc()
        time.sleep(20)  # Simple backoff
        return None

# Process entries for a specific year
def process_year_entries(year_entries, year, batch_size=10):
    processed_entries = []
    
    print(f"Processing {len(year_entries)} entries in batches of {batch_size}...")
    for i in range(0, len(year_entries), batch_size):
        current_batch = year_entries[i:i+batch_size]
        print(f"\nProcessing batch {i//batch_size + 1}/{(len(year_entries)-1)//batch_size + 1} ({len(current_batch)} entries)")
        
        # Print the first entry in the batch for debugging
        if current_batch:
            print(f"First entry in batch: ID={current_batch[0]['id']}, Date={current_batch[0]['date']}")
            print(f"Text snippet: {current_batch[0]['text'][:100]}...")
        
        # 1. Get comprehensive analysis (emotions, topics, entities)
        print("Analyzing emotions, topics, and entities...")
        analysis_results = analyze_entries_batch(current_batch)
        if not analysis_results:
            print("Analysis failed, skipping batch")
            continue
            
        # Print analysis results for debugging
        print(f"Analysis results: {len(analysis_results)} entries processed")
        
        # 2. Get embeddings
        print("Generating embeddings...")
        embedding_texts = [entry["text"] for entry in current_batch]
        batch_embeddings = get_embeddings_batch(embedding_texts)
        if not batch_embeddings:
            print("Embedding generation failed, skipping batch")
            continue
        
        print(f"Generated {len(batch_embeddings)} embeddings with {len(batch_embeddings[0])} dimensions each")
        
        # 3. Combine results
        print("Combining results...")
        for idx, entry in enumerate(current_batch):
            entry_analysis = next((e for e in analysis_results if str(e["id"]) == str(entry["id"])), None)
            
            if not entry_analysis:
                print(f"Warning: No analysis found for entry {entry['id']}")
                # Try to find by index if ID matching fails
                if idx < len(analysis_results):
                    print(f"Using result at index {idx} as fallback")
                    entry_analysis = analysis_results[idx]
                else:
                    continue
            
            if entry_analysis and idx < len(batch_embeddings):
                processed_entry = entry.copy()
                processed_entry["emotions"] = entry_analysis["emotions"]
                processed_entry["topics"] = entry_analysis["topics"]
                processed_entry["entities"] = entry_analysis["entities"]
                processed_entry["embedding"] = batch_embeddings[idx]
                processed_entries.append(processed_entry)
                print(f"Processed entry {entry['id']} - {entry['date']}")
        
        # Save interim results for this batch
        interim_file = os.path.join(OUTPUT_DIR, f'warhol_{year}_batch_{i//batch_size + 1}.json')
        with open(interim_file, 'w', encoding='utf-8') as f:
            json.dump({"entries": processed_entries}, f, ensure_ascii=False, indent=2)
        print(f"Saved interim results to {interim_file}")
        
        # Add a small delay between batches to avoid rate limits
        time.sleep(2)
    
    # Save all year results
    final_file = os.path.join(OUTPUT_DIR, f'warhol_{year}_processed.json')
    with open(final_file, 'w', encoding='utf-8') as f:
        json.dump({"entries": processed_entries}, f, ensure_ascii=False, indent=2)
    print(f"\nProcessing complete for {year}! Results saved to {final_file}")
    print(f"Processed {len(processed_entries)} entries from {year}")
    
    return processed_entries

# Main processing function
def process_entries(args):
    try:
        print("Loading entries...")
        all_entries = load_entries()
        print(f"Loaded {len(all_entries)} total entries")
        
        # Group entries by year
        print("Grouping entries by year...")
        entries_by_year = group_entries_by_year(all_entries)
        years = sorted(entries_by_year.keys())
        print(f"Found entries for years: {years}")
        
        years_to_process = []
        all_processed_entries = []
        
        # Determine which years to process based on command-line arguments
        if args.all:
            years_to_process = years
            print(f"Processing all years: {', '.join(years_to_process)}")
        elif args.years:
            years_to_process = [year for year in args.years.split(',') if year in years]
            print(f"Processing specific years: {', '.join(years_to_process)}")
        elif args.start_year:
            if args.start_year in years:
                start_idx = years.index(args.start_year)
                years_to_process = years[start_idx:]
                print(f"Processing years starting from {args.start_year}: {', '.join(years_to_process)}")
        else:
            # Default to processing just 1976 if no arguments provided
            default_year = "1976"
            if default_year in years:
                years_to_process = [default_year]
                print(f"No year selection specified, defaulting to year {default_year}")
        
        if not years_to_process:
            print("No valid years selected. Exiting.")
            return
        
        batch_size = args.batch_size
        print(f"Using batch size of {batch_size} entries")
        
        # Process each selected year
        for year in years_to_process:
            print(f"\n{'='*80}")
            print(f"PROCESSING YEAR: {year}")
            print(f"{'='*80}")
            
            year_entries = entries_by_year[year]
            print(f"Found {len(year_entries)} entries for {year}")
            
            processed_year_entries = process_year_entries(year_entries, year, batch_size)
            all_processed_entries.extend(processed_year_entries)
            
            print(f"Completed processing for {year}. Moving to next year...\n")
            
            # Save all entries processed so far
            cumulative_file = os.path.join(OUTPUT_DIR, 'warhol_all_processed.json')
            with open(cumulative_file, 'w', encoding='utf-8') as f:
                json.dump({"entries": all_processed_entries}, f, ensure_ascii=False, indent=2)
            print(f"Updated cumulative results in {cumulative_file}")
            
            # Add a delay between years
            time.sleep(5)
        
        print(f"\n{'='*80}")
        print(f"ALL PROCESSING COMPLETE!")
        print(f"{'='*80}")
        print(f"Processed {len(all_processed_entries)} entries across {len(years_to_process)} years")
        print(f"Final results saved to {os.path.join(OUTPUT_DIR, 'warhol_all_processed.json')}")
    
    except Exception as e:
        print(f"ERROR: An unexpected error occurred: {e}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Process Andy Warhol journal entries with OpenAI APIs')
    
    # Define command-line arguments
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--all', action='store_true', help='Process all available years')
    group.add_argument('--years', type=str, help='Comma-separated list of years to process (e.g., 1976,1977,1978)')
    group.add_argument('--start_year', type=str, help='Process all years starting from this year')
    
    parser.add_argument('--batch_size', type=int, default=10, help='Number of entries to process in each batch (default: 10)')
    
    # Parse arguments
    args = parser.parse_args()
    
    # Run the processing
    process_entries(args) 