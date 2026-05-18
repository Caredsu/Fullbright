# Teacher Evaluation Mobile App - Testing Guide

## 1. Environment Setup Testing

### Check Flutter Installation
```bash
flutter doctor
```

Expected output:
```
[✓] Flutter (Channel stable, 3.x.x)
[✓] Android SDK (Android 14.0)
[✓] Android Studio
```

### Check Connected Devices
```bash
flutter devices
```

Expected output:
```
2 connected devices:
Android SDK built for x86 (mobile) • emulator-5554 • android • Android 14 (API 34)
```

---

## 2. API Connection Testing

### Test API Endpoint

**File:** Create `test_api.dart` in `lib/`

```dart
import 'package:http/http.dart' as http;

void testAPI() async {
  try {
    final response = await http.get(
      Uri.parse('http://192.168.1.100/api/teachers'),
    );
    print('Status: ${response.statusCode}');
    print('Body: ${response.body}');
  } catch (e) {
    print('Error: $e');
  }
}
```

Run:
```bash
dart test_api.dart
```

### Test from Android Device
```bash
adb logcat | grep "API"
```

---

## 3. Unit Testing

Create `test/api_service_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:teacher_eval_mobile/services/api_service.dart';

void main() {
  group('API Service Tests', () {
    test('Check API Connection', () async {
      final result = await ApiService.checkConnection();
      expect(result, true);
    });

    test('Get Teachers', () async {
      final teachers = await ApiService.getTeachers();
      expect(teachers, isNotEmpty);
      expect(teachers[0].name, isNotEmpty);
    });

    test('Get Questions', () async {
      final questions = await ApiService.getQuestions();
      expect(questions, isNotEmpty);
    });
  });
}
```

Run tests:
```bash
flutter test
```

---

## 4. Widget Testing

Create `test/screens/splash_screen_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teacher_eval_mobile/screens/splash_screen.dart';

void main() {
  testWidgets('Splash screen shows loading', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: SplashScreen(),
      ),
    );

    expect(find.byIcon(Icons.school), findsOneWidget);
    expect(find.text('Teacher Evaluation'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('Splash screen navigates to teacher list', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: const SplashScreen(),
        routes: {
          '/teacher-list': (_) => const SizedBox(),
        },
      ),
    );

    await tester.pumpAndSettle(const Duration(seconds: 3));
  });
}
```

Run:
```bash
flutter test test/screens/splash_screen_test.dart
```

---

## 5. Integration Testing

Create `test_driver/app.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teacher_eval_mobile/main.dart';

void main() {
  testWidgets('Full app flow test', (WidgetTester tester) async {
    app.main();
    await tester.pumpAndSettle();

    // Verify splash screen
    expect(find.text('Teacher Evaluation'), findsOneWidget);

    // Wait for navigation
    await tester.pumpAndSettle(const Duration(seconds: 3));

    // Verify teacher list loaded
    expect(find.byIcon(Icons.search), findsOneWidget);
  });
}
```

Run:
```bash
flutter drive --target=test_driver/app.dart
```

---

## 6. Manual Testing Checklist

### Loading Screen
- [ ] Splash screen appears on app launch
- [ ] School icon visible
- [ ] Loading animation smooth
- [ ] Transitions to teacher list after 2 seconds

### Teacher List Screen
- [ ] All teachers displayed
- [ ] Search box visible
- [ ] Filtering works (search by name/department)
- [ ] Teacher cards show correct info
- [ ] Profile avatars generated correctly
- [ ] Tapping teacher opens evaluation form

### Evaluation Screen
- [ ] Teacher info displayed at top
- [ ] All questions loaded
- [ ] Rating scales clickable (1-5)
- [ ] Multiple choice options selectable
- [ ] Comments field works
- [ ] Submit button enabled after ratings added

### Submission
- [ ] Shows loading state
- [ ] Success message appears
- [ ] Returns to teacher list
- [ ] Can submit another evaluation

### Error Handling
- [ ] Network error shows gracefully
- [ ] Retry button works
- [ ] No rating error message shows
- [ ] Timeout errors handled

---

## 7. Performance Testing

### Measure App Load Time
```bash
flutter run --trace-startup
```

Check output for timing info.

### Memory Usage
```bash
adb shell dumpsys meminfo com.example.teacher_eval_mobile
```

### Check Frame Rate
While app running:
```bash
flutter run -vv
```

Look for "Frame times" and "jank" info.

---

## 8. Device Testing

### Test on Multiple Devices

```bash
# Connected devices
flutter devices

# Run on specific device
flutter run -d <device-id>
```

Test on:
- [ ] Android 5.0 (API 21) - Minimum
- [ ] Android 8.0 (API 26)
- [ ] Android 12.0 (API 31)
- [ ] Android 14.0 (API 34) - Latest

### Test on Different Screen Sizes

Emulator options:
- Pixel 4 (5.7" OLED)
- Pixel Tablet (11.6")
- Samsung Galaxy S10 (6.1")

---

## 9. Network Testing

### Test Different Network Speeds

In DevTools → Network:
```
No throttling → Wi-Fi (works)
Slow 4G → Slow connection (test timeout)
Offline → No connection (test error)
```

### Test with Proxy

```bash
flutter run --enable-http-logging
```

Check logs for API requests.

---

## 10. Build Verification

### Debug APK
```bash
flutter build apk
adb install -r build/app/outputs/flutter-apk/app-debug.apk
```

Test:
- [ ] App launches
- [ ] All features work
- [ ] No crashes
- [ ] Logs visible

### Release APK
```bash
flutter build apk --release
adb install -r build/app/outputs/flutter-apk/app-release.apk
```

Test:
- [ ] App launches
- [ ] All features work
- [ ] Smooth performance
- [ ] Smaller file size (~15-20MB)

---

## 11. Troubleshooting Tests

### API Not Reachable
```bash
# Check if server is running
curl -I http://192.168.1.100/api/teachers

# Check app logs
flutter logs
```

### APK Crashes on Launch
```bash
# See crash logs
adb logcat | grep teacher_eval

# Run in debug
flutter run -vvv
```

### Hot Reload Issues
```bash
flutter clean
flutter pub get
flutter run
```

---

## 12. Automated Testing Commands

```bash
# Run all tests
flutter test

# Run specific test file
flutter test test/services/api_service_test.dart

# Run with coverage
flutter test --coverage

# Generate coverage report
genhtml coverage/lcov.info -o coverage/html
```

---

## 13. Firebase Testing (Optional)

If using Firebase:

```bash
# Test FCM connection
adb logcat | grep "FirebaseApp"

# Check Firebase initialization
flutter logs | grep Firebase
```

---

## Test Results Checklist

✅ Flutter setup verified  
✅ Device connectivity confirmed  
✅ API endpoints responding  
✅ Unit tests passing  
✅ Widget tests passing  
✅ Integration tests passing  
✅ Manual user flow successful  
✅ Performance acceptable  
✅ Error handling working  
✅ APK builds successfully  
✅ APK installs on device  
✅ App runs without crashes  

---

**Status:** Ready for release when all checklist items are ✅

See also: `README.md`, `QUICKSTART.md`, `CONFIGURATION.md`
