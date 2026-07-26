import React, { useState, useEffect } from 'react';
import { 
  LogOut, 
  Users, 
  FileCheck, 
  DollarSign, 
  PieChart, 
  Search, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Save, 
  ShieldAlert, 
  Building2, 
  Car, 
  User, 
  FileText,
  Clock,
  Phone,
  MapPin,
  Check,
  LifeBuoy,
  MessageSquare,
  Plus,
  X,
  Calendar,
  Send,
  Download,
  UserPlus,
  Edit,
  Tag,
  Wallet,
  CreditCard,
  ShieldCheck,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../types';
import {
  getUserWalletBalance,
  getUserWalletTransactions,
  adminAddWalletFunds,
  adminAdjustWalletBalance,
  adminWithdrawWalletFunds,
  getWithdrawalRequests,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
  getTopUpRequests,
  approveTopUpRequestUnified,
  rejectTopUpRequestUnified,
  TopUpRequest,
  getAuditLog,
  subscribeToWalletStore,
  WalletTransaction,
  WithdrawalRequest,
  AuditLogEntry,
} from '../lib/unifiedWalletStore';
import {
  getFemaleDriverZones,
  toggleFemaleDriverZone,
  updateFemaleDriverTimeout,
  getFemaleDriverServiceTimeout,
  FemaleDriverZone,
} from '../lib/femaleDriverServiceStore';
import { 
  getUsersFromDatabase, 
  deleteUserFromDatabase, 
  updateUserStatusInDatabase, 
  addUserComplaintInDatabase,
  addNewUserToDatabase,
  updateUserDetailsInDatabase,
  subscribeToUserDatabase,
  UserRecord 
} from '../lib/userDatabase';
import {
  getPricingConfig,
  savePricingConfig,
  PricingConfig,
  calculateRideBasePrice,
  calculateDeliveryBasePrice,
  getDriverPriceOptions,
  calculateCommission
} from '../lib/pricingEngine';
import {
  getSupportTickets,
  addAdminReplyToTicket,
  subscribeToSupportTickets,
  SupportTicket
} from '../lib/supportDatabase';

interface AdminDashboardProps {
  currentLang: Language;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'kyc' | 'pricing' | 'support' | 'female_service' | 'wallets'
  >('overview');

  // Single Unified Source of Truth
  const [usersList, setUsersList] = useState<UserRecord[]>([]);

  // Admin Wallet Management State
  const [walletSearchQuery, setWalletSearchQuery] = useState('');
  const [walletSelectedUser, setWalletSelectedUser] = useState<UserRecord | null>(null);
  const [walletActionType, setWalletActionType] = useState<'add' | 'adjust' | 'withdraw' | null>(null);
  const [walletAmountInput, setWalletAmountInput] = useState('');
  const [walletReasonInput, setWalletReasonInput] = useState('');
  const [walletErrorMsg, setWalletErrorMsg] = useState<string | null>(null);

  // Audit Logs, Merchant Withdrawal Requests & Customer Top-Up Requests
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => getAuditLog());
  const [withdrawalRequests, setWithdrawalRequestsState] = useState<WithdrawalRequest[]>(() =>
    getWithdrawalRequests()
  );
  const [topUpRequests, setTopUpRequestsState] = useState<TopUpRequest[]>(() =>
    getTopUpRequests()
  );
  const [rejectModalReq, setRejectModalReq] = useState<WithdrawalRequest | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [rejectTopUpModalReq, setRejectTopUpModalReq] = useState<TopUpRequest | null>(null);
  const [rejectTopUpReasonInput, setRejectTopUpReasonInput] = useState('');

  // Selected User Profile Modal & Edit Mode
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserRecord | null>(null);
  const [userToDeleteConfirm, setUserToDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<{
    fullName: string;
    phone: string;
    email: string;
    vehicleDetails: string;
    address: string;
    status: 'active' | 'pending' | 'rejected' | 'suspended';
  }>({
    fullName: '',
    phone: '',
    email: '',
    vehicleDetails: '',
    address: '',
    status: 'active',
  });

  const [complaintInput, setComplaintInput] = useState('');

  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState<{
    fullName: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    accountType: 'customer' | 'driver' | 'merchant';
    vehicleDetails: string;
    address: string;
    status: 'active' | 'pending';
  }>({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    password: 'password123',
    accountType: 'customer',
    vehicleDetails: '',
    address: '',
    status: 'active',
  });

  // Support Tickets
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [replyInputMap, setReplyInputMap] = useState<{ [ticketId: string]: string }>({});

  // Search & Filters for Users tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'customer' | 'driver' | 'merchant'>('all');

  // Action Confirmation Toast (Green / Red)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Persistent Unified Pricing Engine Configuration
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(() => getPricingConfig());
  const [showPricingToast, setShowPricingToast] = useState(false);

  // Live Simulator Test Inputs in Admin Dashboard
  const [simDistance, setSimDistance] = useState<number>(6.5);
  const [simDuration, setSimDuration] = useState<number>(18);
  const [simVehicleType, setSimVehicleType] = useState<'economy' | 'comfort' | 'vip'>('economy');

  const handleSavePricingSettings = (e: React.FormEvent) => {
    e.preventDefault();
    savePricingConfig(pricingConfig);
    setShowPricingToast(true);
    setTimeout(() => {
      setShowPricingToast(false);
    }, 2200);
    triggerToast('success', '✓ تم حفظ وتطبيق محرك التسعير الكامل وعمولات المنصة بنجاح');
  };

  // Female Driver Service Admin Controls State
  const [femaleZones, setFemaleZones] = useState<FemaleDriverZone[]>(() => getFemaleDriverZones());
  const [femaleTimeoutVal, setFemaleTimeoutVal] = useState(() => getFemaleDriverServiceTimeout());

  const handleToggleZone = (id: string) => {
    const zone = femaleZones.find((r) => r.id === id);
    if (!zone) return;
    const newStatus = !zone.enabled;
    const updated = toggleFemaleDriverZone(id, newStatus);
    setFemaleZones(updated);
    triggerToast('success', `✓ تم ${newStatus ? 'تفعيل' : 'تعطيل'} الخدمة النسائية في ${zone.nameAr}`);
  };

  const handleSaveTimeout = () => {
    const updated = updateFemaleDriverTimeout(Number(femaleTimeoutVal));
    setFemaleZones(updated);
    triggerToast('success', '✓ تم تحديث مهلة الانتظار للمطابقة مع سائقة نسائية');
  };

  // Load and sync users & support tickets list
  const refreshUsers = () => {
    const list = getUsersFromDatabase();
    setUsersList(list);
    if (selectedUserProfile) {
      const updatedUser = list.find((u) => u.id === selectedUserProfile.id);
      if (updatedUser) setSelectedUserProfile(updatedUser);
      else setSelectedUserProfile(null);
    }
  };

  const refreshSupport = () => {
    const tickets = getSupportTickets();
    setSupportTickets(tickets);
  };

  const refreshWalletAdmin = () => {
    setAuditLogs(getAuditLog());
    setWithdrawalRequestsState(getWithdrawalRequests());
    setTopUpRequestsState(getTopUpRequests());
  };

  const handleApproveTopUp = (reqId: string) => {
    const res = approveTopUpRequestUnified(reqId, 'المدير العام (نعيمي)');
    if (res.success) {
      triggerToast('success', '✓ تم الموافقة على طلب الشحن وإيداع المبلغ بحساب المستخدم بنجاح!');
      refreshWalletAdmin();
    } else {
      triggerToast('error', res.errorMsg || 'حدث خطأ أثناء تنفيذ الموافقة');
    }
  };

  const handleConfirmRejectTopUp = () => {
    if (!rejectTopUpModalReq) return;
    const res = rejectTopUpRequestUnified(rejectTopUpModalReq.id, rejectTopUpReasonInput, 'المدير العام (نعيمي)');
    if (res.success) {
      triggerToast('success', 'تم رفض طلب الشحن وإخطار المستخدم بنتيجة القرار.');
      refreshWalletAdmin();
      setRejectTopUpModalReq(null);
      setRejectTopUpReasonInput('');
    } else {
      triggerToast('error', res.errorMsg || 'يرجى كتابة سبب الرفض');
    }
  };

  useEffect(() => {
    refreshUsers();
    refreshSupport();
    refreshWalletAdmin();

    const unsubUsers = subscribeToUserDatabase(() => {
      refreshUsers();
    });
    const unsubSupport = subscribeToSupportTickets(() => {
      refreshSupport();
    });
    const unsubWallet = subscribeToWalletStore(() => {
      refreshWalletAdmin();
    });

    return () => {
      unsubUsers();
      unsubSupport();
      unsubWallet();
    };
  }, [activeTab]);

  // When selecting user for profile view, populate edit form
  useEffect(() => {
    if (selectedUserProfile) {
      setEditForm({
        fullName: selectedUserProfile.fullName || '',
        phone: selectedUserProfile.phone || '',
        email: selectedUserProfile.email || '',
        vehicleDetails: selectedUserProfile.vehicleDetails || '',
        address: selectedUserProfile.address || '',
        status: (selectedUserProfile.status as any) || 'active',
      });
      setIsEditingProfile(false);
    }
  }, [selectedUserProfile]);

  // Handle Add Complaint / Admin Note
  const handleAddComplaintNote = (userId: string) => {
    if (!complaintInput.trim()) return;
    const updated = addUserComplaintInDatabase(userId, complaintInput, 'المدير العام');
    if (updated) {
      setSelectedUserProfile(updated);
      setComplaintInput('');
      refreshUsers();
      triggerToast('success', '✓ تم إضافة الملاحظة/الشكوى لملف الحساب');
    }
  };

  // Handle Send Reply to Support Ticket
  const handleSendSupportReply = (ticketId: string) => {
    const text = replyInputMap[ticketId];
    if (!text || !text.trim()) return;
    const updated = addAdminReplyToTicket(ticketId, text);
    if (updated) {
      setReplyInputMap((prev) => ({ ...prev, [ticketId]: '' }));
      refreshSupport();
      triggerToast('success', '✓ تم إرسال الرد للعميل/السائق/التاجر بنجاح');
    }
  };

  // Show Toast Auto-Dismiss
  const triggerToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // KYC File Generation & Download Handler (Images & Graphical Document)
  const handleDownloadKycFile = (user: UserRecord) => {
    let downloadedCount = 0;

    // 1. Download actual uploaded image files if present
    if (user.kycImageFiles && user.kycImageFiles.length > 0) {
      user.kycImageFiles.forEach((fileObj, idx) => {
        const a = document.createElement('a');
        a.href = fileObj.dataUrl;
        const ext = fileObj.name?.split('.').pop() || 'png';
        a.download = `KYC_Upload_${user.fullName.replace(/\s+/g, '_')}_${idx + 1}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        downloadedCount++;
      });
    }

    // 2. Generate and download a high-definition Graphical KYC Dossier Document PNG Card via HTML5 Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 680;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Dark Gradient Background
      const grad = ctx.createLinearGradient(0, 0, 1000, 680);
      grad.addColorStop(0, '#12131a');
      grad.addColorStop(1, '#1b1d28');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1000, 680);

      // Outer Golden Border Frame
      ctx.strokeStyle = '#e8a33d';
      ctx.lineWidth = 6;
      ctx.strokeRect(15, 15, 970, 650);

      // Inner Subtle Border
      ctx.strokeStyle = 'rgba(232, 163, 61, 0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(25, 25, 950, 630);

      // Header Banner
      ctx.fillStyle = 'rgba(232, 163, 61, 0.12)';
      ctx.fillRect(25, 25, 950, 110);

      // Top Title Text (RTL Header)
      ctx.fillStyle = '#e8a33d';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('مؤسسة تكساتي - TAKSATI IRAQ', 500, 65);

      ctx.fillStyle = '#f3efe6';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('وثيقة توثيق الهوية الرسمية المستخرجة (OFFICIAL KYC DOSSIER)', 500, 100);

      // Divider Line
      ctx.strokeStyle = '#2e3140';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 150);
      ctx.lineTo(960, 150);
      ctx.stroke();

      // Account Status Badge Box (Top Right)
      ctx.fillStyle = user.status === 'active' ? '#10b981' : '#f59e0b';
      ctx.fillRect(720, 170, 220, 40);
      ctx.fillStyle = '#12131a';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(user.status === 'active' ? '✓ حساب موثق ونشط' : '⏳ قيد المراجعة والتدقيق', 830, 195);

      // User Details Left/Right Layout (RTL Orientation)
      ctx.textAlign = 'right';
      ctx.fillStyle = '#e8a33d';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('1. البيانات الأساسية للحساب:', 940, 195);

      ctx.fillStyle = '#f3efe6';
      ctx.font = '16px sans-serif';
      
      const details = [
        `• الاسم الكامل: ${user.fullName}`,
        `• اسم المستخدم (اليوزر): @${user.username}`,
        `• نوع الحساب: ${user.accountType === 'driver' ? 'سائق كابتن (تكسي)' : user.accountType === 'merchant' ? 'تاجر / مطعم' : 'زبون'}`,
        `• رقم الهاتف: ${user.phone}`,
        `• البريد الإلكتروني: ${user.email}`,
        `• الرقم المرجعي (UID): ${user.id}`,
      ];

      details.forEach((line, i) => {
        ctx.fillText(line, 940, 235 + i * 32);
      });

      // Section 2: Vehicle / Commercial Details
      ctx.fillStyle = '#e8a33d';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('2. تفاصيل المركبة / النشاط التجاري:', 940, 440);

      ctx.fillStyle = '#f3efe6';
      ctx.font = '16px sans-serif';
      if (user.accountType === 'driver') {
        ctx.fillText(`• بيانات المركبة واللوحة: ${user.vehicleDetails || 'تويوتا كورولا 2022 (تكسي بغداد)'}`, 940, 475);
      } else if (user.accountType === 'merchant') {
        ctx.fillText(`• عنوان المحل / المطعم: ${user.address || 'بغداد - الكرادة'}`, 940, 475);
      } else {
        ctx.fillText(`• العنوان المسجل: ${user.address || 'العراق'}`, 940, 475);
      }

      // Documents List Section
      const docItems = (user.kycDocuments && user.kycDocuments.length > 0)
        ? user.kycDocuments.join(' - ')
        : user.accountType === 'driver'
        ? 'رخصة قيادة عمومية معتمدة + سنوياً المركبة الرسمية'
        : 'الهوية التجارية الرسمية + عقد إيجار/ملكية المحل';

      ctx.fillText(`• الوثائق المرفقة: ${docItems}`, 940, 510);

      // Verification Stamp Box (Bottom Left Graphic Seal)
      ctx.save();
      ctx.translate(200, 500);
      ctx.strokeStyle = '#e8a33d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 65, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#e8a33d';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('مؤسسة تكساتي', 0, -25);
      ctx.fillText('ختم التوثيق الرسمـي', 0, -5);
      ctx.fillText('TAKSATI VERIFIED', 0, 15);
      ctx.fillText('2026', 0, 35);
      ctx.restore();

      // Footer bar
      ctx.fillStyle = '#232634';
      ctx.fillRect(25, 595, 950, 60);

      ctx.fillStyle = '#9b98a6';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`تاريخ الاستخراج: ${new Date().toLocaleString('ar-IQ')} | الختم الرقمي: TAKSATI-SECURE-KYC-${user.id}`, 500, 630);

      // Convert Canvas to PNG Blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `KYC_Official_Document_${user.fullName.replace(/\s+/g, '_')}_${user.id}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');

      downloadedCount++;
    }

    triggerToast('success', `📥 تم تنزيل ملف توثيق [${user.fullName}] كصورة مستند رسمي بنجاح (${downloadedCount} ملفات)`);
  };

  // Add New User Form Submit Handler
  const handleCreateNewUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.fullName.trim() || !newUserForm.username.trim() || !newUserForm.email.trim() || !newUserForm.phone.trim()) {
      triggerToast('error', 'يرجى ملء كافة الحقول المطلوبة!');
      return;
    }

    const res = addNewUserToDatabase({
      fullName: newUserForm.fullName,
      username: newUserForm.username,
      email: newUserForm.email,
      phone: newUserForm.phone,
      password: newUserForm.password,
      accountType: newUserForm.accountType,
      vehicleDetails: newUserForm.vehicleDetails,
      address: newUserForm.address,
      status: newUserForm.status,
    });

    if (res.success) {
      refreshUsers();
      setShowAddUserModal(false);
      setNewUserForm({
        fullName: '',
        username: '',
        email: '',
        phone: '',
        password: 'password123',
        accountType: 'customer',
        vehicleDetails: '',
        address: '',
        status: 'active',
      });
      triggerToast('success', res.message);
    } else {
      triggerToast('error', res.message);
    }
  };

  // Save Edited Profile Handler
  const handleSaveProfileEdit = () => {
    if (!selectedUserProfile) return;
    const res = updateUserDetailsInDatabase(selectedUserProfile.id, {
      fullName: editForm.fullName,
      phone: editForm.phone,
      email: editForm.email,
      vehicleDetails: editForm.vehicleDetails,
      address: editForm.address,
      status: editForm.status as any,
    });

    if (res.success && res.user) {
      setSelectedUserProfile(res.user);
      setIsEditingProfile(false);
      refreshUsers();
      triggerToast('success', '✓ تم حفظ التعديلات على حساب المستخدم بنجاح');
    } else {
      triggerToast('error', res.message);
    }
  };

  // Filtered pending KYC users from unified data source
  const pendingKycUsers = usersList.filter(
    (u) => u.status === 'pending' && (u.accountType === 'driver' || u.accountType === 'merchant')
  );

  // Filtered users for "Users" tab
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);
    const matchesRole = selectedRoleFilter === 'all' || u.accountType === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Approve KYC Handler
  const handleApproveKyc = (userId: string, fullName: string) => {
    const updated = updateUserStatusInDatabase(userId, 'active');
    if (updated) {
      refreshUsers();
      triggerToast('success', `✓ تم تفعيل حساب [${fullName}] بنجاح`);
    }
  };

  // Reject KYC Handler
  const handleRejectKyc = (userId: string, fullName: string) => {
    const updated = updateUserStatusInDatabase(userId, 'rejected');
    if (updated) {
      refreshUsers();
      triggerToast('error', `✕ تم رفض طلب [${fullName}]`);
    }
  };

  // Delete User Trigger Handler (Opens custom confirm modal)
  const handleDeleteUser = (userId: string, name: string) => {
    setUserToDeleteConfirm({ id: userId, name });
  };

  // Perform actual deletion when user clicks confirm in custom modal
  const confirmDeleteUser = () => {
    if (!userToDeleteConfirm) return;
    const { id, name } = userToDeleteConfirm;
    const deleted = deleteUserFromDatabase(id);
    if (deleted) {
      if (selectedUserProfile?.id === id) {
        setSelectedUserProfile(null);
      }
      setUserToDeleteConfirm(null);
      refreshUsers();
      triggerToast('error', `✓ تم حذف حساب [${name}] نهائياً من النظام والسيرفر ولن يظهر مجدداً`);
    } else {
      setUserToDeleteConfirm(null);
      triggerToast('error', 'تعذر حذف الحساب، حاول مجدداً.');
    }
  };

  // Stats Calculations for Overview
  const totalUsers = usersList.filter(u => u.accountType !== 'admin').length;
  const totalCustomers = usersList.filter(u => u.accountType === 'customer').length;
  const activeDrivers = usersList.filter(u => u.accountType === 'driver' && u.status === 'active').length;
  const totalDrivers = usersList.filter(u => u.accountType === 'driver').length;
  const totalMerchants = usersList.filter(u => u.accountType === 'merchant').length;
  const pendingReviewCount = pendingKycUsers.length;

  return (
    <div className="w-full text-[#f3efe6] font-cairo dir-rtl select-none" dir="rtl">
      
      {/* 1. Header (رأس الصفحة) */}
      <div className="flex items-center justify-between pb-4 border-b border-[#2e3140] mb-4">
        <div className="text-right">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#f3efe6] tracking-tight">
            لوحة تحكم الأدمن
          </h1>
          <p className="text-xs sm:text-sm text-[#9b98a6] font-medium mt-0.5">
            تحكم كامل بالنظام
          </p>
        </div>

        <button
          onClick={onLogout}
          className="border border-[#2e3140] hover:border-red-500/50 hover:bg-red-500/10 text-[#f3efe6] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
          title="تسجيل الخروج"
        >
          <LogOut className="w-3.5 h-3.5 text-red-400" />
          <span>خروج</span>
        </button>
      </div>

      {/* Global Action Confirmation Toast Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4"
          >
            <div
              className={`p-3.5 rounded-xl border text-xs sm:text-sm font-extrabold flex items-center justify-between shadow-lg ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-red-500/20 border-red-500/50 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {toastMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{toastMessage.text}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Scrollable Horizontal Tabs (شريط تبويبات أفقي - Pill Shape) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`rounded-full px-4 py-2 text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-md ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] shadow-amber-900/30 ring-2 ring-[#e8a33d]/40'
              : 'bg-[#232634] text-[#9b98a6] border border-[#2e3140] hover:text-[#f3efe6] hover:bg-[#2e3140]'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>نظرة عامة</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`rounded-full px-4 py-2 text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-md ${
            activeTab === 'users'
              ? 'bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] shadow-amber-900/30 ring-2 ring-[#e8a33d]/40'
              : 'bg-[#232634] text-[#9b98a6] border border-[#2e3140] hover:text-[#f3efe6] hover:bg-[#2e3140]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>المستخدمون</span>
          <span className="bg-[#12131a] text-[#f3efe6] border border-[#2e3140] text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
            {totalUsers}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('kyc')}
          className={`rounded-full px-4 py-2 text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-md ${
            activeTab === 'kyc'
              ? 'bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] shadow-amber-900/30 ring-2 ring-[#e8a33d]/40'
              : 'bg-[#232634] text-[#9b98a6] border border-[#2e3140] hover:text-[#f3efe6] hover:bg-[#2e3140]'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>توثيق KYC</span>
          {/* Dynamic Live Counter Badge */}
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold transition-all duration-300 ${
              pendingReviewCount > 0
                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {pendingReviewCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`rounded-full px-4 py-2 text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-md ${
            activeTab === 'pricing'
              ? 'bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] shadow-amber-900/30 ring-2 ring-[#e8a33d]/40'
              : 'bg-[#232634] text-[#9b98a6] border border-[#2e3140] hover:text-[#f3efe6] hover:bg-[#2e3140]'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>الأسعار والعمولات</span>
        </button>

        <button
          onClick={() => setActiveTab('support')}
          className={`rounded-full px-4 py-2 text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-md ${
            activeTab === 'support'
              ? 'bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] shadow-amber-900/30 ring-2 ring-[#e8a33d]/40'
              : 'bg-[#232634] text-[#9b98a6] border border-[#2e3140] hover:text-[#f3efe6] hover:bg-[#2e3140]'
          }`}
        >
          <LifeBuoy className="w-4 h-4 text-emerald-400" />
          <span>الدعم الفني والرسائل</span>
          <span className="bg-[#12131a] text-emerald-400 border border-[#2fa6a6]/40 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
            {supportTickets.filter((t) => t.status === 'open').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('female_service')}
          className={`rounded-full px-4 py-2 text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-md ${
            activeTab === 'female_service'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-900/40 ring-2 ring-purple-400'
              : 'bg-[#232634] text-purple-300 border border-purple-500/30 hover:text-white hover:bg-purple-900/40'
          }`}
        >
          <span>🌸 الخدمة النسائية</span>
          <span className="bg-purple-900/60 text-purple-200 border border-purple-500/40 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
            {usersList.filter((u) => u.accountType === 'driver' && u.gender === 'female' && u.status === 'active').length} سائقة
          </span>
        </button>

        <button
          onClick={() => setActiveTab('wallets')}
          id="tab-admin-wallets"
          className={`rounded-full px-4 py-2 text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-md ${
            activeTab === 'wallets'
              ? 'bg-gradient-to-r from-[#2fa6a6] to-[#258282] text-white shadow-teal-900/40 ring-2 ring-[#2fa6a6]/40'
              : 'bg-[#232634] text-[#9b98a6] border border-[#2e3140] hover:text-[#f3efe6] hover:bg-[#2e3140]'
          }`}
        >
          <Wallet className="w-4 h-4 text-emerald-400" />
          <span>إدارة المحافظ الرصيد</span>
          {withdrawalRequests.filter((r) => r.status === 'pending').length > 0 && (
            <span className="bg-amber-500 text-[#12131a] text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black animate-bounce">
              {withdrawalRequests.filter((r) => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* 3. Tab Contents */}
      <AnimatePresence mode="wait">
        
        {/* ===================== TAB 1: OVERVIEW (نظرة عامة) ===================== */}
        {activeTab === 'overview' && (
          <motion.div
            key="tab-overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* 4 Stat Cards Grid (2-column layout) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              
              {/* Card 1: إجمالي الحسابات */}
              <div className="bg-[#1b1d28] border border-[#2e3140] rounded-[14px] p-4 sm:p-5 text-right relative overflow-hidden group hover:border-[#e8a33d]/40 transition-all shadow-lg">
                <div className="text-[#e8a33d] font-mono text-3xl sm:text-4xl font-extrabold tracking-tight mb-1">
                  {totalUsers}
                </div>
                <div className="text-xs sm:text-sm text-[#9b98a6] font-medium">
                  إجمالي الحسابات
                </div>
                <div className="absolute top-3 left-3 text-[#e8a33d]/15 group-hover:text-[#e8a33d]/25 transition-colors">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              {/* Card 2: الزبائن */}
              <div className="bg-[#1b1d28] border border-[#2e3140] rounded-[14px] p-4 sm:p-5 text-right relative overflow-hidden group hover:border-[#2fa6a6]/40 transition-all shadow-lg">
                <div className="text-[#f3efe6] font-mono text-3xl sm:text-4xl font-extrabold tracking-tight mb-1">
                  {totalCustomers}
                </div>
                <div className="text-xs sm:text-sm text-[#9b98a6] font-medium">
                  الزبائن
                </div>
                <div className="absolute top-3 left-3 text-[#f3efe6]/15 group-hover:text-[#f3efe6]/25 transition-colors">
                  <User className="w-6 h-6" />
                </div>
              </div>

              {/* Card 3: السائقون النشطون */}
              <div className="bg-[#1b1d28] border border-[#2e3140] rounded-[14px] p-4 sm:p-5 text-right relative overflow-hidden group hover:border-[#2fa6a6]/40 transition-all shadow-lg">
                <div className="text-[#2fa6a6] font-mono text-3xl sm:text-4xl font-extrabold tracking-tight mb-1">
                  {activeDrivers}
                </div>
                <div className="text-xs sm:text-sm text-[#9b98a6] font-medium">
                  السائقون النشطون
                </div>
                <div className="absolute top-3 left-3 text-[#2fa6a6]/15 group-hover:text-[#2fa6a6]/25 transition-colors">
                  <Car className="w-6 h-6" />
                </div>
              </div>

              {/* Card 4: طلبات قيد المراجعة */}
              <div className="bg-[#1b1d28] border border-[#2e3140] rounded-[14px] p-4 sm:p-5 text-right relative overflow-hidden group hover:border-[#e8a33d]/40 transition-all shadow-lg">
                <div className="text-[#e8a33d] font-mono text-3xl sm:text-4xl font-extrabold tracking-tight mb-1">
                  {pendingReviewCount}
                </div>
                <div className="text-xs sm:text-sm text-[#9b98a6] font-medium">
                  طلبات قيد المراجعة
                </div>
                <div className="absolute top-3 left-3 text-[#e8a33d]/15 group-hover:text-[#e8a33d]/25 transition-colors">
                  <FileCheck className="w-6 h-6" />
                </div>
              </div>

            </div>

            {/* Divider with centered gray text */}
            <div className="relative flex py-2 items-center my-6">
              <div className="flex-grow border-t border-[#2e3140]"></div>
              <span className="flex-shrink mx-3 text-[#9b98a6] text-xs font-semibold px-3 py-0.5 bg-[#12131a] border border-[#2e3140] rounded-full">
                توزيع الحسابات حسب النوع
              </span>
              <div className="flex-grow border-t border-[#2e3140]"></div>
            </div>

            {/* 3 Horizontal Data Bars */}
            <div className="bg-[#1b1d28] border border-[#2e3140] rounded-[14px] p-4 sm:p-5 space-y-4 shadow-lg">
              
              {/* Bar 1: زبون */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <div className="flex items-center gap-1.5 text-[#f3efe6]">
                    <span className="text-base">🧍</span>
                    <span>زبون</span>
                  </div>
                  <span className="font-mono text-xs text-[#f3efe6] font-bold">
                    {totalCustomers}
                  </span>
                </div>
                <div className="w-full bg-[#232634] h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#2fa6a6] to-[#e8a33d] rounded-full transition-all duration-700" 
                    style={{ width: `${totalUsers > 0 ? (totalCustomers / totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Bar 2: سائق */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <div className="flex items-center gap-1.5 text-[#f3efe6]">
                    <span className="text-base">🚘</span>
                    <span>سائق</span>
                  </div>
                  <span className="font-mono text-xs text-[#f3efe6] font-bold">
                    {totalDrivers}
                  </span>
                </div>
                <div className="w-full bg-[#232634] h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#2fa6a6] to-[#e8a33d] rounded-full transition-all duration-700" 
                    style={{ width: `${totalUsers > 0 ? (totalDrivers / totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Bar 3: تاجر */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <div className="flex items-center gap-1.5 text-[#f3efe6]">
                    <span className="text-base">🍽️</span>
                    <span>تاجر</span>
                  </div>
                  <span className="font-mono text-xs text-[#f3efe6] font-bold">
                    {totalMerchants}
                  </span>
                </div>
                <div className="w-full bg-[#232634] h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#2fa6a6] to-[#e8a33d] rounded-full transition-all duration-700" 
                    style={{ width: `${totalUsers > 0 ? (totalMerchants / totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ===================== TAB 2: USERS (المستخدمون) ===================== */}
        {activeTab === 'users' && (
          <motion.div
            key="tab-users"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Top Bar with Add User Button */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-[#f3efe6] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#e8a33d]" />
                <span>إدارة المستخدمين وحسابات التطبيق</span>
              </h3>

              <button
                onClick={() => setShowAddUserModal(true)}
                className="bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] hover:brightness-110 text-[#12131a] px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة حساب جديد</span>
              </button>
            </div>

            {/* Search & Role Filter Bar */}
            <div className="space-y-2.5">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم، البريد أو رقم الهاتف..."
                  className="w-full bg-[#1b1d28] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2.5 pr-10 pl-4 text-xs sm:text-sm text-[#f3efe6] placeholder-[#9b98a6] outline-none transition-all"
                />
                <Search className="w-4 h-4 text-[#9b98a6] absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Role filter buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedRoleFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                    selectedRoleFilter === 'all'
                      ? 'bg-[#e8a33d] text-[#12131a] border-[#e8a33d]'
                      : 'bg-[#1b1d28] text-[#9b98a6] border-[#2e3140] hover:text-[#f3efe6]'
                  }`}
                >
                  الكل ({usersList.length})
                </button>
                <button
                  onClick={() => setSelectedRoleFilter('customer')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                    selectedRoleFilter === 'customer'
                      ? 'bg-[#2fa6a6] text-[#12131a] border-[#2fa6a6]'
                      : 'bg-[#1b1d28] text-[#9b98a6] border-[#2e3140] hover:text-[#f3efe6]'
                  }`}
                >
                  الزبائن ({usersList.filter(u => u.accountType === 'customer').length})
                </button>
                <button
                  onClick={() => setSelectedRoleFilter('driver')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                    selectedRoleFilter === 'driver'
                      ? 'bg-[#e8a33d] text-[#12131a] border-[#e8a33d]'
                      : 'bg-[#1b1d28] text-[#9b98a6] border-[#2e3140] hover:text-[#f3efe6]'
                  }`}
                >
                  السائقون ({usersList.filter(u => u.accountType === 'driver').length})
                </button>
                <button
                  onClick={() => setSelectedRoleFilter('merchant')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                    selectedRoleFilter === 'merchant'
                      ? 'bg-purple-500 text-[#12131a] border-purple-500'
                      : 'bg-[#1b1d28] text-[#9b98a6] border-[#2e3140] hover:text-[#f3efe6]'
                  }`}
                >
                  التجار ({usersList.filter(u => u.accountType === 'merchant').length})
                </button>
              </div>
            </div>

            {/* Users List Container */}
            <div className="bg-[#1b1d28] border border-[#2e3140] rounded-[14px] p-3 sm:p-4 divide-y divide-[#2e3140] shadow-lg">
              {filteredUsers.length === 0 ? (
                <div className="py-8 text-center text-[#9b98a6] text-xs sm:text-sm">
                  لا يوجد مستخدمون مطايقون لشروط البحث.
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group transition-colors hover:bg-[#232634]/50 rounded-xl px-2"
                  >
                    <div 
                      onClick={() => setSelectedUserProfile(user)}
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-grow"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
                        user.accountType === 'driver' ? 'bg-[#e8a33d]/15 border-[#e8a33d]/40 text-[#e8a33d]' :
                        user.accountType === 'merchant' ? 'bg-purple-500/15 border-purple-500/40 text-purple-400' :
                        user.accountType === 'admin' ? 'bg-red-500/15 border-red-500/40 text-red-400' :
                        'bg-[#2fa6a6]/15 border-[#2fa6a6]/40 text-[#2fa6a6]'
                      }`}>
                        {user.accountType === 'driver' ? <Car className="w-4 h-4" /> :
                         user.accountType === 'merchant' ? <Building2 className="w-4 h-4" /> :
                         user.accountType === 'admin' ? <ShieldAlert className="w-4 h-4" /> :
                         <User className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0 text-right">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-[#f3efe6] truncate group-hover:text-[#e8a33d] transition-colors">
                            {user.fullName}
                          </span>
                          
                          {/* Role Tag */}
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            user.accountType === 'driver' ? 'bg-[#e8a33d]/20 text-[#e8a33d]' :
                            user.accountType === 'merchant' ? 'bg-purple-500/20 text-purple-300' :
                            user.accountType === 'admin' ? 'bg-red-500/20 text-red-300' :
                            'bg-[#2fa6a6]/20 text-[#2fa6a6]'
                          }`}>
                            {user.accountType === 'driver' ? 'سائق' :
                             user.accountType === 'merchant' ? 'تاجر' :
                             user.accountType === 'admin' ? 'أدمن' : 'زبون'}
                          </span>

                          {/* Status Badge */}
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold border ${
                            user.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            user.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                            user.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }`}>
                            {user.status === 'active' ? 'نشط' :
                             user.status === 'pending' ? 'قيد المراجعة' :
                             user.status === 'rejected' ? 'مرفوض' : 'موقوف'}
                          </span>
                        </div>

                        <div className="text-[11px] text-[#9b98a6] dir-ltr text-right truncate font-mono mt-0.5">
                          {user.email} | {user.phone}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setSelectedUserProfile(user)}
                        className="px-2.5 py-1 bg-[#232634] hover:bg-[#e8a33d]/20 hover:text-[#e8a33d] border border-[#2e3140] text-[#f3efe6] rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#e8a33d]" />
                        <span>الملف والتعديل</span>
                      </button>

                      {user.accountType !== 'admin' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(user.id, user.fullName);
                          }}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
                          title="حذف الحساب نهائياً"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* ===================== TAB 3: KYC (توثيق الهوية والوثائق) ===================== */}
        {activeTab === 'kyc' && (
          <motion.div
            key="tab-kyc"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {pendingKycUsers.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#1b1d28] border border-[#2e3140] rounded-[14px] p-8 sm:p-12 text-center my-4 space-y-3 shadow-lg"
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                  <Check className="w-7 h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#f3efe6]">
                  لا توجد طلبات توثيق قيد المراجعة حاليًا
                </h3>
                <p className="text-xs sm:text-sm text-[#9b98a6] max-w-xs mx-auto leading-relaxed">
                  جميع طلبات السائقين والتجار تم التدقيق فيها واعتمادها أو معالجتها بنجاح.
                </p>
              </motion.div>
            ) : (
              pendingKycUsers.map((user) => (
                <motion.div
                  key={user.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-[#1b1d28] border border-[#2e3140] hover:border-[#2e3140]/80 rounded-[14px] p-4 space-y-3 shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs sm:text-sm text-[#f3efe6]">
                        {user.fullName}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold border ${
                          user.accountType === 'driver'
                            ? 'bg-[#e8a33d]/20 text-[#e8a33d] border-[#e8a33d]/40'
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        }`}
                      >
                        {user.accountType === 'driver' ? 'طلب سائق' : 'طلب تاجر'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-[#9b98a6] font-mono">
                      <Clock className="w-3 h-3 text-[#9b98a6]" />
                      <span>{user.appliedAt || 'مؤخراً'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#9b98a6] bg-[#12131a] p-2.5 rounded-xl border border-[#2e3140]">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#2fa6a6]" />
                      <span className="font-mono text-[#f3efe6]">{user.phone}</span>
                    </div>

                    {user.accountType === 'driver' && (
                      <div className="flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-[#e8a33d]" />
                        <span className="text-[#f3efe6] font-medium truncate">
                          {user.vehicleDetails || 'بيانات المركبة مرفقة'}
                        </span>
                      </div>
                    )}

                    {user.accountType === 'merchant' && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[#f3efe6] font-medium truncate">
                          {user.address || 'العنوان التجاري مرفق'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Uploaded Documents */}
                  <div className="space-y-1">
                    <div className="text-[11px] text-[#9b98a6] font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-[#e8a33d]" />
                        <span>الوثائق والمستندات المرفوعة:</span>
                      </div>

                      {/* Download KYC file button */}
                      <button
                        onClick={() => handleDownloadKycFile(user)}
                        className="text-[11px] text-[#2fa6a6] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تنزيل ملف KYC المستخرج</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(user.kycDocuments && user.kycDocuments.length > 0
                        ? user.kycDocuments
                        : user.accountType === 'driver'
                        ? ['رخصة قيادة عمومية', 'سنوية المركبة الرسمية']
                        : ['الهوية التجارية الرسمية', 'عقد إيجار/ملكية المحل']
                      ).map((doc, idx) => (
                        <span
                          key={idx}
                          className="bg-[#232634] text-[#f3efe6] border border-[#2e3140] text-[11px] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3 text-[#2fa6a6]" />
                          <span>{doc}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[#2e3140]/60">
                    <button
                      onClick={() => handleApproveKyc(user.id, user.fullName)}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-110 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>قبول التوثيق</span>
                    </button>

                    <button
                      onClick={() => handleDownloadKycFile(user)}
                      className="bg-[#232634] hover:bg-[#2fa6a6]/20 text-[#2fa6a6] border border-[#2fa6a6]/40 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      <span>حفظ وملف</span>
                    </button>

                    <button
                      onClick={() => handleRejectKyc(user.id, user.fullName)}
                      className="bg-[#232634] hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>رفض</span>
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* ===================== TAB 4: PRICING & COMMISSIONS (الأسعار والعمولات المعقولة) ===================== */}
        {activeTab === 'pricing' && (
          <motion.div
            key="tab-pricing"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <form onSubmit={handleSavePricingSettings} className="space-y-5 dir-rtl" dir="rtl">
              
              {/* HEADER BANNER */}
              <div className="bg-[#1b1d28] border border-[#e8a33d]/40 rounded-[18px] p-4 sm:p-5 text-right space-y-2 relative overflow-hidden shadow-xl">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#e8a33d]/15 border border-[#e8a33d]/30 flex items-center justify-center text-[#e8a33d]">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-[#f3efe6]">
                        نظام التسعير الكامل (رحلات التكسي + توصيل الطعام)
                      </h2>
                      <p className="text-xs text-[#9b98a6]">
                        معادلة السعر الأساسي التلقائية + هامش مرونة السائق المسموح + عمولات المنصة
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] bg-[#2fa6a6]/20 text-[#2fa6a6] px-3 py-1 rounded-full font-bold border border-[#2fa6a6]/30">
                    نظام تسعير ديناميكي ذكي 2026
                  </span>
                </div>
              </div>

              {/* CARD 1: BASE FARE CALCULATOR PARAMETERS (الرحلات والتوصيل) */}
              <div className="bg-[#1b1d28] border border-[#2e3140] rounded-[18px] p-4 sm:p-5 space-y-4 shadow-lg text-right">
                <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
                  <h3 className="text-sm sm:text-base font-extrabold text-[#f3efe6] flex items-center gap-2">
                    <Car className="w-4 h-4 text-[#e8a33d]" />
                    <span>1. حساب السعر الأساسي تلقائياً (Base Fare Rules)</span>
                  </h3>
                  <span className="text-[11px] text-[#9b98a6]">
                    السعر = (انطلاق + كم × سعر الكم + دقيقة × سعر الدقيقة) × المضاعفات
                  </span>
                </div>

                {/* RIDES SECTION */}
                <div className="space-y-3 pt-1">
                  <span className="text-xs font-black text-[#e8a33d] uppercase tracking-wider block">
                    🚗 إعدادات رحلات التكسي (Taxi Rides)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                    
                    {/* Base Fare Ride */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#9b98a6]">
                        رسوم الانطلاق الثابتة (د.ع)
                      </label>
                      <input
                        type="number"
                        step="250"
                        value={pricingConfig.baseFareRide}
                        onChange={(e) => setPricingConfig({ ...pricingConfig, baseFareRide: Number(e.target.value) })}
                        className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-xs text-[#f3efe6] font-mono outline-none"
                      />
                    </div>

                    {/* Per KM Ride */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#9b98a6]">
                        سعر الكيلومتر الواحد (د.ع/كم)
                      </label>
                      <input
                        type="number"
                        step="50"
                        value={pricingConfig.perKmRateRide}
                        onChange={(e) => setPricingConfig({ ...pricingConfig, perKmRateRide: Number(e.target.value) })}
                        className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-xs text-[#f3efe6] font-mono outline-none"
                      />
                    </div>

                    {/* Per Minute Ride */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#9b98a6]">
                        سعر الدقيقة الواحدة (الزحمة)
                      </label>
                      <input
                        type="number"
                        step="10"
                        value={pricingConfig.perMinuteRateRide}
                        onChange={(e) => setPricingConfig({ ...pricingConfig, perMinuteRateRide: Number(e.target.value) })}
                        className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-xs text-[#f3efe6] font-mono outline-none"
                      />
                    </div>

                    {/* Min Fare Ride */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#9b98a6]">
                        الحد الأدنى لسعر الرحلة (صارم)
                      </label>
                      <input
                        type="number"
                        step="250"
                        value={pricingConfig.minFareRide}
                        onChange={(e) => setPricingConfig({ ...pricingConfig, minFareRide: Number(e.target.value) })}
                        className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-xs text-[#f3efe6] font-mono outline-none"
                      />
                    </div>

                  </div>
                </div>

                {/* FOOD DELIVERY SECTION */}
                <div className="space-y-3 pt-3 border-t border-[#2e3140]">
                  <span className="text-xs font-black text-[#2fa6a6] uppercase tracking-wider block">
                    🍔 إعدادات توصيل الطعام (Food Delivery)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                    
                    {/* Base Fare Delivery */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#9b98a6]">
                        رسوم الانطلاق للتوصيل (د.ع)
                      </label>
                      <input
                        type="number"
                        step="250"
                        value={pricingConfig.baseFareDelivery}
                        onChange={(e) => setPricingConfig({ ...pricingConfig, baseFareDelivery: Number(e.target.value) })}
                        className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#2fa6a6] rounded-xl py-2 px-3 text-xs text-[#f3efe6] font-mono outline-none"
                      />
                    </div>

                    {/* Per KM Delivery */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#9b98a6]">
                        سعر كم التوصيل (د.ع/كم)
                      </label>
                      <input
                        type="number"
                        step="50"
                        value={pricingConfig.perKmRateDelivery}
                        onChange={(e) => setPricingConfig({ ...pricingConfig, perKmRateDelivery: Number(e.target.value) })}
                        className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#2fa6a6] rounded-xl py-2 px-3 text-xs text-[#f3efe6] font-mono outline-none"
                      />
                    </div>

                    {/* Per Minute Delivery */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#9b98a6]">
                        سعر دقيقة التوصيل (د.ع/دقيقة)
                      </label>
                      <input
                        type="number"
                        step="10"
                        value={pricingConfig.perMinuteRateDelivery}
                        onChange={(e) => setPricingConfig({ ...pricingConfig, perMinuteRateDelivery: Number(e.target.value) })}
                        className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#2fa6a6] rounded-xl py-2 px-3 text-xs text-[#f3efe6] font-mono outline-none"
                      />
                    </div>

                    {/* Min Fare Delivery */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#9b98a6]">
                        الحد الأدنى لرسوم التوصيل
                      </label>
                      <input
                        type="number"
                        step="250"
                        value={pricingConfig.minFareDelivery}
                        onChange={(e) => setPricingConfig({ ...pricingConfig, minFareDelivery: Number(e.target.value) })}
                        className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#2fa6a6] rounded-xl py-2 px-3 text-xs text-[#f3efe6] font-mono outline-none"
                      />
                    </div>

                  </div>
                </div>

              </div>

              {/* CARD 2: VEHICLE MULTIPLIERS & DRIVER DEVIATION RANGE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Vehicle Multipliers */}
                <div className="bg-[#1b1d28] border border-[#2e3140] rounded-[18px] p-4 sm:p-5 space-y-3.5 shadow-lg text-right">
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#f3efe6] flex items-center gap-2 border-b border-[#2e3140] pb-2">
                    <Car className="w-4 h-4 text-[#e8a33d]" />
                    <span>مضاعف فئات السيارات (Vehicle Multipliers)</span>
                  </h3>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="block text-[11px] text-[#9b98a6]">اقتصادي (Economy)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={pricingConfig.vehicleTypeMultipliers.economy}
                        onChange={(e) => setPricingConfig({
                          ...pricingConfig,
                          vehicleTypeMultipliers: { ...pricingConfig.vehicleTypeMultipliers, economy: Number(e.target.value) }
                        })}
                        className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-1.5 px-2.5 text-xs text-[#f3efe6] font-mono text-center"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-[#9b98a6]">مريح (Comfort)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={pricingConfig.vehicleTypeMultipliers.comfort}
                        onChange={(e) => setPricingConfig({
                          ...pricingConfig,
                          vehicleTypeMultipliers: { ...pricingConfig.vehicleTypeMultipliers, comfort: Number(e.target.value) }
                        })}
                        className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-1.5 px-2.5 text-xs text-[#f3efe6] font-mono text-center"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-[#9b98a6]">فخم (VIP)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={pricingConfig.vehicleTypeMultipliers.vip}
                        onChange={(e) => setPricingConfig({
                          ...pricingConfig,
                          vehicleTypeMultipliers: { ...pricingConfig.vehicleTypeMultipliers, vip: Number(e.target.value) }
                        })}
                        className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-1.5 px-2.5 text-xs text-[#f3efe6] font-mono text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Driver Deviation Range */}
                <div className="bg-[#1b1d28] border border-[#2e3140] rounded-[18px] p-4 sm:p-5 space-y-3.5 shadow-lg text-right">
                  <div className="flex items-center justify-between border-b border-[#2e3140] pb-2">
                    <h3 className="text-xs sm:text-sm font-extrabold text-[#f3efe6] flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#2fa6a6]" />
                      <span>نطاق التسعير المسموح للسائق (Driver Flex Range)</span>
                    </h3>
                    <span className="text-[10px] bg-[#e8a33d]/20 text-[#e8a33d] px-2 py-0.5 rounded font-bold">
                      ±{pricingConfig.allowedDriverDeviationPct}% انحراف
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#9b98a6]">
                      نسبة الانحراف المسموحة للسائق عن السعر الأساسي (%):
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="5"
                        max="50"
                        step="1"
                        value={pricingConfig.allowedDriverDeviationPct}
                        onChange={(e) => setPricingConfig({ ...pricingConfig, allowedDriverDeviationPct: Number(e.target.value) })}
                        className="w-28 bg-[#12131a] border border-[#2e3140] focus:border-[#2fa6a6] rounded-xl py-2 px-3 text-xs text-[#f3efe6] font-mono text-center"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[10, 15, 20, 25].map((pct) => (
                          <button
                            type="button"
                            key={pct}
                            onClick={() => setPricingConfig({ ...pricingConfig, allowedDriverDeviationPct: pct })}
                            className={`text-[10px] px-2.5 py-1 rounded-lg border font-mono font-bold cursor-pointer transition-all ${
                              pricingConfig.allowedDriverDeviationPct === pct
                                ? 'bg-[#2fa6a6] text-[#12131a] border-[#2fa6a6]'
                                : 'bg-[#232634] text-[#9b98a6] border-[#2e3140] hover:text-[#f3efe6]'
                            }`}
                          >
                            ±{pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-[#9b98a6] leading-relaxed">
                      تظهر أزرار الاقتراحات السريعة للسائق محصورة ضمن هذا النطاق، ولا يمكنه إرسال سعر أقل من الحد الأدنى العام.
                    </p>
                  </div>
                </div>

              </div>

              {/* CARD 3: TAXI SUBSCRIPTION, COMMISSIONS, & PEAK SURGE */}
              <div className="bg-[#1b1d28] border border-[#2e3140] rounded-[18px] p-4 sm:p-5 space-y-4 shadow-lg text-right">
                <h3 className="text-xs sm:text-sm font-extrabold text-[#f3efe6] flex items-center gap-2 border-b border-[#2e3140] pb-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>نظام اشتراكات السائقين والعمولات والذروة (النموذج النهائي 2026)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* Taxi Daily Subscription Fee */}
                  <div className="space-y-1.5 bg-[#12131a] p-3 rounded-xl border border-[#e8a33d]/30">
                    <label className="block text-xs font-bold text-[#e8a33d]">
                      اشتراك التكسي اليومي الثابت (د.ع)
                    </label>
                    <input
                      type="number"
                      step="500"
                      value={pricingConfig.dailySubscriptionFeeTaxi ?? 4000}
                      onChange={(e) => setPricingConfig({ ...pricingConfig, dailySubscriptionFeeTaxi: Number(e.target.value) })}
                      className="w-full bg-[#1b1d28] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-xs text-[#f3efe6] font-mono text-center font-bold"
                    />
                    <span className="text-[10px] text-[#9b98a6] block">رسوم ثابتة 24 ساعة (افتراضي 4,000 د.ع)</span>
                  </div>

                  {/* Grace Period Hours */}
                  <div className="space-y-1.5 bg-[#12131a] p-3 rounded-xl border border-[#2fa6a6]/30">
                    <label className="block text-xs font-bold text-[#2fa6a6]">
                      مهلة السماح قبل قفل الحساب (ساعة)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={pricingConfig.gracePeriodHoursTaxi ?? 1}
                      onChange={(e) => setPricingConfig({ ...pricingConfig, gracePeriodHoursTaxi: Number(e.target.value) })}
                      className="w-full bg-[#1b1d28] border border-[#2e3140] focus:border-[#2fa6a6] rounded-xl py-2 px-3 text-xs text-[#f3efe6] font-mono text-center font-bold"
                    />
                    <span className="text-[10px] text-[#9b98a6] block">مهلة 1 ساعة بعد انتهائه قبل القفل</span>
                  </div>

                  {/* Commission Ride */}
                  <div className="space-y-1.5 bg-[#12131a] p-3 rounded-xl border border-[#2e3140]">
                    <label className="block text-xs font-semibold text-[#9b98a6]">
                      عمولة رحلات التكسي (%)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={pricingConfig.commissionPctRide}
                      onChange={(e) => setPricingConfig({ ...pricingConfig, commissionPctRide: Number(e.target.value) })}
                      className="w-full bg-[#1b1d28] border border-[#2e3140] focus:border-emerald-400 rounded-xl py-2 px-3 text-xs text-emerald-400 font-mono text-center font-bold"
                    />
                    <span className="text-[10px] text-emerald-400/90 font-bold block">0% (جميع الأجرة تدفع للسائق بالكامل)</span>
                  </div>

                  {/* Commission Merchant */}
                  <div className="space-y-1.5 bg-[#12131a] p-3 rounded-xl border border-[#2e3140]">
                    <label className="block text-xs font-semibold text-[#9b98a6]">
                      عمولة المطاعم والتجار (%)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={pricingConfig.commissionPctMerchant ?? 10}
                      onChange={(e) => setPricingConfig({ ...pricingConfig, commissionPctMerchant: Number(e.target.value) })}
                      className="w-full bg-[#1b1d28] border border-[#2e3140] focus:border-emerald-400 rounded-xl py-2 px-3 text-xs text-[#f3efe6] font-mono text-center font-bold"
                    />
                    <span className="text-[10px] text-[#9b98a6] block">عمولة المنصة على طلبيات الطعام (10%)</span>
                  </div>

                </div>

                {/* PEAK SURGE TOGGLE BOX */}
                <div className="bg-[#12131a] border border-[#2e3140] rounded-xl p-3.5 flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-1 text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#f3efe6]">⚡ مضاعف تسعير أوقات الذروة (Peak Surge)</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${pricingConfig.isPeakActive ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-gray-800 text-gray-400'}`}>
                        {pricingConfig.isPeakActive ? 'مُفعّل الآن ⚡' : 'متوقف'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9b98a6]">
                      يزيد السعر الأساسي بمقدار (×{pricingConfig.peakMultiplier}) عند تفعيله أثناء الأمطار أو شدة الازدحامات.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#9b98a6]">المضاعف:</span>
                      <input
                        type="number"
                        step="0.05"
                        min="1.0"
                        max="3.0"
                        value={pricingConfig.peakMultiplier}
                        onChange={(e) => setPricingConfig({ ...pricingConfig, peakMultiplier: Number(e.target.value) })}
                        className="w-20 bg-[#1b1d28] border border-[#2e3140] focus:border-amber-400 rounded-lg py-1 px-2 text-xs text-amber-400 font-mono text-center font-extrabold"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setPricingConfig({ ...pricingConfig, isPeakActive: !pricingConfig.isPeakActive })}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        pricingConfig.isPeakActive
                          ? 'bg-amber-500 text-black shadow-lg hover:bg-amber-400'
                          : 'bg-[#232634] text-[#9b98a6] hover:text-[#f3efe6] border border-[#2e3140]'
                      }`}
                    >
                      {pricingConfig.isPeakActive ? 'إيقاف الذروة' : 'تفعيل الذروة الآن'}
                    </button>
                  </div>
                </div>

              </div>

              {/* CARD 4: LIVE PRICING SIMULATOR / TESTER FOR ADMIN */}
              <div className="bg-[#12131a] border border-[#2fa6a6]/40 rounded-[18px] p-4 sm:p-5 space-y-4 shadow-xl text-right">
                <div className="flex items-center justify-between border-b border-[#2e3140] pb-2">
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#2fa6a6] flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-[#2fa6a6]" />
                    <span>حاسبة تجربة التسعير المباشرة (Live Pricing Tester)</span>
                  </h3>
                  <span className="text-[10px] text-[#9b98a6]">اختبار المعادلة فورياً</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] text-[#9b98a6]">المسافة المفترضة (كم):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={simDistance}
                      onChange={(e) => setSimDistance(Number(e.target.value))}
                      className="w-full bg-[#1b1d28] border border-[#2e3140] rounded-xl py-1.5 px-3 text-xs text-[#f3efe6] font-mono text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] text-[#9b98a6]">الوقت المتوقع (دقيقة):</label>
                    <input
                      type="number"
                      step="1"
                      value={simDuration}
                      onChange={(e) => setSimDuration(Number(e.target.value))}
                      className="w-full bg-[#1b1d28] border border-[#2e3140] rounded-xl py-1.5 px-3 text-xs text-[#f3efe6] font-mono text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] text-[#9b98a6]">فئة السيارة:</label>
                    <select
                      value={simVehicleType}
                      onChange={(e) => setSimVehicleType(e.target.value as any)}
                      className="w-full bg-[#1b1d28] border border-[#2e3140] rounded-xl py-1.5 px-3 text-xs text-[#f3efe6] font-cairo"
                    >
                      <option value="economy">اقتصادي (Economy)</option>
                      <option value="comfort">مريح (Comfort)</option>
                      <option value="vip">فخم (VIP)</option>
                    </select>
                  </div>
                </div>

                {/* SIMULATOR RESULTS DISPLAY */}
                {(() => {
                  const rideRes = calculateRideBasePrice({
                    distanceKm: simDistance,
                    durationMin: simDuration,
                    vehicleType: simVehicleType,
                    config: pricingConfig,
                  });
                  const driverOpts = getDriverPriceOptions(rideRes.basePrice, pricingConfig);
                  const comm = calculateCommission(rideRes.basePrice, 'ride', pricingConfig);

                  return (
                    <div className="bg-[#1b1d28] border border-[#2e3140] rounded-xl p-3.5 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border-b border-[#2e3140] pb-2.5">
                        <div>
                          <span className="block text-[10px] text-[#9b98a6]">السعر الأساسي المحسوب</span>
                          <span className="text-sm font-black text-[#e8a33d] font-mono">
                            {rideRes.basePrice.toLocaleString()} د.ع
                          </span>
                        </div>

                        <div>
                          <span className="block text-[10px] text-[#9b98a6]">نطاق السائق المسموح</span>
                          <span className="text-xs font-extrabold text-[#f3efe6] font-mono">
                            {driverOpts.minAllowed.toLocaleString()} - {driverOpts.maxAllowed.toLocaleString()} د.ع
                          </span>
                        </div>

                        <div>
                          <span className="block text-[10px] text-[#9b98a6]">عمولة المنصة ({comm.pct}%)</span>
                          <span className="text-xs font-extrabold text-amber-400 font-mono">
                            {comm.commissionAmount.toLocaleString()} د.ع
                          </span>
                        </div>

                        <div>
                          <span className="block text-[10px] text-[#9b98a6]">صافي ربح السائق</span>
                          <span className="text-sm font-black text-emerald-400 font-mono">
                            {comm.driverNet.toLocaleString()} د.ع
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-right text-[11px]">
                        <span className="text-[#9b98a6] font-bold">الأزرار السريعة الظاهرة للسائق:</span>
                        {driverOpts.options.map((opt) => (
                          <span key={opt} className="bg-[#232634] text-[#2fa6a6] px-2 py-0.5 rounded font-mono font-bold border border-[#2e3140]">
                            {opt.toLocaleString()} د.ع
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* SAVE BUTTON */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] hover:brightness-110 text-[#12131a] font-black py-3.5 rounded-2xl text-xs sm:text-sm transition-all shadow-xl active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>حفظ وتطبيق جميع إعدادات ونطاقات محرك التسعير</span>
              </button>

              <AnimatePresence>
                {showPricingToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="bg-[#2fa6a6]/15 border border-[#2fa6a6] text-[#2fa6a6] rounded-xl p-3 text-xs font-extrabold text-center flex items-center justify-center gap-1.5"
                  >
                    <span>✓ تم حفظ وتفعيل إعدادات محرك التسعير في جميع شاشات التطبيق بنجاح</span>
                  </motion.div>
                )}
              </AnimatePresence>

            </form>
          </motion.div>
        )}

        {/* ===================== TAB 5: SUPPORT & MESSAGES (الدعم الفني) ===================== */}
        {activeTab === 'support' && (
          <motion.div
            key="tab-support"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 text-right"
          >
            <div className="bg-[#1b1d28] border border-[#2e3140] rounded-[16px] p-4 sm:p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm sm:text-base font-extrabold text-[#f3efe6]">
                    مركز الدعم الفني والرد المباشر
                  </h3>
                </div>
                <span className="text-xs text-[#9b98a6] font-medium">
                  {supportTickets.length} تذكرة/استفسار
                </span>
              </div>

              {supportTickets.length === 0 ? (
                <div className="text-center py-8 text-[#9b98a6] text-xs sm:text-sm">
                  لا توجد تذاكر دعم فني حالياً.
                </div>
              ) : (
                <div className="space-y-4">
                  {supportTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="bg-[#12131a] border border-[#2e3140] rounded-xl p-3.5 sm:p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs sm:text-sm text-[#f3efe6]">
                            {ticket.senderName}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              ticket.senderType === 'driver'
                                ? 'bg-[#e8a33d]/20 text-[#e8a33d]'
                                : ticket.senderType === 'merchant'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-[#2fa6a6]/20 text-[#2fa6a6]'
                            }`}
                          >
                            {ticket.senderType === 'driver'
                              ? 'سائق'
                              : ticket.senderType === 'merchant'
                              ? 'تاجر'
                              : 'زبون'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-[#9b98a6]">
                          <span className="font-mono dir-ltr">{ticket.senderPhone}</span>
                          <span>•</span>
                          <span>{ticket.createdAt}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              ticket.status === 'open'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            }`}
                          >
                            {ticket.status === 'open' ? 'بانتظار الرد' : 'تم الرد'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-[#1b1d28] p-3 rounded-lg border border-[#2e3140]/60 space-y-1">
                        <div className="text-xs font-bold text-[#e8a33d]">
                          الموضوع: {ticket.subject}
                        </div>
                        <p className="text-xs text-[#f3efe6] leading-relaxed">
                          {ticket.message}
                        </p>
                      </div>

                      {ticket.replies.length > 0 && (
                        <div className="space-y-2 pr-2 border-r-2 border-[#2fa6a6]/40 my-2">
                          {ticket.replies.map((reply) => (
                            <div
                              key={reply.id}
                              className="bg-[#2fa6a6]/10 border border-[#2fa6a6]/30 p-2.5 rounded-lg text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between text-[11px] text-[#2fa6a6] font-bold">
                                <span>{reply.senderName}</span>
                                <span className="font-mono text-[10px] text-[#9b98a6]">
                                  {reply.createdAt}
                                </span>
                              </div>
                              <p className="text-[#f3efe6] text-xs">{reply.text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="اكتب رد الدعم الفني هنا..."
                          value={replyInputMap[ticket.id] || ''}
                          onChange={(e) =>
                            setReplyInputMap({ ...replyInputMap, [ticket.id]: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendSupportReply(ticket.id);
                          }}
                          className="flex-grow bg-[#1b1d28] border border-[#2e3140] focus:border-[#2fa6a6] rounded-xl py-2 px-3 text-xs text-[#f3efe6] outline-none"
                        />
                        <button
                          onClick={() => handleSendSupportReply(ticket.id)}
                          className="bg-[#2fa6a6] hover:bg-[#258787] text-[#12131a] px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 shrink-0 transition-all cursor-pointer active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>إرسال</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ===================== TAB 6: FEMALE DRIVER SERVICE MANAGEMENT (إدارة الخدمة النسائية) ===================== */}
        {activeTab === 'female_service' && (
          <motion.div
            key="tab-female-service"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 text-right"
          >
            {/* Header Title & Intro Banner */}
            <div className="bg-gradient-to-r from-purple-950/60 via-[#1b1d28] to-[#12131a] border border-purple-500/40 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-200 border border-purple-500/40 flex items-center justify-center text-3xl shadow-lg shrink-0">
                  🌸
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#f3efe6] font-cairo flex items-center gap-2">
                    <span>إدارة نظام الخدمة النسائية المخصصة (سائقة لزبونة)</span>
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/30 font-bold">
                      مفعل بالنظام
                    </span>
                  </h2>
                  <p className="text-xs text-[#9b98a6] font-cairo mt-1 leading-relaxed">
                    تحكم كامل بقاعدة السائقات النسائية، تفعيل/تعطيل المناطق المشمولة، وضبط المهلة الزمنية للمطابقة التلقائية.
                  </p>
                </div>
              </div>

              {/* Quick Summary Badges */}
              <div className="flex items-center gap-2 text-xs font-cairo shrink-0">
                <div className="bg-[#12131a] border border-purple-500/30 px-3.5 py-2 rounded-2xl text-center">
                  <span className="text-[10px] text-[#9b98a6] block">إجمالي السائقات المسجلات</span>
                  <span className="text-base font-extrabold text-purple-300 font-mono">
                    {usersList.filter((u) => u.accountType === 'driver' && u.gender === 'female').length}
                  </span>
                </div>
                <div className="bg-[#12131a] border border-emerald-500/30 px-3.5 py-2 rounded-2xl text-center">
                  <span className="text-[10px] text-[#9b98a6] block">الموثقات والمجازات</span>
                  <span className="text-base font-extrabold text-emerald-400 font-mono">
                    {usersList.filter((u) => u.accountType === 'driver' && u.gender === 'female' && u.status === 'active').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeout Configuration Card */}
            <div className="bg-[#1b1d28] border border-[#2e3140] rounded-3xl p-5 shadow-lg space-y-3">
              <div className="flex items-center gap-2 border-b border-[#2e3140] pb-3">
                <Clock className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-extrabold text-[#f3efe6] font-cairo">
                  مهلة البحث والمطابقة مع سائقة نسائية (المؤقت التلقائي للزبونة)
                </h3>
              </div>
              <p className="text-xs text-[#9b98a6] font-cairo">
                المدة الزمنية التي يستغرقها النظام في البحث عن سائقة نسائية قبل إظهار خيار تحويل الطلب لسائق عادي أو التمديد.
              </p>

              <div className="flex items-center gap-3 pt-1">
                <div className="relative max-w-[200px] flex-1">
                  <input
                    type="number"
                    min={30}
                    max={600}
                    value={femaleTimeoutVal}
                    onChange={(e) => setFemaleTimeoutVal(Number(e.target.value))}
                    className="w-full bg-[#12131a] border border-purple-500/40 rounded-xl px-3 py-2 text-sm text-[#f3efe6] font-mono outline-none focus:border-purple-400 text-left"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-[#9b98a6]">ثانية</span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveTimeout}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-cairo transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ المهلة ({Math.round(femaleTimeoutVal / 60)} دقيقة)</span>
                </button>
              </div>
            </div>

            {/* Regions Coverage Control Matrix */}
            <div className="bg-[#1b1d28] border border-[#2e3140] rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-extrabold text-[#f3efe6] font-cairo">
                    مناطق تغطية وتوفر الخدمة النسائية بالعراق
                  </h3>
                </div>
                <span className="text-xs text-[#9b98a6] font-cairo">
                  يمكنك تفعيل أو إيقاف الخدمة حسب توفر كادر السائقات بكل مدينة
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {femaleZones.map((reg) => (
                  <div
                    key={reg.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      reg.enabled
                        ? 'bg-purple-950/20 border-purple-500/50'
                        : 'bg-[#12131a] border-[#2e3140] opacity-60'
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-extrabold text-[#f3efe6] font-cairo flex items-center gap-1.5">
                        <span>{reg.nameAr}</span>
                        {reg.enabled && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </h4>
                      <p className="text-[10px] text-[#9b98a6] font-cairo mt-0.5">
                        السائقات المتاحات: <span className="font-bold text-purple-300">{reg.activeFemaleDriversCount}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleZone(reg.id)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold font-cairo transition-all cursor-pointer border ${
                        reg.enabled
                          ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                          : 'bg-[#232634] text-[#9b98a6] border-[#2e3140] hover:text-[#f3efe6]'
                      }`}
                    >
                      {reg.enabled ? 'مفعلة ✓' : 'معطلة ✕'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Registered Female Drivers List Table */}
            <div className="bg-[#1b1d28] border border-[#2e3140] rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-extrabold text-[#f3efe6] font-cairo">
                    سجل الكابتن السائقات المسجلات بالمنصة
                  </h3>
                </div>
                <span className="text-xs text-purple-300 font-mono font-bold">
                  {usersList.filter((u) => u.accountType === 'driver' && u.gender === 'female').length} سائقة نسائية
                </span>
              </div>

              <div className="space-y-2.5">
                {usersList
                  .filter((u) => u.accountType === 'driver' && u.gender === 'female')
                  .map((driver) => (
                    <div
                      key={driver.id}
                      className="bg-[#12131a] border border-[#2e3140] hover:border-purple-500/40 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-cairo"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center font-black text-base shrink-0">
                          👩‍✈️
                        </div>
                        <div>
                          <h4 className="font-black text-[#f3efe6] text-sm flex items-center gap-2">
                            <span>{driver.fullName}</span>
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.2 rounded-full border border-purple-500/30">
                              سائقة معتمدة
                            </span>
                          </h4>
                          <div className="flex items-center gap-3 text-[11px] text-[#9b98a6] mt-0.5">
                            <span>📞 {driver.phone}</span>
                            <span>🚗 {driver.vehicleDetails || 'تويوتا كامري 2023 - أبيض'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            driver.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {driver.status === 'active' ? 'موثقة ومتاحة' : 'قيد التدقيق'}
                        </span>

                        <button
                          type="button"
                          onClick={() => setSelectedUserProfile(driver)}
                          className="px-3 py-1.5 rounded-xl bg-[#232634] hover:bg-[#2e3140] text-[#f3efe6] border border-[#2e3140] text-xs font-bold transition-all cursor-pointer"
                        >
                          عرض الملف
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ===================== TAB 7: WALLET MANAGEMENT (إدارة المحافظ والرصيد) ===================== */}
        {activeTab === 'wallets' && (
          <motion.div
            key="tab-wallets"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-6 text-right font-cairo"
          >
            {/* 1. Header & Summary Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#1b1d28] border border-[#2e3140] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-[#9b98a6] block font-medium">سيولة المحافظ في النظام</span>
                  <span className="text-lg font-black text-[#f3efe6] font-mono">
                    {usersList
                      .reduce((acc, u) => acc + getUserWalletBalance(u.id, u.accountType as any), 0)
                      .toLocaleString()}{' '}
                    <span className="text-xs font-sans text-emerald-400">د.ع</span>
                  </span>
                </div>
              </div>

              <div className="bg-[#1b1d28] border border-[#2e3140] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-[#9b98a6] block font-medium">طلبات سحب التجار المعلقة</span>
                  <span className="text-lg font-black text-[#f3efe6] font-mono">
                    {withdrawalRequests.filter((r) => r.status === 'pending').length}{' '}
                    <span className="text-xs font-sans text-amber-400">طلب تنتظر الموافقة</span>
                  </span>
                </div>
              </div>

              <div className="bg-[#1b1d28] border border-[#2e3140] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
                <div className="w-11 h-11 rounded-2xl bg-[#2fa6a6]/20 text-[#2fa6a6] border border-[#2fa6a6]/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-[#9b98a6] block font-medium">سجل العمليات الإدارية (Audit Log)</span>
                  <span className="text-lg font-black text-[#f3efe6] font-mono">
                    {auditLogs.length} <span className="text-xs font-sans text-[#2fa6a6]">عملية موثقة</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 1.5. Customer & Driver Top-Up Requests Approval Section */}
            <div className="bg-[#1b1d28] border border-[#2e3140] rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm sm:text-base font-black text-[#f3efe6]">
                    طلبات شحن المحفظة المعلقة - للزبائن والسائقين ({topUpRequests.filter((r) => r.status === 'pending').length})
                  </h3>
                </div>
                <span className="text-xs text-amber-400 font-bold">
                  ⚠️ يتوجب تأكيد وموافقة الأدمن قبل نزول المبالغ في محفظة العميل
                </span>
              </div>

              {topUpRequests.filter((r) => r.status === 'pending').length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#12131a] border border-[#2e3140] text-center text-xs text-[#9b98a6]">
                  لا توجد طلبات شحن محفظة معلقة حالياً.
                </div>
              ) : (
                <div className="space-y-3">
                  {topUpRequests
                    .filter((r) => r.status === 'pending')
                    .map((req) => (
                      <div
                        key={req.id}
                        className="bg-[#12131a] border border-[#2e3140] p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[#f3efe6] text-sm">{req.userName}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                req.userRole === 'driver'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {req.userRole === 'driver' ? 'سائق' : 'زبون'}
                            </span>
                          </div>
                          <p className="text-xs text-[#9b98a6]">
                            المبلغ المطلوب شحنه: <span className="font-bold text-emerald-400 font-mono text-sm">{req.amount.toLocaleString()} د.ع</span>
                          </p>
                          <p className="text-xs text-[#9b98a6]">
                            طريقة الشحن / رقم الكارد: <span className="text-[#f3efe6] font-mono">{req.paymentMethod === 'qi_rafidain' ? 'كي كارد / ماستر رافدين' : 'ماستر كارد'} ({req.cardNumberOrBarcode})</span>
                          </p>
                          <span className="text-[10px] text-[#9b98a6] block font-mono">
                            تاريخ ووقت الطلب: {req.requestDate}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                          <button
                            type="button"
                            onClick={() => handleApproveTopUp(req.id)}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-[#12131a] font-extrabold text-xs cursor-pointer shadow-lg transition-all"
                          >
                            ✅ تأكيد وموافقة على الشحن
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRejectTopUpModalReq(req);
                              setRejectTopUpReasonInput('');
                            }}
                            className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-extrabold text-xs cursor-pointer transition-all"
                          >
                            ❌ رفض الطلب
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* 2. Merchant Withdrawal Requests Approval Section */}
            <div className="bg-[#1b1d28] border border-[#2e3140] rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm sm:text-base font-black text-[#f3efe6]">
                    طلبات سحب أرباح المطاعم والتجار ({withdrawalRequests.filter((r) => r.status === 'pending').length})
                  </h3>
                </div>
                <span className="text-xs text-[#9b98a6]">
                  يمكنك مراجعة وتدقيق أرقام الحسابات والتحويل والموافقة أو الرفض
                </span>
              </div>

              {withdrawalRequests.filter((r) => r.status === 'pending').length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#12131a] border border-[#2e3140] text-center text-xs text-[#9b98a6]">
                  لا توجد طلبات سحب أرباح معلقة حالياً من قبل التجار.
                </div>
              ) : (
                <div className="space-y-3">
                  {withdrawalRequests
                    .filter((r) => r.status === 'pending')
                    .map((req) => (
                      <div
                        key={req.id}
                        className="bg-[#12131a] border border-[#2e3140] p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[#f3efe6] text-sm">{req.merchantName}</span>
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                              تاجر / مطعم
                            </span>
                          </div>
                          <p className="text-xs text-[#9b98a6]">
                            المبلغ المطلوب: <span className="font-bold text-amber-400 font-mono">{req.amount.toLocaleString()} د.ع</span>
                          </p>
                          <p className="text-xs text-[#9b98a6]">
                            تفاصيل الحساب البنكي / الكارد: <span className="text-[#f3efe6] font-mono">{req.bankAccountDetails}</span>
                          </p>
                          <span className="text-[10px] text-[#9b98a6] block font-mono">
                            تاريخ الطلب: {req.requestDate}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const res = approveWithdrawalRequest(req.id, 'مدير النظام (Admin)');
                              if (res.success) {
                                triggerToast('success', `✓ تم الموافقة على طلب سحب أرباح [${req.merchantName}] بمبلغ ${req.amount.toLocaleString()} د.ع`);
                                refreshWalletAdmin();
                              } else {
                                triggerToast('error', res.errorMsg || 'فشل تنفيذ عملية السحب.');
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-[#12131a] font-extrabold text-xs cursor-pointer shadow-lg transition-all"
                          >
                            ✅ موافقة وتحويل
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRejectModalReq(req);
                              setRejectReasonInput('');
                            }}
                            className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-extrabold text-xs cursor-pointer transition-all"
                          >
                            ❌ رفض الطلب
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* 3. Search & Manage Individual User Wallet */}
            <div className="bg-[#1b1d28] border border-[#2e3140] rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-[#2fa6a6]" />
                  <h3 className="text-sm sm:text-base font-black text-[#f3efe6]">
                    إدارة محفظة حساب معين (شحن / تعديل / سحب)
                  </h3>
                </div>
                <span className="text-xs text-[#9b98a6]">
                  ابحث باسم المستخدم، رقم الهاتف، أو اسم المطعم/السائق
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#9b98a6] absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={walletSearchQuery}
                  onChange={(e) => setWalletSearchQuery(e.target.value)}
                  placeholder="ابحث باسم المستخدم أو رقم الهاتف..."
                  className="w-full h-11 pr-10 pl-4 bg-[#12131a] border border-[#2e3140] focus:border-[#2fa6a6] rounded-2xl text-xs text-[#f3efe6] outline-none"
                />
              </div>

              {/* Live Search Results List */}
              {walletSearchQuery.trim() !== '' && (
                <div className="bg-[#12131a] border border-[#2e3140] rounded-2xl max-h-48 overflow-y-auto p-2 space-y-1">
                  {usersList
                    .filter(
                      (u) =>
                        u.fullName.toLowerCase().includes(walletSearchQuery.toLowerCase()) ||
                        u.phone.includes(walletSearchQuery) ||
                        u.username.toLowerCase().includes(walletSearchQuery.toLowerCase())
                    )
                    .map((user) => {
                      const bal = getUserWalletBalance(user.id, user.accountType as any);
                      return (
                        <div
                          key={user.id}
                          onClick={() => {
                            setWalletSelectedUser(user);
                            setWalletSearchQuery('');
                          }}
                          className="p-2.5 rounded-xl hover:bg-[#232634] transition-colors flex items-center justify-between cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#232634] border border-[#2e3140] flex items-center justify-center font-bold text-[#f3efe6]">
                              {user.accountType === 'driver' ? '🚗' : user.accountType === 'merchant' ? '🍴' : '👤'}
                            </div>
                            <div>
                              <span className="font-extrabold text-[#f3efe6] block">{user.fullName}</span>
                              <span className="text-[10px] text-[#9b98a6] font-mono">{user.phone} • {user.accountType}</span>
                            </div>
                          </div>

                          <div className="text-left">
                            <span className="font-bold text-[#2fa6a6] font-mono">{bal.toLocaleString()} د.ع</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Selected User Wallet Action Card */}
              {walletSelectedUser ? (
                <div className="bg-gradient-to-r from-[#12131a] to-[#1b1d28] border border-[#2fa6a6]/50 p-4 rounded-2xl space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#2fa6a6]/20 border border-[#2fa6a6]/40 flex items-center justify-center text-xl shrink-0">
                        {walletSelectedUser.accountType === 'driver' ? '🚗' : walletSelectedUser.accountType === 'merchant' ? '🍴' : '👤'}
                      </div>
                      <div>
                        <h4 className="font-black text-[#f3efe6] text-base flex items-center gap-2">
                          <span>{walletSelectedUser.fullName}</span>
                          <span className="px-2 py-0.5 rounded bg-[#232634] text-[#9b98a6] text-[10px] font-mono">
                            {walletSelectedUser.accountType === 'driver' ? 'سائق' : walletSelectedUser.accountType === 'merchant' ? 'مطعم/تاجر' : 'زبون'}
                          </span>
                        </h4>
                        <span className="text-xs text-[#9b98a6] font-mono">📞 {walletSelectedUser.phone} • ID: {walletSelectedUser.id}</span>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-xs text-[#9b98a6] block">الرصيد المتاح حالياً</span>
                      <span className="text-xl font-black text-emerald-400 font-mono">
                        {getUserWalletBalance(walletSelectedUser.id, walletSelectedUser.accountType as any).toLocaleString()} د.ع
                      </span>
                    </div>
                  </div>

                  {/* Wallet Action Buttons Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#2e3140]">
                    <button
                      type="button"
                      onClick={() => {
                        setWalletActionType('add');
                        setWalletAmountInput('');
                        setWalletReasonInput('');
                        setWalletErrorMsg(null);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 font-black text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة رصيد (شحن)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setWalletActionType('adjust');
                        setWalletAmountInput(getUserWalletBalance(walletSelectedUser.id, walletSelectedUser.accountType as any).toString());
                        setWalletReasonInput('');
                        setWalletErrorMsg(null);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-black text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Edit className="w-4 h-4" />
                      <span>تعديل الرصيد</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setWalletActionType('withdraw');
                        setWalletAmountInput('');
                        setWalletReasonInput('');
                        setWalletErrorMsg(null);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-black text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>سحب رصيد</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#12131a] rounded-2xl border border-[#2e3140] text-center text-xs text-[#9b98a6]">
                  💡 اختر مستخدماً من نتائج البحث أعلاه لإدارة محفظته.
                </div>
              )}
            </div>

            {/* 4. Append-Only Audit Log Table (سجل العمليات غير القابل للتعديل) */}
            <div className="bg-[#1b1d28] border border-[#2e3140] rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm sm:text-base font-black text-[#f3efe6]">
                    سجل التدقيق الإداري المحفوظ تلقائياً (Append-Only Audit Log)
                  </h3>
                </div>
                <span className="text-xs text-emerald-400 font-mono font-bold">
                  سجل غير قابل للحذف أو التعديل 🔒
                </span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#9b98a6] bg-[#12131a] rounded-2xl border border-[#2e3140]">
                  لا توجد عمليات إدارية مسجلة بعد.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-[#2e3140] text-[#9b98a6] font-bold">
                        <th className="p-2.5">التاريخ والوقت</th>
                        <th className="p-2.5">نوع العملية</th>
                        <th className="p-2.5">اسم الأدمن</th>
                        <th className="p-2.5">الحساب المستهدف</th>
                        <th className="p-2.5">المبلغ</th>
                        <th className="p-2.5">السبب الإجباري</th>
                        <th className="p-2.5">الرصيد (قبل ← بعد)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2e3140]/60">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#12131a]/60 transition-colors">
                          <td className="p-2.5 font-mono text-[11px] text-[#9b98a6] whitespace-nowrap">
                            {log.timestamp}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                log.actionType === 'add'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : log.actionType === 'adjust'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-red-500/20 text-red-400 border border-red-500/40'
                              }`}
                            >
                              {log.actionType === 'add'
                                ? '➕ إضافة رصيد'
                                : log.actionType === 'adjust'
                                ? '✏️ تعديل رصيد'
                                : '➖ سحب رصيد'}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-[#f3efe6]">{log.adminName}</td>
                          <td className="p-2.5">
                            <span className="font-extrabold text-[#f3efe6] block">{log.targetUserName}</span>
                            <span className="text-[10px] text-[#9b98a6] font-mono">{log.targetUserRole}</span>
                          </td>
                          <td className="p-2.5 font-mono font-black text-[#f3efe6]">
                            {log.amount.toLocaleString()} د.ع
                          </td>
                          <td className="p-2.5 text-[#9b98a6] max-w-xs truncate" title={log.reason}>
                            {log.reason}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-[#2fa6a6] whitespace-nowrap">
                            {log.balanceBefore.toLocaleString()} ← {log.balanceAfter.toLocaleString()} د.ع
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== ADD USER MODAL (إضافة حساب جديد) ===================== */}
      <AnimatePresence>
        {showAddUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm text-right">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-[#1b1d28] border border-[#2e3140] rounded-[20px] w-full max-w-lg overflow-y-auto max-h-[90vh] p-5 space-y-4 shadow-2xl relative scrollbar-none"
            >
              <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#e8a33d]" />
                  <h2 className="text-base font-extrabold text-[#f3efe6]">
                    إضافة حساب جديد إلى المنصة
                  </h2>
                </div>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="p-1 text-[#9b98a6] hover:text-[#f3efe6] rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateNewUserSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#9b98a6] mb-1 font-semibold">نوع الحساب:</label>
                  <select
                    value={newUserForm.accountType}
                    onChange={(e) => setNewUserForm({ ...newUserForm, accountType: e.target.value as any })}
                    className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-[#f3efe6] outline-none"
                  >
                    <option value="customer">زبون (عميل)</option>
                    <option value="driver">سائق كابتن</option>
                    <option value="merchant">تاجر / صاحب مطعم</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#9b98a6] mb-1 font-semibold">الاسم الكامل:</label>
                    <input
                      type="text"
                      required
                      value={newUserForm.fullName}
                      onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                      placeholder="مثال: حيدر فاضل الحسني"
                      className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-[#f3efe6] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[#9b98a6] mb-1 font-semibold">اسم المستخدم (اليوزر):</label>
                    <input
                      type="text"
                      required
                      value={newUserForm.username}
                      onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                      placeholder="مثال: haider_driver"
                      className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-[#f3efe6] outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#9b98a6] mb-1 font-semibold">رقم الهاتف:</label>
                    <input
                      type="tel"
                      required
                      value={newUserForm.phone}
                      onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                      placeholder="07701234567"
                      className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-[#f3efe6] outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[#9b98a6] mb-1 font-semibold">البريد الإلكتروني:</label>
                    <input
                      type="email"
                      required
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      placeholder="user@taksati.iq"
                      className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-[#f3efe6] outline-none font-mono"
                    />
                  </div>
                </div>

                {newUserForm.accountType === 'driver' && (
                  <div>
                    <label className="block text-[#9b98a6] mb-1 font-semibold">تفاصيل المركبة:</label>
                    <input
                      type="text"
                      value={newUserForm.vehicleDetails}
                      onChange={(e) => setNewUserForm({ ...newUserForm, vehicleDetails: e.target.value })}
                      placeholder="تويوتا كورولا 2022 - أصفر - بغداد 1234"
                      className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-[#f3efe6] outline-none"
                    />
                  </div>
                )}

                {newUserForm.accountType === 'merchant' && (
                  <div>
                    <label className="block text-[#9b98a6] mb-1 font-semibold">عنوان النشاط التجاري:</label>
                    <input
                      type="text"
                      value={newUserForm.address}
                      onChange={(e) => setNewUserForm({ ...newUserForm, address: e.target.value })}
                      placeholder="بغداد - المنصور - الشارع الرئيسي"
                      className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-[#f3efe6] outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[#9b98a6] mb-1 font-semibold">كلمة المرور الابتدائية:</label>
                  <input
                    type="text"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-[#f3efe6] outline-none font-mono"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] hover:brightness-110 text-[#12131a] font-extrabold py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    حفظ وإضافة الحساب
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 py-2.5 bg-[#232634] text-[#9b98a6] hover:text-[#f3efe6] rounded-xl text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================== PROFILE DETAIL VIEW MODAL (بطاقة الملف الشخصي والتعديل والحذف) ===================== */}
      <AnimatePresence>
        {selectedUserProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm text-right">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-[#1b1d28] border border-[#2e3140] rounded-[20px] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-5 shadow-2xl relative scrollbar-none"
            >
              {/* Top Bar / Close */}
              <div className="flex items-center justify-between border-b border-[#2e3140] pb-3.5">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center border shrink-0 ${
                    selectedUserProfile.accountType === 'driver' ? 'bg-[#e8a33d]/20 border-[#e8a33d] text-[#e8a33d]' :
                    selectedUserProfile.accountType === 'merchant' ? 'bg-purple-500/20 border-purple-500 text-purple-300' :
                    'bg-[#2fa6a6]/20 border-[#2fa6a6] text-[#2fa6a6]'
                  }`}>
                    {selectedUserProfile.accountType === 'driver' ? <Car className="w-6 h-6" /> :
                     selectedUserProfile.accountType === 'merchant' ? <Building2 className="w-6 h-6" /> :
                     <User className="w-6 h-6" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black text-[#f3efe6]">
                        {selectedUserProfile.fullName}
                      </h2>
                      <span className={`text-xs px-2 py-0.5 rounded font-extrabold ${
                        selectedUserProfile.accountType === 'driver' ? 'bg-[#e8a33d]/20 text-[#e8a33d]' :
                        selectedUserProfile.accountType === 'merchant' ? 'bg-purple-500/20 text-purple-300' :
                        'bg-[#2fa6a6]/20 text-[#2fa6a6]'
                      }`}>
                        {selectedUserProfile.accountType === 'driver' ? 'سائق موثق' :
                         selectedUserProfile.accountType === 'merchant' ? 'تاجر / مطعم' : 'زبون'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                        selectedUserProfile.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                        selectedUserProfile.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                        'bg-red-500/20 text-red-400 border-red-500/40'
                      }`}>
                        {selectedUserProfile.status === 'active' ? 'نشط بالنظام' :
                         selectedUserProfile.status === 'pending' ? 'قيد المراجعة' : 'مرفوض/موقوف'}
                      </span>
                    </div>
                    <p className="text-xs text-[#9b98a6] mt-0.5 font-mono">
                      رقم الحساب: {selectedUserProfile.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="px-3 py-1.5 bg-[#232634] hover:bg-[#e8a33d]/20 hover:text-[#e8a33d] border border-[#2e3140] text-[#f3efe6] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5 text-[#e8a33d]" />
                    <span>{isEditingProfile ? 'إلغاء التعديل' : 'تعديل البيانات'}</span>
                  </button>

                  <button
                    onClick={() => setSelectedUserProfile(null)}
                    className="p-1.5 text-[#9b98a6] hover:text-[#f3efe6] hover:bg-[#2e3140] rounded-xl transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Download KYC Document Report Button */}
              <button
                onClick={() => handleDownloadKycFile(selectedUserProfile)}
                className="w-full bg-[#232634] hover:bg-[#2fa6a6]/20 text-[#2fa6a6] border border-[#2fa6a6]/50 font-extrabold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4 text-[#2fa6a6]" />
                <span>تنزيل واستخراج ملف التوثيق الشامل (KYC Dossier File)</span>
              </button>

              {/* Inline Edit Mode vs Normal View */}
              {isEditingProfile ? (
                <div className="bg-[#12131a] p-4 rounded-xl border border-[#e8a33d]/40 space-y-3 text-xs">
                  <h3 className="font-extrabold text-[#e8a33d] mb-2 flex items-center gap-1.5">
                    <Edit className="w-4 h-4" />
                    <span>تعديل بيانات الحساب وحالته</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#9b98a6] mb-1 font-semibold">الاسم الكامل:</label>
                      <input
                        type="text"
                        value={editForm.fullName}
                        onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                        className="w-full bg-[#1b1d28] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-[#f3efe6] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[#9b98a6] mb-1 font-semibold">حالة الحساب:</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                        className="w-full bg-[#1b1d28] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-[#f3efe6] outline-none"
                      >
                        <option value="active">نشط (مفعل ومعتمد)</option>
                        <option value="pending">قيد المراجعة والتدقيق</option>
                        <option value="rejected">مرفوض</option>
                        <option value="suspended">موقوف مؤقتاً</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#9b98a6] mb-1 font-semibold">رقم الهاتف:</label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full bg-[#1b1d28] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-[#f3efe6] outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[#9b98a6] mb-1 font-semibold">البريد الإلكتروني:</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full bg-[#1b1d28] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-[#f3efe6] outline-none font-mono"
                      />
                    </div>
                  </div>

                  {selectedUserProfile.accountType === 'driver' && (
                    <div>
                      <label className="block text-[#9b98a6] mb-1 font-semibold">بيانات المركبة:</label>
                      <input
                        type="text"
                        value={editForm.vehicleDetails}
                        onChange={(e) => setEditForm({ ...editForm, vehicleDetails: e.target.value })}
                        className="w-full bg-[#1b1d28] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-[#f3efe6] outline-none"
                      />
                    </div>
                  )}

                  {selectedUserProfile.accountType === 'merchant' && (
                    <div>
                      <label className="block text-[#9b98a6] mb-1 font-semibold">عنوان المطعم/النشاط:</label>
                      <input
                        type="text"
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        className="w-full bg-[#1b1d28] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-[#f3efe6] outline-none"
                      />
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={handleSaveProfileEdit}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-110 text-white font-extrabold py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>حفظ التعديلات</span>
                    </button>
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2 bg-[#232634] text-[#9b98a6] hover:text-[#f3efe6] rounded-xl font-bold cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                /* Account Basic Info Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#12131a] p-3.5 rounded-xl border border-[#2e3140]">
                  <div className="space-y-1">
                    <span className="text-[#9b98a6] block font-semibold">رقم الهاتف:</span>
                    <span className="text-[#f3efe6] font-mono font-bold dir-ltr block text-right">
                      {selectedUserProfile.phone}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[#9b98a6] block font-semibold">البريد الإلكتروني:</span>
                    <span className="text-[#f3efe6] font-mono font-bold truncate block">
                      {selectedUserProfile.email}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[#9b98a6] block font-semibold">تاريخ تقديم الطلب:</span>
                    <span className="text-[#f3efe6] font-semibold block">
                      {selectedUserProfile.appliedAt || '2026-01-15'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[#9b98a6] block font-semibold">تاريخ الموافقة والموثِّق:</span>
                    <span className="text-[#2fa6a6] font-bold block">
                      {selectedUserProfile.approvedAt
                        ? `${selectedUserProfile.approvedAt} (بواسطة ${selectedUserProfile.approvedBy || 'المدير العام'})`
                        : selectedUserProfile.status === 'active'
                        ? 'تم الاعتماد (المدير العام)'
                        : 'لم تتم الموافقة بعد'}
                    </span>
                  </div>
                </div>
              )}

              {/* Driver Details & Vehicle Info */}
              {selectedUserProfile.accountType === 'driver' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-[#e8a33d] flex items-center gap-1.5">
                    <Car className="w-4 h-4" />
                    <span>بيانات المركبة المسجلة بالنظام</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#12131a] p-3 rounded-xl border border-[#2e3140] text-xs">
                    <div>
                      <span className="text-[#9b98a6] block text-[10px]">نوع المركبة:</span>
                      <span className="text-[#f3efe6] font-bold">
                        {selectedUserProfile.vehicleDetails?.split('-')[0] || 'تكسي / صالون'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#9b98a6] block text-[10px]">الموديل والسنة:</span>
                      <span className="text-[#f3efe6] font-bold">
                        {selectedUserProfile.vehicleDetails?.split('-')[1] || '2021'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#9b98a6] block text-[10px]">رقم اللوحة:</span>
                      <span className="text-[#e8a33d] font-bold font-mono">
                        {selectedUserProfile.vehicleDetails?.split('-')[2] || 'بغداد 78415 - أ'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#9b98a6] block text-[10px]">اللون:</span>
                      <span className="text-[#f3efe6] font-bold">
                        {selectedUserProfile.vehicleDetails?.split('-')[3] || 'أصفر تكسي'}
                      </span>
                    </div>
                  </div>

                  {/* Uploaded Documents */}
                  <div className="space-y-2">
                    <span className="text-xs font-extrabold text-[#f3efe6] block">
                      الوثائق الرسمية المرفوعة وقت التوثيق (محفوظة دائماً):
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[#12131a] border border-[#2e3140] p-2 rounded-xl text-center space-y-1">
                        <div className="text-[10px] text-[#9b98a6] font-bold truncate">رخصة القيادة</div>
                        <div className="h-16 bg-[#1b1d28] rounded-lg border border-[#2e3140] flex items-center justify-center text-[#e8a33d]">
                          <FileText className="w-6 h-6" />
                        </div>
                      </div>

                      <div className="bg-[#12131a] border border-[#2e3140] p-2 rounded-xl text-center space-y-1">
                        <div className="text-[10px] text-[#9b98a6] font-bold truncate">الهوية الوطنية</div>
                        <div className="h-16 bg-[#1b1d28] rounded-lg border border-[#2e3140] flex items-center justify-center text-[#2fa6a6]">
                          <FileCheck className="w-6 h-6" />
                        </div>
                      </div>

                      <div className="bg-[#12131a] border border-[#2e3140] p-2 rounded-xl text-center space-y-1">
                        <div className="text-[10px] text-[#9b98a6] font-bold truncate">سنوية المركبة/الفحص</div>
                        <div className="h-16 bg-[#1b1d28] rounded-lg border border-[#2e3140] flex items-center justify-center text-purple-400">
                          <Car className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Merchant Details */}
              {selectedUserProfile.accountType === 'merchant' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-purple-400 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    <span>بيانات النشاط التجاري والمطعم</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#12131a] p-3 rounded-xl border border-[#2e3140] text-xs">
                    <div>
                      <span className="text-[#9b98a6] block text-[10px]">اسم المطعم/المحل:</span>
                      <span className="text-[#f3efe6] font-bold">
                        {selectedUserProfile.fullName}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#9b98a6] block text-[10px]">العنوان الفرعي:</span>
                      <span className="text-[#f3efe6] font-bold">
                        {selectedUserProfile.address || 'العراق - بغداد'}
                      </span>
                    </div>
                  </div>

                  {/* Merchant Uploaded Documents */}
                  <div className="space-y-2">
                    <span className="text-xs font-extrabold text-[#f3efe6] block">
                      وثائق التوثيق التجاري المرفوعة:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#12131a] border border-[#2e3140] p-2 rounded-xl text-center space-y-1">
                        <div className="text-[10px] text-[#9b98a6] font-bold">الهوية التجارية / الرخصة</div>
                        <div className="h-16 bg-[#1b1d28] rounded-lg border border-[#2e3140] flex items-center justify-center text-purple-400">
                          <Building2 className="w-6 h-6" />
                        </div>
                      </div>

                      <div className="bg-[#12131a] border border-[#2e3140] p-2 rounded-xl text-center space-y-1">
                        <div className="text-[10px] text-[#9b98a6] font-bold">عقد أجار/ملك المحل</div>
                        <div className="h-16 bg-[#1b1d28] rounded-lg border border-[#2e3140] flex items-center justify-center text-[#2fa6a6]">
                          <FileText className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Complaints & Admin Notes Log Section */}
              <div className="space-y-3 pt-2 border-t border-[#2e3140]">
                <h3 className="text-xs font-extrabold text-[#f3efe6] flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>سجل الشكاوى والملاحظات الإدارية الملازمة للحساب</span>
                </h3>

                {/* Form to Add New Note */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="أضف ملاحظة أو شكوى جديدة تخص هذا الحساب..."
                    value={complaintInput}
                    onChange={(e) => setComplaintInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComplaintNote(selectedUserProfile.id);
                    }}
                    className="flex-grow bg-[#12131a] border border-[#2e3140] focus:border-[#e8a33d] rounded-xl py-2 px-3 text-xs text-[#f3efe6] outline-none"
                  />
                  <button
                    onClick={() => handleAddComplaintNote(selectedUserProfile.id)}
                    className="bg-gradient-to-r from-[#e8a33d] to-[#c97b3d] text-[#12131a] font-extrabold px-3 py-2 rounded-xl text-xs shrink-0 hover:brightness-110 active:scale-95 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة</span>
                  </button>
                </div>

                {/* Notes List */}
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1 scrollbar-none">
                  {(!selectedUserProfile.complaints || selectedUserProfile.complaints.length === 0) ? (
                    <div className="text-center py-4 bg-[#12131a] border border-[#2e3140] rounded-xl text-[11px] text-[#9b98a6]">
                      لا توجد أي شكاوى أو ملاحظات مدونة على هذا الحساب بعد.
                    </div>
                  ) : (
                    selectedUserProfile.complaints.map((note) => (
                      <div
                        key={note.id}
                        className="bg-[#12131a] border border-red-500/30 p-2.5 rounded-xl space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between text-[10px] text-[#9b98a6]">
                          <span className="font-bold text-red-400">{note.adminName}</span>
                          <span className="font-mono">{note.date}</span>
                        </div>
                        <p className="text-[#f3efe6] leading-relaxed">{note.note}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Actions: Delete & Close */}
              <div className="pt-2 flex items-center gap-2">
                {selectedUserProfile.accountType !== 'admin' && (
                  <button
                    onClick={() => handleDeleteUser(selectedUserProfile.id, selectedUserProfile.fullName)}
                    className="flex-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 font-extrabold py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف الحساب نهائياً من النظام</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedUserProfile(null)}
                  className="px-5 py-2.5 bg-[#232634] hover:bg-[#2e3140] border border-[#2e3140] text-[#f3efe6] font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================== DELETE CONFIRMATION MODAL ===================== */}
      <AnimatePresence>
        {userToDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md text-right dir-rtl" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-[#1b1d28] border border-red-500/50 rounded-[20px] w-full max-w-md p-6 space-y-5 shadow-2xl relative text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
                <Trash2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-black text-[#f3efe6]">
                  تأكيد حذف الحساب نهائياً
                </h2>
                <p className="text-xs text-[#9b98a6] leading-relaxed">
                  هل أنت متأكد من رغبتك في حذف حساب <span className="font-extrabold text-red-400">[{userToDeleteConfirm.name}]</span> نهائياً من قاعدة البيانات والسيرفر؟
                </p>
                <p className="text-[11px] text-red-400/80 bg-red-500/10 p-2 rounded-xl border border-red-500/20 font-bold">
                  ⚠️ تنبيه: هذه العملية لا يمكن التراجع عنها وسيتم إزالة المستخدم وسجلاته تماماً.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={confirmDeleteUser}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl text-xs transition-all shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>نعم، حذف الحساب نهائياً</span>
                </button>

                <button
                  onClick={() => setUserToDeleteConfirm(null)}
                  className="flex-1 bg-[#232634] hover:bg-[#2e3140] border border-[#2e3140] text-[#f3efe6] font-extrabold py-3 rounded-xl text-xs transition-all cursor-pointer"
                >
                  إلغاء الأمر
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================== WALLET ACTION MODAL (إضافة / تعديل / سحب رصيد) ===================== */}
      <AnimatePresence>
        {walletActionType && walletSelectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md text-right font-cairo">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1b1d28] border border-[#2e3140] rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-black text-[#f3efe6]">
                    {walletActionType === 'add'
                      ? '➕ إضافة رصيد للحساب'
                      : walletActionType === 'adjust'
                      ? '✏️ تعديل رصيد المحفظة'
                      : '➖ سحب رصيد من المحفظة'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setWalletActionType(null)}
                  className="p-1.5 text-[#9b98a6] hover:text-[#f3efe6] rounded-xl hover:bg-[#232634]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Target User Banner */}
              <div className="p-3 bg-[#12131a] rounded-2xl border border-[#2e3140] flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-[#f3efe6] block">{walletSelectedUser.fullName}</span>
                  <span className="text-[10px] text-[#9b98a6] font-mono">{walletSelectedUser.accountType} • {walletSelectedUser.phone}</span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-[#9b98a6] block">الرصيد الحقيقي</span>
                  <span className="font-mono font-extrabold text-emerald-400">
                    {getUserWalletBalance(walletSelectedUser.id, walletSelectedUser.accountType as any).toLocaleString()} د.ع
                  </span>
                </div>
              </div>

              {walletErrorMsg && (
                <div className="p-3 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-bold">
                  ⚠️ {walletErrorMsg}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setWalletErrorMsg(null);
                  const amt = parseFloat(walletAmountInput.replace(/[^0-9.]/g, '')) || 0;
                  if (amt < 0) {
                    setWalletErrorMsg('يرجى إدخال مبلغ صحيح.');
                    return;
                  }
                  if (!walletReasonInput.trim()) {
                    setWalletErrorMsg('السبب إجباري ومطلوب لجميع العمليات الإدارية لتوثيق السجل.');
                    return;
                  }

                  let res;
                  if (walletActionType === 'add') {
                    res = adminAddWalletFunds({
                      adminName: 'مدير النظام (Admin)',
                      targetUserId: walletSelectedUser.id,
                      targetUserName: walletSelectedUser.fullName,
                      targetUserRole: walletSelectedUser.accountType as any,
                      amount: amt,
                      reason: walletReasonInput,
                    });
                  } else if (walletActionType === 'adjust') {
                    res = adminAdjustWalletBalance({
                      adminName: 'مدير النظام (Admin)',
                      targetUserId: walletSelectedUser.id,
                      targetUserName: walletSelectedUser.fullName,
                      targetUserRole: walletSelectedUser.accountType as any,
                      newBalance: amt,
                      reason: walletReasonInput,
                    });
                  } else {
                    res = adminWithdrawWalletFunds({
                      adminName: 'مدير النظام (Admin)',
                      targetUserId: walletSelectedUser.id,
                      targetUserName: walletSelectedUser.fullName,
                      targetUserRole: walletSelectedUser.accountType as any,
                      amount: amt,
                      reason: walletReasonInput,
                    });
                  }

                  if (res.success) {
                    triggerToast('success', `✓ تم تنفيذ العملية بنجاح وتحديث محفظة [${walletSelectedUser.fullName}]`);
                    setWalletActionType(null);
                    refreshWalletAdmin();
                  } else {
                    setWalletErrorMsg(res.errorMsg || 'فشل تنفيذ العملية.');
                  }
                }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="block text-[#9b98a6] mb-1 font-bold">
                    {walletActionType === 'adjust' ? 'المبلغ الجديد الصافي للرصيد (د.ع):' : 'المبلغ (د.ع):'}
                  </label>
                  <input
                    type="text"
                    required
                    value={walletAmountInput}
                    onChange={(e) => setWalletAmountInput(e.target.value)}
                    placeholder="مثال: 25000"
                    className="w-full h-11 px-3.5 bg-[#12131a] border border-[#2e3140] focus:border-emerald-400 rounded-xl text-xs font-mono font-bold text-[#f3efe6] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#9b98a6] mb-1 font-bold">
                    سبب العملية (إجباري ومحفوظ تلقائياً للتدقيق):
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={walletReasonInput}
                    onChange={(e) => setWalletReasonInput(e.target.value)}
                    placeholder="اكتب سبب العملية الإدارية هنا (مثلاً: تعويض زبون، مكافأة تشجيعية، تسوية حساب...)"
                    className="w-full p-3 bg-[#12131a] border border-[#2e3140] focus:border-emerald-400 rounded-xl text-xs text-[#f3efe6] outline-none resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-[#12131a] font-black text-xs cursor-pointer hover:brightness-110 shadow-lg"
                  >
                    تأكيد وتنفيذ العملية ⚡
                  </button>

                  <button
                    type="button"
                    onClick={() => setWalletActionType(null)}
                    className="px-4 h-11 rounded-xl bg-[#232634] text-[#9b98a6] hover:text-[#f3efe6] font-bold text-xs"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================== TOP-UP REJECTION REASON MODAL ===================== */}
      <AnimatePresence>
        {rejectTopUpModalReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md text-right font-cairo">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1b1d28] border border-red-500/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
                <h3 className="text-base font-black text-red-400 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  <span>رفض طلب شحن المحفظة - {rejectTopUpModalReq.userName}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setRejectTopUpModalReq(null)}
                  className="p-1.5 text-[#9b98a6] hover:text-[#f3efe6] rounded-xl hover:bg-[#232634]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleConfirmRejectTopUp();
                }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="block text-[#9b98a6] mb-1 font-bold">
                    سبب رفض طلب الشحن (سيتم تبليغ المستخدم به):
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={rejectTopUpReasonInput}
                    onChange={(e) => setRejectTopUpReasonInput(e.target.value)}
                    placeholder="مثال: عدم مطابقة إيصال التحويل، أو خطأ في رقم البطاقة/البار كود..."
                    className="w-full p-3 bg-[#12131a] border border-[#2e3140] focus:border-red-500 rounded-xl text-xs text-[#f3efe6] outline-none resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs cursor-pointer shadow-lg"
                  >
                    تأكيد رفض طلب الشحن ✕
                  </button>

                  <button
                    type="button"
                    onClick={() => setRejectTopUpModalReq(null)}
                    className="px-4 h-11 rounded-xl bg-[#232634] text-[#9b98a6] hover:text-[#f3efe6] font-bold text-xs"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================== MERCHANT REJECTION REASON MODAL ===================== */}
      <AnimatePresence>
        {rejectModalReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md text-right font-cairo">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1b1d28] border border-red-500/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-[#2e3140] pb-3">
                <h3 className="text-base font-black text-red-400 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  <span>رفض طلب سحب الأرباح - {rejectModalReq.merchantName}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setRejectModalReq(null)}
                  className="p-1.5 text-[#9b98a6] hover:text-[#f3efe6] rounded-xl hover:bg-[#232634]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!rejectReasonInput.trim()) {
                    alert('يرجى كتابة سبب الرفض لتوضيحه للتاجر.');
                    return;
                  }

                  const res = rejectWithdrawalRequest(
                    rejectModalReq.id,
                    'مدير النظام (Admin)',
                    rejectReasonInput
                  );

                  if (res.success) {
                    triggerToast('error', `✕ تم رفض طلب السحب للتاجر [${rejectModalReq.merchantName}]`);
                    setRejectModalReq(null);
                    refreshWalletAdmin();
                  } else {
                    alert(res.errorMsg || 'فشل تنفيذ عملية الرفض.');
                  }
                }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="block text-[#9b98a6] mb-1 font-bold">
                    سبب الرفض (سيتم إرساله للتاجر وتدوينه بالسجل):
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={rejectReasonInput}
                    onChange={(e) => setRejectReasonInput(e.target.value)}
                    placeholder="مثال: خطأ في تفاصيل رقم الكارد أو الحساب البنكي، يرجى إعادة إدخال رقم الكارد صحيحاً..."
                    className="w-full p-3 bg-[#12131a] border border-[#2e3140] focus:border-red-500 rounded-xl text-xs text-[#f3efe6] outline-none resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs cursor-pointer shadow-lg"
                  >
                    تأكيد رفض الطلب ✕
                  </button>

                  <button
                    type="button"
                    onClick={() => setRejectModalReq(null)}
                    className="px-4 h-11 rounded-xl bg-[#232634] text-[#9b98a6] hover:text-[#f3efe6] font-bold text-xs"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
