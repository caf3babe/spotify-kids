/**
 * Login screen with Sign in with Apple.
 *
 * Apple Sign In is the only auth method as per requirements.
 * On iOS it uses the native Apple sheet (in Safari/WebKit).
 * On Android it falls back to a web-based flow via the same library.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';
import {
  appleAuth,
  AppleButton,
} from '@invertase/react-native-apple-authentication';
import { signInWithApple } from '../api/client';
import { useAuthStore } from '../store/authStore';

export function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  async function handleAppleSignIn() {
    setLoading(true);
    try {
      // Trigger native Apple Sign In sheet
      const appleAuthRequest = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      const { identityToken, fullName } = appleAuthRequest;
      if (!identityToken) throw new Error('No identity token received from Apple');

      // Verify with our backend and get JWT pair
      const { accessToken, refreshToken, user } = await signInWithApple(
        identityToken,
        fullName
          ? { givenName: fullName.givenName ?? null, familyName: fullName.familyName ?? null }
          : null,
      );

      await setUser(user, accessToken, refreshToken);
      // Navigation is handled automatically by AppNavigator based on auth state
    } catch (error: unknown) {
      const e = error as { code?: string; message?: string };
      // Ignore user cancel
      if (e.code === appleAuth.Error.CANCELED) return;
      console.error('[LoginScreen] Apple sign in failed:', e);
      Alert.alert('Sign In Failed', e.message ?? 'Could not sign in with Apple. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo / branding */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🎵</Text>
          <Text style={styles.appName}>Kids Music</Text>
          <Text style={styles.tagline}>Safe tunes, hand-picked by your parents</Text>
        </View>

        {/* Sign in button */}
        <View style={styles.authContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#1DB954" />
          ) : (
            <AppleButton
              buttonStyle={AppleButton.Style.WHITE}
              buttonType={AppleButton.Type.SIGN_IN}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}
          <Text style={styles.hint}>
            Sign in with your Apple ID.{'\n'}
            Parents and kids each use their own account.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#B3B3B3',
    textAlign: 'center',
    lineHeight: 22,
  },
  authContainer: {
    alignItems: 'center',
    gap: 16,
  },
  appleButton: {
    width: '100%',
    height: 52,
    borderRadius: 12,
  },
  hint: {
    color: '#6B6B6B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
});
