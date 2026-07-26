import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

export interface UserComplaintNote {
  id: string;
  note: string;
  date: string;
  adminName: string;
}

export interface UserRecord {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  accountType: 'customer' | 'driver' | 'merchant' | 'admin';
  status: 'active' | 'pending' | 'rejected' | 'suspended';
  gender?: 'male' | 'female';
  preferredWorkingZones?: string[];
  createdAt: string;
  avatarUrl?: string;
  kycDocuments?: string[];
  kycImageFiles?: { name: string; dataUrl: string }[];
  vehicleDetails?: string;
  address?: string;
  appliedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  complaints?: UserComplaintNote[];
}

const STORAGE_KEY = 'taksati_database_users_v2';
const EVENT_NAME = 'taksati_user_store_updated';

function notifyUserChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
}

export function subscribeToUserDatabase(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}

// Initial pre-populated seed accounts in database
const INITIAL_SEED_USERS: UserRecord[] = [
  {
    id: 'user-seed-admin',
    fullName: 'المدير العام (نعيمي)',
    username: 'admin',
    email: 'admin@alnuaimi.com',
    phone: '07500000000',
    password: 'hemoome1995',
    accountType: 'admin',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
];

const DELETED_USERS_KEY = 'taksati_deleted_user_ids';

function getDeletedUserIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_USERS_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<string>();
  }
}

function recordDeletedUserId(id: string): void {
  try {
    const current = Array.from(getDeletedUserIds());
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(current));
    }
  } catch (e) {
    console.error('Failed to record deleted user ID', e);
  }
}

// Helper to get all stored users
export function getUsersFromDatabase(): UserRecord[] {
  const deletedIds = getDeletedUserIds();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let parsed: UserRecord[] = [];
    if (raw) {
      try {
        parsed = JSON.parse(raw) as UserRecord[];
      } catch {
        parsed = [];
      }
    }

    // Always guarantee that initial seed users exist if not explicitly deleted
    INITIAL_SEED_USERS.forEach((seed) => {
      if (!deletedIds.has(seed.id) && !parsed.some((u) => u.id === seed.id || u.username === seed.username)) {
        parsed.push(seed);
      }
    });

    if (parsed.length === 0) {
      parsed = INITIAL_SEED_USERS.filter((u) => !deletedIds.has(u.id));
    }

    // Save back to ensure localStorage is never empty
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // Ignore if localStorage unavailable
    }

    // Filter out any deleted user IDs
    const filtered = parsed.filter((u) => !deletedIds.has(u.id));

    // Ensure all records have a status property
    return filtered.map((u) => ({
      ...u,
      status: u.status || (u.accountType === 'customer' || u.accountType === 'admin' ? 'active' : 'pending'),
    }));
  } catch {
    return INITIAL_SEED_USERS.filter((u) => !deletedIds.has(u.id));
  }
}

// Helper to save users array to localStorage and Firestore
export function saveUsersToDatabase(users: UserRecord[]): void {
  const deletedIds = getDeletedUserIds();
  const validUsers = users.filter((u) => !deletedIds.has(u.id));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validUsers));
    notifyUserChange();
    
    // Sync to Firestore asynchronously
    validUsers.forEach((user) => {
      if (user.id) {
        setDoc(doc(db, 'users', user.id), user, { merge: true }).catch((err) =>
          console.warn('Firestore user setDoc warning:', err)
        );
      }
    });
  } catch (err) {
    console.error('Failed to save to user database:', err);
  }
}

// Subscribe to real-time Firestore updates for users
try {
  onSnapshot(collection(db, 'users'), (snapshot) => {
    const deletedIds = getDeletedUserIds();
    if (!snapshot.empty) {
      const firestoreUsers: UserRecord[] = [];
      snapshot.forEach((docSnap) => {
        const u = docSnap.data() as UserRecord;
        if (u && u.id && !deletedIds.has(u.id)) {
          firestoreUsers.push(u);
        }
      });

      if (firestoreUsers.length > 0) {
        const localUsers = getUsersFromDatabase();
        // Merge firestore users into local storage
        const userMap = new Map<string, UserRecord>();
        localUsers.forEach((u) => {
          if (!deletedIds.has(u.id)) userMap.set(u.id, u);
        });
        firestoreUsers.forEach((u) => {
          if (!deletedIds.has(u.id)) userMap.set(u.id, u);
        });
        const merged = Array.from(userMap.values());
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          notifyUserChange();
        } catch {
          // fallback
        }
      }
    } else {
      // If Firestore is empty, initialize it with non-deleted seed users
      const seeds = INITIAL_SEED_USERS.filter((s) => !deletedIds.has(s.id));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds));
      } catch {}
      seeds.forEach((seed) => {
        setDoc(doc(db, 'users', seed.id), seed, { merge: true }).catch(() => {});
      });
      notifyUserChange();
    }
  }, (error) => {
    console.warn('Firestore users subscription warning:', error);
    notifyUserChange();
  });
} catch (e) {
  console.warn('Firestore listener setup warning:', e);
}

