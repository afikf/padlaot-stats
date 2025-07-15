# Scheduled Game Night Cleanup - Deployment Guide

This guide will help you set up a scheduled Cloud Function that automatically checks for live game nights from yesterday and marks them as "not completed" if they're still live.

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd functions
npm install
```

### 2. Build the Functions
```bash
npm run build
```

### 3. Deploy to Firebase
```bash
npm run deploy
```

## 📋 Detailed Steps

### Step 1: Firebase CLI Setup (if not already done)
```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

### Step 2: Install Function Dependencies
```bash
cd functions
npm install firebase-functions firebase-admin
npm install --save-dev typescript @types/node
```

### Step 3: Build and Deploy
```bash
npm run build
firebase deploy --only functions
```

### Step 4: Verify Deployment
After deployment, you should see output like:
```
✔  functions[checkLiveGameNights(us-central1)] Successful create operation.
✔  functions[manualCheckLiveGameNights(us-central1)] Successful create operation.
```

## 🔧 Configuration

### Timezone
The function is configured to run in **Israel timezone** (`Asia/Jerusalem`) at **00:01** every day.

### Schedule Format
- `1 0 * * *` = Every day at 00:01
- You can modify this in `functions/src/index.ts`

### Status Codes
- `2` = Live game night
- `4` = Not completed (auto-marked)

## 🧪 Testing

### Manual Testing
You can manually trigger the function using the HTTP endpoint:

```bash
curl -X POST https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/manualCheckLiveGameNights \
  -H "Authorization: Bearer YOUR_SECRET_KEY"
```

### Set Secret Key (Optional)
```bash
firebase functions:config:set admin.secret_key="your-secret-key-here"
```

## 📊 Monitoring

### View Logs
```bash
firebase functions:log
```

### Check Function Status
```bash
firebase functions:list
```

## 🔍 How It Works

1. **Daily at 00:01**: The function automatically runs
2. **Query**: Finds all game nights with status `2` (live) from yesterday
3. **Update**: Marks them as status `4` (not completed)
4. **Logging**: Records the action with timestamp and reason

## 🛠️ Customization

### Change Schedule
Edit the cron expression in `functions/src/index.ts`:
```typescript
.schedule('1 0 * * *') // Current: Daily at 00:01
```

### Change Timezone
```typescript
.timeZone('Asia/Jerusalem') // Current: Israel timezone
```

### Add More Logic
You can extend the function to:
- Send notifications
- Update player stats
- Create reports
- Send emails

## 🚨 Troubleshooting

### Common Issues

1. **Function not running**: Check Firebase Console > Functions > Logs
2. **Permission errors**: Ensure Firebase Admin is properly initialized
3. **Timezone issues**: Verify the timezone setting matches your location

### Debug Mode
```bash
firebase functions:log --only checkLiveGameNights
```

## 📝 Notes

- The function uses **batch writes** for atomicity
- **Error handling** is included for robustness
- **Logging** helps with monitoring and debugging
- The function is **idempotent** (safe to run multiple times)

## 🔐 Security

The manual trigger endpoint includes basic authentication. For production, consider:
- Firebase Auth integration
- API key validation
- Rate limiting
- IP whitelisting 