import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateTaxProposalRequest {
  proposalNo: string;
  sourceType: string; // COMMITTEE_PROPOSAL | GOVT_DIRECTIVE
  directiveId?: string | null;
  proposalKindId?: string | null;
  titleBn: string;
  titleEn?: string | null;
  purposeType: string;
  purposeNote?: string;
  preparedByCommitteeId?: string | null;
  coverageNote?: string;
  collectionArrangement?: string;
  extraCollectionCost?: number;
  exceptionalNote?: string;
  proposedEffectiveDate?: string | null;
}

@Injectable({ providedIn: 'root' })
export class TaxproposalService {
  private base = '/taxproposal-service/tax-proposals';

  constructor(private http: HttpClient) {}

  list(): Observable<any[]> {
    return this.http.get<any[]>(this.base);
  }

  get(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}`);
  }
    // Committee gothon er list — Committee Service theke
  getCommittees(): Observable<any> {
    return this.http.get<any>('/committee-service/committees');
  }

  // Proposal Kind — Config Service theke
  // Tomar Config e PROPOSAL_KIND lookup ta jevabe ache, oivabe
  getProposalKinds(): Observable<any> {
    return this.http.get<any>('/config-service/lookups?group=PROPOSAL_KIND');
  }
  


  // করের ধরন - কনফিগ থেকে
  getTaxTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/config/lookups?group=TAX_TYPE`);
  }

  create(payload: CreateTaxProposalRequest): Observable<any> {
    return this.http.post<any>(this.base, payload);
  }

  prePublish(id: string, body: any): Observable<any> {
    return this.http.post<any>(`${this.base}/${id}/pre-publish`, body);
  }

  finalize(id: string): Observable<any> {
    return this.http.post<any>(`${this.base}/${id}/finalize`, {});
  }

  objectionWindow(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}/objection-window`);
  }
}