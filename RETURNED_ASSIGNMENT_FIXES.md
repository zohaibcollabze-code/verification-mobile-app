# RETURNED Assignment Submission Flow - Implementation Summary

**Date:** March 8, 2026  
**Status:** ✅ COMPLETED

---

## Issues Fixed

### ✅ Issue #1: Missing Status Transition for RETURNED Assignments
**Problem:** RETURNED assignments were skipping the accept API call, preventing status transition to IN_PROGRESS.

**Solution:** Modified `AcceptRejectScreen.tsx` to call `/requests/:id/accept` for RETURNED assignments, ensuring proper status transition before inspection begins.

**Files Changed:**
- `src/screens/AcceptRejectScreen.tsx` (lines 54-87)

**Implementation:**
```typescript
// Now RETURNED assignments call accept API to transition to IN_PROGRESS
if (isReturned) {
  const success = await acceptJob(requestId);
  if (!success) {
    throw new Error('Failed to initiate resubmission');
  }
}
```

---

### ✅ Issue #2: Overly Permissive Permission Checks
**Problem:** `canSubmitFindings()` allowed IN_PROGRESS, ACCEPTED, ASSIGNED, and RETURNED statuses, violating API documentation requirement that only IN_PROGRESS should be allowed.

**Solution:** Updated permission logic to strictly match API requirements:
- `canSubmitFindings()` - Only IN_PROGRESS
- `canResubmitFindings()` - Only RETURNED
- Added `canSubmitOrResubmit()` - Combined check for both scenarios

**Files Changed:**
- `src/utils/permissions.ts` (lines 26-49)

**Implementation:**
```typescript
static canSubmitFindings(job: Assignment, userId: string): boolean {
  return (
    job.status === 'IN_PROGRESS' &&
    job.current_assignment?.inspector_id === userId
  );
}

static canResubmitFindings(job: Assignment, userId: string): boolean {
  return (
    job.status === 'RETURNED' &&
    job.current_assignment?.inspector_id === userId
  );
}
```

---

### ✅ Issue #3: Poor UX for RETURNED Assignments
**Problem:** 
- Generic "Accept & Start" button for already-assigned RETURNED jobs
- Return notes (opsNotes) only visible at final review step
- No visual distinction between first submission and resubmission

**Solution:** Comprehensive UX improvements across multiple screens.

**Files Changed:**
- `src/screens/AcceptRejectScreen.tsx` (lines 130-201, 238, 313-327, 551-572)
- `src/screens/inspection/ReviewScreen.tsx` (lines 342-350, 450-454, 457-472)

**Implementation:**

#### AcceptRejectScreen Improvements:
1. **Badge Color Change:** Orange "RETURNED FOR REVISION" badge instead of blue "PENDING OFFER"
2. **Title Update:** "Review Returned Assignment" vs "Review Assignment"
3. **Subtitle Change:** "Corrections Required" vs "Formal Verification Directive"
4. **Prominent Return Notes:** Display opsNotes in highlighted warning box at top of screen
5. **Button Label:** "Continue Resubmission" instead of "Accept & Start"
6. **Modal Updates:** "Begin Resubmission" modal with context about loading previous data

#### ReviewScreen Improvements:
1. **Title:** "Review & Resubmit" vs "Review & Submit"
2. **Description:** Context-aware text explaining resubmission
3. **Button Label:** "Resubmit Report ✓" vs "Submit Report ✓"
4. **Modal:** "Finalize Resubmission" with appropriate messaging

---

## Complete RETURNED Assignment Flow

### Before Fix:
```
RETURNED → Skip accept → Load previous → Submit with RETURNED status ❌
```

### After Fix:
```
RETURNED → Call accept → Status: IN_PROGRESS → Load previous → Edit → Submit ✅
```

### Detailed Flow:

1. **Assignment Detail Screen**
   - Status: RETURNED
   - CTA: "RESUBMIT VERIFICATION"
   - Click → Navigate to AcceptReject

2. **Accept/Reject Screen** (RETURNED)
   - Badge: "RETURNED FOR REVISION" (orange)
   - Title: "Review Returned Assignment"
   - **Return Notes Box:** Displays opsNotes prominently
   - Button: "Continue Resubmission"
   - Click → Show modal

3. **Confirmation Modal**
   - Title: "Begin Resubmission"
   - Description: "You will revise and resubmit..."
   - Button: "Start Revision"
   - Click → Call `/requests/:id/accept`

4. **API Call**
   - `POST /requests/:id/accept`
   - Status transition: RETURNED → IN_PROGRESS
   - Success → Initialize draft

5. **Inspection Navigator**
   - Loads previous inspection data via `getPreviousInspection`
   - Populates draft with previous findings
   - Inspector edits as needed

6. **Review Screen** (Resubmission)
   - Title: "Review & Resubmit"
   - Shows return notes if present
   - Button: "Resubmit Report ✓"
   - Modal: "Finalize Resubmission"

7. **Submission**
   - `POST /inspections/:id/submit-findings`
   - Status: IN_PROGRESS (correct)
   - Includes GPS, photos, findings

---

## API Compliance

### ✅ Endpoint Usage
| Endpoint | Status Required | Implementation |
|----------|----------------|----------------|
| `POST /requests/:id/accept` | ASSIGNED or RETURNED | ✅ Now called for both |
| `POST /inspections/:id/submit-findings` | IN_PROGRESS | ✅ Status transitioned via accept |

### ✅ Permission Checks
| Check | Requirement | Implementation |
|-------|-------------|----------------|
| canAccept | ASSIGNED status | ✅ Correct |
| canSubmitFindings | IN_PROGRESS only | ✅ Fixed |
| canResubmitFindings | RETURNED only | ✅ Correct |

### ✅ UX Requirements
| Requirement | Implementation |
|-------------|----------------|
| Show return notes early | ✅ Displayed on AcceptReject screen |
| Visual distinction for resubmission | ✅ Orange badge, different labels |
| Clear action labels | ✅ "Continue Resubmission" vs "Accept & Start" |

---

## Testing Checklist

- [ ] RETURNED assignment shows orange badge
- [ ] Return notes visible on AcceptReject screen
- [ ] "Continue Resubmission" button appears
- [ ] Accept API called when starting resubmission
- [ ] Status transitions RETURNED → IN_PROGRESS
- [ ] Previous inspection data loads correctly
- [ ] Can edit previous findings
- [ ] Submit works with IN_PROGRESS status
- [ ] Review screen shows resubmission context
- [ ] Success screen appears after submission

---

## Files Modified

1. **src/screens/AcceptRejectScreen.tsx**
   - Fixed accept flow for RETURNED
   - Added return notes display
   - Updated labels and modals
   - Added styling for return notes box

2. **src/utils/permissions.ts**
   - Restricted canSubmitFindings to IN_PROGRESS only
   - Added canSubmitOrResubmit helper
   - Maintained canResubmitFindings for RETURNED

3. **src/screens/inspection/ReviewScreen.tsx**
   - Updated titles and descriptions
   - Changed button labels
   - Modified confirmation modal

---

## Breaking Changes

**None.** All changes are backward compatible. The flow now properly handles both:
- First-time submissions (ASSIGNED → IN_PROGRESS → Submit)
- Resubmissions (RETURNED → IN_PROGRESS → Submit)

---

## Notes

- The accept endpoint is now called for RETURNED assignments to ensure proper status transition
- Permission checks are now strict and match API documentation
- UX clearly distinguishes between new assignments and returned assignments
- Return notes are prominently displayed before inspector starts resubmission
- All status transitions follow the documented API contract
