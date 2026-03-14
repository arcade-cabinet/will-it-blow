#!/usr/bin/env bash
# test-e2e.sh — Configurable Maestro E2E test runner
#
# Usage:
#   ./scripts/test-e2e.sh                       # Auto-detect platform + device
#   ./scripts/test-e2e.sh --platform ios         # iOS only
#   ./scripts/test-e2e.sh --platform android     # Android only
#   ./scripts/test-e2e.sh --flow 01-title-screen # Run specific flow
#   ./scripts/test-e2e.sh --screenshots /tmp/ss  # Custom screenshot dir
#
# Environment variables:
#   WIB_PORT           Metro port (default: auto-detect)
#   WIB_IOS_DEVICE     iOS simulator UDID (default: first booted)
#   WIB_ANDROID_ID     Android device ID (default: first attached)
#   WIB_SCREENSHOT_DIR Screenshot output dir (default: .maestro/screenshots)
#   MAESTRO_DRIVER_STARTUP_TIMEOUT  Maestro startup timeout (default: 60000)

set -euo pipefail
cd "$(dirname "$0")/.."

PLATFORM="${WIB_E2E_PLATFORM:-}"
FLOW=""
SCREENSHOT_DIR="${WIB_SCREENSHOT_DIR:-.maestro/screenshots}"
DEBUG_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform) PLATFORM="$2"; shift 2 ;;
    --flow) FLOW="$2"; shift 2 ;;
    --screenshots) SCREENSHOT_DIR="$2"; shift 2 ;;
    --debug) DEBUG_DIR="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

mkdir -p "$SCREENSHOT_DIR"

# ─── Platform auto-detection ──────────────────────────────────────
if [ -z "$PLATFORM" ]; then
  IOS_BOOTED=$(xcrun simctl list devices booted 2>/dev/null | grep -c "Booted" || true)
  ANDROID_ATTACHED=$(adb devices 2>/dev/null | grep -c "device$" || true)

  if [ "$IOS_BOOTED" -gt 0 ] && [ "$ANDROID_ATTACHED" -gt 0 ]; then
    echo "Both iOS and Android detected. Running iOS first, then Android."
    PLATFORM="both"
  elif [ "$IOS_BOOTED" -gt 0 ]; then
    PLATFORM="ios"
  elif [ "$ANDROID_ATTACHED" -gt 0 ]; then
    PLATFORM="android"
  else
    echo "ERROR: No iOS simulator or Android device found"
    exit 1
  fi
fi

# ─── Flow selection ───────────────────────────────────────────────
FLOWS_DIR=".maestro/flows"
if [ -n "$FLOW" ]; then
  FLOW_PATH="$FLOWS_DIR/$FLOW.yaml"
  if [ ! -f "$FLOW_PATH" ]; then
    FLOW_PATH="$FLOWS_DIR/$FLOW"
  fi
  if [ ! -f "$FLOW_PATH" ]; then
    echo "ERROR: Flow not found: $FLOW"
    echo "Available flows:"
    ls "$FLOWS_DIR"/*.yaml 2>/dev/null | xargs -I{} basename {} .yaml
    exit 1
  fi
else
  FLOW_PATH="$FLOWS_DIR/"
fi

# ─── Run tests ────────────────────────────────────────────────────
run_maestro() {
  local plat="$1"
  local debug_args=""

  if [ -n "$DEBUG_DIR" ]; then
    debug_args="--debug-output $DEBUG_DIR/$plat"
    mkdir -p "$DEBUG_DIR/$plat"
  fi

  echo "=== Running E2E on $plat ==="
  # shellcheck disable=SC2086
  maestro test --platform "$plat" $debug_args "$FLOW_PATH" 2>&1
  local exit_code=$?

  echo "=== $plat E2E: $([ $exit_code -eq 0 ] && echo 'PASSED' || echo 'FAILED') ==="
  return $exit_code
}

EXIT_CODE=0

case "$PLATFORM" in
  ios)
    run_maestro ios || EXIT_CODE=$?
    ;;
  android)
    # Ensure adb reverse is set for Metro
    PORT="${WIB_PORT:-8081}"
    DEVICE="${WIB_ANDROID_ID:-$(adb devices | awk 'NR==2 && /device$/{print $1}')}"
    if [ -n "$DEVICE" ]; then
      adb -s "$DEVICE" reverse tcp:"$PORT" tcp:"$PORT" 2>/dev/null || true
    fi
    run_maestro android || EXIT_CODE=$?
    ;;
  both)
    run_maestro ios || EXIT_CODE=$?
    PORT="${WIB_PORT:-8081}"
    DEVICE="${WIB_ANDROID_ID:-$(adb devices | awk 'NR==2 && /device$/{print $1}')}"
    if [ -n "$DEVICE" ]; then
      adb -s "$DEVICE" reverse tcp:"$PORT" tcp:"$PORT" 2>/dev/null || true
    fi
    run_maestro android || EXIT_CODE=$?
    ;;
esac

exit $EXIT_CODE
