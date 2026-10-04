import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ListingCard } from "../components/ListingCard";
import { categories } from "../data";
import { Listing, ListingSortOrder } from "../types";

export function ExplorePage({
  items,
  query,
  category,
  minPrice,
  maxPrice,
  sortOrder,
  filterError,
  savedIds,
  userEmail,
  userPhotoURL,
  onQueryChange,
  onCategoryChange,
  onMinPriceChange,
  onMaxPriceChange,
  onSortOrderChange,
  onResetFilters,
  onSave,
  onOpen,
  onProfile,
}: {
  items: Listing[];
  query: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  sortOrder: ListingSortOrder;
  filterError: string;
  savedIds: string[];
  userEmail: string | null;
  userPhotoURL: string | null;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onSortOrderChange: (value: ListingSortOrder) => void;
  onResetFilters: () => void;
  onSave: (id: string) => void;
  onOpen: (item: Listing) => void;
  onProfile: () => void;
}) {
  const userInitial = userEmail?.trim().charAt(0).toUpperCase() || "?";

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>CAMPUS MARKETPLACE</Text>
          <Text style={styles.heading}>
            Find your next{"\n"}favorite thing.
          </Text>
        </View>
        <Pressable
          style={styles.account}
          onPress={onProfile}
          accessibilityRole="button"
          accessibilityLabel={
            userEmail ? `Open profile for ${userEmail}` : "Open profile"
          }
        >
          {userEmail ? (
            <Text style={styles.accountEmail} numberOfLines={1}>
              {userEmail}
            </Text>
          ) : null}
          <View style={styles.avatar}>
            {userPhotoURL ? (
              <Image
                source={{ uri: userPhotoURL }}
                style={styles.avatarImage}
                accessibilityLabel={`${userEmail || "User"} profile photo`}
              />
            ) : (
              <Text style={styles.avatarText}>{userInitial}</Text>
            )}
          </View>
        </Pressable>
      </View>
      <View style={styles.search}>
        <Text style={styles.icon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search textbooks, desks, tech..."
          placeholderTextColor="#87918C"
          style={styles.input}
        />
      </View>
      <View style={styles.filtersHeader}>
        <Text style={styles.filterLabel}>Price range</Text>
        <Pressable onPress={onResetFilters} accessibilityRole="button">
          <Text style={styles.resetText}>Reset filters</Text>
        </Pressable>
      </View>
      <View style={styles.priceInputs}>
        <TextInput
          value={minPrice}
          onChangeText={onMinPriceChange}
          placeholder="Min price"
          placeholderTextColor="#87918C"
          keyboardType="decimal-pad"
          accessibilityLabel="Minimum price"
          style={styles.priceInput}
        />
        <TextInput
          value={maxPrice}
          onChangeText={onMaxPriceChange}
          placeholder="Max price"
          placeholderTextColor="#87918C"
          keyboardType="decimal-pad"
          accessibilityLabel="Maximum price"
          style={styles.priceInput}
        />
      </View>
      {filterError ? <Text style={styles.filterError}>{filterError}</Text> : null}
      <Text style={[styles.filterLabel, styles.sortLabel]}>Sort by</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortOptions}
      >
        {([
          ["newest", "Newest first"],
          ["price-asc", "Price: low to high"],
          ["price-desc", "Price: high to low"],
        ] as const).map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => onSortOrderChange(value)}
            accessibilityRole="button"
            accessibilityState={{ selected: sortOrder === value }}
            style={[
              styles.sortOption,
              sortOrder === value && styles.activeSortOption,
            ]}
          >
            <Text
              style={[
                styles.sortText,
                sortOrder === value && styles.activeSortText,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.section}>
        <View>
          <Text style={styles.sectionTitle}>Browse near you</Text>
          <Text style={styles.muted}>Good finds, close by</Text>
        </View>
        <Text style={styles.seeAll}>{items.length} items</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
      >
        {categories.map((value) => (
          <Pressable
            key={value}
            onPress={() => onCategoryChange(value)}
            style={[
              styles.category,
              category === value && styles.activeCategory,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                category === value && styles.activeText,
              ]}
            >
              {value}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        data={items}
        scrollEnabled={false}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No listings match these filters.</Text>
            <Text style={styles.emptyHint}>
              Try another search or category, or reset the price filters.
            </Text>
            <Pressable onPress={onResetFilters} accessibilityRole="button">
              <Text style={styles.resetText}>Reset filters</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <ListingCard
            item={item}
            saved={savedIds.includes(item.id)}
            onSave={() => onSave(item.id)}
            onOpen={() => onOpen(item)}
          />
        )}
      />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 110 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 28,
    paddingBottom: 24,
  },
  eyebrow: {
    color: "#65766D",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  heading: {
    color: "#173C34",
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
  },
  heroCopy: { flex: 1 },
  account: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginLeft: 12,
  },
  accountEmail: {
    color: "#49635A",
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 110,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#D6E5D7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: 21 },
  avatarText: { color: "#225347", fontWeight: "800" },
  search: {
    height: 52,
    backgroundColor: "#FFF",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E6E9E2",
  },
  icon: { color: "#49635A", fontSize: 28, marginRight: 8 },
  input: { flex: 1, color: "#173C34", fontSize: 14 },
  filtersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 9,
  },
  filterLabel: { color: "#173C34", fontSize: 13, fontWeight: "700" },
  resetText: { color: "#23775D", fontSize: 12, fontWeight: "700" },
  priceInputs: { flexDirection: "row", gap: 10 },
  priceInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    paddingHorizontal: 12,
    color: "#173C34",
    fontSize: 14,
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E6E9E2",
  },
  filterError: { color: "#B42318", fontSize: 12, marginTop: 7 },
  sortLabel: { marginTop: 16, marginBottom: 8 },
  sortOptions: { gap: 8, paddingBottom: 2 },
  sortOption: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#ECEFE9",
  },
  activeSortOption: { backgroundColor: "#1F5D4C" },
  sortText: { color: "#64736C", fontSize: 11, fontWeight: "700" },
  activeSortText: { color: "#FFF" },
  section: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#173C34",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  muted: { color: "#87918C", fontSize: 12 },
  seeAll: { color: "#23775D", fontWeight: "700", fontSize: 12 },
  categories: { gap: 8, paddingBottom: 22 },
  category: {
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#ECEFE9",
  },
  activeCategory: { backgroundColor: "#1F5D4C" },
  categoryText: { color: "#64736C", fontSize: 12, fontWeight: "700" },
  activeText: { color: "#FFF" },
  grid: { gap: 14 },
  columns: { gap: 14 },
  empty: { alignItems: "center", padding: 30, gap: 8 },
  emptyTitle: { color: "#173C34", fontSize: 15, fontWeight: "700" },
  emptyHint: { color: "#87918C", fontSize: 12, textAlign: "center" },
});
