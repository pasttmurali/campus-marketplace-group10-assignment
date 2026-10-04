import { Pressable, StyleSheet, Text, View } from "react-native";
export function PageTitle({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.container}>
      {onBack ? (
        <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
      ) : null}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { alignItems: "center", flexDirection: "row", paddingTop: 30, paddingBottom: 26 },
  backButton: { alignItems: "center", backgroundColor: "#FFF", borderColor: "#E1E8E3", borderRadius: 20, borderWidth: 1, height: 40, justifyContent: "center", marginRight: 12, width: 40 },
  backIcon: { color: "#1F5D4C", fontSize: 32, lineHeight: 34, marginTop: -2 },
  copy: { flex: 1 },
  title: { color: "#173C34", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#87918C", fontSize: 12, marginTop: 5 },
});
