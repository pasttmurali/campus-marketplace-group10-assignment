# Campus Marketplace — Group 10

Campus Marketplace is a cross-platform marketplace application for students to discover, buy, and sell items within their campus community. It includes authenticated listing management, saved items, seller profiles, and secure real-time buyer–seller messaging.

## Contents

- [Implemented Features](#implemented-features)
- [Technology Stack](#technology-stack)
- [Application Structure](#application-structure)
- [Firebase Architecture](#firebase-architecture)
- [Getting Started](#getting-started)
- [Running the Application](#running-the-application)
- [Testing and Validation](#testing-and-validation)
- [Demonstration Flow](#demonstration-flow)
- [Git Workflow](#git-workflow)
- [Troubleshooting](#troubleshooting)

## Implemented Features

### Authentication and user profiles

- Google Sign-In through Firebase Authentication.
- Persistent browser authentication sessions.
- Web popup authentication with redirect fallback.
- Native Google authentication support for development builds.
- Signed-in user name, email, and profile state.
- Editable profile photo selected from the device gallery.
- Profile photo upload through Firebase Storage.
- Secure sign-out.

### Marketplace discovery

- Explore a collection of campus listings.
- Display both demonstration listings and authenticated live listings without duplicates.
- Search by listing title, description, seller, campus, or category.
- Filter by category and minimum/maximum price.
- Sort by newest, price low-to-high, or price high-to-low.
- Reset active filters.
- Responsive two-column listing grid and detailed listing modal.
- Sold-item badges and disabled seller contact for sold items.

### Saved items

- Save and unsave listings.
- Private saved-item collection for each authenticated user.
- Real-time synchronization with Firestore.
- Dedicated Saved Items page with empty-state guidance.

### Selling and listing management

- Publish a listing with:
  - title;
  - price;
  - category;
  - condition;
  - campus;
  - description;
  - optional image URL.
- Field-level validation before publishing.
- View all listings owned by the signed-in seller.
- Edit every listing field through a pre-filled form.
- Mark an owned listing as sold or available.
- Ownership validation in both application logic and Firestore rules.
- Immediate local UI updates after edits or status changes.

### Seller profiles

- Open a seller profile from any listing.
- Display seller name, campus, verification status, and active-listing count.
- Browse all listings belonging to the selected seller.
- Start a conversation directly from the seller profile.
- Return to the original listing using contextual back navigation.

### Buyer–seller messaging

- Create a private conversation for a specific listing.
- Real-time message delivery using Firestore listeners.
- Buyer/seller-aware participant names and roles.
- Latest-message preview and conversation timestamps.
- Message composer with loading and error feedback.
- Tap or long-press an owned message to show actions.
- Edit an owned message and display an `edited` indicator.
- Delete an owned message for both participants using a `This message was deleted` placeholder.
- Update the conversation preview when the latest message is edited or deleted.
- Prevent users from editing or deleting another participant's messages.
- Campus meetup safety reminder inside each conversation.

### Navigation and user experience

- Bottom navigation for Explore, Saved, Messages, Profile, and Sell.
- Consistent back buttons on secondary pages.
- Page-history navigation that returns to the previous screen.
- Separate back navigation from a message thread to the inbox.
- Close controls for listing, authentication, selling, and editing modals.
- Loading, success, validation, error, and empty states.

### Access requirements

| Action | Sign-in required |
| --- | --- |
| Browse, search, filter, and sort demo listings | No |
| Open listing and seller details | No |
| Load authenticated live marketplace data | Yes |
| Save or unsave a listing | Yes |
| Publish or edit a listing | Yes |
| Mark an owned listing as sold/available | Yes |
| Start a seller conversation | Yes |
| Send, edit, or delete a message | Yes |
| Upload a profile photo | Yes |

## Technology Stack

| Area | Technology | Purpose |
| --- | --- | --- |
| Application framework | Expo SDK 57 | Cross-platform development, bundling, and development tools |
| UI | React 19.2 and React Native 0.86 | Component-based mobile and web interface |
| Web runtime | React DOM and React Native Web | Runs the React Native application in modern browsers |
| Language | TypeScript 6 | Static typing and safer refactoring |
| Authentication | Firebase Authentication | Google Sign-In and authenticated user sessions |
| Database | Cloud Firestore Enterprise (Native mode) | Listings, profiles, saved items, conversations, and real-time messages |
| File storage | Firebase Storage | User profile-photo uploads |
| OAuth support | Expo Auth Session and Expo Web Browser | Google OAuth flows across web and native platforms |
| Media selection | Expo Image Picker | Selects editable profile photos from a device |
| Testing | Node test runner through TSX | Automated listing-filter tests |
| Package management | Node.js and npm | Dependency and script management |
| Version control | Git and GitHub | Feature branches and integration workflow |

## Application Structure

```text
src/
  components/             Reusable cards, forms, headers, states, and controls
  pages/                  Explore, Saved, Messages, Profile, My Listings, Seller Profile
  utils/                  Listing search, filtering, validation, and sorting
  App.tsx                 Application state, navigation, authentication, and orchestration
  data.ts                 Demonstration listings and categories
  firebase.ts             Firebase app, Auth, Firestore, and Storage initialization
  listings.ts             Listing normalization, ownership, updates, and status operations
  messages.ts             Real-time subscriptions and message create/edit/delete operations
  types.ts                Shared listing, conversation, message, and navigation types
tests/
  filterListings.test.mjs Automated filter and sorting tests
scripts/
  run-android.ps1         Windows Android development helper
firestore.rules           Firestore authorization and data validation
firestore.indexes.json    Firestore index configuration
storage.rules             Profile-photo storage authorization
```

## Firebase Architecture

### Project configuration

| Setting | Value |
| --- | --- |
| Firebase project | `campus-marketplace-2026-3f910` |
| Firestore database | `campus-marketplace-db` |
| Firestore edition | Enterprise, Native mode |
| Region | `asia-south1` |
| Real-time updates | Enabled |
| Android package | `com.nsayoo.campusmarketplace` |

The application explicitly connects to the named `campus-marketplace-db` database in `src/firebase.ts`.

### Firestore data model

```text
users/{uid}
  saved/{listingId}

listings/{listingId}

conversations/{conversationId}
  messages/{messageId}
```

- `users/{uid}` stores the signed-in user's private profile.
- `users/{uid}/saved/{listingId}` stores that user's private saved listings.
- `listings/{listingId}` stores authenticated marketplace listings and ownership details.
- `conversations/{conversationId}` stores listing context, participants, and latest-message preview.
- `conversations/{conversationId}/messages/{messageId}` stores participant-only messages, edit timestamps, and deletion timestamps.

Firestore rules enforce authentication, listing ownership, conversation membership, message ownership, allowed fields, value types, text lengths, URLs, and recent server timestamps. Message deletion is a protected soft deletion so conversation history remains understandable.

## Getting Started

### Requirements

- Node.js 22.13 or newer.
- npm.
- A modern browser for the web build.
- Android Studio/SDK and an authorized device or emulator for Android.
- Access to the configured Firebase project for live backend features.

### Installation

```powershell
git clone https://github.com/pasttmurali/campus-marketplace-group10-assignment.git
cd campus-marketplace-group10-assignment
Copy-Item .env.example .env
npm.cmd install
```

Configure `.env` with values from the same Firebase project:

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

Enable Google under **Firebase Console → Authentication → Sign-in method**. Never commit `.env`, service-account files, tokens, or private credentials.

## Running the Application

### Web

```powershell
npm.cmd run web
```

Expo normally serves the application at `http://localhost:8081`.

If the browser displays an older bundle after switching branches:

```powershell
npx.cmd expo start --web --clear
```

Then hard-refresh the browser with `Ctrl+Shift+R`.

### Android on Windows

```powershell
npm.cmd run android:windows
```

Enable USB debugging, connect the device, accept its authorization prompt, and confirm `adb devices` reports `device`. Native Google authentication requires a development build rather than Expo Go.

### Other Expo commands

```powershell
npm.cmd start
npm.cmd run android
npm.cmd run ios
```

## Testing and Validation

Run automated tests:

```powershell
npm.cmd test
```

Run strict TypeScript validation:

```powershell
npx.cmd tsc --noEmit
```

Validate and deploy Firebase rules after a rule change:

```powershell
$env:NODE_OPTIONS="--use-system-ca"
firebase deploy --only firestore:rules --project campus-marketplace-2026-3f910
```

## Demonstration Flow

1. Start the web application and browse the demonstration inventory.
2. Search, select a category, set a price range, and change the sort order.
3. Sign in with Google from the Profile page.
4. Add or update the profile photo.
5. Publish a listing with all required details.
6. Open My Listings, edit every field, and change its sold/available status.
7. Save another listing and confirm it appears on the Saved page.
8. Open another user's listing or seller profile and start a conversation.
9. Send a message, tap it, edit it, and then delete it.
10. Confirm the other participant sees updates in real time.
11. Use page back buttons to return through the navigation history.

## Git Workflow

- Stable development branch: `integration-testing`.
- New work is created in a focused `feature/*` branch.
- Feature commits use descriptive conventional messages such as `feat(messages): ...` or `fix(listings): ...`.
- Run tests and TypeScript validation before merging.
- Merge into `integration-testing` only after conflicts and validation errors are resolved.
- Keep unrelated local changes out of feature commits unless they are intentionally included.

## Troubleshooting

### Message actions do not appear

- Confirm the running checkout includes the latest `integration-testing` commit.
- Restart Expo with `npx.cmd expo start --web --clear`.
- Hard-refresh the browser.
- Tap or long-press a message sent by the current user; another user's message cannot be changed.

### Google Sign-In fails

- Confirm every `.env` value belongs to the same Firebase project.
- Confirm Google Sign-In is enabled in Firebase Authentication.
- Add the local origin to the authorized OAuth origins.
- For Android, verify the package, OAuth client, and SHA-1 configuration.
- Restart Expo after changing environment values.

### Firestore data is unavailable

- Confirm the project ID and named database are correct.
- Confirm the user is signed in for live data.
- Deploy the included Firestore rules after changing them.
- Check the browser console for permission errors.

### Android device is unavailable

- Enable USB debugging and accept the device authorization prompt.
- Run `adb devices` and verify the device state is `device`.
- Use a development build for native authentication.

## Group Members

| Student | Registration Number | Contribution |
| --- | --- | --- |
| Member 1 | Registration number | Contribution |
| Member 2 | Registration number | Contribution |
| Member 3 | Registration number | Contribution |

## License

See [LICENSE](LICENSE) for the project license.
