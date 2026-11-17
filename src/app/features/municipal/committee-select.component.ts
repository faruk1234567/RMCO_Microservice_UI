import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommitteeService } from '../../core/services/committee.service';

@Component({
  selector: 'app-committee-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <select class="form-control" [ngModel]="value" (ngModelChange)="onChange($event)">
      <option value="">
        {{ loading ? 'কমিটি লোড হচ্ছে...' : '-- কমিটি বেছে নিন --' }}
      </option>
      @for (c of committees; track c.id) {
        <option [value]="c.id">{{ c.nameBn || c.name || c.committeeName }}</option>
      }
    </select>
    @if (!loading && committees.length === 0) {
      <small style="color:red">কোনো সক্রিয় কমিটি পাওয়া যায়নি। প্রথমে কমিটি সক্রিয় করুন।</small>
    }
  `
})
export class CommitteeSelectComponent implements OnInit {
  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();

  committees: any[] = [];
  loading = false;

  constructor(private committeeService: CommitteeService) {}

  ngOnInit() {
    this.loading = true;
    // শুধু ACTIVE কমিটি আনবে - IN_APPROVAL / প্রত্যাখ্যাত আসবে না
    this.committeeService.getActiveCommittees().subscribe({
      next: (list: any) => {
        this.committees = Array.isArray(list) ? list : (list?.data || list?.content || []);
        this.loading = false;
        // ১টাই সক্রিয় কমিটি থাকলে অটো সিলেক্ট
        if (this.committees.length === 1 && !this.value) {
          this.onChange(this.committees[0].id);
        }
      },
      error: () => {
        this.committees = [];
        this.loading = false;
      }
    });
  }

  onChange(v: string) {
    this.value = v;
    this.valueChange.emit(v);
  }
}