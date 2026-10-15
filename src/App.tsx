import { StatusBar } from "expo-status-bar";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { EmptyState } from "./components/EmptyState";
import { GoogleSignInButton } from "./components/GoogleSignInButton";
import { SellForm, SellFormValues } from "./components/SellForm";
import { ListingFormModal } from "./components/ListingFormModal";
import { SoldBadge } from "./components/SoldBadge";
import { ExplorePage } from "./pages/ExplorePage";
import { MessagesPage } from "./pages/MessagesPage";
import { MyListingsPage } from "./pages/MyListingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SavedPage } from "./pages/SavedPage";
import { SellerProfilePage } from "./pages/SellerProfilePage";
import { auth, db, firebaseConfigured, storage } from "./firebase";
import {
  normalizeListing,
  updateListing,
  setListingStatus,
} from "./listings";
import { Conversation, Listing, ListingSortOrder, Tab } from "./types";
import { filterListings } from "./utils/filterListings";

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
      campus: "University of Colombo",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function isLocalImage(uri: string): boolean {
  return /^(file|content|blob|data):/i.test(uri);
}

async function uploadFirebaseImage(
  uri: string,
  path: string,
  maxSizeMb: number,
  fixedFileName?: string,
): Promise<string> {
  if (!isLocalImage(uri)) return uri;
  if (!storage) throw new Error("Firebase Storage is not configured.");

  const response = await fetch(uri);
  if (!response.ok) throw new Error("Could not read the selected photo.");
  const photo = await response.blob();
  if (photo.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`Choose a photo smaller than ${maxSizeMb} MB.`);
  }

  const contentType = photo.type || "image/jpeg";
  const extension = contentType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const fileName = fixedFileName || `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const imageRef = ref(storage, `${path}/${fileName}`);
  await Promise.race([
    uploadBytes(imageRef, photo, { contentType }),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Photo upload failed. Confirm that Firebase Storage is upgraded and its default bucket has been created.")),
        15000,
      ),
    ),
  ]);
  return getDownloadURL(imageRef);
}

async function confirmStatusChange(nextStatus: Listing["status"], listingType: Listing["listingType"]): Promise<boolean> {
  const wanted = listingType === "wanted";
  const action = nextStatus === "sold"
    ? wanted ? "mark this request as fulfilled" : "mark this item as sold"
    : wanted ? "mark this request as still needed" : "mark this item as available";
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
  const [tabHistory, setTabHistory] = useState<Tab[]>([]);
  const [items, setItems] = useState<Listing[]>([]);
  const [queryText, setQueryText] = useState("");
  const [category, setCategory] = useState("All items");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortOrder, setSortOrder] = useState<ListingSortOrder>("newest");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<Listing | null>(null);
  const [user, setUser] = useState<User | null>(auth?.currentUser || null);
  const [authOpen, setAuthOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [postTypeOpen, setPostTypeOpen] = useState(false);
  const [newListingType, setNewListingType] = useState<"selling" | "wanted">("selling");
  const [editOpen, setEditOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [profileReady, setProfileReady] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState<string | null>(
    auth?.currentUser?.photoURL || null,
  );
  const [profilePhone, setProfilePhone] = useState("");

  const navigateTo = useCallback((nextTab: Tab) => {
    setTab((currentTab) => {
      if (currentTab === nextTab) return currentTab;
      setTabHistory((history) => [...history, currentTab]);
      return nextTab;
    });
  }, []);

  const goBack = useCallback(() => {
    setTabHistory((history) => {
      const previousTab = history[history.length - 1] || "Explore";
      setTab(previousTab);
      return history.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const firebaseAuth = auth;
    if (!firebaseAuth) return;
    const handleUser = (nextUser: User | null) => {
      setUser(nextUser);
      setProfilePhotoURL(nextUser?.photoURL || null);
      if (nextUser) {
        setAuthOpen(false);
        setAuthError("");
        registerUser(nextUser)
          .then(() => setProfileReady(true))
          .catch((error) =>
            setAuthError(
              error instanceof Error
                ? error.message
                : "Could not create profile.",
            ),
          );
      } else setProfileReady(false);
    };
    const unsubscribe = onAuthStateChanged(firebaseAuth, handleUser);
    const restoreRedirect =
      Platform.OS === "web"
        ? setPersistence(firebaseAuth, browserLocalPersistence).then(() =>
            getRedirectResult(firebaseAuth),
          )
        : Promise.resolve(null);
    restoreRedirect
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
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!db || !user) {
      setProfilePhone("");
      return;
    }
    return onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      const data = snapshot.data();
      setProfilePhone(typeof data?.phoneNumber === "string" ? data.phoneNumber : "");
      if (typeof data?.photoURL === "string") setProfilePhotoURL(data.photoURL);
    });
  }, [user]);

  useEffect(() => {
    if (!db || !user) {
      setSavedIds([]);
      return;
    }
    return onSnapshot(collection(db, "users", user.uid, "saved"), (snapshot) =>
      setSavedIds(snapshot.docs.map((entry) => entry.id)),
    );
  }, [user]);

  useEffect(() => {
    if (!db || !user) {
      setConversations([]);
      return;
    }
    const inbox = query(
      collection(db, "conversations"),
      where("memberIds", "array-contains", user.uid),
    );
    return onSnapshot(inbox, (snapshot) =>
      setConversations(
        snapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        })) as Conversation[],
      ),
    );
  }, [user]);

  useEffect(() => {
    if (!db || !user) {
      setItems([]);
      return;
    }
    const listingsQuery = query(
      collection(db, "listings"),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(
      listingsQuery,
      (snapshot) => {
        const liveListings = snapshot.docs.map((entry) =>
          normalizeListing({ id: entry.id, ...entry.data() }),
        );
        setItems(liveListings);
      },
      () => setItems([]),
    );
  }, [user]);

  const filterResult = useMemo(
    () =>
      filterListings(items, {
        query: queryText,
        category,
        minPrice,
        maxPrice,
        sortOrder,
      }),
    [category, items, maxPrice, minPrice, queryText, sortOrder],
  );
  const myListings = useMemo(
    () => (user ? items.filter((item) => item.sellerId === user.uid) : []),
    [items, user],
  );
  const sellerListings = useMemo(
    () =>
      selectedSeller
        ? items.filter((item) =>
            selectedSeller.sellerId
              ? item.sellerId === selectedSeller.sellerId
              : item.seller === selectedSeller.seller,
          )
        : [],
    [items, selectedSeller],
  );
  const toggleSaved = async (id: string) => {
    if (!user || !db) {
      setAuthOpen(true);
      return;
    }
    const savedRef = doc(db, "users", user.uid, "saved", id);
    if (savedIds.includes(id)) await deleteDoc(savedRef);
    else
      await setDoc(savedRef, {
        listingId: id,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
  };
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
      sellerPhone: profilePhone,
      sellerPhotoURL: profilePhotoURL || "",
      campus: draft.campus,
      condition: draft.condition,
      image: draft.image.trim(),
      description: draft.description.trim(),
      negotiable: draft.negotiable,
      urgent: draft.urgent,
      listingType: draft.listingType,
      status: "available",
      createdAt: serverTimestamp(),
    });
    setSellOpen(false);
  };
  const contactSeller = async (listing: Listing | null) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (!listing?.sellerId) {
      Alert.alert(
        "Demo listing",
        "This sample seller is not connected to an account. Choose a listing published by a signed-in student to start a real conversation.",
      );
      return;
    }
    if (listing.sellerId === user.uid) {
      Alert.alert("Your listing", "Buyers will be able to message you about this item.");
      return;
    }
    if (!db) {
      Alert.alert("Messaging unavailable", "Firebase is not configured for this app.");
      return;
    }
    const memberIds = [user.uid, listing.sellerId].sort();
    const conversationId = `${listing.id}_${memberIds.join("_")}`;
    try {
      await setDoc(
        doc(db, "conversations", conversationId),
        {
          listingId: listing.id,
          listingTitle: listing.title,
          memberIds,
          buyerId: user.uid,
          sellerId: listing.sellerId,
          sellerName: listing.seller,
          buyerName: user.displayName || user.email?.split("@")[0] || "Campus buyer",
          ...(listing.sellerPhotoURL ? { sellerPhotoURL: listing.sellerPhotoURL } : {}),
          ...(profilePhotoURL ? { buyerPhotoURL: profilePhotoURL } : {}),
          ...(listing.image ? { listingImage: listing.image } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setSelected(null);
      navigateTo("Messages");
    } catch (error) {
      Alert.alert(
        "Could not start conversation",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
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
  const saveListingEdits = async (values: SellFormValues) => {
    if (!selected || !user || selected.sellerId !== user.uid) {
      throw new Error("You can't edit this listing.");
    }
    const image = values.image.trim();
    await updateListing(selected.id, {
      title: values.title.trim(),
      price: Number(values.price),
      category: values.category,
      condition: values.condition,
      campus: values.campus,
      description: values.description.trim(),
      negotiable: values.negotiable,
      urgent: values.urgent,
      listingType: values.listingType,
      image,
    });
    const updatedFields = {
      title: values.title.trim(),
      price: Number(values.price),
      category: values.category,
      condition: values.condition,
      campus: values.campus,
      description: values.description.trim(),
      image,
      negotiable: values.negotiable,
      urgent: values.urgent,
      listingType: values.listingType,
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
  const completeNativeGoogleSignIn = useCallback(async (nextUser: User) => {
    await registerUser(nextUser);
    setUser(nextUser);
    setProfileReady(true);
    setAuthOpen(false);
  }, []);

  const changeProfilePhoto = async (uri: string) => {
    if (!user) {
      throw new Error("Sign in before adding a profile photo.");
    }
    setAuthError("");
    const photoURL = await uploadFirebaseImage(uri, `profile-photos/${user.uid}`, 5, "avatar");
    await updateProfile(user, { photoURL });
    await registerUser(user);
    setProfilePhotoURL(photoURL);
    setProfileReady(true);
  };
  const saveProfilePhone = async (phoneNumber: string) => {
    if (!user || !db) throw new Error("Sign in before saving a phone number.");
    const firestore = db;
    const cleaned = phoneNumber.replace(/[^0-9+]/g, "");
    if (cleaned && !/^(?:\+94|0)[0-9]{9}$/.test(cleaned)) throw new Error("Enter a valid Sri Lankan number, for example 0771234567.");
    await setDoc(doc(firestore, "users", user.uid), { phoneNumber: cleaned, updatedAt: serverTimestamp() }, { merge: true });
    const batch = writeBatch(firestore);
    myListings.forEach((listing) => batch.update(doc(firestore, "listings", listing.id), { sellerPhone: cleaned, updatedAt: serverTimestamp() }));
    await batch.commit();
    setProfilePhone(cleaned);
  };

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      {tab === "Explore" && (
        <ExplorePage
          items={filterResult.listings}
          query={queryText}
          category={category}
          minPrice={minPrice}
          maxPrice={maxPrice}
          sortOrder={sortOrder}
          filterError={filterResult.error}
          savedIds={savedIds}
          userEmail={user?.email || null}
          userPhotoURL={profilePhotoURL}
          onQueryChange={setQueryText}
          onCategoryChange={setCategory}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          onSortOrderChange={setSortOrder}
          onResetFilters={() => {
            setMinPrice("");
            setMaxPrice("");
            setSortOrder("newest");
          }}
          onSave={toggleSaved}
          onOpen={setSelected}
          onProfile={() => navigateTo("Profile")}
        />
      )}
      {tab === "Saved" && (
        <SavedPage
          items={items.filter((item) => savedIds.includes(item.id))}
          onSave={toggleSaved}
          onOpen={setSelected}
          onBack={goBack}
        />
      )}
      {tab === "Messages" && (
        <MessagesPage
          conversations={conversations}
          userId={user?.uid || null}
          onBrowse={() => navigateTo("Explore")}
          onBack={goBack}
        />
      )}
      {tab === "MyListings" && (
        <MyListingsPage
          items={myListings}
          onOpen={setSelected}
          onSell={() => setPostTypeOpen(true)}
          onBack={goBack}
        />
      )}
      {tab === "Profile" && (
        <ProfilePage
          user={user}
          photoURL={profilePhotoURL}
          phoneNumber={profilePhone}
          savedCount={savedIds.length}
          listingCount={myListings.length}
          firebaseConfigured={firebaseConfigured}
          profileReady={profileReady}
          error={authError}
          onMyListings={() => (user ? navigateTo("MyListings") : setAuthOpen(true))}
          onSaved={() => navigateTo("Saved")}
          onSignIn={() => setAuthOpen(true)}
          onSignOut={() => auth && signOut(auth)}
          onChangePhoto={changeProfilePhoto}
          onSavePhone={saveProfilePhone}
          onBack={goBack}
        />
      )}
      {tab === "SellerProfile" && selectedSeller && (
        <SellerProfilePage
          seller={selectedSeller}
          items={sellerListings}
          savedIds={savedIds}
          onBack={() => {
            setSelected(selectedSeller);
            goBack();
          }}
          onSave={toggleSaved}
          onOpen={setSelected}
          onMessage={() => contactSeller(selectedSeller)}
        />
      )}
      <BottomNav
        tab={tab}
        savedCount={savedIds.length}
        onChange={navigateTo}
        onSell={() => setPostTypeOpen(true)}
      />
      <ListingModal
        item={selected}
        user={user}
        onClose={() => setSelected(null)}
        onContact={() => contactSeller(selected)}
        onCall={async () => {
          if (!selected?.sellerPhone) return Alert.alert("Phone number unavailable", "This user has not added a phone number to their profile.");
          const url = `tel:${selected.sellerPhone}`;
          if (await Linking.canOpenURL(url)) await Linking.openURL(url);
          else Alert.alert("Calling unavailable", "This device cannot open the phone app.");
        }}
        onStatusChange={changeListingStatus}
        onEdit={() => setEditOpen(true)}
        onViewSeller={(item) => {
          setSelectedSeller(item);
          setSelected(null);
          navigateTo("SellerProfile");
        }}
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
        onNativeSuccess={completeNativeGoogleSignIn}
        onError={setAuthError}
        error={authError}
      />
      <PostTypeModal
        visible={postTypeOpen}
        onClose={() => setPostTypeOpen(false)}
        onChoose={(type) => {
          setNewListingType(type);
          setPostTypeOpen(false);
          setSellOpen(true);
        }}
      />
      <SellForm
        visible={sellOpen}
        listingType={newListingType}
        onClose={() => setSellOpen(false)}
        onSubmit={publish}
      />
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

function PostTypeModal({ visible, onClose, onChoose }: { visible: boolean; onClose: () => void; onChoose: (type: "selling" | "wanted") => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.postChoice}>
          <Text style={styles.formTitle}>What would you like to post?</Text>
          <Text style={styles.choiceHint}>Choose whether you are selling something or looking for an item.</Text>
          <Pressable style={styles.choiceCard} onPress={() => onChoose("selling")}>
            <Text style={styles.choiceIcon}>₹</Text>
            <View><Text style={styles.choiceTitle}>Sell an item</Text><Text style={styles.choiceText}>Post something you want to sell</Text></View>
          </Pressable>
          <Pressable style={[styles.choiceCard, styles.wantedChoice]} onPress={() => onChoose("wanted")}>
            <Text style={styles.choiceIcon}>⌕</Text>
            <View><Text style={styles.choiceTitle}>I need an item</Text><Text style={styles.choiceText}>Ask the campus community for it</Text></View>
          </Pressable>
          <Pressable style={styles.outline} onPress={onClose}><Text style={styles.outlineText}>Cancel</Text></Pressable>
        </View>
      </View>
    </Modal>
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
        <Text style={styles.sellText}>Post</Text>
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
  onCall,
  onStatusChange,
  onEdit,
  onViewSeller,
}: {
  item: Listing | null;
  user: User | null;
  onClose: () => void;
  onContact: () => void;
  onCall: () => void;
  onStatusChange: (id: string, status: Listing["status"]) => Promise<void>;
  onEdit: () => void;
  onViewSeller: (item: Listing) => void;
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
    if (!(await confirmStatusChange(nextStatus, item.listingType))) return;
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
            {item.image ? <Image source={{ uri: item.image }} style={[styles.detailImage, item.status === "sold" && styles.soldDetailImage]} /> : <View style={[styles.detailImage, styles.noDetailImage]}><Text style={styles.noDetailImageIcon}>◎</Text><Text style={styles.noDetailImageText}>No photo available</Text></View>}
            {item.status === "sold" ? <SoldBadge /> : null}
            <Pressable style={styles.close} onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
            <ScrollView contentContainerStyle={styles.detailBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.detailCategory}>
                {item.listingType === "wanted" ? "WANTED" : "FOR SALE"} · {item.category.toUpperCase()}
              </Text>
              <Text style={styles.detailTitle}>{item.title}</Text>
              <View style={styles.detailPriceRow}>
                <Text style={styles.detailPrice}>Rs. {item.price.toLocaleString()}</Text>
                {item.negotiable ? <Text style={styles.detailNegotiable}>Negotiable</Text> : null}
                {item.urgent ? <Text style={styles.detailUrgent}>{item.listingType === "wanted" ? "URGENTLY NEEDED" : "URGENT SALE"}</Text> : null}
              </View>
              <Text style={styles.muted}>
                {item.condition} · {item.campus}
              </Text>
              <Pressable style={styles.sellerRow} onPress={() => onViewSeller(item)}>
                {item.sellerPhotoURL ? <Image source={{ uri: item.sellerPhotoURL }} style={styles.sellerAvatar} /> : <View style={styles.sellerAvatarFallback}><Text style={styles.sellerAvatarText}>{item.seller.trim().charAt(0).toUpperCase() || "?"}</Text></View>}
                <View><Text style={styles.sellerCaption}>{item.listingType === "wanted" ? "Requested by" : "For sale by"}</Text><Text style={styles.sellerLink}>{item.seller}</Text></View>
              </Pressable>
              <View style={styles.factGrid}>
                <Text style={styles.factLabel}>Category</Text><Text style={styles.factValue}>{item.category}</Text>
                <Text style={styles.factLabel}>Condition</Text><Text style={styles.factValue}>{item.condition}</Text>
                <Text style={styles.factLabel}>Campus</Text><Text style={styles.factValue}>{item.campus}</Text>
              </View>
              <Text style={styles.descriptionHeading}>Description</Text>
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
                          ? item.listingType === "wanted" ? "Still needed" : "Mark as available"
                          : item.listingType === "wanted" ? "Mark as found" : "Mark as sold"}
                      </Text>
                    )}
                  </Pressable>
                </View>
              ) : item.status === "sold" ? (
                <Text style={styles.soldMessage}>{item.listingType === "wanted" ? "This request has been fulfilled" : "This item has been sold"}</Text>
              ) : (
                <View style={styles.contactActions}>
                  <Pressable style={[styles.contactButton, !item.sellerPhone && styles.contactButtonDisabled]} onPress={onCall}><Text style={styles.contactButtonText}>☎  Call</Text></Pressable>
                  <Pressable style={styles.contactButton} onPress={onContact}><Text style={styles.contactButtonText}>{user ? "●  Message" : "Sign in"}</Text></Pressable>
                </View>
              )}
              {statusError ? (
                <Text style={styles.statusError}>{statusError}</Text>
              ) : null}
            </ScrollView>
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
  onNativeSuccess,
  onError,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  onSignIn: () => Promise<void>;
  onNativeSuccess: (user: User) => Promise<void>;
  onError: (message: string) => void;
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
          {Platform.OS === "web" ? (
            <Pressable style={styles.googleButton} onPress={onSignIn}>
              <Text style={styles.googleMark}>G</Text>
              <Text style={styles.outlineText}>Continue with Google</Text>
            </Pressable>
          ) : (
            <GoogleSignInButton
              onSuccess={onNativeSuccess}
              onError={onError}
            />
          )}
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
    maxHeight: "94%",
  },
  detailImage: { width: "100%", height: 230 },
  soldDetailImage: { opacity: 0.62 },
  noDetailImage: { alignItems: "center", backgroundColor: "#E5ECE5", justifyContent: "center" },
  noDetailImageIcon: { color: "#8EA097", fontSize: 40 },
  noDetailImageText: { color: "#71847A", fontSize: 12, fontWeight: "700", marginTop: 6 },
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
  detailPriceRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  detailNegotiable: { color: "#23775D", fontSize: 11, fontWeight: "800", marginTop: 8 },
  detailUrgent: { backgroundColor: "#C3535B", borderRadius: 6, color: "#FFF", fontSize: 10, fontWeight: "900", marginTop: 8, overflow: "hidden", paddingHorizontal: 7, paddingVertical: 4 },
  muted: { color: "#87918C", fontSize: 12 },
  sellerLink: {
    color: "#23775D",
    fontSize: 13,
    fontWeight: "800",
  },
  sellerRow: { alignItems: "center", borderBottomColor: "#E7ECE8", borderBottomWidth: 1, borderTopColor: "#E7ECE8", borderTopWidth: 1, flexDirection: "row", marginTop: 18, paddingVertical: 14 },
  sellerAvatar: { borderRadius: 23, height: 46, marginRight: 12, width: 46 },
  sellerAvatarFallback: { alignItems: "center", backgroundColor: "#E0E7FF", borderRadius: 23, height: 46, justifyContent: "center", marginRight: 12, width: 46 },
  sellerAvatarText: { color: "#1F5D4C", fontSize: 18, fontWeight: "800" },
  sellerCaption: { color: "#87918C", fontSize: 11 },
  factGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 18 },
  factLabel: { color: "#7A8781", fontSize: 13, marginBottom: 9, width: "35%" },
  factValue: { color: "#263A33", fontSize: 13, fontWeight: "600", marginBottom: 9, width: "65%" },
  descriptionHeading: { color: "#173C34", fontSize: 16, fontWeight: "800", marginTop: 12 },
  description: {
    color: "#66736D",
    fontSize: 14,
    lineHeight: 21,
    marginVertical: 20,
  },
  contactActions: { flexDirection: "row", gap: 10 },
  contactButton: { alignItems: "center", backgroundColor: "#159B78", borderRadius: 10, flex: 1, justifyContent: "center", minHeight: 50 },
  contactButtonDisabled: { opacity: 0.45 },
  contactButtonText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
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
  postChoice: { backgroundColor: "#FFF", borderRadius: 20, margin: 20, padding: 24 },
  choiceHint: { color: "#87918C", lineHeight: 20, marginBottom: 8, marginTop: 8 },
  choiceCard: { alignItems: "center", backgroundColor: "#EDF5EF", borderColor: "#BCD0C3", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 14, marginTop: 14, minHeight: 72, padding: 14 },
  wantedChoice: { backgroundColor: "#EEF4FC", borderColor: "#B8CAE2" },
  choiceIcon: { color: "#1F5D4C", fontSize: 24, fontWeight: "900", width: 28 },
  choiceTitle: { color: "#173C34", fontSize: 15, fontWeight: "800" },
  choiceText: { color: "#87918C", fontSize: 12, marginTop: 3 },
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
