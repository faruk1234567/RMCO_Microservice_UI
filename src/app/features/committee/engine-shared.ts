import { CONFIG_STYLES } from '../config/config-shared';
export { errMsg } from '../config/config-shared';

export type Row = Record<string, any>;

export const STATUS_BN: Record<string, string> = {
  DRAFT: 'খসড়া', PENDING_APPROVAL: 'অনুমোদনাধীন', ACTIVE: 'সক্রিয়', REJECTED: 'প্রত্যাখ্যাত',
  EXPIRED: 'মেয়াদোত্তীর্ণ', DISSOLVED: 'বিলুপ্ত', SUSPENDED: 'স্থগিত',
  PENDING: 'অপেক্ষমাণ', IN_PROGRESS: 'চলমান', APPROVED: 'অনুমোদিত', FINAL_APPROVED: 'চূড়ান্ত অনুমোদিত', CANCELLED: 'বাতিল',
  CLEAN: 'নিরাপদ (CLEAN)', INFECTED: 'ভাইরাস পাওয়া গেছে', FAILED: 'ব্যর্থ',
};

export const ENGINE_STYLES = CONFIG_STYLES + `
  .st-PENDING_APPROVAL, .st-PENDING, .st-IN_PROGRESS { background: #e8e3fa; color: #4b3a9a; }
  .st-ACTIVE, .st-FINAL_APPROVED, .st-APPROVED, .st-CLEAN { background: #dff3e7; color: #0a5c36; }
  .st-REJECTED, .st-INFECTED, .st-FAILED { background: #fdecea; color: #a12622; }
  .st-EXPIRED, .st-DISSOLVED, .st-CANCELLED { background: #e6e9ea; color: #566; }
  .st-SUSPENDED { background: #ffe9cc; color: #8a4b00; }
  .stepper { display: flex; gap: 6px; margin-bottom: 18px; flex-wrap: wrap; }
  .step { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border: 1px solid #d6dcde; background: #fff; border-radius: 22px; font-size: 13px; cursor: pointer; color: #5a6667; }
  .step .no { width: 22px; height: 22px; border-radius: 50%; background: #e6e9ea; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
  .step.active { border-color: #0a5c36; color: #0a5c36; font-weight: 700; }
  .step.active .no { background: #0a5c36; color: #fff; }
  .step.done .no { background: #dff3e7; color: #0a5c36; }
  .step:disabled { opacity: .5; cursor: not-allowed; }
  .kv { display: grid; grid-template-columns: 200px 1fr; gap: 6px 14px; font-size: 14px; }
  .kv dt { color: #6b7778; } .kv dd { margin: 0; word-break: break-word; }
  .ok-text { color: #0a5c36; } .bad-text { color: #a12622; } .warn-text { color: #8a6100; }
`;

export const idOf = (r: Row): string => String(r?.['id'] ?? r?.['requestId'] ?? r?.['committeeId'] ?? '');

export function pick(r: Row | null | undefined, ...keys: string[]): any {
  for (const k of keys) { const v = r?.[k]; if (v !== undefined && v !== null && v !== '') return v; }
  return undefined;
}

export const committeeName = (r: Row) => pick(r, 'nameBn', 'name', 'committeeName', 'title') ?? 'নামহীন কমিটি';

export function fmtDate(v: any, withTime = false): string {
  if (!v) return '—';
  const d = new Date(v); if (isNaN(d.getTime())) return String(v);
  const p = (n: number) => String(n).padStart(2, '0');
  const date = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  return withTime ? `${date} ${p(d.getHours())}:${p(d.getMinutes())}` : date;
}

export function maskMobile(m?: string): string {
  if (!m) return '—'; const s = String(m);
  return s.length < 7 ? s : s.slice(0, 3) + '*'.repeat(s.length - 5) + s.slice(-2);
}

export const KEY_LABELS: Record<string, string> = {
  id: 'ID', status: 'অবস্থা', nameBn: 'নাম (বাংলা)', nameEn: 'Name (English)', name: 'নাম', createdAt: 'তৈরির সময়',
  updatedAt: 'সর্বশেষ পরিবর্তন', submittedAt: 'জমার সময়', dueAt: 'সময়সীমা', typeName: 'ধরন', scopeName: 'কার্যপরিধি',
  levelNo: 'ধাপ', stepNo: 'ধাপ', comment: 'মন্তব্য', requestId: 'অনুরোধ ID', committeeId: 'কমিটি ID',
};

/** শুধু সরল (string/number/boolean) মান নিয়ে key-value তালিকা বানায় */
export function entries(r: Row | null | undefined): { k: string; label: string; v: string }[] {
  if (!r) return [];
  return Object.entries(r)
    .filter(([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v))
    .map(([k, v]) => ({
      k, label: KEY_LABELS[k] ?? k,
      v: /(At|Date)$/.test(k) && v ? fmtDate(v, true) : (k === 'status' && v ? (STATUS_BN[String(v)] ?? String(v)) : (v === null ? '—' : String(v))),
    }));
}
