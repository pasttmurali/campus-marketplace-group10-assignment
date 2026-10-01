import { Listing, ListingSortOrder } from "../types";

export type ListingFilterOptions = {
  query: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  sortOrder: ListingSortOrder;
};

export type ListingFilterResult = {
  listings: Listing[];
  error: string;
};

function parsePrice(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function timestampValue(value: Listing["createdAt"] | null): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (typeof value.toMillis !== "function") return null;
  const timestamp = value.toMillis();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function filterListings(
  listings: Listing[],
  options: ListingFilterOptions,
): ListingFilterResult {
  const minPrice = parsePrice(options.minPrice);
  const maxPrice = parsePrice(options.maxPrice);

  if (minPrice === null || maxPrice === null) {
    return { listings: [], error: "Enter a valid non-negative price." };
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return { listings: [], error: "Minimum price must not exceed maximum price." };
  }

  const normalizedQuery = options.query.toLowerCase();
  const matchingListings = listings.filter(
    (listing) =>
      (options.category === "All items" ||
        listing.category === options.category) &&
      listing.title.toLowerCase().includes(normalizedQuery) &&
      (minPrice === undefined || listing.price >= minPrice) &&
      (maxPrice === undefined || listing.price <= maxPrice),
  );

  if (options.sortOrder === "price-asc") {
    matchingListings.sort((first, second) => first.price - second.price);
  } else if (options.sortOrder === "price-desc") {
    matchingListings.sort((first, second) => second.price - first.price);
  } else {
    matchingListings.sort((first, second) => {
      const firstTime = timestampValue(first.createdAt);
      const secondTime = timestampValue(second.createdAt);
      if (firstTime === null) return secondTime === null ? 0 : 1;
      if (secondTime === null) return -1;
      return secondTime - firstTime;
    });
  }

  return { listings: matchingListings, error: "" };
}