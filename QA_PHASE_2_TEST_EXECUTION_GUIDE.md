# QA Phase 2: Manual Test Execution Guide
## EPIC 1 - Authentication & Onboarding (Stories 1.1-1.6)

**Date:** 2025-11-30  
**Tester:** QA Agent  
**Environment:** Development (localhost)  
**Platforms:** Chrome/Firefox  

---

## Prerequisites

1. **Frontend Access:** http://localhost:3003
2. **Email Testing:** http://localhost:8025 (Mailpit)
3. **DevTools:** F12 to monitor API calls
4. **Authenticator App:** For 2FA tests (Google Authenticator, Authy, Microsoft Authenticator, etc.)
5. **Test Data:**
   - Valid emails: test.user.XXX@example.com format
   - Valid password: SecurePass123! (8+ chars, uppercase, number, special)
   - Turkish ID number for KYC (if available, can use test format)

---

## Test Execution Checklist

### Story 1.1: User Registration (5 test cases)

#### TC-1.1.1: Valid Registration ✓ EXECUTE
```
1. Open http://localhost:3003/register
2. Enter Email: test.user.001@example.com
3. Enter Password: SecurePass123!
4. Confirm Password: SecurePass123!
5. Check "Şartlar ve Koşullar" checkbox
6. Check "KVKK" checkbox
7. Click "Kayıt Ol"
8. Observe for success message (yellow banner)
9. WAIT 1-2 minutes, check http://localhost:8025 for email
10. Click verification link in email
11. Browser should redirect to verified/success page
```

**Expected:**
- Success message appears
- Email received within 60 seconds
- Link verification works
- User can then login

**RESULT:** [TO FILL]

---

#### TC-1.1.2: Duplicate Email ✓ EXECUTE
```
1. Register new user: dup.test.001@example.com with SecurePass123!
2. Wait for confirmation
3. Try registering SAME email again
4. Observe error message
```

**Expected:**
- Error: "Bu email zaten kayıtlı" or similar
- Form prevents submission
- No duplicate account created

**RESULT:** [TO FILL]

---

#### TC-1.1.3: Weak Password ✓ EXECUTE
```
1. Go to registration page
2. Enter Email: weakpass.test@example.com
3. Enter Password: weak123 (too weak)
4. Observe password strength indicator
5. Try to submit form
```

**Expected:**
- Password strength shows "Zayıf" (Weak)
- Form submission blocked
- Error message about password requirements

**RESULT:** [TO FILL]

---

#### TC-1.1.4: Missing Terms Checkbox ✓ EXECUTE
```
1. Go to registration
2. Fill Email: terms.test@example.com
3. Fill Password: SecurePass123!
4. Fill Confirm: SecurePass123!
5. Leave "Şartlar ve Koşullar" UNCHECKED
6. Leave "KVKK" CHECKED
7. Try to click "Kayıt Ol"
```

**Expected:**
- Button disabled or form submission prevented
- Error message about terms

**RESULT:** [TO FILL]

---

#### TC-1.1.5: reCAPTCHA Validation ✓ EXECUTE
```
1. Open DevTools (F12)
2. Go to Network tab
3. Go to registration page
4. Fill form with valid data
5. Submit registration
6. Look in Network tab for API call to /api/v1/auth/register
7. Check request headers for "x-recaptcha-token" header
```

**Expected:**
- Request includes x-recaptcha-token header
- reCAPTCHA v3 token sent (invisible to user)
- Registration succeeds

**RESULT:** [TO FILL]

---

### Story 1.2: User Login (3 test cases)

#### TC-1.2.1: Successful Login ✓ EXECUTE
```
1. Register and verify user: login.test@example.com / SecurePass123!
2. Go to http://localhost:3003/login
3. Enter Email: login.test@example.com
4. Enter Password: SecurePass123!
5. Click "Giriş Yap"
6. Observe redirect to dashboard
```

**Expected:**
- Redirect to /dashboard
- User profile visible in header
- Can see wallet/account information

**RESULT:** [TO FILL]

---

#### TC-1.2.2: Invalid Credentials ✓ EXECUTE
```
1. Go to login
2. Enter Email: anyuser@example.com
3. Enter Password: WrongPassword123!
4. Click "Giriş Yap"
5. Observe error message
```

**Expected:**
- Error: "Email veya şifre hatalı"
- Remain on login page
- No redirect

