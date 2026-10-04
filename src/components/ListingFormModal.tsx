import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SellFormErrors, SellFormValues, sellCampuses, sellCategories, sellConditions, validateSellForm } from "./SellForm";
import { Listing } from "../types";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: SellFormValues) => Promise<void>;
  initialListing?: Listing | null;
  heading: string;
  submitLabel: string;
  canEdit?: boolean;
  blockedMessage?: string;
};

function listingValues(listing?: Listing | null): SellFormValues {
  return {
    title: listing?.title || "",
    price: listing ? String(listing.price) : "",
    category: listing?.category || "",
    condition: listing?.condition || "",
    campus: listing?.campus || "",
    description: listing?.description || "",
    image: listing?.image || "",
  };
}

export function ListingFormModal({ visible, onClose, onSubmit, initialListing, heading, submitLabel, canEdit = true, blockedMessage }: Props) {
  const [values, setValues] = useState<SellFormValues>(() => listingValues(initialListing));
  const [errors, setErrors] = useState<SellFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setValues(listingValues(initialListing));
    setErrors({});
    setSubmitted(false);
    setSaving(false);
    setSubmitError("");
  }, [initialListing, visible]);

  const update = (key: keyof SellFormValues, value: string) => {
    const next = { ...values, [key]: value };
    setValues(next);
    if (submitted) setErrors(validateSellForm(next));
  };

  const save = async () => {
    const nextErrors = validateSellForm(values);
    setSubmitted(true);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || saving) return;
    setSaving(true);
    setSubmitError("");
    try { await onSubmit(values); }
    catch (error) { setSubmitError(error instanceof Error ? error.message : "Could not save listing."); }
    finally { setSaving(false); }
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}><View style={styles.form}>
      <View style={styles.header}><Text style={styles.title}>{heading}</Text><Pressable accessibilityLabel="Close edit form" disabled={saving} onPress={onClose}><Text style={styles.close}>×</Text></Pressable></View>
      {!canEdit && blockedMessage ? <Text style={styles.blocked}>{blockedMessage}</Text> : <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
        <Field label="What are you selling?" value={values.title} error={errors.title} placeholder="e.g. Organic Chemistry textbook" onChange={(value) => update("title", value)} />
        <Field label="Price" value={values.price} error={errors.price} placeholder="0" keyboardType="decimal-pad" onChange={(value) => update("price", value.replace(/[^0-9.]/g, ""))} />
        <ChipGroup label="Category" options={sellCategories} value={values.category} error={errors.category} onChange={(value) => update("category", value)} />
        <ChipGroup label="Condition" options={sellConditions} value={values.condition} error={errors.condition} onChange={(value) => update("condition", value)} />
        <ChipGroup label="Campus" options={sellCampuses} value={values.campus} error={errors.campus} onChange={(value) => update("campus", value)} />
        <Field label="Description" value={values.description} error={errors.description} placeholder="Condition, pickup spot, what's included..." multiline onChange={(value) => update("description", value)} />
        <Field label="Image URL" value={values.image} error={errors.image} placeholder="https://..." onChange={(value) => update("image", value)} />
        {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
        <Pressable disabled={saving} onPress={save} style={[styles.primary, saving && styles.disabled]}>{saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>{submitLabel}</Text>}</Pressable>
      </ScrollView>}
    </View></View>
  </Modal>;
}

function Field({ label, value, error, placeholder, multiline, keyboardType, onChange }: { label: string; value: string; error?: string; placeholder: string; multiline?: boolean; keyboardType?: "decimal-pad"; onChange: (value: string) => void }) {
  return <View><Text style={styles.label}>{label}</Text><TextInput autoCapitalize={label === "Image URL" ? "none" : undefined} autoCorrect={label !== "Image URL"} keyboardType={keyboardType} multiline={multiline} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#87918C" style={[styles.field, multiline && styles.area, error && styles.fieldError]} value={value} />{error ? <Text style={styles.error}>{error}</Text> : null}</View>;
}

function ChipGroup({ label, options, value, error, onChange }: { label: string; options: string[]; value: string; error?: string; onChange: (value: string) => void }) {
  return <View><Text style={styles.label}>{label}</Text><View style={styles.chips}>{options.map((option) => <Pressable key={option} onPress={() => onChange(option)} style={[styles.chip, value === option && styles.chipActive]}><Text style={[styles.chipText, value === option && styles.chipTextActive]}>{option}</Text></Pressable>)}</View>{error ? <Text style={styles.error}>{error}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(15,40,33,.45)", flex: 1, justifyContent: "flex-end" }, form: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "88%", paddingHorizontal: 24, paddingTop: 24 }, header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, title: { color: "#173C34", fontSize: 22, fontWeight: "800" }, close: { color: "#173C34", fontSize: 28 }, scroll: { marginBottom: 12 },
  label: { color: "#365B4C", fontSize: 12, fontWeight: "800", marginBottom: 7, marginTop: 18 }, field: { borderColor: "#DDE4DC", borderRadius: 12, borderWidth: 1, color: "#173C34", minHeight: 50, paddingHorizontal: 14, paddingVertical: 12 }, area: { minHeight: 96, textAlignVertical: "top" }, fieldError: { borderColor: "#C3535B" }, error: { color: "#B64950", fontSize: 12, marginTop: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { backgroundColor: "#ECEFE9", borderRadius: 20, height: 36, justifyContent: "center", paddingHorizontal: 14 }, chipActive: { backgroundColor: "#1F5D4C" }, chipText: { color: "#64736C", fontSize: 12, fontWeight: "700" }, chipTextActive: { color: "#FFF" },
  submitError: { backgroundColor: "#FBECEE", borderRadius: 10, color: "#B64950", fontSize: 12, marginTop: 16, padding: 10 }, blocked: { backgroundColor: "#FBECEE", borderRadius: 10, color: "#B64950", fontWeight: "700", marginBottom: 24, marginTop: 18, padding: 12, textAlign: "center" }, primary: { alignItems: "center", backgroundColor: "#1F5D4C", borderRadius: 14, height: 50, justifyContent: "center", marginBottom: 28, marginTop: 24 }, primaryText: { color: "#FFF", fontWeight: "800" }, disabled: { opacity: .45 },
});
