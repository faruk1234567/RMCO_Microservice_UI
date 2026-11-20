import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
export class TaxproposalService {
  private base = '/api/v1/tax-proposals';
  private configBase = '/config-service/api/v1/config/master-items';

  constructor(private http: HttpClient) {}

  list(): Observable<any[]> {
    return this.http.get<any[]>(this.base);
  }

  get(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}`);
  }

  // *** রিপোর্টের জন্য - get() এরই আরেক নাম, যাতে getById() কাজ করে ***
  getById(id: string): Observable<any> {
    return this.get(id);
  }

  // কমিটি — Committee Service থেকে
  getCommittees(): Observable<any> {
    return this.http.get<any>('/committee-service/committees');
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
    return this.http.get<any[]>(`/api/v1/tax-proposals`);
  }
}