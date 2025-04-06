#!/usr/bin/env python3
"""
PDF Text Extraction Module for Andy Warhol's Diaries
Phase 1.1: Extract text from "The Andy Warhol Diaries" PDF
"""

import os
import sys
import argparse
from pathlib import Path
import logging

# Check for required packages and install if missing
def check_dependencies():
    try:
        import pdfplumber
        import tqdm
    except ImportError:
        print("Installing required packages...")
        try:
            import subprocess
            subprocess.check_call([sys.executable, "-m", "pip", "install", "pdfplumber", "tqdm"])
            print("Required packages installed successfully.")
        except Exception as e:
            print(f"Error installing packages: {e}")
            print("Please install the required packages manually:")
            print("pip install pdfplumber tqdm")
            sys.exit(1)

# Now import the required packages
check_dependencies()
import pdfplumber
from tqdm import tqdm

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)

def extract_text_from_pdf(pdf_path):
    """
    Extract text from a PDF file.
    
    Args:
        pdf_path (str): Path to the PDF file.
        
    Returns:
        str: Extracted text from the PDF.
    """
    logger.info(f"Extracting text from {pdf_path}")
    text = ""
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            logger.info(f"Found {total_pages} pages")
            
            for i, page in enumerate(tqdm(pdf.pages, desc="Extracting pages")):
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                if (i + 1) % 50 == 0:
                    logger.info(f"Processed {i + 1}/{total_pages} pages")
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        raise
        
    logger.info(f"Extraction complete. Extracted {len(text)} characters.")
    return text

def save_text_to_file(text, output_path):
    """
    Save extracted text to a file.
    
    Args:
        text (str): Text to save.
        output_path (str): Path where to save the text.
    """
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(text)
        logger.info(f"Text saved to {output_path}")
    except Exception as e:
        logger.error(f"Error saving text to file: {e}")
        raise

def main():
    parser = argparse.ArgumentParser(description="Extract text from Andy Warhol's Diaries PDF")
    parser.add_argument('--pdf', required=True, help="Path to the PDF file")
    parser.add_argument('--output', required=True, help="Path to save the extracted text")
    
    args = parser.parse_args()
    
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(args.output)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
        logger.info(f"Created output directory: {output_dir}")
    
    # Extract text from PDF
    text = extract_text_from_pdf(args.pdf)
    
    # Save text to file
    save_text_to_file(text, args.output)
    
    logger.info("Text extraction completed successfully")

if __name__ == "__main__":
    main() 