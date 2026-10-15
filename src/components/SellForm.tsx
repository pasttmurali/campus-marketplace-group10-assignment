import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { categories } from "../data";
import { ListingImagePicker } from "./ListingImagePicker";
import { CampusField, sriLankanCampuses } from "./CampusField";

export const sellCategories = categories.filter((value) => value !== "All items");
export const sellConditions = ["Like new", "Good condition", "Fair"];
export const sellCampuses = sriLankanCampuses;

export type SellFormValues = {
  title: string;
  price: string;
  category: string;
  condition: string;
  campus: string;
  description: string;
  image: string;
  negotiable: boolean;
  urgent: boolean;
  listingType: "selling" | "wanted";
};

export type SellFormErrors = Partial<Record<keyof SellFormValues, string>>;

const emptyValues: SellFormValues = {
  title: "",
  price: "",
  category: "",
  condition: "",
  campus: "",
  description: "",
  image: "",
  negotiable: false,
  urgent: false,
  listingType: "selling",
};

export function validateSellForm(values: SellFormValues): SellFormErrors {
  const errors: SellFormErrors = {};
  if (values.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters.";
  }
  const price = Number(values.price);
  if (!values.price.trim() || !Number.isFinite(price) || price <= 0) {
    errors.price = "Enter a price greater than 0.";
  }
  if (!values.category) errors.category = "Choose a category.";
  if (!values.condition) errors.condition = "Choose a condition.";
  if (!values.campus) errors.campus = "Choose a campus.";
  if (values.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters.";
  }
  return errors;
}

export function SellForm({
  visible,
  listingType,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  listingType: "selling" | "wanted";
  onClose: () => void;
  onSubmit: (values: SellFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<SellFormValues>(emptyValues);
  const [errors, setErrors] = useState<SellFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setValues({ ...emptyValues, listingType });
    setErrors({});
    setSubmitted(false);
    setBusy(false);
    setSubmitError("");
  }, [listingType, visible]);

  const update = <K extends keyof SellFormValues>(key: K, value: SellFormValues[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    if (submitted) setErrors(validateSellForm(next));
  };

  const publish = async () => {
    const nextErrors = validateSellForm(values);
    setSubmitted(true);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || busy) return;
    setBusy(true);
    setSubmitError("");
    try {
      await onSubmit(values);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not publish listing.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.form}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{listingType === "wanted" ? "Post an item you need" : "Sell an item"}</Text>
            <Pressable onPress={onClose} accessibilityLabel="Close sell form">
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
            <Text style={styles.label}>{listingType === "wanted" ? "What item do you need?" : "What are you selling?"}</Text>
            <TextInput
              value={values.title}
              onChangeText={(value) => update("title", value)}
              placeholder={listingType === "wanted" ? "e.g. Need a used bicycle" : "e.g. Organic Chemistry textbook"}
              placeholderTextColor="#87918C"
              style={[styles.field, errors.title && styles.fieldError]}
            />
            {errors.title ? <Text style={styles.error}>{errors.title}</Text> : null}

            <Text style={styles.label}>{listingType === "wanted" ? "Your budget" : "Price"}</Text>
            <TextInput
              value={values.price}
              onChangeText={(value) => update("price", value.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#87918C"
              style={[styles.field, errors.price && styles.fieldError]}
            />
            {errors.price ? <Text style={styles.error}>{errors.price}</Text> : null}

            <ToggleRow label={listingType === "wanted" ? "Budget is negotiable" : "Price is negotiable"} value={values.negotiable} onChange={(value) => update("negotiable", value)} />

            <ChipGroup
              label="Category"
              options={sellCategories}
              value={values.category}
              error={errors.category}
              onChange={(value) => update("category", value)}
            />
            <ChipGroup
              label="Condition"
              options={sellConditions}
              value={values.condition}
              error={errors.condition}
              onChange={(value) => update("condition", value)}
            />
            <CampusField value={values.campus} error={errors.campus} disabled={busy} onChange={(value) => update("campus", value)} />

            <ToggleRow label={listingType === "wanted" ? "Urgently needed" : "Urgent sale"} value={values.urgent} onChange={(value) => update("urgent", value)} />

            <Text style={styles.label}>Description</Text>
            <TextInput
              value={values.description}
              onChangeText={(value) => update("description", value)}
              placeholder="Condition, pickup spot, what's included..."
              placeholderTextColor="#87918C"
              multiline
              style={[styles.field, styles.area, errors.description && styles.fieldError]}
            />
            {errors.description ? (
              <Text style={styles.error}>{errors.description}</Text>
            ) : null}

            <ListingImagePicker
              value={values.image}
              error={errors.image}
              disabled={busy}
              onChange={(value) => update("image", value)}
            />

            {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

            <Pressable
              disabled={busy}
              style={[styles.primary, busy && styles.disabled]}
              onPress={publish}
            >
              <Text style={styles.primaryText}>
                {busy ? "Publishing..." : "Publish listing"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={styles.toggleRow}><Text style={styles.toggleLabel}>{label}</Text><View style={[styles.toggle, value && styles.toggleActive]}><View style={[styles.toggleKnob, value && styles.toggleKnobActive]} /></View></Pressable>;
}

function ChipGroup({
  label,
  options,
  value,
  error,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((option) => {
          const active = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(active ? "" : option)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,40,33,.45)",
    justifyContent: "flex-end",
  },
  form: {
    maxHeight: "88%",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  scroll: { marginBottom: 12 },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
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
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#DDE4DC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#173C34",
  },
  area: { minHeight: 96, textAlignVertical: "top" },
  fieldError: { borderColor: "#C3535B" },
  error: { color: "#B64950", fontSize: 12, marginTop: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#ECEFE9",
  },
  chipActive: { backgroundColor: "#1F5D4C" },
  chipText: { color: "#64736C", fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#FFF" },
  primary: {
    height: 50,
    backgroundColor: "#1F5D4C",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 28,
  },
  primaryText: { color: "#FFF", fontWeight: "800" },
  disabled: { opacity: 0.45 },
  submitError: { backgroundColor: "#FBECEE", borderRadius: 10, color: "#B64950", fontSize: 12, marginTop: 16, padding: 10 },
  toggleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 16, minHeight: 42 },
  toggleLabel: { color: "#365B4C", fontSize: 13, fontWeight: "800" },
  toggle: { backgroundColor: "#CCD4CF", borderRadius: 13, height: 26, padding: 3, width: 46 },
  toggleActive: { backgroundColor: "#1F5D4C" },
  toggleKnob: { backgroundColor: "#FFF", borderRadius: 10, height: 20, width: 20 },
  toggleKnobActive: { alignSelf: "flex-end" },
});
