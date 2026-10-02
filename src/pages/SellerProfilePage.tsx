import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ListingCard } from "../components/ListingCard";
import { Listing } from "../types";

export function SellerProfilePage({ seller, items, savedIds, onBack, onSave, onOpen, onMessage }: {
  seller: Listing;
  items: Listing[];
  savedIds: string[];
  onBack: () => void;
  onSave: (id: string) => void;
  onOpen: (item: Listing) => void;
  onMessage: () => void;
}) {
  const initials = seller.seller.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>‹ Back to listing</Text>
      </Pressable>
      <View style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
        <Text style={styles.name}>{seller.seller}</Text>
        <Text style={styles.campus}>{seller.campus}</Text>
        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statValue}>{items.length}</Text><Text style={styles.statLabel}>Active listings</Text></View>
          <View style={styles.divider} />
          <View style={styles.stat}><Text style={styles.statValue}>Campus verified</Text><Text style={styles.statLabel}>Seller status</Text></View>
        </View>
        <Pressable accessibilityRole="button" style={styles.messageButton} onPress={onMessage}>
          <Text style={styles.messageText}>Message {seller.seller}</Text>
        </Pressable>
      </View>
      <Text style={styles.heading}>Listings from {seller.seller}</Text>
      <FlatList
        data={items}
        scrollEnabled={false}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <ListingCard item={item} saved={savedIds.includes(item.id)} onSave={() => onSave(item.id)} onOpen={() => onOpen(item)} />
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 110 },
  back: { alignSelf: "flex-start", paddingVertical: 12 },
  backText: { color: "#23775D", fontSize: 13, fontWeight: "800" },
  profileCard: { alignItems: "center", backgroundColor: "#FFF", borderColor: "#E6E9E2", borderRadius: 20, borderWidth: 1, padding: 24 },
  avatar: { alignItems: "center", backgroundColor: "#D6E5D7", borderRadius: 38, height: 76, justifyContent: "center", width: 76 },
  initials: { color: "#225347", fontSize: 22, fontWeight: "800" },
  name: { color: "#173C34", fontSize: 24, fontWeight: "800", marginTop: 14 },
  campus: { color: "#87918C", fontSize: 12, marginTop: 5 },
  stats: { flexDirection: "row", marginTop: 22, width: "100%" },
  stat: { alignItems: "center", flex: 1 },
  statValue: { color: "#24483D", fontSize: 13, fontWeight: "800" },
  statLabel: { color: "#87918C", fontSize: 10, marginTop: 4 },
  divider: { backgroundColor: "#E9ECE6", width: 1 },
  messageButton: { alignItems: "center", backgroundColor: "#1F5D4C", borderRadius: 14, height: 48, justifyContent: "center", marginTop: 22, width: "100%" },
  messageText: { color: "#FFF", fontWeight: "800" },
  heading: { color: "#173C34", fontSize: 20, fontWeight: "800", marginBottom: 16, marginTop: 28 },
  grid: { gap: 14 },
  columns: { gap: 14 },
});
