export interface Designation {
  id: string;
  municipalityId: string;
  code: string;
  nameBn: string;
  nameEn?: string;
  isActive: boolean;
}

export interface ApprovalRoute {
  id: string;
  municipalityId: string;
  code: string;
  nameBn: string;
  nameEn?: string;
  isActive: boolean;
  steps?: ApprovalRouteStep[];
}

export interface ApprovalRouteStep {
  id: string;
  stepOrder: number;
  assigneeType: 'ROLE' | 'USER' | 'DESIGNATION';
  assigneeValue: string;
  slaHours: number;
  nameBn?: string;
  nameEn?: string;
}

export interface ScopeLevel {
  id: string;
  municipalityId: string;
  code: string;
  nameBn: string;
  nameEn?: string;
  sortOrder: number;
}

export interface ScopeNode {
  id: string;
  levelId: string;
  parentId?: string;
  code: string;
  nameBn: string;
  nameEn?: string;
  isActive: boolean;
  children?: ScopeNode[];
}

export interface DynamicField {
  id: string;
  municipalityId: string;
  entityType: 'COMMITTEE' | 'MEMBER' | 'RESOLUTION';
  code: string;
  labelBn: string;
  labelEn?: string;
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTISELECT' | 'BOOLEAN';
  isRequired: boolean;
  optionsJson?: { value: string; labelBn: string; labelEn?: string }[];
  sortOrder: number;
  isActive: boolean;
}
