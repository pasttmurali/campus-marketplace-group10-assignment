import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Listing } from "../types";

type ListingFormModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (title: string, price: string, category: string) => Promise<void>;
  initialListing?: Listing | null;
  heading: string;
  submitLabel: string;
  canEdit?: boolean;
  blockedMessage?: string;
};

export function ListingFormModal({
  visible,
  onClose,
  onSubmit,
  initialListing,
  heading,
  submitLabel,
  canEdit = true,
  blockedMessage,
}: ListingFormModalProps) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Textbooks");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setTitle(initialListing?.title || "");
    setPrice(initialListing ? String(initialListing.price) : "");
    setCategory(initialListing?.category || "Textbooks");
    setError("");
    setSaving(false);
  }, [initialListing, visible]);

  const handleSubmit = async () => {
    if (!title.trim() || !price.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSubmit(title.trim(), price.trim(), category);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save listing.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.form}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{heading}</Text>
            <Pressable onPress={onClose} disabled={saving}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          {!canEdit && blockedMessage ? (
            <Text style={styles.blockedMessage}>{blockedMessage}</Text>
          ) : (
            <>
              <Text style={styles.label}>What are you selling?</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Organic Chemistry textbook"
                style={styles.field}
                editable={!saving}
              />
              <Text style={styles.label}>Price</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder="$ 0"
                style={styles.field}
                editable={!saving}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable
                disabled={!title.trim() || !price.trim() || saving}
                style={[
                  styles.primary,
                  (!title.trim() || !price.trim() || saving) && styles.disabled,
                ]}
                onPress={handleSubmit}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryText}>{submitLabel}</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,40,33,.45)",
    justifyContent: "flex-end",
  },
  form: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formTitle: { color: "#173C34", fontSize: 22, fontWeight: "800" },
  closeText: { color: "#173C34", fontSize: 26 },
  label: {
    color: "#365B4C",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 7,
  },
  field: {
    height: 50,
    borderWidth: 1,
    borderColor: "#DDE4DC",
    borderRadius: 12,
    paddingHorizontal: 14,
    color: "#173C34",
  },
  error: {
    color: "#B64950",
    backgroundColor: "#FBECEE",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 16,
  },
  blockedMessage: {
    color: "#B64950",
    backgroundColor: "#FBECEE",
    borderRadius: 10,
    padding: 12,
    marginTop: 18,
    textAlign: "center",
    fontWeight: "700",
  },
  primary: {
    height: 50,
    backgroundColor: "#1F5D4C",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  primaryText: { color: "#FFF", fontWeight: "800" },
  disabled: { opacity: 0.45 },
});
