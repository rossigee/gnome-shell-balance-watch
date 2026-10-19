#!/bin/bash
# Test extension in a nested session
# Usage: ./scripts/test-shell.sh

set -e

EXT_UUID="balance-watch@rossigee.dev"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/$EXT_UUID"

echo "Testing extension: $EXT_UUID"
echo "Extension dir: $EXT_DIR"

# Check if extension is installed
if [ ! -d "$EXT_DIR" ]; then
    echo "Error: Extension not installed. Run 'make install' first."
    exit 1
fi

# Try using weston as a simple wayland compositor
if command -v weston &> /dev/null; then
    echo "Using weston..."
    XDG_RUNTIME_DIR=/tmp/weston-test-$$ wayland &
    sleep 2
    echo "Weston started. Extensions should auto-load."
    echo "Press Ctrl+C to stop."
    wait
else
    echo "Weston not found. Try:"
    echo "  sudo apt install weston"
    echo ""
    echo "Alternative: Log out and log back in to reload GNOME Shell with extension."
fi