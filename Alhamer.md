# Plan: Feature Parity - Flutter Mobile Alignment with React Web

## TL;DR
Sync flutter_mobile evaluation features with react_web PWA. Currently, react_web has sequential set unlocking (5 sets), per-student duplicate prevention, feedback system, and success animations. Flutter_mobile is missing these. Plan: Add sequential unlocking, duplicate prevention cross-device, feedback fields, and success flows.

## Current State

### React Web (✅ Complete)
- Sequential set unlocking (Sets 1-5, must complete Set 1→2→3→4 in order)
- Per-student per-device duplicate prevention (device_id + student_number + teacher_id)
- Positive & negative feedback fields
- Draft auto-save/recovery with progress tracking
- Success animations (confetti) + toast notifications
- Auto-redirect after 3 seconds
- Validation: all sets 1-4 must be complete before submission
- Evaluation enabled/disabled admin check
- Modal when already evaluated

### Flutter Mobile (❌ Missing Core Features)
- ✅ Draft save/recovery (basic)
- ✅ Toast notifications
- ✅ Evaluation history (local device only)
- ✅ Auth token storage
- ❌ NO sequential set unlocking
- ❌ NO duplicate prevention check (no "already evaluated" modal)
- ❌ NO feedback fields (positive/negative)
- ❌ NO success animations
- ❌ NO per-student cross-check (relies only on local history)
- ❌ NO eval-enabled admin setting check
- ❌ NO form validation per set

## Implementation Steps

### Phase 1: Data Layer & API Integration
1. **Backend Sync Check** - Verify API endpoints return:
   - Questions with `set_number` (1-5)
   - `evaluations/check-evaluated-teachers` endpoint for per-student check
   - `settings` endpoint with `eval_enabled` flag
   - Expect `answers` field in submission (not `ratings`)

2. **Update Evaluation Model** (flutter_mobile/lib/models/evaluation.dart)
   - Add `positive_feedback` field
   - Add `negative_feedback` field
   - Add `answers` instead of `ratings` in toJson()
   - Ensure `student_id` is always required

3. **Extend Question Model** (flutter_mobile/lib/models/question.dart)
   - Add `set_number` (int, 1-5)
   - Add `choice_descriptions` (Map for 1-5 scale labels)
   - Add `text` field (if not already present)

### Phase 2: Duplicate Prevention System
1. **Create DuplicatePreventionService** (new file: flutter_mobile/lib/services/duplicate_prevention_service.dart)
   - Mirror logic from react_web's duplicate-prevention.js
   - Generate device fingerprint (using device_info plugin)
   - Create evaluation key: `device_id|student_number|teacher_id`
   - Methods: `isTeacherAlreadyEvaluated()`, `markTeacherAsEvaluated()`
   - Use SharedPreferences to store evaluated teachers

2. **Backend Duplicate Check** (in EvaluationScreen)
   - Call `evaluations/check-evaluated-teachers?student_number={studentNumber}` API before showing form
   - If teacher is in response, show "Already Evaluated" modal (see Phase 3)
   - This prevents cross-device re-evaluation (not just local device)

### Phase 3: UI/UX Updates - Evaluation Screen
1. **Add AlreadyEvaluatedModal**
   - Show when teacher already evaluated by this student (per-device or cross-device)
   - Display message: "You have already evaluated this teacher"
   - Use Lucide icons: `AlertCircle` (warning), `Home` (back button)
   - Button: "Back to Teachers" (pop navigation)

2. **Sequential Set Unlocking UI**
   - Group questions by `set_number` (1-5)
   - Display tabs or expandable sections per set:
     - "Set 1: Lesson and Delivery" (always unlocked)
     - "Set 2: Knowledge of Subject Matter" (unlock after Set 1 complete)
     - "Set 3: Management of Learning" (unlock after Set 2 complete)
     - "Set 4: Dedication" (unlock after Set 3 complete)
     - "Set 5: Feedback" (always accessible, but optional)
   - Per-set progress badge (e.g., "2/2" for completed set)
   - Locked sets show: "🔒 Complete Set X to unlock" with disabled inputs
   - Disabled submit button until Sets 1-4 all complete

