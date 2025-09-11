#!/bin/sh

# Start the backend in the background
node backend/dist/index.js &

# Start the frontend using serve
serve -s frontend/dist -l 3000