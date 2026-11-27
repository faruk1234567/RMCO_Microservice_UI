// O-02 : আপত্তি জমা (SubmitObjectionRequest অনুযায়ী)
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ObjectionApi } from '../../core/services/municipal-api.service';
import { AuthService } from '../../core/services/auth.service';
import { DocumentUploaderComponent } from '../document/document-uploader.component';
import { MUNI_STYLES, RK, Recent, Row, clean, errMsg, isUuid, rid } from './municipal-shared';

@Component({
  selector: 'app-objection-new',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DocumentUploaderComponent],
  styles: [MUNI_STYLES],
  templateUrl: './objection-new.component.html',
})
export class ObjectionNewComponent implements OnInit {
  private api = inject(ObjectionApi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  subjectHints = ['TAX_PROPOSAL'];
  // DB Check Constraint: CHECK ((objector_kind = ANY (ARRAY['REGISTERED_CUSTOMER', 'HOLDING_CLAIMANT'])))
  kindHints = ['REGISTERED_CUSTOMER', 'HOLDING_CLAIMANT'];

  // FIX 1: holdingNo যোগ করলাম + subjectId / holdingId তে টেস্ট UUID আগে থেকে বসালাম
  f = {
    subjectType: 'TAX_PROPOSAL',
    subjectId: '00000000-0000-0000-0000-000000000001',
    holdingId: '00000000-0000-0000-0000-000000000002',
    holdingNo: '123',
    objectorName: '',
    objectorKind: 'REGISTERED_CUSTOMER'
  };

  form: { k: string; v: string }[] = [{ k: 'reason', v: '' }, { k: 'details', v: '' }];
  docId = signal('');
  busy = signal(false);
  err = signal('');
  problems = signal<string[]>([]);

  ngOnInit() {
    const pid = this.route.snapshot.queryParamMap.get('proposalId');
    if (pid) this.f.subjectId = pid;

    const user: any = this.auth.currentUser();
    if (user?.fullName || user?.username) {
      this.f.objectorName = user?.fullName || user?.username || '';
    }
    // FIX 2: resolveHolding() কলটা বাদ দিলাম - আপাতত Auto খুঁজবে না
  }

  // FIX 3: resolveHolding() পুরা ফাংশনটা বাদ দিলাম

  submit() {
    const p: string[] = [];
    if (!this.f.subjectType.trim()) p.push('বিষয়ের ধরন দিন');
    if (!isUuid(this.f.subjectId)) p.push('বিষয়ের ID সঠিক UUID নয়');
    if (!this.f.objectorName.trim()) p.push('আপত্তিকারীর নাম দিন');
    if (!this.kindHints.includes(this.f.objectorKind)) p.push('আপত্তিকারীর ধরন REGISTERED_CUSTOMER বা HOLDING_CLAIMANT হতে হবে');
    // FIX 4: আগের ভুল মেসেজটা বাদ - এখন হাতে লেখা Holding ID চেক করবে
    if (!this.f.holdingNo.trim()) p.push('Holding No দিন - যেমন 123');
    if (!isUuid(this.f.holdingId)) p.push('Holding ID সঠিক UUID নয়');

    const formValues: Row = {};
    // FIX 5: Holding No টা formValues এর ভিতরে ঢুকালাম
    formValues['holdingNo'] = this.f.holdingNo.trim();
    this.form
      .filter(r => r.k.trim() && r.v.trim())
      .forEach(r => (formValues[r.k.trim()] = r.v.trim()));
    if (!Object.keys(formValues).length) p.push('আপত্তির বিবরণ লিখুন');

    this.problems.set(p);
    if (p.length) return;
    if (this.docId()) formValues['attachmentDocumentId'] = this.docId();

    this.busy.set(true);
    this.err.set('');

    // FIX 6: holding$ / resolveHolding বাদ - সরাসরি Send
    this.send(formValues);
  }

  private send(formValues: Row) {
    // Postman এ যেই JSON দিয়ে 201 আসছে, ঠিক ঐটাই যাবে
    // holdingNo আলাদা Body তে যাবে না, formValues এর ভিতরে যাবে
    const { holdingNo, ...rest } = this.f;
    this.api.submit({ ...clean(rest), formValues }).subscribe({
      next: (r) => {
        this.busy.set(false);
        const id = rid(r);
        if (id) {
          Recent.add(RK.objection, id, String(r['objectionNo'] ?? this.f.objectorName));
          this.router.navigate(['/objections', id]);
        } else {
          this.router.navigate(['/objections']);
        }
      },
      error: (e) => { this.busy.set(false); this.err.set(errMsg(e)); },
    });
  }
}