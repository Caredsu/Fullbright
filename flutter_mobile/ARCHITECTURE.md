# Architecture & Flow Diagram

## 🔄 App Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      USER OPENS APP                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │   SPLASH SCREEN (2 seconds)     │
        │  - Loading animation            │
        │  - School icon                  │
        │  - "Loading..." text            │
        └────────────┬────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────────┐
        │  TEACHER LIST SCREEN            │
        │  ✓ Load teachers from API       │
        │  ✓ Show search box              │
        │  ✓ Display teacher cards        │
        │  ✓ Enable filtering             │
        └────────────┬────────────────────┘
                     │ (User taps teacher)
                     ▼
        ┌─────────────────────────────────┐
        │  EVALUATION SCREEN              │
        │  ✓ Show teacher info            │
        │  ✓ Load questions from API      │
        │  ✓ Display rating scales        │
        │  ✓ Show comment field           │
        └────────────┬────────────────────┘
                     │ (User clicks Submit)
                     ▼
        ┌─────────────────────────────────┐
        │  SUBMIT EVALUATION              │
        │  ✓ Send data to API             │
        │  ✓ Show loading indicator       │
        │  ✓ Validate responses           │
        └────────────┬────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────────┐
        │  SUCCESS / ERROR MESSAGE        │
        │  ✓ "Evaluation submitted!"      │
        │  ✓ Or error handling            │
        └────────────┬────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────────┐
        │  RETURN TO TEACHER LIST         │
        │  ✓ Can evaluate another teacher │
        └─────────────────────────────────┘
```

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                         FLUTTER APP                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              PRESENTATION LAYER (UI)               │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  • main.dart (App entry point)                      │    │
│  │  • splash_screen.dart (Loading)                     │    │
│  │  • teacher_list_screen.dart (List view)             │    │
│  │  • evaluation_screen.dart (Form)                    │    │
│  │  • Material Design widgets                          │    │
│  └──────────────────┬──────────────────────────────────┘    │
│                     │                                         │
│  ┌─────────────────▼──────────────────────────────────┐    │
│  │            BUSINESS LOGIC LAYER                    │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  • api_service.dart (API calls)                     │    │
│  │  • Data validation                                  │    │
│  │  • Error handling                                   │    │
│  └──────────────────┬──────────────────────────────────┘    │
│                     │                                         │
│  ┌─────────────────▼──────────────────────────────────┐    │
│  │            DATA LAYER (Models)                     │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  • teacher.dart                                     │    │
│  │  • question.dart                                    │    │
│  │  • evaluation.dart                                  │    │
│  └──────────────────┬──────────────────────────────────┘    │
│                     │                                         │
└─────────────────────┼─────────────────────────────────────────┘
                      │
                      ▼
        ┌───────────────────────────────┐
        │   HTTP Client (Dart:http)     │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   Your PHP API Server         │
        │  (c:\xampp\htdocs\...)        │
        ├───────────────────────────────┤
        │  GET  /api/teachers           │
        │  GET  /api/questions          │
        │  POST /api/evaluations        │
        └───────────────────────────────┘
```

---

## 📦 Dependencies Flow

```
flutter app
├── Flutter SDK
│   ├── material.dart (UI components)
│   ├── async.dart (async/await)
│   └── foundation.dart (basics)
├── http (API calls)
├── provider (state management) [optional]
├── intl (internationalization) [optional]
├── flutter_secure_storage (secure data)
├── connectivity_plus (network check)
└── cached_network_image (image caching) [optional]
```

---

## 🔗 API Integration Points

