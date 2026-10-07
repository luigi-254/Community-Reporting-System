
export const memoryStore = {
  users: new Map(),
  refreshTokens: new Map(),
  verificationTokens: new Map(),
  passwordResetTokens: new Map(),
  reports: new Map(),
  categories: new Map(),
  subcategories: new Map(),
  counties: new Map(),
  subCounties: new Map(),
  wards: new Map(),
  departments: new Map(),
  assignments: new Map(),
  routingRules: new Map(),
  notifications: new Map(),
  escalations: new Map(),
  auditLogs: new Map(),
};

export default memoryStore;
