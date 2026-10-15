import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export const sriLankanCampuses = [
  "University of Colombo",
  "University of Peradeniya",
  "University of Sri Jayewardenepura",
  "University of Kelaniya",
  "University of Moratuwa",
  "University of Jaffna",
  "University of Ruhuna",
  "SLIIT",
  "IIT",
];

export function CampusField({
  value,
  error,
  disabled = false,
  onChange,
}: {
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [custom, setCustom] = useState(Boolean(value && !sriLankanCampuses.includes(value)));

  useEffect(() => {
    setCustom(Boolean(value && !sriLankanCampuses.includes(value)));
  }, [value]);

  return (
    <View>
      <Text style={styles.label}>Campus</Text>
      <View style={styles.chips}>
        {sriLankanCampuses.map((campus) => (
          <Pressable
            disabled={disabled}
            key={campus}
            onPress={() => {
              setCustom(false);
              onChange(campus);
            }}
            style={[styles.chip, !custom && value === campus && styles.chipActive]}
          >
            <Text style={[styles.chipText, !custom && value === campus && styles.chipTextActive]}>
              {campus}
            </Text>
          </Pressable>
        ))}
        <Pressable
          disabled={disabled}
          onPress={() => {
            setCustom(true);
            if (sriLankanCampuses.includes(value)) onChange("");
          }}
          style={[styles.chip, custom && styles.chipActive]}
        >
          <Text style={[styles.chipText, custom && styles.chipTextActive]}>Other</Text>
        </Pressable>
      </View>
      {custom ? (
        <TextInput
          autoCapitalize="words"
          editable={!disabled}
          onChangeText={onChange}
          placeholder="Type your campus or institute"
          placeholderTextColor="#87918C"
          style={[styles.field, error && styles.fieldError]}
          value={value}
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: "#365B4C", fontSize: 12, fontWeight: "800", marginBottom: 7, marginTop: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "#ECEFE9", borderRadius: 20, justifyContent: "center", minHeight: 36, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: "#1F5D4C" },
  chipText: { color: "#64736C", fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#FFF" },
  field: { borderColor: "#DDE4DC", borderRadius: 12, borderWidth: 1, color: "#173C34", marginTop: 10, minHeight: 50, paddingHorizontal: 14, paddingVertical: 12 },
  fieldError: { borderColor: "#C3535B" },
  error: { color: "#B64950", fontSize: 12, marginTop: 6 },
});
