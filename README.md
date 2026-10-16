# Campus Marketplace — Group 13

A cross-platform marketplace for university students to discover, buy, and sell items within their campus community. This team project extends the existing Campus Marketplace application with listing discovery and management, student profiles, authentication, wanted-item posts, and buyer–seller communication.

## Project overview

| | |
| --- | --- |
| **Project** | Campus Marketplace |
| **Course** | Emerging Trends |
| **Final integration branch** | `integration-testing` |
| **Platforms** | Web and Android |
| **Assignment submission deadline** | 19 October 2026 |

## Features

- **Discover listings:** Search listings, filter by category and minimum/maximum price, sort results, and reset filters.
- **Create and manage listings:** Publish a sale or wanted-item post, add up to three photos, edit a listing, and mark it sold or available.
- **Listing options:** Set a price as negotiable and mark a listing as urgent.
- **Student profiles:** View and update a profile, upload a profile photo, open seller profiles, and browse a seller's listings.
- **Google sign-in:** Authenticate with Firebase Authentication and Google.
- **Saved listings:** Save and unsave listings for the signed-in user.
- **Buyer–seller messaging:** Start listing-related conversations and exchange messages in real time.
- **Responsive interface:** Browse listings and manage marketplace actions on web and Android.

## Group members and feature ownership

Each member leads a related feature area and contributes through implementation, tests, review, and integration. Feature leads should coordinate changes that touch shared files, especially `src/App.tsx`, before coding in parallel.

| Student | Registration number | Feature ownership |
| --- | --- | --- |
| Nahananthiny Gnanakrishnabalasingham | 2023CSC080 | Marketplace discovery: search, category filters, minimum/maximum price filters, sorting, filter validation, and related tests. |
| Abilasha Arunthavakumar | 2023CSC007 | Listing lifecycle: mark as sold/available, negotiable and urgent options, listing edit flow, and related form validation. |
| Rukshika Sithmini | 2023CSC071 | Student and seller profiles: profile/listing presentation, profile-photo updates, seller listings, and saved-listing experience. |
| Thayaparan Kavishan | 2023CSC069 | Seller workflow: create sale listings, listing details and presentation, listing-photo selection/upload, and listing-card photo count. |
| Tharmapalamuralitharan | 2023CSC090 | Buyer/authentication flow: wanted-item posts, Google sign-in/login, buyer–seller messaging, and final integration/testing on `integration-testing`. |

Feature ownership identifies the lead, not an exclusive contribution. All members should review and test the integrated application and make meaningful, attributable commits.

## Technology

| Area | Technology |
| --- | --- |
| Application | Expo SDK 57, React 19, React Native 0.86 |
| Language | TypeScript 6 |
| Web support | React DOM and React Native Web |
| Authentication | Firebase Authentication and Google sign-in |
| Data | Firebase Realtime Database |
| Image storage | Firebase Storage |
| Media selection | Expo Image Picker and Expo Image Manipulator |
| Tests | Node.js test runner through `tsx` |
| Source control | Git and GitHub |

## Requirements

- Node.js 22.13 or newer and npm.
- A modern browser to run the web version.
- For Android: Android Studio/SDK, ADB, and an authorized device or emulator.
- A configured Firebase project for sign-in and live marketplace features.

## Setup

From PowerShell:

```powershell
git clone https://github.com/pasttmurali/campus-marketplace-group13-Assignment.git
Set-Location campus-marketplace-group13-Assignment
Copy-Item .env.example .env
npm.cmd install
```

Fill in `.env` with web app and OAuth client values from the same Firebase/Google Cloud project:

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_DATABASE_URL=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```

In Firebase Console, enable **Authentication → Sign-in method → Google** and configure the required authorized domains and OAuth clients. For native Android Google authentication, use a development build and configure the Android package and signing certificate with the Firebase project. Expo Go does not provide the native Google sign-in setup used by this project.

Do not commit `.env`, service-account credentials, private keys, or other secrets. The repository ignores local Firebase service configuration files.

## Run the application

### Web

```powershell
npm.cmd run web
```

Open the local URL printed by Expo (normally `http://localhost:8081`). To clear a stale development bundle:

