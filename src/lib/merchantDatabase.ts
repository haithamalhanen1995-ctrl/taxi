import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

export interface MenuItem {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  category: string;
  priceIqd: number;
  priceFormatted: string;
  imageUrl: string;
  isAvailable: boolean;
  createdAt: string;
}

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'delivered';

export interface OrderItem {
  itemId?: string;
  name: string;
  quantity: number;
  priceIqd: number;
}

export interface MerchantOrder {
  id: string;
  orderNumber: string;
  merchantId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  totalAmountIqd: number;
  totalAmountFormatted: string;
  deliveryAddress: string;
  orderTime: string;
  createdAt: string;
  status: OrderStatus;
}

export interface MerchantPost {
  id: string;
  merchantId: string;
  title: string;
  content: string;
  imageUrl?: string;
  expiryDate?: string;
  createdAt: string;
  isPublished: boolean;
}

const MENU_ITEMS_KEY = 'taksati_merchant_menu_v1';
const ORDERS_KEY = 'taksati_merchant_orders_v1';
const POSTS_KEY = 'taksati_merchant_posts_v1';
const EVENT_NAME = 'taksati_merchant_store_updated';

function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
}

// Subscribe to store updates across tabs or state
export function subscribeToMerchantStore(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}

// Real-time listeners for Firestore menu items, orders, and posts
try {
  onSnapshot(collection(db, 'menu_items'), (snapshot) => {
    if (!snapshot.empty) {
      const items: MenuItem[] = [];
      snapshot.forEach((docSnap) => items.push(docSnap.data() as MenuItem));
      if (items.length > 0) {
        localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(items));
        notifyChange();
      }
    }
  }, (err) => console.warn('Firestore menu_items warning:', err));

  onSnapshot(collection(db, 'merchant_orders'), (snapshot) => {
    if (!snapshot.empty) {
      const orders: MerchantOrder[] = [];
      snapshot.forEach((docSnap) => orders.push(docSnap.data() as MerchantOrder));
      if (orders.length > 0) {
        localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
        notifyChange();
      }
    }
  }, (err) => console.warn('Firestore merchant_orders warning:', err));

  onSnapshot(collection(db, 'merchant_posts'), (snapshot) => {
    if (!snapshot.empty) {
      const posts: MerchantPost[] = [];
      snapshot.forEach((docSnap) => posts.push(docSnap.data() as MerchantPost));
      if (posts.length > 0) {
        localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
        notifyChange();
      }
    }
  }, (err) => console.warn('Firestore merchant_posts warning:', err));
} catch (e) {
  console.warn('Firestore merchant setup warning:', e);
}

// Format currency
export function formatIqd(amount: number): string {
  return `${amount.toLocaleString('en-US')} د.ع`;
}

/* ==========================================================================
   1. MENU ITEMS STORE
   ========================================================================== */

const SEED_MENU_ITEMS: MenuItem[] = [
  {
    id: 'seed-item-1',
    merchantId: 'user-seed-mer-active',
    name: 'كباب لحم غنم أربيلي فاخر',
    description: 'شياش كباب لحم غنم عراقي طازج مشوي على الفحم مع طماطة وبصل مشوي وخبز تنور',
    category: 'أطباق رئيسية',
    priceIqd: 12500,
    priceFormatted: '12,500 د.ع',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80',
    isAvailable: true,
    createdAt: 'اليوم',
  },
  {
    id: 'seed-item-2',
    merchantId: 'user-seed-mer-active',
    name: 'شيش طاووق دجاج مشوي',
    description: 'قطع صدور دجاج متبلة بالأعشاب والليمون مشوية على الفحم مع صلصة الثومية',
    category: 'أطباق رئيسية',
    priceIqd: 10000,
    priceFormatted: '10,000 د.ع',
    imageUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80',
    isAvailable: true,
    createdAt: 'اليوم',
  },
  {
    id: 'seed-item-3',
    merchantId: 'user-seed-mer-active',
    name: 'صحن مقبلات مشكلة أربيلية',
    description: 'حمص بطحينة، متبل باذنجان، بابا غنوج، وتبولة لبناني طازجة مع زيت الزيتون',
    category: 'مقبلات وسلطات',
    priceIqd: 4500,
    priceFormatted: '4,500 د.ع',
    imageUrl: 'https://images.unsplash.com/photo-1541518763669-27fef04b14e8?w=500&auto=format&fit=crop&q=80',
    isAvailable: true,
    createdAt: 'اليوم',
  },
  {
    id: 'seed-item-4',
    merchantId: 'user-seed-mer-active',
    name: 'سلطة الخيار باللبن والنعناع',
    description: 'قطع خيار طازج مع لبن أربيلي بلدي ونعناع مجفف ورشة زيت زيتون',
    category: 'مقبلات وسلطات',
    priceIqd: 3000,
    priceFormatted: '3,000 د.ع',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=80',
    isAvailable: true,
    createdAt: 'اليوم',
  },
  {
    id: 'seed-item-5',
    merchantId: 'user-seed-mer-active',
    name: 'كنافة أربيلية بالجبن البلدي',
    description: 'كنافة نابلسية ساخنة محشوة بالجبن البلدي ومسقية بالشيرة مع الفستق الحلبي',
    category: 'حلويات',
    priceIqd: 5000,
    priceFormatted: '5,000 د.ع',
    imageUrl: 'https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=500&auto=format&fit=crop&q=80',
    isAvailable: true,
    createdAt: 'اليوم',
  },
  {
    id: 'seed-item-6',
    merchantId: 'user-seed-mer-active',
    name: 'عصير رمان طبيعي طازج',
    description: 'عصير رمان فرِش طبيعي 100% بدون إضافة سكر أو ماء',
    category: 'مشروبات وعصائر',
    priceIqd: 2500,
    priceFormatted: '2,500 د.ع',
    imageUrl: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=500&auto=format&fit=crop&q=80',
    isAvailable: true,
    createdAt: 'اليوم',
  },
];

