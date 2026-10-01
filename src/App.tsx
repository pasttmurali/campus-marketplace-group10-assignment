import { StatusBar } from "expo-status-bar";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { EmptyState } from "./components/EmptyState";
import { SellForm, SellFormValues } from "./components/SellForm";
import { ListingFormModal } from "./components/ListingFormModal";
import { SoldBadge } from "./components/SoldBadge";
import { ExplorePage } from "./pages/ExplorePage";
import { MessagesPage } from "./pages/MessagesPage";
import { MyListingsPage } from "./pages/MyListingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SavedPage } from "./pages/SavedPage";
import { seedListings } from "./data";
import { auth, db, firebaseConfigured } from "./firebase";
import {
  getDemoListings,
  normalizeListing,
  updateListing,
  setListingStatus,
} from "./listings";
import { Listing, Tab } from "./types";

async function registerUser(user: User) {
  if (!db) return;
  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      displayName:
        user.displayName || user.email?.split("@")[0] || "Campus student",
      email: user.email || "",
      photoURL: user.photoURL || null,
      campus: "North Campus",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

async function confirmStatusChange(nextStatus: Listing["status"]): Promise<boolean> {
  const action = nextStatus === "sold" ? "mark this item as sold" : "mark this item as available";
  if (Platform.OS === "web") {
    return window.confirm(`Are you sure you want to ${action}?`);
  }
  return new Promise((resolve) => {
    Alert.alert("Update listing status", `Are you sure you want to ${action}?`, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Confirm", onPress: () => resolve(true) },
    ]);
  });
}