3. **Feedback Section (Set 5)**
   - Add `hasPositiveFeedback` checkbox + textarea
   - Add `hasNegativeFeedback` checkbox + textarea
   - Optional fields (Set 5 feedback not required for submission)
   - Show only after Sets 1-4 complete

### Phase 4: Validation & Submission
1. **Form Validation**
   - Per-set completion check (Sets 1-4 required, Set 5 optional)
   - Before submit: validate all required questions answered (rating > 0)
   - Show error toast if incomplete: "Please answer all rating questions (Sets 1-4)"

2. **Admin Settings Check**
   - On screen load: call `settings` API
   - If `eval_enabled === false`, show error toast and redirect to teachers list
   - Message: "Evaluations are currently disabled by the administrator"

3. **Submission Flow**
   - Call `evaluations` POST endpoint with:
     ```
     teacher_id, answers (Map), student_id, 
     positive_feedback (if has), negative_feedback (if has)
     ```
   - After success:
     - Show success toast: "✅ Evaluation submitted successfully!"
     - Mark teacher as evaluated (DuplicatePreventionService)
     - Show success animation (optional - confetti or similar)
     - Auto-redirect to teachers list after 2-3 seconds

### Phase 5: Draft Management Enhancement
1. **Update Draft Service** (flutter_mobile/lib/services/draft_service.dart)
   - Include `set_number` tracking for each question's response
   - Save `feedback` fields (positive/negative)
   - Add progress percentage calculation per set
   - Extend draft recovery dialog to show set-by-set progress

2. **Auto-Save Enhancement**
   - Save draft on every response change (not just on exit)
   - Update progress display in real-time

## Relevant Files

### Backend API
- `/backend/src/routes/evaluations.js` - Submission endpoint, check-evaluated endpoint
- `/backend/src/routes/settings.js` - Admin eval_enabled flag
- `/backend/src/routes/questions.js` - Questions with set_number

### Flutter Mobile Files to Modify/Create
- `flutter_mobile/lib/screens/evaluation_screen.dart` - Main changes (sequential UI, validation)
- `flutter_mobile/lib/services/duplicate_prevention_service.dart` - NEW
- `flutter_mobile/lib/models/evaluation.dart` - Add feedback fields
- `flutter_mobile/lib/models/question.dart` - Add set_number, choice_descriptions
- `flutter_mobile/lib/services/draft_service.dart` - Enhance draft tracking
- `flutter_mobile/lib/services/api_service.dart` - Add check-evaluated endpoint call
- `flutter_mobile/lib/services/auth_service.dart` - Already has student_number storage

### React Web Reference Files (to copy patterns from)
- `react_web/src/pages/Evaluation.jsx` - Sequential logic, validation, submission
- `react_web/src/components/AlreadyEvaluatedModal.jsx` - Modal implementation
- `assets/js/duplicate-prevention.js` - Device fingerprint & key generation logic

## Verification

1. **Sequential Unlocking**
   - Load evaluation → Set 1 accessible, Sets 2-4 locked
   - Complete Set 1 → Set 2 unlocks
   - Complete Sets 1-2 → Set 3 unlocks
   - Complete Sets 1-3 → Set 4 unlocks
   - All Sets 1-4 complete → Set 5 (feedback) fully accessible

2. **Duplicate Prevention**
   - Student A evaluates Teacher X on Device 1 → Success
   - Student A tries to evaluate Teacher X again on Device 1 → "Already Evaluated" modal
   - Student B evaluates Teacher X on Device 1 → Success (different student)
   - Student A evaluates Teacher X on Device 2 → Blocked (cross-device check via API)

3. **Feedback & Submission**
   - Submit with Sets 1-4 complete, no feedback → Success
   - Submit with Sets 1-4 complete, positive feedback only → Success
   - Submit with incomplete Sets 1-4 → Error toast, no submission

4. **Admin Control**
   - When eval_enabled = false → Redirect with message
   - When eval_enabled = true → Normal flow

5. **Draft Recovery**
   - Start evaluation, answer 5 questions, close app → Draft saved
   - Reopen evaluation → Draft recovery dialog
   - Recover draft → All 5 answers restored

## Icon Library
- **React Web:** `lucide-react`
- **Flutter:** `flutter_lucide_icons` package (Lucide icons ported to Flutter)
- **Icons to use:** `AlertCircle`, `Home`, `CheckCircle`, `Lock`, `Unlock`, `ChevronDown`, `Save`
- This ensures consistent visual design across both platforms

