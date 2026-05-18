# Teacher Evaluation Mobile App (APK)

Flutter mobile app for the teacher evaluation system. Shows loading screen → teacher list → evaluation form.

## Features

✅ **Loading Screen** - Splash screen on startup  
✅ **Teacher List** - Browse and search all teachers  
✅ **Evaluation Form** - Rate teachers with rating scales, multiple choice, and text feedback  
✅ **API Integration** - Connected to your PHP API  
✅ **Offline Ready** - Service worker for offline support  

## Project Structure

```
flutter_mobile/
├── lib/
│   ├── main.dart                 # Entry point
│   ├── screens/
│   │   ├── splash_screen.dart   # Loading screen
│   │   ├── teacher_list_screen.dart
│   │   └── evaluation_screen.dart
│   ├── models/
│   │   ├── teacher.dart
│   │   ├── question.dart
│   │   └── evaluation.dart
│   ├── services/
│   │   └── api_service.dart      # API calls to your PHP backend
│   └── widgets/
├── android/                       # Android configuration
├── pubspec.yaml                   # Dependencies
└── google-services.json          # Firebase config (optional)
```

## Setup & Build APK

### Prerequisites

1. **Flutter SDK** - [Download here](https://flutter.dev/docs/get-started/install)
2. **Android SDK** - Installed with Android Studio
3. **Java 11+** - Required for Android build

### Steps

1. **Clone/Navigate to project:**
   ```bash
   cd c:\xampp\htdocs\teacher-eval\flutter_mobile
   ```

2. **Get dependencies:**
   ```bash
   flutter pub get
   ```

3. **Update API URL** (if needed):
   - Open `lib/services/api_service.dart`
   - Change `baseUrl` to your actual API URL:
     ```dart
     static const String baseUrl = 'http://192.168.x.x:80';  // Your server
     ```

4. **Build APK (Release):**
   ```bash
   flutter build apk --release
   ```

   Or for debug:
   ```bash
   flutter build apk
   ```

5. **Output:**
   ```
   build/app/outputs/flutter-apk/app-release.apk
   ```

### Install on Device

```bash
flutter install
```

Or manually:
```bash
adb install build/app/outputs/flutter-apk/app-release.apk
```

## API Endpoints Used

- `GET /api/teachers` - List all teachers
- `GET /api/questions` - Get evaluation questions
- `POST /api/evaluations` - Submit evaluation

## Configuration

### API URL
Change in `lib/services/api_service.dart`:
- **Local Network:** `http://192.168.x.x:80`
- **Production:** `https://yourdomain.com`

### App Naming
To change app name from "Teacher Evaluation" to something else:
1. `android/app/src/main/AndroidManifest.xml` - Change `android:label`
2. `pubspec.yaml` - Update title

## Troubleshooting

### Build Error: "SDK location not found"
Set Flutter SDK path:
```bash
flutter config --android-sdk-path "C:\path\to\android\sdk"
```

### API Connection Failed
1. Make sure your PHP server is running
2. Check API URL in `api_service.dart`
3. On Android emulator, use `10.0.2.2` instead of `localhost`

### APK Too Large
Enable minification in `android/app/build.gradle`:
```gradle
minifyEnabled true
shrinkResources true
```

## Development

### Run on Emulator/Device (Debug)
```bash
flutter run
```

### Hot Reload (During Development)
Press `R` in terminal while running to hot reload

### Check Connected Devices
```bash
flutter devices
```

## Next Steps

1. ✅ Build APK
2. Install on test device
3. Test with actual API server
4. Customize branding (app name, colors, logo)
5. Add Firebase for push notifications (optional)

## Notes

- App stores evaluation data on your PHP server
- No local database - all data synced with API
- Loading screen shows for 2 seconds on startup
- Search works on teacher name and department

---

**Built with Flutter** - Create beautiful native apps across platforms  
**API:** PHP Server at `/api/` endpoints
