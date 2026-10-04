import { ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "../components/EmptyState";
import { PageTitle } from "../components/PageTitle";
import { Conversation } from "../types";
export function MessagesPage({
  conversations,
  onBrowse,
}: {
  conversations: Conversation[];
  onBrowse: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <PageTitle title="Messages" subtitle="Keep campus meetups simple" />
      {conversations.length ? (
        conversations.map((conversation) => (
          <View key={conversation.id} style={styles.card}>
            <Text style={styles.name}>{conversation.sellerName}</Text>
            <Text style={styles.title}>{conversation.listingTitle}</Text>
            <Text style={styles.hint}>Conversation saved to Firebase</Text>
          </View>
        ))
      ) : (
        <EmptyState
          title="Your inbox is quiet"
          message="When you message a seller, conversations will show up here."
          action="Browse listings"
          onAction={onBrowse}
        />
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 110 },
  card: { backgroundColor: "#FFF", borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: "#E9ECE6" },
  name: { color: "#173C34", fontSize: 16, fontWeight: "800" },
  title: { color: "#52635C", fontSize: 13, marginTop: 5 },
  hint: { color: "#87918C", fontSize: 11, marginTop: 10 },
});
