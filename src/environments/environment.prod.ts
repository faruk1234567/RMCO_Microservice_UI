export const environment = {
  production: true,

  identityUrl: '/identity-service/api/v1',
  configUrl: '/config-service/api/v1',

  committeeUrl: '/committee-service',
  workflowUrl: '/api/v1',
  documentUrl: '/document-service',
  auditUrl: '/api/v1',

  // ---- নতুন - Prod এও একই রাখলাম, নাইলে Prod এ গিয়ে আবার আটকাবে ----
  taxProposalUrl: '/tax-proposal-service/api/v1',
  objectionUrl: '/objection-service/api/v1',
  noticeUrl: '/notice-service/api/v1',
};