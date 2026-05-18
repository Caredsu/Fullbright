@echo off
REM Build script for Windows

echo Building Teacher Evaluation APK...
echo ====================================

REM Check if Flutter is installed
where flutter >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Flutter SDK not found. Please install Flutter first.
    exit /b 1
)

flutter --version

REM Get dependencies
echo.
echo Getting dependencies...
flutter pub get

REM Build APK
echo.
echo Building APK (Release mode)...
flutter build apk --release

echo.
echo ====================================
echo Build complete!
echo APK location: build\app\outputs\flutter-apk\app-release.apk
echo.
echo To install on device:
echo   flutter install
echo.
pause
