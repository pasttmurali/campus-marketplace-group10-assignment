# Campus Marketplace - Group 10

Campus Marketplace is an Expo and React Native application for students to buy and sell items within their campus community. Users can browse listings, filter products, view seller profiles, save items, contact sellers, and manage their own listings.

## Quick Start

```powershell
git clone https://github.com/pasttmurali/campus-marketplace-group10-assignment.git
cd campus-marketplace-group10-assignment
Copy-Item .env.example .env
npm install
npm run web
```

The checked-out development workspace already contains a configured local `.env`. For a fresh clone, copy `.env.example`, then add values from the same Firebase project described below.

## Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Setup](#project-setup)
- [Firebase Configuration](#firebase-configuration)
- [Running the Application](#running-the-application)
- [Tests and Type Checking](#tests-and-type-checking)
- [Firestore Data](#firestore-data)
- [Main Demonstration Flow](#main-demonstration-flow)
- [GitHub Workflow](#github-workflow)
- [Troubleshooting](#troubleshooting)

## Features

### Authentication and profiles

- Sign in with Google through Firebase Authentication.
- Keep the user signed in between application sessions.
- Display the signed-in user's name and email.
- Sign out securely.
- Open a seller profile from a listing.
- View all listings published by the selected seller.

### Listings

- Browse and search campus listings.
- Filter by category and price range.
- Sort by newest, lowest price, or highest price.
- View listing details and seller information.
- Save and unsave listings.
- Publish a new listing.
- Edit listings owned by the signed-in user.
- Mark owned listings as sold or available.
- Prevent users from contacting a seller about a sold item.

### Marketplace navigation

- Explore built-in demo listings without signing in.
- View saved listings.
- Open messages and contact a seller.
- View the current user's profile and listings.
- Navigate back from a seller profile to the selected listing.

### Access requirements

| Action | Sign-in required |
| --- | --- |
| Browse demo listings, search, filter, and sort | No |
| Load live Firestore listings | Yes |
| Open listing and seller profile | No |
| Save or unsave a listing | Yes |
| Contact a seller | Yes |
| Publish a listing | Yes |
| Edit or change the status of an owned listing | Yes |

## Technology Stack

- React Native 0.86
- Expo SDK 57
- TypeScript
- Firebase Authentication
- Cloud Firestore
- Google OAuth
- Node.js and npm

## Project Setup

### Requirements

- Node.js 22.13 or newer
- npm
- A modern web browser for the web application
- Android SDK and an authorized Android device or emulator for Android builds

Clone the repository, open the project directory, and install its dependencies:

```powershell
git clone https://github.com/pasttmurali/campus-marketplace-group10-assignment.git
cd campus-marketplace-group10-assignment
npm install
```

### Project structure

```text
src/
  components/    Reusable forms, buttons, badges, and listing UI
  pages/         Explore, profile, seller profile, saved, and messages pages
  utils/         Listing filtering and sorting logic
  firebase.ts    Firebase initialization
  listings.ts    Listing normalization and Firestore update helpers
  types.ts       Shared TypeScript types
tests/           Automated tests
scripts/         Windows and Android helper scripts
```

## Firebase Configuration

This application uses the same Firebase project for Google Authentication and all application data:

| Setting | Value |
| --- | --- |
| Firebase project ID | `campus-marketplace-2026-3f910` |
| Firestore database ID | `campus-marketplace-db` |
| Firestore edition | Enterprise, Native mode |
| Firestore region | `asia-south1` |
| Realtime updates | Enabled |

The application explicitly connects to the named `campus-marketplace-db` database in `src/firebase.ts`. Do not replace it with the default database unless the Firebase configuration and deployment files are changed together.

Create the local environment file from the included template:

```powershell
Copy-Item .env.example .env
```

Add the Firebase configuration and OAuth client IDs to `.env`:

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

The registered Android package name is:

```text
com.nsayoo.campusmarketplace
```

Enable Google as a sign-in provider in **Firebase Console > Authentication > Sign-in method**. All Firebase values and OAuth client IDs must belong to `campus-marketplace-2026-3f910`. Do not commit `.env`, service-account keys, or other private credentials.

## Running the Application

From this workspace, first open the project directory and install dependencies:

```powershell
cd F:\Mobile_Development\campus-marketplace-group10-assignment
npm.cmd install
```

### Web

```powershell
npm.cmd run web
```

Open the local URL displayed by Expo, normally `http://localhost:8081`. To test authentication, open **Profile**, select **Sign in**, and then select **Continue with Google**. Stop Expo with `Ctrl+C`.

### Android on Windows

1. Enable Developer options and USB debugging on the Android device.
2. Connect the device and accept its USB debugging authorization prompt.
3. Run:

```powershell
npm.cmd run android:windows
```

If no device is detected, run `adb devices` and confirm that its status is `device`. A status of `unauthorized` means the authorization prompt still needs to be accepted on the phone.

The native Google authentication flow requires a development build; it is not intended to run in Expo Go.

### Standard Expo commands

```powershell
npm.cmd start
npm.cmd run web
npm.cmd run android:windows
```

After modifying `.env`, stop and restart Expo. If cached configuration causes a problem, run:

```powershell
npx.cmd expo start --clear
```

## Tests and Type Checking

Run the automated filter tests:

```powershell
npm.cmd test
```

Run the TypeScript compiler check:

```powershell
npx.cmd tsc --noEmit
```

On Windows PowerShell systems that block npm scripts, use `npm.cmd` and `npx.cmd` instead.

A successful verification should complete without TypeScript errors or failed test cases:

```powershell
npm.cmd test
npx.cmd tsc --noEmit
```

## Firestore Data

- `listings/{listingId}`: live marketplace listings. Signed-in sellers can create listings and manage only their own listings.
- `users/{uid}`: the signed-in user's private profile information.
- `users/{uid}/saved/{listingId}`: saved items belonging only to that user. Saving and unsaving syncs across sessions.
- `conversations/{conversationId}`: seller-contact conversations visible only to their participants.
- `conversations/{conversationId}/messages/{messageId}`: protected message storage supported by the rules. The current UI creates and lists conversations; message composition can be added later.

When no user is signed in, the app displays local demonstration listings. After Google Sign-In, profiles, live listings, saved items, listing status changes, and conversations use Firestore realtime listeners.

### Verify saved data

1. Sign in through the application's **Profile** page.
2. Publish or save a listing, or select **Message seller**.
3. Open [Firebase Console](https://console.firebase.google.com/).
4. Select `campus-marketplace-2026-3f910`.
5. Open **Firestore Database**, select `campus-marketplace-db`, and inspect the relevant collection.

### Deploy Firestore configuration

The current rules and indexes have already been deployed. After changing either file, deploy them again from the project root:

```powershell
$env:NODE_OPTIONS="--use-system-ca"
npx.cmd -y firebase-tools@latest deploy --only firestore --project campus-marketplace-2026-3f910
```

The rules use owner checks, strict field validation, private saved items, and participant-only conversations. Treat them as a production-oriented prototype and review them again before broadly releasing the application.

## Main Demonstration Flow

1. Run `npm.cmd run web` and browse the local demo listings.
2. Search, filter, and sort the Explore page.
3. Sign in with Google from the Profile page.
4. Publish a listing, edit it, and mark it as sold.
5. Save a listing, refresh the app, and confirm that it remains on the Saved page.
6. Open another seller's listing and select **Message seller** to create a conversation.
7. Open Firebase Authentication to verify the signed-in user.
8. Open the named Firestore database to verify the `users`, `listings`, and `conversations` documents.

## GitHub Workflow

Development is completed in feature branches and merged through pull requests. The seller profile integration uses:

- Base branch: `integration-testing`
- Feature branch: `seller-profile`
- Merge/PR branch: `merge/seller-profile-into-integration-testing`

Before creating or approving a pull request, run the tests and TypeScript check and confirm that no merge-conflict markers remain.

## Troubleshooting

### PowerShell blocks npm or npx

Use `npm.cmd` and `npx.cmd`:

```powershell
npm.cmd install
npm.cmd run web
npx.cmd tsc --noEmit
```

### Google Sign-In does not open or complete

- Confirm that all `.env` values belong to the same Firebase project.
- Confirm that Google is enabled under Firebase Authentication providers.
- Add the local web origin to the authorized OAuth origins.
- For Android, verify the package name, OAuth client ID, and SHA-1 fingerprint.
- Restart Expo after changing `.env`.

### Android device is not detected

- Enable USB debugging.
- Accept the authorization prompt on the device.
- Run `adb devices` and confirm that the status is `device`.
- Use a development build for native Google authentication instead of Expo Go.

### Firestore data is unavailable

- Confirm that `.env` uses the project ID `campus-marketplace-2026-3f910`.
- Confirm that `src/firebase.ts` uses the database ID `campus-marketplace-db`.
- Sign in before expecting live listings or saved items; guests see demo data.
- Confirm that Firestore exists in the `asia-south1` region.
- Deploy the included rules and indexes after modifying them.
- Restart Expo after changing Firebase environment values.

## Group Members

Update this table with the final member details before submission.

| Student | Registration Number | Contribution |
| --- | --- | --- |
| Member 1 | Registration number | Contribution |
| Member 2 | Registration number | Contribution |
| Member 3 | Registration number | Contribution |

## License

See [LICENSE](LICENSE) for the project license.
