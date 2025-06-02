#!/bin/bash

# Step 1: Python 스크립트 실행
echo "Executing Python script to update .env file..."
python3 update_env.py

if [ $? -ne 0 ]; then
  echo "Python script failed. Exiting..."
  exit 1
fi

# Step 2: run_buzzk.js 실행
echo "Executing run_buzzk.js..."
node run_buzzk.js

if [ $? -ne 0 ]; then
  echo "Node.js script failed."
  exit 1
fi

echo "Process completed successfully."

