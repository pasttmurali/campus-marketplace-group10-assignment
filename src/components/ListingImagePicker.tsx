import * as ImagePicker from "expo-image-picker";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export function ListingImagePicker({
  value,
  error,
  disabled = false,
  onChange,
}: {
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (uri: string) => void;
}) {
  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.55,
      selectionLimit: 1,
    });
    if (!result.canceled) onChange(result.assets[0].uri);
  };

  return (
    <View>
      <Text style={styles.label}>Item photo (optional)</Text>
      {value ? <Image source={{ uri: value }} style={styles.preview} /> : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={choosePhoto}
          style={[styles.button, disabled && styles.disabled]}
        >
          <Text style={styles.buttonText}>{value ? "Change photo" : "Choose photo"}</Text>
        </Pressable>
        {value ? (
          <Pressable disabled={disabled} onPress={() => onChange("")} style={styles.removeButton}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.hint}>Maximum 8 MB. The post can still publish if photo upload fails.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: "#365B4C", fontSize: 12, fontWeight: "800", marginBottom: 7, marginTop: 18 },
  preview: { backgroundColor: "#ECEFE9", borderRadius: 12, height: 180, width: "100%" },
  actions: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 10 },
  button: { alignItems: "center", borderColor: "#BCD0C3", borderRadius: 12, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 16 },
  buttonText: { color: "#1F5D4C", fontSize: 13, fontWeight: "800" },
  removeButton: { justifyContent: "center", minHeight: 44, paddingHorizontal: 10 },
  removeText: { color: "#B64950", fontSize: 13, fontWeight: "700" },
  hint: { color: "#87918C", fontSize: 11, marginTop: 7 },
  error: { color: "#B64950", fontSize: 12, marginTop: 6 },
  disabled: { opacity: 0.45 },
});
