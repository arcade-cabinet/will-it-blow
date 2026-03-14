#!/usr/bin/env bash
# dev.sh — Configurable dev server for Will It Blow?
#
# Usage:
#   ./scripts/dev.sh              # Auto-detect free port, start Metro
#   ./scripts/dev.sh --port 8085  # Explicit port
#   ./scripts/dev.sh --ios        # Build + run iOS
#   ./scripts/dev.sh --android    # Build + run Android
#   ./scripts/dev.sh --both       # Both platforms
#
# Environment variables:
#   WIB_PORT        Metro port (default: auto-detect 8081-8099)
#   WIB_IOS_DEVICE  iOS simulator UDID (default: first booted)
#   WIB_ANDROID_ID  Android device ID (default: first attached)
#   ANDROID_HOME    Android SDK path (default: ~/Library/Android/sdk)

set -euo pipefail
cd "$(dirname "$0")/.."

# ─── Port selection ───────────────────────────────────────────────
find_free_port() {
  local port="${1:-8081}"
  local max_port="${2:-8099}"
  while [ "$port" -le "$max_port" ]; do
    if ! lsof -i :"$port" -t >/dev/null 2>&1; then
      echo "$port"
      return 0
    fi
    port=$((port + 1))
  done
  echo "ERROR: No free port in range 8081-8099" >&2
  return 1
}

PORT="${WIB_PORT:-}"
RUN_IOS=false
RUN_ANDROID=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --ios) RUN_IOS=true; shift ;;
    --android) RUN_ANDROID=true; shift ;;
    --both) RUN_IOS=true; RUN_ANDROID=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [ -z "$PORT" ]; then
  PORT=$(find_free_port)
  echo "Auto-selected port: $PORT"
fi

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

# ─── Device detection ─────────────────────────────────────────────
detect_ios_device() {
  local device="${WIB_IOS_DEVICE:-}"
  if [ -z "$device" ]; then
    device=$(xcrun simctl list devices booted -j 2>/dev/null \
      | python3 -c "import sys,json; devs=[d for r in json.load(sys.stdin)['devices'].values() for d in r if d['state']=='Booted']; print(devs[0]['udid'] if devs else '')" 2>/dev/null || true)
  fi
  echo "$device"
}

detect_android_device() {
  local device="${WIB_ANDROID_ID:-}"
  if [ -z "$device" ]; then
    device=$(adb devices 2>/dev/null | awk 'NR==2 && /device$/{print $1}' || true)
  fi
  echo "$device"
}

# ─── Main ─────────────────────────────────────────────────────────
echo "=== Will It Blow? Dev Server ==="
echo "Port: $PORT"

if $RUN_IOS; then
  IOS_DEV=$(detect_ios_device)
  if [ -n "$IOS_DEV" ]; then
    echo "iOS device: $IOS_DEV"
  else
    echo "WARNING: No booted iOS simulator found"
  fi
fi

if $RUN_ANDROID; then
  ANDROID_DEV=$(detect_android_device)
  if [ -n "$ANDROID_DEV" ]; then
    echo "Android device: $ANDROID_DEV"
    adb -s "$ANDROID_DEV" reverse tcp:"$PORT" tcp:"$PORT" 2>/dev/null || true
  else
    echo "WARNING: No Android device found"
  fi
fi

if $RUN_IOS; then
  echo "Building iOS..."
  npx expo run:ios --port "$PORT" &
  IOS_PID=$!
fi

if $RUN_ANDROID; then
  echo "Building Android..."
  ANDROID_HOME="$ANDROID_HOME" npx expo run:android --port "$PORT" &
  ANDROID_PID=$!
fi

if ! $RUN_IOS && ! $RUN_ANDROID; then
  echo "Starting Metro on port $PORT..."
  npx expo start --port "$PORT" --clear
fi

wait
