# Kids Music – Parental-Control Spotify Proxy

A React Native (iOS + Android) app and Node.js backend that lets parents curate a safe, hand-picked music library for their children using Spotify.

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                     Mobile App                          │
│  ┌─────────────────┐        ┌─────────────────────────┐ │
│  │   Kid view       │        │      Parent view        │ │
│  │  - Browse        │        │  - Search full Spotify  │ │
│  │    approved      │        │  - Approve / remove     │ │
│  │    songs only    │        │    tracks               │ │
│  │  - Play via      │        │  - Connect Spotify      │ │
│  │    Spotify app   │        │    account              │ │
│  └────────┬─────────┘        └───────────┬─────────────┘ │
└───────────┼──────────────────────────────┼───────────────┘
            │ HTTPS                         │ HTTPS
            ▼                               ▼
┌───────────────────────────────────────────────────────────┐
│                    Backend (Node.js)                      │
│                                                           │
│  POST /auth/apple   ← verify Apple OIDC token             │
│  GET  /spotify/search ← proxy; filter by allowlist        │
│  GET  /spotify/browse ← return full allowlist             │
│  POST /spotify/play   ← validate + return Spotify URI     │
│  POST /allowlist      ← add track (parents only)          │
│  DELETE /allowlist/:id ← remove track (parents only)      │
│                                                           │
│  SQLite DB: users · allowlist · spotify_tokens            │
└──────────────────────────┬────────────────────────────────┘
                           │
                           ▼
                   Spotify Web API
```

**Authentication**: Sign in with Apple (OIDC). The two parent accounts are identified by their Apple user IDs, stored in an environment variable. All other accounts are child accounts.

**Playback**: The backend validates that a track is on the allowlist, then returns its `spotify:track:ID` URI. The mobile app opens this URI in the installed Spotify app, which handles all audio streaming.

---

## Prerequisites

| Tool | Min version |
|------|-------------|
| Node.js | 20 LTS |
| npm | 10 |
| React Native CLI | latest |
| Xcode | 15 (iOS build) |
| Android Studio | Hedgehog (Android build) |
| Ruby + CocoaPods | for iOS |

---

## 1. Backend Setup

### 1.1 Apple Sign In credentials

1. Log in to [Apple Developer](https://developer.apple.com).
2. Create a **Services ID** (e.g. `com.yourcompany.spotify-kids`). This is your `APPLE_CLIENT_ID`.
3. Enable **Sign In with Apple** and configure your domain/redirect.
4. Create a **Sign In with Apple** key (type "Sign In with Apple"). Download the `.p8` file.
   - Note the **Key ID** (`APPLE_KEY_ID`) and your **Team ID** (`APPLE_TEAM_ID`).

### 1.2 Spotify App credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Create an app. Note the **Client ID** and **Client Secret**.
3. Add `spotify-kids://spotify-callback` as a Redirect URI.

### 1.3 Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env with all required values
```

Key variables:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Run `openssl rand -hex 64` |
| `APPLE_CLIENT_ID` | Your Services ID |
| `APPLE_TEAM_ID` | Apple Team ID |
| `APPLE_KEY_ID` | Key ID from the .p8 file |
| `APPLE_PRIVATE_KEY` | Contents of .p8 (newlines as `\n`) |
| `PARENT_APPLE_IDS` | Comma-separated Apple `sub` values for parents |
| `SPOTIFY_CLIENT_ID` | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify app client secret |
| `SPOTIFY_REDIRECT_URI` | `spotify-kids://spotify-callback` |

> **Finding parent Apple IDs**: Leave `PARENT_APPLE_IDS` empty for first run.
> Sign in as each parent account. The backend logs `sub=<apple-user-id>` for each sign-in.
> Copy both IDs into `PARENT_APPLE_IDS`, comma-separated, then restart the backend.

### 1.4 Install and run

```bash
cd backend
npm install
npm run dev       # development (with hot reload)
npm run build && npm start  # production
```

The server starts on `http://localhost:3000`.

---

## 2. Mobile App Setup

### 2.1 Configure API base URL

Edit `mobile/src/api/client.ts` and set `BASE_URL`:

```typescript
// For Android emulator testing:
const BASE_URL = 'http://10.0.2.2:3000';

// For iOS simulator or physical devices, use your machine's LAN IP:
const BASE_URL = 'http://192.168.1.100:3000';

// Production:
const BASE_URL = 'https://api.yourdomain.com';
```

