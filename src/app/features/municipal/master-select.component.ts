// ধারণ তালিকা (Master item) থেকে বাছাই; তালিকা না পেলে UUID হাতে লেখার ঘর
// ⚠ group-এর কোড (TAX_TYPE, PROPOSAL_KIND) অনুমান; কর-ধরন অন্য service-এ থাকলে হাতে UUID দিন
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { ConfigAdminService } from '../../core/services/config-admin.service';
import { MasterItem } from '../../core/models/config-admin.model';

@Component({
  selector: 'app-master-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (items().length) {
      <select class="form-control" [ngModel]="value" (ngModelChange)="set($event)">
        <option value="">— বাছাই করুন —</option>
        @for (m of items(); track m.id) { <option [value]="m.id">{{ m.nameBn }}</option> }
      </select>
    } @else {
      <input class="form-control" [ngModel]="value" (ngModelChange)="set($event)" placeholder="ID (UUID)" />
    }
  `,
})
export class MasterSelectComponent implements OnInit {
  private cfg = inject(ConfigAdminService);
  @Input() group = '';
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();
  items = signal<MasterItem[]>([]);
  ngOnInit() { this.cfg.listMasterItems(this.group).pipe(catchError(() => of([] as MasterItem[]))).subscribe(l => this.items.set((l ?? []).filter(x => x.isActive !== false))); }
  set(v: string) { this.value = v; this.valueChange.emit(v); }
}
