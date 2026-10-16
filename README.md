# Campus Marketplace

Expo SDK 57 React Native app for buying and selling items within a campus community.

## Run locally

Expo SDK 57 requires Node 22.13 or newer.

```bash
cp .env.example .env
npm install
npm run web
```

The app runs in demo mode until Firebase values are added to `.env`.

## Firebase setup

1. Create a Firebase project and register a Web app.
2. Enable Google Authentication under Authentication > Sign-in method. Anonymous Authentication remains available for native fallback.
3. Create a Cloud Firestore database.
4. Copy the Web app configuration into `.env` using `.env.example`.
5. Deploy `firestore.rules` with the Firebase CLI or paste them into the Firestore Rules tab.

The app uses:

- `listings`: public reads, authenticated seller-owned creates and edits.
- `users/{uid}` and `users/{uid}/saved/{listingId}`: owner-only access.
- `conversations`: members-only access, with messages in a subcollection.

The client Firebase configuration is intentionally public. Access control belongs in Authentication, Firestore Rules, and App Check; never put Admin SDK credentials in this app.

## Current product flows

- Explore listings with search and category filters.
- Browse and search without signing in; Google sign-in is required to contact sellers or publish listings.
- Save and unsave listings.
- Open a listing detail view and start a seller conversation.
- Publish a basic listing through the Sell flow.
- Sign in anonymously for a frictionless student account.
- View Saved, Messages, and Profile pages.

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

## Group members and collaboration

The application was completed collaboratively by all five members. The group met together, discussed the requirements and implementation decisions, and developed and tested the integrated features using one shared laptop. Because the shared laptop was configured with the `2023CSC090` Git account, several collaborative commits appear in Git history under that account. The Git author shown for those commits identifies the account used to record the work; it does not mean that one member completed all of those features individually.

| Student | Registration number | Individual branch contribution and team responsibility |
| --- | --- | --- |
| Nahananthiny Gnanakrishnabalasingham | 2023CSC080 | Led the `price-filter` work for marketplace discovery, including keyword/category filtering, minimum and maximum prices, sorting, reset behaviour, invalid-range validation, and filter tests. Also participated in group discussion, integrated feature development, review, and testing. |
| Abilasha Arunthavakumar | 2023CSC007 | Led the `mark-as-sold` work for listing editing, update persistence, sold/available status, sold-state presentation, and the sold badge. Also participated in group discussion, integrated feature development, review, and testing. |
| Rukshika Sithmini | 2023CSC071 | Led the `seller-profile` work for opening seller profiles from listings, presenting seller details and campus, browsing active seller listings, and continuing to save, open, or contact from that profile. Also participated in group discussion, integrated feature development, review, and testing. |
| Thayaparan Kavishan | 2023CSC069 | Led the `listing-validation` work for the reusable seller form and validation of title, price, category, condition, campus, description, and optional image URL. Also participated in group discussion, integrated feature development, review, and testing. |
| Tharmapalamuralitharan | 2023CSC090 | Led the `google-auth` work and coordinated the shared laptop, Git branches, merges, conflict resolution, documentation, and final validation on `integration-testing`. The later commits recorded through this account include features designed, implemented, reviewed, and tested collaboratively by the whole group. |

### Features completed through group collaboration

Beyond the individually led feature branches above, all members jointly discussed, implemented, reviewed, and tested the following integrated features during group work sessions:

- **Authentication and accounts:** Google sign-in, email/password sign-in, account creation, password reset, and authenticated marketplace access.
- **Listing creation and lifecycle:** sale and wanted-item posts, complete listing editing and owner deletion, negotiable and urgent options, sold/available status, and found/still-needed status for wanted posts.
- **Profiles and saved activity:** signed-in student profiles, editable profile photos, phone-number validation, seller calling, Sri Lankan/custom campus selection, and saved listings.
- **Buyer-seller communication:** listing-linked real-time conversations, message sending and replies, and message edit/delete actions.
- **Images and persistence:** selection of up to three photos, image URL validation and optimization, Firebase Storage uploads, photo-count display, Realtime Database persistence, and database/storage rules.
- **Navigation and integration quality:** page history and back navigation, expanded live/demo listings, integration fixes, automated validation, final testing, and documentation.

The feature leads in the table identify focused branch responsibilities. They do not imply exclusive ownership: the final application and the integrated features above are the result of the whole group's collaboration.

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
