import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  ShoppingBag,
  Megaphone,
  LogOut,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Check,
  X,
  AlertCircle,
  Clock,
  MapPin,
  CheckCircle2,
  ChefHat,
  Bike,
  PackageCheck,
  DollarSign,
  Tag,
  ToggleLeft,
  ToggleRight,
  Store,
  Calendar,
  Upload,
  Menu,
  Wallet,
  Send,
  Building2,
  ArrowUpRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../types';
import { SideDrawer } from './SideDrawer';
import { SnappTrackingMap } from './SnappTrackingMap';
import {
  getUserWalletBalance,
  getMerchantWalletStats,
  createWithdrawalRequest,
  getWithdrawalRequests,
  subscribeToWalletStore,
  WithdrawalRequest,
} from '../lib/unifiedWalletStore';
import {
  getMenuItems,
  saveMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  getMerchantOrders,
  updateOrderStatus,
  createMerchantOrder,
  getMerchantPosts,
  saveMerchantPost,
  deleteMerchantPost,
  toggleMerchantPostPublished,
  subscribeToMerchantStore,
  MenuItem,
  MerchantOrder,
  MerchantPost,
  OrderStatus,
} from '../lib/merchantDatabase';

interface MerchantDashboardProps {
  currentLang?: Language;
  merchantName?: string;
  merchantLogo?: string;
  merchantId?: string;
  onLogout: () => void;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({
  currentLang = 'ar',
  merchantName = 'مطعم الكباب الأربيلية',
  merchantLogo,
  merchantId = 'merchant-default',
  onLogout,
}) => {
  // Side Drawer state
  const [isSideDrawerOpen, setIsSideDrawerOpen] = useState(false);
  const [displayedMerchantName, setDisplayedMerchantName] = useState(merchantName);

  useEffect(() => {
    setDisplayedMerchantName(merchantName);
  }, [merchantName]);

  // Active Tab state: 'menu' | 'orders' | 'posts' | 'wallet'
  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'posts' | 'wallet'>('menu');

  // Unified Store State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [posts, setPosts] = useState<MerchantPost[]>([]);

  // Merchant Wallet State
  const [merchantBalance, setMerchantBalance] = useState(() =>
    getUserWalletBalance(merchantId, 'merchant')
  );
  const [merchantStats, setMerchantStats] = useState(() =>
    getMerchantWalletStats(merchantId)
  );
  const [withdrawReqs, setWithdrawReqs] = useState<WithdrawalRequest[]>(() =>
    getWithdrawalRequests().filter(
      (r) => r.merchantId === merchantId || r.merchantName === displayedMerchantName
    )
  );
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [withdrawMsg, setWithdrawMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Menu Modal State
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [trackingModalOrder, setTrackingModalOrder] = useState<MerchantOrder | null>(null);

  // Menu Form Fields
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemCategory, setItemCategory] = useState('وجبات رئيسية');
  const [itemPrice, setItemPrice] = useState('');
  const [itemImage, setItemImage] = useState('');
  const [itemAvailable, setItemAvailable] = useState(true);

  // Post Modal State
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<MerchantPost | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState('');
  const [postExpiryDate, setPostExpiryDate] = useState('');

  // Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'item' | 'post';
    id: string;
    title: string;
  } | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync state from persistent merchantDatabase & wallet store
  const syncStoreData = () => {
    setMenuItems(getMenuItems(merchantId));
    setOrders(getMerchantOrders(merchantId));
    setPosts(getMerchantPosts(merchantId));
    setMerchantBalance(getUserWalletBalance(merchantId, 'merchant'));
    setMerchantStats(getMerchantWalletStats(merchantId));
    setWithdrawReqs(
      getWithdrawalRequests().filter(
        (r) => r.merchantId === merchantId || r.merchantName === displayedMerchantName
      )
    );
  };

  useEffect(() => {
    syncStoreData();
    const unsubMerchant = subscribeToMerchantStore(() => {
      syncStoreData();
    });
    const unsubWallet = subscribeToWalletStore(() => {
      syncStoreData();
    });
    return () => {
      unsubMerchant();
      unsubWallet();
    };
  }, [merchantId, displayedMerchantName]);

