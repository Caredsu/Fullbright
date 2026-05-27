Plan: Dashboard Info Box & Set Labels Refactoring + Results Modal Enhancement
TL;DR
Phase 1-4: Create set constants, remove info box from Dashboard, update Questions filter buttons with descriptive labels
Phase 5: Enhance Results modal to show per-set mean ratings, qualitative feedback, and overall total (average of 4 set-means)
Set Descriptions (ALL CAPS Tagalog Labels + English Descriptions)
Set	Label	Description
1	LESSON AND DELIVERY	Evaluates the teacher's ability to plan, organize, and deliver lessons effectively to students.
2	KNOWLEDGE OF SUBJECT MATTER	Assesses the teacher's depth of knowledge and mastery of their subject area.
3	MANAGEMENT OF LEARNING	Measures how well the teacher manages the classroom and facilitates student learning.
4	DEDICATION	Evaluates the teacher's commitment, professionalism, and dedication to their role.
Implementation Phases
Phase 1: Create Set Configuration Constants
Create new file: admin-react/src/lib/sets-config.ts
Define SET_METADATA constant with:
Set number as key (1, 2, 3, 4)
Label (LESSON AND DELIVERY, etc.)
One-sentence description
Category (Rating)
Phase 2: Update Dashboard.jsx
Remove lines 191-201 (blue "How to get started" info box)
Keep the rest of empty state intact
Phase 3: Update Questions.jsx Filter Buttons
Import SET_METADATA from sets-config
Update Set Filter Tabs (lines 263-275):
Replace Set {setNum} (Rating) with label + description below
Update Modal Set Selector (lines 389-400):
Replace Set {setNum} with label from SET_METADATA
Replace all [1, 2, 3, 4] arrays with Object.keys(SET_METADATA).map(Number)
Phase 4: Visual Updates
Filter buttons: Label on first line, description in smaller text below
Modal buttons: Label with description visible
Phase 5: Enhanced Results Modal Display
Show per-set mean ratings for Sets 1-4 (already calculated in setAverages)
Display Set 5 qualitative feedback (positive_feedback + negative_feedback)
Show Overall Total = (Set1-mean + Set2-mean + Set3-mean + Set4-mean) ÷ 4
Update section headers with new SET_METADATA labels
Files to Modify/Create
File	Action	Details
admin-react/src/lib/sets-config.ts	CREATE	New SET_METADATA constant
Dashboard.jsx:191-201	EDIT	Remove info box
Questions.jsx:263-275	EDIT	Update filter buttons
Questions.jsx:389-400	EDIT	Update modal selector
Results.jsx	EDIT	Update results modal
Verification Steps
Phases 1-4
✅ Dashboard shows no info box when no recent evaluations exist
✅ Questions page filter buttons show "Set 1 (LESSON AND DELIVERY)" with description
✅ Modal set selector uses new labels
✅ All 4 sets render correctly and filtering works
Phase 5
✅ Results modal displays mean rating per set (not individual questions)
✅ Set 5 section shows positive and negative qualitative feedback
✅ Overall total displays as average of the 4 set-means
✅ Set headers display new descriptive labels
Key Decisions
✅ Overall Total: Average of four set-means (not all individual ratings)
✅ Descriptions: English, 1-sentence, displayed as subtitle text
✅ Set Labels: ALL CAPS Tagalog category names
✅ Backend: No conflicts - all changes are frontend only
✅ Reusability: SET_METADATA centralized for use across Dashboard, Questions, Results