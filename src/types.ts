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
  createdAt?: Date | string | number | { toMillis: () => number } | null;
};

export type ListingSortOrder = "newest" | "price-asc" | "price-desc";

export type Tab = "Explore" | "Saved" | "Messages" | "Profile" | "MyListings";
