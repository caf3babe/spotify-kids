#!/usr/bin/env zsh
# deploy-ios.sh — Baut die SpotifyKids App und installiert sie auf einem verbundenen iPhone.
#
# Voraussetzungen (einmalig installieren):
#   brew install xcbeautify       # optional, schönere xcodebuild-Ausgabe
#   npm install -g ios-deploy     # installiert .app auf iPhone via USB
#
# Einmalig in Xcode öffnen (nur beim allerersten Mal):
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

echo "🔍 Suche verbundenes iPhone..."
UDID=$(xcrun xctrace list devices 2>&1 \
  | grep -E "iPhone.+\([0-9A-F-]{36}\)" \
  | grep -v Simulator \
  | head -1 \
  | grep -oE "\([0-9A-F-]{36}\)" \
  | tr -d "()")

if [[ -z "$UDID" ]]; then
  echo "❌ Kein iPhone gefunden."
  echo "   → USB-Kabel prüfen, iPhone entsperren, und 'Diesem Computer vertrauen' bestätigen."
  exit 1
fi

DEVICE_NAME=$(xcrun xctrace list devices 2>&1 \
  | grep "$UDID" \
  | grep -v Simulator \
  | head -1 \
  | sed 's/ ([0-9.]*//' \
  | sed 's/ (.*$//')

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
ios-deploy --id "$UDID" --bundle "$APP" --no-wifi --justlaunch

echo ""
echo "🎉 Fertig! App wurde auf ${DEVICE_NAME} installiert und gestartet."
echo ""
echo "💡 Metro Bundler starten (falls nicht läuft):"
echo "   cd $(pwd) && npm start"