  // Handle Image File Upload to Base64 Data URL for Menu Item / Post
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setter(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Open modal for Adding / Editing Menu Item
  const handleOpenMenuItemModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemDescription(item.description);
      setItemCategory(item.category);
      setItemPrice(item.priceIqd.toString());
      setItemImage(item.imageUrl);
      setItemAvailable(item.isAvailable);
    } else {
      setEditingItem(null);
      setItemName('');
      setItemDescription('');
      setItemCategory('وجبات رئيسية');
      setItemPrice('');
      setItemImage('');
      setItemAvailable(true);
    }
    setIsMenuModalOpen(true);
  };

  // Save Menu Item
  const handleSaveMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemPrice) {
      alert('يرجى ملء اسم الصنف والسعر');
      return;
    }

    const priceNum = parseFloat(itemPrice.replace(/[^0-9.]/g, '')) || 0;

    saveMenuItem({
      id: editingItem?.id,
      merchantId,
      name: itemName,
      description: itemDescription,
      category: itemCategory,
      priceIqd: priceNum,
      imageUrl: itemImage,
      isAvailable: itemAvailable,
    });

    setIsMenuModalOpen(false);
    showToast(editingItem ? 'تم تعديل الصنف بنجاح!' : 'تم إضافة صنف جديد للمنيو بنجاح!');
  };

  // Toggle item availability directly
  const handleToggleAvailability = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = toggleMenuItemAvailability(itemId);
    if (updated) {
      showToast(updated.isAvailable ? 'أصبح الصنف متوفراً الآن 🟢' : 'تم تغيير الحالة إلى غير متوفر 🔴');
    }
  };

  // Confirm Delete Item
  const handleDeleteItem = (item: MenuItem) => {
    setDeleteConfirm({
      type: 'item',
      id: item.id,
      title: item.name,
    });
  };

  // Execute Delete
  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'item') {
      deleteMenuItem(deleteConfirm.id);
      showToast('تم حذف الصنف من المنيو بنجاح');
    } else if (deleteConfirm.type === 'post') {
      deleteMerchantPost(deleteConfirm.id);
      showToast('تم حذف المنشور بنجاح');
    }
    setDeleteConfirm(null);
  };

  // Advance Order Status
  const handleAdvanceOrderStatus = (order: MerchantOrder) => {
    let nextStatus: OrderStatus = 'preparing';
    if (order.status === 'new') nextStatus = 'preparing';
    else if (order.status === 'preparing') nextStatus = 'ready';
    else if (order.status === 'ready') nextStatus = 'delivered';
    else return;

    updateOrderStatus(order.id, nextStatus);

    const statusLabels = {
      preparing: 'تم نقل الطلب لحالة: قيد التحضير 🍳',
      ready: 'تم نقل الطلب لحالة: جاهز للتوصيل 🛵',
      delivered: 'تم تسليم الطلب بنجاح! 🏁',
    };
    showToast(statusLabels[nextStatus]);
  };

  // Create Test Order for Merchant Demonstration
  const handleCreateTestOrder = () => {
    const sampleItemsList = [
      [
        { name: 'كباب مشوي عراقي (وجبة)', quantity: 2, priceIqd: 12000 },
        { name: 'مقبلات مشكلة حمص وبابا غنوج', quantity: 1, priceIqd: 3500 },
        { name: 'عصير برتقال طبيعي', quantity: 2, priceIqd: 4000 },
      ],
      [
        { name: 'برجر لحم مضاعف مع الجبن', quantity: 1, priceIqd: 8500 },
        { name: 'بطاطا كريسبي عائلية', quantity: 1, priceIqd: 3000 },
      ],
      [
        { name: 'قوزي على تمن وزبيب', quantity: 1, priceIqd: 14000 },
        { name: 'بقلاوة بالفستق الحلبي', quantity: 1, priceIqd: 5000 },
      ],
    ];

    const randomSample = sampleItemsList[Math.floor(Math.random() * sampleItemsList.length)];
    const total = randomSample.reduce((acc, curr) => acc + curr.priceIqd * curr.quantity, 0);

    const names = ['أحمد الفتلاوي', 'زينب الكرخي', 'مصطفى العبيدي', 'بلال الموصلي'];
    const addresses = [
      'أربيل - حي الموظفين قرب الرعاية',
      'أربيل - مجمع القرية الإيطالية',
      'بغداد - المنصور شارع الرواد',
    ];

    createMerchantOrder({
      merchantId,
      customerName: names[Math.floor(Math.random() * names.length)],
      customerPhone: '07501234567',
      items: randomSample,
      totalAmountIqd: total,
      deliveryAddress: addresses[Math.floor(Math.random() * addresses.length)],
    });

    showToast('تمت إضافة طلب جديد تجريبي للقائمة 📬');
  };

  // Open modal for Adding / Editing Post
  const handleOpenPostModal = (post?: MerchantPost) => {
    if (post) {
      setEditingPost(post);
      setPostTitle(post.title);
      setPostContent(post.content);
      setPostImage(post.imageUrl || '');
      setPostExpiryDate(post.expiryDate || '');
    } else {
      setEditingPost(null);
      setPostTitle('');
      setPostContent('');
      setPostImage('');
      setPostExpiryDate('');
    }
    setIsPostModalOpen(true);
  };

  // Save Post
  const handleSavePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) {
      alert('يرجى كتابة عنوان وصف المنشور');
      return;
    }

    saveMerchantPost({
      id: editingPost?.id,
      merchantId,
      title: postTitle,
      content: postContent,
      imageUrl: postImage,
      expiryDate: postExpiryDate || undefined,
      isPublished: true,
    });

    setIsPostModalOpen(false);
    setEditingPost(null);
    setPostTitle('');
    setPostContent('');
    setPostImage('');
    setPostExpiryDate('');
    showToast(editingPost ? 'تم تعديل المنشور بنجاح! 📢' : 'تم نشر العرض/الإعلان بنجاح! 📢');
  };

  return (
    <div className="w-full flex flex-col space-y-5 text-[#f3efe6]">
      {/* Toast Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#2fa6a6] text-[#12131a] font-black text-xs font-cairo shadow-2xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Header: Merchant Logo, Name, Active Badge & Logout Button */}
      <div className="p-4 rounded-2xl bg-[#1b1d28] border border-[#2e3140] flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          {/* Menu Trigger Button */}
          <button
            type="button"
            onClick={() => setIsSideDrawerOpen(true)}
            id="merchant-open-side-menu-btn"
            title="القائمة الجانبية"
            className="w-10 h-10 rounded-xl bg-[#232634] hover:bg-[#2e3140] border border-[#2e3140] hover:border-[#b15fce]/60 text-[#f3efe6] hover:text-[#b15fce] flex items-center justify-center transition-all cursor-pointer shadow-md shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo / Avatar */}
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#b15fce]/30 to-[#7a3c94]/20 border border-[#b15fce]/50 flex items-center justify-center shrink-0 overflow-hidden shadow-md shadow-[#b15fce]/20">
            {merchantLogo ? (
              <img src={merchantLogo} alt={displayedMerchantName} className="w-full h-full object-cover" />
            ) : (
              <Store className="w-7 h-7 text-[#b15fce]" />
            )}
          </div>

          <div className="text-right">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[#f3efe6] font-cairo truncate max-w-[180px] sm:max-w-[240px]">
                {displayedMerchantName}
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] font-cairo flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                نشط
              </span>
            </div>
            <p className="text-[11px] text-[#9b98a6] font-cairo mt-0.5">
              لوحة تحكم إدارية • التاجر المعتمد
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={onLogout}
          id="merchant-logout-btn"
          className="px-3 py-2 rounded-xl bg-[#232634] hover:bg-red-500/20 text-[#9b98a6] hover:text-red-400 border border-[#2e3140] hover:border-red-500/40 text-xs font-bold font-cairo transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">خروج</span>
        </button>
      </div>

      {/* 2. Four Functional Tabs Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-[#1b1d28] border border-[#2e3140] rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('menu')}
          id="tab-merchant-menu"
          className={`py-2.5 px-2 rounded-xl font-extrabold text-xs font-cairo transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'menu'
              ? 'bg-gradient-to-r from-[#b15fce] to-[#7a3c94] text-white shadow-lg shadow-[#b15fce]/25 border border-[#b15fce]/40'
              : 'text-[#9b98a6] hover:text-[#f3efe6] hover:bg-[#232634]'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>المنيو</span>
          {menuItems.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-plex">
              {menuItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          id="tab-merchant-orders"
          className={`py-2.5 px-2 rounded-xl font-extrabold text-xs font-cairo transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-gradient-to-r from-[#b15fce] to-[#7a3c94] text-white shadow-lg shadow-[#b15fce]/25 border border-[#b15fce]/40'
              : 'text-[#9b98a6] hover:text-[#f3efe6] hover:bg-[#232634]'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>الطلبات</span>
          {orders.filter((o) => o.status !== 'delivered').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#e8a33d] text-[#12131a] font-bold text-[10px] font-plex">
              {orders.filter((o) => o.status !== 'delivered').length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          id="tab-merchant-posts"
          className={`py-2.5 px-2 rounded-xl font-extrabold text-xs font-cairo transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'posts'
              ? 'bg-gradient-to-r from-[#b15fce] to-[#7a3c94] text-white shadow-lg shadow-[#b15fce]/25 border border-[#b15fce]/40'
              : 'text-[#9b98a6] hover:text-[#f3efe6] hover:bg-[#232634]'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>المنشورات</span>
          {posts.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-plex">
              {posts.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wallet')}
          id="tab-merchant-wallet"
          className={`py-2.5 px-2 rounded-xl font-extrabold text-xs font-cairo transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'wallet'
              ? 'bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] shadow-lg border border-[#e8a33d]/40'
              : 'text-[#9b98a6] hover:text-[#f3efe6] hover:bg-[#232634]'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>الأرباح والمحفظة</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
            {merchantBalance.toLocaleString()} د.ع
          </span>
        </button>
      </div>

      {/* 3. TAB 1: MENU ITEMS (المنيو) */}
      {activeTab === 'menu' && (
        <div className="space-y-4">
          {/* Add New Item Button */}
          <button
            type="button"
            onClick={() => handleOpenMenuItemModal()}
            id="add-new-menu-item-btn"
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#e8a33d] via-[#da8f3c] to-[#c97b3d] text-[#12131a] font-extrabold text-sm font-cairo shadow-lg shadow-[#e8a33d]/20 hover:shadow-xl hover:shadow-[#e8a33d]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>إضافة صنف جديد للمنيو</span>
          </button>

          {/* Menu Items List */}
          {menuItems.length === 0 ? (
            /* Empty State */
            <div className="p-8 rounded-2xl bg-[#1b1d28] border border-[#2e3140] text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#b15fce]/15 text-[#b15fce] border border-[#b15fce]/30 flex items-center justify-center text-3xl shadow-lg">
                🍽️
              </div>
              <h3 className="text-base font-extrabold text-[#f3efe6] font-cairo">
                لا توجد أصناف بعد
              </h3>
              <p className="text-xs text-[#9b98a6] font-cairo max-w-xs mx-auto">
                أضف أول صنف لمنيوك ليتمكن الزبائن من استعراضه وطلبه من تطبيق تكسيتي.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl bg-[#1b1d28] border transition-all ${
                    item.isAvailable
                      ? 'border-[#2e3140] hover:border-[#b15fce]/40'
                      : 'border-[#2e3140]/60 opacity-60 bg-[#171922]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Item Image */}
                    <div className="w-18 h-18 rounded-xl bg-[#232634] border border-[#2e3140] overflow-hidden shrink-0 flex items-center justify-center relative">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UtensilsCrossed className="w-7 h-7 text-[#9b98a6]/50" />
                      )}
                      {!item.isAvailable && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-red-400 font-cairo bg-red-950/80 px-1.5 py-0.5 rounded">
                            غير متوفر
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 text-right min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-extrabold text-[#f3efe6] font-cairo truncate">
                          {item.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-[#b15fce]/15 text-[#b15fce] text-[10px] font-bold font-cairo shrink-0">
                          {item.category}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-xs text-[#9b98a6] font-cairo line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#2e3140]/60">
                        {/* Price */}
                        <span className="text-sm font-extrabold text-[#e8a33d] font-plex">
                          {item.priceFormatted}
                        </span>

                        {/* Actions: Available Toggle, Edit, Delete */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleToggleAvailability(item.id, e)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold font-cairo transition-all flex items-center gap-1 cursor-pointer ${
                              item.isAvailable
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/15 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {item.isAvailable ? (
                              <>
                                <ToggleRight className="w-4 h-4 text-emerald-400" />
                                <span>متوفر</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4 text-red-400" />
                                <span>غير متوفر</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenMenuItemModal(item)}
                            className="p-1.5 rounded-lg bg-[#232634] hover:bg-[#b15fce]/20 text-[#9b98a6] hover:text-[#b15fce] border border-[#2e3140] transition-colors cursor-pointer"
                            title="تعديل الصنف"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 rounded-lg bg-[#232634] hover:bg-red-500/20 text-[#9b98a6] hover:text-red-400 border border-[#2e3140] transition-colors cursor-pointer"
                            title="حذف الصنف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB 2: INCOMING ORDERS (الطلبات الواردة) */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Header Action: Add Test Order Button for Testing */}
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#9b98a6] font-cairo">
              طلبات الطعام القادمة لـ {merchantName}
            </h2>
            <button
              type="button"
              onClick={handleCreateTestOrder}
              id="create-test-merchant-order-btn"
              className="px-3 py-1.5 rounded-xl bg-[#232634] hover:bg-[#b15fce]/20 text-[#b15fce] border border-[#b15fce]/40 text-xs font-bold font-cairo transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ إضافة طلب تجريبي للاختبار</span>
            </button>
          </div>

          {/* Orders List */}
          {orders.length === 0 ? (
            /* Empty State */
            <div className="p-8 rounded-2xl bg-[#1b1d28] border border-[#2e3140] text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#e8a33d]/15 text-[#e8a33d] border border-[#e8a33d]/30 flex items-center justify-center text-3xl shadow-lg">
                📭
              </div>
              <h3 className="text-base font-extrabold text-[#f3efe6] font-cairo">
                لا توجد طلبات واردة حاليًا
              </h3>
              <p className="text-xs text-[#9b98a6] font-cairo max-w-xs mx-auto">
                ستظهر هنا الطلبات الجديدة الموجهة لمطعمك فور إرسالها من تطبيق الزبون.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                // Status styles configuration
                const statusConfig = {
                  new: {
                    label: 'طلب جديد',
                    bgColor: 'bg-[#e8a33d]/15',
                    textColor: 'text-[#e8a33d]',
                    borderColor: 'border-[#e8a33d]/40',
                    nextBtnLabel: 'بدء التحضير 🍳',
                    nextBtnClass: 'bg-[#e8a33d] hover:bg-[#d9922c] text-[#12131a]',
                  },
                  preparing: {
                    label: 'قيد التحضير',
                    bgColor: 'bg-[#2fa6a6]/15',
                    textColor: 'text-[#2fa6a6]',
                    borderColor: 'border-[#2fa6a6]/40',
                    nextBtnLabel: 'جاهز للتوصيل 🛵',
                    nextBtnClass: 'bg-[#2fa6a6] hover:bg-[#258d8d] text-[#12131a]',
                  },
                  ready: {
                    label: 'جاهز للتوصيل',
                    bgColor: 'bg-[#b15fce]/15',
                    textColor: 'text-[#b15fce]',
                    borderColor: 'border-[#b15fce]/40',
                    nextBtnLabel: 'تم التسليم 🏁',
                    nextBtnClass: 'bg-[#b15fce] hover:bg-[#9947b5] text-white',
                  },
                  delivered: {
                    label: 'تم التسليم',
                    bgColor: 'bg-emerald-500/15',
                    textColor: 'text-emerald-400',
                    borderColor: 'border-emerald-500/30',
                    nextBtnLabel: 'مكتمل بنجاح',
                    nextBtnClass: 'bg-[#232634] text-[#9b98a6]',
                  },
                };

                const currentConfig = statusConfig[order.status];
                const isDelivered = order.status === 'delivered';

                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-2xl bg-[#1b1d28] border transition-all ${
                      isDelivered ? 'border-[#2e3140]/60 opacity-60 bg-[#171922]' : 'border-[#2e3140]'
                    }`}
                  >
                    {/* Header: Order Number, Time & Status Badge */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#2e3140]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-[#f3efe6] font-plex">
                          {order.orderNumber}
                        </span>
                        <span className="text-[11px] text-[#9b98a6] font-cairo flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#9b98a6]" />
                          {order.orderTime}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold font-cairo border ${currentConfig.bgColor} ${currentConfig.textColor} ${currentConfig.borderColor}`}
                      >
                        {currentConfig.label}
                      </span>
                    </div>

                    {/* Customer Info & Address */}
                    <div className="py-2.5 space-y-1 text-right">
                      <p className="text-xs font-bold text-[#f3efe6] font-cairo">
                        الزبون: <span className="text-[#2fa6a6]">{order.customerName}</span> (
                        {order.customerPhone})
                      </p>
                      <p className="text-xs text-[#9b98a6] font-cairo flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#e8a33d] shrink-0" />
                        <span>{order.deliveryAddress}</span>
                      </p>
                    </div>

                    {/* Requested Items List */}
                    <div className="p-3 rounded-xl bg-[#12131a] border border-[#2e3140] space-y-1.5 text-right">
                      <span className="text-[10px] text-[#9b98a6] block font-cairo font-bold">
                        الأصناف المطلوبة:
                      </span>
                      <ul className="space-y-1 text-xs font-cairo">
                        {order.items.map((it, idx) => (
                          <li key={idx} className="flex items-center justify-between text-[#f3efe6]">
                            <span>
                              <strong className="text-[#e8a33d] font-plex ms-1">{it.quantity}×</strong>{' '}
                              {it.name}
                            </span>
                            <span className="text-[#9b98a6] font-plex text-[11px]">
                              {(it.priceIqd * it.quantity).toLocaleString()} د.ع
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Total Price & Single Dynamic Status Button */}
                    <div className="flex items-center justify-between pt-3">
                      <div>
                        <span className="text-[10px] text-[#9b98a6] block font-cairo">المبلغ الإجمالي</span>
                        <span className="text-base font-extrabold text-[#e8a33d] font-plex">
                          {order.totalAmountFormatted}
                        </span>
                      </div>

                      {/* Actions: Map Tracking & Status Advancement */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTrackingModalOrder(order)}
                          className="px-3 py-2 rounded-xl bg-[#232634] hover:bg-[#2e3140] text-[#2fa6a6] border border-[#2fa6a6]/40 text-xs font-bold font-cairo transition-all flex items-center gap-1 cursor-pointer shadow-md"
                          title="عرض موقع المندوب على الخارطة"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>تتبع الخارطة</span>
                        </button>

                        {!isDelivered ? (
                          <button
                            type="button"
                            onClick={() => handleAdvanceOrderStatus(order)}
                            className={`px-4 py-2 rounded-xl font-extrabold text-xs font-cairo transition-all shadow-md cursor-pointer ${currentConfig.nextBtnClass}`}
                          >
                            {currentConfig.nextBtnLabel}
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs font-cairo flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تم التسليم</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: POSTS & OFFERS (المنشورات والعروض) */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {/* Create Post Button with Amber-Bronze Gradient */}
          <button
            type="button"
            onClick={() => handleOpenPostModal()}
            id="add-new-post-btn"
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#e8a33d] via-[#da8f3c] to-[#c97b3d] text-[#12131a] font-extrabold text-sm font-cairo shadow-lg shadow-[#e8a33d]/20 hover:shadow-xl hover:shadow-[#e8a33d]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>+ إنشاء منشور جديد</span>
          </button>

          {posts.length === 0 ? (
            /* Empty State */
            <div className="p-8 rounded-2xl bg-[#1b1d28] border border-[#2e3140] text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#b15fce]/15 text-[#b15fce] border border-[#b15fce]/30 flex items-center justify-center text-3xl shadow-lg">
                📢
              </div>
              <h3 className="text-base font-extrabold text-[#f3efe6] font-cairo">
                لا توجد منشورات بعد، أنشئ أول منشور لك!
              </h3>
              <p className="text-xs text-[#9b98a6] font-cairo max-w-xs mx-auto">
                شارك عروضك اليومية أو أطباقك الجديدة لتظهر للزبائن عند تصفح صفحة مطعلك.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {posts.map((post) => {
                // Check if post is expired
                const isExpired =
                  post.expiryDate &&
                  new Date(post.expiryDate) < new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <div
                    key={post.id}
                    className={`p-4 rounded-2xl bg-[#1b1d28] border transition-all space-y-3 text-right ${
                      isExpired
                        ? 'border-[#2e3140]/60 opacity-60 bg-[#171922]'
                        : 'border-[#2e3140] hover:border-[#b15fce]/40'
                    }`}
                  >
                    {/* Top Image (Fixed Height, Object Cover) */}
                    {post.imageUrl ? (
                      <div className="w-full h-44 rounded-xl overflow-hidden bg-[#232634] border border-[#2e3140] relative">
                        <img
                          src={post.imageUrl}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                        {isExpired && (
                          <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-red-950/90 border border-red-500/50 text-red-400 font-extrabold text-[10px] font-cairo shadow-lg flex items-center gap-1">
                            <span>منتهي 🔴</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-24 rounded-xl bg-gradient-to-r from-[#b15fce]/20 to-[#7a3c94]/10 border border-[#b15fce]/30 flex items-center justify-center relative">
                        <Megaphone className="w-8 h-8 text-[#b15fce]/60" />
                        {isExpired && (
                          <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-red-950/90 border border-red-500/50 text-red-400 font-extrabold text-[10px] font-cairo shadow-lg">
                            <span>منتهي 🔴</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Header: Title & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-[#f3efe6] font-cairo">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {post.expiryDate && !isExpired && (
                          <span className="px-2 py-0.5 rounded-md bg-[#e8a33d]/15 border border-[#e8a33d]/30 text-[#e8a33d] text-[10px] font-bold font-cairo flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>ينتهي: {post.expiryDate}</span>
                          </span>
                        )}
                        {isExpired && !post.imageUrl && (
                          <span className="px-2 py-0.5 rounded-md bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-extrabold font-cairo">
                            منتهي 🔴
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content Description */}
                    <p className="text-xs text-[#9b98a6] font-cairo leading-relaxed">
                      {post.content}
                    </p>

                    {/* Footer Info: Publication Date & Action Buttons */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-[#2e3140]/60">
                      {/* Publication Date in IBM Plex Mono */}
                      <div className="flex items-center gap-1 text-[11px] text-[#9b98a6] font-plex">
                        <Calendar className="w-3.5 h-3.5 text-[#b15fce]" />
                        <span>تاريخ النشر: {post.createdAt}</span>
                      </div>

                      {/* Small Round Action Buttons: Edit & Delete */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPostModal(post)}
                          className="w-8 h-8 rounded-full bg-[#232634] hover:bg-[#b15fce]/20 text-[#9b98a6] hover:text-[#b15fce] border border-[#2e3140] transition-colors flex items-center justify-center cursor-pointer"
                          title="تعديل المنشور"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirm({
                              type: 'post',
                              id: post.id,
                              title: post.title,
                            })
                          }
                          className="w-8 h-8 rounded-full bg-[#232634] hover:bg-red-500/20 text-[#9b98a6] hover:text-red-400 border border-[#2e3140] transition-colors flex items-center justify-center cursor-pointer"
                          title="حذف المنشور"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 4: WALLET & FINANCIAL EARNINGS (الأرباح والمحفظة) */}
      {activeTab === 'wallet' && (
        <div className="space-y-4">
          {/* Financial Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Net Available Wallet Balance */}
            <div className="bg-gradient-to-r from-[#1b1d28] to-[#232634] border border-[#e8a33d]/50 rounded-2xl p-4 shadow-xl relative overflow-hidden text-right">
              <span className="text-xs font-bold text-[#9b98a6] block mb-1">الرصيد المتاح حالياً للسحب</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[#f3efe6] font-mono">
                  {merchantBalance.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-[#e8a33d]">د.ع</span>
              </div>
              <span className="text-[10px] text-emerald-400 block mt-2 font-bold">
                ✓ جاهز للتحويل الفوري إلى حسابك البنكي
              </span>
            </div>

            {/* Total Gross Sales */}
            <div className="bg-[#1b1d28] border border-[#2e3140] rounded-2xl p-4 text-right shadow-lg">
              <span className="text-xs font-bold text-[#9b98a6] block mb-1">إجمالي المبيعات (الطلبات)</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[#f3efe6] font-mono">
                  {merchantStats.grossEarnings.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-[#9b98a6]">د.ع</span>
              </div>
              <span className="text-[10px] text-[#9b98a6] block mt-2">
                مجموع أرباح الوجبات والمأكولات
              </span>
            </div>

            {/* Platform Commission 10% */}
            <div className="bg-[#1b1d28] border border-[#2e3140] rounded-2xl p-4 text-right shadow-lg">
              <span className="text-xs font-bold text-[#9b98a6] block mb-1">عمولة المنصة والتطبيق (10%)</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-400 font-mono">
                  {merchantStats.platformCommission.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-400">د.ع</span>
              </div>
              <span className="text-[10px] text-[#9b98a6] block mt-2">
                تُخصم تلقائياً لصالح الإدارة
              </span>
            </div>
          </div>

          {/* Withdrawal Request Form & Previous Requests */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Withdrawal Request Form */}
            <div className="bg-[#1b1d28] border border-[#2e3140] rounded-2xl p-4 space-y-3 text-right shadow-lg">
              <h3 className="text-sm font-extrabold text-[#f3efe6] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#e8a33d]" />
                <span>تقديم طلب سحب أرباح إلى حسابك البنكي / كي كارد</span>
              </h3>

              {withdrawMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    withdrawMsg.type === 'success'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/15 text-red-400 border border-red-500/30'
                  }`}
                >
                  {withdrawMsg.text}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setWithdrawMsg(null);
                  const amt = parseFloat(withdrawAmount.replace(/[^0-9.]/g, '')) || 0;
                  if (amt <= 0) {
                    setWithdrawMsg({ type: 'error', text: 'يرجى إدخال مبلغ صحيح أكبر من صفر.' });
                    return;
                  }
                  if (!bankDetails.trim()) {
                    setWithdrawMsg({ type: 'error', text: 'يرجى إدخال رقم الحساب البنكي أو الكارد لتسلم المبلغ.' });
                    return;
                  }

                  const res = createWithdrawalRequest({
                    merchantId,
                    merchantName: displayedMerchantName,
                    amount: amt,
                    bankAccountDetails: bankDetails,
                  });

                  if (res.success) {
                    setWithdrawMsg({
                      type: 'success',
                      text: 'تم تقديم طلب السحب بنجاح! سيتم تحويل المبلغ لحسابك بعد موافقة الأدمن.',
                    });
                    setWithdrawAmount('');
                    syncStoreData();
                  } else {
                    setWithdrawMsg({ type: 'error', text: res.errorMsg || 'فشل إرسال طلب السحب.' });
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="text-xs font-bold text-[#9b98a6] block mb-1">
                    المبلغ المراد سحبه (د.ع):
                  </label>
                  <input
                    type="text"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="مثال: 50000"
                    className="w-full h-11 px-3.5 bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-xs font-mono font-bold text-[#f3efe6] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#9b98a6] block mb-1">
                    تفاصيل التحويل (رقم الحساب البنكي / كي كارد / ماستر رافدين):
                  </label>
                  <textarea
                    rows={2}
                    value={bankDetails}
                    onChange={(e) => setBankDetails(e.target.value)}
                    placeholder="كي كارد / ماستر رافدين: 5284 **** **** 9012 باسم مطعم الكباب الأربيلية..."
                    className="w-full p-3 bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-xs text-[#f3efe6] outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] font-black text-xs font-cairo shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال طلب السحب للإدارة 🚀</span>
                </button>
              </form>
            </div>

            {/* Previous Requests Tracker */}
            <div className="bg-[#1b1d28] border border-[#2e3140] rounded-2xl p-4 space-y-3 text-right shadow-lg flex flex-col">
              <h3 className="text-sm font-extrabold text-[#f3efe6] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2fa6a6]" />
                <span>حالة طلبات السحب السابقة ({withdrawReqs.length})</span>
              </h3>

              {withdrawReqs.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-6 text-xs text-[#9b98a6] bg-[#12131a] rounded-xl border border-[#2e3140]">
                  لا توجد طلبات سحب سابقة أرسلت للإدارة.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                  {withdrawReqs.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-xl bg-[#12131a] border border-[#2e3140] flex items-center justify-between text-xs"
                    >
                      <div className="text-right">
                        <span className="font-extrabold text-[#f3efe6] block font-mono">
                          {req.amount.toLocaleString()} د.ع
                        </span>
                        <span className="text-[10px] text-[#9b98a6] block mt-0.5">
                          {req.requestDate}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            req.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : req.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-red-500/20 text-red-400 border border-red-500/40'
                          }`}
                        >
                          {req.status === 'pending'
                            ? '⏳ قيد المراجعة'
                            : req.status === 'approved'
                            ? '✅ تم التحويل'
                            : '❌ مرفوض'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: ADD / EDIT MENU ITEM */}
      <AnimatePresence>
        {isMenuModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[#1b1d28] border border-[#2e3140] rounded-3xl p-5 shadow-2xl space-y-4 my-auto"
            >
              <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
                <h3 className="text-base font-extrabold text-[#f3efe6] font-cairo flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-[#b15fce]" />
                  <span>{editingItem ? 'تعديل صنف المنيو' : 'إضافة صنف جديد للمنيو'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsMenuModalOpen(false)}
                  className="p-1 rounded-xl hover:bg-[#232634] text-[#9b98a6] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveMenuItem} className="space-y-3.5 text-right">
                {/* Image Upload Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#9b98a6] font-cairo">
                    صورة الصنف
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-[#232634] border border-[#2e3140] overflow-hidden flex items-center justify-center shrink-0">
                      {itemImage ? (
                        <img src={itemImage} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-[#9b98a6]" />
                      )}
                    </div>
                    <label className="flex-1 p-3 bg-[#232634] hover:bg-[#2e3140] border border-[#2e3140] rounded-xl text-center text-xs font-bold text-[#b15fce] font-cairo cursor-pointer transition-colors">
                      <span>{itemImage ? 'تغيير الصورة 📷' : 'رفع صورة من الجهاز 📷'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, setItemImage)}
                      />
                    </label>
                  </div>
                </div>

                {/* Item Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#9b98a6] font-cairo">
                    اسم الصنف *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="مثال: كباب عراقي مشوي، بيتزا رويال"
                    className="w-full h-11 px-3.5 bg-[#12131a] border border-[#2e3140] focus:border-[#b15fce] rounded-xl text-xs font-cairo text-[#f3efe6] outline-none"
                  />
                </div>

                {/* Category Selection */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#9b98a6] font-cairo">
                    التصنيف
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full h-11 px-3.5 bg-[#12131a] border border-[#2e3140] focus:border-[#b15fce] rounded-xl text-xs font-cairo text-[#f3efe6] outline-none"
                  >
                    <option value="وجبات رئيسية">وجبات رئيسية 🍲</option>
                    <option value="مشويات">مشويات 🥩</option>
                    <option value="مقبلات وسلطات">مقبلات وسلطات 🥗</option>
                    <option value="حلويات">حلويات 🍰</option>
                    <option value="مشروبات وعصائر">مشروبات وعصائر 🥤</option>
                    <option value="وجبات سريعة">وجبات سريعة 🍔</option>
                  </select>
                </div>

                {/* Price in IQD */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#9b98a6] font-cairo">
                    السعر (بالدينار العراقي - د.ع) *
                  </label>
                  <input
                    type="number"
                    required
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="مثال: 7500"
                    className="w-full h-11 px-3.5 bg-[#12131a] border border-[#2e3140] focus:border-[#b15fce] rounded-xl text-xs font-plex text-[#f3efe6] outline-none text-right"
                  />
                </div>

                {/* Brief Description */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#9b98a6] font-cairo">
                    وصف مختصر للصنف
                  </label>
                  <textarea
                    rows={2}
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    placeholder="مكونات الوجبة، طريقة الطهي، الحجم..."
                    className="w-full p-3 bg-[#12131a] border border-[#2e3140] focus:border-[#b15fce] rounded-xl text-xs font-cairo text-[#f3efe6] outline-none resize-none"
                  />
                </div>

                {/* Availability Switch */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#12131a] border border-[#2e3140]">
                  <span className="text-xs font-bold text-[#f3efe6] font-cairo">متوفر الآن بالمنيو</span>
                  <button
                    type="button"
                    onClick={() => setItemAvailable(!itemAvailable)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold font-cairo transition-all cursor-pointer ${
                      itemAvailable ? 'bg-emerald-500 text-[#12131a]' : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {itemAvailable ? 'نعم (متوفر)' : 'لا (غير متوفر)'}
                  </button>
                </div>

                {/* Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] font-extrabold text-xs font-cairo cursor-pointer"
                  >
                    حفظ الصنف
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMenuModalOpen(false)}
                    className="px-4 py-3 rounded-xl bg-[#232634] text-[#9b98a6] font-bold text-xs font-cairo cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. MODAL: ADD / EDIT POST */}
      <AnimatePresence>
        {isPostModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[#1b1d28] border border-[#2e3140] rounded-3xl p-5 shadow-2xl space-y-4 my-auto text-right"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
                <h3 className="text-base font-extrabold text-[#f3efe6] font-cairo flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-[#b15fce]" />
                  <span>{editingPost ? 'تعديل المنشور' : 'إنشاء منشور جديد'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsPostModalOpen(false);
                    setEditingPost(null);
                  }}
                  className="p-1 rounded-xl hover:bg-[#232634] text-[#9b98a6] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePost} className="space-y-3.5">
                {/* 1. Actual File Input for Image Upload with Thumbnail Preview */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#9b98a6] font-cairo">
                    صورة المنشور / العرض
                  </label>

                  {postImage ? (
                    <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-[#12131a] border border-[#2e3140] group">
                      <img
                        src={postImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label className="px-3 py-1.5 rounded-xl bg-[#b15fce] text-white font-bold text-xs font-cairo cursor-pointer hover:bg-[#914db0] transition-colors">
                          تغيير الصورة 📷
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, setPostImage)}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setPostImage('')}
                          className="px-3 py-1.5 rounded-xl bg-red-500/80 text-white font-bold text-xs font-cairo hover:bg-red-600 transition-colors cursor-pointer"
                        >
                          إزالة
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-[#2e3140] hover:border-[#b15fce] transition-colors rounded-2xl p-5 text-center cursor-pointer flex flex-col items-center justify-center gap-2 bg-[#12131a]/60">
                      <div className="w-10 h-10 rounded-full bg-[#b15fce]/15 text-[#b15fce] flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#f3efe6] font-cairo">
                          اضغط لاختيار صورة
                        </p>
                        <p className="text-[10px] text-[#9b98a6] font-cairo mt-0.5">
                          PNG, JPG أو WEBP (اختياري)
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, setPostImage)}
                      />
                    </label>
                  )}
                </div>

                {/* 2. Title Field */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#9b98a6] font-cairo">
                    عنوان المنشور *
                  </label>
                  <input
                    type="text"
                    required
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="مثال: خصم 25% على المشويات العائلية"
                    className="w-full h-11 px-3.5 bg-[#12131a] border border-[#2e3140] focus:border-[#b15fce] rounded-xl text-xs font-cairo text-[#f3efe6] outline-none"
                  />
                </div>

                {/* 3. Description Field */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#9b98a6] font-cairo">
                    وصف مختصر *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="اكتب تفاصيل العرض، الشروط، الساعات المتاحة..."
                    className="w-full p-3 bg-[#12131a] border border-[#2e3140] focus:border-[#b15fce] rounded-xl text-xs font-cairo text-[#f3efe6] outline-none resize-none"
                  />
                </div>

                {/* 4. Expiry Date Field (Optional) */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#9b98a6] font-cairo">
                    تاريخ انتهاء العرض (اختياري)
                  </label>
                  <input
                    type="date"
                    value={postExpiryDate}
                    onChange={(e) => setPostExpiryDate(e.target.value)}
                    className="w-full h-11 px-3.5 bg-[#12131a] border border-[#2e3140] focus:border-[#b15fce] rounded-xl text-xs font-plex text-[#f3efe6] outline-none text-right"
                  />
                </div>

                {/* 5. Publish / Save Button */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#e8a33d] via-[#da8f3c] to-[#c97b3d] text-[#12131a] font-extrabold text-xs font-cairo shadow-lg shadow-[#e8a33d]/20 cursor-pointer"
                  >
                    {editingPost ? 'حفظ التعديلات' : 'نشر المنشور'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPostModalOpen(false);
                      setEditingPost(null);
                    }}
                    className="px-4 py-3 rounded-xl bg-[#232634] text-[#9b98a6] font-bold text-xs font-cairo cursor-pointer hover:bg-[#2e3140] transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. CONFIRMATION MODAL (DELETE) */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm bg-[#1b1d28] border border-red-500/30 rounded-3xl p-5 text-center space-y-4 my-auto">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-500/15 text-red-400 border border-red-500/30 flex items-center justify-center text-xl">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#f3efe6] font-cairo">
                  تأكيد عملية الحذف
                </h3>
                <p className="text-xs text-[#9b98a6] font-cairo mt-1">
                  هل أنت تأكد من حذف <strong className="text-red-400">"{deleteConfirm.title}"</strong>؟ لا يمكن التراجع بعد ذلك.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-extrabold text-xs font-cairo cursor-pointer"
                >
                  نعم، احذف
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#232634] text-[#9b98a6] font-bold text-xs font-cairo cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Courier Map Tracking Modal */}
      <AnimatePresence>
        {trackingModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#1b1d28] border border-[#2e3140] rounded-3xl p-5 shadow-2xl space-y-4 text-right font-cairo dir-rtl"
              dir="rtl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#2e3140]">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-[#2fa6a6]/20 text-[#2fa6a6]">
                    <Bike className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#f3efe6]">
                      تتبع المندوب للطلب #{trackingModalOrder.orderNumber}
                    </h3>
                    <p className="text-xs text-[#9b98a6]">
                      الزبون: {trackingModalOrder.customerName} ({trackingModalOrder.deliveryAddress})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTrackingModalOrder(null)}
                  className="p-1.5 rounded-xl bg-[#232634] text-[#9b98a6] hover:text-[#f3efe6] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Snapp Tracking Map */}
              <SnappTrackingMap
                pickupPoint={{
                  lat: 36.1910,
                  lng: 44.0090,
                  name: `مطعم ${displayedMerchantName}`,
                }}
                destinationPoint={{
                  lat: 36.1980,
                  lng: 44.0200,
                  name: trackingModalOrder.deliveryAddress || 'عنوان التسليم',
                }}
                driverData={{
                  driverId: 'courier-merchant-view',
                  driverName: 'مندوب التوصيل المعتمد',
                  phone: '07709876543',
                  vehicleDetails: 'دراجة شحن وتوصيل',
                  rating: '4.9',
                  lat: trackingModalOrder.status === 'delivered' ? 36.1980 : (trackingModalOrder.status === 'ready' ? 36.1950 : 36.1920),
                  lng: trackingModalOrder.status === 'delivered' ? 44.0200 : (trackingModalOrder.status === 'ready' ? 44.0150 : 44.0100),
                  heading: 45,
                  speedKmH: 35,
                }}
                tripPhase={trackingModalOrder.status === 'delivered' ? 'completed' : (trackingModalOrder.status === 'ready' ? 'in_trip' : 'en_route_to_pickup')}
                role="merchant"
                mapHeight="360px"
                title={`خارطة تتبع المندوب المباشرة — ${displayedMerchantName}`}
              />

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setTrackingModalOrder(null)}
                  className="px-5 py-2 rounded-xl bg-[#232634] text-[#f3efe6] font-bold text-xs cursor-pointer hover:bg-[#2e3140]"
                >
                  إغلاق الخارطة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Side Menu Drawer */}
      <SideDrawer
        isOpen={isSideDrawerOpen}
        onClose={() => setIsSideDrawerOpen(false)}
        userId={merchantId}
        userName={displayedMerchantName}
        accountType="merchant"
        currentLang={currentLang}
        onLogout={onLogout}
        onProfileUpdated={(newName) => {
          setDisplayedMerchantName(newName);
        }}
      />
    </div>
  );
};
