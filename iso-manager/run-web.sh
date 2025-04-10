#!/bin/bash

set -e  # Exit on errors

# Check if the web interface directory exists
WEB_DIR="$(dirname "$0")/../iso-manager-web"
if [ ! -d "$WEB_DIR" ]; then
  echo "Error: ISO Manager web interface not found at $WEB_DIR"
  exit 1
fi

# Set the port (default: 5001)
PORT=${1:-5001}

# Use /tmp for logs with a unique directory name based on the application
LOG_DIR="/tmp/anyboot-iso-manager"

# Ensure log directory exists with proper permissions
mkdir -p "$LOG_DIR"
chmod 755 "$LOG_DIR"

# Create a PID file location
PID_FILE="$LOG_DIR/web-server.pid"

# Function to kill any process using our port
kill_port_process() {
  local port=$1
  echo "Checking for processes using port $port..."
  local pid=$(sudo lsof -t -i:$port 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "Found process(es) using port $port: $pid"
    echo "Killing process(es)..."
    sudo kill -9 $pid 2>/dev/null
    echo "Process(es) killed."
    sleep 1
  else
    echo "No processes found using port $port."
  fi
}

# Kill any process using our port before starting
kill_port_process $PORT

# Start the web server with Deno, binding to localhost
echo "Starting ISO Manager web interface on http://localhost:$PORT"

# Change to the web directory
cd "$WEB_DIR"

# Function to check server directories and create them if needed
setup_server() {
  # Check for package.json and install dependencies if needed
  if [ -f "package.json" ] && [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
  fi
}

# Function to start server and save PID
start_server() {
  # Kill any existing server process
  if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
      echo "Stopping existing server process (PID: $OLD_PID)"
      kill "$OLD_PID" 2>/dev/null || kill -9 "$OLD_PID" 2>/dev/null
    else
      echo "No running process found with PID $OLD_PID"
    fi
    rm -f "$PID_FILE"
  fi
  
  # Run setup before starting server
  setup_server
  
  if [ "$1" = "node" ]; then
    # Start Node.js server with nohup to keep it running
    nohup node server.js > "$LOG_DIR/server.log" 2>&1 &
    PID=$!
    echo "$PID" > "$PID_FILE"
    echo "Node.js Express server started in background. Process ID: $PID"
  else
    # Use nohup for Deno server
    nohup deno run --allow-net --allow-read https://deno.land/std/http/file_server.ts --port $PORT --host localhost . > "$LOG_DIR/deno-server.log" 2>&1 &
    PID=$!
    echo "$PID" > "$PID_FILE"
    echo "Deno file server started in background. Process ID: $PID"
  fi
  
  # Check if process is still running after a brief delay
  sleep 3
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "Server is running successfully!"
    echo "To view logs: cat $LOG_DIR/$([ "$1" = "node" ] && echo "server.log" || echo "deno-server.log")"
  else
    echo "Warning: Server process exited immediately. Check logs for errors."
    if [ "$1" = "node" ]; then
      if [ -f "$LOG_DIR/server.log" ]; then
        echo "Recent log entries:"
        tail -n 10 "$LOG_DIR/server.log"
      else
        echo "No log file found at $LOG_DIR/server.log"
      fi
    else
      if [ -f "$LOG_DIR/deno-server.log" ]; then
        echo "Recent log entries:"
        tail -n 10 "$LOG_DIR/deno-server.log"
      else
        echo "No log file found at $LOG_DIR/deno-server.log"
      fi
    fi
  fi
}

# Check if we have server.js and use Node.js if available
if [ -f "server.js" ] && command -v node &> /dev/null; then
  echo "Using Node.js Express server"
  # First, set PORT in the environment
  export PORT=$PORT
  
  # Add the archive endpoint to the Express server
  sed -i '/const express = require("express");/a \
  const IsoManager = require("./IsoManager.js"); \
  app.get("/api/archive", async (req, res) => { \
    try { \
      const isoManager = new IsoManager(); \
      const files = await isoManager.listArchiveFiles(); \
      res.json(files); \
    } catch (err) { \
      res.status(500).json({ error: err.message }); \
    } \
  });' server.js
  
  start_server "node"
else
  # Fall back to Deno file server
  if [ ! -f "server.js" ]; then
    echo "Warning: server.js not found, falling back to Deno file server"
  else
    echo "Node.js not available, falling back to Deno file server"
  fi
  
  if command -v deno &> /dev/null; then
    start_server "deno"
  else
    echo "Error: Neither Node.js nor Deno is available. Cannot start web server."
    exit 1
  fi
fi

echo "Server logs will be saved to $LOG_DIR/server.log or $LOG_DIR/deno-server.log"
echo "To stop the server run: kill $([ -f "$PID_FILE" ] && cat "$PID_FILE" || echo "<no-pid>")"