import { isUsernameInDatabase } from './userDatabase';

export const TAKEN_USERNAMES = new Set([
  'admin',
  'administrator',
  'taksati',
  'driver1',
  'driver_erbil',
  'merchant1',
  'tigris_food',
  'user1',
  'support',
  'manager',
  'root',
  'superadmin',
  'baghdad_taxi',
]);

export interface UsernameCheckResult {
  isAvailable: boolean;
  isTaken: boolean;
  isEmpty: boolean;
  isTooShort: boolean;
  message: string;
}

export function validateUsername(username: string): UsernameCheckResult {
  const trimmed = username.trim().toLowerCase();
  if (!trimmed) {
    return {
      isAvailable: false,
      isTaken: false,
      isEmpty: true,
      isTooShort: false,
      message: '',
    };
  }

  if (trimmed.length < 3) {
    return {
      isAvailable: false,
      isTaken: false,
      isEmpty: false,
      isTooShort: true,
      message: 'اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل',
    };
  }

  if (TAKEN_USERNAMES.has(trimmed) || isUsernameInDatabase(trimmed)) {
    return {
      isAvailable: false,
      isTaken: true,
      isEmpty: false,
      isTooShort: false,
      message: 'اسم المستخدم مكرر ومُستخدَم بالفعل في قاعدة البيانات! اختر اسماً آخر ✗',
    };
  }

  return {
    isAvailable: true,
    isTaken: false,
    isEmpty: false,
    isTooShort: false,
    message: 'اسم المستخدم متاح ومناسب ✓',
  };
}
