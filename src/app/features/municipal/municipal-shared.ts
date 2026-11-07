import { ENGINE_STYLES, STATUS_BN, Row } from '../committee/engine-shared';
export { errMsg, entries, fmtDate, endOfDay, pick } from '../committee/engine-shared';
export type { Row };

export const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
export const isUuid = (v: any): boolean => UUID_RE.test(String(v ?? '').trim());

/** ⚠ কর প্রস্তাব, আপত্তি ও ক্যাম্পেইনের status enum আমি দেখিনি; এখানে সম্ভাব্য কোডের বাংলা দেওয়া আছে। না থাকলে কোডটাই দেখানো হবে */
const EXTRA_BN: Record<string, string> = {
  SUBMITTED: 'জমা হয়েছে', RECEIVED: 'গৃহীত', FORWARDED: 'ফরোয়ার্ড করা হয়েছে', HEARING_SCHEDULED: 'শুনানি নির্ধারিত',
  DECIDED: 'সিদ্ধান্ত হয়েছে', ACCEPTED: 'মঞ্জুর', PARTIALLY_ACCEPTED: 'আংশিক মঞ্জুর',
  PRE_PUBLISHED: 'প্রাক-প্রকাশিত', FINALIZED: 'চূড়ান্ত', QUEUED: 'সারিতে আছে', SENDING: 'পাঠানো হচ্ছে', SENT: 'পাঠানো হয়েছে',
  COMPLETED: 'সম্পন্ন', DONE: 'সম্পন্ন',
};
export const bnStatus = (s: any): string => (s ? (EXTRA_BN[String(s)] ?? STATUS_BN[String(s)] ?? String(s)) : '—');

export const MUNI_STYLES = ENGINE_STYLES + `
  .st-RECEIVED, .st-QUEUED, .st-SENDING, .st-PRE_PUBLISHED, .st-FORWARDED, .st-HEARING_SCHEDULED { background: #e8e3fa; color: #4b3a9a; }
  .st-DECIDED, .st-ACCEPTED, .st-FINALIZED, .st-SENT, .st-COMPLETED, .st-DONE, .st-PARTIALLY_ACCEPTED { background: #dff3e7; color: #0a5c36; }
  .cards3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 18px; }
  @media (max-width: 900px) { .cards3 { grid-template-columns: 1fr; } }
  .home-card { display: block; padding: 18px; border: 1px solid #d6dcde; border-radius: 10px; background: #fff; text-decoration: none; color: inherit; }
  .home-card:hover { border-color: #0a5c36; }
  .home-card h3 { margin: 0 0 6px; color: #0a5c36; }
  .sub-card { border: 1px solid #e1e5e7; border-radius: 8px; padding: 12px; margin-bottom: 10px; background: #fafbfb; }
  .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  @media (max-width: 900px) { .grid4 { grid-template-columns: 1fr 1fr; } }
`;

export const rid = (r: Row | null | undefined): string =>
  String(r?.['id'] ?? r?.['proposalId'] ?? r?.['objectionId'] ?? r?.['campaignId'] ?? r?.['messageId'] ?? '');

/** ফাঁকা string / null বাদ দিয়ে body বানায় */
export function clean<T extends Record<string, any>>(o: T): Record<string, any> {
  const out: Record<string, any> = {};
  Object.entries(o).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) out[k] = typeof v === 'string' ? v.trim() : v; });
  return out;
}

// ---------- সম্প্রতি দেখা/তৈরি করা আইটেম (এই ব্রাউজারে মনে রাখে; তালিকার API নেই বলে) ----------
export interface RecentItem { id: string; label: string; at: number; }
export const Recent = {
  list(key: string): RecentItem[] {
    try { return JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { return []; }
  },
  add(key: string, id: string, label: string) {
    try {
      const l = Recent.list(key).filter(x => x.id !== id);
      localStorage.setItem(key, JSON.stringify([{ id, label, at: Date.now() }, ...l].slice(0, 15)));
    } catch { /* storage বন্ধ থাকলে উপেক্ষা */ }
  },
};
export const RK = { tax: 'recent.taxProposals', objection: 'recent.objections', message: 'recent.noticeMessages', campaign: 'recent.noticeCampaigns' };
