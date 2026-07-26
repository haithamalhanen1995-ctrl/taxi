import { db } from './firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';

export interface SupportReply {
  id: string;
  sender: 'admin' | 'user';
  senderName: string;
  text: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  senderName: string;
  senderType: 'customer' | 'driver' | 'merchant';
  senderPhone: string;
  subject: string;
  message: string;
  status: 'open' | 'replied' | 'closed';
  createdAt: string;
  replies: SupportReply[];
}

const SUPPORT_STORAGE_KEY = 'taksati_support_tickets_v1';
const EVENT_NAME = 'taksati_support_tickets_updated';

function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
}

export function subscribeToSupportTickets(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}

const INITIAL_SEED_TICKETS: SupportTicket[] = [
  {
    id: 'ticket-1',
    senderName: 'أحمد علي العراقي',
    senderType: 'customer',
    senderPhone: '07501234567',
    subject: 'استفسار عن طريقة الدفع الإلكتروني',
    message: 'مرحباً، هل يمكنني حفظ بطاقة الماستركارد الخاصة بي للدفع تلقائياً في الرحلات القادمة؟',
    status: 'open',
    createdAt: 'اليوم، 11:20 ص',
    replies: [],
  },
  {
    id: 'ticket-2',
    senderName: 'عثمان الفهداوي',
    senderType: 'driver',
    senderPhone: '07709876543',
    subject: 'طلب تحديث معلومات المركبة',
    message: 'السلام عليكم، قمت بتغيير سيارتي إلى تويوتا كامري 2022 ورقم اللوحة جديد، كيف أحدثها بالسجل؟',
    status: 'replied',
    createdAt: 'أمس، 04:15 م',
    replies: [
      {
        id: 'reply-1',
        sender: 'admin',
        senderName: 'المدير العام (الدعم الفني)',
        text: 'وعليكم السلام، تم استلام طلبك. يرجى إرسال صورة السنوية الجديدة عبر التوثيق لتحديثها مباشرة.',
        createdAt: 'أمس، 05:00 م',
      },
    ],
  },
  {
    id: 'ticket-3',
    senderName: 'مطعم الكباب الأربيلية',
    senderType: 'merchant',
    senderPhone: '07704445566',
    subject: 'تغيير أوقات عمل المطعم في التطبيق',
    message: 'أهلاً بك، نود تعديل ساعات العمل لتصبح من 10 صباحاً حتى 12 ليلاً بشكل يومي.',
    status: 'open',
    createdAt: 'اليوم، 09:30 ص',
    replies: [],
  },
];

export function getSupportTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(SUPPORT_STORAGE_KEY);
    let parsed: SupportTicket[] = [];
    if (raw) {
      try {
        parsed = JSON.parse(raw) as SupportTicket[];
      } catch {
        parsed = [];
      }
    }

    INITIAL_SEED_TICKETS.forEach((seed) => {
      if (!parsed.some((t) => t.id === seed.id)) {
        parsed.push(seed);
      }
    });

    if (parsed.length === 0) {
      parsed = INITIAL_SEED_TICKETS;
    }

    try {
      localStorage.setItem(SUPPORT_STORAGE_KEY, JSON.stringify(parsed));
    } catch {}

    return parsed;
  } catch {
    return INITIAL_SEED_TICKETS;
  }
}

export function saveSupportTickets(tickets: SupportTicket[]): void {
  try {
    localStorage.setItem(SUPPORT_STORAGE_KEY, JSON.stringify(tickets));
    notifyChange();
    tickets.forEach((t) => {
      if (t.id) {
        setDoc(doc(db, 'support_tickets', t.id), t, { merge: true }).catch(() => {});
      }
    });
  } catch (e) {
    console.error('Failed to save support tickets', e);
  }
}

// Real-time listener for support tickets
try {
  onSnapshot(collection(db, 'support_tickets'), (snapshot) => {
    if (!snapshot.empty) {
      const firestoreTickets: SupportTicket[] = [];
      snapshot.forEach((docSnap) => {
        firestoreTickets.push(docSnap.data() as SupportTicket);
      });

      if (firestoreTickets.length > 0) {
        const localTickets = getSupportTickets();
        const map = new Map<string, SupportTicket>();
        localTickets.forEach((t) => map.set(t.id, t));
        firestoreTickets.forEach((t) => map.set(t.id, t));
        const merged = Array.from(map.values());
        try {
          localStorage.setItem(SUPPORT_STORAGE_KEY, JSON.stringify(merged));
          notifyChange();
        } catch {
          // fallback
        }
      }
    } else {
      INITIAL_SEED_TICKETS.forEach((seed) => {
        setDoc(doc(db, 'support_tickets', seed.id), seed, { merge: true }).catch(() => {});
      });
      notifyChange();
    }
  }, (err) => {
    console.warn('Firestore tickets listener warning:', err);
  });
} catch (e) {
  console.warn('Firestore tickets setup warning:', e);
}

export function addAdminReplyToTicket(ticketId: string, replyText: string): SupportTicket | null {
  const tickets = getSupportTickets();
  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx !== -1) {
    const newReply: SupportReply = {
      id: `reply-${Date.now()}`,
      sender: 'admin',
      senderName: 'المدير العام (الدعم الفني)',
      text: replyText.trim(),
      createdAt: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
    };

    tickets[idx].replies.push(newReply);
    tickets[idx].status = 'replied';
    saveSupportTickets(tickets);
    return tickets[idx];
  }
  return null;
}

export function createSupportTicket(
  senderName: string,
  senderType: 'customer' | 'driver' | 'merchant',
  senderPhone: string,
  subject: string,
  message: string
): SupportTicket {
  const tickets = getSupportTickets();
  const newTicket: SupportTicket = {
    id: `ticket-${Date.now()}`,
    senderName,
    senderType,
    senderPhone,
    subject,
    message,
    status: 'open',
    createdAt: 'الآن',
    replies: [],
  };
  tickets.unshift(newTicket);
  saveSupportTickets(tickets);
  return newTicket;
}
