import assert from "node:assert/strict";
import test from "node:test";
import { filterListings } from "../src/utils/filterListings.ts";

const listings = [
  {
    id: "book",
    title: "Calculus textbook",
    price: 35,
    category: "Textbooks",
    createdAt: new Date("2026-01-01T00:00:00Z"),
  },
  {
    id: "desk",
    title: "Study desk",
    price: 80,
    category: "Furniture",
    createdAt: new Date("2026-03-01T00:00:00Z"),
  },
  {
    id: "headphones",
    title: "Noise-cancelling headphones",
    price: 120,
    category: "Tech",
    createdAt: new Date("2026-04-01T00:00:00Z"),
  },
  {
    id: "jacket",
    title: "Vintage jacket",
    price: 45,
    category: "Fashion",
    createdAt: new Date("2026-02-01T00:00:00Z"),
  },
  {
    id: "workbook",
    title: "Calculus workbook",
    price: 20,
    category: "Textbooks",
    createdAt: new Date("2026-05-01T00:00:00Z"),
  },
];

const options = {
  query: "",
  category: "All items",
  minPrice: "",
  maxPrice: "",
  sortOrder: "newest",
};

function ids(result) {
  return result.listings.map((listing) => listing.id);
}

test("filters by minimum price only", () => {
  assert.deepEqual(ids(filterListings(listings, { ...options, minPrice: "80" })), [
    "headphones",
    "desk",
  ]);
});

test("filters by maximum price only", () => {
  assert.deepEqual(ids(filterListings(listings, { ...options, maxPrice: "45" })), [
    "workbook",
    "jacket",
    "book",
  ]);
});

test("filters inclusively by both price bounds", () => {
  assert.deepEqual(
    ids(filterListings(listings, { ...options, minPrice: "40", maxPrice: "100" })),
    ["desk", "jacket"],
  );
});

test("reports an error when minimum exceeds maximum", () => {
  const result = filterListings(listings, {
    ...options,
    minPrice: "100",
    maxPrice: "50",
  });
  assert.equal(result.listings.length, 0);
  assert.match(result.error, /minimum price/i);
});

test("ignores empty price values", () => {
  assert.deepEqual(ids(filterListings(listings, options)), [
    "workbook",
    "headphones",
    "desk",
    "jacket",
    "book",
  ]);
});

test("rejects non-numeric and negative prices", () => {
  for (const minPrice of ["abc", "-1"]) {
    const result = filterListings(listings, { ...options, minPrice });
    assert.equal(result.listings.length, 0);
    assert.match(result.error, /valid non-negative price/i);
  }
});

test("sorts newest first", () => {
  assert.deepEqual(ids(filterListings(listings, { ...options, sortOrder: "newest" })), [
    "workbook",
    "headphones",
    "desk",
    "jacket",
    "book",
  ]);
});

test("sorts by price low to high", () => {
  assert.deepEqual(
    ids(filterListings(listings, { ...options, sortOrder: "price-asc" })),
    ["workbook", "book", "jacket", "desk", "headphones"],
  );
});

test("sorts by price high to low", () => {
  assert.deepEqual(
    ids(filterListings(listings, { ...options, sortOrder: "price-desc" })),
    ["headphones", "desk", "jacket", "book", "workbook"],
  );
});

test("combines search, category, and price filters", () => {
  const result = filterListings(listings, {
    ...options,
    query: "CALCULUS",
    category: "Textbooks",
    minPrice: "25",
  });
  assert.deepEqual(ids(result), ["book"]);
});

test("keeps timestamp-free demo listings in their input order for newest", () => {
  const demoListings = listings.map(({ createdAt: _createdAt, ...listing }) => listing);
  assert.deepEqual(ids(filterListings(demoListings, options)), [
    "book",
    "desk",
    "headphones",
    "jacket",
    "workbook",
  ]);
});

test("handles pending and invalid timestamps without crashing", () => {
  const pendingListing = { ...listings[0], createdAt: null };
  const invalidDateListing = { ...listings[1], createdAt: new Date(Number.NaN) };
  const malformedListing = { ...listings[2], createdAt: {} };
  assert.deepEqual(
    ids(filterListings([pendingListing, invalidDateListing, malformedListing], options)),
    ["book", "desk", "headphones"],
  );
});