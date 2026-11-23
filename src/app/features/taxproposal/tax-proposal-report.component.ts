import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-tax-proposal-report',
  templateUrl: './tax-proposal-report.component.html',
  styleUrls: ['./tax-proposal-report.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class TaxProposalReportComponent implements OnInit, OnDestroy {
  proposal: any = null;
  proposalId = '';
  municipalityId: number | null = null;
  municipalityName = '';
  formattedDate = '';
  createdDate = '';
  prePublishedDate = '';
  objectionDate = '';
  printedOn = '';

  taxes: any[] = [];
  valuations: any[] = [];
  histories: any[] = [];

  mayorSign: SafeUrl | null = null;
  secretarySign: SafeUrl | null = null;
  mayorName = '';
  secretaryName = '';
  mayorDesignation = 'মেয়র';
  secretaryDesignation = 'সচিব';

  private printStyle?: HTMLStyleElement;
  private blobUrls: string[] = [];

  private readonly statusLabels: Record<string, string> = {
    DRAFT: 'খসড়া',
    PENDING: 'অনুমোদনাধীন',
    IN_PROGRESS: 'প্রক্রিয়াধীন',
    APPROVED: 'অনুমোদিত',
    REJECTED: 'প্রত্যাখ্যাত',
    PRE_PUBLISHED: 'প্রাক-প্রকাশিত'
  };

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.proposalId = this.route.snapshot.paramMap.get('id') || '';
    this.printedOn = this.formatDate(new Date());
    this.hideLayoutWhenPrinting();
    this.loadProposal();
  }

  ngOnDestroy() {
    this.printStyle?.remove();
    this.blobUrls.forEach(u => URL.revokeObjectURL(u));
  }

  // প্রিন্টে উপরের মেনু/হেডার যাতে না আসে (PDF এর ১ নম্বর পাতায় আসছিল)
  // সিলেক্টর আপনার layout অনুযায়ী বদলাতে পারেন
  private hideLayoutWhenPrinting() {
    const s = document.createElement('style');
    s.textContent = `@media print {
      header, nav, aside, .app-header, .app-sidebar, .topbar, .sidebar, .main-nav { display: none !important; }
    }`;
    document.head.appendChild(s);
    this.printStyle = s;
  }

  loadProposal() {
    this.http.get<any>(`/tax-proposal-service/tax-proposals/${this.proposalId}`).subscribe({
      next: (res) => {
        const raw = res?.data ?? res ?? {};
        this.proposal = raw;
        this.formattedDate = this.formatDate(raw.proposedEffectiveDate || raw.effectiveDate || raw.effective_date || raw.createdAt);
        this.createdDate = this.formatDate(raw.createdAt);
        this.prePublishedDate = this.formatDate(raw.prePublishedOn);
        this.objectionDate = this.formatDate(raw.objectionDeadline);

        // proposal এ municipalityId আসে UUID আকারে (…00000000000f = ১৫), তাই সংখ্যায় বদলাতে হয়
        this.municipalityId = this.toMunicipalityNumber(raw.municipalityId ?? raw.municipality_id) ?? this.getLoggedMunicipalityId();
        this.municipalityName = raw.municipalityName || raw.municipality?.name || this.getLoggedMunicipalityName(this.municipalityId);

        // backend এর আসল ফিল্ড: items (কর), assessmentMethods (মূল্যায়ন পদ্ধতি)
        this.taxes = raw.items || raw.taxes || raw.taxRates || raw.tax_items || raw.taxItems || [];
        this.valuations = raw.assessmentMethods || raw.valuationMethods || raw.valuations || raw.valuation_methods || raw.sections || [];
        this.histories = raw.financialHistory || raw.histories || raw.financial_histories || raw.incomeExpenseHistory || [];

        this.loadSignatures();
      },
      error: () => {
        this.municipalityId = this.getLoggedMunicipalityId();
        this.municipalityName = this.getLoggedMunicipalityName();
        this.loadSignatures();
      }
    });
  }

  // ---------- helpers ----------
  val(o: any, ...keys: string[]): any {
    if (!o) return '';
    for (const k of keys) {
      if (o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k];
    }
    return '';
  }

  // সংখ্যা হলে বাংলা সংখ্যায় (কমা সহ), না হলে যেমন আছে তেমন
  fmt(v: any): string {
    if (v === '' || v === null || v === undefined) return '—';
    const n = Number(v);
    if (isNaN(n)) return String(v);
    return n.toLocaleString('bn-BD');
  }

  statusLabel(s: any): string {
    const key = String(s || 'DRAFT').toUpperCase();
    return this.statusLabels[key] || String(s);
  }

  formatDate(v: any): string {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  }

  private sum(keys: string[]): number {
    return this.taxes.reduce((acc, t) => {
      const n = Number(this.val(t, ...keys));
      return acc + (isNaN(n) ? 0 : n);
    }, 0);
  }
  get totalProposed(): number { return this.sum(['proposedAnnual', 'proposedAnnualCollection', 'proposed_annual']); }
  get totalCurrent(): number { return this.sum(['existingAnnualCollection', 'currentAnnual', 'currentAnnualCollection', 'current_annual']); }
  get totalChange(): number { return this.totalProposed - this.totalCurrent; }
  changeText(): string {
    const c = this.totalChange;
    return (c > 0 ? '+' : c < 0 ? '−' : '') + this.fmt(Math.abs(c));
  }
  get statusClass(): string { return 'st-' + String(this.proposal?.status || 'DRAFT').toLowerCase(); }
  get totalIncome(): number {
    return this.histories.reduce((a, h) => a + (Number(this.val(h, 'income', 'revenue', 'totalIncome')) || 0), 0);
  }
  get totalExpense(): number {
    return this.histories.reduce((a, h) => a + (Number(this.val(h, 'expense', 'expenditure', 'totalExpense')) || 0), 0);
  }

  // ---------- আর্থিক/পদ্ধতি দেখানোর সাহায্যকারী ----------
  private toMunicipalityNumber(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return v;
    const s = String(v).trim();
    if (/^\d+$/.test(s)) return Number(s);
    const hex = s.replace(/-/g, '');
    if (/^0+[0-9a-fA-F]+$/.test(hex)) return parseInt(hex, 16);
    return null;
  }

  rateText(t: any, key: string): string {
    const v = t?.[key];
    if (v === '' || v === null || v === undefined) return '—';
    return this.fmt(v) + (t.rateBasis === 'PERCENT' ? '%' : '');
  }

  private readonly basisLabels: Record<string, string> = {
    MIN_POSSIBLE_RENT_OR_7_5_PERCENT: 'সম্ভাব্য ভাড়া / ৭.৫% — যেটা কম সেটা'
  };
  basisLabel(b: any): string { return this.basisLabels[String(b)] || String(b); }

  // Create ফর্মের আসল লেখা — প্রতিটা পদ্ধতির নিয়ম আলাদা
  // flag = backend এর কোন true/false ফিল্ড এই টিকের মান রাখে
  private readonly methodSpec: Record<string, { basis: boolean; desc?: string; rules: { text: string; flag: string }[] }> = {
    FULLY_RENTED: {
      basis: false,
      rules: [
        { text: 'রক্ষণাবেক্ষণ বাবদ ২ মাসের ভাড়া বাদ যাইবে', flag: 'deductMaintenance' },
        { text: 'বাণিজ্যিক না হইলে বন্ধকী সুদ পুরাটা বাদ যাইবে', flag: 'deductMortgageNonCommercial' },
        { text: 'বাণিজ্যিক হইলে বন্ধকী সুদের ১/৪ অংশ বাদ যাইবে', flag: 'deductMortgageCommercialOneThird' },
        { text: 'ভাড়া অস্বাভাবিক হইলে তুলনামূলক ভাড়া বিবেচনা করা হইবে', flag: 'compareWithMarketRent' }
      ]
    },
    FULLY_OCCUPIED: {
      basis: true,
      rules: [
        { text: 'রক্ষণাবেক্ষণ — ২ মাসের ভাড়া / ১/৬ — যেটা প্রযোজ্য', flag: 'deductMaintenance' },
        // অনুমান: এই টিকের ফিল্ড নিশ্চিত নই, ৪র্থ ফ্ল্যাগে ধরেছি
        { text: 'ওইটা বাদের পর বার্ষিক মূল্যের ১/৪ বাদ যাইবে', flag: 'compareWithMarketRent' },
        { text: 'বাণিজ্যিক না হইলে বন্ধকী সুদ পুরাটা বাদ যাইবে', flag: 'deductMortgageNonCommercial' },
        { text: 'বাণিজ্যিক হইলে বন্ধকী সুদের ১/৪ বাদ যাইবে', flag: 'deductMortgageCommercialOneThird' }
      ]
    },
    PARTIAL: {
      basis: false,
      desc: 'ভাড়া অংশের হিসাব (ক) অনুযায়ী হইবে, দখল অংশের হিসাব (খ) অনুযায়ী হইবে। ২টা যোগ করে বার্ষিক মূল্য হইবে।',
      rules: []
    }
  };

  private specOf(v: any) { return this.methodSpec[String(v?.methodCode)]; }
  showBasis(v: any): boolean { const sp = this.specOf(v); return !!v?.basisType && (sp ? sp.basis : true); }
  methodDesc(v: any): string { return this.specOf(v)?.desc || ''; }
  methodRules(v: any): { text: string; on: boolean }[] {
    const sp = this.specOf(v);
    if (!sp) return [];
    return sp.rules.map(r => ({ text: r.text, on: !!v?.[r.flag] }));
  }

  // ---------- signatures ----------
  loadSignatures() {
    if (!this.municipalityId) return;
    this.http.get<any>(`/signature-service/signatures?municipalityId=${this.municipalityId}`).subscribe({
      next: (res) => {
        const list = res?.data?.content ?? res?.data ?? res?.content ?? res;
        let arr: any[] = Array.isArray(list) ? list : [];

        // সার্ভার municipalityId ফিল্টার না করলেও অন্য পৌরসভার সাইন যেন না আসে
        arr = arr.filter(x => x.municipalityId == null || Number(x.municipalityId) === Number(this.municipalityId));
        // নতুন সাইন আগে
        arr.sort((a, b) => this.time(b.signedAt) - this.time(a.signedAt));

        this.pickSigner(arr.filter(x => this.isMayor(x)), 'mayor');
        this.pickSigner(arr.filter(x => this.isSecretary(x)), 'secretary');
      },
      error: () => {}
    });
  }

  private time(v: any): number {
    const t = new Date(v || 0).getTime();
    return isNaN(t) ? 0 : t;
  }

  private designationText(x: any): string {
    return `${x.designationSnapshot || x.designationName || x.designationNameBn || x.designation || x.designationCode || ''}`;
  }
  isMayor(x: any): boolean {
    const d = this.designationText(x).toLowerCase();
    return d.includes('mayor') || d.includes('মেয়র');
  }
  isSecretary(x: any): boolean {
    const d = this.designationText(x).toLowerCase();
    return d.includes('sochib') || d.includes('secretary') || d.includes('সচিব');
  }
  pickName(x: any): string {
    return x.nameSnapshot || x.userName || x.fullName || x.userFullName || x.signerName || x.user?.fullName || x.user?.name || '';
  }

  private applySigner(x: any, who: 'mayor' | 'secretary') {
    const name = this.pickName(x);
    const desig = this.designationText(x) || (who === 'mayor' ? 'মেয়র' : 'সচিব');
    if (who === 'mayor') { this.mayorName = name; this.mayorDesignation = desig; }
    else { this.secretaryName = name; this.secretaryDesignation = desig; }
  }

  private pickSigner(cands: any[], who: 'mayor' | 'secretary') {
    if (!cands.length) return;
    this.applySigner(cands[0], who);
    this.tryImage(cands, 0, who);
  }

  // সবচেয়ে নতুন সাইনের ছবি না এলে পরের সাইন চেষ্টা করবে (ভুয়া/পুরোনো documentId এড়াতে)
  private tryImage(cands: any[], i: number, who: 'mayor' | 'secretary') {
    if (i >= cands.length || !this.municipalityId) return;
    const sig = cands[i];
    const docId = sig.documentId || sig.document?.id || sig.document?.documentId;
    if (!docId) { this.tryImage(cands, i + 1, who); return; }

    this.http.get(`/document-service/documents/${docId}/download?municipalityId=${this.municipalityId}`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const raw = URL.createObjectURL(blob);
          this.blobUrls.push(raw);
          const url = this.sanitizer.bypassSecurityTrustUrl(raw);
          this.applySigner(sig, who);
          if (who === 'mayor') this.mayorSign = url; else this.secretarySign = url;
        },
        error: () => this.tryImage(cands, i + 1, who)
      });
  }

  printReport() { window.print(); }

  // ---------- logged-in user (এই অ্যাপ localStorage এ 'dms_user' রাখে) ----------
  private getUser(): any {
    try {
      return JSON.parse(localStorage.getItem('dms_user') || localStorage.getItem('user') || localStorage.getItem('currentUser') || '{}');
    } catch { return {}; }
  }
  getLoggedMunicipalityId(): number | null {
    const u = this.getUser();
    const v = u.municipalityId ?? u.municipality?.id;
    return v != null && v !== '' ? Number(v) : null;
  }
  getLoggedMunicipalityName(id?: number | null): string {
    const u = this.getUser();
    const userMun = this.getLoggedMunicipalityId();
    const target = id ?? userMun;
    if (target === userMun) {
      const direct = u.municipalityName ?? u.municipality?.name;
      if (direct) return direct;
    }
    try {
      const cache = JSON.parse(localStorage.getItem('dms_municipalities_cache') || '{}');
      return cache[String(target)] || '';
    } catch { return ''; }
  }
}