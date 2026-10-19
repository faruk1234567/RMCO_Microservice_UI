export type ApprovalStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface ApprovalRequest {
  id: string;
  municipalityId: string;
  subjectType: string;
  subjectId: string;
  subjectTitleBn?: string;
  subjectTitleEn?: string;
  actionCode: string;
  status: ApprovalStatus;
  currentStepOrder?: number;
  currentStepName?: string;
  submittedAt: string;
  submittedBy?: string;
  decidedAt?: string;
  steps?: ApprovalStep[];
}

export interface ApprovalStep {
  id: string;
  stepOrder: number;
  nameBn?: string;
  nameEn?: string;
  assigneeUserId?: string;
  assigneeRole?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED' | 'DELEGATED';
  decidedAt?: string;
  decidedBy?: string;
  comment?: string;
  slaHours?: number;
}

export interface DecisionPayload {
  decision: 'APPROVE' | 'REJECT' | 'DELEGATE';
  comment?: string;
  delegateToUserId?: string;
}
