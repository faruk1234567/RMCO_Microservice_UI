import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../core/services/config.service';
import { ScopeNode } from '../../core/models/config.model';

@Component({
  selector: 'app-scope-tree',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>কার্যপরিধি (Scope Tree)</h1>
      </div>
      <div class="card">
        <div class="card-body">
          @for (node of tree(); track node.id) {
            <div class="tree-node">
              <div class="node-label root">{{ node.nameBn }} <small class="text-muted">({{ node.code }})</small></div>
              @if (node.children?.length) {
                <div class="children">
                  @for (child of node.children; track child.id) {
                    <div class="node-label child">└ {{ child.nameBn }} <small class="text-muted">({{ child.code }})</small></div>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tree-node { margin-bottom: 16px; }
    .node-label { padding: 8px 12px; border-radius: 6px; font-size: 0.95rem; }
    .node-label.root { background: #e8f5ee; font-weight: 600; }
    .node-label.child { margin-left: 24px; margin-top: 4px; background: #f5f9f6; }
  `],
})
export class ScopeTreeComponent implements OnInit {
  tree = signal<ScopeNode[]>([]);
  constructor(private cfg: ConfigService) {}
  ngOnInit() { this.cfg.getScopeTree().subscribe((t) => this.tree.set(t)); }
}
