# Flutter Mobile Feature Parity - Comprehensive Testing Guide

**Purpose:** Validate all Phases 1-8 implementation and ensure Flutter app matches React web functionality

---

## 🧪 Testing Strategy

### Test Environment Setup
1. Start Flutter app on Android emulator or physical device
2. Ensure backend API is running (https://evaluation-backend-kaah.onrender.com)
3. Have 3-4 test student accounts ready
4. Prepare test teachers list with known data

### Network Conditions to Test
- Normal connectivity
- Slow network (simulate in DevTools)
- Offline (airplane mode)
- Intermittent (enable/disable WiFi)
- Network timeout (backend down)

---

## ✅ Phase 1-3 Validation (Data Layer)

### Phase 1: Backend Verification
**Test:** API endpoints work correctly

```
✓ GET /api/teachers → Returns teacher list
✓ GET /api/questions?set_number=1 → Returns Set 1 questions with set_number
✓ GET /api/evaluations/check-evaluated-teachers?student_number=XXXX → Returns already evaluated
✓ GET /api/settings → Returns eval_enabled flag
✓ POST /api/evaluations → Accepts evaluation payload
```

**Steps:**
1. Open DevTools → Network tab
2. Navigate to evaluation screen
3. Verify all API calls show 200 status
4. Check response bodies contain expected fields

### Phase 2: Model Updates
**Test:** Evaluation and Question models work correctly

```
✓ Evaluation model has positiveFeedback, negativeFeedback fields
✓ Evaluation model converts answers (Map) format correctly
✓ Question model returns setNumber (1-5)
✓ Question model has choiceDescriptions for labels
✓ getChoiceLabel() returns correct fallback: choiceDescriptions → ratingScale → default
```

**Steps:**
1. Load evaluation screen for any teacher
2. Verify questions appear grouped by set
3. Check rating buttons show correct labels
4. Print console logs to verify model data

### Phase 3: Services
**Test:** All services initialize and work

```
✓ ApiService: Fetches teachers, questions, submits evaluations
✓ DraftService: Saves and loads drafts with 30-min expiration
✓ DuplicatePreventionService: Marks teachers as evaluated
✓ OfflineQueueService: Initializes without errors
✓ ConnectivityMonitorService: Starts on app init
```

**Steps:**
1. Launch app → ConnectivityMonitor starts (check logs: "🔍 Starting connectivity monitor")
2. Navigate to teacher evaluation
3. Save draft → Check SharedPreferences
4. Load different teacher → Draft not loaded (different teacher)
5. Re-open same teacher → Draft recovered if < 30 min

---

## ✅ Phase 4: Evaluation Screen Redesign

### Sequential Unlocking ✅
**Test:** Sets unlock in order 1→2→3→4, Set 5 always accessible

```
Test Case 1: Load screen
✓ Set 1 tab visible and enabled
✓ Sets 2-4 tabs visible but disabled (greyed out, can't click)
✓ Set 5 tab visible but disabled

Test Case 2: Complete Set 1
✓ Answer all questions in Set 1 (rate each 1-5)
✓ Click "Next Set" button → Navigates to Set 2
✓ Set 1 tab shows checkmark (✓)
✓ Set 2 tab now enabled (can click)

Test Case 3: Try to skip set
✓ Go back to Set 1
✓ Click "Next Set" without selecting all answers → Disabled or error
✓ Select all answers again
✓ Click "Next Set" → Success

Test Case 4: Complete Set 4, unlock Set 5
✓ Complete Sets 2, 3, 4 in order
✓ After completing Set 4, Set 5 becomes enabled
✓ All 5 set tabs now show status (complete/current/enabled)
```

**Expected UI:**
- Set 1 (current): Blue background, white text
- Set 2-4 (complete): Green background, white checkmark
- Set 5 (feedback): Accessible after Set 4 complete

### Set-Based Navigation
**Test:** Can navigate between sets

```
✓ Previous button disabled on Set 1
✓ Previous button enabled on Sets 2-5
✓ Next button enabled only if current set complete
✓ Next button shows "Prev" on small screens (< 400px width)
✓ Clicking set tab navigates directly (if unlocked)
✓ Clicking locked set tab does nothing (disabled)
```

### Progress Indicator
**Test:** Progress bar updates correctly

```
✓ Shows "X/Y questions answered"
✓ Progress bar fills proportionally
✓ Progress updates as user answers questions
✓ Shows 0/N initially, increases to full on last answer
```

---

## ✅ Phase 5: Modals & Success Screen

### Already Evaluated Modal
**Test:** Blocks re-evaluation on same device

```
Test Case 1: Normal flow (first time)
✓ No modal appears
✓ Can proceed with evaluation

Test Case 2: Re-evaluate same teacher (same device)
✓ Modal appears with: "Already Evaluated"
✓ Message: "One evaluation per teacher per device"
✓ Button: "Back to Teachers"
✓ Clicking button returns to teacher list
✓ Form is completely blocked

Test Case 3: Different student, same device
✓ Can evaluate (different student_number)
```

### Success Screen
**Test:** Shows after successful submission

```
✓ Checkmark animates in (scales 0→1 with elasticOut)
✓ Content fades in (appears over 600ms)
✓ Shows teacher name: "Thank you for evaluating [Teacher]"
✓ Shows countdown: "3", "2", "1", "0"
✓ Auto-redirect after 3 seconds → Back to teacher list
✓ Manual "Continue" button works
✓ Close/back button not visible (full screen)

Test Case: Manual redirect
✓ Click "Continue" button → Redirects immediately
```

### Draft Recovery
**Test:** Recovers draft when returning to evaluation

```
Test Case 1: Save draft
✓ Answer some questions in Set 1
✓ Click back/close button
✓ Toast appears: "💾 Draft saved"
✓ Return to teacher list

Test Case 2: Recover draft
✓ Re-open same teacher evaluation
✓ Dialog appears: "Found draft - Recover or Start Fresh?"
✓ Click "Recover Draft" → Answers restored
✓ Click "Start Fresh" → Clears draft

Test Case 3: Expired draft (> 30 min)
✓ Save draft
✓ Wait 30 minutes (or modify timestamp in prefs)
✓ Re-open evaluation
✓ No recovery dialog (draft auto-deleted)
✓ Form shows empty

Test Case 4: Expiration warning
✓ Save draft
✓ Wait 25 minutes
✓ Snackbar appears: "⏰ Your draft expires in 5 minutes"
✓ Color is orange/warning
```

---

## ✅ Phase 6: Error Handling & Recovery

### Network Error Dialog
**Test:** Network failures handled gracefully

```
Precondition: Stop backend API or disconnect internet

Test Case 1: Submit with no internet
✓ Click Submit button
✓ Spinner shows briefly
✓ Error dialog appears: "Network Connection Error"
✓ Icon: cloud-off (orange)
✓ Message: "Network error: Unable to connect..."
✓ Buttons: "Save & Exit", "Queue for Later", "Retry"
✓ "Save & Exit" saves draft and closes dialog
✓ "Queue for Later" queues evaluation and redirects
✓ "Retry" attempts submission again

Test Case 2: Retry logic
✓ Click "Retry" 3 times
✓ Each attempt shows spinner
✓ After 3rd attempt fails, same dialog re-appears
✓ Can continue retrying indefinitely
```

### Timeout Error Dialog
**Test:** Requests taking too long handled

```
Precondition: Simulate slow backend (slow 3G in DevTools or add network delay)

Test Case 1: Request times out after 30s
✓ Click Submit button
✓ Spinner shows
✓ After ~30 seconds: Error dialog appears: "Request Timeout"
✓ Message explains: "Taking too long. Check connection."
✓ Same retry/queue/save options available
```

### Evaluations Disabled (403)
**Test:** Admin disables evaluations

```
Precondition: Set eval_enabled = false in backend

Test Case 1: Try to evaluate
✓ Click Submit button
✓ Dialog appears: "Evaluations Disabled" (lock icon, red)
✓ Message: "Evaluations disabled by administrator. Try later."
✓ Only button: "Go Back"
✓ Clicking returns to teacher list
✓ Cannot retry (no retry button)
```

### Student Validation (401)
**Test:** Invalid student info

```
Precondition: Force invalid student_id scenario

Test Case 1: Try to submit with anonymous/invalid student
✓ Dialog appears: "Authentication Error"
✓ Message: "Invalid student information. Log in again."
✓ Only button: "Log In Again"
✓ Clicking logs out and shows login screen
```

### Generic Error Dialog
**Test:** Unexpected errors

```
Test Case 1: Server error (500)
✓ Dialog appears: "Submission Error" (warning icon, red)
✓ Error details shown in scrollable monospace box
✓ Buttons: "Save & Exit", "Retry"
✓ Can retry indefinitely
```

---

## ✅ Phase 7: Offline Submission Queue

### Queueing Submission
**Test:** Offline submissions saved locally

```
Precondition: Enable airplane mode or stop network

Test Case 1: Queue submission
✓ Complete evaluation (Sets 1-4 + optional Set 5 feedback)
✓ Click Submit
✓ Network error dialog appears
✓ Click "Queue for Later"
✓ Toast appears: "📥 Evaluation queued - will sync when online"
✓ Auto-redirect after 2 seconds to teacher list
✓ Teacher shows as evaluated locally

Test Case 2: Verify queued in storage
✓ Enable DevTools → SharedPreferences
✓ Key: `offline_submission_queue`
✓ Contains JSON: [{evaluation: {...}, queuedAt: timestamp, retryCount: 0}]

Test Case 3: Queue multiple
✓ Evaluate different teacher with airplane mode on
✓ Queue second evaluation
✓ Queue shows 2 submissions in storage
```

### Background Sync
**Test:** Auto-sync when online restored

```
Precondition: Queue 1-2 evaluations offline

Test Case 1: Turn internet back on
✓ ConnectivityMonitor checks every 30 seconds
✓ After detection (max 30s wait):
  - Console shows: "📡 Online detected - checking for queued..."
  - Console shows: "🔄 Found X queued submissions - syncing..."
  - Console shows: "✅ Synced X/X submissions"
  - Queue cleared from storage
  - Toast could show (if app in foreground)

Test Case 2: Manual sync trigger
✓ Open DevTools console
✓ Call: ConnectivityMonitorService.syncNow()
✓ Manually forces sync
✓ Shows same sync output in logs
```

### Retry on Failed Sync
**Test:** Failed submissions remain in queue

```
Precondition: Queue submission, then simulate API error during sync

Test Case 1: Sync fails
✓ Connection restored
✓ Sync attempts to submit
✓ API returns error (e.g., 500)
✓ Sync increments retryCount
✓ Submission remains in queue
✓ Next check (30s later) retries
✓ Repeats up to 3 times

Test Case 2: Submission dropped after 3 retries
✓ After 3 failed attempts: retryCount = 3
✓ Next sync: Submission dropped with log "Dropped submission after 3 retries"
✓ Removed from queue permanently
```

### Queue Status API
**Test:** Check queue status programmatically

```
✓ OfflineQueueService.getQueueLength() returns 0-N
✓ OfflineQueueService.getQueueStatus() returns:
  - queuedCount: Number
  - isOnline: Boolean
  - lastSync: DateTime?
```

---

## ✅ Phase 8: UI Polish & Responsive Design

### Skeleton Loaders
**Test:** Smooth loading states

```
Test Case 1: Load evaluation screen
✓ Initial load shows SkeletonEvaluationScreen
✓ Skeleton shows: Teacher info box + Progress bar + 3 question cards + Submit button
✓ Each skeleton fades in/out smoothly
✓ Fade animation: 0.3 → 0.6 opacity, repeats
✓ After questions load (1-2 sec): Skeleton replaced with real content
✓ No jarring transitions

Test Case 2: Skeleton matches final UI
✓ Skeleton question height matches real question height
✓ Skeleton progress bar matches real bar
✓ Skeleton borders radius matches (8px rounded)
```

### Responsive Layout - Small Screen (< 400px)
**Test:** Mobile phone portrait

```
✓ Padding: 12px horizontal, 12px vertical (compact)
✓ Set navigation buttons show "Prev" / "Next" (shortened)
✓ Button text font: 12px (smaller)
✓ Button icons: 18px (smaller)
✓ Button padding: 8px vertical (compact)
✓ No horizontal scrolling
✓ Set tabs fit on screen (scrollable horizontally if needed)
✓ Feedback textareas fit and are usable

Test Case: Galaxy S5 (320px width)
✓ All buttons stack properly
✓ No overflow warnings
✓ Text readable without zooming
```

### Responsive Layout - Medium Screen (400-600px)
**Test:** Standard tablet/landscape phone

```
✓ Padding: 16px (normal)
✓ Buttons show full text: "Previous Set" / "Next Set"
✓ Font sizes: 14px (normal)
✓ Button icons: 20px (normal)
✓ Button padding: 12px (normal)
✓ Good spacing all around
```

### Responsive Layout - Large Screen (> 600px)
**Test:** Tablet/desktop

```
✓ Padding: 24px (spacious)
✓ Font sizes: 110% of base (slightly larger)
✓ Everything feels spacious, not cramped
```

### Font Responsiveness
**Test:** Fonts scale with screen size

```
Test Case: Base font size 16px
✓ Small screen: 13.6px (85%)
✓ Medium screen: 16px (100%)
✓ Large screen: 17.6px (110%)

(Font responsive method: _getResponsiveFontSize used where needed)
```

---

## 📋 Checklist - All Phases

### Models & Services (Phases 1-3)
- [ ] All API endpoints return correct data
- [ ] Evaluation model supports feedback fields
- [ ] Question model has setNumber and choiceDescriptions
- [ ] Draft service saves/loads correctly
- [ ] Duplicate prevention blocks re-evaluation
- [ ] Offline queue initializes without errors
- [ ] Connectivity monitor starts on app init

### Evaluation Screen (Phase 4)
- [ ] Sequential unlocking works (Sets 1-4 unlock in order)
- [ ] Set 5 always accessible
- [ ] Cannot skip to next set without completing current
- [ ] Previous button disabled on Set 1
- [ ] Next button disabled if set incomplete
- [ ] Progress indicator shows answered count
- [ ] Can navigate between sets by clicking tabs (if unlocked)
- [ ] Questions appear correctly for each set

### Modals & Success (Phase 5)
- [ ] Already evaluated modal appears on re-evaluation
- [ ] Modal blocks form completely
- [ ] Success screen appears after submission
- [ ] Checkmark animates smoothly
- [ ] Countdown timer works (3→0)
- [ ] Auto-redirect to teachers list after 3 seconds
- [ ] Manual "Continue" button works immediately
- [ ] Draft recovery dialog appears for existing draft
- [ ] Draft expiration warning appears after 25 min
- [ ] Draft recovered correctly (answers restored)

### Error Handling (Phase 6)
- [ ] Network error dialog appears (cloud-off icon)
- [ ] Timeout error dialog appears with appropriate message
- [ ] "Queue for Later" button available on network error
- [ ] "Disabled" dialog appears when eval_enabled = false
- [ ] "Login Again" dialog appears on auth error (401)
- [ ] Generic error dialog shows error details
- [ ] Retry button triggers submission again
- [ ] "Save & Exit" saves draft and closes dialog
- [ ] Loading spinner shows during retry attempts
- [ ] Can retry indefinitely (no max attempts limit for user)

### Offline Support (Phase 7)
- [ ] Can queue submission when offline
- [ ] Success toast shows: "Evaluation queued - will sync"
- [ ] Queued evaluation marked as evaluated locally
- [ ] Auto-sync triggers when connection restored
- [ ] Console shows sync progress logs
- [ ] Queued submissions sync successfully
- [ ] Queue cleared after successful sync
- [ ] Failed submissions remain in queue for retry
- [ ] Submissions dropped after 3 failed retries

### UI Polish (Phase 8)
- [ ] Skeleton loader appears during initial load
- [ ] Skeleton animation is smooth (fade in/out)
- [ ] Skeleton replaced smoothly with real content
- [ ] Small screen (< 400px): Compact layout, "Prev" button
- [ ] Medium screen: Normal layout with full text
- [ ] Large screen: Spacious layout with larger fonts
- [ ] No horizontal scrolling (except set tabs)
- [ ] Responsive fonts scale with screen
- [ ] All buttons properly sized for screen size
- [ ] No overflow or layout issues on any screen size

---

## 🐛 Known Issues & Workarounds

None documented yet - report any issues found during testing.

---

## 📊 Test Results Template

```
Test Date: ___________
Tester: ___________
Device: ___________ (make/model/screen size)
OS: ___________ (Android version)
Network: ___________ (WiFi/Mobile/Both)

PASSED Tests: ___/___

FAILED Tests:
1. ___
2. ___

NOTES:
_______________
```

---

## 🚀 Final Validation Checklist

Before considering Phases 1-8 complete:
- [ ] All test cases pass on Android emulator
- [ ] All test cases pass on physical Android device
- [ ] No compilation errors or warnings
- [ ] No uncaught exceptions in logs
- [ ] Offline queue persists across app restarts
- [ ] Error recovery works for all error types
- [ ] UI responsive on screens 320px - 1080px
- [ ] Performance acceptable (no noticeable lag)
- [ ] No memory leaks in long-running tests
- [ ] Toast notifications appear and disappear correctly

---

## ✅ Sign-Off

When all tests pass:
- Phases 1-8 complete ✅
- Flutter app has feature parity with React web ✅
- Ready for deployment ✅
