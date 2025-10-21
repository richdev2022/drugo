# Admin Backup OTP API Documentation

## Overview
The Admin Backup OTP API allows administrators to create and manage backup OTP codes for users when automatic email sending fails (e.g., Brevo account deactivation).

## Endpoint

```
POST /api/admin/backup-otp
```

### Authentication
- **Required:** Admin authentication token in Authorization header
- **Role Required:** Admin (or higher privilege)

### Headers
```
Authorization: Bearer <admin-token>
Content-Type: application/json
```

---

## Actions

### 1. Create Backup OTP

**Purpose:** Generate a new 4-digit backup OTP for a user

**Request:**
```json
{
  "email": "user@example.com",
  "action": "create"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Backup OTP created for user@example.com",
  "otp": "4729",
  "expiresAt": "2025-10-21T12:35:45.000Z",
  "note": "Share this OTP with the user via secure channel. Valid for 5 minutes."
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Email is required"
}
```

**Usage Example:**
```bash
curl -X POST http://localhost:3000/api/admin/backup-otp \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "action": "create"
  }'
```

---

### 2. List Pending OTPs

**Purpose:** View all pending (unused) OTP codes for a specific email

**Request:**
```json
{
  "email": "user@example.com",
  "action": "list"
}
```

**Response (Success):**
```json
{
  "success": true,
  "email": "user@example.com",
  "pendingOTPs": [
    {
      "code": "4729",
      "createdAt": "2025-10-21T12:30:45.000Z",
      "expiresAt": "2025-10-21T12:35:45.000Z",
      "isBackupOTP": true,
      "createdByAdmin": "Admin Name"
    },
    {
      "code": "1234",
      "createdAt": "2025-10-21T12:25:00.000Z",
      "expiresAt": "2025-10-21T12:30:00.000Z",
      "isBackupOTP": false,
      "createdByAdmin": null
    }
  ],
  "total": 2
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Email is required"
}
```

**Usage Example:**
```bash
curl -X POST http://localhost:3000/api/admin/backup-otp \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "action": "list"
  }'
```

---

## Workflow: Supporting User with Failed OTP Email

### Step 1: User Initiates Registration
User sends to WhatsApp bot:
```
register John Doe john@example.com MySecurePassword
```

### Step 2: Email Sending Fails
System responds with:
```
⚠️ **Failed to send OTP via email.** The email service is temporarily unavailable.

✅ **Don't worry! You can still complete registration:**

1️⃣ **From Admin**: Contact our support team - they can provide you a backup OTP code
2️⃣ **Enter your code**: Reply with the 4-digit OTP code (from email or provided by admin)
3️⃣ **Or retry**: Try registering again later when email service is restored

Your registration data is secure. The OTP code we generated is stored in our database and is valid for 5 minutes.

Need help? Type 'support' to contact our team.
```

### Step 3: Admin Creates Backup OTP
Admin uses the API:
```bash
curl -X POST http://localhost:3000/api/admin/backup-otp \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "action": "create"
  }'
```

Response:
```json
{
  "success": true,
  "otp": "7341",
  "expiresAt": "2025-10-21T12:35:45.000Z",
  "note": "Share this OTP with the user via secure channel. Valid for 5 minutes."
}
```

### Step 4: Admin Shares OTP with User
Admin securely communicates OTP to user (via WhatsApp support, email, etc.):
```
Your backup OTP code is: 7341
Valid for 5 minutes from the time of request.
```

### Step 5: User Enters OTP in Bot
User sends to WhatsApp bot:
```
7341
```

### Step 6: Account Creation Complete
System verifies OTP and creates account:
```
✅ Registration successful! Welcome to Drugs.ng, John Doe. 
You can now access all our services. Type 'help' to get started!
```

---

## OTP Details

| Property | Value |
|----------|-------|
| **Format** | 4 digits (0000-9999) |
| **Length** | Always 4 characters |
| **Validity Period** | 5 minutes |
| **Can be Reused** | No (one-time use) |
| **Auto-generated** | By system during registration |
| **Manual Creation** | By admin via API when needed |

