import { get, ref, serverTimestamp, update } from "firebase/database";
import { auth, db, firebaseConfigured } from "./firebase";
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
    | "images"
    | "description"
    | "negotiable"
    | "urgent"
    | "listingType"
  >
>;

export function normalizeListing(listing: { id: string } & Record<string, unknown>): Listing {
  const images = Array.isArray(listing.images)
    ? listing.images.filter((image): image is string => typeof image === "string")
    : typeof listing.image === "string" && listing.image ? [listing.image] : [];
  return {
    ...listing,
    image: images[0] || "",
    images,
    negotiable: listing.negotiable === true,
    urgent: listing.urgent === true,
    listingType: listing.listingType === "wanted" ? "wanted" : "selling",
    status: listing.status || "available",
  } as Listing;
}

export async function deleteListing(id: string): Promise<void> {
  if (!db) throw new Error("Firebase is not configured.");
  const listingRef = ref(db, `listings/${id}`);
  const snapshot = await get(listingRef);
  if (!snapshot.exists()) throw new Error("Listing not found.");
  assertOwner(snapshot.val()?.sellerId);
  await update(ref(db), { [`listings/${id}`]: null });
}

function currentUserId(): string | null {
  return firebaseConfigured ? auth?.currentUser?.uid || null : null;
}

function assertOwner(sellerId: string | undefined): void {
  const uid = currentUserId();
  if (!uid) throw new Error("You must be signed in to manage this listing.");
  if (uid !== sellerId) throw new Error("Only the seller can manage this listing.");
}

export async function updateListing(id: string, fields: ListingUpdateFields): Promise<void> {
  if (!db) throw new Error("Firebase is not configured.");
  const listingRef = ref(db, `listings/${id}`);
  const snapshot = await get(listingRef);
  if (!snapshot.exists()) throw new Error("Listing not found.");
  assertOwner(snapshot.val()?.sellerId);
  await update(listingRef, { ...fields, updatedAt: serverTimestamp() });
}

export async function setListingStatus(id: string, status: Listing["status"]): Promise<void> {
  if (!db) throw new Error("Firebase is not configured.");
  const listingRef = ref(db, `listings/${id}`);
  const snapshot = await get(listingRef);
  if (!snapshot.exists()) throw new Error("Listing not found.");
  assertOwner(snapshot.val()?.sellerId);
  await update(listingRef, {
    status,
    soldAt: status === "sold" ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
}