```powershell
npx.cmd expo start --web --clear
```

### Android on Windows

1. Enable USB debugging on the device and connect it, or start an Android emulator.
2. Confirm ADB can see the device:

   ```powershell
   adb devices
   ```

3. Run the project helper:

   ```powershell
   npm.cmd run android:windows
   ```

The helper uses the local Android/Gradle setup. Native Google sign-in requires a development build with valid Firebase and OAuth configuration.

### Other Expo commands

```powershell
npm.cmd start
npm.cmd run android
npm.cmd run ios
```

## Test and validate

Run the automated tests:

```powershell
npm.cmd test
```

Run the TypeScript check:

```powershell
npx.cmd tsc --noEmit
```

Run both checks before opening or approving a feature merge. If Firebase database rules are changed, review them and deploy to the configured Firebase project using the Firebase CLI:

```powershell
firebase deploy --only database
```

## Firebase data overview

The client reads Firebase configuration from `EXPO_PUBLIC_*` environment variables. The main Realtime Database paths are:

```text
users/{uid}
  saved/{listingId}
userConversations/{uid}/{conversationId}
listings/{listingId}
conversations/{conversationId}
  messages/{messageId}
```

Realtime Database rules are maintained in `database.rules.json`; Storage rules are maintained in `storage.rules`. Review the selected Firebase project and rules before deploying. The app also includes demonstration listings for browsing without a signed-in account; live account-specific actions require Firebase configuration and sign-in.

## Team Git and integration workflow

1. `integration-testing` is the team's final integration branch. **Tharmapalan (2023CSC090)** coordinates final integration and validation on this branch.
2. Each feature lead creates a focused branch from the latest `integration-testing`, for example:

   ```powershell
   git switch integration-testing
   git pull origin integration-testing
   git switch -c feature/2023csc080-price-filters
   ```

3. Commit only the work for that feature with a clear message, for example:

   ```powershell
   git add src tests
   git commit -m "feat(filters): add minimum and maximum price filters"
   git push -u origin feature/2023csc080-price-filters
   ```

4. Open a pull request targeting `integration-testing`. Ask another member to review it; coordinate early if the change touches shared files such as `src/App.tsx`.
5. The integration lead resolves conflicts with the feature author, merges reviewed work into `integration-testing`, and runs `npm.cmd test` and `npx.cmd tsc --noEmit` after integration.
6. Confirm the final commit is pushed to `origin/integration-testing`. Do not force-push or silently overwrite another member's work.

Use a separate branch and commit for each member's contribution so the GitHub history clearly shows individual work and collaboration.

## Video demonstration

The assignment requests a 5–8 minute recorded demonstration covering the group, problem, features, live app, technology/team workflow, and GitHub contributions. The detailed timed script and presenter hand-offs are in the local-only `VIDEO_DEMO_SCRIPT.md` document; it is intentionally excluded from Git and is not part of the repository submission.

## Troubleshooting

### Google sign-in does not work

- Check that Google is enabled as a Firebase Authentication provider.
- Confirm all `.env` values belong to the same Firebase project.
- Add the web origin to the authorized OAuth domains.
- For Android, verify the package name, OAuth client, and signing certificate fingerprints.
- Restart Expo after editing `.env`. Use an Android development build for native sign-in.

### Live listings or messaging are unavailable

- Sign in for account-specific data and actions.
- Verify the Firebase project ID and Realtime Database URL.
- Check that the database and Storage rules are deployed to the intended project.
- Inspect the application console for permission or configuration errors.

### Android device is not detected

- Accept the USB-debugging authorization prompt.
- Run `adb devices` and check that the device state is `device`.
- Start an emulator if no physical device is connected.

### A change is missing after switching branches

Restart Expo with `npx.cmd expo start --web --clear` and hard-refresh the browser with `Ctrl+Shift+R`.

## License

See [LICENSE](LICENSE) for the project license.