const SEED_POSTS: MerchantPost[] = [
  {
    id: 'seed-post-1',
    merchantId: 'user-seed-mer-active',
    title: '🔥 عرض المشويات العائلية - خصم 20%',
    content: 'احصل على خصم 20% عند طلب 4 وجبات كباب أربيلي مع صحن مقبلات مشكلة عائلية مجاناً!',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80',
    expiryDate: '2026-12-31',
    createdAt: 'اليوم',
    isPublished: true,
  },
];

export function getMenuItems(merchantId?: string): MenuItem[] {
  try {
    const raw = localStorage.getItem(MENU_ITEMS_KEY);
    if (!raw) {
      localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(SEED_MENU_ITEMS));
      if (merchantId) {
        return SEED_MENU_ITEMS.filter((i) => i.merchantId === merchantId || !i.merchantId);
      }
      return SEED_MENU_ITEMS;
    }
    const all = JSON.parse(raw) as MenuItem[];
    if (merchantId) {
      return all.filter((i) => i.merchantId === merchantId || !i.merchantId);
    }
    return all;
  } catch {
    return SEED_MENU_ITEMS;
  }
}


export function saveMenuItem(itemData: {
  id?: string;
  merchantId: string;
  name: string;
  description: string;
  category: string;
  priceIqd: number;
  imageUrl: string;
  isAvailable: boolean;
}): MenuItem {
  const all = getMenuItems();
  const nowStr = new Date().toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (itemData.id) {
    // Edit existing item
    const idx = all.findIndex((i) => i.id === itemData.id);
    if (idx !== -1) {
      const updated: MenuItem = {
        ...all[idx],
        name: itemData.name.trim(),
        description: itemData.description.trim(),
        category: itemData.category.trim() || 'عام',
        priceIqd: itemData.priceIqd,
        priceFormatted: formatIqd(itemData.priceIqd),
        imageUrl: itemData.imageUrl,
        isAvailable: itemData.isAvailable,
      };
      all[idx] = updated;
      localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(all));
      setDoc(doc(db, 'menu_items', updated.id), updated, { merge: true }).catch(() => {});
      notifyChange();
      return updated;
    }
  }

  // Create new item
  const newItem: MenuItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    merchantId: itemData.merchantId,
    name: itemData.name.trim(),
    description: itemData.description.trim(),
    category: itemData.category.trim() || 'عام',
    priceIqd: itemData.priceIqd,
    priceFormatted: formatIqd(itemData.priceIqd),
    imageUrl: itemData.imageUrl,
    isAvailable: itemData.isAvailable,
    createdAt: nowStr,
  };

  all.unshift(newItem);
  localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(all));
  setDoc(doc(db, 'menu_items', newItem.id), newItem, { merge: true }).catch(() => {});
  notifyChange();
  return newItem;
}

export function deleteMenuItem(itemId: string): boolean {
  try {
    const all = getMenuItems();
    const filtered = all.filter((i) => i.id !== itemId);
    if (filtered.length !== all.length) {
      localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(filtered));
      deleteDoc(doc(db, 'menu_items', itemId)).catch(() => {});
      notifyChange();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function toggleMenuItemAvailability(itemId: string): MenuItem | null {
  try {
    const all = getMenuItems();
    const idx = all.findIndex((i) => i.id === itemId);
    if (idx !== -1) {
      all[idx].isAvailable = !all[idx].isAvailable;
      localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(all));
      setDoc(doc(db, 'menu_items', itemId), all[idx], { merge: true }).catch(() => {});
      notifyChange();
      return all[idx];
    }
    return null;
  } catch {
    return null;
  }
}

/* ==========================================================================
   2. ORDERS STORE
   ========================================================================== */

export function getMerchantOrders(merchantId?: string): MerchantOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as MerchantOrder[];
    if (merchantId) {
      return all.filter((o) => o.merchantId === merchantId || !o.merchantId);
    }
    return all;
  } catch {
    return [];
  }
}

