# 🧪 COMPLETE TESTING GUIDE - Manual Verification Steps

**App URL:** http://localhost:8085/  
**Date:** January 30, 2026

---

## 📋 PRE-TESTING CHECKLIST

### ✅ Environment Status
- [x] Dev server running on port 8085
- [x] Zero TypeScript errors
- [x] All components compiled successfully
- [x] Hot reload enabled
- [x] Browser simple browser opened

---

## 🎯 TESTING SCENARIOS

### **TEST 1: Profile Page Load & Navigation** ⏳

**Steps:**
1. Login to the application
2. Navigate to your own profile (click profile icon or /profile route)
3. Verify the header shows:
   - [Saved] button
   - [⚙️ Settings] button ← New
   - [🔔 Notification] button
   - [≡ Menu] button

**Expected Result:**
```
✅ Profile page loads without black screen
✅ Header displays all buttons correctly
✅ No console errors
✅ Layout responsive on mobile/desktop
```

**Actual Result:** ⏳ _To be tested manually_

---

### **TEST 2: Settings Dialog - Privacy Tab** ⏳

**Steps:**
1. Click [⚙️ Settings] button on profile
2. Dialog opens with 4 tabs at the top
3. Click on **Privacy** tab (Eye icon)
4. Verify the following controls appear:

```
✅ Email address       [Public ▼] [Friends ▼] [Only Me ▼]
✅ Phone number       [Public ▼] [Friends ▼] [Only Me ▼]
✅ Birthday           [Public ▼] [Friends ▼] [Only Me ▼]
✅ Location           [Public ▼] [Friends ▼] [Only Me ▼]
✅ Workplace          [Public ▼] [Friends ▼] [Only Me ▼]
✅ Education          [Public ▼] [Friends ▼] [Only Me ▼]
✅ Relationship       [Public ▼] [Friends ▼] [Only Me ▼]
✅ Friends list       [Public ▼] [Friends ▼] [Only Me ▼]
```

**Real-time Test:**
1. Change one dropdown (e.g., Email from "Public" to "Only Me")
2. Should immediately save to database
3. Toast notification shows: "Privacy updated"
4. Open Settings again → should show your selection saved

**Expected Result:**
```
✅ All 8 privacy controls visible
✅ Dropdown changes work
✅ Changes save instantly (real-time)
✅ Toast notification appears
✅ Changes persist after refresh
```

**Actual Result:** ⏳ _To be tested manually_

---

### **TEST 3: Settings Dialog - Security Tab** ⏳

**Steps:**
1. Open Settings dialog
2. Click **Security** tab (Shield icon)

**Section A: Change Password**
```
✅ Current Password    [________]
✅ New Password        [________]
✅ Confirm Password    [________]
✅ [Change Password] button
```

1. Enter current password
2. Enter new password (6+ characters)
3. Confirm new password (must match)
4. Click [Change Password]

**Expected Result:**
```
✅ Validates passwords match
✅ Shows error if password < 6 chars
✅ Password changes on backend
✅ Toast notification shows success
```

**Section B: Active Sessions**
```
📱 Chrome Browser, India
   Last active 2 minutes ago
   [Logout] ← button

📱 Safari Browser (This device)
   Last active just now
   ← No logout button (current device)

📱 Firefox Browser
   Last active 1 hour ago
   [Logout] ← button
```

1. Click [Logout] on one device
2. Should immediately remove from list
3. Toast shows: "Session ended"

**Expected Result:**
```
✅ Shows current device marked "(This device)"
✅ Current device has no logout button
✅ Other devices have logout buttons
✅ Clicking logout removes session
✅ Last active time shows correctly
```

**Actual Result:** ⏳ _To be tested manually_

---

### **TEST 4: Settings Dialog - Blocking Tab** ⏳

**Steps:**
1. Open Settings dialog
2. Click **Blocking** tab (UserX icon)

**Scenario A: No blocked users**
```
Expected: 
❌ [Icon]
No blocked users
```

**Scenario B: With blocked users**
```
👤 John Doe
   Blocked 5 days ago
   [Unblock]

👤 Jane Smith
   Blocked 2 weeks ago
   [Unblock]
```

1. Each blocked user shows:
   - Avatar
   - Display name
   - "Blocked X time ago"
   - [Unblock] button

2. Click [Unblock] → User removed from list
3. Toast shows: "User unblocked"

**Real-time Test:**
- Block a user from their profile menu (Block option)
- Should appear in blocking list instantly
- Unblock them
- Should disappear immediately