// Check uniqueness functions
export function isEmailInDatabase(email: string): boolean {
  const users = getUsersFromDatabase();
  const cleanEmail = email.trim().toLowerCase();
  return users.some((u) => u.email.trim().toLowerCase() === cleanEmail);
}

export function isNameInDatabase(fullName: string): boolean {
  const users = getUsersFromDatabase();
  const cleanName = fullName.trim().toLowerCase();
  return users.some((u) => u.fullName.trim().toLowerCase() === cleanName);
}

export function isUsernameInDatabase(username: string): boolean {
  const users = getUsersFromDatabase();
  const cleanUser = username.trim().toLowerCase();
  return users.some((u) => u.username.trim().toLowerCase() === cleanUser);
}

export function isPhoneInDatabase(phone: string): boolean {
  const users = getUsersFromDatabase();
  const cleanPhone = phone.trim().replace(/\s+/g, '');
  return users.some((u) => u.phone.trim().replace(/\s+/g, '') === cleanPhone);
}

// Register User
export interface RegisterResult {
  success: boolean;
  message: string;
  user?: UserRecord;
}

export function registerUserInDatabase(userData: Partial<UserRecord> & Omit<UserRecord, 'id' | 'createdAt' | 'status'>): RegisterResult {
  const users = getUsersFromDatabase();

  const cleanEmail = userData.email.trim().toLowerCase();
  const cleanName = userData.fullName.trim().toLowerCase();
  const cleanUser = userData.username.trim().toLowerCase();

  // 1. Check duplicate Email
  if (users.some((u) => u.email.trim().toLowerCase() === cleanEmail)) {
    return {
      success: false,
      message: 'البريد الإلكتروني مُسجل بالفعل في قاعدة البيانات! استخدم بريداً آخر.',
    };
  }

  // 2. Check duplicate Name
  if (users.some((u) => u.fullName.trim().toLowerCase() === cleanName)) {
    return {
      success: false,
      message: 'الاسم الكامل مُسجل بالفعل في قاعدة البيانات! أدخل اسماً ثلاثياً مميزاً.',
    };
  }

  // 3. Check duplicate Username
  if (users.some((u) => u.username.trim().toLowerCase() === cleanUser)) {
    return {
      success: false,
      message: 'اسم المستخدم (اليوزر) مُسجل بالفعل في قاعدة البيانات! اختر يوزر آخر.',
    };
  }

  const newUser: UserRecord = {
    ...userData,
    status: userData.status || (userData.accountType === 'customer' || userData.accountType === 'admin' ? 'active' : 'pending'),
    appliedAt: userData.appliedAt || 'الآن',
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsersToDatabase(users);

  return {
    success: true,
    message: 'تم تسجيل الحساب بنجاح في قاعدة البيانات!',
    user: newUser,
  };
}

// Update User Status (e.g., Approve / Reject KYC)
export function updateUserStatusInDatabase(
  userId: string,
  newStatus: 'active' | 'pending' | 'rejected' | 'suspended'
): UserRecord | null {
  const users = getUsersFromDatabase();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx !== -1) {
    const isApproval = newStatus === 'active' && users[idx].status === 'pending';
    const nowStr = new Date().toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    users[idx] = { 
      ...users[idx], 
      status: newStatus,
      approvedAt: isApproval ? nowStr : users[idx].approvedAt,
      approvedBy: isApproval ? 'المدير العام' : users[idx].approvedBy,
    };
    saveUsersToDatabase(users);
    return users[idx];
  }
  return null;
}

// Add Complaint or Note to User Record
export function addUserComplaintInDatabase(
  userId: string,
  noteText: string,
  adminName: string = 'المدير العام'
): UserRecord | null {
  const users = getUsersFromDatabase();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx !== -1) {
    const existingComplaints = users[idx].complaints || [];
    const newComplaint: UserComplaintNote = {
      id: `complaint-${Date.now()}`,
      note: noteText.trim(),
      date: new Date().toLocaleDateString('ar-IQ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      adminName,
    };

    users[idx] = {
      ...users[idx],
      complaints: [newComplaint, ...existingComplaints],
    };
    saveUsersToDatabase(users);
    return users[idx];
  }
  return null;
}

