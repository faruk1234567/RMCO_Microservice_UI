import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TaxProposalService } from './tax-proposal.service';

@Component({
  selector: 'app-taxproposal-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tax-proposal-list.component.html',
  styleUrls: ['./tax-proposal-list.component.css']
})
export class TaxproposalListComponent implements OnInit {
  // লিস্টের ডাটা
  proposals = signal<any[]>([]);
  loading = signal(false);
  error = signal('');
  search = signal('');

  // UUID দিয়ে খোঁজার জন্য আলাদা ইনপুট
  searchId = signal('');

  // শাখা Map - id -> নাম
  branchMap = signal<Record<string, string>>({});

  // স্ট্যাটাসের বাংলা - নতুন ২টা যোগ করছি, পুরনোগুলা আছে
  statusBn: Record<string, string> = {
    DRAFT: 'খসড়া - শাখায় আছে',
    SENT_TO_COMMITTEE: 'কমিটিতে পাঠানো হইছে',
    COMMITTEE_APPROVED: 'কমিটি অনুমোদন করছে - প্রাক-প্রকাশ করুন',
    PRE_PUBLISHED: 'প্রাক-প্রকাশিত',
    UNDER_OBJECTION_REVIEW: 'আপত্তি পর্যালোচনায়',
    FINALIZED: 'চূড়ান্ত',
    APPROVED: 'অনুমোদিত',
    REJECTED: 'বাতিল'
  };

  // সার্চ অনুযায়ী ফিল্টার
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.proposals();
    if (!q) return list;
    return list.filter((p: any) =>
      (p.proposalNo || '').toString().toLowerCase().includes(q) ||
      (p.titleBn || '').toLowerCase().includes(q) ||
      (p.titleEn || '').toLowerCase().includes(q)
    );
  });

  constructor(
    private service: TaxProposalService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadBranches();
    this.load();
  }

  // ---- শাখা Load - নতুন ----
  loadBranches() {
    (this.service as any).listBranches?.().subscribe({
      next: (res: any) => {
        const all = Array.isArray(res) ? res : (res?.data ?? res?.content ?? []);
        const map: Record<string, string> = {};
        all.forEach((b: any) => { if (b?.id) map[String(b.id)] = b.nameBn || b.nameEn || ''; });
        this.branchMap.set(map);
      },
      error: () => {}
    });
  }

  branchName(p: any): string {
    const map = this.branchMap();
    const parts = [p.departmentId, p.branchId, p.subBranchId]
      .map((id: any) => id ? map[String(id)] : '')
      .filter(Boolean);
    if (parts.length) return parts.join(' → ');
    return 'শাখা দেওয়া নাই - পুরনো প্রস্তাবনা';
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    (this.service as any).list().subscribe({
      next: (res: any) => {
        let arr = Array.isArray(res) ? res : (res?.data || res?.content || []);
        arr = arr.filter((p: any) => {
          if (!p) return false;
          if (p.proposalNo === 'create') return false;
          if (p.id === 'create') return false;
          if (!p.id || p.id.length < 30) return false;
          return true;
        });
        arr.sort((a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        this.proposals.set(arr);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'লিস্ট আনতে সমস্যা হয়েছে');
      }
    });
  }

  onSearch(event: any) { this.search.set(event.target.value || ''); }

  openById() {
    const id = this.searchId().trim();
    if (!id) return;
    this.router.navigate(['/tax-proposals', id]);
  }

  onSearchId(event: any) { this.searchId.set(event.target.value || ''); }

  openProposal(p: any) {
    if (!p?.id) return;
    this.router.navigate(['/tax-proposals', p.id]);
  }

  // ---- নতুন Flow: শাখা প্রধান পাঠাবে - DRAFT থেকে ----
  canSendToCommittee(p: any): boolean {
    return p?.status === 'DRAFT';
  }

  sendToCommittee(p: any) {
    if (!this.canSendToCommittee(p)) return;
    if (!confirm(`প্রস্তাব ${p.proposalNo} কমিটির কাছে পাঠাবেন?`)) return;
    (this.service as any).sendToCommittee(p.id).subscribe({
      next: () => this.load(),
      error: (err: any) => alert(err?.error?.message || 'শুধু শাখা প্রধানই পাঠাইতে পারবে')
    });
  }

  // ---- নতুন Flow: কমিটি Approve করবে - SENT_TO_COMMITTEE থেকে ----
  canCommitteeApprove(p: any): boolean {
    return p?.status === 'SENT_TO_COMMITTEE';
  }

  committeeApprove(p: any) {
    if (!this.canCommitteeApprove(p)) return;
    if (!confirm(`কমিটি প্রস্তাব ${p.proposalNo} অনুমোদন করবে?`)) return;
    (this.service as any).committeeApprove(p.id).subscribe({
      next: () => this.load(),
      error: (err: any) => alert(err?.error?.message || 'কমিটি Approve হয় নাই')
    });
  }

  // প্রাক-প্রকাশ বাটন কখন চালু থাকবে - এখন COMMITTEE_APPROVED এর পর
  canPrePublish(p: any): boolean {
  return p.status === 'COMMITTEE_APPROVED';
}

  canFinalize(p: any): boolean {
    return p?.status === 'PRE_PUBLISHED' || p?.status === 'UNDER_OBJECTION_REVIEW';
  }

  prePublish(p: any) {
    if (!this.canPrePublish(p)) return;
    if (!confirm(`প্রস্তাব ${p.proposalNo} প্রাক-প্রকাশ করবেন?`)) return;
    (this.service as any).prePublish(p.id, {}).subscribe({
      next: () => this.load(),
      error: (err: any) => alert(err?.error?.message || 'প্রাক-প্রকাশ হয়নি')
    });
  }

  finalize(p: any) {
    if (!this.canFinalize(p)) return;
    if (!confirm(`প্রস্তাব ${p.proposalNo} চূড়ান্ত করবেন?`)) return;
    (this.service as any).finalize(p.id).subscribe({
      next: () => this.load(),
      error: (err: any) => alert(err?.error?.message || 'চূড়ান্ত হয়নি')
    });
  }
}

export { TaxproposalListComponent as TaxProposalListComponent };