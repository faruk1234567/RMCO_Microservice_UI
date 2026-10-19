import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApprovalRequest, DecisionPayload } from '../models/workflow.model';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private base = environment.workflowUrl;

  constructor(private http: HttpClient) {}

  listPending(): Observable<ApprovalRequest[]> {
    return this.http.get<ApprovalRequest[]>(`${this.base}/workflow/requests?status=PENDING,IN_PROGRESS`).pipe(
      catchError(() =>
        of<ApprovalRequest[]>([
          {
            id: 'ar-1', municipalityId: 'm-001', subjectType: 'COMMITTEE', subjectId: 'c-2',
            subjectTitleBn: 'স্বাস্থ্য কমিটি গঠন', actionCode: 'CREATE', status: 'IN_PROGRESS',
            currentStepOrder: 2, currentStepName: 'মেয়র', submittedAt: '2025-10-18T10:00:00Z',
            steps: [
              { id: 's1', stepOrder: 1, nameBn: 'সচিব', status: 'APPROVED', decidedAt: '2025-10-18T14:00:00Z' },
              { id: 's2', stepOrder: 2, nameBn: 'মেয়র', status: 'PENDING' },
            ],
          },
          {
            id: 'ar-2', municipalityId: 'm-001', subjectType: 'COMMITTEE', subjectId: 'c-1',
            subjectTitleBn: 'শিক্ষা কমিটিতে সদস্য যোগ', actionCode: 'ADD_MEMBER', status: 'PENDING',
            currentStepOrder: 1, currentStepName: 'সচিব', submittedAt: '2025-10-17T09:00:00Z',
            steps: [{ id: 's3', stepOrder: 1, nameBn: 'সচিব', status: 'PENDING' }],
          },
          {
            id: 'ar-3', municipalityId: 'm-001', subjectType: 'COMMITTEE', subjectId: 'c-4',
            subjectTitleBn: 'ক্রীড়া কমিটি বিলুপ্তি', actionCode: 'DISSOLVE', status: 'REJECTED',
            currentStepOrder: 1, currentStepName: 'সম্পন্ন', submittedAt: '2025-10-10T11:00:00Z',
            decidedAt: '2025-10-12T16:00:00Z',
          },
        ])
      )
    );
  }

  getById(id: string): Observable<ApprovalRequest> {
    return this.http.get<ApprovalRequest>(`${this.base}/workflow/requests/${id}`).pipe(
      catchError(() =>
        of<ApprovalRequest>({
          id, municipalityId: 'm-001', subjectType: 'COMMITTEE', subjectId: 'c-2',
          subjectTitleBn: 'স্বাস্থ্য কমিটি গঠন', actionCode: 'CREATE', status: 'IN_PROGRESS',
          currentStepOrder: 2, currentStepName: 'মেয়র', submittedAt: '2025-10-18T10:00:00Z',
          steps: [
            { id: 's1', stepOrder: 1, nameBn: 'সচিব', status: 'APPROVED', decidedAt: '2025-10-18T14:00:00Z', comment: 'ঠিক আছে' },
            { id: 's2', stepOrder: 2, nameBn: 'মেয়র', status: 'PENDING' },
          ],
        })
      )
    );
  }

  decide(requestId: string, payload: DecisionPayload): Observable<{ success: boolean }> {
    return this.http
      .post<{ success: boolean }>(`${this.base}/workflow/requests/${requestId}/decide`, payload)
      .pipe(catchError(() => of({ success: true })));
  }
}
