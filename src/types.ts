export type StoredTimestamp = number | { toMillis: () => number; toDate?: () => Date };

export type Listing = {
  id: string;
  title: string;
  price: number;
  category: string;
  seller: string;
  sellerId?: string;
  sellerPhone?: string;
  sellerPhotoURL?: string;
  campus: string;
  condition: string;
  image: string;
  images?: string[];
  description?: string;
  negotiable?: boolean;
  urgent?: boolean;
  listingType?: "selling" | "wanted";
  status: "available" | "sold";
  soldAt?: StoredTimestamp | null;
  updatedAt?: StoredTimestamp;
  createdAt?: Date | string | StoredTimestamp | null;
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
  sellerPhotoURL?: string;
  buyerPhotoURL?: string;
  listingImage?: string;
  lastMessage?: string;
  lastSenderId?: string;
  lastMessageId?: string;
  updatedAt?: StoredTimestamp | null;
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAt?: StoredTimestamp | null;
  editedAt?: StoredTimestamp | null;
  deletedAt?: StoredTimestamp | null;
};

export type Tab =
  | "Explore"
  | "Saved"
  | "Messages"
  | "Profile"
  | "MyListings"
  | "SellerProfile";
