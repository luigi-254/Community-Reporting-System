
export const memoryStore = {
  users: new Map(),
  refreshTokens: new Map(),
  verificationTokens: new Map(),
  passwordResetTokens: new Map(),
  reports: new Map(),
  categories: new Map(),
  subcategories: new Map(),
};

export default memoryStore;
