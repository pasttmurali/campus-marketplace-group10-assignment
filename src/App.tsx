import { StatusBar } from "expo-status-bar";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import {
  get,
  onValue,
  push,
  ref as databaseRef,
  remove,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import {
  getDownloadURL,
  ref,
  UploadTask,
  uploadBytesResumable,
  uploadString,
} from "firebase/storage";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
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
  TextInput,
  useWindowDimensions,
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
  deleteListing,
  normalizeListing,
  updateListing,
  setListingStatus,
} from "./listings";
import { Conversation, Listing, ListingSortOrder, Tab } from "./types";
import { filterListings } from "./utils/filterListings";
import { isLocalImage } from "./utils/validateImageUrl";

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), milliseconds);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function waitForUpload(uploadTask: UploadTask, milliseconds: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      uploadTask.cancel();
      reject(new Error("Photo upload took too long. Check your connection and try again."));
    }, milliseconds);
    uploadTask.on(
      "state_changed",
      undefined,
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
      () => {
        clearTimeout(timer);
        resolve();
      },
    );
  });
}

async function registerUser(user: User) {
  if (!db) return;
  await update(databaseRef(db, `users/${user.uid}`), {
    uid: user.uid,
    displayName: user.displayName || user.email?.split("@")[0] || "Campus student",
    email: user.email || "",
    photoURL: user.photoURL || null,
    campus: "University of Colombo",
    updatedAt: serverTimestamp(),
  });
}

