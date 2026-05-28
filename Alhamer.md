# Plan: Complete Feature Parity - Flutter Mobile Alignment with React Web

**Status:** 📋 Ready for Implementation (May 27, 2026)

## TL;DR
Sync flutter_mobile evaluation features with react_web PWA. React web has sequential set unlocking (5 sets), per-student cross-device duplicate prevention, feedback system (positive/negative), success animations, professional UI, skeleton loaders, error handling with retry, and draft management. Flutter mobile is missing ALL core features. This comprehensive plan adds everything with backend compatibility verified, mobile-optimized UI, and proper error handling.

---

## Current State - Fully Audited

### React Web ✅ (Complete Feature List)

**Core Evaluation Features:**
- Sequential set unlocking (Sets 1-5: must complete Set 1→2→3→4 in order)
- Per-student cross-device duplicate prevention (API-based check)
- Feedback system: Positive & Negative fields (optional, Set 5 only)
- Success animations: Confetti effect + dedicated success screen
- Auto-redirect after 3 seconds on success
- Draft auto-save to localStorage with 30-minute expiration
- Validation: All Sets 1-4 required before submission
- Evaluation enabled/disabled admin check (eval_enabled flag)
- Modal when already evaluated (prevents re-evaluation)

**Admin Controls:**
- Settings check: eval_enabled flag gates evaluations
- 403 error returned if eval_enabled = false
- Admin can toggle evaluations on/off globally
- Super admin only

**UX/UI Features (Professional):**
- Card-based layout with set headers
- Set icons: BookOpen (Set 1), Brain (Set 2), Users (Set 3), Heart (Set 4)
- Set descriptions: Professional context for each evaluation area
- Per-set progress badges (e.g., "2/2" answers + checkmark when complete)
- Clickable set progress cards - jump between sets
- Sequential navigation buttons (← Back / Next →) between sets
- Completion checkmarks on progress badges
- Success screen with two action buttons (Dashboard / Evaluate Another)
- Skeleton loaders during data fetch
- Error alert with prominent retry button
- Toast notifications (success/error/info types with icons)
- Character counters on feedback (shows "120/500")
- Toggle switches for feedback enable/disable (checkbox + slider UI)
- Colored feedback card icons (✨ positive, 💡 improvement areas)
- Per-set header cards with icons, titles, descriptions
- Rating scale with choice description tooltips

