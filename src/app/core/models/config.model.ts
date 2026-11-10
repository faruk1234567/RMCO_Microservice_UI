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
  municipalityId?: string;
  code?: string;
  levelNo?: number;
  nameBn: string;
  nameEn?: string;
  sortOrder?: number;
}


export interface ScopeNode {
  id: string;
  code?: string;
  levelId: string;
  nameBn: string;
  nameEn?: string;
  levelNo?: number;
  levelNameBn?: string;
  parentId?: string | null;
  children?: ScopeNode[];
  isActive?: boolean;
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
