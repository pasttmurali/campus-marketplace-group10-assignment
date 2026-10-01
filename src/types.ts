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

export type Tab = "Explore" | "Saved" | "Messages" | "Profile" | "MyListings";
