import { Timestamp } from "firebase/firestore";

export type Listing = {
  id: string;
  title: string;
  price: number;
  category: string;
  seller: string;
  sellerId?: string;
  campus: string;
  condition: string;
  image: string;
  description?: string;
  status: "available" | "sold";
  soldAt?: Timestamp | null;
  updatedAt?: Timestamp;
  createdAt?: Timestamp | Date | string | number | null;
};

export type ListingSortOrder = "newest" | "price-asc" | "price-desc";

export type Conversation = {
  id: string;
  listingId: string;
  listingTitle: string;
  memberIds: string[];
  buyerId: string;
  sellerId: string;
  sellerName: string;
  buyerName?: string;
  listingImage?: string;
  lastMessage?: string;
  lastSenderId?: string;
  updatedAt?: Timestamp | null;
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAt?: Timestamp | null;
};

export type Tab =
  | "Explore"
  | "Saved"
  | "Messages"
  | "Profile"
  | "MyListings"
  | "SellerProfile";
