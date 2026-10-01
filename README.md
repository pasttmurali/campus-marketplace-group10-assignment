# Campus Marketplace - Group 10

Campus Marketplace is an Expo/React Native application that helps students buy and sell items within their campus community. This project extends the existing application with an improved authentication and profile experience using Firebase Authentication and Google Sign-In.

## Assignment Objective

Our objective is to understand and improve the existing application, implement meaningful features, test the completed work, collaborate through GitHub, and demonstrate the final application in a recorded video.

## Group Members

| Student | Registration Number | Contribution |
| --- | --- | --- |
| Add member name | Add registration number | Add contribution |
| Add member name | Add registration number | Add contribution |
| Add member name | Add registration number | Add contribution |

> Replace the placeholder rows with the actual group-member details before submission.

## Implemented Features

### Firebase Google Authentication

- Sign in using a Google account.
- Authenticate users through Firebase Authentication.
- Keep the signed-in user available in the application session.
- Display the authenticated user's name and email on the Profile page.
- Allow the user to sign out securely.
- Confirm authenticated users through Firebase Console > Authentication > Users.

This improves the application's **authentication/profile experience**, one of the suggested assignment features.

### Marketplace Experience

- Explore listings using search and category filters.
- View listing details.
- Save and unsave listings.
- Publish a listing through the Sell flow.
- Contact a seller through conversations.
- Browse the Saved, Messages, and Profile pages.

## Technologies Used

- React Native
- Expo SDK 57
- TypeScript
- Firebase Authentication
- Cloud Firestore
- Google OAuth
- Git and GitHub

## Firebase Configuration

Google Sign-In is enabled in Firebase Authentication. The registered Android package is:

```text
com.nsayoo.campusmarketplace
```

Copy the environment template:

```powershell
Copy-Item .env.example .env
```

Then add the Firebase configuration and OAuth client IDs to `.env`:

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```

Do not commit private credentials or service-account files. Firebase client configuration is visible to the client by design; protect data with Firebase Authentication, Firestore Security Rules, and App Check where appropriate.

## Run the Project

### Requirements

- Node.js 22.13 or newer
- npm
- A modern web browser
- Android SDK and a connected Android phone for a native Android build

Install dependencies:

```powershell
cd F:\Mobile_Development\campus-marketplace-group10-assignment
npm install
```

### Run the Web Version

The web version is the quickest way to demonstrate Google Sign-In and does not require an Android phone:

```powershell
npm run web
```

Open the displayed localhost address, navigate to **Profile**, and select **Continue with Google**.

### Run the Android Version on Windows

1. Enable Developer options and USB debugging on an Android phone.
2. Connect the phone by USB.
3. Accept the RSA/USB debugging authorization prompt on the phone.
4. Run:

```powershell
npm.cmd run android:windows
```

If the command reports `No Android phone is connected`, verify the connection:

```powershell
G:\Android\Sdk\platform-tools\adb.exe devices
```

The device status must be `device`. If it is `unauthorized`, unlock the phone and accept the USB debugging prompt. Expo Go is not suitable for the configured native OAuth flow; use a development build.

## Google Sign-In Demo Steps

1. Start the web application using `npm run web`.
2. Open the Profile page.
3. Select **Sign in** and then **Continue with Google**.
4. Choose a Google account.
5. Verify that the user's name and email appear on the Profile page.
6. Open Firebase Console > Authentication > Users and show the authenticated account.
7. Return to the application and demonstrate **Sign out**.

## Firestore Data and Security

- `listings`: public reads; authenticated sellers can create and manage their own listings.
- `users/{uid}`: user-owned profile data.
- `users/{uid}/saved/{listingId}`: saved listings accessible only by the owner.
- `conversations`: accessible only to conversation members, with messages stored in a subcollection.

Deploy or publish the provided Firestore rules before using production data.

## GitHub Collaboration

Use feature branches and meaningful commit messages. Examples:

```text
feature/google-auth
feature/search-filter
feature/saved-listings

feat(auth): add Firebase Google sign-in
feat(profile): display authenticated user details
fix(auth): handle cancelled Google login
docs(readme): document setup and demo steps
```

Each member must make a meaningful contribution and push commits using their own GitHub account.

## Video Demonstration

The 5–8 minute video should include:

1. Group and project introduction.
2. Explanation of the implemented features.
3. Live Google Sign-In, profile display, and sign-out demonstration.
4. Demonstration of the other completed marketplace improvements.
5. Short technical overview of Expo, React Native, Firebase, and Google OAuth.
6. GitHub repository, branches, commits, and individual contributions.

## Current Authentication Status

- Firebase project configured.
- Google provider enabled.
- Web Google Sign-In tested successfully.
- Authenticated user visible in Firebase Authentication.
- Android application, package name, SHA-1 fingerprint, and OAuth client configured.
- Native Android testing requires a connected authorized phone or Android emulator.
