# Firebase Setup Guide

This guide walks you through setting up Firebase for authentication and cloud storage.

## Prerequisites

- Google account
- GitHub account (for GitHub OAuth)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project**
3. Enter project name (e.g., "personal-budget")
4. Disable Google Analytics (optional, not needed for this app)
5. Click **Create project**

## Step 2: Enable Authentication

1. In your Firebase project, click **Authentication** in left sidebar
2. Click **Get started**
3. Go to **Sign-in method** tab

### Enable Google Sign-In

1. Click **Google** in the providers list
2. Toggle **Enable**
3. Set support email (your email)
4. Click **Save**

### Enable GitHub Sign-In

1. First, create a GitHub OAuth App:
   - Go to GitHub → Settings → Developer settings → OAuth Apps
   - Click **New OAuth App**
   - Application name: "Personal Budget App"
   - Homepage URL: `https://YOUR_PROJECT_ID.web.app` (or your deployment URL)
   - Authorization callback URL: `https://YOUR_PROJECT_ID.firebaseapp.com/__/auth/handler`
   - Click **Register application**
   - Copy the **Client ID** and **Client Secret**

2. Back in Firebase Console:
   - Click **GitHub** in the providers list
   - Toggle **Enable**
   - Paste **Client ID** and **Client Secret** from GitHub
   - Copy the **authorization callback URL** (should match what you entered in GitHub)
   - Click **Save**

## Step 3: Enable Firestore Database

1. Click **Firestore Database** in left sidebar
2. Click **Create database**
3. Select **Start in production mode** (we'll add security rules next)
4. Choose a location (pick closest to your users)
5. Click **Enable**

## Step 4: Set Firestore Security Rules

1. In Firestore Database, go to **Rules** tab
2. Replace the rules with this code:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **Publish**

> **What this does**: Ensures authenticated users can only read/write their own data under `users/{their-uid}/`

## Step 5: Get Your Configuration

1. Click the **gear icon** (⚙️) next to "Project Overview"
2. Click **Project settings**
3. Scroll down to **Your apps**
4. Click the **Web app** icon (`</>`)
5. Register app:
   - App nickname: "Budget App"
   - Don't check "Firebase Hosting"
   - Click **Register app**
6. Copy the `firebaseConfig` object

It looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 6: Update Your App

1. Open `firebase-config.js` in your project
2. Replace the placeholder `firebaseConfig` with your actual configuration
3. Save the file

## Step 7: Test Authentication

1. Run your app locally:
   ```bash
   python server.py
   ```
   
2. Open http://localhost:8000 in your browser

3. Click the **Login** button

4. Try signing in with Google or GitHub

5. Check Firebase Console → Authentication → Users to see your logged-in user

## Step 8: Verify Data Storage

1. While logged in, create a budget event

2. Check Firebase Console → Firestore Database

3. You should see:
   ```
   users/
     └── {your-user-id}/
           ├── events/
           │     └── {event-id}
           └── settings/
                 └── config
   ```

## Troubleshooting

### "Firebase SDK not loaded"

Make sure `index.html` includes Firebase scripts before your app scripts:

```html
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-firestore-compat.js"></script>
```

### "Firebase not configured"

Your `firebase-config.js` still has placeholder values. Follow Step 6 above.

### "Permission denied" in Firestore

Your security rules might not be set correctly. Review Step 4.

### GitHub OAuth not working

- Verify callback URL in GitHub OAuth app matches Firebase
- Check that Client ID and Secret are correct
- Make sure GitHub provider is enabled in Firebase Console

## Cost Information

Firebase has a generous free tier (Spark plan):

- **Authentication**: 50K monthly active users (free)
- **Firestore**: 50K reads, 20K writes, 1GB storage per day (free)

For a personal budget app, you'll likely stay well within the free tier. Monitor usage in Firebase Console → Usage and billing.

## Next Steps

- ✅ Firebase is now set up!
- Deploy your app to Firebase Hosting or another static host
- Share the app URL with others
- Consider adding data export/backup features

## Support

If you run into issues:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Support](https://firebase.google.com/support)
- Check browser console for error messages
