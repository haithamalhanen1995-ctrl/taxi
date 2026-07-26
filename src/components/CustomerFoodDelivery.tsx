import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  X,
  ArrowLeft,
  Clock,
  Check,
  MapPin,
  Store,
  Flame,
  ChefHat,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Bike,
  UtensilsCrossed,
  PhoneCall,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../types';
import {
  getPricingConfig,
  calculateDeliveryBasePrice,
  PRICING_UPDATED_EVENT,
} from '../lib/pricingEngine';
import {
  getCustomerWalletBalance,
  deductCustomerWallet,
} from '../lib/customerWalletStore';
import {
  getActiveMerchantsFromDatabase,
  UserRecord,
} from '../lib/userDatabase';
import {
  getMenuItems,
  getMerchantPosts,
  createMerchantOrder,
  getMerchantOrders,
  subscribeToMerchantStore,
  MenuItem,
  MerchantOrder,
  MerchantPost,
  formatIqd,
  OrderStatus,
} from '../lib/merchantDatabase';

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface CustomerFoodDeliveryProps {
  customerName: string;
  currentLang: Language;
}

export const CustomerFoodDelivery: React.FC<CustomerFoodDeliveryProps> = ({
  customerName,
  currentLang,
}) => {
  // Navigation & View State
  const [subView, setSubView] = useState<
    'browsing' | 'restaurant_details' | 'cart_review' | 'checkout' | 'tracking'
  >('browsing');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Merchant State
  const [selectedMerchant, setSelectedMerchant] = useState<UserRecord | null>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Checkout Address & Payment Method State
  const [deliveryAddress, setDeliveryAddress] = useState(
    'أربيل - شارع 100م - قرب فاميلي مول'
  );
  const [foodPayMethod, setFoodPayMethod] = useState<'cash' | 'wallet'>('cash');

  // Active Order State
  const [activeOrder, setActiveOrder] = useState<MerchantOrder | null>(null);

  // Database State
  const [merchants, setMerchants] = useState<UserRecord[]>([]);
  const [posts, setPosts] = useState<MerchantPost[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Load and subscribe to real-time unified store changes
  useEffect(() => {
    const reloadData = () => {
      const activeMers = getActiveMerchantsFromDatabase();
      setMerchants(activeMers);

      const allP = getMerchantPosts();
      setPosts(allP);

      const allM = getMenuItems();
      setMenuItems(allM);

      // If customer has an active order being tracked, update it live
      if (activeOrder) {
        const latestOrders = getMerchantOrders(activeOrder.merchantId);
        const updated = latestOrders.find((o) => o.id === activeOrder.id);
        if (updated) {
          setActiveOrder(updated);
        }
      }
    };

    reloadData();
    const unsubscribe = subscribeToMerchantStore(reloadData);
    return () => unsubscribe();
  }, [activeOrder?.id]);

  // Derived: Active non-expired promotional posts
  const activePromotions = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return posts.filter((p) => {
      if (!p.isPublished) return false;
      if (p.expiryDate && p.expiryDate < todayStr) return false;
      return true;
    });
  }, [posts]);

  // Filtered merchants based on search query
  const filteredMerchants = useMemo(() => {
    if (!searchQuery.trim()) return merchants;
    const q = searchQuery.trim().toLowerCase();
    return merchants.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        (m.address && m.address.toLowerCase().includes(q))
    );
  }, [merchants, searchQuery]);

  // Total Items & Total Amount in Cart
  const totalCartItems = useMemo(() => {
    return cart.reduce((sum, ci) => sum + ci.quantity, 0);
  }, [cart]);

  const totalCartPrice = useMemo(() => {
    return cart.reduce((sum, ci) => sum + ci.item.priceIqd * ci.quantity, 0);
  }, [cart]);

  // Dynamic Delivery Fee calculated via Pricing Engine
  const deliveryFeeCalculation = useMemo(() => {
    // Estimated distance to selected restaurant (3.5 km default)
    return calculateDeliveryBasePrice({ distanceKm: 3.5 });
  }, []);
  const calculatedDeliveryFee = deliveryFeeCalculation.deliveryFee;

  // Add Item to Cart
  const handleAddToCart = (item: MenuItem) => {
    if (!item.isAvailable) return;
    setCart((prev) => {
      const existingIdx = prev.findIndex((ci) => ci.item.id === item.id);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      } else {
        return [...prev, { item, quantity: 1 }];
      }
    });
  };

  // Adjust Quantity in Cart
  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((ci) => {
          if (ci.item.id === itemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Remove Item from Cart
  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.item.id !== itemId));
  };

  // Open Restaurant Details View
  const handleOpenRestaurant = (merchant: UserRecord) => {
    setSelectedMerchant(merchant);
    setSubView('restaurant_details');
  };

  // Open Restaurant Details from Promotional Post
  const handleOpenRestaurantFromPost = (merchantId: string) => {
    const found = merchants.find((m) => m.id === merchantId);
    if (found) {
      setSelectedMerchant(found);
      setSubView('restaurant_details');
    } else if (merchants.length > 0) {
      setSelectedMerchant(merchants[0]);
      setSubView('restaurant_details');
    }
  };

  // Confirm Order & Submit to Merchant Database
  const handleConfirmOrder = () => {
    if (!selectedMerchant || cart.length === 0) return;

    if (!deliveryAddress.trim()) {
      alert('يرجى كتابة عنوان التوصيل');
      return;
    }

    const grandTotal = totalCartPrice + calculatedDeliveryFee;

    if (foodPayMethod === 'wallet') {
      const currentBal = getCustomerWalletBalance(customerName || 'زبون تكسي الأمان');
      if (currentBal < grandTotal) {
        alert(`رصيد المحفظة (${currentBal.toLocaleString()} د.ع) غير كافٍ لسداد قيمة الطلب (${grandTotal.toLocaleString()} د.ع). يرجى اختيار الدفع النقدي أو شحن المحفظة.`);
        return;
      }
      deductCustomerWallet({
        customerId: customerName || 'زبون تكسي الأمان',
        amount: grandTotal,
        title: `دفع طلب طعام من ${selectedMerchant.fullName}`,
        type: 'food_payment',
      });
    }

    // Prepare order items
    const orderItems = cart.map((ci) => ({
      itemId: ci.item.id,
      name: ci.item.name,
      quantity: ci.quantity,
      priceIqd: ci.item.priceIqd,
    }));

    // Create persistent order
    const created = createMerchantOrder({
      merchantId: selectedMerchant.id,
      customerName: customerName || 'زبون تكسي الأمان',
      items: orderItems,
      totalAmountIqd: totalCartPrice,
      deliveryAddress: deliveryAddress.trim(),
    });

    setActiveOrder(created);
    setCart([]);
    setSubView('tracking');
  };

  // Selected Merchant Menu Items grouped by Category
  const merchantMenuItems = useMemo(() => {
    if (!selectedMerchant) return [];
    return menuItems.filter(
      (mi) => mi.merchantId === selectedMerchant.id || !mi.merchantId
    );
  }, [menuItems, selectedMerchant]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(merchantMenuItems.map((i) => i.category || 'عام')));
    return cats.length > 0 ? cats : ['أطباق رئيسية', 'مقبلات وسلطات', 'حلويات', 'مشروبات وعصائر'];
  }, [merchantMenuItems]);

  return (
    <div className="w-full flex flex-col dir-rtl space-y-4" dir="rtl">
      {/* =========================================================================
         VIEW 1: BROWSING RESTAURANTS (تصفح المطاعم)
         ========================================================================= */}
      {subView === 'browsing' && (
        <div className="space-y-4">
          {/* 1. Live Search Input */}
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن مطعم، وجبة، أو منطقة..."
              id="restaurant-search-input"
              className="w-full h-11 pr-10 pl-4 bg-[#1b1d28] border border-[#2e3140] focus:border-[#e8a33d] rounded-2xl text-xs font-cairo text-[#f3efe6] placeholder-[#9b98a6] outline-none transition-all shadow-md"
            />
            <Search className="w-4 h-4 text-[#9b98a6] absolute right-3.5 top-3.5" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-3 text-[#9b98a6] hover:text-[#f3efe6]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 2. Promotional Offers Carousel (🔥 عروض اليوم) */}
          {activePromotions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-extrabold text-[#f3efe6] font-cairo flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-[#e8a33d] animate-pulse" />
                  <span>🔥 عروض اليوم المميزة</span>
                </h2>
                <span className="text-[10px] text-[#b15fce] font-cairo font-bold">
                  خصومات حصرية
                </span>
              </div>

              {/* Horizontal Scroll Row */}
              <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x">
                {activePromotions.map((post) => {
                  const postMerchant = merchants.find((m) => m.id === post.merchantId);
                  return (
                    <motion.div
                      key={post.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOpenRestaurantFromPost(post.merchantId)}
                      className="min-w-[220px] max-w-[240px] bg-[#1b1d28] border border-[#2e3140] hover:border-[#e8a33d]/50 rounded-2xl p-3 shrink-0 cursor-pointer shadow-lg space-y-2 snap-start"
                    >
                      {post.imageUrl ? (
                        <div className="w-full h-24 rounded-xl overflow-hidden bg-[#232634] relative">
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                          <span className="absolute bottom-1.5 right-2 text-[10px] font-bold text-white font-cairo bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md">
                            {postMerchant?.fullName || 'مطعم أربيلي'}
                          </span>
                        </div>
                      ) : (
                        <div className="w-full h-20 rounded-xl bg-gradient-to-r from-[#e8a33d]/20 to-[#da8f3c]/10 border border-[#e8a33d]/30 flex flex-col items-center justify-center p-2 text-center">
                          <Sparkles className="w-5 h-5 text-[#e8a33d] mb-1" />
                          <span className="text-[10px] font-bold text-[#e8a33d] font-cairo">
                            {postMerchant?.fullName || 'عرض خاص'}
                          </span>
                        </div>
                      )}

                      <div>
                        <h3 className="text-xs font-extrabold text-[#f3efe6] font-cairo line-clamp-1">
                          {post.title}
                        </h3>
                        <p className="text-[10px] text-[#9b98a6] font-cairo line-clamp-2 mt-0.5">
                          {post.content}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Merchants List Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-extrabold text-[#f3efe6] font-cairo flex items-center gap-1.5">
                <Store className="w-4 h-4 text-[#b15fce]" />
                <span>المطاعم المتاحة للتوصيل</span>
              </h2>
              <span className="text-[10px] text-[#9b98a6] font-cairo">
                {filteredMerchants.length} مطعم
              </span>
            </div>

            {filteredMerchants.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#1b1d28] border border-[#2e3140] text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#232634] text-3xl flex items-center justify-center mx-auto">
                  🍽️
                </div>
                <h3 className="text-sm font-extrabold text-[#f3efe6] font-cairo">
                  لا توجد مطاعم متاحة حالياً بمنطقتك
                </h3>
                <p className="text-xs text-[#9b98a6] font-cairo max-w-xs mx-auto">
                  جرب البحث باسم آخر أو عد لاحقاً لرؤية المطاعم المنضمة حديثاً.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredMerchants.map((merchant) => {
                  // Count available menu items for this merchant
                  const countAvailable = menuItems.filter(
                    (i) => (i.merchantId === merchant.id || !i.merchantId) && i.isAvailable
                  ).length;

                  return (
                    <motion.div
                      key={merchant.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleOpenRestaurant(merchant)}
                      className="p-3.5 rounded-2xl bg-[#1b1d28] border border-[#2e3140] hover:border-[#b15fce]/50 transition-all flex items-center justify-between gap-3 cursor-pointer shadow-md group"
                    >
                      <div className="flex items-center gap-3">
                        {/* Restaurant Logo / Image */}
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#b15fce]/20 to-[#7a3c94]/10 border border-[#b15fce]/30 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                          <ChefHat className="w-7 h-7 text-[#b15fce]" />
                        </div>

                        {/* Restaurant Details */}
                        <div className="space-y-1 text-right">
                          <h3 className="text-sm font-extrabold text-[#f3efe6] font-cairo group-hover:text-[#b15fce] transition-colors">
                            {merchant.fullName}
                          </h3>
                          <div className="flex items-center gap-2 text-[10px] text-[#9b98a6] font-cairo">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#e8a33d]" />
                              {merchant.address || 'أربيل - العراق'}
                            </span>
                            <span>•</span>
                            <span className="text-emerald-400 font-bold">
                              {countAvailable} صنف متوفر بالمنيو
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Arrow */}
                      <div className="w-8 h-8 rounded-full bg-[#232634] text-[#9b98a6] group-hover:text-[#f3efe6] group-hover:bg-[#b15fce]/20 flex items-center justify-center transition-all">
                        <ChevronRight className="w-4 h-4 rotate-180" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
         VIEW 2: RESTAURANT DETAILS & MENU (تفاصيل المطعم والمنيو)
         ========================================================================= */}
      {subView === 'restaurant_details' && selectedMerchant && (
        <div className="space-y-4 pb-20">
          {/* Header Bar with Back Button */}
          <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
            <button
              type="button"
              onClick={() => setSubView('browsing')}
              className="px-3 py-1.5 rounded-xl bg-[#232634] hover:bg-[#2e3140] text-xs font-bold text-[#f3efe6] font-cairo flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#e8a33d]" />
              <span>العودة للمطاعم</span>
            </button>
            <span className="text-xs font-bold text-[#9b98a6] font-cairo">
              تصفح القائمة 📋
            </span>
          </div>

          {/* Restaurant Banner Header */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1b1d28] to-[#232634] border border-[#2e3140] flex items-center gap-3.5 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#b15fce] to-[#7a3c94] text-white flex items-center justify-center font-extrabold text-xl shadow-md border-2 border-[#1b1d28] shrink-0">
              <ChefHat className="w-8 h-8 text-white" />
            </div>

            <div className="space-y-1 text-right">
              <h2 className="text-base font-extrabold text-[#f3efe6] font-cairo">
                {selectedMerchant.fullName}
              </h2>
              <p className="text-xs text-[#9b98a6] font-cairo flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#e8a33d]" />
                <span>{selectedMerchant.address || 'أربيل - العراق'}</span>
              </p>
              <p className="text-[10px] text-emerald-400 font-bold font-cairo">
                مفتوح الآن ويستقبل الطلبات 🟢
              </p>
            </div>
          </div>

          {/* Menu Categories & Items */}
          <div className="space-y-5">
            {categories.map((cat) => {
              const catItems = merchantMenuItems.filter(
                (i) => (i.category || 'عام') === cat
              );
              if (catItems.length === 0) return null;

              return (
                <div key={cat} className="space-y-2.5">
                  <h3 className="text-xs font-extrabold text-[#e8a33d] font-cairo flex items-center gap-1.5 border-b border-[#2e3140]/60 pb-1.5">
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>{cat}</span>
                  </h3>

                  <div className="space-y-2.5">
                    {catItems.map((item) => {
                      const cartItem = cart.find((ci) => ci.item.id === item.id);
                      const qty = cartItem ? cartItem.quantity : 0;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl bg-[#1b1d28] border transition-all flex items-center justify-between gap-3 text-right ${
                            item.isAvailable
                              ? 'border-[#2e3140] hover:border-[#b15fce]/40'
                              : 'border-[#2e3140]/40 opacity-50 bg-[#151722]'
                          }`}
                        >
                          {/* Item Image */}
                          {item.imageUrl ? (
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#232634] border border-[#2e3140] shrink-0">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-[#232634] border border-[#2e3140] flex items-center justify-center shrink-0">
                              <UtensilsCrossed className="w-6 h-6 text-[#9b98a6]" />
                            </div>
                          )}

                          {/* Item Info */}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-extrabold text-[#f3efe6] font-cairo">
                                {item.name}
                              </h4>
                              {!item.isAvailable && (
                                <span className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 font-bold text-[9px] font-cairo">
                                  غير متوفر حالياً
                                </span>
                              )}
                            </div>

                            <p className="text-[10px] text-[#9b98a6] font-cairo line-clamp-2">
                              {item.description}
                            </p>

                            <p className="text-xs font-extrabold text-[#e8a33d] font-plex">
                              {formatIqd(item.priceIqd)}
                            </p>
                          </div>

                          {/* Add to Cart Control */}
                          {item.isAvailable && (
                            <div className="shrink-0">
                              {qty > 0 ? (
                                <div className="flex items-center gap-1.5 bg-[#232634] p-1 rounded-xl border border-[#b15fce]/40">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQuantity(item.id, -1)}
                                    className="w-6 h-6 rounded-lg bg-[#12131a] text-[#f3efe6] hover:text-red-400 flex items-center justify-center cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="text-xs font-extrabold text-[#f3efe6] font-plex px-1">
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleAddToCart(item)}
                                    className="w-6 h-6 rounded-lg bg-[#b15fce] text-white flex items-center justify-center cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddToCart(item)}
                                  className="w-9 h-9 rounded-full bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] font-black hover:scale-105 transition-transform flex items-center justify-center shadow-md cursor-pointer"
                                  title="إضافة للسلة"
                                >
                                  <Plus className="w-5 h-5 stroke-[3]" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Cart Bar (Sticky at bottom) */}
          <AnimatePresence>
            {totalCartItems > 0 && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="fixed bottom-4 left-4 right-4 z-40 max-w-[420px] mx-auto"
              >
                <button
                  type="button"
                  onClick={() => setSubView('cart_review')}
                  id="open-cart-review-btn"
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#e8a33d] via-[#da8f3c] to-[#c97b3d] text-[#12131a] font-extrabold text-xs sm:text-sm font-cairo shadow-2xl shadow-[#e8a33d]/40 flex items-center justify-between cursor-pointer border border-[#f3efe6]/20 hover:scale-[1.01] transition-transform"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#12131a]/20 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-[#12131a]" />
                    </div>
                    <span>عرض السلة ({totalCartItems} أصناف)</span>
                  </div>

                  <span className="font-plex text-sm font-black bg-[#12131a]/15 px-3 py-1 rounded-xl">
                    {formatIqd(totalCartPrice)}
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* =========================================================================
         VIEW 3: CART REVIEW (مراجعة السلة)
         ========================================================================= */}
      {subView === 'cart_review' && (
        <div className="space-y-4 text-right">
          <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
            <h2 className="text-base font-extrabold text-[#f3efe6] font-cairo flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#e8a33d]" />
              <span>سلة الشراء ({selectedMerchant?.fullName})</span>
            </h2>
            <button
              type="button"
              onClick={() => setSubView('restaurant_details')}
              className="p-1 rounded-xl hover:bg-[#232634] text-[#9b98a6] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="p-8 text-center space-y-3 bg-[#1b1d28] rounded-2xl border border-[#2e3140]">
              <p className="text-sm font-bold text-[#f3efe6] font-cairo">
                سلتك فارغة حالياً! 🛒
              </p>
              <button
                type="button"
                onClick={() => setSubView('restaurant_details')}
                className="px-4 py-2 rounded-xl bg-[#e8a33d] text-[#12131a] font-bold text-xs font-cairo"
              >
                تصفح المنيو إضافة أصناف
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Cart Items List */}
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {cart.map(({ item, quantity }) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-[#1b1d28] border border-[#2e3140] flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 space-y-0.5">
                      <h4 className="text-xs font-extrabold text-[#f3efe6] font-cairo">
                        {item.name}
                      </h4>
                      <p className="text-xs font-extrabold text-[#e8a33d] font-plex">
                        {formatIqd(item.priceIqd * quantity)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-[#232634] p-1 rounded-xl border border-[#2e3140]">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          className="w-6 h-6 rounded-lg bg-[#12131a] text-[#f3efe6] hover:text-red-400 flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-extrabold text-[#f3efe6] font-plex px-1">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(item)}
                          className="w-6 h-6 rounded-lg bg-[#b15fce] text-white flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="p-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                        title="حذف الصنف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="p-4 rounded-2xl bg-[#232634] border border-[#2e3140] space-y-2 text-xs font-cairo">
                <div className="flex justify-between text-[#9b98a6]">
                  <span>مجموع الوجبات:</span>
                  <span className="font-plex font-bold text-[#f3efe6]">
                    {formatIqd(totalCartPrice)}
                  </span>
                </div>
                <div className="flex justify-between text-[#9b98a6]">
                  <span>رسوم التوصيل المباشر:</span>
                  <span className="font-plex font-bold text-emerald-400">
                    {formatIqd(calculatedDeliveryFee)}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#2e3140] flex justify-between text-sm font-extrabold text-[#f3efe6]">
                  <span>المبلغ الإجمالي:</span>
                  <span className="font-plex text-[#e8a33d]">
                    {formatIqd(totalCartPrice + calculatedDeliveryFee)}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubView('checkout')}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#e8a33d] via-[#da8f3c] to-[#c97b3d] text-[#12131a] font-extrabold text-xs sm:text-sm font-cairo shadow-lg shadow-[#e8a33d]/20 cursor-pointer"
                >
                  متابعة الطلب ➔
                </button>
                <button
                  type="button"
                  onClick={() => setSubView('restaurant_details')}
                  className="px-4 py-3.5 rounded-2xl bg-[#232634] text-[#9b98a6] font-bold text-xs font-cairo cursor-pointer hover:bg-[#2e3140]"
                >
                  إضافة المزيد
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
         VIEW 4: CHECKOUT CONFIRMATION (تأكيد الطلب)
         ========================================================================= */}
      {subView === 'checkout' && selectedMerchant && (
        <div className="space-y-4 text-right">
          <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
            <h2 className="text-base font-extrabold text-[#f3efe6] font-cairo flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#e8a33d]" />
              <span>تأكيد طلب الطعام</span>
            </h2>
            <button
              type="button"
              onClick={() => setSubView('cart_review')}
              className="p-1 rounded-xl hover:bg-[#232634] text-[#9b98a6] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Delivery Address Field */}
          <div className="space-y-1.5 bg-[#1b1d28] p-4 rounded-2xl border border-[#2e3140]">
            <label className="block text-xs font-extrabold text-[#f3efe6] font-cairo flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#e8a33d]" />
              <span>عنوان التوصيل بالتفصيل *</span>
            </label>
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="اكتب اسم الحي، الشارع، أو نقطة دالة..."
              className="w-full h-11 px-3.5 bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl text-xs font-cairo text-[#f3efe6] outline-none"
            />
            <p className="text-[10px] text-[#9b98a6] font-cairo">
              سيقوم كابتن التوصيل بالاتصال بك فور تجهيز الطلب من المطعم.
            </p>
          </div>

          {/* Payment Method Selector */}
          <div className="bg-[#1b1d28] p-3.5 rounded-2xl border border-[#2e3140] space-y-2 text-right">
            <label className="text-xs font-bold text-[#9b98a6] block">اختر طريقة الدفع للطلب:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFoodPayMethod('cash')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold font-cairo flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  foodPayMethod === 'cash'
                    ? 'bg-[#e8a33d] text-[#12131a] border-[#e8a33d] font-black shadow-md'
                    : 'bg-[#12131a] text-[#9b98a6] border-[#2e3140]'
                }`}
              >
                <span>💵 نقدي عند الاستلام</span>
              </button>

              <button
                type="button"
                onClick={() => setFoodPayMethod('wallet')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold font-cairo flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  foodPayMethod === 'wallet'
                    ? 'bg-[#2fa6a6] text-[#12131a] border-[#2fa6a6] font-black shadow-md'
                    : 'bg-[#12131a] text-[#9b98a6] border-[#2e3140]'
                }`}
              >
                <span>💳 المحفظة الإلكترونية</span>
              </button>
            </div>
            {foodPayMethod === 'wallet' && (
              <p className="text-[11px] text-[#2fa6a6] font-cairo mt-1">
                رصيدك المتاح بالمحفظة: {getCustomerWalletBalance(customerName || 'زبون تكسي الأمان').toLocaleString()} د.ع
              </p>
            )}
          </div>

          {/* Final Order Summary */}
          <div className="bg-[#1b1d28] p-4 rounded-2xl border border-[#2e3140] space-y-3">
            <h3 className="text-xs font-extrabold text-[#f3efe6] font-cairo border-b border-[#2e3140] pb-2">
              ملخص الطلب ({selectedMerchant.fullName})
            </h3>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {cart.map(({ item, quantity }) => (
                <div
                  key={item.id}
                  className="flex justify-between text-xs font-cairo text-[#9b98a6]"
                >
                  <span>
                    {quantity}x {item.name}
                  </span>
                  <span className="font-plex text-[#f3efe6]">
                    {formatIqd(item.priceIqd * quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#2e3140] flex justify-between items-center">
              <span className="text-xs font-bold text-[#f3efe6] font-cairo">
                المجموع الكلي مع التوصيل:
              </span>
              <span className="text-sm font-extrabold text-[#e8a33d] font-plex">
                {formatIqd(totalCartPrice + calculatedDeliveryFee)}
              </span>
            </div>
          </div>

          {/* Large Full Width Confirmation Button */}
          <button
            type="button"
            onClick={handleConfirmOrder}
            id="confirm-food-order-btn"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#e8a33d] via-[#da8f3c] to-[#c97b3d] text-[#12131a] font-black text-sm font-cairo shadow-2xl shadow-[#e8a33d]/30 hover:scale-[1.01] transition-transform cursor-pointer"
          >
            تأكيد الطلب — {formatIqd(totalCartPrice + calculatedDeliveryFee)}
          </button>
        </div>
      )}

      {/* =========================================================================
         VIEW 5: LIVE ORDER TRACKING (تتبع الطلب)
         ========================================================================= */}
      {subView === 'tracking' && activeOrder && (
        <div className="space-y-4 text-right">
          <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
            <h2 className="text-base font-extrabold text-[#f3efe6] font-cairo flex items-center gap-2">
              <Bike className="w-5 h-5 text-[#e8a33d] animate-bounce" />
              <span>تتبع الطلب المباشر</span>
            </h2>
            <span className="text-xs font-extrabold text-[#e8a33d] font-plex bg-[#e8a33d]/15 border border-[#e8a33d]/30 px-2.5 py-1 rounded-xl">
              {activeOrder.orderNumber}
            </span>
          </div>

          {/* 4-Step Progress Timeline Bar */}
          <div className="p-4 rounded-2xl bg-[#1b1d28] border border-[#2e3140] space-y-4">
            <h3 className="text-xs font-bold text-[#9b98a6] font-cairo text-center">
              حالة الطلب لدى المطعم
            </h3>

            {/* Timeline UI */}
            <div className="relative flex items-center justify-between px-2">
              {/* Connecting Bar */}
              <div className="absolute top-4 left-6 right-6 h-1 bg-[#232634] -z-0" />

              {/* Stage 1: Order Sent (new) */}
              {(() => {
                const stages: { status: OrderStatus; label: string; icon: string }[] = [
                  { status: 'new', label: 'تم الطلب', icon: '📩' },
                  { status: 'preparing', label: 'قيد التحضير', icon: '🍳' },
                  { status: 'ready', label: 'جاهز للتوصيل', icon: '🛵' },
                  { status: 'delivered', label: 'تم التسليم', icon: '✅' },
                ];

                const orderStatusOrder: OrderStatus[] = ['new', 'preparing', 'ready', 'delivered'];
                const currentIndex = orderStatusOrder.indexOf(activeOrder.status);

                return stages.map((stg, idx) => {
                  const isCompleted = idx < currentIndex;
                  const isCurrent = idx === currentIndex;

                  return (
                    <div
                      key={stg.status}
                      className="relative z-10 flex flex-col items-center gap-1.5"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-md ${
                          isCompleted
                            ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                            : isCurrent
                            ? 'bg-[#e8a33d] text-[#12131a] ring-4 ring-[#e8a33d]/30 animate-pulse'
                            : 'bg-[#232634] text-[#9b98a6] border border-[#2e3140]'
                        }`}
                      >
                        {isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : stg.icon}
                      </div>

                      <span
                        className={`text-[10px] font-cairo font-bold ${
                          isCompleted
                            ? 'text-emerald-400'
                            : isCurrent
                            ? 'text-[#e8a33d]'
                            : 'text-[#9b98a6]'
                        }`}
                      >
                        {stg.label}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Order Summary Details */}
          <div className="p-4 rounded-2xl bg-[#1b1d28] border border-[#2e3140] space-y-3">
            <div className="flex items-center justify-between border-b border-[#2e3140] pb-2 text-xs font-cairo">
              <span className="font-extrabold text-[#f3efe6]">تفاصيل الشحنة والطلب</span>
              <span className="text-[#9b98a6] font-plex">{activeOrder.orderTime}</span>
            </div>

            <div className="space-y-1.5 text-xs font-cairo">
              <div className="flex justify-between text-[#9b98a6]">
                <span>عنوان التوصيل:</span>
                <span className="text-[#f3efe6] font-bold">{activeOrder.deliveryAddress}</span>
              </div>
              <div className="flex justify-between text-[#9b98a6]">
                <span>الأصناف المطلوبة:</span>
                <span className="text-[#f3efe6] font-bold">
                  {activeOrder.items.map((i) => `${i.quantity}x ${i.name}`).join('، ')}
                </span>
              </div>
              <div className="flex justify-between text-[#9b98a6] pt-1 border-t border-[#2e3140]">
                <span>المبلغ الكلي:</span>
                <span className="text-[#e8a33d] font-extrabold font-plex text-sm">
                  {activeOrder.totalAmountFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button: Visible when Delivered */}
          {activeOrder.status === 'delivered' ? (
            <button
              type="button"
              onClick={() => {
                setActiveOrder(null);
                setSubView('browsing');
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-xs font-cairo shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              تم استلام الطلب بنجاح — العودة للرئيسية 🟢
            </button>
          ) : (
            <div className="p-3 rounded-2xl bg-[#232634] border border-[#2e3140] text-center">
              <p className="text-xs text-[#9b98a6] font-cairo animate-pulse">
                جاري التحديث التلقائي للحالة فور تغييرها من قبل المطعم... 🛵
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
