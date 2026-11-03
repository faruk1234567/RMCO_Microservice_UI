// B-06 এর অংশ : গাছের এক node (নিজেকেই recursive ব্যবহার করে)
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScopeNode } from '../../core/models/config-admin.model';
import { CONFIG_STYLES } from './config-shared';

@Component({
  selector: 'app-scope-node',
  standalone: true,
  imports: [CommonModule, ScopeNodeComponent],
  styles: [CONFIG_STYLES, `
    :host { display: block; }
    ul { list-style: none; margin: 0; padding-left: 22px; border-left: 1px dashed #c9d1d3; }
    .node-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; flex-wrap: wrap; }
    .tg { width: 20px; text-align: center; border: 0; background: none; cursor: pointer; color: #0a5c36; }
    .dot { color: #b0b9bb; cursor: default; }
  `],
  template: `
    <div class="node-row">
      @if (node.children?.length) {
        <button class="tg" type="button" (click)="open = !open">{{ open ? '▾' : '▸' }}</button>
      } @else { <span class="tg dot">•</span> }
      <strong>{{ node.nameBn }}</strong>
      @if (node.nameEn) { <span class="muted">{{ node.nameEn }}</span> }
      <span class="chip">{{ node.levelNameBn || ('স্তর ' + node.levelNo) }}</span>
      <button class="btn-ghost btn-sm" type="button" (click)="addChild.emit(node)">+ উপ-node</button>
    </div>
    @if (open && node.children?.length) {
      <ul>
        @for (c of node.children; track c.id) {
          <li><app-scope-node [node]="c" (addChild)="addChild.emit($event)" /></li>
        }
      </ul>
    }
  `,
})
export class ScopeNodeComponent {
  @Input({ required: true }) node!: ScopeNode;
  @Output() addChild = new EventEmitter<ScopeNode>();
  open = true;
}
