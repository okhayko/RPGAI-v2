# 🎯 Breakthrough System - Live Testing Plan

## 🚀 Test Environment
- **Development Server**: `http://localhost:5174`  
- **World Setup File**: `AI-RolePlay-WorldSetup-2025-09-01T06-47-12-473Z.json`
- **Status**: ✅ Crash bug fixed, system ready for testing

## ✅ Pre-Test Verification
- [x] **Build Successful**: No TypeScript errors
- [x] **Unit Tests Pass**: 11/11 breakthrough system tests passing
- [x] **ReferenceError Fixed**: `setKnownEntities` now properly available
- [x] **Development Server Running**: Accessible on localhost:5174

## 📋 Test Scenarios

### 🔧 **Test 1: Basic Game Functionality**
**Objective**: Verify game loads and works normally without breakthrough features
- [ ] Open browser to `http://localhost:5174`
- [ ] Click "Tạo Thế Giới Mới"
- [ ] Click "Tải thiết lập" and select `AI-RolePlay-WorldSetup-2025-09-01T06-47-12-473Z.json`
- [ ] Verify world loads successfully
- [ ] Verify initial story generates without errors
- [ ] Check that skills show in entity list
- [ ] **Expected Result**: Normal game startup with no crashes

### 🎯 **Test 2: Skill EXP Near Max (Critical Crash Scenario)**
**Objective**: Test the exact scenario that was causing crashes
- [ ] Find a skill with EXP near maximum (e.g., 90/100)
- [ ] Use choices that would grant EXP to that skill
- [ ] Watch for EXP to reach exactly max (100/100)
- [ ] **Expected Result**: 
  - [x] No crash occurs ✅
  - [x] Skill becomes capped (🔒 indicator) ✅  
  - [x] Story generation continues normally ✅
  - [x] EXP bar shows orange/red color ✅

### 🔄 **Test 3: Capped Skill State**
**Objective**: Verify capped skills behave correctly
- [ ] Create or find a skill at max EXP (capped state)
- [ ] Verify UI shows capped indicators:
  - [ ] Orange/red experience bar
  - [ ] 🔒 "Đã cấp hạn" badge
  - [ ] "Chờ cơ hội đột phá" message
- [ ] Try to gain more EXP on capped skill
- [ ] **Expected Result**: No additional EXP gained, skill remains capped

### ⚡ **Test 4: Breakthrough Eligibility (20% Roll)**
**Objective**: Test breakthrough opportunity generation
- [ ] Have at least one capped skill
- [ ] Take several game actions (5-10 turns)
- [ ] Watch for breakthrough eligibility:
  - [ ] ⚡ "Có thể đột phá" badge appears (animated)
  - [ ] UI message changes to "Sẵn sàng đột phá!"
- [ ] **Expected Result**: Eventually (within 10-15 turns), skill becomes eligible

### ✦ **Test 5: Breakthrough Choice Generation**
**Objective**: Verify ✦Đột Phá✦ choices appear correctly
- [ ] Once skill is breakthrough-eligible
- [ ] Take a game action
- [ ] Look for choices containing "✦Đột Phá✦"
- [ ] **Expected Format**: `✦Đột Phá✦ [Skill Name] - Nỗ lực vượt qua giới hạn...`
- [ ] **Expected Result**: Breakthrough choices available alongside normal choices

### 🎲 **Test 6: Breakthrough Success**
**Objective**: Test successful breakthrough attempt
- [ ] Select a "✦Đột Phá✦" choice
- [ ] Wait for AI response
- [ ] Check skill status after breakthrough:
  - [ ] Mastery level increased (Sơ Cấp → Trung Cấp)
  - [ ] EXP reset to 0
  - [ ] Max EXP increased (100 → 300)
  - [ ] No longer capped
  - [ ] Can gain EXP again
- [ ] **Expected Result**: Skill advances to next mastery level

### 💥 **Test 7: Breakthrough Failure**  
**Objective**: Test failed breakthrough attempt
- [ ] Select a "✦Đột Phá✦" choice (may need multiple attempts)
- [ ] If breakthrough fails:
  - [ ] Skill remains at same mastery level
  - [ ] Still capped at max EXP
  - [ ] No longer eligible (must wait for next 20% roll)
  - [ ] "Chờ cơ hội đột phá" message returns
- [ ] **Expected Result**: Skill stays capped, waits for next opportunity

### 🔄 **Test 8: Multiple Skills**
**Objective**: Test system with multiple capped skills
- [ ] Get 2-3 skills to capped state
- [ ] Verify each skill has independent breakthrough eligibility
- [ ] Test breakthrough choices for different skills
- [ ] **Expected Result**: Each skill managed independently

### 💾 **Test 9: Save/Load Persistence**
**Objective**: Verify breakthrough state survives save/load
- [ ] Create scenario with capped/eligible skills
- [ ] Export save file
- [ ] Refresh browser/restart
- [ ] Load save file
- [ ] Verify all skill states preserved:
  - [ ] Capped status maintained
  - [ ] Breakthrough eligibility maintained
  - [ ] EXP values correct
- [ ] **Expected Result**: All breakthrough states persistent

### 🏆 **Test 10: Viên Mãn (Max Level)**
**Objective**: Test max mastery level behavior
- [ ] Get a skill to "Viên Mãn" mastery (if possible)
- [ ] Verify max level skills:
  - [ ] Cannot breakthrough further
  - [ ] Show "Đã đạt tối đa!" message
  - [ ] No breakthrough choices generated
- [ ] **Expected Result**: Max level skills properly handled

## 🚨 **Critical Success Criteria**
- ✅ **No Crashes**: Game never hangs on "Generating story..."
- ✅ **No EXP Overflow**: Skills cap at max EXP, never exceed
- ✅ **Proper State Transitions**: Skills correctly transition between states
- ✅ **UI Feedback**: Clear visual indicators for all states
- ✅ **Choice Validation**: Only valid breakthrough choices appear
- ✅ **Story Continuity**: Game flow never interrupts

## 📊 **Test Results Log**

### Test Session: [DATE/TIME]
- **Tester**: [NAME]
- **Browser**: [CHROME/FIREFOX/etc]
- **Test Duration**: [TIME]

| Test | Status | Notes |
|------|--------|-------|
| Basic Functionality | ⏳ | |
| EXP Near Max | ⏳ | |
| Capped Skill State | ⏳ | |
| Breakthrough Eligibility | ⏳ | |
| Breakthrough Choices | ⏳ | |
| Breakthrough Success | ⏳ | |
| Breakthrough Failure | ⏳ | |
| Multiple Skills | ⏳ | |
| Save/Load Persistence | ⏳ | |
| Viên Mãn Level | ⏳ | |

**Legend**: ⏳ Pending, ✅ Pass, ❌ Fail, ⚠️ Issue

## 🐛 **Issue Tracking**
If any issues are found during testing, document them here:

### Issue #1
- **Scenario**: 
- **Expected**: 
- **Actual**: 
- **Severity**: 
- **Steps to Reproduce**: 

---
**Note**: This system replaces the old auto-advancement with manual breakthrough mechanics. All previous EXP-related behaviors have changed.