export function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): MerchantOrder | null {
  try {
    const all = getMerchantOrders();
    const idx = all.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      all[idx].status = newStatus;
      localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
      setDoc(doc(db, 'merchant_orders', orderId), all[idx], { merge: true }).catch(() => {});
      notifyChange();
      return all[idx];
    }
    return null;
  } catch {
    return null;
  }
}

// Helper to create a new order (e.g. when customer orders or for testing)
export function createMerchantOrder(orderData: {
  merchantId: string;
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  totalAmountIqd: number;
  deliveryAddress: string;
}): MerchantOrder {
  const all = getMerchantOrders();
  const orderNum = `#ORD-${Math.floor(100 + Math.random() * 900)}`;
  const nowStr = new Date().toLocaleTimeString('ar-IQ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const newOrder: MerchantOrder = {
    id: `ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    orderNumber: orderNum,
    merchantId: orderData.merchantId,
    customerName: orderData.customerName || 'زبون تكسيتي',
    customerPhone: orderData.customerPhone || '07501234567',
    items: orderData.items,
    totalAmountIqd: orderData.totalAmountIqd,
    totalAmountFormatted: formatIqd(orderData.totalAmountIqd),
    deliveryAddress: orderData.deliveryAddress,
    orderTime: nowStr,
    createdAt: new Date().toISOString(),
    status: 'new',
  };

  all.unshift(newOrder);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
  setDoc(doc(db, 'merchant_orders', newOrder.id), newOrder, { merge: true }).catch(() => {});
  notifyChange();
  return newOrder;
}

/* ==========================================================================
   3. POSTS STORE
   ========================================================================== */

export function getMerchantPosts(merchantId?: string): MerchantPost[] {
  try {
    const raw = localStorage.getItem(POSTS_KEY);
    if (!raw) {
      localStorage.setItem(POSTS_KEY, JSON.stringify(SEED_POSTS));
      if (merchantId) {
        return SEED_POSTS.filter((p) => p.merchantId === merchantId || !p.merchantId);
      }
      return SEED_POSTS;
    }
    const all = JSON.parse(raw) as MerchantPost[];
    if (merchantId) {
      return all.filter((p) => p.merchantId === merchantId || !p.merchantId);
    }
    return all;
  } catch {
    return SEED_POSTS;
  }
}

export function saveMerchantPost(postData: {
  id?: string;
  merchantId: string;
  title: string;
  content: string;
  imageUrl?: string;
  expiryDate?: string;
  isPublished?: boolean;
}): MerchantPost {
  const all = getMerchantPosts();
  const nowStr = new Date().toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (postData.id) {
    const idx = all.findIndex((p) => p.id === postData.id);
    if (idx !== -1) {
      const updated: MerchantPost = {
        ...all[idx],
        title: postData.title.trim(),
        content: postData.content.trim(),
        imageUrl: postData.imageUrl,
        expiryDate: postData.expiryDate,
        isPublished: postData.isPublished !== undefined ? postData.isPublished : all[idx].isPublished,
      };
      all[idx] = updated;
      localStorage.setItem(POSTS_KEY, JSON.stringify(all));
      setDoc(doc(db, 'merchant_posts', updated.id), updated, { merge: true }).catch(() => {});
      notifyChange();
      return updated;
    }
  }

  const newPost: MerchantPost = {
    id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    merchantId: postData.merchantId,
    title: postData.title.trim(),
    content: postData.content.trim(),
    imageUrl: postData.imageUrl,
    expiryDate: postData.expiryDate,
    createdAt: nowStr,
    isPublished: postData.isPublished !== undefined ? postData.isPublished : true,
  };

  all.unshift(newPost);
  localStorage.setItem(POSTS_KEY, JSON.stringify(all));
  setDoc(doc(db, 'merchant_posts', newPost.id), newPost, { merge: true }).catch(() => {});
  notifyChange();
  return newPost;
}

export function deleteMerchantPost(postId: string): boolean {
  try {
    const all = getMerchantPosts();
    const filtered = all.filter((p) => p.id !== postId);
    if (filtered.length !== all.length) {
      localStorage.setItem(POSTS_KEY, JSON.stringify(filtered));
      deleteDoc(doc(db, 'merchant_posts', postId)).catch(() => {});
      notifyChange();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function toggleMerchantPostPublished(postId: string): MerchantPost | null {
  try {
    const all = getMerchantPosts();
    const idx = all.findIndex((p) => p.id === postId);
    if (idx !== -1) {
      all[idx].isPublished = !all[idx].isPublished;
      localStorage.setItem(POSTS_KEY, JSON.stringify(all));
      setDoc(doc(db, 'merchant_posts', postId), all[idx], { merge: true }).catch(() => {});
      notifyChange();
      return all[idx];
    }
    return null;
  } catch {
    return null;
  }
}
