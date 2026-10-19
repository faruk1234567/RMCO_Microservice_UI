import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CommitteeService } from '../../core/services/committee.service';
import { WorkflowService } from '../../core/services/workflow.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  widgets = signal([
    { title: 'খসড়া কমিটি', count: 0, color: '#f0b429', path: '/committee', desc: 'জমা দেওয়ার অপেক্ষায়' },
    { title: 'অনুমোদনাধীন', count: 0, color: '#2980b9', path: '/workflow', desc: 'আপনার সিদ্ধান্তের অপেক্ষায়' },
    { title: 'সক্রিয় কমিটি', count: 0, color: '#0a5c36', path: '/committee', desc: 'বর্তমানে কার্যকর' },
    { title: 'প্রত্যাখ্যাত', count: 0, color: '#c0392b', path: '/committee', desc: 'পুনরায় জমা দিতে পারেন' },
  ]);

  recentActivities = [
    { action: 'নতুন খসড়া তৈরি', target: 'শিক্ষা কমিটি', time: '১০ মিনিট আগে', user: 'আপনি' },
    { action: 'অনুমোদন সম্পন্ন', target: 'স্বাস্থ্য কমিটি', time: '২ ঘণ্টা আগে', user: 'মেয়র' },
    { action: 'সদস্য যোগ', target: 'উন্নয়ন কমিটি', time: 'গতকাল', user: 'সচিব' },
  ];

  constructor(private committeeSvc: CommitteeService, private wf: WorkflowService) {}

  ngOnInit() {
    forkJoin({
      all: this.committeeSvc.list(),
      pending: this.wf.listPending(),
    }).subscribe(({ all, pending }) => {
      const draft = all.filter((c) => c.status === 'DRAFT').length;
      const active = all.filter((c) => c.status === 'ACTIVE').length;
      const rejected = all.filter((c) => c.status === 'REJECTED').length;
      const pendingCount = pending.filter((p) => p.status === 'PENDING' || p.status === 'IN_PROGRESS').length;
      this.widgets.set([
        { title: 'খসড়া কমিটি', count: draft, color: '#f0b429', path: '/committee', desc: 'জমা দেওয়ার অপেক্ষায়' },
        { title: 'অনুমোদনাধীন', count: pendingCount, color: '#2980b9', path: '/workflow', desc: 'আপনার সিদ্ধান্তের অপেক্ষায়' },
        { title: 'সক্রিয় কমিটি', count: active, color: '#0a5c36', path: '/committee', desc: 'বর্তমানে কার্যকর' },
        { title: 'প্রত্যাখ্যাত', count: rejected, color: '#c0392b', path: '/committee', desc: 'পুনরায় জমা দিতে পারেন' },
      ]);
    });
  }
}
