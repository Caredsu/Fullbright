# Deployment & Publishing Guide

## 🎯 Pre-Deployment Checklist

### Code & Testing
- [ ] All features tested
- [ ] No console errors or warnings
- [ ] API endpoints verified
- [ ] Error messages user-friendly
- [ ] Offline handling works
- [ ] App handles network timeouts
- [ ] No hardcoded credentials

### App Configuration
- [ ] Correct API URL set
- [ ] App name finalized
- [ ] Version number updated (pubspec.yaml)
- [ ] App icon added
- [ ] Splash screen customized
- [ ] Colors/branding consistent
- [ ] All text proofread

### Build Quality
- [ ] Release APK builds successfully
- [ ] APK size reasonable (~15-20MB)
- [ ] No console warnings
- [ ] Code minification enabled
- [ ] Tested on minimum SDK (API 21)
- [ ] Tested on latest SDK (API 34)

### Security
- [ ] No plain HTTP endpoints (use HTTPS in production)
- [ ] No debug logs in release
- [ ] No sensitive data in code
- [ ] ProGuard rules configured
- [ ] Permissions minimized

---

## 📱 Internal/Beta Testing

### Test on Real Devices

```bash
# Build APK
flutter build apk --release

# Install on device
adb install -r build/app/outputs/flutter-apk/app-release.apk
```

#### Test Cases
- [ ] First-time app launch
- [ ] Load teacher list
- [ ] Search teachers
- [ ] Open evaluation form
- [ ] Submit evaluation
- [ ] Try again/cancel flow
- [ ] Network error handling
- [ ] Low network speed
- [ ] Offline mode (if supported)

### Beta Distribution

**Option 1: Direct APK Share**
```bash
# Send build/app/outputs/flutter-apk/app-release.apk to testers
# They install: adb install app-release.apk
```

**Option 2: Google Play Internal Testing**
1. Create Google Play Developer account ($25 one-time)
2. Upload APK to "Internal Testing" track
3. Add testers' Google accounts
4. Testers get app from Play Store link
5. Collect feedback

**Option 3: Firebase App Distribution**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Upload APK
firebase appdistribution:distribute build/app/outputs/flutter-apk/app-release.apk \
  --app 1:123456789:android:abcdef1234567890 \
  --testers "tester@example.com"
