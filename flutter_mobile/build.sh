#!/bin/bash

echo "Building Teacher Evaluation APK..."
echo "===================================="

# Get Flutter SDK location
if ! command -v flutter &> /dev/null; then
    echo "Error: Flutter SDK not found. Please install Flutter first."
    exit 1
fi

echo "Flutter SDK found at: $(flutter --version)"

# Get dependencies
echo ""
echo "Getting dependencies..."
flutter pub get

# Build APK
echo ""
echo "Building APK (Release mode)..."
flutter build apk --release

echo ""
echo "===================================="
echo "Build complete!"
echo "APK location: build/app/outputs/flutter-apk/app-release.apk"
echo ""
echo "To install on device:"
echo "  flutter install"
echo ""