### 2.2 iOS setup

```bash
cd mobile
npm install
cd ios && pod install && cd ..
```

**Info.plist changes** (see `ios/SpotifyKids/Info.plist.additions.md`):
- Add `CFBundleURLTypes` with scheme `spotify-kids`
- Add `LSApplicationQueriesSchemes` with `spotify`
- Add **Sign In with Apple** capability in Xcode

**Apple Sign In capability**: Open `ios/SpotifyKids.xcworkspace` in Xcode → Target → *Signing & Capabilities* → **+ Capability** → *Sign In with Apple*.

```bash
npm run ios
```

### 2.3 Android setup

Android does not support native Sign In with Apple — the library `@invertase/react-native-apple-authentication` provides a web-based fallback that opens a Safari-style web view.

```bash
npm run android
```

The `AndroidManifest.xml` already includes the deep-link intent filter for `spotify-kids://spotify-callback`.

---

## 3. First-Run Checklist

- [ ] Backend `.env` filled in
- [ ] Backend running (`npm run dev`)
- [ ] App installed on device/simulator
- [ ] Both parent accounts sign in → copy their Apple IDs from backend logs → set `PARENT_APPLE_IDS` → restart backend
- [ ] Sign in as a parent → go to **Spotify** tab → tap **Connect Spotify** → complete OAuth2 flow
- [ ] Go to **Add** tab → search for a song → tap **Approve**
- [ ] Sign in as a child account → they can now see and play that song

---

## 4. API Reference

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/apple` | none | Exchange Apple identity token for JWT pair |
| POST | `/auth/refresh` | none | Rotate refresh token |
| POST | `/auth/logout` | JWT | Invalidate refresh token |
| GET | `/auth/me` | JWT | Get current user |

### Allowlist

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/allowlist` | JWT | List all approved tracks |
| POST | `/allowlist` | JWT (parent) | Approve a track |
| DELETE | `/allowlist/:trackId` | JWT (parent) | Remove a track |

### Spotify Proxy

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/spotify/connect` | JWT (parent) | Get Spotify OAuth2 URL |
| POST | `/spotify/callback` | JWT (parent) | Exchange code for tokens |
| GET | `/spotify/search?q=...` | JWT | Search (kids see allowlist-filtered results) |
| GET | `/spotify/browse` | JWT | Browse full allowlist |
| POST | `/spotify/play` | JWT | Validate track + get Spotify URI |
| GET | `/spotify/devices` | JWT (parent) | List Spotify Connect devices |
| GET | `/spotify/track/:id` | JWT (parent) | Get track info from Spotify |

---

## 5. Security Notes

- Access tokens are short-lived (15 min by default); refresh tokens rotate on each use.
- Parent-only routes enforce `role === 'parent'` server-side — the client role is never trusted.
- The allowlist is enforced on every `/spotify/play` request regardless of user role.
- Apple identity tokens are verified against Apple's JWKS endpoint with signature + issuer + audience validation.
- Rate limiting (100 req / 15 min) is applied globally.

---

## 6. Project Structure

```
spotify-kids/
├── backend/
│   ├── src/
│   │   ├── auth/           apple.ts · jwt.ts
│   │   ├── db/             index.ts (SQLite schema + queries)
│   │   ├── middleware/     authenticate.ts · requireParent.ts
│   │   ├── routes/         auth.ts · allowlist.ts · spotify.ts
│   │   ├── spotify/        client.ts (Spotify Web API wrapper)
│   │   ├── config.ts
│   │   └── index.ts        (Express server)
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
└── mobile/
    ├── src/
    │   ├── api/            client.ts (typed API client)
    │   ├── components/     TrackItem.tsx · MiniPlayer.tsx
    │   ├── navigation/     AppNavigator.tsx
    │   ├── screens/
    │   │   ├── LoginScreen.tsx
    │   │   ├── KidHomeScreen.tsx
    │   │   ├── KidSearchScreen.tsx
    │   │   ├── ParentDashboardScreen.tsx
    │   │   ├── ParentAllowlistScreen.tsx
    │   │   ├── ParentSearchScreen.tsx
    │   │   └── SpotifyConnectScreen.tsx
    │   └── store/          authStore.ts · playerStore.ts
    ├── android/app/src/main/AndroidManifest.xml
    ├── ios/SpotifyKids/Info.plist.additions.md
    ├── App.tsx
    ├── package.json
    └── tsconfig.json
```
