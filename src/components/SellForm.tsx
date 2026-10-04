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

export const sellCategories = categories.filter((value) => value !== "All items");
export const sellConditions = ["Like new", "Good condition", "Fair"];
export const sellCampuses = [
  "North Campus",
  "South Campus",
  "Central Campus",
  "West Village",
  "East Quad",
];

export type SellFormValues = {
  title: string;
  price: string;
  category: string;
  condition: string;
  campus: string;
  description: string;
  image: string;
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
  const image = values.image.trim();
  if (image) {
    try {
      const url = new URL(image);
      if (url.protocol !== "https:") {
        errors.image = "Image URL must start with https://.";
      }
    } catch {
      errors.image = "Image URL must be a valid https link.";
    }
  }
  return errors;
}

export function SellForm({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: SellFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<SellFormValues>(emptyValues);
  const [errors, setErrors] = useState<SellFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setValues(emptyValues);
    setErrors({});
    setSubmitted(false);
    setBusy(false);
  }, [visible]);

  const update = (key: keyof SellFormValues, value: string) => {
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
    try {
      await onSubmit(values);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.form}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Sell an item</Text>
            <Pressable onPress={onClose} accessibilityLabel="Close sell form">
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
            <Text style={styles.label}>What are you selling?</Text>
            <TextInput
              value={values.title}
              onChangeText={(value) => update("title", value)}
              placeholder="e.g. Organic Chemistry textbook"
              placeholderTextColor="#87918C"
              style={[styles.field, errors.title && styles.fieldError]}
            />
            {errors.title ? <Text style={styles.error}>{errors.title}</Text> : null}

            <Text style={styles.label}>Price</Text>
            <TextInput
              value={values.price}
              onChangeText={(value) => update("price", value.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#87918C"
              style={[styles.field, errors.price && styles.fieldError]}
            />
            {errors.price ? <Text style={styles.error}>{errors.price}</Text> : null}

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
            <ChipGroup
              label="Campus"
              options={sellCampuses}
              value={values.campus}
              error={errors.campus}
              onChange={(value) => update("campus", value)}
            />

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

            <Text style={styles.label}>Image URL (optional)</Text>
            <TextInput
              value={values.image}
              onChangeText={(value) => update("image", value)}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="https://..."
              placeholderTextColor="#87918C"
              style={[styles.field, errors.image && styles.fieldError]}
            />
            {errors.image ? <Text style={styles.error}>{errors.image}</Text> : null}

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
});
