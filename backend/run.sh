#!/bin/bash
# Run the backend server using the project's virtual environment
# Usage: bash run.sh (from the backend directory)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PYTHON="$SCRIPT_DIR/../venv/Scripts/python"

echo "Starting Smart Attendance System backend..."
"$VENV_PYTHON" "$SCRIPT_DIR/main.py"