**RESULT:** [TO FILL]

---

#### TC-1.2.3: Account Lockout ✓ EXECUTE
```
1. Register user: lockout.test@example.com / SecurePass123!
2. Go to login
3. Enter email: lockout.test@example.com
4. Enter WRONG password
5. Click "Giriş Yap"
6. Repeat steps 3-5 for 5 total attempts
7. On attempt 5, observe lockout message
8. Check Mailpit for lockout notification email
```

**Expected:**
- After 5 failed: "Hesap 30 dakika boyunca kilitlendi" message
- Lockout email received
- Cannot login for 30 minutes

**RESULT:** [TO FILL]

---

### Story 1.3: Two-Factor Authentication (4 test cases)

#### TC-1.3.1: Enable 2FA ✓ EXECUTE
```
1. Login to account (verified email)
2. Click on profile/account menu
3. Navigate to Settings → Security → Two-Factor Auth
4. Click "2FA Aktif Et" button
5. Observe QR code display
6. Open authenticator app (Google Auth, Authy, etc.)
7. Scan QR code with app
8. Get 6-digit code from authenticator app
9. Enter code in form
10. Click verify
11. Download/save backup codes
```

**Expected:**
- QR code displays
- Can scan with authenticator app
- TOTP code accepted
- Backup codes generated (10 codes)
- Success message: "2FA başarıyla etkinleştirildi"

**RESULT:** [TO FILL]

---

#### TC-1.3.2: Login with 2FA ✓ EXECUTE
```
1. Logout
2. Go to login
3. Enter email and password for 2FA-enabled user
4. After password accepted, see 2FA prompt
5. Open authenticator app
6. Get current 6-digit code
7. Enter code
8. Click "Doğrula"
```

**Expected:**
- 2FA code prompt appears after password
- Correct code allows login
- Redirects to dashboard

**RESULT:** [TO FILL]

---

#### TC-1.3.3: Backup Code Usage ✓ EXECUTE
```
1. Login with email and password
2. See 2FA code prompt
3. Click "Yedek Kodu Kullan" link
4. Enter one of the backup codes from TC-1.3.1
5. Click verify
```

**Expected:**
- Login successful with backup code
- Warning: "9 yedek kod kaldı" (9 codes remaining)
- Cannot use same backup code twice
- After all 10 used: Must regenerate

**RESULT:** [TO FILL]

---

#### TC-1.3.4: Disable 2FA ✓ EXECUTE
```
1. Login with 2FA
2. Go to Settings → Security → 2FA
3. Click "2FA Devre Dışı Bırak"
4. Check email for confirmation link
5. Click confirmation link in email
6. On confirmation page, enter TOTP code from authenticator
7. Click "Devre Dışı Bırak"
```

**Expected:**
- Email sent with confirmation link
- Link expires after use
- Requires TOTP code to complete
- After confirmation: 2FA disabled
- Next login: No 2FA prompt

**RESULT:** [TO FILL]

---

### Story 1.4: Password Reset (2 test cases)

#### TC-1.4.1: Password Reset Flow ✓ EXECUTE
```
1. Go to login page
2. Click "Şifremi Unuttum"
3. Enter email: reset.test@example.com
4. Click "Sıfırlama Linki Gönder"
5. Check Mailpit for reset email (within 60 seconds)
6. Click reset link
7. Enter new password: NewPassword123!
8. Confirm new password: NewPassword123!
9. Click "Şifreyi Güncelle"
10. Wait for confirmation
11. Try to login with old password (should fail)
12. Login with new password (should succeed)
```

**Expected:**
- Reset email sent within 60 seconds
- Reset link works
- Password changed successfully
- Old password no longer works
- New password works
- Confirmation email sent

**RESULT:** [TO FILL]

---

#### TC-1.4.2: Expired Reset Link ✓ EXECUTE
```
1. Request password reset for email
2. Don't click link immediately
3. Wait 1+ hours
4. Try to click reset link
5. Observe error

Note: If immediate testing needed, admin can update token timestamp in DB
```

**Expected:**
- Error: "Sıfırlama linki süresi dolmuş"
- User must request new reset link
- Token rejected

**RESULT:** [TO FILL]

---

### Story 1.5: KYC Submission (2 test cases)

