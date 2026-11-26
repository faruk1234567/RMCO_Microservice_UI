import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-objection-new',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './objection-new.component.html'
})
export class ObjectionNewComponent implements OnInit {
  form!: FormGroup;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  ngOnInit() {
    const user = this.auth.currentUser();
    const proposalId = this.route.snapshot.queryParamMap.get('proposalId') || '';

    this.form = this.fb.group({
      subjectType: ['TAX_PROPOSAL', Validators.required],
      subjectId: [proposalId, Validators.required],
      holdingId: [{ value: '', disabled: true }, Validators.required],
      complainantName: ['', Validators.required],
      complainantPhone: ['', Validators.required],
      complainantEmail: [''],
      subject: ['', Validators.required],
      category: ['COMPLAINT', Validators.required],
      priority: ['NORMAL'],
      description: ['', Validators.required],
      remarks: ['']
    });

    const name = (user as any)?.fullName
      ?? (user as any)?.name
      ?? (user as any)?.displayName
      ?? (user as any)?.username
      ?? '';
    this.form.patchValue({ complainantName: name });

    // ১. লগইন ইউজারের হোল্ডিং থাকলে ঐটা
    const h = (user as any)?.holdingId ?? (user as any)?.holdingNo ?? '';
    if (h && h !== 'UUID') {
      this.form.patchValue({ holdingId: h });
      return;
    }

    // ২. পৌরসভার ইউজার হলে — পৌরসভার ১ম হোল্ডিং অটো
    this.http.get<any[]>(`/api/holdings?municipalityId=${(user as any)?.municipalityId}`).subscribe({
      next: (list) => {
        const first = list?.[0];
        const hid = first?.holdingNo ?? first?.holdingId ?? first?.id ?? '';
        if (hid && hid !== 'UUID') this.form.patchValue({ holdingId: hid });
      },
      error: () => {
        // ৩. হোল্ডিং API না থাকলে users/me থেকে
        this.http.get<any>('/api/users/me').subscribe({
          next: (me) => {
            const hid2 = me?.holdingId ?? me?.holdingNo ?? me?.holdings?.[0]?.holdingNo ?? '';
            if (hid2 && hid2 !== 'UUID') this.form.patchValue({ holdingId: hid2 });
          },
          error: () => {}
        });
      }
    });
  }

  onFile(e: any) {
    const f = e.target.files[0];
    if (f) console.log('file:', f.name);
  }

  submit() {
    if (this.form.invalid) {
      alert('সব * চিহ্ন দেওয়া ঘর পূরণ করুন');
      this.form.markAllAsTouched();
      return;
    }
    const user = this.auth.currentUser();
    if (!user) { alert('আগে লগইন করুন'); return; }

    this.submitting = true;
    const v = this.form.getRawValue();
    this.http.post(`/api/tax-proposals/${v.subjectId}/objections`, {
      municipalityId: (user as any)?.municipalityId,
      citizenId: (user as any)?.id,
      citizenName: v.complainantName,
      holdingId: v.holdingId,
      objectionType: 'OTHER',
      details: v.subject + '\n' + v.description,
      proofDocumentId: null,
      subjectType: v.subjectType,
      complainantPhone: v.complainantPhone,
      category: v.category,
      priority: v.priority
    }).subscribe({
      next: () => {
        this.submitting = false;
        alert('আপত্তি জমা হয়েছে');
        this.router.navigate(['/objections']);
      },
      error: (err) => {
        this.submitting = false;
        alert('জমা হয়নি: ' + (err.error?.message || 'আবার চেষ্টা করুন'));
      }
    });
  }
}