## Decisions & Scope

**Included:**
- All core react_web features synced to flutter
- Per-student per-device duplicate prevention
- Sequential set unlocking with proper validation
- Feedback system (positive/negative)
- Success messaging and animations
- Lucide icons for UI consistency

**Excluded (future enhancements):**
- Confetti animation (not critical for MVP, could use simple success screen)
- Advanced draft conflict resolution (keep simple: recover or start fresh)
- Backend validation of duplicate prevention (already works via API endpoint)

## Further Considerations

1. **Question Structure Alignment**
   - Verify backend returns `set_number` for all questions
   - Confirm `choice_descriptions` format (1-5 scale labels)
   - Check if existing data has these fields; may need migration script

2. **Performance**
   - Loading all questions then grouping by set is fine for <200 questions
   - If > 500 questions later, consider backend-side grouping

3. **Offline Functionality**
   - Duplicate prevention works offline (local device check)
   - Cross-device check requires API call (needs internet)
   - Handle gracefully if offline: warn user, allow submission with local check only



   # Backend Compatibility Check - May 27, 2026

## ✅ BACKEND HAS ALL REQUIRED ENDPOINTS

### 1. Evaluations API
**GET `/api/evaluations/check-evaluated-teachers?student_number=2201010099`**
- ✅ Implemented in `evaluationsController.checkEvaluatedTeachers()`
- Returns: `{ success: true, data: { teacher_id: {...}, ... }, count: N }`
- Keys: teacher_ids indexed by teacher ID
- Each entry contains: `id`, `name`, `evaluated_at`, `source: 'database'`
- Filters by: `student_id` field in evaluations collection
- Perfect for cross-device duplicate prevention!

**POST `/api/evaluations` - Create Evaluation**
- ✅ Accepts both old & new payload formats
- Accepts fields:
  - `teacher_id` (required)
  - `answers` (object: question_id → rating) ✅
  - `student_id` (required, validates not 'anonymous') ✅
  - `positive_feedback` ✅
  - `negative_feedback` ✅
  - `rating` (optional, calculated average)
  - `feedback` (fallback field)
- Validates: `eval_enabled` flag before allowing submission ✅
- Stores all fields properly in MongoDB

### 2. Settings API
**GET `/api/settings`**
- ✅ Implemented in `settingsController.getSettings()`
- Returns: `{ success: true, data: { eval_enabled: boolean } }`
- Defaults to `true` if not set
- Can be updated by super_admin via `PUT /api/settings`
- Perfect for admin control!

**PUT `/api/settings` - Update Settings**
- ✅ Requires super_admin permission
- Updates `eval_enabled` field
- Used by admin panel to enable/disable evaluations

### 3. Questions API
**GET `/api/questions?set_number=1`**
- ✅ Implemented in `questionsController.getQuestions()`
- Supports filtering: `?set_number=1` (or 2, 3, 4, 5)
- Returns questions with:
  - `set_number` (1-5) ✅
  - `choice_descriptions` (object with 1-5 labels) ✅
  - `text` field ✅
  - `type` field ✅
  - Backward compatible field names included
- Pagination supported: `?page=1&limit=10`

## ✅ DATA LAYER STATUS

### Questions Collection
**Status:** ✅ Properly structured
- New seeded questions have `set_number` (1-5)
- All have `choice_descriptions` object
- Field names normalized: `text`, `type`

**Migration Status:**
- Script exists: `backend/fix-existing-questions.js`
- Assigns set_number based on index if missing:
  - Q0-1 → Set 1
  - Q2-3 → Set 2
  - Q4-5 → Set 3
  - Q6-7 → Set 4
  - Q8+ → Set 5
- Adds default `choice_descriptions` if missing
- Already run (no conflicts expected)

### Evaluations Collection
**Storage Format:**
```javascript
{
  teacher_id: ObjectId,
  student_id: String (10-digit student number),
  answers: Object, // { question_id → rating }
  rating: Number,
  positive_feedback: String,
  negative_feedback: String,
  feedback: String,
  created_at: Date,
  updated_at: Date,
  ...
}