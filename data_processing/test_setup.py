#!/usr/bin/env python3
"""
Script to verify and install required dependencies
"""

import sys
import subprocess

REQUIRED_PACKAGES = [
    "pdfplumber",
    "openai",
    "numpy",
    "umap-learn",
    "matplotlib",
    "scikit-learn",
    "tqdm",
    "python-dotenv"
]

def check_and_install_dependencies():
    """Check for required packages and install any missing ones."""
    missing_packages = []
    
    for package in REQUIRED_PACKAGES:
        try:
            __import__(package.replace("-", "_"))
            print(f"✓ {package} installed")
        except ImportError:
            missing_packages.append(package)
            print(f"✗ {package} not found")
    
    if missing_packages:
        print(f"\nInstalling {len(missing_packages)} missing dependencies...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing_packages)
            print("\nAll dependencies installed successfully!")
        except Exception as e:
            print(f"\nError installing packages: {e}")
            print("\nPlease install the missing packages manually with:")
            print(f"pip install {' '.join(missing_packages)}")
            return False
    else:
        print("\nAll required dependencies are already installed!")
    
    return True

if __name__ == "__main__":
    print("Checking required dependencies...")
    if check_and_install_dependencies():
        print("\nYour environment is ready! You can now run the data processing scripts.")
    else:
        print("\nEnvironment setup failed. Please install the missing dependencies manually.") 