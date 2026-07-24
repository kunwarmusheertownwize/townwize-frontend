#!/usr/bin/env bash
set -e

BRAND=${1:-}
if [ -z "$BRAND" ]; then
  echo "Usage: ./build-apk.sh townwize|wizer"
  exit 1
fi

if [ "$BRAND" = "townwize" ]; then
  APP_ROLE="passenger"
  APP_ID="com.townwize.towner"
  APP_NAME="Townwize"
  GRADLE_TASK="assembleTownwizeDebug"
  OUT_APK="../Townwize-debug.apk"
elif [ "$BRAND" = "wizer" ]; then
  APP_ROLE="driver"
  APP_ID="com.townwize.wizer"
  APP_NAME="Wizer"
  GRADLE_TASK="assembleWizerDebug"
  OUT_APK="../Wizer-debug.apk"
else
  echo "Unknown brand: $BRAND. Use 'townwize' or 'wizer'"
  exit 1
fi

echo "==> Building $APP_NAME APK..."

# Update capacitor.config.json
node -e "
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8'));
cfg.appId = '$APP_ID';
cfg.appName = '$APP_NAME';
fs.writeFileSync('capacitor.config.json', JSON.stringify(cfg, null, 2) + '\n');
console.log('Updated capacitor.config.json: appId=$APP_ID appName=$APP_NAME');
"

# Update VITE_APP_ROLE
sed -i "s/^VITE_APP_ROLE=.*/VITE_APP_ROLE=$APP_ROLE/" .env.production
echo "Set VITE_APP_ROLE=$APP_ROLE"

# Build web assets
echo "==> Building web assets..."
npm run build

# Sync to Android
echo "==> Syncing to Android..."
npx cap sync android

# Build APK for the flavor
echo "==> Running $GRADLE_TASK..."
cd android
./gradlew $GRADLE_TASK
cd ..

# Copy APK to root
cp "android/app/build/outputs/apk/${BRAND}/debug/app-${BRAND}-debug.apk" "$OUT_APK"
echo ""
echo "✅ $APP_NAME APK ready: $OUT_APK"

# Restore Townwize defaults after a Wizer build
if [ "$BRAND" = "wizer" ]; then
  node -e "
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8'));
cfg.appId = 'com.townwize.towner';
cfg.appName = 'Townwize';
fs.writeFileSync('capacitor.config.json', JSON.stringify(cfg, null, 2) + '\n');
"
  sed -i "s/^VITE_APP_ROLE=.*/VITE_APP_ROLE=passenger/" .env.production
  echo "Restored Townwize defaults in capacitor.config.json and .env.production"
fi
