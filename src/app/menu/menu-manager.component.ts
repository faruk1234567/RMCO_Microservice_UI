import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MenuItem, MenuRequest } from './menu.model';
import { MenuService } from './menu.service';

interface Row { m: MenuItem; depth: number; }
type DropPos = 'before' | 'after' | 'inside';

@Component({
  selector: 'app-menu-manager',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './menu-manager.component.html',
  styleUrl: './menu-manager.component.scss',
})
export class MenuManagerComponent implements OnInit {
  private api = inject(MenuService);

  tree = signal<MenuItem[]>([]);
  expanded = signal<Set<number>>(new Set());
  selected = signal<Set<number>>(new Set());
  search = signal('');
  editingId = signal<number | null>(null);
  saving = signal(false);
  message = signal<{ type: 'ok' | 'err'; text: string } | null>(null);

  // drag & drop
  dragIds = signal<number[]>([]);
  dropAt = signal<{ id: number; pos: DropPos } | null>(null);
  rootOver = signal(false);
  private dragBanned = new Set<number>();

  // bulk move: '' = kichu bachai hoy nai, 'root' = upore, otherwise menu id
  bulkTarget = '';

  // form
  form: MenuRequest = this.blank();
  placement: 'root' | 'child' = 'root';
  kind: 'page' | 'group' = 'page';
  private codeTouched = false;
  private firstLoad = true;