```
┌──────────────────────────────────────────────────────────────┐
│                    API SERVICE                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. getTeachers()                                            │
│     └─> GET /api/teachers                                    │
│         Response: Array<Teacher>                             │
│         ├─ _id                                               │
│         ├─ name                                              │
│         ├─ department                                        │
│         ├─ subject                                           │
│         ├─ profile_image                                     │
│         └─ email                                             │
│                                                               │
│  2. getQuestions()                                           │
│     └─> GET /api/questions                                  │
│         Response: Array<Question>                            │
│         ├─ _id                                               │
│         ├─ question_text                                     │
│         ├─ question_type (rating/text/choice)                │
│         ├─ options (for multiple choice)                     │
│         └─ category                                          │
│                                                               │
│  3. submitEvaluation(evaluation)                             │
│     └─> POST /api/evaluations                               │
│         Body: {                                              │
│           teacher_id: string                                 │
│           ratings: Map<string, dynamic>                      │
│           feedback_comments?: string                         │
│           submitted_at: DateTime                             │
│         }                                                     │
│         Response: { success: true }                          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎨 UI Component Hierarchy

```
MyApp
└── MaterialApp
    ├── theme: Material3 Design
    └── home: SplashScreen
        │
        ├── (After 2 sec)
        │
        └── TeacherListScreen
            ├── AppBar
            │   └── Title: "Evaluate Teachers"
            ├── SearchBar
            │   └── TextField (search)
            └── ListView (teachers)
                └── TeacherCard (repeating)
                    ├── CircleAvatar
                    ├── Title (teacher name)
                    ├── Subtitle (department)
                    └── onTap → EvaluationScreen
                        │
                        └── EvaluationScreen
                            ├── AppBar
                            │   └── Title: "Evaluate {name}"
                            ├── TeacherInfoCard
                            │   ├── Avatar
                            │   ├── Name
                            │   └── Department
                            ├── QuestionsList
                            │   └── QuestionCard (repeating)
                            │       ├── Question text
                            │       └── Rating/Choice widgets
                            ├── CommentsTextField
                            └── SubmitButton
                                └── onPressed → API call
```

---

## 💾 Data Flow

```
┌─────────────────┐
│  Teacher List   │
└────────┬────────┘
         │ Select Teacher
         ▼
┌─────────────────┐         ┌──────────────────┐
│  Evaluation UI  │────────▶│  API: Questions  │
└────────┬────────┘         └──────────────────┘
         │ User fills form
         ▼
┌─────────────────────────────────────────┐
│  Evaluation Object {                    │
│    teacher_id: string                   │
│    ratings: {                           │
│      "q1": 5,                           │
│      "q2": 4,                           │
│      "q3": "Good",                      │
│      ...                                │
│    }                                    │
│    feedback_comments: string            │
│    submitted_at: DateTime               │
│  }                                      │
└────────┬────────────────────────────────┘
         │ Click Submit
         ▼
┌───────────────────┐
│  API: Submit      │
│  POST /evaluations│
└────────┬──────────┘
         │ Success
         ▼
┌────────────────────────┐
│  ✓ Success Message     │
│  Return to List        │
└────────────────────────┘
```

---

## 🔌 Android Configuration Hierarchy

```
Android Project
├── build.gradle.kts (root build config)
├── app/
│   ├── build.gradle (app-level config)
│   ├── google-services.json (Firebase)
│   ├── src/
│   │   ├── main/
│   │   │   ├── AndroidManifest.xml
│   │   │   │   ├── Package name: com.example.teacher_eval_mobile
│   │   │   │   ├── Permissions: INTERNET, NETWORK_STATE
│   │   │   │   └── Activities: MainActivity
│   │   │   ├── kotlin/
│   │   │   │   └── MainActivity.kt (app entry)
│   │   │   └── res/
│   │   │       ├── drawable/ (images)
│   │   │       ├── mipmap-*/ (app icons)
│   │   │       └── values/
│   │   │           ├── strings.xml (app name)
│   │   │           ├── colors.xml (theme colors)
│   │   │           └── styles.xml (themes)
│   │   ├── debug/
│   │   ├── profile/
│   │   └── release/
│   ├── proguard-rules.pro (code shrinking)
│   └── key.properties (signing config)
└── gradle/
    └── wrapper/gradle-wrapper.properties
```

---

## 📊 State Management

Currently uses **Stateful Widgets** for simplicity:
- `TeacherListScreen` - manages search, list state
- `EvaluationScreen` - manages form state, ratings

For larger apps, consider:
- **Provider** (recommended, already in pubspec)
- **Riverpod** (modern alternative)
- **GetX** (simple & powerful)
- **BLoC** (complex enterprise)

---

## 🔄 Error Handling Flow

```
API Call
├── Success (200)
│   └── Parse JSON & return data
├── Error (4xx/5xx)
│   ├── Log error
│   ├── Show user message
│   └── Offer retry button
└── Exception (timeout/network)
    ├── Catch exception
    ├── Show connection error
    └── Enable offline mode
```

---

This architecture is clean, scalable, and follows Flutter best practices!
