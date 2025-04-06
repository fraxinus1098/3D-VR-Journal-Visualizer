@echo off
echo ======================================
echo Processing Andy Warhol Journals 1976-1987
echo ======================================

:: Activate virtual environment if it exists
if exist ..\venv\Scripts\activate.bat (
    call ..\venv\Scripts\activate.bat
    echo Virtual environment activated
) else (
    echo Warning: Virtual environment not found, using system Python
)

:: Run the processing script with optimized parameters
python process_all_entries.py --years_range 1976-1987 --batch_size 20 --resume

:: Pause to see any errors before closing
pause 