#### TC-1.5.1: Complete KYC Submission ✓ EXECUTE
```
1. Login with verified email user
2. Navigate to Account → KYC
3. Click "KYC Başlat"
4. Fill form:
   - Full Name: Test User
   - TC Kimlik No: 12345678901 (test format)
   - Birth Date: 01/01/1990
   - Phone: +905551234567
5. Upload ID Front (use any <5MB JPG)
6. Upload ID Back (use any <5MB JPG)
7. Upload Selfie (use any <5MB JPG)
8. Check "Beyan Edilen Bilgilerin Doğru Olduğunu Kabul Ediyorum"
9. Click "KYC Gönder"
10. Wait for success message
```

**Expected:**
- Form validates all fields
- Files upload successfully
- Success: "KYC başvurunuz alındı"
- Status shown as "Beklemede" (Pending)
- Confirmation email sent
- Daily limits shown (50K TRY)

**RESULT:** [TO FILL]

---

#### TC-1.5.2: KYC Validation Errors ✓ EXECUTE
```
1. Go to KYC form
2. Enter TC Kimlik No: 11111111111 (invalid checksum)
3. Try to submit
4. Observe error
5. Fix TC Kimlik No, enter invalid phone: 5551234567
6. Try to submit
7. Observe error
8. Fix phone, try to upload file >5MB
9. Observe upload rejection
```

**Expected:**
- TC Kimlik error message in Turkish
- Phone format error message
- File size validation prevents upload
- All errors in Turkish
- Form submission blocked

**RESULT:** [TO FILL]

---

### Story 1.6: KYC Status Check (1 test case)

#### TC-1.6.1: View KYC Status ✓ EXECUTE
```
1. Login to account
2. Go to Dashboard
3. Look for KYC status badge/section
4. If KYC submitted:
   - PENDING: Yellow badge "Beklemede"
   - APPROVED: Green badge "Onaylanmış"
   - REJECTED: Red badge "Reddedildi"
5. Click on status section for details
6. Observe limits shown:
   - Daily Deposit: 50,000 TRY
   - Daily Withdrawal: 50,000 TRY
```

**Expected:**
- Status badge displays correctly
- Color coding matches status
- Current level shown (LEVEL_1)
- Daily limits displayed
- Submission date shown
- Estimated completion time (if PENDING)

**RESULT:** [TO FILL]

---

## Test Execution Summary Form

### Story 1.1 Results
| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-1.1.1  | ⬜ | |
| TC-1.1.2  | ⬜ | |
| TC-1.1.3  | ⬜ | |
| TC-1.1.4  | ⬜ | |
| TC-1.1.5  | ⬜ | |

### Story 1.2 Results
| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-1.2.1  | ⬜ | |
| TC-1.2.2  | ⬜ | |
| TC-1.2.3  | ⬜ | |

### Story 1.3 Results
| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-1.3.1  | ⬜ | |
| TC-1.3.2  | ⬜ | |
| TC-1.3.3  | ⬜ | |
| TC-1.3.4  | ⬜ | |

### Story 1.4 Results
| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-1.4.1  | ⬜ | |
| TC-1.4.2  | ⬜ | |

### Story 1.5 Results
| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-1.5.1  | ⬜ | |
| TC-1.5.2  | ⬜ | |

### Story 1.6 Results
| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-1.6.1  | ⬜ | |

---

## Bug Report Template (For Any Failures)

```
### BUG-XXX: [Title]
**Severity:** Critical / High / Medium / Low
**Test Case:** TC-X.X.X
**Story:** [Story Number]

**Description:**
[What went wrong]

**Reproduction Steps:**
1. [Step 1]
2. [Step 2]
3. [Observe issue]

**Expected:**
[What should happen]

**Actual:**
[What actually happens]

**Browser:** Chrome/Firefox [version]
**Screenshots:** [If applicable]

**Impact:** [User/Business impact]
```

---

## Important Notes

1. **Mailpit Access:** http://localhost:8025 - Keep open to see emails
2. **DevTools:** Press F12, go to Network tab to see API calls
3. **Test Data:** All test emails go to @example.com (won't send to real servers)
4. **Rate Limiting:** If you hit limits, wait per error message
5. **2FA Testing:** Must use real authenticator app
6. **Screenshots:** Capture any errors or unexpected behavior

---

**Guide Created:** 2025-11-30
**Ready for Manual Test Execution**
