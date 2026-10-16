import { get, onValue, push, ref, serverTimestamp, update } from "firebase/database";
import { db } from "./firebase";
import { Message } from "./types";

function valuesWithIds<T>(value: Record<string, Omit<T, "id">> | null): T[] {
  return Object.entries(value || {}).map(([id, item]) => ({ id, ...item }) as T);
}

function timestampNumber(value: Message["createdAt"]): number {
  return typeof value === "number" ? value : value?.toMillis() || 0;
}

export function subscribeToMessages(
  conversationId: string,
  onMessages: (messages: Message[]) => void,
  onError: (message: string) => void,
) {
  if (!db) {
    onMessages([]);
    return () => undefined;
  }
  return onValue(
    ref(db, `conversations/${conversationId}/messages`),
    (snapshot) => onMessages(
      valuesWithIds<Message>(snapshot.val()).sort(
        (first, second) => timestampNumber(first.createdAt) - timestampNumber(second.createdAt),
      ),
    ),
    (error) => onError(error.message),
  );
}

export async function sendConversationMessage(conversationId: string, senderId: string, text: string) {
  const trimmedText = text.trim();
  if (!db) throw new Error("Messaging is unavailable until Firebase is configured.");
  if (!trimmedText) throw new Error("Write a message before sending.");
  if (trimmedText.length > 2000) throw new Error("Messages can contain up to 2,000 characters.");

  const messageRef = push(ref(db, `conversations/${conversationId}/messages`));
  await update(ref(db), {
    [`conversations/${conversationId}/messages/${messageRef.key}`]: {
      senderId,
      text: trimmedText,
      createdAt: serverTimestamp(),
    },
    [`conversations/${conversationId}/lastMessage`]: trimmedText,
    [`conversations/${conversationId}/lastMessageId`]: messageRef.key,
    [`conversations/${conversationId}/lastSenderId`]: senderId,
    [`conversations/${conversationId}/updatedAt`]: serverTimestamp(),
  });
}

export async function editConversationMessage(conversationId: string, messageId: string, text: string) {
  const trimmedText = text.trim();
  if (!db) throw new Error("Messaging is unavailable until Firebase is configured.");
  if (!trimmedText) throw new Error("A message cannot be empty.");
  if (trimmedText.length > 2000) throw new Error("Messages can contain up to 2,000 characters.");
  const conversationRef = ref(db, `conversations/${conversationId}`);
  const snapshot = await get(conversationRef);
  const changes: Record<string, unknown> = {
    [`conversations/${conversationId}/messages/${messageId}/text`]: trimmedText,
    [`conversations/${conversationId}/messages/${messageId}/editedAt`]: serverTimestamp(),
  };
  if (snapshot.val()?.lastMessageId === messageId) {
    changes[`conversations/${conversationId}/lastMessage`] = trimmedText;
    changes[`conversations/${conversationId}/updatedAt`] = serverTimestamp();
  }
  await update(ref(db), changes);
}

export async function deleteConversationMessage(conversationId: string, messageId: string) {
  if (!db) throw new Error("Messaging is unavailable until Firebase is configured.");
  const conversationRef = ref(db, `conversations/${conversationId}`);
  const snapshot = await get(conversationRef);
  const changes: Record<string, unknown> = {
    [`conversations/${conversationId}/messages/${messageId}/text`]: "",
    [`conversations/${conversationId}/messages/${messageId}/deletedAt`]: serverTimestamp(),
  };
  if (snapshot.val()?.lastMessageId === messageId) {
    changes[`conversations/${conversationId}/lastMessage`] = "This message was deleted";
    changes[`conversations/${conversationId}/updatedAt`] = serverTimestamp();
  }
  await update(ref(db), changes);
}
