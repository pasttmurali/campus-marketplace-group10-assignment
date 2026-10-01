import {
  getDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";
import { seedListings } from "./data";
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
  >
>;

const demoUserId = "demo-user";
const demoListings: Listing[] = seedListings.map((listing) => ({
  ...listing,
  sellerId: listing.sellerId || demoUserId,
  status: listing.status || "available",
}));

export function normalizeListing(listing: { id: string } & DocumentData): Listing {
  return { ...listing, status: listing.status || "available" } as Listing;
}

export function getDemoListings(): Listing[] {
  return demoListings.map((listing) => normalizeListing({ ...listing }));
}

function currentUserId(): string | null {
  if (firebaseConfigured) return auth?.currentUser?.uid || null;
  return demoUserId;
}

function assertOwner(sellerId: string | undefined): void {
  const uid = currentUserId();
  if (!uid) throw new Error("You must be signed in to manage this listing.");
  if (uid !== sellerId) {
    throw new Error("Only the seller can manage this listing.");
  }
}

function demoListingIndex(id: string): number {
  const index = demoListings.findIndex((listing) => listing.id === id);
  if (index < 0) throw new Error("Listing not found.");
  return index;
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

  const index = demoListingIndex(id);
  assertOwner(demoListings[index].sellerId);
  demoListings[index] = normalizeListing({
    ...demoListings[index],
    ...fields,
    updatedAt: Timestamp.now(),
  });
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

  const index = demoListingIndex(id);
  assertOwner(demoListings[index].sellerId);
  demoListings[index] = {
    ...demoListings[index],
    status,
    soldAt: status === "sold" ? Timestamp.now() : null,
    updatedAt: Timestamp.now(),
  };
}
