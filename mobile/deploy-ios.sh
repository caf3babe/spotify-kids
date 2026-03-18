#!/usr/bin/env zsh
# deploy-ios.sh — Baut die SpotifyKids App und installiert sie auf einem iPhone (USB oder WiFi).
#
# Voraussetzungen (einmalig installieren):
#   brew install libimobiledevice  # Geräteerkennung ohne Xcode
#   brew install xcbeautify        # optional, schönere xcodebuild-Ausgabe
#   npm install -g ios-deploy      # installiert .app auf iPhone via USB oder WiFi
#
# Einmalig in Xcode öffnen (nur beim allerersten Mal für Code-Signing):
#   open ios/SpotifyKids.xcworkspace
#   → Signing & Capabilities → Team = deine Apple ID → Xcode schließen
#
# Danach nur noch dieses Script ausführen:
#   chmod +x deploy-ios.sh
#   ./deploy-ios.sh

set -e

SCHEME="SpotifyKids"
WORKSPACE="ios/${SCHEME}.xcworkspace"
DERIVED_DATA="build/DerivedData"

# ─── 1. Verbundenes iPhone erkennen ──────────────────────────────────────────
# Verwendet idevice_id (libimobiledevice) – funktioniert ohne Xcode.
# Fallback: ios-deploy --detect

echo "🔍 Suche iPhone via USB..."

UDID=""
DEVICE_NAME="iPhone"

if command -v idevice_id &>/dev/null; then
  UDID=$(idevice_id -l 2>/dev/null | head -1)
  if [[ -n "$UDID" ]] && command -v ideviceinfo &>/dev/null; then
    DEVICE_NAME=$(ideviceinfo -u "$UDID" -k DeviceName 2>/dev/null || echo "iPhone")
  fi
fi

# Fallback auf ios-deploy (ist sowieso Voraussetzung)
if [[ -z "$UDID" ]] && command -v ios-deploy &>/dev/null; then
  echo "   (idevice_id nicht gefunden, versuche ios-deploy...)"
  DETECT=$(ios-deploy --detect --timeout 5 2>&1 || true)
  UDID=$(echo "$DETECT" | grep -oE '[0-9A-Fa-f-]{36,40}' | head -1)
  DEVICE_NAME=$(echo "$DETECT" | grep -oE 'Found [^(]+' | head -1 | sed 's/^Found //')
fi

if [[ -z "$UDID" ]]; then
  echo "❌ Kein iPhone gefunden."
  echo "   → Kabel anschließen, iPhone entsperren, 'Diesem Computer vertrauen' bestätigen."
  echo "   → Falls noch nicht installiert: brew install libimobiledevice"
  exit 1
fi

echo "✅ Gefunden: ${DEVICE_NAME} (${UDID})"

# ─── 2. Dependencies ─────────────────────────────────────────────────────────

echo ""
echo "📦 npm install..."
npm install --silent

echo "🦺 pod install..."
(cd ios && pod install --silent)

# ─── 3. Build ────────────────────────────────────────────────────────────────

echo ""
echo "🔨 Baue für Device ${UDID}..."

BUILD_CMD=(
  xcodebuild
  -workspace "$WORKSPACE"
  -scheme "$SCHEME"
  -destination "id=${UDID}"
  -configuration Debug
  -derivedDataPath "$DERIVED_DATA"
  CODE_SIGN_STYLE=Automatic
  build
)

if command -v xcbeautify &>/dev/null; then
  "${BUILD_CMD[@]}" 2>&1 | xcbeautify
else
  "${BUILD_CMD[@]}"
fi

# ─── 4. App auf iPhone installieren ──────────────────────────────────────────

APP=$(find "$DERIVED_DATA" -name "*.app" \
  -not -path "*/simulator/*" \
  -not -path "*/iphonesimulator/*" \
  | head -1)

if [[ -z "$APP" ]]; then
  echo "❌ Kein Build-Artefakt gefunden. Build fehlgeschlagen?"
  exit 1
fi

echo ""
echo "📲 Installiere auf iPhone..."
ios-deploy --id "$UDID" --bundle "$APP" --justlaunch

echo ""
echo "🎉 Fertig! App wurde auf ${DEVICE_NAME} installiert und gestartet."
echo ""
echo "💡 Metro Bundler starten (falls nicht läuft):"
echo "   cd $(pwd) && npm start"