export default function App() {
  const [tab, setTab] = useState<Tab>("Explore");
  const [items, setItems] = useState(getDemoListings);
  const [queryText, setQueryText] = useState("");
  const [category, setCategory] = useState("All items");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [user, setUser] = useState<User | null>(auth?.currentUser || null);
  const [authOpen, setAuthOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    const firebaseAuth = auth;
    if (!firebaseAuth) return;
    const handleUser = (nextUser: User | null) => {
      setUser(nextUser);
      if (nextUser)
        registerUser(nextUser)
          .then(() => setProfileReady(true))
          .catch((error) =>
            setAuthError(
              error instanceof Error
                ? error.message
                : "Could not create profile.",
            ),
          );
      else setProfileReady(false);
    };
    let unsubscribe: () => void = () => undefined;
    setPersistence(firebaseAuth, browserLocalPersistence)
      .then(() => {
        unsubscribe = onAuthStateChanged(firebaseAuth, handleUser);
        return getRedirectResult(firebaseAuth);
      })
      .then((result) => {
        if (result?.user) handleUser(result.user);
      })
      .catch((error) =>
        setAuthError(
          error instanceof Error
            ? error.message
            : "Google sign-in could not be completed.",
        ),
      );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db) return;
    const listingsQuery = query(
      collection(db, "listings"),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(
      listingsQuery,
      (snapshot) =>
        setItems(
          snapshot.empty
            ? getDemoListings()
            : snapshot.docs.map(
                (entry) => normalizeListing({ id: entry.id, ...entry.data() }),
              ),
        ),
      () => setItems(getDemoListings()),
    );
  }, []);

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (category === "All items" || item.category === category) &&
          item.title.toLowerCase().includes(queryText.toLowerCase()),
      ),
    [category, items, queryText],
  );
  const myListings = useMemo(
    () => (user ? items.filter((item) => item.sellerId === user.uid) : []),
    [items, user],
  );
  const toggleSaved = (id: string) =>
    setSavedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  const signInWithGoogle = async () => {
    if (!auth) return;
    setAuthError("");
    try {
      await setPersistence(auth, browserLocalPersistence);
      if (Platform.OS === "web") {
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        await registerUser(result.user);
        setUser(result.user);
        setProfileReady(true);
        setAuthOpen(false);
      } else {
        await signInAnonymously(auth);
        setAuthOpen(false);
      }
    } catch (error) {
      const code =
        error instanceof Error ? error.message : "Google sign-in failed.";
      if (
        Platform.OS === "web" &&
        /popup|cancelled-popup-request/i.test(code)
      ) {
        await signInWithRedirect(auth, new GoogleAuthProvider());
        return;
      }
      setAuthError(code);
      Alert.alert("Google sign-in failed", code);
    }
  };
  const publish = async (draft: SellFormValues) => {
    if (!user) {
      setSellOpen(false);
      setAuthOpen(true);
      return;
    }
    if (!db) {
      Alert.alert(
        "Cannot publish",
        "Firebase is not configured, so this listing cannot be saved.",
      );
      return;
    }
    await addDoc(collection(db, "listings"), {
      title: draft.title.trim(),
      price: Number(draft.price),
      category: draft.category,
      seller: user.displayName || user.email || "You",
      sellerId: user.uid,
      campus: draft.campus,
      condition: draft.condition,
      image: draft.image.trim() || seedListings[0].image,
      description: draft.description.trim(),
      status: "available",
      createdAt: serverTimestamp(),
    });
    setSellOpen(false);
  };
  const contactSeller = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setSelected(null);
    setTab("Messages");
  };
  const changeListingStatus = async (
    id: string,
    status: Listing["status"],
  ) => {
    await setListingStatus(id, status);
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );
    setSelected((current) =>
      current?.id === id ? { ...current, status } : current,
    );
  };
  const saveListingEdits = async (
    title: string,
    price: string,
    listingCategory: string,
  ) => {
    if (!selected || !user || selected.sellerId !== user.uid) {
      throw new Error("You can't edit this listing.");
    }
    await updateListing(selected.id, {
      title,
      price: Number(price),
      category: listingCategory,
    });
    const updatedFields = {
      title,
      price: Number(price),
      category: listingCategory,
    };
    setItems((current) =>
      current.map((item) =>
        item.id === selected.id ? { ...item, ...updatedFields } : item,
      ),
    );
    setSelected((current) =>
      current?.id === selected.id ? { ...current, ...updatedFields } : current,
    );
    setEditOpen(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {tab === "Explore" && (
        <ExplorePage
          items={filteredItems}
          query={queryText}
          category={category}
          savedIds={savedIds}
          onQueryChange={setQueryText}
          onCategoryChange={setCategory}
          onSave={toggleSaved}
          onOpen={setSelected}
          onProfile={() => setTab("Profile")}
        />
      )}
      {tab === "Saved" && (
        <SavedPage
          items={items.filter((item) => savedIds.includes(item.id))}
          onSave={toggleSaved}
          onOpen={setSelected}
        />
      )}
      {tab === "Messages" && (
        <MessagesPage onBrowse={() => setTab("Explore")} />
      )}
      {tab === "MyListings" && (
        <MyListingsPage
          items={myListings}
          onOpen={setSelected}
          onSell={() => setSellOpen(true)}
        />
      )}
      {tab === "Profile" && (
        <ProfilePage
          user={user}
          savedCount={savedIds.length}
          listingCount={myListings.length}
          firebaseConfigured={firebaseConfigured}
          profileReady={profileReady}
          error={authError}
          onMyListings={() => (user ? setTab("MyListings") : setAuthOpen(true))}
          onSaved={() => setTab("Saved")}
          onSignIn={() => setAuthOpen(true)}
          onSignOut={() => auth && signOut(auth)}
        />
      )}
      <BottomNav
        tab={tab}
        savedCount={savedIds.length}
        onChange={setTab}
        onSell={() => setSellOpen(true)}
      />
      <ListingModal
        item={selected}
        user={user}
        onClose={() => setSelected(null)}
        onContact={contactSeller}
        onStatusChange={changeListingStatus}
        onEdit={() => setEditOpen(true)}
      />
      <ListingFormModal
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={saveListingEdits}
        initialListing={selected}
        heading="Edit listing"
        submitLabel="Save changes"
        canEdit={Boolean(selected && user?.uid === selected.sellerId)}
        blockedMessage="You can't edit this listing"
      />
      <AuthModal
        visible={authOpen}
        onClose={() => setAuthOpen(false)}
        onSignIn={signInWithGoogle}
        error={authError}
      />
      <SellForm
        visible={sellOpen}
        onClose={() => setSellOpen(false)}
        onSubmit={publish}
      />
    </SafeAreaView>
  );
}

