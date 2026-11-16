export type ProposalStatus = 'DRAFT' | 'PRE_PUBLISHED' | 'UNDER_OBJECTION_REVIEW' | 'FINALIZED' | 'PENDING_GOVT_APPROVAL' | 'GOVT_APPROVED' | 'GAZETTED' | 'EFFECTIVE' | 'CANCELLED';

export interface TaxProposal {
  id: string;
  municipalityId: string;
  proposalNo: string;
  sourceType: 'COMMITTEE_PROPOSAL' | 'GOVT_DIRECTIVE';
  directiveId?: string | null;
  titleBn: string;
  titleEn?: string;
  purposeType?: string;
  purposeNote?: string;
  preparedByCommitteeId?: string;
  status: ProposalStatus;
  currentVersionId?: string;
  prePublishedOn?: string | null;
  objectionDeadline?: string | null;
  createdAt?: string;
  createdBy?: string;
}

export interface CreateTaxProposalRequest {
  proposalNo: string;
  sourceType: 'COMMITTEE_PROPOSAL' | 'GOVT_DIRECTIVE';
  directiveId?: string | null;
  proposalKindId?: string;
  titleBn: string;
  titleEn?: string;
  purposeType?: string;
  purposeNote?: string;
  preparedByCommitteeId?: string;
  coverageNote?: string;
  collectionArrangement?: string;
  extraCollectionCost?: number | null;
  exceptionalNote?: string;
  proposedEffectiveDate?: string | null;
}

export const PROPOSAL_STATUS_BN: Record<ProposalStatus, string> = {
  DRAFT: 'খসড়া',
  PRE_PUBLISHED: 'প্রাক-প্রকাশিত',
  UNDER_OBJECTION_REVIEW: 'আপত্তি পর্যালোচনায়',
  FINALIZED: 'চূড়ান্ত',
  PENDING_GOVT_APPROVAL: 'সরকারি অনুমোদনের অপেক্ষায়',
  GOVT_APPROVED: 'সরকার কর্তৃক অনুমোদিত',
  GAZETTED: 'গেজেটভুক্ত',
  EFFECTIVE: 'কার্যকর',
  CANCELLED: 'বাতিল',
};
