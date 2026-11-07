// আপনার environment.ts-এ শুধু নিচের তিনটি নতুন key যোগ করুন (বাকিগুলো যেমন আছে তেমন থাকবে)।
// ঠিক কোন path লিখবেন তা নির্ভর করে আপনার dev proxy (proxy.conf.json) বা gateway-র ওপর।
export const environment = {
  production: false,

  identityUrl: '/identity-service/api/v1',
  configUrl: '/config-service/api/v1',

  committeeUrl: '/api/v1',
  workflowUrl: '/api/v1',
  documentUrl: '/api/v1',
  auditUrl: '/api/v1',

  // ---- নতুন ----
  taxProposalUrl: '/tax-proposal-service/api/v1',
  objectionUrl: '/objection-service/api/v1',
  noticeUrl: '/notice-service/api/v1',
};