async function uploadFirebaseImage(
  uri: string,
  path: string,
  maxSizeMb: number,
  fixedFileName?: string,
): Promise<string> {
  if (!isLocalImage(uri)) return uri;
  if (!storage) throw new Error("Firebase Storage is not configured.");

  // Gallery photos can easily be 10-30 MB. Resize them before reading/uploading
  // so posting stays quick and listing cards do not download full-size originals.
  let uploadUri = uri;
  let optimizedBase64: string | undefined;
  if (Platform.OS !== "web") {
    try {
      const optimized = await withTimeout(
        manipulateAsync(
          uri,
          [{ resize: { width: fixedFileName ? 512 : 1280 } }],
          {
            base64: true,
            compress: fixedFileName ? 0.75 : 0.72,
            format: SaveFormat.JPEG,
          },
        ),
        15_000,
        "Photo optimization took too long.",
      );
      uploadUri = optimized.uri;
      optimizedBase64 = optimized.base64;
    } catch {
      // If optimization is unavailable, upload the picker-compressed original.
    }
  }

  const fileName = fixedFileName || `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const imageRef = ref(storage, `${path}/${fileName}`);

  // React Native's Blob implementation can leave Firebase's resumable upload
  // waiting forever. ImageManipulator has already produced a smaller JPEG, so
  // upload its base64 bytes directly on native platforms instead.
  if (Platform.OS !== "web" && optimizedBase64) {
    const estimatedBytes = Math.ceil(optimizedBase64.length * 0.75);
    if (estimatedBytes > maxSizeMb * 1024 * 1024) {
      throw new Error(`Choose a photo smaller than ${maxSizeMb} MB.`);
    }
    try {
      const result = await withTimeout(
        uploadString(imageRef, optimizedBase64, "base64", { contentType: "image/jpeg" }),
        45_000,
        "Photo upload took too long. Check your connection and try again.",
      );
      return await withTimeout(
        getDownloadURL(result.ref),
        10_000,
        "The photo uploaded, but its download URL could not be loaded.",
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Photo upload failed: ${detail}`);
    }
  }

  const response = await withTimeout(
    fetch(uploadUri),
    15_000,
    "Could not read the selected photo in time.",
  );
  if (!response.ok) throw new Error("Could not read the selected photo.");
  const photo = await withTimeout(
    response.blob(),
    15_000,
    "Could not prepare the selected photo in time.",
  );
  if (photo.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`Choose a photo smaller than ${maxSizeMb} MB.`);
  }

  const contentType = photo.type.startsWith("image/") ? photo.type : "image/jpeg";
  const extension = contentType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const blobFileName = fixedFileName || fileName.replace(/\.jpg$/, `.${extension}`);
  const blobImageRef = fixedFileName ? imageRef : ref(storage, `${path}/${blobFileName}`);
  try {
    const uploadTask = uploadBytesResumable(blobImageRef, photo, { contentType });
    await waitForUpload(uploadTask, 45_000);
    return await withTimeout(
      getDownloadURL(uploadTask.snapshot.ref),
      10_000,
      "The photo uploaded, but its download URL could not be loaded.",
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Photo upload failed: ${detail}. Check that Firebase Storage is enabled, EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET matches the bucket, and storage.rules are deployed.`,
    );
  }
}

async function uploadListingImage(uri: string, userId: string): Promise<string> {
  if (!isLocalImage(uri)) return uri;

  // Listing photos are kept as compact data URLs in Realtime Database. This
  // keeps posting available for Firebase projects whose Storage bucket has not
  // been provisioned yet, while still using the authenticated Firebase post.
  if (Platform.OS !== "web") {
    const optimized = await withTimeout(
      manipulateAsync(
        uri,
        [{ resize: { width: 960 } }],
        { base64: true, compress: 0.58, format: SaveFormat.JPEG },
      ),
      15_000,
      "Photo optimization took too long.",
    );
    if (!optimized.base64) throw new Error("Could not prepare the selected photo.");
    return `data:image/jpeg;base64,${optimized.base64}`;
  }

  const response = await withTimeout(fetch(uri), 15_000, "Could not read the selected photo.");
  if (!response.ok) throw new Error("Could not read the selected photo.");
  const source = await withTimeout(response.blob(), 15_000, "Could not prepare the selected photo.");
  const bitmap = await withTimeout(createImageBitmap(source), 15_000, "Could not decode the selected photo.");
  const scale = Math.min(1, 960 / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the selected photo.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.58);
  if (dataUrl.length > 700_000) {
    throw new Error("This photo is still too large after optimization. Choose a smaller photo.");
  }
  return dataUrl;
}

async function uploadListingImages(images: string[], userId: string): Promise<string[]> {
  const uploaded: string[] = [];
  // Upload one at a time. Concurrent native Blob uploads are memory-heavy and
  // unreliable on lower-memory Android devices.
  for (const image of images.slice(0, 3)) {
    uploaded.push(isLocalImage(image) ? await uploadListingImage(image, userId) : image);
  }
  return uploaded;
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
  const [conversationToOpen, setConversationToOpen] = useState<string | null>(null);
  const [messageFeedback, setMessageFeedback] = useState("");
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
  const consumeConversationToOpen = useCallback(() => {
    setConversationToOpen(null);
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
    return onValue(databaseRef(db, `users/${user.uid}`), (snapshot) => {
      const data = snapshot.val();
      setProfilePhone(typeof data?.phoneNumber === "string" ? data.phoneNumber : "");
      if (typeof data?.photoURL === "string") setProfilePhotoURL(data.photoURL);
    });
  }, [user]);

  useEffect(() => {
    if (!db || !user) {
      setSavedIds([]);
      return;
    }
    return onValue(databaseRef(db, `users/${user.uid}/saved`), (snapshot) =>
      setSavedIds(Object.keys(snapshot.val() || {})),
    );
  }, [user]);

  useEffect(() => {
    if (!db || !user) {
      setConversations([]);
      return;
    }
    let conversationListeners: Array<() => void> = [];
    const stopIndex = onValue(databaseRef(db, `userConversations/${user.uid}`), (snapshot) => {
      conversationListeners.forEach((unsubscribe) => unsubscribe());
      conversationListeners = [];
      const conversationIds = Object.keys(snapshot.val() || {});
      if (!conversationIds.length) {
        setConversations([]);
        return;
      }
      const liveConversations = new Map<string, Conversation>();
      conversationIds.forEach((id) => {
        const unsubscribe = onValue(databaseRef(db!, `conversations/${id}`), (conversationSnapshot) => {
          const conversation = conversationSnapshot.val() as (Omit<Conversation, "id"> & { messages?: unknown }) | null;
          if (conversation) {
            const { messages: _messages, ...summary } = conversation;
            liveConversations.set(id, { id, ...summary } as Conversation);
          } else liveConversations.delete(id);
          setConversations(Array.from(liveConversations.values()));
        });
        conversationListeners.push(unsubscribe);
      });
    });
    return () => {
      stopIndex();
      conversationListeners.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  useEffect(() => {
    if (!db) {
      setItems([]);
      return;
    }
    return onValue(
      databaseRef(db, "listings"),
      (snapshot) => {
        const data = snapshot.val() as Record<string, Record<string, unknown>> | null;
        const liveListings = Object.entries(data || {}).map(([id, listing]) =>
          normalizeListing({ id, ...listing }),
        );
        setItems(liveListings);
      },
      () => setItems([]),
    );
  }, []);

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
    const savedRef = databaseRef(db, `users/${user.uid}/saved/${id}`);
    if (savedIds.includes(id)) await remove(savedRef);
    else
      await set(savedRef, {
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
  const authenticateWithEmail = async (
    mode: "signin" | "signup",
    email: string,
    password: string,
    displayName: string,
  ) => {
    if (!auth) throw new Error("Firebase Authentication is not configured.");
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) throw new Error("Enter a valid email address.");
    if (password.length < 6) throw new Error("Password must contain at least 6 characters.");
    try {
      const credential = mode === "signup"
        ? await createUserWithEmailAndPassword(auth, cleanEmail, password)
        : await signInWithEmailAndPassword(auth, cleanEmail, password);
      if (mode === "signup") {
        const cleanName = displayName.trim();
        if (cleanName) await updateProfile(credential.user, { displayName: cleanName });
      }
      await registerUser(credential.user);
      setUser(credential.user);
      setProfileReady(true);
      setAuthOpen(false);
      setAuthError("");
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code === "auth/email-already-in-use") throw new Error("An account already exists for this email. Sign in instead.");
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") throw new Error("Email or password is incorrect.");
      if (code === "auth/operation-not-allowed") throw new Error("Email login is not enabled in Firebase yet.");
      if (code === "auth/too-many-requests") throw new Error("Too many attempts. Please wait and try again.");
      throw error;
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
    const savedImages = await uploadListingImages(draft.images, user.uid);
    const listingRef = push(databaseRef(db, "listings"));
    await set(listingRef, {
      title: draft.title.trim(),
      price: Number(draft.price),
      category: draft.category,
      seller: user.displayName || user.email || "You",
      sellerId: user.uid,
      sellerPhone: profilePhone,
      sellerPhotoURL: profilePhotoURL || "",
      campus: draft.campus,
      condition: draft.condition,
      image: savedImages[0] || "",
      images: savedImages,
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
    setMessageFeedback("");
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (!listing?.sellerId) {
      setMessageFeedback("This listing isn't linked to a seller account, so a chat can't be started. Choose a listing posted by a signed-in student.");
      return;
    }
    if (listing.sellerId === user.uid) {
      setMessageFeedback("This is your listing. Other students can message you about it.");
      return;
    }
    if (!db) {
      setMessageFeedback("Messaging is unavailable because Firebase isn't configured.");
      return;
    }
    const memberIds = [user.uid, listing.sellerId].sort();
    const conversationId = `${listing.id}_${memberIds.join("_")}`;
    try {
      const conversationRef = databaseRef(db, `conversations/${conversationId}`);
      await update(conversationRef, {
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
      });
      await update(databaseRef(db), {
        [`userConversations/${user.uid}/${conversationId}`]: true,
        [`userConversations/${listing.sellerId}/${conversationId}`]: true,
      });
      setMessageFeedback("");
      setConversationToOpen(conversationId);
      setSelected(null);
      navigateTo("Messages");
    } catch (error) {
      setMessageFeedback(
        `Couldn't start the conversation: ${error instanceof Error ? error.message : "Please try again."}`,
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
  const removeOwnListing = async (id: string) => {
    const confirmed = Platform.OS === "web"
      ? window.confirm("Delete this listing permanently?")
      : await new Promise<boolean>((resolve) => Alert.alert(
          "Delete listing",
          "This listing will be permanently removed.",
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Delete", style: "destructive", onPress: () => resolve(true) },
          ],
        ));
    if (!confirmed) return;
    await deleteListing(id);
    setItems((current) => current.filter((listing) => listing.id !== id));
    setSelected(null);
  };
  const saveListingEdits = async (values: SellFormValues) => {
    if (!selected || !user || selected.sellerId !== user.uid) {
      throw new Error("You can't edit this listing.");
    }
    const images = await uploadListingImages(values.images, user.uid);
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
      image: images[0] || "",
      images,
    });
    const updatedFields = {
      title: values.title.trim(),
      price: Number(values.price),
      category: values.category,
      condition: values.condition,
      campus: values.campus,
      description: values.description.trim(),
      image: images[0] || "",
      images,
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
    const cleaned = phoneNumber.replace(/[^0-9+]/g, "");
    if (cleaned && !/^(?:\+94|0)[0-9]{9}$/.test(cleaned)) throw new Error("Enter a valid Sri Lankan number, for example 0771234567.");
    const changes: Record<string, unknown> = {
      [`users/${user.uid}/phoneNumber`]: cleaned,
      [`users/${user.uid}/updatedAt`]: serverTimestamp(),
    };
    myListings.forEach((listing) => {
      changes[`listings/${listing.id}/sellerPhone`] = cleaned;
      changes[`listings/${listing.id}/updatedAt`] = serverTimestamp();
    });
    await update(databaseRef(db), changes);
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
          conversationToOpen={conversationToOpen}
          onConversationOpened={consumeConversationToOpen}
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
          messageFeedback={messageFeedback}
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
        messageFeedback={messageFeedback}
        onClose={() => setSelected(null)}
        onContact={() => contactSeller(selected)}
        onCall={async () => {
          if (!selected) return;
          let phoneNumber = selected.sellerPhone?.trim() || "";

          // On web, launch while the click still has an active user gesture.
          // Waiting for Firebase first can cause browsers to block tel: links.
          if (Platform.OS === "web" && phoneNumber) {
            const callableNumber = phoneNumber.replace(/[^0-9+]/g, "");
            if (callableNumber) {
              window.location.assign(`tel:${callableNumber}`);
              return;
            }
          }

          if (db && selected.sellerId) {
            try {
              const profile = await get(databaseRef(db, `users/${selected.sellerId}/phoneNumber`));
              if (typeof profile.val() === "string" && profile.val().trim()) {
                phoneNumber = profile.val().trim();
              }
            } catch {
              // The listing's saved number remains a safe fallback.
            }
          }
          const callableNumber = phoneNumber.replace(/[^0-9+]/g, "");
          if (!callableNumber) {
            Alert.alert("Phone number unavailable", "This user has not added a phone number to their profile.");
            return;
          }
          const url = `tel:${callableNumber}`;
          if (Platform.OS === "web") {
            window.location.assign(url);
            return;
          }
          try {
            // Do not gate this with canOpenURL: Android package visibility may
            // report false even though the system dialer handles tel: links.
            await Linking.openURL(url);
          } catch {
            Alert.alert("Calling unavailable", "This device cannot open the phone app.");
          }
        }}
        onStatusChange={changeListingStatus}
        onDelete={removeOwnListing}
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
        onEmailAuth={authenticateWithEmail}
        onResetPassword={async (email) => {
          if (!auth) throw new Error("Firebase Authentication is not configured.");
          const cleanEmail = email.trim().toLowerCase();
          if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) throw new Error("Enter your email address first.");
          await sendPasswordResetEmail(auth, cleanEmail);
        }}
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
  messageFeedback,
  onClose,
  onContact,
  onCall,
  onStatusChange,
  onDelete,
  onEdit,
  onViewSeller,
}: {
  item: Listing | null;
  user: User | null;
  messageFeedback: string;
  onClose: () => void;
  onContact: () => void;
  onCall: () => void;
  onStatusChange: (id: string, status: Listing["status"]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: () => void;
  onViewSeller: (item: Listing) => void;
}) {
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const { width } = useWindowDimensions();
  const isOwner = Boolean(item && user?.uid === item.sellerId);
  const itemImages = item?.images?.length ? item.images : item?.image ? [item.image] : [];
  const imageWidth = Math.min(width, 680);

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
            {itemImages.length ? (
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.detailGallery}>
                {itemImages.map((image, index) => (
                  <Image key={`${image.slice(0, 48)}-${index}`} resizeMode="contain" source={{ uri: image }} style={[styles.detailImage, { width: imageWidth }, item.status === "sold" && styles.soldDetailImage]} />
                ))}
              </ScrollView>
            ) : <View style={[styles.detailImage, { width: imageWidth }, styles.noDetailImage]}><Text style={styles.noDetailImageIcon}>◎</Text><Text style={styles.noDetailImageText}>No photo available</Text></View>}
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
              {messageFeedback ? <Text accessibilityRole="alert" style={styles.messageFeedback}>{messageFeedback}</Text> : null}
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
                  <Pressable
                    disabled={savingStatus}
                    style={[styles.deleteListingButton, savingStatus && styles.disabled]}
                    onPress={async () => {
                      if (!item || savingStatus) return;
                      setSavingStatus(true);
                      setStatusError("");
                      try { await onDelete(item.id); }
                      catch (error) { setStatusError(error instanceof Error ? error.message : "Could not delete listing."); }
                      finally { setSavingStatus(false); }
                    }}
                  >
                    <Text style={styles.deleteListingText}>Delete listing</Text>
                  </Pressable>
                </View>
              ) : item.status === "sold" ? (
                <Text style={styles.soldMessage}>{item.listingType === "wanted" ? "This request has been fulfilled" : "This item has been sold"}</Text>
              ) : (
                <View style={styles.contactActions}>
                  <Pressable style={styles.contactButton} onPress={onCall}><Text style={styles.contactButtonText}>☎  Call</Text></Pressable>
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
  onEmailAuth,
  onResetPassword,
  onError,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  onSignIn: () => Promise<void>;
  onNativeSuccess: (user: User) => Promise<void>;
  onEmailAuth: (mode: "signin" | "signup", email: string, password: string, displayName: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
  onError: (message: string) => void;
  error: string;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submitEmail = async () => {
    setBusy(true); setMessage(""); onError("");
    try { await onEmailAuth(mode, email, password, displayName); }
    catch (failure) { onError(failure instanceof Error ? failure.message : "Authentication failed."); }
    finally { setBusy(false); }
  };
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled" style={styles.auth}>
          <Text style={styles.formTitle}>Welcome to campus marketplace</Text>
          <Text style={styles.authMessage}>
            Sign in to save listings, message sellers, and publish your own
            items.
          </Text>
          <View style={styles.authTabs}>
            <Pressable onPress={() => { setMode("signin"); onError(""); }} style={[styles.authTab, mode === "signin" && styles.authTabActive]}><Text style={[styles.authTabText, mode === "signin" && styles.authTabTextActive]}>Sign in</Text></Pressable>
            <Pressable onPress={() => { setMode("signup"); onError(""); }} style={[styles.authTab, mode === "signup" && styles.authTabActive]}><Text style={[styles.authTabText, mode === "signup" && styles.authTabTextActive]}>Create account</Text></Pressable>
          </View>
          {mode === "signup" ? <TextInput autoCapitalize="words" onChangeText={setDisplayName} placeholder="Your name" placeholderTextColor="#87918C" style={styles.authInput} value={displayName} /> : null}
          <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="Email address" placeholderTextColor="#87918C" style={styles.authInput} value={email} />
          <TextInput autoCapitalize="none" autoComplete={mode === "signup" ? "new-password" : "current-password"} onChangeText={setPassword} onSubmitEditing={submitEmail} placeholder="Password" placeholderTextColor="#87918C" secureTextEntry style={styles.authInput} value={password} />
          {error ? <Text style={styles.authError}>{error}</Text> : null}
          {message ? <Text style={styles.authSuccess}>{message}</Text> : null}
          <Pressable disabled={busy} onPress={submitEmail} style={[styles.primary, busy && styles.disabled]}><Text style={styles.primaryText}>{busy ? "Please wait…" : mode === "signin" ? "Sign in with email" : "Create account"}</Text></Pressable>
          {mode === "signin" ? <Pressable disabled={busy} onPress={async () => { setBusy(true); onError(""); setMessage(""); try { await onResetPassword(email); setMessage("Password reset email sent."); } catch (resetError) { onError(resetError instanceof Error ? resetError.message : "Could not send reset email."); } finally { setBusy(false); } }}><Text style={styles.forgotPassword}>Forgot password?</Text></Pressable> : null}
          <View style={styles.authDivider}><View style={styles.authDividerLine} /><Text style={styles.authDividerText}>OR</Text><View style={styles.authDividerLine} /></View>
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
        </ScrollView>
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
  detailGallery: { backgroundColor: "#E5ECE5", flexGrow: 0 },
  detailImage: { backgroundColor: "#E5ECE5", height: 280 },
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
  messageFeedback: {
    backgroundColor: "#FBECEE",
    borderRadius: 10,
    color: "#B64950",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    padding: 12,
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
  auth: { backgroundColor: "#FFF", borderRadius: 20, margin: 20, maxHeight: "92%" },
  authContent: { padding: 24 },
  postChoice: { backgroundColor: "#FFF", borderRadius: 20, margin: 20, padding: 24 },
  choiceHint: { color: "#87918C", lineHeight: 20, marginBottom: 8, marginTop: 8 },
  choiceCard: { alignItems: "center", backgroundColor: "#EDF5EF", borderColor: "#BCD0C3", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 14, marginTop: 14, minHeight: 72, padding: 14 },
  wantedChoice: { backgroundColor: "#EEF4FC", borderColor: "#B8CAE2" },
  choiceIcon: { color: "#1F5D4C", fontSize: 24, fontWeight: "900", width: 28 },
  choiceTitle: { color: "#173C34", fontSize: 15, fontWeight: "800" },
  choiceText: { color: "#87918C", fontSize: 12, marginTop: 3 },
  formTitle: { color: "#173C34", fontSize: 22, fontWeight: "800" },
  authMessage: { color: "#87918C", lineHeight: 20, marginTop: 10 },
  authTabs: { backgroundColor: "#EEF3EF", borderRadius: 12, flexDirection: "row", marginTop: 18, padding: 4 },
  authTab: { alignItems: "center", borderRadius: 9, flex: 1, paddingVertical: 10 },
  authTabActive: { backgroundColor: "#FFF" },
  authTabText: { color: "#718078", fontSize: 12, fontWeight: "700" },
  authTabTextActive: { color: "#1F5D4C" },
  authInput: { borderColor: "#D7DDD8", borderRadius: 12, borderWidth: 1, color: "#173C34", marginTop: 12, minHeight: 48, paddingHorizontal: 14 },
  authSuccess: { color: "#1F6D54", fontSize: 12, marginTop: 12, textAlign: "center" },
  forgotPassword: { color: "#1F5D4C", fontSize: 12, fontWeight: "700", marginTop: 12, textAlign: "center" },
  authDivider: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 18 },
  authDividerLine: { backgroundColor: "#E1E6E2", flex: 1, height: 1 },
  authDividerText: { color: "#87918C", fontSize: 10, fontWeight: "800" },
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
  deleteListingButton: { alignItems: "center", borderColor: "#DFA9AD", borderRadius: 14, borderWidth: 1, height: 50, justifyContent: "center", marginTop: 12 },
  deleteListingText: { color: "#B33D46", fontWeight: "800" },
});
