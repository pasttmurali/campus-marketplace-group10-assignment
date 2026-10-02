# Campus Marketplace - Group 10

Campus Marketplace is an Expo and React Native application for students to buy and sell items within their campus community. Users can browse listings, filter products, view seller profiles, save items, contact sellers, and manage their own listings.

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

- Explore listings without signing in.
- View saved listings.
- Open messages and contact a seller.
- View the current user's profile and listings.
- Navigate back from a seller profile to the selected listing.

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

## Firebase Configuration

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

Enable Google as a sign-in provider in **Firebase Console > Authentication > Sign-in method**. Do not commit `.env`, service-account keys, or other private credentials.

## Running the Application

### Web

```powershell
npm run web
```

Open the local URL displayed by Expo. To test authentication, open **Profile**, select **Sign in**, and then select **Continue with Google**.

### Android on Windows

1. Enable Developer options and USB debugging on the Android device.
2. Connect the device and accept its USB debugging authorization prompt.
3. Run:

```powershell
npm.cmd run android:windows
```

If no device is detected, run `adb devices` and confirm that its status is `device`. A status of `unauthorized` means the authorization prompt still needs to be accepted on the phone.

The native Google authentication flow requires a development build; it is not intended to run in Expo Go.

## Tests and Type Checking

Run the automated filter tests:

```powershell
npm test
```

Run the TypeScript compiler check:

```powershell
npx tsc --noEmit
```

On Windows PowerShell systems that block npm scripts, use `npm.cmd` and `npx.cmd` instead.

## Firestore Data

- `listings`: marketplace listings. Authenticated sellers can create listings and manage their own listings.
- `users/{uid}`: profile information belonging to a user.
- `users/{uid}/saved/{listingId}`: saved listings accessible by their owner.
- `conversations`: conversations accessible by their participants, with messages stored in a subcollection.

Deploy the included Firestore rules and indexes before using production data:

```powershell
firebase deploy --only firestore:rules,firestore:indexes
```

## Main Demonstration Flow

1. Start the application and browse the Explore page.
2. Search, filter, and sort the listings.
3. Open a listing and select **View seller profile**.
4. Review the seller's other listings and return to the listing.
5. Sign in with Google from the Profile page.
6. Publish a listing, edit it, and mark it as sold.
7. Save a listing and open the Saved page.
8. Open Firebase Authentication to verify the signed-in user.

## GitHub Workflow

Development is completed in feature branches and merged through pull requests. The seller profile integration uses:

- Base branch: `integration-testing`
- Feature branch: `seller-profile`
- Merge/PR branch: `merge/seller-profile-into-integration-testing`

Before creating or approving a pull request, run the tests and TypeScript check and confirm that no merge-conflict markers remain.

## Group Members

Update this table with the final member details before submission.

| Student | Registration Number | Contribution |
| --- | --- | --- |
| Member 1 | Registration number | Contribution |
| Member 2 | Registration number | Contribution |
| Member 3 | Registration number | Contribution |

## License

See [LICENSE](LICENSE) for the project license.
