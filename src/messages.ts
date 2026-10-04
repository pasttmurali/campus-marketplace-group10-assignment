import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { Message } from "./types";

export function subscribeToMessages(
  conversationId: string,
  onMessages: (messages: Message[]) => void,
  onError: (message: string) => void,
) {
  if (!db) {
    onMessages([]);
    return () => undefined;
  }

  const messagesQuery = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(
    messagesQuery,
    (snapshot) =>
      onMessages(
        snapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        })) as Message[],
      ),
    (error) => onError(error.message),
  );
}

export async function sendConversationMessage(
  conversationId: string,
  senderId: string,
  text: string,
) {
  const trimmedText = text.trim();
  if (!db) throw new Error("Messaging is unavailable until Firebase is configured.");
  if (!trimmedText) throw new Error("Write a message before sending.");
  if (trimmedText.length > 2000) throw new Error("Messages can contain up to 2,000 characters.");

  const conversationRef = doc(db, "conversations", conversationId);
  const messageRef = doc(collection(conversationRef, "messages"));
  const batch = writeBatch(db);
  batch.set(messageRef, {
    senderId,
    text: trimmedText,
    createdAt: serverTimestamp(),
  });
  batch.update(conversationRef, {
    lastMessage: trimmedText,
    lastSenderId: senderId,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}
