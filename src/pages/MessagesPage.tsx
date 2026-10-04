import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { EmptyState } from "../components/EmptyState";
import { PageTitle } from "../components/PageTitle";
import { deleteConversationMessage, editConversationMessage, sendConversationMessage, subscribeToMessages } from "../messages";
import { Conversation, Message } from "../types";

function timeLabel(value?: { toDate: () => Date } | null) {
  if (!value) return "Now";
  const date = value.toDate();
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function otherParticipant(conversation: Conversation, userId: string) {
  const isSeller = conversation.sellerId === userId;
  return {
    name: isSeller ? conversation.buyerName || "Interested buyer" : conversation.sellerName,
    role: isSeller ? "Buyer" : "Seller",
  };
}

export function MessagesPage({ conversations, userId, onBrowse, onBack }: {
  conversations: Conversation[];
  userId: string | null;
  onBrowse: () => void;
  onBack: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const sortedConversations = useMemo(() => [...conversations].sort(
    (a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0),
  ), [conversations]);
  const selected = conversations.find((item) => item.id === selectedId) || null;

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    setLoading(true);
    setError("");
    return subscribeToMessages(selectedId, (nextMessages) => {
      setMessages(nextMessages);
      setLoading(false);
    }, (message) => {
      setError(message);
      setLoading(false);
    });
  }, [selectedId]);

  const send = async () => {
    if (!selected || !userId || !draft.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      if (editingMessageId) await editConversationMessage(selected.id, editingMessageId, draft);
      else await sendConversationMessage(selected.id, userId, draft);
      setDraft("");
      setEditingMessageId(null);
      setActiveMessageId(null);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send your message.");
    } finally { setSending(false); }
  };

  const startEditing = (message: Message) => {
    setDraft(message.text);
    setEditingMessageId(message.id);
    setActiveMessageId(null);
  };

  const removeMessage = async (messageId: string) => {
    if (!selected) return;
    const confirmed = Platform.OS === "web"
      ? window.confirm("Delete this message for everyone?")
      : await new Promise<boolean>((resolve) => Alert.alert("Delete message", "Delete this message for everyone?", [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Delete", style: "destructive", onPress: () => resolve(true) },
        ]));
    if (!confirmed) return;
    setError("");
    try {
      await deleteConversationMessage(selected.id, messageId);
      if (editingMessageId === messageId) { setDraft(""); setEditingMessageId(null); }
      setActiveMessageId(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete the message.");
    }
  };

  if (!userId) {
    return <ScrollView contentContainerStyle={styles.content}>
      <PageTitle title="Messages" subtitle="Plan safe, simple campus meetups" onBack={onBack} />
      <EmptyState title="Sign in to start chatting" message="Your conversations stay private between you and the other student." action="Browse listings" onAction={onBrowse} />
    </ScrollView>;
  }

  if (selected) {
    const participant = otherParticipant(selected, userId);
    return <View style={styles.threadPage}>
      <View style={styles.threadHeader}>
        <Pressable accessibilityRole="button" onPress={() => setSelectedId(null)} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable>
        <View style={styles.avatar}><Text style={styles.avatarText}>{participant.name.charAt(0).toUpperCase()}</Text></View>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.headerName}>{participant.name}</Text>
          <Text numberOfLines={1} style={styles.headerMeta}>{participant.role} · {selected.listingTitle}</Text>
        </View>
      </View>
      <View style={styles.safetyBanner}><Text style={styles.safetyIcon}>✓</Text><Text style={styles.safetyText}>Keep payment in person and meet in a public campus location.</Text></View>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.messageList} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {loading ? <ActivityIndicator color="#1F5D4C" style={styles.loader} /> : null}
        {!loading && !messages.length ? <View style={styles.firstMessage}>
          <Text style={styles.firstMessageIcon}>👋</Text><Text style={styles.firstMessageTitle}>Start the conversation</Text>
          <Text style={styles.firstMessageCopy}>Ask about availability, condition, or a convenient meetup time.</Text>
        </View> : null}
        {messages.map((message) => {
          const mine = message.senderId === userId;
          return <View key={message.id} style={[styles.messageRow, mine && styles.myMessageRow]}>
            <Pressable disabled={!mine || Boolean(message.deletedAt)} onPress={() => setActiveMessageId(activeMessageId === message.id ? null : message.id)} onLongPress={() => setActiveMessageId(message.id)} style={[styles.bubble, mine ? styles.myBubble : styles.theirBubble]}>
              <Text style={[styles.messageText, mine && styles.myMessageText, message.deletedAt && styles.deletedText]}>{message.deletedAt ? "This message was deleted" : message.text}</Text>
              <Text style={[styles.messageTime, mine && styles.myMessageTime]}>{message.editedAt && !message.deletedAt ? "edited · " : ""}{timeLabel(message.createdAt)}</Text>
            </Pressable>
            {mine && activeMessageId === message.id && !message.deletedAt ? <View style={styles.messageActions}>
              <Pressable onPress={() => startEditing(message)} style={styles.actionButton}><Text style={styles.editAction}>Edit</Text></Pressable>
              <Pressable onPress={() => removeMessage(message.id)} style={styles.actionButton}><Text style={styles.deleteAction}>Delete</Text></Pressable>
            </View> : null}
          </View>;
        })}
      </ScrollView>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {editingMessageId ? <View style={styles.editingBar}><View style={styles.editingCopy}><Text style={styles.editingTitle}>Editing message</Text><Text numberOfLines={1} style={styles.editingPreview}>{draft}</Text></View><Pressable onPress={() => { setEditingMessageId(null); setDraft(""); }}><Text style={styles.cancelEdit}>Cancel</Text></Pressable></View> : null}
      <View style={styles.composer}>
        <TextInput accessibilityLabel="Message" multiline maxLength={2000} onChangeText={setDraft} placeholder="Write a message…" placeholderTextColor="#8A9792" style={styles.input} value={draft} />
        <Pressable accessibilityRole="button" disabled={!draft.trim() || sending} onPress={send} style={({ pressed }) => [styles.sendButton, (!draft.trim() || sending) && styles.sendDisabled, pressed && styles.pressed]}>
          {sending ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.sendText}>↑</Text>}
        </Pressable>
      </View>
    </View>;
  }

  return <ScrollView contentContainerStyle={styles.content}>
    <PageTitle title="Messages" subtitle="Plan safe, simple campus meetups" onBack={onBack} />
    {sortedConversations.length ? <>
      <Text style={styles.sectionLabel}>RECENT CONVERSATIONS</Text>
      {sortedConversations.map((conversation) => {
        const participant = otherParticipant(conversation, userId);
        return <Pressable accessibilityRole="button" key={conversation.id} onPress={() => setSelectedId(conversation.id)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
          {conversation.listingImage ? <Image source={{ uri: conversation.listingImage }} style={styles.listingImage} /> : <View style={styles.cardAvatar}><Text style={styles.cardAvatarText}>{participant.name.charAt(0).toUpperCase()}</Text></View>}
          <View style={styles.cardCopy}>
            <View style={styles.nameRow}><Text numberOfLines={1} style={styles.name}>{participant.name}</Text><Text style={styles.timestamp}>{timeLabel(conversation.updatedAt)}</Text></View>
            <Text numberOfLines={1} style={styles.title}>{conversation.listingTitle}</Text>
            <Text numberOfLines={1} style={conversation.lastMessage ? styles.preview : styles.newConversation}>{conversation.lastMessage || "Conversation ready — say hello"}</Text>
          </View><Text style={styles.chevron}>›</Text>
        </Pressable>;
      })}
    </> : <EmptyState title="Your inbox is quiet" message="When you message a seller, your private conversation will appear here." action="Browse listings" onAction={onBrowse} />}
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 110 }, sectionLabel: { color: "#87918C", fontSize: 11, fontWeight: "800", letterSpacing: 1.1, marginBottom: 10 },
  card: { alignItems: "center", backgroundColor: "#FFF", borderColor: "#E5EBE7", borderRadius: 18, borderWidth: 1, flexDirection: "row", marginBottom: 12, padding: 12 }, listingImage: { borderRadius: 14, height: 58, width: 58 },
  cardAvatar: { alignItems: "center", backgroundColor: "#DDECE5", borderRadius: 29, height: 58, justifyContent: "center", width: 58 }, cardAvatarText: { color: "#1F5D4C", fontSize: 20, fontWeight: "800" }, cardCopy: { flex: 1, marginLeft: 12 }, nameRow: { alignItems: "center", flexDirection: "row" }, name: { color: "#173C34", flex: 1, fontSize: 16, fontWeight: "800" }, timestamp: { color: "#87918C", fontSize: 11, marginLeft: 8 }, title: { color: "#52635C", fontSize: 12, marginTop: 3 }, preview: { color: "#87918C", fontSize: 13, marginTop: 6 }, newConversation: { color: "#1F7A5B", fontSize: 13, fontWeight: "700", marginTop: 6 }, chevron: { color: "#94A19B", fontSize: 26, marginLeft: 8 }, pressed: { opacity: 0.72 },
  threadPage: { backgroundColor: "#F7F9F7", flex: 1, paddingBottom: 82 }, threadHeader: { alignItems: "center", backgroundColor: "#FFF", borderBottomColor: "#E5EBE7", borderBottomWidth: 1, flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12 }, backButton: { alignItems: "center", height: 42, justifyContent: "center", marginRight: 6, width: 34 }, backText: { color: "#173C34", fontSize: 38, fontWeight: "300", lineHeight: 38 }, avatar: { alignItems: "center", backgroundColor: "#DDECE5", borderRadius: 21, height: 42, justifyContent: "center", width: 42 }, avatarText: { color: "#1F5D4C", fontSize: 16, fontWeight: "800" }, headerCopy: { flex: 1, marginLeft: 10 }, headerName: { color: "#173C34", fontSize: 16, fontWeight: "800" }, headerMeta: { color: "#74817B", fontSize: 12, marginTop: 2 },
  safetyBanner: { alignItems: "center", alignSelf: "center", backgroundColor: "#EAF4EF", borderRadius: 12, flexDirection: "row", marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, paddingVertical: 9 }, safetyIcon: { color: "#1F7A5B", fontWeight: "900", marginRight: 8 }, safetyText: { color: "#456159", flex: 1, fontSize: 11, lineHeight: 16 }, messageList: { flexGrow: 1, padding: 16, paddingBottom: 22 }, loader: { marginTop: 30 },
  firstMessage: { alignItems: "center", marginHorizontal: 30, marginVertical: 28 }, firstMessageIcon: { fontSize: 30 }, firstMessageTitle: { color: "#173C34", fontSize: 16, fontWeight: "800", marginTop: 8 }, firstMessageCopy: { color: "#74817B", fontSize: 13, lineHeight: 19, marginTop: 5, textAlign: "center" }, messageRow: { alignItems: "flex-start", marginBottom: 9 }, myMessageRow: { alignItems: "flex-end" }, bubble: { borderRadius: 18, maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10 }, theirBubble: { backgroundColor: "#FFF", borderBottomLeftRadius: 5, borderColor: "#E5EBE7", borderWidth: 1 }, myBubble: { backgroundColor: "#1F5D4C", borderBottomRightRadius: 5 }, messageText: { color: "#263A33", fontSize: 15, lineHeight: 21 }, myMessageText: { color: "#FFF" }, messageTime: { color: "#8A9792", fontSize: 10, marginTop: 4, textAlign: "right" }, myMessageTime: { color: "#C5DDD4" }, error: { backgroundColor: "#FFF0EE", color: "#A33A32", fontSize: 12, paddingHorizontal: 16, paddingVertical: 7 },
  deletedText: { fontStyle: "italic", opacity: 0.72 }, messageActions: { backgroundColor: "#FFF", borderColor: "#DDE6E1", borderRadius: 10, borderWidth: 1, flexDirection: "row", marginTop: 5, paddingHorizontal: 4 }, actionButton: { paddingHorizontal: 12, paddingVertical: 8 }, editAction: { color: "#1F5D4C", fontSize: 12, fontWeight: "800" }, deleteAction: { color: "#B64950", fontSize: 12, fontWeight: "800" }, editingBar: { alignItems: "center", backgroundColor: "#EAF4EF", borderLeftColor: "#1F7A5B", borderLeftWidth: 4, flexDirection: "row", paddingHorizontal: 14, paddingVertical: 8 }, editingCopy: { flex: 1 }, editingTitle: { color: "#1F5D4C", fontSize: 12, fontWeight: "800" }, editingPreview: { color: "#65766D", fontSize: 11, marginTop: 2 }, cancelEdit: { color: "#B64950", fontSize: 12, fontWeight: "800", padding: 8 },
  composer: { alignItems: "flex-end", backgroundColor: "#FFF", borderTopColor: "#E5EBE7", borderTopWidth: 1, flexDirection: "row", padding: 12 }, input: { backgroundColor: "#F1F5F2", borderRadius: 20, color: "#173C34", flex: 1, fontSize: 15, maxHeight: 100, minHeight: 44, paddingHorizontal: 16, paddingVertical: 11 }, sendButton: { alignItems: "center", backgroundColor: "#1F5D4C", borderRadius: 22, height: 44, justifyContent: "center", marginLeft: 9, width: 44 }, sendDisabled: { backgroundColor: "#B8C5BF" }, sendText: { color: "#FFF", fontSize: 24, fontWeight: "800", lineHeight: 26 },
});
