export type CommitteeStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_APPROVAL'
  | 'ACTIVE'
  | 'REJECTED'
  | 'EXPIRED'
  | 'DISSOLVED';

export interface Committee {
  id: string;
  municipalityId: string;
  typeVersionId: string;
  typeCode?: string;
  typeNameBn?: string;
  typeNameEn?: string;
  nameBn: string;
  nameEn?: string;
  status: CommitteeStatus;
  termStart?: string;
  termEnd?: string;
  memberCount?: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface CommitteeMember {
  id: string;
  committeeId: string;
  userId: string;
  userNameBn?: string;
  userNameEn?: string;
  designationId: string;
  designationNameBn?: string;
  designationNameEn?: string;
  isPrimary: boolean;
  joinedAt: string;
  leftAt?: string;
  status: 'ACTIVE' | 'REMOVED';
}

export interface CommitteeDraftPayload {
  typeVersionId: string;
  nameBn: string;
  nameEn?: string;
  termStart?: string;
  termEnd?: string;
  description?: string;
  members?: {
    userId: string;
    designationId: string;
    isPrimary?: boolean;
  }[];
  documentIds?: string[];
  dynamicValues?: Record<string, unknown>;
}

export interface CommitteeType {
  id: string;
  code: string;
  nameBn: string;
  nameEn?: string;
  isActive: boolean;
  latestPublishedVersionId?: string;
  latestVersionNo?: number;
}

export interface CommitteeTypeVersion {
  id: string;
  committeeTypeId: string;
  versionNo: number;
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED';
  effectiveFrom?: string;
  designations?: TypeDesignation[];
  composition?: { minMembers: number; maxMembers: number };
}

export interface TypeDesignation {
  id: string;
  designationId: string;
  designationNameBn?: string;
  designationNameEn?: string;
  sortOrder: number;
  isMandatory: boolean;
  isSingleHolder: boolean;
  minCount: number;
  maxCount: number;
}