  // ---------- derived ----------
  /** Search korle shudhu mil thaka menu (ebong tar parent) dekhabe */
  shown = computed<MenuItem[]>(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.tree();
    const filter = (items: MenuItem[]): MenuItem[] =>
      items.flatMap(m => {
        const kids = filter(m.children ?? []);
        const self = [m.labelBn, m.labelEn, m.routePath ?? ''].some(x => x.toLowerCase().includes(q));
        if (!self && !kids.length) return [];
        return [{ ...m, children: self && !kids.length ? (m.children ?? []) : kids }];
      });
    return filter(this.tree());
  });

  rows = computed<Row[]>(() => {
    const searching = !!this.search().trim();
    const out: Row[] = [];
    const walk = (items: MenuItem[], depth: number) =>
      items.forEach(m => {
        out.push({ m, depth });
        if (m.children?.length && (searching || this.expanded().has(m.id))) walk(m.children, depth + 1);
      });
    walk(this.shown(), 0);
    return out;
  });

  selectedCount = computed(() => this.selected().size);
  allChecked = computed(() => this.rows().length > 0 && this.rows().every(r => this.selected().has(r.m.id)));
  totalCount = computed(() => this.flat(this.tree()).length);

  parentOptions = computed(() => {
    const banned = new Set<number>();
    const id = this.editingId();
    if (id != null) { const n = this.find(this.tree(), id); if (n) this.collect(n, banned); }
    return this.options(banned);
  });

  bulkOptions = computed(() => {
    const banned = new Set<number>();
    this.topLevelOnly([...this.selected()]).forEach(id => {
      const n = this.find(this.tree(), id); if (n) this.collect(n, banned);
    });
    return this.options(banned);
  });

  ngOnInit() { this.load(); }

  // ---------- load ----------
  load() {
    this.api.tree(false).subscribe({
      next: t => {
        this.tree.set(t);
        if (this.firstLoad) { this.expandAll(); this.firstLoad = false; }
      },
      error: e => this.fail(e, 'মেনু লোড করা যায়নি'),
    });
  }

  // ---------- tree helpers ----------
  private flat(items: MenuItem[]): MenuItem[] {
    return items.flatMap(m => [m, ...this.flat(m.children ?? [])]);
  }
  private find(items: MenuItem[], id: number): MenuItem | undefined {
    for (const m of items) {
      if (m.id === id) return m;
      const f = this.find(m.children ?? [], id);
      if (f) return f;
    }
    return undefined;
  }
  private collect(node: MenuItem, bag: Set<number>) {
    bag.add(node.id);
    (node.children ?? []).forEach(c => this.collect(c, bag));
  }
  private siblingsOf(parentId: number | null): MenuItem[] {
    return parentId == null ? this.tree() : (this.find(this.tree(), parentId)?.children ?? []);
  }
  private options(banned: Set<number>) {
    const out: { id: number; label: string }[] = [];
    const walk = (items: MenuItem[], depth: number) =>
      items.forEach(m => {
        if (banned.has(m.id)) return;
        out.push({ id: m.id, label: '\u2003'.repeat(depth) + m.labelBn });
        walk(m.children ?? [], depth + 1);
      });
    walk(this.tree(), 0);
    return out;
  }
  private topLevelOnly(ids: number[]): number[] {
    return ids.filter(id => !ids.some(o => {
      if (o === id) return false;
      const n = this.find(this.tree(), o);
      if (!n) return false;
      const bag = new Set<number>(); this.collect(n, bag);
      return bag.has(id);
    }));
  }

  isExpanded(id: number) { return !!this.search().trim() || this.expanded().has(id); }
  toggle(id: number) {
    const s = new Set(this.expanded());
    s.has(id) ? s.delete(id) : s.add(id);
    this.expanded.set(s);
  }
  expandAll() {
    this.expanded.set(new Set(this.flat(this.tree()).filter(m => m.children?.length).map(m => m.id)));
  }
  collapseAll() { this.expanded.set(new Set()); }

  // ---------- selection ----------
  toggleSelect(id: number) {
    const s = new Set(this.selected());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selected.set(s);
  }
  toggleAll() {
    this.selected.set(this.allChecked() ? new Set() : new Set(this.rows().map(r => r.m.id)));
  }
  clearSelection() { this.selected.set(new Set()); this.bulkTarget = ''; }

  // ---------- moving (bulk / drag & drop) ----------
  moveSelected() {
    if (!this.bulkTarget) { this.message.set({ type: 'err', text: 'কোথায় সরাতে চান তা বেছে নিন' }); return; }
    const parent = this.bulkTarget === 'root' ? null : Number(this.bulkTarget);
    this.applyMove(this.topLevelOnly([...this.selected()]), parent, 'end');
    if (parent != null) { const s = new Set(this.expanded()); s.add(parent); this.expanded.set(s); }
  }

  private applyMove(ids: number[], parentId: number | null, index: number | 'end') {
    const order = this.flat(this.tree()).map(m => m.id);
    const moving = ids
      .map(id => this.find(this.tree(), id))
      .filter((m): m is MenuItem => !!m)
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    if (!moving.length) return;

    const banned = new Set<number>();
    moving.forEach(m => this.collect(m, banned));
    if (parentId != null && banned.has(parentId)) {
      this.message.set({ type: 'err', text: 'কোনো মেনুকে তার নিজের ভেতরে রাখা যায় না' });
      return;
    }

    const sibs = this.siblingsOf(parentId).filter(s => !ids.includes(s.id));
    const at = index === 'end' ? sibs.length : Math.max(0, Math.min(index, sibs.length));
    const next = [...sibs.slice(0, at), ...moving, ...sibs.slice(at)];

    const calls = next
      .map((m, i) => ({ m, i }))
      .filter(x => x.m.sortOrder !== x.i || (x.m.parentId ?? null) !== parentId)
      .map(x => this.api.update(x.m.id, this.fromItem(x.m, { parentId, sortOrder: x.i })));
    if (!calls.length) return;

    forkJoin(calls).subscribe({
      next: () => {
        this.message.set({ type: 'ok', text: 'মেনু সাজানো হয়েছে' });
        this.clearSelection();
        this.afterChange();
      },
      error: e => this.fail(e, 'মেনু সরানো যায়নি'),
    });
  }

  dragStart(e: DragEvent, m: MenuItem) {
    if (this.search().trim()) { e.preventDefault(); return; }
    const sel = this.selected();
    const ids = sel.has(m.id) && sel.size > 1 ? this.topLevelOnly([...sel]) : [m.id];
    const banned = new Set<number>();
    ids.forEach(id => { const n = this.find(this.tree(), id); if (n) this.collect(n, banned); });
    this.dragIds.set(ids);
    this.dragBanned = banned;
    e.dataTransfer?.setData('text/plain', String(m.id));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  dragOver(e: DragEvent, target: MenuItem) {
    if (!this.dragIds().length || this.dragBanned.has(target.id)) return;
    e.preventDefault();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height;
    const pos: DropPos = y < 0.28 ? 'before' : y > 0.72 ? 'after' : 'inside';
    const cur = this.dropAt();
    if (!cur || cur.id !== target.id || cur.pos !== pos) this.dropAt.set({ id: target.id, pos });
  }

  drop(e: DragEvent, target: MenuItem) {
    e.preventDefault();
    const at = this.dropAt();
    const ids = this.dragIds();
    this.dragEnd();
    if (!at || !ids.length || ids.includes(target.id)) return;

    if (at.pos === 'inside') {
      this.applyMove(ids, target.id, 'end');
      const s = new Set(this.expanded()); s.add(target.id); this.expanded.set(s);
    } else {
      const parentId = target.parentId ?? null;
      const sibs = this.siblingsOf(parentId).filter(s => !ids.includes(s.id));
      const ti = sibs.findIndex(s => s.id === target.id);
      this.applyMove(ids, parentId, at.pos === 'before' ? ti : ti + 1);
    }
  }

  dropOnRoot(e: DragEvent) {
    e.preventDefault();
    const ids = this.dragIds();
    this.dragEnd();
    if (ids.length) this.applyMove(ids, null, 'end');
  }

  dragEnd() { this.dragIds.set([]); this.dropAt.set(null); this.rootOver.set(false); this.dragBanned = new Set(); }

  /** Keyboard / edit panel theke ek dhap upore-niche */
  moveEditing(dir: -1 | 1) {
    const id = this.editingId();
    if (id == null) return;
    const item = this.find(this.tree(), id);
    if (!item) return;
    this.move(item, this.siblingsOf(item.parentId ?? null), dir);
  }

  private move(item: MenuItem, siblings: MenuItem[], dir: -1 | 1) {
    const i = siblings.indexOf(item);
    const j = i + dir;
    if (j < 0 || j >= siblings.length) return;
    const re = [...siblings];
    [re[i], re[j]] = [re[j], re[i]];
    const calls = re
      .map((m, idx) => ({ m, idx }))
      .filter(x => x.m.sortOrder !== x.idx)
      .map(x => this.api.update(x.m.id, this.fromItem(x.m, { sortOrder: x.idx })));
    if (!calls.length) return;
    forkJoin(calls).subscribe({
      next: () => this.afterChange(),
      error: e => this.fail(e, 'ক্রম বদলানো যায়নি'),
    });
  }

  // ---------- form ----------
  private blank(parentId: number | null = null): MenuRequest {
    return {
      code: '', labelBn: '', labelEn: '', parentId,
      routePath: '', icon: '', requiredPermissionCode: '',
      sortOrder: 0, isActive: true,
    };
  }

  formTitle() {
    if (this.editingId() != null) return 'মেনু সম্পাদনা';
    if (this.form.parentId != null) {
      const p = this.find(this.tree(), this.form.parentId);
      return 'নতুন উপ-মেনু' + (p ? ` — ${p.labelBn}` : '');
    }
    return 'নতুন মেনু';
  }

  addRoot() { this.startNew(null); }
  addChild(parent: MenuItem) {
    this.startNew(parent.id);
    this.kind = 'page';
    const s = new Set(this.expanded()); s.add(parent.id); this.expanded.set(s);
  }
  private startNew(parentId: number | null) {
    this.editingId.set(null);
    this.codeTouched = false;
    this.form = this.blank(parentId);
    this.form.sortOrder = this.siblingsOf(parentId).length;
    this.placement = parentId == null ? 'root' : 'child';
    this.kind = 'page';
    this.message.set(null);
  }

  edit(m: MenuItem) {
    this.editingId.set(m.id);
    this.codeTouched = true;
    this.form = {
      code: m.code, labelBn: m.labelBn, labelEn: m.labelEn,
      parentId: m.parentId ?? null,
      routePath: m.routePath ?? '', icon: m.icon ?? '',
      requiredPermissionCode: m.requiredPermissionCode ?? '',
      sortOrder: m.sortOrder ?? 0, isActive: m.isActive,
    };
    this.placement = m.parentId == null ? 'root' : 'child';
    this.kind = m.routePath ? 'page' : 'group';
    this.message.set(null);
  }

  setPlacement(p: 'root' | 'child') {
    this.placement = p;
    if (p === 'root') this.form.parentId = null;
  }

  previewChain(): string[] {
    const chain: string[] = [];
    let id = this.placement === 'child' ? this.form.parentId : null;
    let guard = 0;
    while (id != null && guard++ < 10) {
      const p = this.find(this.tree(), id);
      if (!p) break;
      chain.unshift(p.labelBn);
      id = p.parentId ?? null;
    }
    chain.push(this.form.labelBn.trim() || 'নতুন মেনু');
    return chain;
  }

  cancel() { this.startNew(null); }

  onEnglishLabel() {
    if (this.codeTouched || this.editingId() != null) return;
    this.form.code = this.form.labelEn.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  onCodeInput() { this.codeTouched = true; }

  private body(): MenuRequest {
    const f = this.form;
    return {
      code: f.code.trim(),
      labelBn: f.labelBn.trim(),
      labelEn: f.labelEn.trim(),
      parentId: this.placement === 'root' ? null : (f.parentId ?? null),
      routePath: this.kind === 'group' ? null : (f.routePath?.trim() || null),
      icon: f.icon?.trim() || null,
      requiredPermissionCode: f.requiredPermissionCode?.trim() || null,
      sortOrder: f.sortOrder ?? 0,
      isActive: f.isActive,
    };
  }

  private fromItem(m: MenuItem, over: Partial<MenuRequest> = {}): MenuRequest {
    return {
      code: m.code, labelBn: m.labelBn, labelEn: m.labelEn,
      parentId: m.parentId ?? null,
      routePath: m.routePath ?? null, icon: m.icon ?? null,
      requiredPermissionCode: m.requiredPermissionCode ?? null,
      sortOrder: m.sortOrder ?? 0, isActive: m.isActive,
      ...over,
    };
  }

  // ---------- actions ----------
  save() {
    const b = this.body();
    if (!b.labelBn || !b.labelEn || !b.code) {
      this.message.set({ type: 'err', text: 'বাংলা নাম, ইংরেজি নাম ও কোড অবশ্যই দিতে হবে' });
      return;
    }
    if (this.placement === 'child' && b.parentId == null) {
      this.message.set({ type: 'err', text: 'কোন মেনুর ভেতরে থাকবে তা বেছে নিন' });
      return;
    }
    if (this.kind === 'page' && !b.routePath) {
      this.message.set({ type: 'err', text: 'পেজের পথ দিন, অথবা "শুধু গ্রুপ" বেছে নিন' });
      return;
    }
    const id = this.editingId();
    this.saving.set(true);
    const req = id == null ? this.api.create(b) : this.api.update(id, b);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.startNew(b.parentId);
        this.message.set({ type: 'ok', text: id == null ? 'মেনু যোগ হয়েছে' : 'মেনু আপডেট হয়েছে' });
        this.afterChange();
      },
      error: e => { this.saving.set(false); this.fail(e, 'সংরক্ষণ করা যায়নি'); },
    });
  }

  toggleActive(m: MenuItem) {
    this.api.setStatus(m.id, !m.isActive).subscribe({
      next: () => this.afterChange(),
      error: e => this.fail(e, 'স্ট্যাটাস বদলানো যায়নি'),
    });
  }

  remove(m: MenuItem) {
    if (!confirm(`"${m.labelBn}" মেনুটি মুছে ফেলবেন?`)) return;
    this.api.remove(m.id).subscribe({
      next: () => {
        if (this.editingId() === m.id) this.startNew(null);
        this.message.set({ type: 'ok', text: 'মেনু মুছে ফেলা হয়েছে' });
        this.afterChange();
      },
      error: e => this.fail(e, 'মুছে ফেলা যায়নি'),
    });
  }

  private afterChange() {
    this.load();
    this.api.loadNav();
  }

  private fail(e: any, fallback: string) {
    this.message.set({ type: 'err', text: e?.error?.message || fallback });
  }
}