import { Image, StyleSheet, Text, TextInput, View } from "react-native";
import { isValidImageUrl } from "../utils/validateImageUrl";

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

  return (
    <View>
      <Text style={styles.label}>Item photo URL (optional)</Text>
      <TextInput
        accessibilityLabel="Item photo URL"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        keyboardType="url"
        onChangeText={onChange}
        placeholder="https://example.com/item-photo.jpg"
        placeholderTextColor="#87918C"
        style={[styles.field, error && styles.fieldError]}
        value={value}
      />
      {imageUrl && isValidImageUrl(imageUrl) ? (
        <Image
          accessibilityLabel="Item photo preview"
          source={{ uri: imageUrl }}
          style={styles.preview}
        />
      ) : null}
      <Text style={styles.hint}>
        Paste a publicly accessible image URL. The URL is saved with your post; no photo upload is needed.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: "#365B4C", fontSize: 12, fontWeight: "800", marginBottom: 7, marginTop: 18 },
  field: { borderColor: "#DDE4DC", borderRadius: 12, borderWidth: 1, color: "#173C34", minHeight: 50, paddingHorizontal: 14, paddingVertical: 12 },
  fieldError: { borderColor: "#C3535B" },
  preview: { backgroundColor: "#ECEFE9", borderRadius: 12, height: 180, marginTop: 10, width: "100%" },
  hint: { color: "#87918C", fontSize: 11, marginTop: 7 },
  error: { color: "#B64950", fontSize: 12, marginTop: 6 },
});
