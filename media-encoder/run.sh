#!/bin/sh

# Ensure we're in the proper directory
cd /app/

# Install nodejs dependencies
npm install

# Create tmp directory
mkdir -p tmp

# Run media encoder
node ./media-encoder.js