import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';


@Component({
  selector: 'app-committee-objection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './committee-objection.component.html'
})
export class CommitteeObjectionComponent {
  @Input() batch: any;
  decision = 'SEND_TO_TAX_BRANCH';
  note = '';
  voted = false;

  constructor(private http: HttpClient, private auth: AuthService) {}

  vote() {
  const user = this.auth.currentUser();
  if (!user) { alert('আগে লগইন করুন'); return; }

  const memberName = (user as any).name
    ?? (user as any).fullName
    ?? (user as any).displayName
    ?? (user as any).username
    ?? 'সদস্য';

  this.http.post(`/api/tax-proposals/objection-batches/${this.batch.id}/decide`, {
    memberId: user.id,
    memberName: memberName,
    decision: this.decision,
    note: this.note
  }).subscribe(() => { this.voted = true; });
}
}