import {
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";
import { auth, firebaseConfigured, listingDocument } from "./firebase";
import { Listing } from "./types";

export type ListingUpdateFields = Partial<
  Pick<
    Listing,
    | "title"
    | "price"
    | "category"
    | "campus"
    | "condition"
    | "image"
    | "description"
    | "negotiable"
    | "urgent"
    | "listingType"
  >
>;

export function normalizeListing(listing: { id: string } & DocumentData): Listing {
  return {
    ...listing,
    negotiable: listing.negotiable === true,
    urgent: listing.urgent === true,
    listingType: listing.listingType === "wanted" ? "wanted" : "selling",
    status: listing.status || "available",
  } as Listing;
}

function currentUserId(): string | null {
  return firebaseConfigured ? auth?.currentUser?.uid || null : null;
}

function assertOwner(sellerId: string | undefined): void {
  const uid = currentUserId();
  if (!uid) throw new Error("You must be signed in to manage this listing.");
  if (uid !== sellerId) {
    throw new Error("Only the seller can manage this listing.");
  }
}

export async function updateListing(
  id: string,
  fields: ListingUpdateFields,
): Promise<void> {
  if (firebaseConfigured) {
    const document = listingDocument(id);
    if (!document) throw new Error("Firebase is not configured.");
    const snapshot = await getDoc(document);
    if (!snapshot.exists()) throw new Error("Listing not found.");
    assertOwner(snapshot.data().sellerId as string | undefined);
    await updateDoc(document, { ...fields, updatedAt: serverTimestamp() });
    return;
  }

  throw new Error("Firebase is not configured.");
}

export async function setListingStatus(
  id: string,
  status: Listing["status"],
): Promise<void> {
  if (firebaseConfigured) {
    const document = listingDocument(id);
    if (!document) throw new Error("Firebase is not configured.");
    const snapshot = await getDoc(document);
    if (!snapshot.exists()) throw new Error("Listing not found.");
    assertOwner(snapshot.data().sellerId as string | undefined);
    await updateDoc(document, {
      status,
      soldAt: status === "sold" ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  throw new Error("Firebase is not configured.");
}