// Delete user from DB
export function deleteUserFromDatabase(identifierOrId: string): boolean {
  const users = getUsersFromDatabase();
  const clean = identifierOrId.trim().toLowerCase();

  const userToDelete = users.find(
    (u) =>
      u.id === identifierOrId ||
      u.username.trim().toLowerCase() === clean ||
      u.email.trim().toLowerCase() === clean ||
      u.fullName.trim().toLowerCase() === clean
  );

  if (!userToDelete) return false;

  recordDeletedUserId(userToDelete.id);

  const filtered = users.filter((u) => u.id !== userToDelete.id);

  saveUsersToDatabase(filtered);
  deleteDoc(doc(db, 'users', userToDelete.id)).catch((err) =>
    console.warn('Firestore delete user doc error:', err)
  );
  return true;
}

// Add New User from Admin Panel
export function addNewUserToDatabase(userData: {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password?: string;
  accountType: 'customer' | 'driver' | 'merchant';
  vehicleDetails?: string;
  address?: string;
  status?: 'active' | 'pending';
  kycImageFiles?: { name: string; dataUrl: string }[];
}): { success: boolean; message: string; user?: UserRecord } {
  const users = getUsersFromDatabase();
  const cleanEmail = userData.email.trim().toLowerCase();
  const cleanUser = userData.username.trim().toLowerCase();

  if (users.some((u) => u.email.trim().toLowerCase() === cleanEmail)) {
    return { success: false, message: 'البريد الإلكتروني مُسجل بالفعل في النظام!' };
  }
  if (users.some((u) => u.username.trim().toLowerCase() === cleanUser)) {
    return { success: false, message: 'اسم المستخدم (اليوزر) مُستخدم من قِبل حساب آخر!' };
  }

  const newUser: UserRecord = {
    id: `user-admin-created-${Date.now()}`,
    fullName: userData.fullName.trim(),
    username: userData.username.trim(),
    email: userData.email.trim(),
    phone: userData.phone.trim(),
    password: userData.password?.trim() || '123456',
    accountType: userData.accountType,
    status: userData.status || 'active',
    vehicleDetails: userData.vehicleDetails?.trim(),
    address: userData.address?.trim(),
    kycDocuments: userData.accountType === 'driver' 
      ? ['رخصة قيادة معتمدة', 'سنوية المركبة الرسمية'] 
      : userData.accountType === 'merchant'
      ? ['السجل التجاري الرسمي']
      : undefined,
    kycImageFiles: userData.kycImageFiles,
    appliedAt: 'اليوم (بواسطة الأدمن)',
    approvedAt: new Date().toLocaleDateString('ar-IQ'),
    approvedBy: 'المدير العام',
    createdAt: new Date().toISOString(),
  };

  users.unshift(newUser);
  saveUsersToDatabase(users);

  return {
    success: true,
    message: `تم إضافة حساب [${newUser.fullName}] بنجاح!`,
    user: newUser,
  };
}

// Update User Details (Full edit from Admin)
export function updateUserDetailsInDatabase(
  userId: string,
  updates: Partial<UserRecord>
): { success: boolean; message: string; user?: UserRecord } {
  const users = getUsersFromDatabase();
  const idx = users.findIndex((u) => u.id === userId);

  if (idx === -1) {
    return { success: false, message: 'الحساب غير موجود!' };
  }

  const updated: UserRecord = {
    ...users[idx],
    ...updates,
  };

  users[idx] = updated;
  saveUsersToDatabase(users);

  return {
    success: true,
    message: 'تم تحديث بيانات الحساب بنجاح!',
    user: updated,
  };
}

// Login user with strict database presence check
export interface LoginResult {
  success: boolean;
  message: string;
  user?: UserRecord;
}

