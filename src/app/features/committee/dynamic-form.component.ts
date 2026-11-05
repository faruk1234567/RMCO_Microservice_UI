// B-10-এ বানানো "বাড়তি field" গুলো কমিটি গঠন ফর্মে আঁকে
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicField } from '../../core/models/config-admin.model';
import { ENGINE_STYLES } from './engine-shared';

export function validateFields(fields: DynamicField[], values: Record<string, any>, who = ''): string[] {
  const out: string[] = [];
  for (const f of fields.filter(x => x.showWhen !== 'ON_APPROVAL')) {
    const v = values?.[f.key];
    const empty = v === undefined || v === null || v === '';
    if (f.required && empty) { out.push(`${who}${f.labelBn} আবশ্যক`); continue; }
    if (!empty && f.validationRegex) {
      try { if (!new RegExp(f.validationRegex).test(String(v))) out.push(`${who}${f.labelBn}: মান সঠিক ফরম্যাটে নয়`); } catch { /* ভুল regex উপেক্ষা */ }
    }
  }
  return out;
}

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [ENGINE_STYLES],
  template: `
    @for (f of visible(); track f.key) {
      <div class="form-group">
        <label>{{ f.labelBn }} @if (f.required) { <span class="required">*</span> }</label>
        @switch (f.kind) {
          @case ('TEXTAREA') { <textarea class="form-control" rows="3" [ngModel]="values[f.key]" (ngModelChange)="set(f.key, $event)"></textarea> }
          @case ('NUMBER') { <input type="number" class="form-control" [ngModel]="values[f.key]" (ngModelChange)="set(f.key, $event)" /> }
          @case ('DATE') { <input type="date" class="form-control" [ngModel]="values[f.key]" (ngModelChange)="set(f.key, $event)" /> }
          @case ('SELECT') {
            <select class="form-control" [ngModel]="values[f.key] ?? ''" (ngModelChange)="set(f.key, $event)">
              <option value="">— বাছাই করুন —</option>
              @for (o of f.options; track o) { <option [value]="o">{{ o }}</option> }
            </select>
          }
          @case ('BOOLEAN') { <label class="check"><input type="checkbox" [ngModel]="!!values[f.key]" (ngModelChange)="set(f.key, $event)" /> হ্যাঁ</label> }
          @default { <input class="form-control" [ngModel]="values[f.key]" (ngModelChange)="set(f.key, $event)" /> }
        }
      </div>
    } @empty { <div class="muted">কোনো বাড়তি তথ্য নেই।</div> }
  `,
})
export class DynamicFormComponent {
  @Input() fields: DynamicField[] = [];
  @Input() values: Record<string, any> = {};
  @Output() valuesChange = new EventEmitter<Record<string, any>>();
  visible = () => this.fields.filter(f => f.showWhen !== 'ON_APPROVAL');
  set(key: string, v: any) { this.values = { ...this.values, [key]: v }; this.valuesChange.emit(this.values); }
}
