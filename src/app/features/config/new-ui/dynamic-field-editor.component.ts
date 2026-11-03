// B-10 : বাড়তি (dynamic) field – B-02-এর "বাড়তি field" ট্যাবে বসে
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicField, FieldKind, FieldTarget } from '../../core/models/config-admin.model';
import { CONFIG_STYLES } from './config-shared';

@Component({
  selector: 'app-dynamic-field-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [CONFIG_STYLES],
  template: `
    <div class="alert alert-info">
      এখানে যোগ করা field কমিটি গঠন, সদস্য যোগ ও প্রস্তাবের ফর্মে নিজে থেকে দেখা যাবে। কোনো কোড বদলাতে হবে না।
    </div>

    @for (f of fields; track $index; let i = $index) {
      <div class="card mb-2">
        <div class="card-body">
          <div class="grid3">
            <div class="form-group">
              <label>Field key <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="f.key" [disabled]="readonly" placeholder="voter_id" (ngModelChange)="emit()" />
            </div>
            <div class="form-group">
              <label>লেবেল (বাংলা) <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="f.labelBn" [disabled]="readonly" (ngModelChange)="emit()" />
            </div>
            <div class="form-group">
              <label>Label (English)</label>
              <input class="form-control" [(ngModel)]="f.labelEn" [disabled]="readonly" (ngModelChange)="emit()" />
            </div>
          </div>
          <div class="grid3">
            <div class="form-group">
              <label>কোথায় দেখাবে</label>
              <select class="form-control" [(ngModel)]="f.target" [disabled]="readonly" (ngModelChange)="emit()">
                @for (t of targets; track t.v) { <option [value]="t.v">{{ t.l }}</option> }
              </select>
            </div>
            <div class="form-group">
              <label>ধরন</label>
              <select class="form-control" [(ngModel)]="f.kind" [disabled]="readonly" (ngModelChange)="emit()">
                @for (k of kinds; track k.v) { <option [value]="k.v">{{ k.l }}</option> }
              </select>
            </div>
            <div class="form-group">
              <label>কখন দেখাবে</label>
              <select class="form-control" [(ngModel)]="f.showWhen" [disabled]="readonly" (ngModelChange)="emit()">
                <option value="ALWAYS">সব সময়</option>
                <option value="ON_CREATE">শুধু তৈরির সময়</option>
                <option value="ON_APPROVAL">শুধু অনুমোদনের সময়</option>
              </select>
            </div>
          </div>
          @if (f.kind === 'SELECT') {
            <div class="form-group">
              <label>Option-সমূহ (কমা দিয়ে আলাদা করুন)</label>
              <input class="form-control" [ngModel]="f.options.join(', ')" [disabled]="readonly"
                     (ngModelChange)="setOptions(f, $event)" placeholder="হ্যাঁ, না, প্রযোজ্য নয়" />
            </div>
          }
          <div class="form-group">
            <label>যাচাইয়ের নিয়ম (regex, ঐচ্ছিক)</label>
            <input class="form-control" [(ngModel)]="f.validationRegex" [disabled]="readonly" placeholder="^[0-9]{10,17}$" (ngModelChange)="emit()" />
          </div>
          <div class="row-actions">
            <label class="check"><input type="checkbox" [(ngModel)]="f.required" [disabled]="readonly" (ngModelChange)="emit()" /> আবশ্যক</label>
            @if (!readonly) { <button class="btn-ghost btn-sm" (click)="remove(i)">এই field সরান</button> }
          </div>
        </div>
      </div>
    } @empty {
      <div class="empty">এখনো কোনো বাড়তি field নেই।</div>
    }

    @if (!readonly) { <button class="btn-ghost" (click)="add()">+ নতুন field</button> }
  `,
})
export class DynamicFieldEditorComponent {
  @Input() fields: DynamicField[] = [];
  @Input() readonly = false;
  @Output() fieldsChange = new EventEmitter<DynamicField[]>();

  targets: { v: FieldTarget; l: string }[] = [
    { v: 'COMMITTEE', l: 'কমিটি' }, { v: 'MEMBER', l: 'সদস্য' }, { v: 'RESOLUTION', l: 'প্রস্তাব (resolution)' },
  ];
  kinds: { v: FieldKind; l: string }[] = [
    { v: 'TEXT', l: 'ছোট লেখা' }, { v: 'TEXTAREA', l: 'বড় লেখা' }, { v: 'NUMBER', l: 'সংখ্যা' },
    { v: 'DATE', l: 'তারিখ' }, { v: 'SELECT', l: 'তালিকা থেকে বাছাই' }, { v: 'BOOLEAN', l: 'হ্যাঁ / না' },
  ];

  add() {
    this.fields = [...this.fields, {
      key: '', labelBn: '', labelEn: '', target: 'COMMITTEE', kind: 'TEXT',
      required: false, options: [], showWhen: 'ALWAYS', validationRegex: '',
    }];
    this.emit();
  }
  remove(i: number) { this.fields = this.fields.filter((_, idx) => idx !== i); this.emit(); }
  setOptions(f: DynamicField, raw: string) { f.options = raw.split(',').map(s => s.trim()).filter(Boolean); this.emit(); }
  emit() { this.fieldsChange.emit(this.fields); }
}