**Expected Result:**
```
✅ Shows all blocked users
✅ Display name, avatar, time shown
✅ Unblock button works
✅ Changes are real-time
✅ Toast notifications appear
```

**Actual Result:** ⏳ _To be tested manually_

---

### **TEST 5: Settings Dialog - Activity Tab** ⏳

**Steps:**
1. Open Settings dialog
2. Click **Activity** tab (Clock icon)
3. Should show list of recent activities:

```
🕐 Post_Created - New photo uploaded
   Jan 30, 2026 • 2:45 PM

🕐 Login_Event - Logged in from Chrome
   Jan 30, 2026 • 2:30 PM

🕐 Profile_Updated - Changed bio
   Jan 29, 2026 • 5:20 PM

🕐 Friend_Request_Accepted - Accepted friend request from John
   Jan 28, 2026 • 10:15 AM
```

**Real-time Test:**
1. Keep Activity tab open
2. Perform an action (like, comment, follow, etc)
3. New activity should appear in log immediately

**Expected Result:**
```
✅ Shows last 50 activities
✅ Activities are in reverse chronological order
✅ Timestamps are accurate
✅ Activity types display correctly
✅ New activities appear in real-time
```

**Actual Result:** ⏳ _To be tested manually_

---

### **TEST 6: Pagination - Posts Tab** ⏳

**Steps:**
1. Go to profile page
2. Click **Posts** tab
3. At bottom of posts, verify:

```
[← Previous]  Page 1  [Next →]
```

**Page 1 (Default):**
- [← Previous] button is **DISABLED** (grey out)
- [Next →] button is **ENABLED** (clickable)
- Shows up to 10 posts

**Click [Next →]:**
- Page changes to "Page 2"
- [← Previous] button is now **ENABLED**
- Shows next 10 posts
- Posts are fresh data from server

**Click [← Previous]:**
- Goes back to Page 1
- Button states change accordingly

**At End (Page 5, only 5 posts):**
- [← Previous] is ENABLED
- [Next →] is **DISABLED** (no more posts)

**Expected Result:**
```
✅ Page 0 shows Previous button disabled
✅ Previous/Next buttons work correctly
✅ Page indicator updates
✅ Posts load correctly per page
✅ No duplicate posts between pages
✅ Data is fresh from server
```

**Actual Result:** ⏳ _To be tested manually_

---

### **TEST 7: Pagination - Photos Tab** ⏳

**Steps:**
1. Go to profile → Photos tab
2. Same pagination pattern but **12 photos per page**

**Expected Result:**
```
✅ Shows 12 photos per page (not 10 like posts)
✅ Pagination buttons work
✅ Previous/Next disable correctly
✅ Page indicator accurate
```

**Actual Result:** ⏳ _To be tested manually_

---

### **TEST 8: Pagination - Friends Tab** ⏳

**Steps:**
1. Go to profile → Friends tab
2. Same pagination pattern but **20 friends per page**

**Expected Result:**
```
✅ Shows 20 friends per page
✅ Friend requests NOT paginated (all shown)
✅ Pagination buttons work
✅ Friends list is real-time
```

**Actual Result:** ⏳ _To be tested manually_

---

### **TEST 9: Notification Delete Feature** ⏳

**Steps:**
1. Click [🔔 Notification] bell icon in header
2. Notification dropdown shows:

```
✅ List of notifications
✅ Each notification has [X] delete button on hover
```

**Test Delete:**
1. Hover over a notification
2. [X] button appears
3. Click [X]
4. Notification disappears immediately
5. Toast shows: "Notification deleted"
6. Refresh page → notification should still be gone

**Expected Result:**
```
✅ Delete button appears on hover
✅ Clicking X deletes immediately (client-side)
✅ Toast notification appears
✅ Change persists after refresh (database deleted)
✅ No console errors
```

**Actual Result:** ⏳ _To be tested manually_

---

### **TEST 10: Profile Menu (Friend Profile)** ⏳

**Steps:**
1. Go to a friend's profile
2. Click [⋯] (three dots) menu button
3. **Exactly 3 options should appear:**

```
✅ 🔗 Copy link to profile
✅ 🚫 Block [Friend Name]
✅ 🚩 Report profile
```

**Verify Missing Options:**
- ❌ NO Follow/Unfollow option
- ❌ NO "Find support or report" option
- ✅ ONLY 3 core options

**Test Copy Link:**
1. Click "Copy link to profile"
2. URL copied to clipboard
3. Should be like: `https://yourapp.com/profile/[userId]`

**Test Block:**
1. Click "Block [Friend Name]"
2. Friend is blocked
3. Toast shows: "User blocked"
4. Open Settings → Blocking tab → friend should be listed

