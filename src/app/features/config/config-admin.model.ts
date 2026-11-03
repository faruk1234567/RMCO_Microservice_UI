// =====================================================================
//  Config Service (Admin) – সব model এক জায়গায়।
//  ⚠ Backend-এর DTO (CreateCommitteeTypeRequest, UpdateVersionRequest,
//  CreateRouteRequest, CreateNodeRequest, CreateMasterItemRequest) আমি দেখিনি।
//  নিচের field-নাম অনুমান-ভিত্তিক। আপনার DTO-র সাথে না মিললে শুধু এই ফাইলটি ঠিক করুন।
// =====================================================================

export interface Designation {
  id: string;
  code: string;
  nameBn: string;
  nameEn?: string;
  isActive: boolean;
}

export type VersionStatus = 'DRAFT' | 'PUBLISHED' | 'RETIRED';

export interface VersionSummary {
  id: string;
  versionNo: number;
  status: VersionStatus;
}

/** GET /config/committee-types এর এক সারি */
export interface CommitteeTypeRow {
  id: string;
  code: string;
  nameBn: string;
  nameEn?: string;
  isActive: boolean;
  versions?: VersionSummary[];
  latestVersionId?: string;
  latestVersionNo?: number;
  latestStatus?: VersionStatus;
}

export type RuleKey =
  | 'FORMATION'
  | 'ADD_MEMBER'
  | 'GO_BACK_MEMBER'
  | 'REJECT_MEMBER'
  | 'RENEW_TERM'
  | 'DISSOLVE';

export interface RuleSetting {
  resolutionRequired: boolean; // প্রস্তাব বাধ্যতামূলক?
  approvalRequired: boolean;   // অনুমোদন লাগবে?
  approvalRouteId: string | null;
}

export interface VersionDesignation {
  designationId: string;
  minCount: number;
  maxCount: number | null;
  mandatory: boolean;
}

export type FieldTarget = 'COMMITTEE' | 'MEMBER' | 'RESOLUTION';
export type FieldKind = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN';

/** B-10: বাড়তি (dynamic) field */
export interface DynamicField {
  key: string;
  labelBn: string;
  labelEn?: string;
  target: FieldTarget;
  kind: FieldKind;
  required: boolean;
  options: string[];            // SELECT-এর জন্য
  showWhen: 'ALWAYS' | 'ON_CREATE' | 'ON_APPROVAL';
  validationRegex?: string;
}

export interface TypeVersion {
  id: string;
  typeId: string;
  versionNo: number;
  status: VersionStatus;
  nameBn: string;
  nameEn: string;
  maxMembers: number | null;
  termMonths: number | null;
  scopeLevelNos: number[];
  designations: VersionDesignation[];
  rules: Record<RuleKey, RuleSetting>;
  fields: DynamicField[];
}

export type ApproverType = 'ROLE' | 'DESIGNATION' | 'PARENT_COMMITTEE' | 'USER';

export interface ApprovalStep {
  levelNo: number;
  approverType: ApproverType;
  approverRef: string | null;
  slaHours: number | null;
  escalateToRef: string | null;
  fallbackRef: string | null;
}

export interface ApprovalRoute {
  id?: string;
  code: string;
  nameBn: string;
  nameEn?: string;
  isActive?: boolean;
  steps: ApprovalStep[];
}

export interface ScopeNode {
  id: string;
  nameBn: string;
  nameEn?: string;
  levelNo: number;
  levelNameBn?: string;
  parentId?: string | null;
  children?: ScopeNode[];
}

export interface ScopeLevel {
  levelNo: number;
  nameBn: string;
  nameEn?: string;
}

export interface MasterItem {
  id: string;
  group: string;
  code: string;
  nameBn: string;
  nameEn?: string;
  isActive?: boolean;
}

// ---- নিচের চারটির জন্য আপনার backend-এ এখনো API নেই (assumed endpoint) ----
export interface UiLabel { key: string; labelBn: string; labelEn?: string; createdAt?: string; }
export interface NotificationTemplate { code: string; channel: 'SMS' | 'EMAIL'; bodyBn: string; bodyEn?: string; createdAt?: string; }
export interface UploadPolicy {
  allowedFormats: string[];
  maxFileSizeMb: number;
  maxFilesPerResolution: number;
  version?: number;
  createdAt?: string;
}
export interface ConfigChangeLog {
  id: string;
  at: string;
  actorName: string;
  entity: string;
  action: string;
  before?: unknown;
  after?: unknown;
}
