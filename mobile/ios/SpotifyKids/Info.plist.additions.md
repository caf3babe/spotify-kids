# iOS Info.plist Additions

Add these entries to `ios/SpotifyKids/Info.plist` after running `pod install`:

## 1. Deep Link URL Scheme (for Spotify OAuth2 callback)

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>spotify-kids</string>
        </array>
        <key>CFBundleURLName</key>
        <string>com.yourcompany.spotify-kids</string>
    </dict>
</array>
```

## 2. Allow opening Spotify app (LSApplicationQueriesSchemes)

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>spotify</string>
</array>
```

## 3. Sign in with Apple Capability

In Xcode: Target → Signing & Capabilities → + Capability → Sign In with Apple

## 4. App Transport Security (for local dev only)

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
</dict>
```