---

## Best Practices

### For Admins:

1. **Create OTP Only When Needed**
   - Only create backup OTP when user confirms email failed
   - Don't pre-generate OTPs without user request

2. **Secure Delivery**
   - Share OTP via secure channel (not in plain emails)
   - Use WhatsApp support chat for sensitive info
   - Don't share in logs or unencrypted channels

3. **Verify User Identity**
   - Confirm user identity before providing OTP
   - Cross-check email address spelling
   - Ensure user is the actual account owner

4. **Time-Sensitive**
   - Remind user OTP is only valid for 5 minutes
   - Create new OTP if first one expires
   - Check expiry time in response

5. **Tracking & Audit**
   - Admin ID is automatically recorded when creating OTP
   - All OTP attempts are logged for security
   - Review backup OTP usage in admin dashboard

### For Users:

1. **OTP Entry**
   - Enter exactly 4 digits
   - Don't add spaces or special characters
   - Reply immediately as OTP expires in 5 minutes

2. **Security**
   - Never share your OTP with anyone
   - Drugs.ng staff will never ask for your OTP
   - Delete OTP message after using it

3. **If OTP Expires**
   - Contact admin immediately for new OTP
   - Use 'support' command in bot to reach support
   - Don't retry registration without confirming with admin

---

## Error Handling

### Invalid Email Format
```json
{
  "success": false,
  "message": "Email is required"
}
```

### Invalid Action
```json
{
  "success": false,
  "message": "Invalid action. Use \"create\" or \"list\""
}
```

### Database Error
```json
{
  "success": false,
  "message": "Error message from database"
}
```

### Unauthorized Access
```json
{
  "success": false,
  "message": "Unauthorized - Admin authentication required"
}
```

---

## Monitoring & Troubleshooting

### View Pending OTPs
```bash
curl -X POST http://localhost:3000/api/admin/backup-otp \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "action": "list"
  }'
```

### Expected Response Elements

- **`code`**: The actual 4-digit OTP
- **`createdAt`**: When the OTP was generated
- **`expiresAt`**: When the OTP expires (5 min from creation)
- **`isBackupOTP`**: `true` if created by admin, `false` if auto-generated
- **`createdByAdmin`**: Name/ID of admin who created it (null if auto-generated)

### Troubleshooting

**Problem:** User says OTP was invalid
**Solution:** 
1. Check with `list` action if OTP exists
2. Verify it hasn't expired
3. Confirm user entered exactly 4 digits
4. Create new OTP if expired

**Problem:** Same OTP not working twice
**Solution:**
- OTPs are one-time use only
- Once used, they cannot be reused
- If user needs to retry, they need a new OTP

**Problem:** Admin can't find OTP in list
**Solution:**
1. Verify email spelling matches exactly
2. OTP may have already been used (check backend logs)
3. OTP may have expired (check expiresAt timestamp)
4. Create a new OTP

---

## Rate Limiting

- **API Calls:** Subject to standard admin rate limits
- **OTP Creation:** Can create multiple OTPs per user within 5-minute window
- **OTP Entry:** User has unlimited attempts to enter correct OTP (but OTP expires after 5 minutes)

---

## Security Notes

1. **Admin Token Required:** Only authenticated admins can create OTPs
2. **Admin Tracking:** Every backup OTP is tied to the creating admin
3. **Audit Trail:** All OTP operations are logged
4. **One-Time Use:** OTP becomes invalid after first successful use
5. **Time-Limited:** OTP automatically expires after 5 minutes
6. **No OTP Reuse:** Used OTP cannot be entered again for same account

---

## Integration Points

The backup OTP feature integrates seamlessly with:
- WhatsApp registration flow
- Database OTP storage
- Email template system
- Admin authentication system
- Session management
- User account creation

No additional configuration required beyond admin authentication token.
