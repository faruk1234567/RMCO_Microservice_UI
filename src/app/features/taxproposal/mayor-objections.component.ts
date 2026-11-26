import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';


@Component({
  selector: 'app-mayor-objections',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mayor-objections.component.html'
})
export class MayorObjectionsComponent implements OnInit {
  @Input() proposal: any;
  @Input() committeeMemberIds: string[] = []; // কমিটির মেম্বার ID গুলো — ডায়নামিক
  objections: any[] = [];
  counts: any = {};
  total = 0;
  sending = false;
  sent = false;

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit() { this.load(); }

  load() {
    this.http.get<any[]>(`/api/tax-proposals/${this.proposal.id}/objections?status=PENDING`)
      .subscribe(list => {
        this.objections = list || [];
        this.total = this.objections.length;
        this.counts = {};
        for (const o of this.objections) {
          this.counts[o.objectionType] = (this.counts[o.objectionType] || 0) + 1;
        }
      });
  }

  sendAll() {
    const user = this.auth.currentUser();
    if (!user) { alert('আগে লগইন করুন'); return; }
    this.sending = true;
    this.http.post(`/api/tax-proposals/${this.proposal.id}/objections/send-to-committee`, {
      municipalityId: user.municipalityId,
      mayorId: user.id,
      committeeMemberIds: this.committeeMemberIds
    }).subscribe(() => {
      this.sending = false;
      this.sent = true;
      this.load();
    });
  }
}