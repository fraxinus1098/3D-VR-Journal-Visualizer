#!/bin/bash

echo "======================================"
echo "Processing Andy Warhol Journals 1976-1987"
echo "======================================"

# Activate virtual environment if it exists
if [ -f "../venv/bin/activate" ]; then
    source ../venv/bin/activate
    echo "Virtual environment activated"
else
    echo "Warning: Virtual environment not found, using system Python"
fi

# Run the processing script with optimized parameters
python process_all_entries.py --years_range 1976-1987 --batch_size 20 --resume

echo "Processing complete. Press Enter to exit..."
read 