import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  isLocalImage,
  isValidImageReference,
} from "../utils/validateImageUrl";

export function ListingImagePicker({
  value,
  error,
  disabled = false,
  onChange,
}: {
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (url: string) => void;
}) {
  const imageUrl = value.trim();
  const localPhotoSelected = isLocalImage(imageUrl);
  const [pickerError, setPickerError] = useState("");

  const choosePhoto = async () => {
    setPickerError("");
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPickerError("Allow photo library access to choose an item photo.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        selectionLimit: 1,
      });
      if (!result.canceled) onChange(result.assets[0].uri);
    } catch (error) {
      setPickerError(error instanceof Error ? error.message : "Could not open the photo library.");
    }
  };

  return (
    <View>
      <Text style={styles.label}>Item photo (optional)</Text>
      <TextInput
        accessibilityLabel="Item photo URL"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        keyboardType="url"
        onChangeText={onChange}
        placeholder="Paste an image URL, or choose a photo below"
        placeholderTextColor="#87918C"
        style={[styles.field, error && styles.fieldError]}
        value={localPhotoSelected ? "" : value}
      />
      {imageUrl && isValidImageReference(imageUrl) ? (
        <Image
          accessibilityLabel="Item photo preview"
          source={{ uri: imageUrl }}
          style={styles.preview}
        />
      ) : null}
      {localPhotoSelected ? (
        <Text style={styles.selectedPhoto}>A photo from your device is selected.</Text>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={choosePhoto}
          style={[styles.button, disabled && styles.disabled]}
        >
          <Text style={styles.buttonText}>
            {imageUrl ? "Choose a different photo" : "Choose photo"}
          </Text>
        </Pressable>
        {imageUrl ? (
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => onChange("")}
            style={styles.removeButton}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.hint}>
        Device photos are uploaded to Firebase Storage; their URL is saved with your post.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {pickerError ? <Text style={styles.error}>{pickerError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: "#365B4C", fontSize: 12, fontWeight: "800", marginBottom: 7, marginTop: 18 },
  field: { borderColor: "#DDE4DC", borderRadius: 12, borderWidth: 1, color: "#173C34", minHeight: 50, paddingHorizontal: 14, paddingVertical: 12 },
  fieldError: { borderColor: "#C3535B" },
  preview: { backgroundColor: "#ECEFE9", borderRadius: 12, height: 180, marginTop: 10, width: "100%" },
  selectedPhoto: { color: "#365B4C", fontSize: 12, marginTop: 8 },
  actions: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 10 },
  button: { alignItems: "center", borderColor: "#BCD0C3", borderRadius: 12, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 16 },
  buttonText: { color: "#1F5D4C", fontSize: 13, fontWeight: "800" },
  removeButton: { justifyContent: "center", minHeight: 44, paddingHorizontal: 10 },
  removeText: { color: "#B64950", fontSize: 13, fontWeight: "700" },
  hint: { color: "#87918C", fontSize: 11, marginTop: 7 },
  error: { color: "#B64950", fontSize: 12, marginTop: 6 },
  disabled: { opacity: 0.45 },
});
