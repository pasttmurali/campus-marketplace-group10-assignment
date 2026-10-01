import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { auth } from "../firebase";

WebBrowser.maybeCompleteAuthSession();

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

const nativeClientConfigured =
  Platform.OS === "android" ? Boolean(androidClientId) : Boolean(iosClientId);

export function GoogleSignInButton({
  onSuccess,
  onError,
}: {
  onSuccess: (user: User) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  // The placeholder keeps the hook valid in demo mode; the button remains disabled.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: webClientId || "google-web-client-not-configured",
    androidClientId: androidClientId || "google-android-client-not-configured",
    iosClientId: iosClientId || "google-ios-client-not-configured",
    selectAccount: true,
  });

  useEffect(() => {
    if (!response || response.type === "cancel" || response.type === "dismiss") {
      setBusy(false);
      return;
    }

    if (response.type !== "success") {
      setBusy(false);
      onError("Google sign-in was not completed. Please try again.");
      return;
    }

    const idToken = response.authentication?.idToken || response.params.id_token;
    const accessToken =
      response.authentication?.accessToken || response.params.access_token;

    if (!auth || (!idToken && !accessToken)) {
      setBusy(false);
      onError("Google did not return a valid sign-in token.");
      return;
    }

    const credential = GoogleAuthProvider.credential(idToken, accessToken);
    signInWithCredential(auth, credential)
      .then(({ user }) => onSuccess(user))
      .catch((error: unknown) =>
        onError(error instanceof Error ? error.message : "Google sign-in failed."),
      )
      .finally(() => setBusy(false));
  }, [onError, onSuccess, response]);

  const signIn = async () => {
    if (!nativeClientConfigured) {
      onError(
        `Add EXPO_PUBLIC_GOOGLE_${Platform.OS.toUpperCase()}_CLIENT_ID to .env first.`,
      );
      return;
    }
    setBusy(true);
    onError("");
    await promptAsync();
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!request || busy}
      style={[styles.button, (!request || busy) && styles.disabled]}
      onPress={signIn}
    >
      <Text style={styles.mark}>G</Text>
      <Text style={styles.label}>
        {busy ? "Signing in..." : "Continue with Google"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7DDD8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: 10,
  },
  disabled: { opacity: 0.55 },
  mark: { color: "#4285F4", fontSize: 18, fontWeight: "800" },
  label: { color: "#1F5D4C", fontWeight: "800" },
});
