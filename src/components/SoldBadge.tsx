import { StyleSheet, Text, View } from "react-native";

export function SoldBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.label}>SOLD</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#C3535B",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  label: { color: "#FFF", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
});