**Data & Error Handling:**
- Multi-format field support: question_text OR text, rating_scale OR choice_descriptions
- Fallback for choice descriptions: defaults to [unused, 'Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
- BeforeUnload handler: prevents accidental navigation with unsaved changes warning
- User-friendly error messages (no technical jargon)
- Anonymous student prevention: explicitly rejects if student_id === 'anonymous'
- Real-time socket.io notifications to admin dashboard
- Token refresh with auto-retry queue for failed requests (401 handling)

**Draft Management:**
- Auto-save on every response change (not just on exit)
- 30-minute expiration before auto-discard
- Draft recovery dialog with:
  - Timestamp of when draft was saved
  - Progress info (number of ratings/feedback)
  - Two buttons: "Start Fresh" vs "Recover Draft"

### Flutter Mobile ❌ (Current State - Missing Core)

**What Exists ✅:**
- Basic draft save/recovery (SharedPreferences with JSON)
- Toast notifications (via flutter_toast)
- Evaluation history (local device only - no sync)
- Auth token storage
- Student number validation (10-digit format YYSSPPDDXX)
- Retry logic with exponential backoff (2 retries max)
- Network error handling with helpful messages
- Pagination support (5 questions per page)
- Basic question loading and display

**What's Missing ❌ (Must Implement):**
- ❌ NO sequential set unlocking (all questions shown together without restriction)
- ❌ NO duplicate prevention check (no "already evaluated" modal)
- ❌ NO feedback fields (positive/negative) - form doesn't exist
- ❌ NO success animations or success screen
- ❌ NO per-student cross-device check (relies only on local history)
- ❌ NO eval-enabled admin setting check (doesn't call settings API)
- ❌ NO per-set form validation (allows incomplete submissions)
- ❌ NO skeleton loaders (shows blank while loading)
- ❌ NO confetti animation
- ❌ NO BeforeUnload/WillPopScope warning (unsaved changes)
- ❌ NO dedicated success screen (just closes)
- ❌ NO character counters
- ❌ NO set-based UI organization
- ❌ NO per-set progress indicators/badges
- ❌ NO error retry UI (retry button)
- ❌ NO real-time notifications

---

## Implementation Plan - 8 Phases

### Phase 1: Data Layer & API Integration (Verification Only - ✅ COMPLETE)

**Status:** Backend fully supports everything - **NO MIGRATION NEEDED**

**Verified Endpoints (Already Working):**

1. **GET `/api/evaluations/check-evaluated-teachers?student_number=2201010099`**
   - ✅ Implemented in evaluationsController.checkEvaluatedTeachers()
   - Returns: `{ success: true, data: { teacher_id: {...}, ... }, count: N }`
   - Response keys: teacher_ids indexed by teacher ID
   - Each entry contains: id, name, evaluated_at, source: 'database'
   - Filters by: student_id field in evaluations collection
   - **Purpose:** Cross-device duplicate prevention
   - **Error handling:** No auth required, graceful on network failure

2. **POST `/api/evaluations` - Create Evaluation**
   - ✅ Accepts both old (ratings) & new (answers) payload formats
   - Accepts all fields:
     - `teacher_id` (required, ObjectId)
     - `answers` (object: question_id → rating) ✅
     - `student_id` (required, 10-digit string, validates not 'anonymous') ✅
     - `positive_feedback` (optional string) ✅
     - `negative_feedback` (optional string) ✅
     - `rating` (optional, calculated average from answers)
     - `feedback` (fallback field for old format)
   - **Validation:** eval_enabled flag check (returns 403 if false)
   - **Validation:** student_id !== 'anonymous' (returns 401 if violated)
   - Stores all fields properly in MongoDB
   - Emits real-time socket.io notification to admin dashboard

3. **GET `/api/settings`**
   - ✅ Implemented in settingsController.getSettings()
   - Returns: `{ success: true, data: { eval_enabled: boolean } }`
   - Defaults to `true` if not yet set
   - Can be updated by super_admin via PUT /api/settings
   - **Purpose:** Admin global control of evaluations

4. **GET `/api/questions?set_number=1` - Questions by Set**
   - ✅ Implemented in questionsController.getQuestions()
   - Supports filtering: `?set_number=1` (or 2, 3, 4, 5)
   - Returns questions with:
     - `set_number` (1-5) ✅
     - `choice_descriptions` (object with "1"-"5" labels) ✅
     - `text` field ✅
     - `type` field ✅
     - Backward compatible field names included
   - Pagination supported: `?page=1&limit=10`
   - **Example choice_descriptions:**
     ```json
     {
       "1": "Strongly Disagree",
       "2": "Disagree",
       "3": "Neutral",
       "4": "Agree",
       "5": "Strongly Agree"
     }
     ```

**Data Structure (Confirmed):**

Questions Collection:
```javascript
{
  _id: ObjectId,
  set_number: 1-5,
  choice_descriptions: { "1": "...", "2": "...", ... },
  text: String,
  type: String,
  question_text: String (for backward compatibility),
  rating_scale: Object (for backward compatibility)
}


evaluation collection:
{
  _id: ObjectId,
  teacher_id: ObjectId,
  student_id: String (10-digit),
  answers: Object, // { question_id → rating }
  rating: Number,
  positive_feedback: String,
  negative_feedback: String,
  feedback: String,
  created_at: Date,
  updated_at: Date,
  evaluated_by: String or ObjectId
}


Phase 2: Model Updates (Data Classes)
2.1: Update Evaluation Model → evaluation.dart

Changes needed:

Add field: positive_feedback: String? (nullable)
Add field: negative_feedback: String? (nullable)
Rename field: ratings → answers (Map<String, dynamic>)
Update method: toJson() to use answers instead of ratings
Add method: toSubmissionPayload() - returns correctly formatted JSON for API submission
Ensure: student_id always required (never allow 'anonymous' or empty)

class Evaluation {
  final String id;
  final String teacherId;
  final String studentId;
  final Map<String, dynamic> answers; // Changed from ratings
  final double? rating;
  final String? positiveFeedback; // NEW
  final String? negativeFeedback; // NEW
  
  Map<String, dynamic> toSubmissionPayload() {
    return {
      'teacher_id': teacherId,
      'answers': answers,
      'student_id': studentId,
      'rating': rating,
      if (positiveFeedback != null && positiveFeedback!.isNotEmpty)
        'positive_feedback': positiveFeedback,
      if (negativeFeedback != null && negativeFeedback!.isNotEmpty)
        'negative_feedback': negativeFeedback,
    };
  }
}

2.2: Extend Question Model → question.dart

Changes needed:

Add field: set_number: int? (1-5)
Add field: choice_descriptions: Map<String, String>? (maps "1"-"5" to labels)
Add field: text: String (if not already present)
Add method: getChoiceLabel(int rating) - returns label for rating or fallback
Fallback order: choice_descriptions → rating_scale → default labels

example: class Question {
  final String id;
  final String text; // Primary field
  final String? questionText; // Fallback
  final int? setNumber; // NEW: 1-5
  final Map<String, String>? choiceDescriptions; // NEW
  final Map<String, String>? ratingScale; // Fallback
  
  String getChoiceLabel(int rating) {
    final ratingStr = rating.toString();
    return choiceDescriptions?[ratingStr] ??
           ratingScale?[ratingStr] ??
           ['', 'Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'][rating];
  }
}


Phase 3: Service Layer - New & Enhanced
3.1: NEW - Create DuplicatePreventionService → flutter_mobile/lib/services/duplicate_prevention_service.dart

Purpose: Cross-device duplicate prevention via API

Dependencies: device_info (already in pubspec.yaml), http package

methods: class DuplicatePreventionService {
  // Generate unique device fingerprint
  Future<String> getDeviceId() async {
    // Use device_info plugin
    // Combine: model + OS version + unique identifier
    // Return SHA256 hash for privacy
  }
  
  // Check if teacher already evaluated by this student (via API)
  Future<bool> isTeacherAlreadyEvaluated(
    String teacherId, 
    String studentNumber
  ) async {
    // Call: GET /api/evaluations/check-evaluated-teachers?student_number={studentNumber}
    // Return: true if teacherId found in response, false otherwise
    // Error handling: If offline, fall back to local check
  }
  
  // Mark teacher as evaluated locally
  Future<void> markTeacherAsEvaluated(
    String teacherId, 
    String teacherName, 
    String studentNumber
  ) async {
    // Store in SharedPreferences: evaluated_teachers_{studentNumber}
    // Format: JSON array of { teacherId, teacherName, evaluatedAt }
  }
  
  // Get list of evaluated teacher IDs for student
  Future<List<String>> getEvaluatedTeacherIds(String studentNumber) async {
    // Return from SharedPreferences
  }
  
  // Clear all evaluated teachers on logout
  Future<void> clearAll() async {
    // Clear all keys: evaluated_teachers_*
  }
}

storage format(sharepreferences):

Key: "evaluated_teachers_{studentNumber}"
Value: [
  {
    "teacherId": "507f1f77bcf86cd799439011",
    "teacherName": "John Doe",
    "evaluatedAt": "2026-05-27T10:30:00Z"
  },
  ...
]



Error Handling:

If API call fails: Use local check only
Show toast warning: "Using offline check (no internet)"
Allow submission with local check only (transparent to user)
3.2: ENHANCE - Draft Service → draft_service.dart

Changes needed:

Add fields to draft:

set_number: int (for each question)
positiveFeedback: String
negativeFeedback: String
hasPositiveFeedback: bool
hasNegativeFeedback: bool
Add method: getProgressPercentage() - calculates overall progress

Count: answered questions / total rating questions (Sets 1-4)
Return: int (0-100)
Used for progress bar UI badge
Add method: isSetComplete(int setNum) - checks if all questions in set answered

Return: bool
Used for sequential unlock logic
Extend recovery dialog: Show per-set progress

Example: "Set 1: 2/2 ✓ | Set 2: 1/2 | Set 3: ⚠️ Locked"
Used when user opens app with existing draft
Add 30-minute expiration check:

Compare: Date.now() - draft.timestamp > 30 * 60 * 1000
If expired: Don't offer recovery, start fresh instead
Already partially implemented, just enhance
Example:

class DraftService {
  Map<String, dynamic>? getDraft(String teacherId) {
    // Load from SharedPreferences
    // Check 30-min expiration
    // Return null if expired
  }
  
  Future<void> saveDraft({
    required String teacherId,
    required Map<String, dynamic> answers,
    required String positiveFeedback,
    required String negativeFeedback,
    required bool hasPositiveFeedback,
    required bool hasNegativeFeedback,
  }) async {
    final draft = {
      'teacherId': teacherId,
      'answers': answers,
      'positiveFeedback': positiveFeedback,
      'negativeFeedback': negativeFeedback,
      'hasPositiveFeedback': hasPositiveFeedback,
      'hasNegativeFeedback': hasNegativeFeedback,
      'savedAt': DateTime.now().toIso8601String(),
    };
    // Save to SharedPreferences
  }
  
  int getProgressPercentage(String teacherId) {
    // Calculate: answered / total rating questions
    // Return: 0-100
  }
  
  bool isSetComplete(String teacherId, int setNum, List<Question> questions) {
    // Get draft answers for setNum
    // Check if all questions in set have ratings > 0
    // Return: bool
  }
}



3.3: UPDATE - API Service → api_service.dart

Changes needed:

Add method: checkEvalEnabled() - GET /api/settings

Future<bool> checkEvalEnabled() async {
  // Call: GET /api/settings
  // Return: data.eval_enabled (default true if missing)
  // Error: Return true (allow if can't check)
}
Add method: getEvaluatedTeachers(String studentNumber) - GET /api/evaluations/check-evaluated-teachers

Future<Map<String, dynamic>> getEvaluatedTeachers(String studentNumber) async {
  // Call: GET /api/evaluations/check-evaluated-teachers?student_number={studentNumber}
  // Return: response.data (map of teacher_id → {id, name, evaluated_at, source})
  // Error: Return empty map (fallback to local check)
}



Update submit method: Use answers format (not ratings)

Change payload: answers: Map<String, dynamic> instead of ratings
Include: positive_feedback, negative_feedback if present
Before: { "ratings": { ... } }
After: { "answers": { ... }, "positive_feedback": "...", "negative_feedback": "..." }
Add error handling:

403 eval_enabled: Returns specific message: "Evaluations are currently disabled by the administrator"
401 anonymous student: Returns specific message: "Invalid session: Student must be authenticated"
Network error: Graceful fallback with user-friendly message
Phase 4: Evaluation Screen Redesign (Major Refactor)
File: evaluation_screen.dart

Refactor from: Linear question list (all questions shown) → Set-based tabbed interface (one set visible at a time)

Screen Structure:

4.1: Header Section (NEW)

Teacher info card: photo, name, department
Overall progress bar showing percentage (e.g., "4/10 (40%)")
Per-set progress badges (6 cards in a grid or row):
Set 1-4: Show number, completion status (checkmark if 100%), lock icon if locked
Set 5: Show "Feedback" label, always accessible
4.2: Set-Based Navigation (NEW)

Tab indicators or section headers for each set
Only ONE set visible at a time (not all sets)
Current set: Full view with all questions
Other sets: Disabled/hidden (show "← Back to Set 1" etc if needed)
Tab shows: Set number, progress (e.g., "Set 1: 2/2"), completion checkmark
Set Names (from React web):

Set 1: "LESSON AND DELIVERY"
Set 2: "KNOWLEDGE OF SUBJECT MATTER"
Set 3: "MANAGEMENT OF LEARNING"
Set 4: "DEDICATION"
Set 5: "FEEDBACK" (optional)
4.3: Rating Questions Section (REFACTORED)

Group by set_number
Display in current set only (one set visible)
Per-question card showing:
Question number (index in set)
Question text
5-point rating scale (buttons 1-5)
Selected rating highlight with color
Completion badge (checkmark when rated)
Below each rating button: Show choice description (from choice_descriptions)
Example: Button "4" with label "Agree" below
4.4: Feedback Section - Set 5 (NEW)

Only visible when:
Current set = 5 AND
All Sets 1-4 are complete
Two cards: "Positive Feedback" & "Areas for Improvement" (Negative Feedback)
Each card:
Toggle checkbox with slider appearance: "Include [Type] Feedback"
Textarea (if enabled): 500-char limit with counter
Placeholder text with helpful prompt
Character counter: "150/500" (shows in real-time)
Styling: Separate colors for positive (green/blue) vs negative (orange/yellow)
4.5: Navigation & Validation (NEW)

Bottom buttons:
"← Back to Set X" (if not on Set 1) - goes to previous set
"Next: Set X →" (if current set complete) - goes to next set
"Complete Evaluation" (on Set 5, only if all Sets 1-4 complete)
Button states:
Disabled "Next" button if current set incomplete (show reason)
Disabled "Complete" if any required set incomplete
Visual feedback: Show error toast if trying to advance without completing
On Back/Next: Don't re-validate, just navigate
4.6: Lock UI - Locked Sets (NEW)

Locked set shows:
🔒 Lock icon
Message: "Complete Set X to unlock Set Y"
All inputs disabled (not clickable)
Reduced opacity (0.6)
On click: Show toast "Complete Set X first"
4.7: Error & Loading States (NEW)

Loading: Skeleton loaders for:
Teacher header
Progress bar
Set progress badges
Question cards
Error: Prominent error alert with:
Alert icon
Error message (user-friendly)
"Retry" button
Optional: "Back" button
Success: Separate success screen (Phase 5)
Phase 5: Modals & Success Screens
5.1: AlreadyEvaluatedModal (NEW) → flutter_mobile/lib/widgets/already_evaluated_modal.dart

Trigger: When isAlreadyEvaluated is true on screen init

Display:

Modal overlay with semi-transparent background
Card-based modal:
Alert icon (⚠️ or AlertCircle from lucide_icons)
Title: "Already Evaluated"
Message: "You have already evaluated this teacher. One evaluation per teacher per device."
Info box with two checkmarks:
✓ Your evaluation has been recorded
✓ You cannot submit another evaluation for this teacher from this device
Button: "Back to Teachers" (pops to teachers list screen)
Styling: Alert/warm color scheme (red/orange tones)
Animation: Slide up from bottom
Code Structure:

showDialog(
  context: context,
  builder: (context) => AlertDialog(
    title: Row(children: [AlertCircleIcon(), SizedBox(width: 8), Text("Already Evaluated")]),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text("You have already evaluated this teacher."),
        SizedBox(height: 12),
        Container(
          padding: EdgeInsets.all(12),
          color: Colors.grey[100],
          child: Column(
            children: [
              Text("✓ Your evaluation has been recorded"),
              Text("✓ You cannot submit another evaluation for this teacher from this device"),
            ],
          ),
        ),
      ],
    ),
    actions: [
      ElevatedButton(
        onPressed: () => Navigator.pop(context) & Navigator.pop(context),
        child: Text("Back to Teachers"),
      ),
    ],
  ),
);


5.2: SuccessScreen (NEW) → flutter_mobile/lib/screens/success_screen.dart

Trigger: After successful evaluation submission

Display:

Full-screen success celebration:
Large checkmark animation/icon (✓ or CheckCircle)
Title: "Success!"
Subtitle: "Evaluation Submitted"
Message: "Thank you for evaluating [Teacher Name]. Your feedback will help improve teaching quality."
Two action buttons:
"Back to Teachers" (navigates to teachers list)
"Evaluate Another" (navigates to teachers list with reset)
Auto-redirect to teachers list after 3 seconds
Optional: Confetti animation (can skip for MVP)
Styling: Celebratory green/positive color scheme
Code Structure:

class SuccessScreen extends StatefulWidget {
  final String teacherName;
  
  @override
  State<SuccessScreen> createState() => _SuccessScreenState();
}

class _SuccessScreenState extends State<SuccessScreen> {
  @override
  void initState() {
    super.initState();
    // Auto-redirect after 3 seconds
    Future.delayed(Duration(seconds: 3), () {
      if (mounted) {
        Navigator.pop(context); // Go back to teachers
      }
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CheckCircleIcon(color: Colors.green, size: 88),
            SizedBox(height: 24),
            Text("Success!", style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
            Text("Evaluation Submitted", style: TextStyle(fontSize: 18, color: Colors.grey[600])),
            SizedBox(height: 16),
            Text("Thank you for evaluating ${widget.teacherName}..."),
            SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton(...),
                SizedBox(width: 12),
                ElevatedButton(...),
              ],
            ),
            SizedBox(height: 24),
            Text("Redirecting in a moment…", style: TextStyle(color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}


Phase 6: Validation & Core Logic
6.1: Admin Settings Check

On EvaluationScreen.initState():
Call ApiService.checkEvalEnabled()
If eval_enabled === false:
Show error toast: "Evaluations are currently disabled by the administrator"
Navigate back to teachers list after 2 seconds
Catch errors gracefully (default to true, allow)
6.2: Duplicate Prevention Check

On EvaluationScreen.initState() (after settings check):
Call duplicatePreventionService.isTeacherAlreadyEvaluated(teacherId, studentNumber)
If true:
Show AlreadyEvaluatedModal
Block form from displaying (modal is only thing shown)
If false:
Proceed to load questions
Handle network errors: Use local check as fallback
6.3: Form Validation Before Submit

Per-set completion check:

Validate all Sets 1-4 have at least one rating > 0 per set
Loop through each set: if (getSetProgress(setNum).isComplete === false) { return }
If incomplete: Show error toast "Please answer all rating questions in Sets 1-4"
Return early (don't proceed with submission)
Student number validation:

Ensure student_number is not 'anonymous'
Ensure student_number is not empty
If invalid: Show error toast "Invalid session: Please log in with your student number"
Feedback validation:

If hasPositiveFeedback = true, ensure text is not empty
If hasNegativeFeedback = true, ensure text is not empty
(Optional: Show warning if user enabled feedback but left it blank)
6.4: Submission Flow

Phase 7: Draft Management & Offline Support
7.1: Auto-Save Enhancement

Save draft on every response change (not just on exit)
Debounce saves: Wait 500ms after last change before saving
Prevents excessive writes to SharedPreferences
Update in-memory progress badge in real-time
Show small "Saving..." indicator briefly
7.2: BeforeUnload Warning (Mobile Equivalent)

Use WillPopScope to warn before leaving screen with unsaved changes
Prompt: "You have unsaved changes. Are you sure you want to leave?"
Only show if:
Changes made (answered > 0 questions)
Not yet submitted (success !== true)
User is leaving via back button or navigation
Code:
WillPopScope(
  onWillPop: () async {
    if (hasUnsavedChanges && !isSubmitting) {
      return await showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text("Unsaved Changes"),
          content: Text("You have unsaved changes. Are you sure?"),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: Text("Keep Editing")),
            TextButton(onPressed: () => Navigator.pop(context, true), child: Text("Leave")),
          ],
        ),
      ) ?? false;
    }
    return true;
  },
  child: // Your form widget
)


7.3: Offline Handling

Duplicate prevention: If API call fails, use local check as fallback
Show warning toast: "Using local check (offline mode)"
Settings check: If API call fails, default to true (allow evaluations)
Draft: Always works offline (stored in SharedPreferences)
Submission: Show error "No internet connection. Please check your connection." if offline
Allow retry when internet is back




Phase 8: UI Polish & Accessibility
8.1: Loading States

Skeleton loaders for:
Teacher header (show placeholder cards)
Progress bar (show shimmer effect)
Set progress badges (show skeleton cards)
Question cards (show placeholder lines)
Loading duration: Show for minimum 500ms (even if data arrives faster) for smooth UX
8.2: Feedback Messages

Toast notifications with icons:
Success (green, checkmark icon)
Error (red, X icon)
Info (blue, info icon)
Prominent error alert with retry button:
Show only for critical errors (network, 500, etc.)
Non-critical errors show as toast only
Character counter updates in real-time:
Show "Current/Max" (e.g., "127/500")
Change color to orange if >400, red if >475
Set completion checkmarks in progress badges:
Show green checkmark when set complete
Show partial progress (e.g., "2/3") when incomplete
8.3: Mobile Optimization

Single set visible at a time (NOT all sets - saves vertical scrolling)
Larger tap targets for rating buttons (48x48pt minimum)
Full-width form components (no wasted horizontal space)
Vertical spacing optimized for mobile (avoid cramped UI)
Bottom sheet for feedback section (optional enhancement for later)
Portrait orientation only (lock to portrait)
8.4: Icons (flutter_lucide_icons Package)

Add dependency in pubspec.yaml: flutter_lucide_icons: ^x.x.x
Icons to use:
AlertCircle - For warnings/already evaluated modal
Home - For "Back to Teachers" button
CheckCircle - For set completion checkmarks, success screen
Lock - For locked sets indicator
Unlock - For unlocked sets (optional)
ChevronDown - For expandable sections (if used)
Save - For save/draft button (if added later)
Verification Steps (End-to-End Testing)
1. Sequential Unlocking ✅
Load evaluation → Set 1 form visible, rating buttons clickable
Sets 2-4: Buttons disabled, opacity reduced, message "Complete Set 1 first"
Complete all questions in Set 1 (rating > 0 for all)
Verify Set 2 now unlocks (buttons enabled, opacity normal)
Repeat for Sets 2→3, 3→4
Verify Set 5 feedback section hidden until Sets 1-4 complete
Complete all Sets 1-4 → Set 5 now visible
2. Duplicate Prevention ✅
Student A device 1 → Evaluate Teacher X → Success
Student A device 1 → Try to evaluate Teacher X again → "Already Evaluated" modal appears
Student B device 1 → Evaluate Teacher X → Success (different student, allowed)
Student A device 2 → Try to evaluate Teacher X → API call blocks (cross-device check)
Offline: Student A device 1 → Try again (offline) → Local check blocks
3. Feedback System ✅
Before Sets 1-4 complete → Feedback section not visible (hidden)
After all Sets 1-4 complete → Feedback section visible
Toggle "Include Positive Feedback" → Textarea appears/disappears
Toggle "Include Negative Feedback" → Textarea appears/disappears
Type in textarea → Character counter updates in real-time
Submit with Sets 1-4 complete, no feedback → Success (feedback optional)
Submit with positive feedback only → Success
Submit with negative feedback only → Success
Submit with both feedback types → Success
4. Admin Control ✅
Login as super_admin → Admin panel → Settings → Toggle eval_enabled
eval_enabled = false → Student tries to evaluate:
Error toast: "Evaluations are currently disabled"
Redirect to teachers list
Form not shown
eval_enabled = true → Student evaluates normally
5. Draft Management ✅
Start evaluation → Answer 3 questions → Close app (without submitting)
Reopen app → Draft recovery dialog appears with:
"You have an unsaved evaluation"
Progress: "Set 1: 2/2" etc
Two buttons: "Start Fresh" vs "Recover Draft"
Choose "Recover" → 3 answers restored, can continue
Choose "Start Fresh" → All answers cleared, start from beginning
6. Draft Expiration ✅
Create draft → Close app
Wait 30+ minutes
Reopen app → No recovery dialog (expired draft discarded)
Form shows empty
7. Success Flow ✅
Complete all Sets 1-4 → Add feedback → Submit
Success screen appears:
Checkmark icon
"Thank you for evaluating [Teacher Name]"
"Back to Teachers" & "Evaluate Another" buttons
Auto-redirect after 3 seconds
Manual click "Back to Teachers" also redirects
8. Error Handling ✅
Network down → Try to submit → Error alert "No internet connection"
Retry button enabled → Fix network → Retry button works
eval_enabled API fails → Error toast, allow submission with default (true)
Already evaluated API fails → Fallback to local check, show warning
Edge Cases - All Resolved ✅
Scenario	React Web	Flutter Current	Plan Resolution
Anonymous student submission	Rejects with 401	No check	Validate student_id !== 'anonymous', reject with user message
eval_enabled = false	Returns 403 error	No check	Call settings API on init, show error + redirect
Already evaluated	Cross-device API check	Local history only	API call check-evaluated-teachers + local fallback if offline
Incomplete sets	Block submit button	Allow all questions	Validate each set before submit, disable button
Feedback visibility	Only after Sets 1-4	Always visible	Hide until all Sets 1-4 complete
Draft >30min old	Discard stale	Not tracked	Add timestamp check, discard if expired
Offline evaluation	Network error	No handling	Show warning, use local check only, allow retry
Payload format	answers object {q_id: rating}	ratings array [1,2,3]	Change to answers object format
Missing choice_descriptions	Fallback to default	Not handled	Use fallback labels: [unused, "Strongly Disagree", ...]
Question text field	text OR question_text	Not handled	Support both, prefer text field
Confetti animation	Complex SVG	Not needed	Skip for MVP, can add later
Multi-format responses	rating_scale OR choice_descriptions	Single source	Support both with fallback
Files to Create/Modify
Models (2 files)
evaluation.dart - MODIFY

Add: positive_feedback, negative_feedback
Change: ratings → answers
Add method: toSubmissionPayload()
question.dart - MODIFY

Add: set_number (1-5)
Add: choice_descriptions (Map)
Add method: getChoiceLabel()
Services (3 files - 1 NEW, 2 ENHANCED)
flutter_mobile/lib/services/duplicate_prevention_service.dart - CREATE NEW

Methods: getDeviceId(), isTeacherAlreadyEvaluated(), markTeacherAsEvaluated()
Storage: SharedPreferences with evaluated teachers list
draft_service.dart - ENHANCE

Track per-set progress
Add 30-min expiration
Methods: isSetComplete(), getProgressPercentage()
api_service.dart - UPDATE

Add: checkEvalEnabled() method
Add: getEvaluatedTeachers() method
Update: Submit method to use answers format
Error handling: 403 eval_enabled, 401 anonymous
Screens (3 files - 1 MAJOR REFACTOR, 2 NEW)
evaluation_screen.dart - MAJOR REFACTOR

Set-based tabbed UI (one set visible)
Sequential unlocking logic
Validation before submit
Support feedback fields
Skeleton loaders
flutter_mobile/lib/screens/success_screen.dart - CREATE NEW

Success celebration UI
Auto-redirect after 3s
flutter_mobile/lib/screens/teachers_list_screen.dart - VERIFY

Ensure navigation back from success works
Widgets (5+ NEW files)
flutter_mobile/lib/widgets/already_evaluated_modal.dart - CREATE NEW
flutter_mobile/lib/widgets/set_header_card.dart - CREATE NEW
flutter_mobile/lib/widgets/set_progress_badge.dart - CREATE NEW
flutter_mobile/lib/widgets/question_card.dart - CREATE NEW (refactored)
flutter_mobile/lib/widgets/feedback_card.dart - CREATE NEW
Configuration (1 file)
pubspec.yaml - UPDATE
Add: flutter_lucide_icons: ^X.X.X (latest version)
Verify: device_info package already present
Verify: shared_preferences package for draft/duplicate storage


Implementation Timeline (Recommended)
Week 1: Foundation & Services

Day 1-2: Model updates (evaluation.dart, question.dart)
Day 3-4: DuplicatePreventionService creation
Day 5: API service updates, draft service enhancements
Week 2: Core Evaluation Logic

Day 1-2: EvaluationScreen refactor to set-based UI
Day 3-4: Sequential unlocking logic implementation
Day 5: Validation before submit
Week 3: UI & UX

Day 1-2: Build set header cards, progress badges
Day 3: Build question cards with rating UI
Day 4: Build feedback cards with toggles
Day 5: AlreadyEvaluatedModal + SuccessScreen
Week 4: Polish & Testing

Day 1: Skeleton loaders, loading states
Day 2: Error handling UI (alerts, retry buttons)
Day 3: Icons, animations, styling refinement
Day 4: End-to-end testing (all 8 verification steps)
Day 5: Bug fixes, final testing
Success Criteria (All Must Pass ✅)
✅ Sequential unlocking works - cannot advance to Set 2 until Set 1 complete
✅ Duplicate prevention blocks - cannot re-evaluate same teacher (cross-device)
✅ Feedback fields appear only after Sets 1-4 complete
✅ Character counters show and update in real-time (500 char max)
✅ Success screen appears after submit, auto-redirects after 3 seconds
✅ Draft recovery works with per-set progress display
✅ Error messages are user-friendly (no technical jargon)
✅ No anonymous submissions allowed (rejects with message)
✅ Evaluations disabled message appears when eval_enabled = false
✅ Mobile UI is clean, responsive, single-set-at-a-time (no excessive scrolling)
✅ Admin can control evaluations globally via settings
✅ Offline evaluation gracefully falls back to local checks with warnings
Decisions Made ✅
Included:

All core react_web features synced to flutter
Per-student cross-device duplicate prevention (API-based)
Sequential set unlocking with proper UI states
Feedback system (positive/negative, 500 char each)
Success screen + auto-redirect (3 seconds)
Draft management with recovery (30-min expiration)
Admin settings check (eval_enabled gate)
Professional UI with card-based set layout
Error handling with retry buttons
Skeleton loaders during data fetch
Toast notifications (success/error/info types)
Character counters on feedback
Per-set progress badges
Mobile-optimized single-set-at-a-time view
Excluded (Future Enhancements):

Confetti animation (complex, can add later)
Real-time socket.io notifications to Flutter (infrastructure, can add later)
Keyboard navigation (not applicable on mobile)
Advanced draft conflict resolution (keep simple: recover or start fresh)
Multi-language support (out of scope)
Backend-side duplicate prevention validation (works as-is)
References & Resources
React Web Files (Copy Patterns From)
Evaluation.jsx - Sequential logic, validation, confetti (267-800+ lines)
AlreadyEvaluatedModal.jsx - Modal implementation (41 lines)
Toast.jsx - Toast notifications (39 lines)
evaluation.css - Responsive design patterns
Toast.css - Toast styling
duplicate-prevention.js - Device fingerprint logic
Flutter References
student_login_screen.dart - Student validation pattern
api_service.dart - Retry logic, error handling
draft_service.dart - SharedPreferences usage
toast_service.dart - Toast implementation
Notes for Implementation
Test Early & Often

Test sequential unlocking with multiple sets
Test duplicate prevention on 2 real devices (if possible) or simulators
Test offline scenarios (use airplane mode)
Test with eval_enabled = false in admin settings
Backward Compatibility

Support old ratings format in models (for any legacy data)
Support both text and question_text fields
Support both choice_descriptions and rating_scale
Performance

Debounce draft auto-saves (500ms minimum)
Use FutureBuilder for API calls (not synchronous)
Don't load all questions at once if >500 (implement pagination)
Accessibility

Use semantic widgets (ElevatedButton, not raw GestureDetector)
Ensure sufficient color contrast (WCAG AA minimum)
Test with system text size settings
Error Messages (User-Friendly)

❌ "403 Forbidden" → ✅ "Evaluations are currently disabled"
❌ "401 Unauthorized" → ✅ "Invalid session: Please log in"
❌ "SocketException" → ✅ "No internet connection"
❌ "null reference error" → ✅ "Something went wrong, please try again