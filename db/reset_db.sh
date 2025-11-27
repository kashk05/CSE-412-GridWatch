#!/bin/bash
# reset_db.sh - Reset GridWatch database completely

set -e  # Exit on any error

echo "Resetting GridWatch database..."
echo ""

# Set your base path (adjust this to your actual path) 
# Initialize.sql and nyc311_integrate need path updates as well
BASE_PATH="C:\Desktop\Coding Projects\CSE-412-GridWatch"

# Change to the project directory
cd "$BASE_PATH"

# Run Initialize.sql which orchestrates everything
psql -U postgres -f db/Initialize.sql