```

---

## 🔐 Signing for Google Play Store

### 1. Create Keystore

**One-time setup:**

```bash
keytool -genkey -v -keystore teacher_eval_keystore.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias teacher_eval_key
```

Interactive prompts:
```
Enter keystore password: [Create strong password]
Re-enter password: [Repeat]
First and last name: [Your name]
Organizational unit: [Your org]
Organization: [Your org]
City/Locality: [Your city]
State/Province: [Your state]
Country Code: [US/PH/etc]
```

**Store safely:** `teacher_eval_keystore.jks` (backup this!)

### 2. Configure Signing

**File:** `android/key.properties`

```properties
storeFile=../teacher_eval_keystore.jks
storePassword=your_keystore_password_here
keyAlias=teacher_eval_key
keyPassword=your_key_password_here
```

### 3. Build Signed Release APK

```bash
flutter build apk --release
```

✅ APK now signed and ready for Play Store!

---

## 📧 Google Play Store Setup

### Create Developer Account

1. Go to: https://play.google.com/console
2. Click "Create account"
3. Pay $25 registration fee
4. Fill in developer profile
5. Agree to terms

### Create App Entry

1. Click "Create app"
2. Fill basic info:
   - App name: "Teacher Evaluation"
   - Category: "Education"
   - Content rating: "Everyone"
3. Set default language
4. Accept policies

### Add App Details

1. **App Title** (50 chars max)
   - "Teacher Evaluation System"

2. **Short Description** (80 chars max)
   - "Evaluate teachers easily from your phone"

3. **Full Description** (4000 chars max)
   - Features, how to use, requirements
   
4. **Screenshots** (2-8 required)
   - Show teacher list, evaluation form
   - Use Framing tool for beauty

5. **Icon** (512x512, PNG)
   - Must be 512x512 or larger

6. **Feature Graphic** (1024x500, PNG)
   - Banner for Play Store listing

---

## 📤 Upload APK to Play Store

### Internal Testing Track (Free)

1. Go to **Testing** → **Internal testing**
2. Click **Create new release**
3. Click **Upload** → Select `app-release.apk`
4. Fill version details:
   - Name: "1.0.0 - Initial Release"
   - Release notes: "First version, beta testing"
5. Click **Save**
6. Add testers (Google accounts)
7. Share link with testers

### Alpha/Beta Track (Optional)

1. Go to **Testing** → **Closed testing** or **Open testing**
2. Create new release
3. Add APK
4. Set rollout percentage (5% for testing)
5. Add testers or public access
6. Click **Review release**

### Production Release

1. Go to **Release** → **Production**
2. Click **Create new release**
3. Upload APK
4. Review all details
5. Check:
   - [ ] Privacy policy link
   - [ ] Content rating
   - [ ] Target audience
   - [ ] App permissions
6. Click **Review release**
7. Fix any issues
8. Click **Go live**
9. Select rollout: 100% (or staged)

---

## ⚙️ Store Listing Optimization

### App Pricing
- [ ] Free vs Paid decision
- [ ] If paid: Set price in all regions

### Availability
- [ ] Select target countries
- [ ] Set language(s)
- [ ] Specify device compatibility

### Content Rating
1. Go to **Content rating**
2. Answer questionnaire
3. Get rating badge
4. Age requirements set

### Permissions Review
1. Google checks permission usage
2. Must be justified by features
3. Examples:
   - INTERNET → API calls ✓
   - CAMERA → Future profile upload ✓

---

## 📊 Post-Release Monitoring

### Track Performance

**Google Play Console:**
- Views, installs, uninstalls
- Ratings & reviews
- Crashes (via Firebase)
- ANR (app not responding) rates
- Performance metrics

### Monitor Crashes

```bash
# Enable Firebase Crashlytics (optional)
# Automatic crash reporting if configured
```

View crashes in Play Console → **Quality** → **Crashes**

### Reviews & Ratings

1. Go to **Reviews** section
2. Read user feedback
3. Respond to reviews
4. Address issues in next update

---

## 🔄 Update & Versioning

### Version Numbering

**pubspec.yaml:**
```yaml
version: 1.0.0+1
```
- `1.0.0` = Display version
- `+1` = Build number (must increase)

### For Each Update

1. Update version in `pubspec.yaml`
   ```yaml
   version: 1.1.0+2
   ```

2. Update `CHANGELOG.md`:
   ```
   ## 1.1.0
   - Fixed teacher search
   - Improved performance
   - Better error messages
   ```

3. Build new APK
   ```bash
   flutter build apk --release
   ```

4. Upload to Play Store
   - Create new release
   - Add release notes
   - Test in internal track first

5. Staged rollout
   - Start with 5-10%
   - Monitor crashes
   - Increase to 100%

---

## 🆘 Troubleshooting Deployment

### APK Upload Fails

**Error: "Upload APK to this app..."**
- Make sure version code is higher than previous
- Check bundle ID matches
- Verify signing certificate

**Error: "This version is already used"**
- Increase build number in `pubspec.yaml`
- Example: `+2` instead of `+1`

### App Crashes After Upload

1. Check logcat on device
2. Look at Crashlytics (if enabled)
3. Rebuild with debug APK
4. Test thoroughly before next release

### Poor Reviews

Common issues:
- API URL wrong → Users can't load data
- Solution: Verify API URL works
- Add support email to store listing

### Low Ratings

Common complaints:
- "App is slow" → Optimize API calls
- "Crashes on startup" → Better error handling
- "Can't submit evaluation" → Check validation

---

## 📋 Release Checklist

### Final Pre-Release
- [ ] All features working
- [ ] Tested on real devices
- [ ] API URL correct and working
- [ ] No console errors
- [ ] Release APK built
- [ ] APK size acceptable
- [ ] Signed certificate ready

### Store Listing
- [ ] App title (50 chars)
- [ ] Short description (80 chars)
- [ ] Full description (engaging)
- [ ] Screenshots (3+ high quality)
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Privacy policy URL
- [ ] Support email

### Compliance
- [ ] Content rating filled
- [ ] Permissions justified
- [ ] No banned content
- [ ] Complies with Play Store policies
- [ ] Age-appropriate

### First Release
- [ ] App fully tested
- [ ] Beta feedback incorporated
- [ ] Version set to 1.0.0+1
- [ ] All store assets ready
- [ ] Payment method added to Dev account
- [ ] Staged rollout set to 5-10%

---

## 🎉 Success!

Once approved and live:

1. **Monitor** → Check Play Console daily first week
2. **Respond** → Reply to reviews
3. **Update** → Fix bugs and add features
4. **Market** → Share with students/teachers
5. **Iterate** → Gather feedback and improve

---

## 📚 Useful Links

- Google Play Console: https://play.google.com/console
- Flutter Publishing: https://flutter.dev/docs/deployment/android
- Play Store Policies: https://play.google.com/about/developer-content-policy/
- App Store Optimization: https://support.google.com/googleplay/android-developer/answer/10532660

---

**You're ready to publish! 🚀**

Follow this guide step-by-step and your app will be live on Google Play Store.
