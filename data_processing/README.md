# Andy Warhol Diaries - Data Processing

This directory contains the data processing scripts for extracting and analyzing Andy Warhol's journal entries from "The Andy Warhol Diaries" PDF.

## Phase 1: Data Processing

### Setup Instructions

#### Direct Installation (Recommended)
1. Make sure Python 3.8+ is installed on your system
2. Run the dependency installer:
   ```
   python install_dependencies.py
   ```
3. This will install all required packages directly in your Python environment

#### Check Dependencies
You can verify that all dependencies are installed correctly by running:
```bash
python test_setup.py
```
This script will check for the required packages and install any missing ones.

### Phase 1.1: PDF Text Extraction

To extract text from the diary PDF:

```bash
python extract_text.py --pdf "/path/to/andy_warhol_diaries.pdf" --output "../output/extracted_text.txt"
```

The script will automatically check for and install any required dependencies.

## Data Processing Pipeline

The full data processing pipeline consists of the following phases:

1. **Phase 1.1**: Extract text from "The Andy Warhol Diaries" PDF
2. **Phase 1.2**: Parse the extracted text into structured entries
3. **Phase 1.3**: Analyze entries with OpenAI APIs for sentiment and embeddings
4. **Phase 1.4**: Generate 3D coordinates and finalize data structure

Each phase will have its own script that processes the output of the previous phase. 