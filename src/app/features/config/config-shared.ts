import { ScopeLevel, ScopeNode, VersionSummary, CommitteeTypeRow, RuleKey } from '../../core/models/config-admin.model';

export function errMsg(e: any, fallback = 'কিছু ভুল হয়েছে, আবার চেষ্টা করুন।'): string {
  if (e?.status === 404) return 'এই API backend-এ এখনো পাওয়া যায়নি (404)।';
  if (e?.status === 403) return 'এই কাজের অনুমতি আপনার নেই।';
  return e?.error?.message || e?.error?.error || e?.message || fallback;
}

export const STATUS_LABEL: Record<string, string> = { DRAFT: 'খসড়া', PUBLISHED: 'প্রকাশিত', RETIRED: 'বন্ধ' };

export function versionsOf(t: CommitteeTypeRow): VersionSummary[] {
  if (t.versions?.length) return [...t.versions].sort((a, b) => a.versionNo - b.versionNo);
  if (t.latestVersionId) return [{ id: t.latestVersionId, versionNo: t.latestVersionNo ?? 1, status: t.latestStatus ?? 'DRAFT' }];
  return [];
}

/** scope tree থেকে স্তরের তালিকা বের করে (আলাদা GET levels API নেই) */
export function levelsFromTree(tree: ScopeNode[]): ScopeLevel[] {
  const map = new Map<number, ScopeLevel>();
  const walk = (ns: ScopeNode[]) => ns.forEach(n => {
    if (!map.has(n.levelNo)) map.set(n.levelNo, { levelNo: n.levelNo, nameBn: n.levelNameBn || `স্তর ${n.levelNo}` });
    if (n.children?.length) walk(n.children);
  });
  walk(tree ?? []);
  return [...map.values()].sort((a, b) => a.levelNo - b.levelNo);
}

export function flattenTree(tree: ScopeNode[], depth = 0, out: { node: ScopeNode; depth: number }[] = []) {
  (tree ?? []).forEach(n => { out.push({ node: n, depth }); if (n.children?.length) flattenTree(n.children, depth + 1, out); });
  return out;
}

export const RULE_DEFS: { key: RuleKey; label: string; hint: string }[] = [
  { key: 'FORMATION',      label: 'কমিটি গঠন',        hint: 'নতুন কমিটি জমা দেওয়ার সময়' },
  { key: 'ADD_MEMBER',     label: 'সদস্য যোগ',         hint: 'নতুন সদস্য নেওয়া' },
  { key: 'GO_BACK_MEMBER', label: 'সদস্য ফেরত',        hint: 'অব্যাহতি / পদত্যাগ / প্রত্যাহার' },
  { key: 'REJECT_MEMBER',  label: 'সদস্য প্রত্যাখ্যান', hint: 'প্রস্তাবিত সদস্যকে বাদ দেওয়া' },
  { key: 'RENEW_TERM',     label: 'মেয়াদ নবায়ন',      hint: 'নতুন মেয়াদ শুরু' },
  { key: 'DISSOLVE',       label: 'কমিটি বিলুপ্তি',     hint: 'কমিটি বন্ধ করা' },
];

/** সব config component-এ এই CSS ব্যবহার হয় (global .btn/.card/.form-control ইত্যাদি আগের মতোই) */
export const CONFIG_STYLES = `
  :host { display: block; }
  .muted { color: #6b7778; font-size: 13px; }
  .toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
  .toolbar .grow { flex: 1; }
  .alert { padding: 10px 14px; border-radius: 6px; font-size: 14px; margin-bottom: 12px; border: 1px solid transparent; }
  .alert-info { background: #eef5fb; color: #1a4fa0; border-color: #cfe0f3; }
  .alert-ok   { background: #e8f5ee; color: #0a5c36; border-color: #c5e4d2; }
  .alert-err  { background: #fdecea; color: #a12622; border-color: #f5c6c2; }
  .alert-warn { background: #fff7e0; color: #7a5a00; border-color: #f1dfa3; }
  .alert ul { margin: 6px 0 0 18px; padding: 0; }
  .st { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #e6e9ea; color: #566; }
  .st-DRAFT { background: #fff4d6; color: #8a6100; }
  .st-PUBLISHED { background: #dff3e7; color: #0a5c36; }
  .st-RETIRED { background: #e6e9ea; color: #566; }
  .chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; margin: 2px 4px 2px 0; border: 1px solid #d6dcde; border-radius: 14px; font-size: 12px; background: #fff; color: #2f3b3c; text-decoration: none; }
  a.chip:hover { border-color: #0a5c36; color: #0a5c36; }
  .tabs-row { display: flex; gap: 4px; border-bottom: 2px solid #e1e5e7; margin-bottom: 16px; flex-wrap: wrap; }
  .tab-btn { padding: 10px 16px; border: 0; background: none; cursor: pointer; font-size: 14px; color: #3d4a4b; border-bottom: 3px solid transparent; margin-bottom: -2px; }
  .tab-btn:hover { color: #0a5c36; }
  .tab-btn.active { color: #0a5c36; font-weight: 700; border-bottom-color: #0a5c36; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  @media (max-width: 800px) { .grid2, .grid3 { grid-template-columns: 1fr; } }
  .empty { text-align: center; padding: 28px; color: #7a8788; }
  .row-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .btn-ghost { padding: 6px 12px; border: 1px solid #c9d1d3; background: #fff; border-radius: 6px; cursor: pointer; font-size: 13px; color: #2f3b3c; }
  .btn-ghost:hover { border-color: #0a5c36; color: #0a5c36; }
  .btn-ghost:disabled { opacity: .5; cursor: not-allowed; }
  .btn-sm { padding: 4px 10px; font-size: 12px; }
  .check { display: flex; gap: 6px; align-items: center; font-size: 14px; }
  .mini { width: 90px; }
  .section-title { font-size: 15px; font-weight: 700; margin: 4px 0 10px; color: #2f3b3c; }
  pre.json { background: #f5f7f7; border: 1px solid #e1e5e7; border-radius: 6px; padding: 8px; font-size: 12px; max-height: 220px; overflow: auto; margin: 0; }
`;