export function loginUserFromDatabase(identifier: string, passwordInput: string): LoginResult {
  const users = getUsersFromDatabase();
  const cleanIdent = identifier.trim().toLowerCase();

  // Special check for preset Admin credentials
  if ((cleanIdent === 'admin@alnuaimi.com' || cleanIdent === 'admin') && passwordInput === 'hemoome1995') {
    const adminUser: UserRecord = {
      id: 'user-admin-0',
      fullName: 'المدير العام',
      username: 'admin',
      email: 'admin@alnuaimi.com',
      phone: '07500000000',
      password: 'hemoome1995',
      accountType: 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    return {
      success: true,
      message: 'تم تسجيل الدخول كمدير للنظام بنجاح!',
      user: adminUser,
    };
  }

  // Find user by username, email, or phone
  const user = users.find(
    (u) =>
      u.username.trim().toLowerCase() === cleanIdent ||
      u.email.trim().toLowerCase() === cleanIdent ||
      u.phone.trim().replace(/\s+/g, '') === cleanIdent.replace(/\s+/g, '')
  );

  if (!user) {
    return {
      success: false,
      message: 'عذراً، هذا الحساب غير موجود في قاعدة البيانات! يرجى إنشاء حساب جديد أولاً.',
    };
  }

  if (user.password !== passwordInput) {
    return {
      success: false,
      message: 'كلمة المرور غير صحيحة! يرجى المحاولة مرة أخرى.',
    };
  }

  return {
    success: true,
    message: 'تم تسجيل الدخول بنجاح!',
    user,
  };
}

// Get all active merchant users
export function getActiveMerchantsFromDatabase(): UserRecord[] {
  const users = getUsersFromDatabase();
  return users.filter((u) => u.accountType === 'merchant' && u.status === 'active');
}

// Find user record by ID, username, or email
export function getUserById(userIdOrIdent: string): UserRecord | null {
  const users = getUsersFromDatabase();
  const clean = userIdOrIdent.trim().toLowerCase();
  return (
    users.find(
      (u) =>
        u.id === userIdOrIdent ||
        u.username.trim().toLowerCase() === clean ||
        u.email.trim().toLowerCase() === clean
    ) || null
  );
}

// Update User Profile (fullName, username, avatarUrl)
export function updateUserProfile(
  userIdOrIdent: string,
  updates: { fullName?: string; username?: string; avatarUrl?: string }
): { success: boolean; message: string; user?: UserRecord } {
  const users = getUsersFromDatabase();
  const cleanIdent = userIdOrIdent.trim().toLowerCase();

  const idx = users.findIndex(
    (u) =>
      u.id === userIdOrIdent ||
      u.username.trim().toLowerCase() === cleanIdent ||
      u.email.trim().toLowerCase() === cleanIdent
  );

  if (idx === -1) {
    return { success: false, message: 'المستخدم غير موجود في قاعدة البيانات.' };
  }

  const currentUser = users[idx];

  // If changing username, ensure uniqueness
  if (updates.username && updates.username.trim().toLowerCase() !== currentUser.username.trim().toLowerCase()) {
    const cleanNewUser = updates.username.trim().toLowerCase();
    if (users.some((u) => u.id !== currentUser.id && u.username.trim().toLowerCase() === cleanNewUser)) {
      return { success: false, message: 'اسم المستخدم (اليوزر) مُستخدم بالفعل من قبل حساب آخر!' };
    }
  }

  const updatedUser: UserRecord = {
    ...currentUser,
    fullName: updates.fullName !== undefined ? updates.fullName.trim() : currentUser.fullName,
    username: updates.username !== undefined ? updates.username.trim() : currentUser.username,
    avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : currentUser.avatarUrl,
  };

  users[idx] = updatedUser;
  saveUsersToDatabase(users);

  return {
    success: true,
    message: 'تم تحديث الملف الشخصي بنجاح!',
    user: updatedUser,
  };
}

// Update User Password with current password verification
export function updateUserPassword(
  userIdOrIdent: string,
  currentPasswordInput: string,
  newPasswordInput: string
): { success: boolean; message: string } {
  const users = getUsersFromDatabase();
  const cleanIdent = userIdOrIdent.trim().toLowerCase();

  const idx = users.findIndex(
    (u) =>
      u.id === userIdOrIdent ||
      u.username.trim().toLowerCase() === cleanIdent ||
      u.email.trim().toLowerCase() === cleanIdent
  );

  if (idx === -1) {
    return { success: false, message: 'المستخدم غير موجود في قاعدة البيانات.' };
  }

  const currentUser = users[idx];

  if (currentUser.password !== currentPasswordInput) {
    return { success: false, message: 'كلمة المرور الحالية غير صحيحة!' };
  }

  if (!newPasswordInput || newPasswordInput.trim().length < 4) {
    return { success: false, message: 'كلمة المرور الجديدة يجب أن تتكون من 4 أحرف أو أرقام على الأقل.' };
  }

  users[idx] = {
    ...currentUser,
    password: newPasswordInput.trim(),
  };

  saveUsersToDatabase(users);

  return { success: true, message: 'تم تغيير كلمة المرور بنجاح!' };
}