**Test Report:**
1. Click "Report profile"
2. Report form/dialog opens
3. Submit report
4. Toast shows: "Report submitted"

**Expected Result:**
```
✅ Exactly 3 menu items shown
✅ No Follow/Unfollow button
✅ All options are real-time
✅ Block/Report work correctly
✅ Copy link works
```

**Actual Result:** ⏳ _To be tested manually_

---

## 🔄 REAL-TIME FUNCTIONALITY TESTS

### **TEST 11: Real-time Profile Updates** ⏳

**Setup:** Two browsers/tabs with same account

**Steps:**
1. Browser A: Open profile
2. Browser B: Open profile settings
3. Browser B: Change privacy setting (Email from Public → Only Me)
4. Browser A: Should see change immediately OR on refresh
5. Browser B: Refresh page → setting should still be saved

**Expected Result:**
```
✅ Changes sync across browsers
✅ No manual refresh needed
✅ Changes persist in database
✅ Real-time subscription works
```

**Actual Result:** ⏳ _To be tested manually_

---

### **TEST 12: Real-time Block Synchronization** ⏳

**Setup:** Two browsers with different accounts

**Steps:**
1. Browser A (Your account): Open friend's profile
2. Browser B (Friend's account): Friend is checking their blocked list
3. Browser A: Click [⋯] → Block friend
4. Browser B: Blocking list should update in real-time
5. Browser A: Verify friend is now in your blocking list

**Expected Result:**
```
✅ Block is immediate on both sides
✅ Real-time sync works
✅ Blocked user can't see your posts
✅ No latency delays
```

**Actual Result:** ⏳ _To be tested manually_

---

## ✅ FINAL VERIFICATION CHECKLIST

### **Functionality**
- [ ] Settings dialog opens and closes properly
- [ ] All 4 tabs load without errors
- [ ] Privacy controls work and save
- [ ] Session management works
- [ ] Blocking system works
- [ ] Activity log displays correctly
- [ ] Pagination works on all 3 tabs
- [ ] Notification delete works
- [ ] Profile menu shows only 3 options
- [ ] Block/Report/Copy link work

### **Real-time Features**
- [ ] Privacy changes save instantly
- [ ] Block/Unblock is real-time
- [ ] Notifications delete immediately
- [ ] Activity updates in real-time
- [ ] Sessions track in real-time
- [ ] Cross-browser sync works

### **UI/UX**
- [ ] All buttons are properly styled
- [ ] Loading states appear
- [ ] Toast notifications show
- [ ] Responsive on mobile
- [ ] Responsive on desktop
- [ ] No layout shifts
- [ ] Proper error handling

### **Performance**
- [ ] No console errors
- [ ] No TypeScript warnings
- [ ] Fast page loads
- [ ] Smooth animations
- [ ] No memory leaks
- [ ] Hot reload works

### **Data Integrity**
- [ ] Changes persist after refresh
- [ ] Data is accurate
- [ ] No duplicate entries
- [ ] No missing data
- [ ] Timestamps are correct

---

## 🐛 BUG REPORT TEMPLATE

If you find an issue, please document:

```
**Issue Title:** [Brief description]

**Reproduction Steps:**
1. 
2. 
3. 

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots:**
[If applicable]

**Browser/Device:**
[Chrome, Firefox, Safari, etc. + device]

**Console Error:**
[If any error messages appear]

**Severity:**
[ ] Critical | [ ] High | [ ] Medium | [ ] Low
```

---

## 📝 NOTES FOR TESTING

1. **Test both own profile and friend profiles** - Some features differ
2. **Test on mobile and desktop** - Responsive design matters
3. **Check console (F12) for errors** - Important for debugging
4. **Test with multiple browsers** - Real-time features need this
5. **Test permissions carefully** - Privacy settings matter
6. **Try edge cases** - Empty lists, long names, etc.

---

## 🎯 EXPECTED PASS RATE

- **Compilation:** 100% ✅
- **Functionality:** 95%+ (some edge cases may need refinement)
- **Real-time Features:** 90%+ (depends on Supabase setup)
- **UI/UX:** 95%+ (responsive, intuitive)
- **Performance:** 90%+ (optimized queries)

---

## 📞 SUPPORT

If you encounter issues:
1. Check browser console (F12 → Console tab)
2. Check Network tab for API calls
3. Verify Supabase is connected
4. Clear browser cache
5. Restart dev server if needed

---

**Ready for comprehensive testing!** 🚀

All features are implemented and ready to be verified manually.

