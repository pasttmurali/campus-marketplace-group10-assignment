import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { isValidImageReference } from "../utils/validateImageUrl";

const MAX_PHOTOS = 3;

export function ListingImagePicker({
  value,
  error,
  disabled = false,
  onChange,
}: {
  value: string[];
  error?: string;
  disabled?: boolean;
  onChange: (photos: string[]) => void;
}) {
  const [pickerError, setPickerError] = useState("");

  const choosePhotos = async () => {
    setPickerError("");
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPickerError("Allow photo library access to choose item photos.");
        return;
      }
      const remaining = MAX_PHOTOS - value.length;
      if (remaining <= 0) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        // Keep the native file URI. Asking the picker for base64 duplicates every
        // selected image in JS memory and can make even a single upload stall.
        base64: false,
        quality: 0.82,
        selectionLimit: remaining,
      });
      if (result.canceled) return;

      const photos = result.assets.map((asset) => asset.uri).filter(Boolean);
      if (!photos.length) throw new Error("Could not read the selected photos.");
      onChange([...value, ...photos].slice(0, MAX_PHOTOS));
    } catch (pickerFailure) {
      setPickerError(pickerFailure instanceof Error ? pickerFailure.message : "Could not open the photo library.");
    }
  };

  return (
    <View>
      <Text style={styles.label}>Item photos (optional, up to 3)</Text>
      <View style={styles.previews}>
        {value.map((photo, index) => isValidImageReference(photo) ? (
          <View key={`${photo.slice(0, 40)}-${index}`} style={styles.previewWrap}>
            <Image resizeMode="contain" source={{ uri: photo }} style={styles.preview} />
            <Pressable accessibilityLabel={`Remove photo ${index + 1}`} disabled={disabled} onPress={() => onChange(value.filter((_, photoIndex) => photoIndex !== index))} style={styles.removeBadge}>
              <Text style={styles.removeBadgeText}>×</Text>
            </Pressable>
          </View>
        ) : null)}
      </View>
      {value.length < MAX_PHOTOS ? (
        <Pressable accessibilityRole="button" disabled={disabled} onPress={choosePhotos} style={[styles.button, disabled && styles.disabled]}>
          <Text style={styles.buttonText}>{value.length ? "Add more photos" : "Choose photos"}</Text>
        </Pressable>
      ) : null}
      <Text style={styles.hint}>{value.length}/{MAX_PHOTOS} selected · Photos are uploaded securely to Firebase Storage.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {pickerError ? <Text style={styles.error}>{pickerError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: "#365B4C", fontSize: 12, fontWeight: "800", marginBottom: 7, marginTop: 18 },
  previews: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  previewWrap: { backgroundColor: "#ECEFE9", borderRadius: 12, height: 110, overflow: "hidden", position: "relative", width: "31%" },
  preview: { height: "100%", width: "100%" },
  removeBadge: { alignItems: "center", backgroundColor: "rgba(20,35,30,.78)", borderRadius: 14, height: 28, justifyContent: "center", position: "absolute", right: 5, top: 5, width: 28 },
  removeBadgeText: { color: "#FFF", fontSize: 20, lineHeight: 22 },
  button: { alignItems: "center", borderColor: "#BCD0C3", borderRadius: 12, borderWidth: 1, justifyContent: "center", marginTop: 10, minHeight: 44, paddingHorizontal: 16 },
  buttonText: { color: "#1F5D4C", fontSize: 13, fontWeight: "800" },
  hint: { color: "#87918C", fontSize: 11, marginTop: 7 },
  error: { color: "#B64950", fontSize: 12, marginTop: 6 },
  disabled: { opacity: 0.45 },
});
