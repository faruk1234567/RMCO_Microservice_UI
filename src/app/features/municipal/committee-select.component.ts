// সক্রিয় কমিটির তালিকা থেকে বাছাই (তালিকা না এলে UUID হাতে লেখার ঘর)
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { EngineApiService } from '../../core/services/engine-api.service';
import { Row, committeeName, idOf } from '../committee/engine-shared';

@Component({
  selector: 'app-committee-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (list().length) {
      <select class="form-control" [ngModel]="value" (ngModelChange)="set($event)">
        <option value="">— কমিটি বাছাই করুন —</option>
        @for (c of list(); track id(c)) { <option [value]="id(c)">{{ name(c) }}</option> }
      </select>
    } @else {
      <input class="form-control" [ngModel]="value" (ngModelChange)="set($event)" placeholder="কমিটির ID (UUID)" />
    }
  `,
})
export class CommitteeSelectComponent implements OnInit {
  private api = inject(EngineApiService);
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();
  list = signal<Row[]>([]);
  id = idOf; name = committeeName;
  ngOnInit() { this.api.listCommittees('ACTIVE').pipe(catchError(() => of([] as Row[]))).subscribe(l => this.list.set(l ?? [])); }
  set(v: string) { this.value = v; this.valueChange.emit(v); }
}
