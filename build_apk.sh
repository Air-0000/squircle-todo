#!/usr/bin/env bash
# ==============================================================================
# build_apk.sh — Standalone One-Click Build Script for Android Squircle To-Do App
#
# Execution Pipeline:
#   1. Export and validate toolchain environment (Java 21, Android SDK 34, Gradle 8.7)
#   2. Install npm dependencies and compile frontend production bundle (Vite)
#   3. Synchronize compiled web bundle (dist/) into Android container assets
#   4. Execute Gradle assembleDebug with pre-warmed dependency cache
#   5. Copy and validate standalone APK deliverables (app-debug.apk and build_output/)
#
# Deliverables:
#   - /home/constant/CodeBuddy/Dev/todolist/app-debug.apk
#   - /home/constant/CodeBuddy/Dev/todolist/build_output/app-debug.apk
#
# Exit Code: 0 on success, non-zero on any failure
# ==============================================================================

set -euo pipefail

# Determine script root directory regardless of invocation working directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
cd "$PROJECT_ROOT"

echo "======================================================================"
echo "🚀 SQUIRCLE TO-DO: Android APK One-Click Build Pipeline"
echo "   Project Root: $PROJECT_ROOT"
echo "   Timestamp:    $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "======================================================================"

# ------------------------------------------------------------------------------
# 1. Export Toolchain Environment Variables
# ------------------------------------------------------------------------------
echo "==> [1/5] Configuring Toolchain Environment..."

export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export ANDROID_HOME="/home/constant/.wmtool/android-sdk"
export ANDROID_SDK_ROOT="/home/constant/.wmtool/android-sdk"
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-/home/constant/.wmtool/gradle-home}"
GRADLE_BIN="/home/constant/.wmtool/gradle-8.7/bin/gradle"

# Prepend Gradle 8.7, Java 21, and Android SDK command line tools to PATH
export PATH="/home/constant/.wmtool/gradle-8.7/bin:$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/build-tools/34.0.0:$PATH"

# Validate Java runtime
if [ ! -x "$JAVA_HOME/bin/java" ]; then
    echo "❌ Error: Java binary not found or not executable at $JAVA_HOME/bin/java" >&2
    exit 1
fi
echo "✓ Java Runtime:"
"$JAVA_HOME/bin/java" -version

# Validate Gradle binary
if [ ! -x "$GRADLE_BIN" ]; then
    echo "❌ Error: Gradle 8.7 binary not found or not executable at $GRADLE_BIN" >&2
    exit 1
fi
echo "✓ Gradle Version:"
"$GRADLE_BIN" -v

# Validate Android SDK
if [ ! -d "$ANDROID_HOME/platforms/android-34" ]; then
    echo "❌ Error: Android SDK Platform 34 not found at $ANDROID_HOME/platforms/android-34" >&2
    exit 1
fi
echo "✓ Android SDK 34 verified at $ANDROID_HOME"

# Ensure android/local.properties is synchronized with ANDROID_HOME
if [ -d "$PROJECT_ROOT/android" ]; then
    echo "sdk.dir=$ANDROID_HOME" > "$PROJECT_ROOT/android/local.properties"
    echo "✓ android/local.properties configured with sdk.dir=$ANDROID_HOME"
fi

# Clean previous build artifacts to ensure strict freshness verification
rm -f "$PROJECT_ROOT/app-debug.apk"
rm -f "$PROJECT_ROOT/build_output/app-debug.apk"
mkdir -p "$PROJECT_ROOT/build_output"

# ------------------------------------------------------------------------------
# 2. Frontend Production Build (npm install & npm run build)
# ------------------------------------------------------------------------------
echo ""
echo "==> [2/5] Installing Frontend Dependencies & Building Vite Bundle..."
cd "$PROJECT_ROOT"

if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json missing in $PROJECT_ROOT" >&2
    exit 1
fi

echo "--> Executing npm install..."
npm install --prefer-offline --no-audit

echo "--> Executing npm run build..."
npm run build

if [ ! -d "$PROJECT_ROOT/dist" ] || [ ! -f "$PROJECT_ROOT/dist/index.html" ]; then
    echo "❌ Error: Frontend build failed. Expected dist/index.html was not generated." >&2
    exit 1
fi
echo "✓ Frontend bundle built successfully: dist/index.html generated."

# ------------------------------------------------------------------------------
# 3. Synchronize Web Dist Assets to Android Native Container
# ------------------------------------------------------------------------------
echo ""
echo "==> [3/5] Synchronizing Web Assets to Android Container..."
ASSETS_DIR="$PROJECT_ROOT/android/app/src/main/assets"
mkdir -p "$ASSETS_DIR"

