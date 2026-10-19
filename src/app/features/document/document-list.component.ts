import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>নথি ব্যবস্থাপনা</h1>
        <button class="btn btn-primary">+ নথি আপলোড</button>
      </div>
      <div class="card">
        <div class="card-body table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>ফাইলের নাম</th><th>ধরন</th><th>স্ক্যান অবস্থা</th><th>আপলোড</th><th>সাইজ</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>proposal_education.pdf</td>
                <td>প্রস্তাব</td>
                <td><span class="badge badge-success">CLEAN</span></td>
                <td>১৫ অক্টোবর</td>
                <td>2.4 MB</td>
              </tr>
              <tr>
                <td>member_nid_scan.jpg</td>
                <td>পরিচয়পত্র</td>
                <td><span class="badge badge-warning">PENDING</span></td>
                <td>১৮ অক্টোবর</td>
                <td>1.1 MB</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class DocumentListComponent {}
