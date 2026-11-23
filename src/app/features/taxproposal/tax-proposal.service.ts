import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TaxProposalItemRequest {
  taxTypeId?: string | null;
  rateBasis: string;
  proposedRate?: number | null;
  proposedAnnualCollection?: number | null;
  existingRate?: number | null;
  existingAnnualCollection?: number | null;
  rateNote?: string | null;
}

export interface FinanceHistoryRequest {
  fiscalYear: string;
  incomeAmount?: number | null;
  expenseAmount?: number | null;
}

// *** ৩ নম্বর - এইটা না থাকলে টিক সেভ হবে না ***
export interface AssessmentMethodRequest {
  methodCode: string; // FULLY_RENTED | FULLY_OCCUPIED | PARTIAL
  enabled?: boolean | null;
  basisType?: string | null;
  deductMaintenance?: boolean | null;
  deductMortgageNonCommercial?: boolean | null;
  deductMortgageCommercialOneThird?: boolean | null;
  compareWithMarketRent?: boolean | null;
  note?: string | null;
}

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
  items?: TaxProposalItemRequest[];
  financeHistory?: FinanceHistoryRequest[];
  // *** ৩ নম্বর - এই লাইনটা বাড়ানো হইলো ***
  assessmentMethods?: AssessmentMethodRequest[];
}

@Injectable({ providedIn: 'root' })
export class TaxProposalService {
  // ✅ /tax-proposal-service/tax-proposals
  // -> Gateway -> /api/v1/tax-proposals
  private base = `${environment.taxProposalUrl}/tax-proposals`;

  // ✅ Config - Proxy এর সবার উপরের Entry দিয়ে সরাসরি 8090 এ যাবে
  // Gateway দিয়ে পাঠাইলে Identity তে চলে যাইতো
  private configBase = `/api/v1/config/master-items`;

  constructor(private http: HttpClient) {}

  list(municipalityId?: number | string | null, page = 0, size = 20): Observable<any> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    if (municipalityId !== undefined && municipalityId !== null && municipalityId !== '') {
      params = params.set('municipalityId', String(municipalityId));
    }
    return this.http.get<any>(this.base, { params });
  }

  get(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}`);
  }

  // *** রিপোর্টের জন্য - get() এরই আরেক নাম, যাতে getById() কাজ করে ***
  getById(id: string): Observable<any> {
    return this.get(id);
  }

  // কমিটি — Committee Service থেকে, Gateway দিয়ে
  getCommittees(): Observable<any> {
    return this.http.get<any>(`${environment.committeeUrl}/committees`);
  }

  // প্রস্তাবের ধরন — Config Service থেকে, মাস্টার আইটেম
  getProposalKinds(): Observable<any> {
    return this.http.get<any>(`${this.configBase}?group=PROPOSAL_KIND`);
  }

  // করের ধরন — Config Service থেকে, মাস্টার আইটেম — একই জায়গা থেকে
  getTaxTypes(): Observable<any> {
    return this.http.get<any>(`${this.configBase}?group=TAX_TYPE`);
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

  getRateBases(): Observable<any> {
    return this.http.get<any>(`${this.configBase}?group=RATE_BASIS`);
  }

  getPurposeTypes(): Observable<any> {
    return this.http.get<any>(`${this.configBase}?group=PURPOSE_TYPE`);
  }

  getAssessmentOptions(): Observable<any> {
    return this.http.get<any>(`${this.configBase}?group=ASSESSMENT_METHOD`);
  }

  listProposals() {
    return this.http.get<any>(this.base);
  }
  listBranches() {
  return this.http.get(`/tax-proposal-service/branches`);
}
sendToCommittee(id: string) {
  return this.http.post(`/tax-proposal-service/tax-proposals/${id}/send-to-committee`, {});
}
committeeApprove(id: string) {
  return this.http.post(`/tax-proposal-service/tax-proposals/${id}/committee-approve`, {});
}
}