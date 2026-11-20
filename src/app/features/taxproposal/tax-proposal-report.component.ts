import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TaxproposalService } from './tax-proposal.service';

@Component({
  selector: 'app-tax-proposal-report',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tax-proposal-report.component.html',
  styleUrls: ['./tax-proposal-report.component.css']
})
export class TaxProposalReportComponent implements OnInit {
  p: any;
  constructor(private route: ActivatedRoute, private svc: TaxproposalService) {}
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.getById(id).subscribe((r: any) => this.p = r.data ?? r);
  }
  print() { window.print(); }
}