import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SoldBadge } from "./SoldBadge";
import { Listing } from "../types";

export function ListingCard({
  item,
  saved,
  onSave,
  onOpen,
}: {
  item: Listing;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
}) {
  const photoCount = item.images?.length || (item.image ? 1 : 0);

  return (
    <Pressable style={styles.card} onPress={onOpen}>
      <View style={styles.photo}>
        {item.image ? <Image resizeMode="contain" source={{ uri: item.image }} style={[styles.image, item.status === "sold" && styles.soldImage]} /> : <View style={styles.noImage}><Text style={styles.noImageIcon}>◎</Text><Text style={styles.noImageText}>No photo</Text></View>}
        {item.status === "sold" ? <SoldBadge /> : null}
        <Text style={[styles.typeBadge, item.listingType === "wanted" && styles.wantedBadge]}>{item.listingType === "wanted" ? "WANTED" : "FOR SALE"}</Text>
        {photoCount > 1 ? <Text accessibilityLabel={`Photo 1 of ${photoCount}`} style={styles.photoCount}>1/{photoCount}</Text> : null}
        {item.urgent && item.status !== "sold" ? <Text style={styles.urgent}>URGENT</Text> : null}
        <Pressable
          accessibilityLabel={saved ? "Remove saved item" : "Save item"}
          style={styles.save}
          onPress={onSave}
        >
          <Text style={[styles.heart, saved && styles.red]}>
            {saved ? "♥" : "♡"}
          </Text>
        </Pressable>
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.priceBlock}><Text style={styles.price}>Rs. {item.price.toLocaleString()}</Text>{item.negotiable ? <Text style={styles.negotiable}>Negotiable</Text> : null}</View>
        </View>
        <Text style={styles.muted}>
          {item.condition} · {item.campus}
        </Text>
        <Text style={styles.tiny}>Listed by {item.seller}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E9ECE6",
  },
  photo: { height: 148, backgroundColor: "#E5ECE5" },
  image: { width: "100%", height: "100%" },
  noImage: { alignItems: "center", flex: 1, justifyContent: "center" },
  noImageIcon: { color: "#9AABA2", fontSize: 28 },
  noImageText: { color: "#87918C", fontSize: 11, fontWeight: "700", marginTop: 4 },
  soldImage: { opacity: 0.62 },
  save: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  heart: { color: "#365B4C", fontSize: 21 },
  red: { color: "#C3535B" },
  urgent: { backgroundColor: "#C3535B", borderRadius: 6, color: "#FFF", fontSize: 9, fontWeight: "900", left: 9, overflow: "hidden", paddingHorizontal: 7, paddingVertical: 4, position: "absolute", top: 10 },
  typeBadge: { backgroundColor: "#1F5D4C", borderRadius: 6, bottom: 9, color: "#FFF", fontSize: 9, fontWeight: "900", left: 9, overflow: "hidden", paddingHorizontal: 7, paddingVertical: 4, position: "absolute" },
  wantedBadge: { backgroundColor: "#3567A8" },
  photoCount: { backgroundColor: "rgba(0,0,0,.65)", borderRadius: 6, bottom: 9, color: "#FFF", fontSize: 10, fontWeight: "800", overflow: "hidden", paddingHorizontal: 7, paddingVertical: 4, position: "absolute", right: 9 },
  body: { padding: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 5 },
  title: {
    flex: 1,
    minHeight: 34,
    color: "#1B3A33",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
  },
  price: { color: "#1C7057", fontSize: 14, fontWeight: "800" },
  priceBlock: { alignItems: "flex-end" },
  negotiable: { color: "#87918C", fontSize: 9, fontWeight: "700" },
  muted: { color: "#87918C", fontSize: 12 },
  tiny: { color: "#A0AAA4", fontSize: 10, marginTop: 5 },
});
