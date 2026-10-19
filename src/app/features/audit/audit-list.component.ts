import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-audit-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <div class="page-header"><h1>অডিট লগ</h1></div>
      <div class="card">
        <div class="card-body table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>সময়</th><th>ইভেন্ট</th><th>ব্যবহারকারী</th><th>Aggregate</th><th>Hash</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>১৯-১০-২০২৬ ০৯:৪৫</td>
                <td>CommitteeDraftSubmitted</td>
                <td>user-uuid-1</td>
                <td>committee-uuid-3</td>
                <td style="font-family:monospace;font-size:0.75rem">a3f2...c91e</td>
              </tr>
              <tr>
                <td>১৮-১০-২০২৬ ১৬:২০</td>
                <td>ApprovalFinalApproved</td>
                <td>user-uuid-2</td>
                <td>committee-uuid-1</td>
                <td style="font-family:monospace;font-size:0.75rem">b7e1...d42a</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class AuditListComponent {}