function BottomNav({
  tab,
  savedCount,
  onChange,
  onSell,
}: {
  tab: Tab;
  savedCount: number;
  onChange: (tab: Tab) => void;
  onSell: () => void;
}) {
  return (
    <View style={styles.nav}>
      <NavItem
        label="Explore"
        icon="⌂"
        active={tab === "Explore"}
        onPress={() => onChange("Explore")}
      />
      <NavItem
        label="Saved"
        icon="♡"
        active={tab === "Saved"}
        badge={savedCount}
        onPress={() => onChange("Saved")}
      />
      <NavItem
        label="Messages"
        icon="□"
        active={tab === "Messages"}
        onPress={() => onChange("Messages")}
      />
      <Pressable style={styles.sellButton} onPress={onSell}>
        <Text style={styles.sellPlus}>＋</Text>
        <Text style={styles.sellText}>Sell</Text>
      </Pressable>
    </View>
  );
}
function NavItem({
  label,
  icon,
  active,
  badge,
  onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.navItem} onPress={onPress}>
      <View>
        <Text style={[styles.navIcon, active && styles.navActive]}>{icon}</Text>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.navLabel, active && styles.navActive]}>{label}</Text>
    </Pressable>
  );
}
function ListingModal({
  item,
  user,
  onClose,
  onContact,
  onStatusChange,
  onEdit,
}: {
  item: Listing | null;
  user: User | null;
  onClose: () => void;
  onContact: () => void;
  onStatusChange: (id: string, status: Listing["status"]) => Promise<void>;
  onEdit: () => void;
}) {
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const isOwner = Boolean(item && user?.uid === item.sellerId);

  useEffect(() => {
    setSavingStatus(false);
    setStatusError("");
  }, [item?.id]);

  const handleStatusChange = async () => {
    if (!item || !isOwner || savingStatus) return;
    const nextStatus: Listing["status"] =
      item.status === "sold" ? "available" : "sold";
    if (!(await confirmStatusChange(nextStatus))) return;
    setSavingStatus(true);
    setStatusError("");
    try {
      await onStatusChange(item.id, nextStatus);
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : "Could not update listing.",
      );
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <Modal
      visible={item !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {item && (
        <View style={styles.backdrop}>
          <View style={styles.detail}>
            <Image
              source={{ uri: item.image }}
              style={[
                styles.detailImage,
                item.status === "sold" && styles.soldDetailImage,
              ]}
            />
            {item.status === "sold" ? <SoldBadge /> : null}
            <Pressable style={styles.close} onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
            <View style={styles.detailBody}>
              <Text style={styles.detailCategory}>
                {item.category.toUpperCase()}
              </Text>
              <Text style={styles.detailTitle}>{item.title}</Text>
              <Text style={styles.detailPrice}>${item.price}</Text>
              <Text style={styles.muted}>
                {item.condition} · {item.campus} · {item.seller}
              </Text>
              <Text style={styles.description}>{item.description}</Text>
              {isOwner ? (
                <View>
                  <Pressable style={styles.outline} onPress={onEdit}>
                    <Text style={styles.outlineText}>Edit listing</Text>
                  </Pressable>
                  <Pressable
                    disabled={savingStatus}
                    style={[styles.outline, savingStatus && styles.disabled]}
                    onPress={handleStatusChange}
                  >
                    {savingStatus ? (
                      <ActivityIndicator color="#1F5D4C" />
                    ) : (
                      <Text style={styles.outlineText}>
                        {item.status === "sold"
                          ? "Mark as available"
                          : "Mark as sold"}
                      </Text>
                    )}
                  </Pressable>
                </View>
              ) : item.status === "sold" ? (
                <Text style={styles.soldMessage}>This item has been sold</Text>
              ) : (
                <Pressable style={styles.primary} onPress={onContact}>
                  <Text style={styles.primaryText}>
                    {user
                      ? `Message ${item.seller}`
                      : "Sign in to contact seller"}
                  </Text>
                </Pressable>
              )}
              {statusError ? (
                <Text style={styles.statusError}>{statusError}</Text>
              ) : null}
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}
function AuthModal({
  visible,
  onClose,
  onSignIn,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  onSignIn: () => Promise<void>;
  error: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.auth}>
          <Text style={styles.formTitle}>Welcome to campus marketplace</Text>
          <Text style={styles.authMessage}>
            Sign in to save listings, message sellers, and publish your own
            items.
          </Text>
          {error ? <Text style={styles.authError}>{error}</Text> : null}
          <Pressable style={styles.googleButton} onPress={onSignIn}>
            <Text style={styles.googleMark}>G</Text>
            <Text style={styles.outlineText}>Continue with Google</Text>
          </Pressable>
          <Pressable style={styles.outline} onPress={onClose}>
            <Text style={styles.outlineText}>Maybe later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8F4" },
  nav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 82,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E8EBE5",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: { alignItems: "center", minWidth: 54 },
  navIcon: { color: "#83918A", fontSize: 22 },
  navLabel: { color: "#83918A", fontSize: 10, marginTop: 3 },
  navActive: { color: "#1D6B54" },
  badge: {
    position: "absolute",
    right: -12,
    top: -3,
    backgroundColor: "#C3535B",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
  },
  badgeText: { color: "#FFF", fontSize: 9, fontWeight: "800" },
  sellButton: {
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E6F0E6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 4,
  },
  sellPlus: { color: "#247055", fontSize: 20 },
  sellText: { color: "#247055", fontWeight: "800", fontSize: 12 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,40,33,.45)",
    justifyContent: "flex-end",
  },
  detail: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  detailImage: { width: "100%", height: 230 },
  soldDetailImage: { opacity: 0.62 },
  close: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: "#173C34", fontSize: 26 },
  detailBody: { padding: 24 },
  detailCategory: {
    color: "#23775D",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  detailTitle: {
    color: "#173C34",
    fontSize: 25,
    fontWeight: "800",
    marginTop: 8,
  },
  detailPrice: {
    color: "#1C7057",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
  },
  muted: { color: "#87918C", fontSize: 12 },
  description: {
    color: "#66736D",
    fontSize: 14,
    lineHeight: 21,
    marginVertical: 20,
  },
  soldMessage: {
    color: "#B64950",
    backgroundColor: "#FBECEE",
    borderRadius: 10,
    padding: 12,
    textAlign: "center",
    fontWeight: "700",
  },
  statusError: {
    color: "#B64950",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 12,
  },
  primary: {
    height: 50,
    backgroundColor: "#1F5D4C",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  primaryText: { color: "#FFF", fontWeight: "800" },
  auth: { backgroundColor: "#FFF", borderRadius: 20, padding: 24, margin: 20 },
  formTitle: { color: "#173C34", fontSize: 22, fontWeight: "800" },
  authMessage: { color: "#87918C", lineHeight: 20, marginTop: 10 },
  authError: {
    color: "#B64950",
    backgroundColor: "#FBECEE",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    marginTop: 16,
  },
  googleButton: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7DDD8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: 10,
  },
  googleMark: { color: "#4285F4", fontSize: 18, fontWeight: "800" },
  outline: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BCD0C3",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  disabled: { opacity: 0.45 },
  outlineText: { color: "#1F5D4C", fontWeight: "800" },
});
