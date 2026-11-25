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

export interface AssessmentMethodRequest {
  methodCode: string;
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
  sourceType: string;
  directiveId?: string | null;
  proposalKindId?: string | null;
  titleBn: string;
  titleEn?: string | null;
  purposeType: string;
  purposeNote?: string;
  preparedByCommitteeId?: string | null;
  // ---- শাখা - নতুন ----
  departmentId?: string | null;
  branchId?: string | null;
  subBranchId?: string | null;
  coverageNote?: string;
  collectionArrangement?: string;
  extraCollectionCost?: number;
  exceptionalNote?: string;
  proposedEffectiveDate?: string | null;
  items?: TaxProposalItemRequest[];
  financeHistory?: FinanceHistoryRequest[];
  assessmentMethods?: AssessmentMethodRequest[];
}

@Injectable({ providedIn: 'root' })
export class TaxProposalService {
  private base = `${environment.taxProposalUrl}/tax-proposals`;

  // ---- শাখা Base - নতুন ----
  // BranchController Tax-Proposal-Service এ আছে, তাই একই Service URL
  private branchBase = `${environment.taxProposalUrl}/branches`;

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

  getById(id: string): Observable<any> {
    return this.get(id);
  }

  getCommittees(): Observable<any> {
    return this.http.get<any>(`${environment.committeeUrl}/committees`);
  }

  getProposalKinds(): Observable<any> {
    return this.http.get<any>(`${this.configBase}?group=PROPOSAL_KIND`);
  }

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

  // ---- শাখা - নতুন / ঠিক করা ----
  // সব শাখা একবারে আনে, Component নিজে parentId দিয়ে Filter করবে
  listBranches(parentId?: string | null): Observable<any> {
    let params = new HttpParams();
    if (parentId) params = params.set('parentId', String(parentId));
    return this.http.get<any>(this.branchBase, { params });
  }

  // Component এ getBranches() নামে ডাকলেও যাতে চলে
  getBranches(parentId?: string | null): Observable<any> {
    return this.listBranches(parentId);
  }

  getBranchesByParent(parentId: string): Observable<any> {
    return this.listBranches(parentId);
  }

  sendToCommittee(id: string) {
  // Login User এর Designation LocalStorage থেকে নিবে
  // আপনার Auth এ যেই Key তে Designation থাকে, ঐটা বসান
  const userStr = localStorage.getItem('user') || localStorage.getItem('currentUser') || '{}';
  let designation = '';
  try { designation = JSON.parse(userStr)?.designationCode || JSON.parse(userStr)?.designation || ''; } catch {}
  if (!designation) designation = localStorage.getItem('designationCode') || '';

  // Test এর জন্য - যদি LocalStorage এ না থাকে, তাহলে BRANCH_HEAD পাঠাবে
  // পরে আসল Designation আসলে এই লাইনটা কেটে দিবেন
  if (!designation) designation = 'BRANCH_HEAD';

  const municipalityId = localStorage.getItem('municipalityId') || '';

  return this.http.post(`${this.base}/${id}/send-to-committee`, {}, {
    headers: {
      'X-Municipality-Id': municipalityId,
      'X-Designation-Code': designation
    }
  });
}

  committeeApprove(id: string) {
    return this.http.post(`${this.base}/${id}/committee-approve`, {});
  }
}