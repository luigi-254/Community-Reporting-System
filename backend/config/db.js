import { getPrismaClient, checkIsPrisma } from '../repositories/client.js';
import { memoryStore } from '../repositories/memoryStore.js';
import { userRepository } from '../repositories/userRepository.js';
import { tokenRepository } from '../repositories/tokenRepository.js';
import { reportRepository } from '../repositories/reportRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { subcategoryRepository } from '../repositories/subcategoryRepository.js';
import locationRepository from '../repositories/locationRepository.js';
import departmentRepository from '../repositories/departmentRepository.js';
import officerRepository from '../repositories/officerRepository.js';
import assignmentRepository from '../repositories/assignmentRepository.js';
import routingRuleRepository from '../repositories/routingRuleRepository.js';
import notificationRepository from '../repositories/notificationRepository.js';
import escalationRepository from '../repositories/escalationRepository.js';
import auditLogRepository from '../repositories/auditLogRepository.js';

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
  ...locationRepository,
  ...departmentRepository,
  ...officerRepository,
  ...assignmentRepository,
  ...routingRuleRepository,
  ...notificationRepository,
  ...escalationRepository,
  ...auditLogRepository,
};

export default db;