# Clean existing assets in destination
rm -rf "${ASSETS_DIR:?}"/*

# Copy compiled frontend distribution into Android assets
cp -a "$PROJECT_ROOT/dist/." "$ASSETS_DIR/"

if [ ! -f "$ASSETS_DIR/index.html" ]; then
    echo "❌ Error: Asset synchronization failed. $ASSETS_DIR/index.html not found." >&2
    exit 1
fi
echo "✓ Synchronized $(find "$ASSETS_DIR" -type f | wc -l) asset files to $ASSETS_DIR"

# ------------------------------------------------------------------------------
# 4. Compile Android Debug APK with Gradle 8.7
# ------------------------------------------------------------------------------
echo ""
echo "==> [4/5] Compiling Android APK with Gradle 8.7 (assembleDebug)..."
cd "$PROJECT_ROOT/android"

if [ ! -f "build.gradle" ]; then
    echo "❌ Error: Android root build.gradle missing in $PROJECT_ROOT/android" >&2
    exit 1
fi

# Invoke Gradle with pre-warmed cache and no-daemon flag
"$GRADLE_BIN" assembleDebug --no-daemon --gradle-user-home "$GRADLE_USER_HOME" --stacktrace

# ------------------------------------------------------------------------------
# 5. Output Artifact Placement and Verification
# ------------------------------------------------------------------------------
echo ""
echo "==> [5/5] Validating and Copying APK Deliverables..."

GRADLE_OUTPUT_APK="$PROJECT_ROOT/android/app/build/outputs/apk/debug/app-debug.apk"

if [ ! -f "$GRADLE_OUTPUT_APK" ]; then
    echo "❌ Error: Expected Gradle output APK not found at $GRADLE_OUTPUT_APK" >&2
    exit 1
fi

DEST_ROOT_APK="$PROJECT_ROOT/app-debug.apk"
DEST_OUT_APK="$PROJECT_ROOT/build_output/app-debug.apk"

# Copy output APK to deliverables
cp -f "$GRADLE_OUTPUT_APK" "$DEST_ROOT_APK"
cp -f "$GRADLE_OUTPUT_APK" "$DEST_OUT_APK"

# Validate file existence
if [ ! -f "$DEST_ROOT_APK" ]; then
    echo "❌ Error: Target APK missing at $DEST_ROOT_APK" >&2
    exit 1
fi
if [ ! -f "$DEST_OUT_APK" ]; then
    echo "❌ Error: Target APK missing at $DEST_OUT_APK" >&2
    exit 1
fi

# Validate non-zero size
if [ ! -s "$DEST_ROOT_APK" ]; then
    echo "❌ Error: Output APK at $DEST_ROOT_APK is 0 bytes" >&2
    exit 1
fi
if [ ! -s "$DEST_OUT_APK" ]; then
    echo "❌ Error: Output APK at $DEST_OUT_APK is 0 bytes" >&2
    exit 1
fi

# Size sanity threshold validation (minimum 500KB expected for valid Android APK)
APK_SIZE_BYTES=$(stat -c%s "$DEST_ROOT_APK")
APK_SIZE_HUMAN=$(du -h "$DEST_ROOT_APK" | cut -f1)

if [ "$APK_SIZE_BYTES" -lt 500000 ]; then
    echo "❌ Error: Output APK size ($APK_SIZE_BYTES bytes) is below minimum threshold (500KB)." >&2
    exit 1
fi

# Integrity validation via unzip
if command -v unzip >/dev/null 2>&1; then
    echo "--> Validating APK ZIP structure integrity..."
    unzip -t -q "$DEST_ROOT_APK" || {
        echo "❌ Error: APK archive structure is corrupted or invalid!" >&2
        exit 1
    }
    echo "✓ APK archive integrity verified."
fi

# Digital signature validation via apksigner
if command -v apksigner >/dev/null 2>&1; then
    echo "--> Validating APK digital signature with apksigner..."
    apksigner verify "$DEST_ROOT_APK" || {
        echo "❌ Error: APK signature verification failed!" >&2
        exit 1
    }
    echo "✓ APK digital signature verified successfully."
fi

SHA256_HASH=$(sha256sum "$DEST_ROOT_APK" | awk '{print $1}')

echo ""
echo "======================================================================"
echo "🎉 BUILD SUCCESSFUL! All pipeline checks completed with exit code 0."
echo "======================================================================"
echo "  Deliverable 1: $DEST_ROOT_APK"
echo "  Deliverable 2: $DEST_OUT_APK"
echo "  File Size:     $APK_SIZE_HUMAN ($APK_SIZE_BYTES bytes)"
echo "  SHA256:        $SHA256_HASH"
echo "======================================================================"

exit 0
