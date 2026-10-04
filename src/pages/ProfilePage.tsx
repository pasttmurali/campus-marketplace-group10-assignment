import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { User } from "firebase/auth";
import { useState } from "react";
import { PageTitle } from "../components/PageTitle";
export function ProfilePage({
  user,
  photoURL,
  savedCount,
  listingCount,
  firebaseConfigured,
  profileReady,
  error,
  onMyListings,
  onSaved,
  onSignIn,
  onSignOut,
  onChangePhoto,
}: {
  user: User | null;
  photoURL: string | null;
  savedCount: number;
  listingCount: number;
  firebaseConfigured: boolean;
  profileReady: boolean;
  error: string;
  onMyListings: () => void;
  onSaved: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onChangePhoto: (uri: string) => Promise<void>;
}) {
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const name =
    user?.displayName || user?.email?.split("@")[0] || "Campus guest";
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const pickProfilePhoto = async () => {
    setPhotoError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoError("Allow photo library access to choose a profile photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      selectionLimit: 1,
    });
    if (result.canceled) return;

    setPhotoBusy(true);
    try {
      await onChangePhoto(result.assets[0].uri);
    } catch (uploadError) {
      setPhotoError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not update the profile photo.",
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <PageTitle title="Profile" subtitle="Your campus marketplace account" />
      <View style={styles.hero}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.initials}>{user ? initials : "?"}</Text>
          </View>
        )}
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.muted}>
          {user?.email || "Sign in to sell and message"}
        </Text>
        {user ? (
          <Pressable
            style={({ pressed }) => [
              styles.photoButton,
              pressed && styles.photoButtonPressed,
              photoBusy && styles.disabled,
            ]}
            onPress={pickProfilePhoto}
            disabled={photoBusy}
            accessibilityRole="button"
          >
            {photoBusy ? (
              <ActivityIndicator color="#1F5D4C" size="small" />
            ) : (
              <Text style={styles.photoButtonText}>
                {photoURL ? "Edit profile photo" : "Add profile photo"}
              </Text>
            )}
          </Pressable>
        ) : null}
        {photoError ? <Text style={styles.photoError}>{photoError}</Text> : null}
      </View>
      <View style={styles.menu}>
        <Row
          label="My listings"
          value={String(listingCount)}
          onPress={onMyListings}
        />
        <Row label="Saved items" value={String(savedCount)} onPress={onSaved} />
        <Row label="Meetup preferences" value="North Campus" />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {user && profileReady ? (
        <Text style={styles.success}>Profile saved to Firebase</Text>
      ) : null}
      {user ? (
        <Pressable style={styles.outline} onPress={onSignOut}>
          <Text style={styles.outlineText}>Sign out</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.primary} onPress={onSignIn}>
          <Text style={styles.primaryText}>Sign in to continue</Text>
        </Pressable>
      )}
      <Text style={styles.backend}>
        {firebaseConfigured
          ? "Connected to Firebase"
          : "Demo mode · Add Firebase keys to connect"}
      </Text>
    </ScrollView>
  );
}
function Row({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.muted}>{value}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 110 },
  hero: { alignItems: "center", paddingBottom: 28 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#D6E5D7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  initials: { fontSize: 22, color: "#225347", fontWeight: "800" },
  name: { color: "#173C34", fontSize: 24, fontWeight: "800", marginBottom: 6 },
  muted: { color: "#87918C", fontSize: 12 },
  photoButton: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BCD0C3",
    justifyContent: "center",
    marginTop: 14,
    paddingHorizontal: 16,
  },
  photoButtonPressed: { backgroundColor: "#EDF5EF" },
  photoButtonText: { color: "#1F5D4C", fontSize: 12, fontWeight: "800" },
  photoError: { color: "#B64950", fontSize: 12, marginTop: 10 },
  disabled: { opacity: 0.6 },
  menu: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#E9ECE6",
  },
  row: {
    height: 58,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1EC",
  },
  label: { color: "#24483D", fontWeight: "700", fontSize: 14 },
  primary: {
    height: 50,
    backgroundColor: "#1F5D4C",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  primaryText: { color: "#FFF", fontWeight: "800" },
  outline: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BCD0C3",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  outlineText: { color: "#1F5D4C", fontWeight: "800" },
  success: { color: "#23775D", fontSize: 12, fontWeight: "700", marginTop: 16 },
  error: {
    color: "#B64950",
    backgroundColor: "#FBECEE",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 16,
  },
  backend: {
    textAlign: "center",
    color: "#9BA59F",
    fontSize: 11,
    marginTop: 22,
  },
});
