#!/usr/bin/env bash
# Raspberry Pi 4B+ (2GB RAM) Optimized Start Script for JERP

echo "Starting JERP in high-efficiency standalone mode for Raspberry Pi..."

export NODE_ENV=production
export PORT=3000
export NEXT_TELEMETRY_DISABLED=1

# Use standalone server with V8 max heap cap (1280MB) to prevent OOM
exec node --max-old-space-size=1280 .next/standalone/server.js
