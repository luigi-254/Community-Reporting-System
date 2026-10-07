import { getPrismaClient, checkIsPrisma } from '../repositories/client.js';
import { memoryStore } from '../repositories/memoryStore.js';
import { userRepository } from '../repositories/userRepository.js';
import { tokenRepository } from '../repositories/tokenRepository.js';
import { reportRepository } from '../repositories/reportRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { subcategoryRepository } from '../repositories/subcategoryRepository.js';

export const db = {
  get isPrisma() {
    return checkIsPrisma();
  },

  get rawPrisma() {
    return getPrismaClient();
  },

  memoryStore,

  ...userRepository,
  ...tokenRepository,
  ...reportRepository,
  ...categoryRepository,
  ...subcategoryRepository,
};

export default db;
