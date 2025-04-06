#!/usr/bin/env python3
"""
Dependency installer for Andy Warhol's Diaries data processing
This script replaces the virtual environment setup and installs dependencies directly.
"""

import sys
import subprocess
import platform

def main():
    print("Andy Warhol 3D Journal Visualization - Dependency Installer")
    print("=========================================================")
    print(f"Python version: {platform.python_version()}")
    print(f"Platform: {platform.system()} {platform.release()}")
    print("=========================================================")
    
    print("\nInstalling required dependencies...\n")
    
    # List of required packages (from requirements.txt)
    required_packages = [
        "pdfplumber==0.10.3",
        "openai==1.13.3",
        "numpy==1.26.3",
        "umap-learn==0.5.5",
        "matplotlib==3.8.2",
        "scikit-learn==1.4.0",
        "tqdm==4.66.1",
        "python-dotenv==1.0.1"
    ]
    
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install"] + required_packages)
        print("\nAll dependencies installed successfully!")
        print("\nYou can now run the data processing scripts directly:")
        print("python extract_text.py --pdf \"path/to/diary.pdf\" --output \"../output/extracted_text.txt\"")
    except Exception as e:
        print(f"\nError installing packages: {e}")
        print("\nPlease check your internet connection and pip installation.")
        return False
    
    return True

if __name__ == "__main__":
    main() 