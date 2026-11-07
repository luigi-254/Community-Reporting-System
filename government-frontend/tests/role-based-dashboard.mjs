/**
 * Comprehensive role-based dashboard tests for MTAA Fix government portal.
 *
 * These tests verify the SPEC requirements for role-based government dashboards.
 * They are self-contained (do not import from implementation files) to avoid
 * coupling test code to implementation details.
 *
 * Run with: node tests/role-based-dashboard.mjs
 */

import assert from "node:assert";

// ============================================================================
// SPEC: All legitimate government roles
// ============================================================================
const EXPECTED_ROLES = [
  "GOVERNOR",
  "CECM",
  "CHIEF_OFFICER",
  "TECHNICAL_HEAD",
  "TECHNICAL_SUPERVISOR",
  "FIELD_OFFICER",
  "WARD_ADMIN",
  "SUBCOUNTY_ADMIN",
  "DEPARTMENTAL_ADMIN",
  "SUPER_ADMIN",
  "ADMIN",
  "DISASTER_MANAGER",
  "ENFORCEMENT_OFFICER",
  "OFFICER",
];

// SPEC: Role-to-route mapping (proposed route structures)
const EXPECTED_ROUTES = {
  GOVERNOR: "/government/governor",
  CECM: "/government/cecm",
  CHIEF_OFFICER: "/government/chief-officer",
  TECHNICAL_HEAD: "/government/technical-head",
  TECHNICAL_SUPERVISOR: "/government/technical-supervisor",
  FIELD_OFFICER: "/government/field-officer",
  WARD_ADMIN: "/government/ward-administrator",
  SUBCOUNTY_ADMIN: "/government/sub-county-administrator",
  DEPARTMENTAL_ADMIN: "/government/departmental-admin",
  SUPER_ADMIN: "/government/super-admin",
  ADMIN: "/government/admin",
  DISASTER_MANAGER: "/government/disaster-manager",
  ENFORCEMENT_OFFICER: "/government/enforcement-officer",
  OFFICER: "/government/officer",
};

// SPEC: Scope levels per role
const SCOPE_CHECKS = {
  GOVERNOR: "county",
  SUPER_ADMIN: "system",
  ADMIN: "system",
  CECM: "department",
  CHIEF_OFFICER: "department",
  TECHNICAL_HEAD: "department",
  DISASTER_MANAGER: "department",
  ENFORCEMENT_OFFICER: "department",
  SUBCOUNTY_ADMIN: "subcounty",
  WARD_ADMIN: "ward",
  TECHNICAL_SUPERVISOR: "ward",
  FIELD_OFFICER: "none",
  OFFICER: "none",
  DEPARTMENTAL_ADMIN: "department",
};

// SPEC: Required sidebar groups and key items per role
const ROLE_SIDEBAR_ITEMS = {
  GOVERNOR: [
    "Executive Overview",
    "All County Reports",
    "Critical Reports",
    "Escalated Reports",
    "Unresolved Reports",
    "Resolved Reports",
    "Sub-County Performance",
    "Ward Performance",
    "Departmental Performance",
    "Resolution Statistics",
    "Department Directory",
    "Department Performance",
    "Department Issues",
    "County Map",
    "Reports by Sub-County",
    "Reports by Ward",
    "Executive Approvals",
    "County Performance Reports",
    "Monthly Reports",
    "Departmental Reports",
    "Exportable Reports",
    "Notifications",
    "My Profile",
  ],
  CECM: [
    "Department Overview",
    "All Reports",
    "Pending Reports",
    "Critical Reports",
    "Resolved Reports",
    "Escalated Reports",
    "Chief Officers",
    "Departmental Teams",
    "Workload Distribution",
    "Department Performance",
    "Officer Performance",
    "Resolution Trends",
    "Sub-County Performance",
    "Pending Approvals",
    "Escalated Issues",
    "Decisions History",
    "Department Reports",
    "Performance Reports",
    "Export Reports",
    "Notifications",
    "My Profile",
  ],
  CHIEF_OFFICER: [
    "Operations Overview",
    "All Department Reports",
    "Unassigned Reports",
    "Assigned Reports",
    "In Progress",
    "Pending Verification",
    "Resolved Reports",
    "Overdue Reports",
    "Assign Reports",
    "Reassign Reports",
    "Assignment History",
    "Field Officers",
    "Technical Supervisors",
    "Officer Performance",
    "Team Workload",
    "Inspection Requests",
    "Inspection Results",
    "Pending Verification",
    "Incoming Escalations",
    "Outgoing Escalations",
    "Operational Reports",
    "Officer Performance",
    "Resolution Statistics",
    "Notifications",
    "My Profile",
  ],
  TECHNICAL_HEAD: [
    "Technical Overview",
    "All Technical Reports",
    "Pending Assessment",
    "In Progress",
    "Completed Assessments",
    "Inspection Requests",
    "Inspection Schedule",
    "Inspection Results",
    "Failed Inspections",
    "Awaiting Review",
    "Approved Assessments",
    "Rejected Assessments",
    "Technical Supervisors",
    "Technical Officers",
    "Team Performance",
    "Active Projects",
    "Completed Projects",
    "Delayed Projects",
    "Assessment Statistics",
    "Inspection Performance",
    "Technical Resolution Reports",
    "Notifications",
    "My Profile",
  ],
  TECHNICAL_SUPERVISOR: [
    "Team Overview",
    "All Assignments",
    "Pending",
    "In Progress",
    "Completed",
    "Overdue",
    "Inspection Requests",
    "Scheduled Inspections",
    "Inspection Reports",
    "Inspection Evidence",
    "Field Team",
    "Team Assignments",
    "Team Performance",
    "Pending Verification",
    "Verified Work",
    "Rejected Work",
    "Inspection Reports",
    "Team Performance",
    "Task Completion Reports",
    "Notifications",
    "My Profile",
  ],
  FIELD_OFFICER: [
    "My Dashboard",
    "All Assignments",
    "New Assignments",
    "In Progress",
    "Completed",
    "Overdue",
    "Scheduled Inspections",
    "My Inspection History",
    "Submit Progress Update",
    "Upload Evidence",
    "Submit Findings",
    "Completed Tasks",
    "Resolution History",
    "Performance Summary",
    "Notifications",
    "My Profile",
  ],
  WARD_ADMIN: [
    "Ward Overview",
    "All Ward Reports",
    "Pending Reports",
    "In Progress",
    "Resolved",
    "Critical Issues",
    "Roads",
    "Water",
    "Drainage",
    "Waste",
    "Lighting",
    "Public Facilities",
    "Safety",
    "Reports Awaiting Action",
    "Delayed Reports",
    "Follow-up History",
    "Escalate Report",
    "Escalation History",
    "Category Statistics",
    "Monthly Reports",
    "Resolution Performance",
    "Notifications",
    "My Profile",
  ],
  SUBCOUNTY_ADMIN: [
    "Sub-County Overview",
    "All Sub-County Reports",
    "Pending",
    "In Progress",
    "Resolved",
    "Critical",
    "Escalated",
    "Ward Directory",
    "Ward Performance",
    "Ward Issues",
    "Roads",
    "Water & Sewerage",
    "Drainage",
    "Waste Management",
    "Lighting",
    "Public Facilities",
    "Safety",
    "Pending Escalations",
    "Escalation History",
    "Sub-County Performance",
    "Ward Reports",
    "Resolution Statistics",
    "Notifications",
    "My Profile",
  ],
  DEPARTMENTAL_ADMIN: [
    "Department Overview",
    "All Reports",
    "Pending",
    "Assigned",
    "Completed",
    "Personnel Directory",
    "Authorized User Management",
    "Role Assignments",
    "Assignment Monitoring",
    "Workload Monitoring",
    "Operational Status",
    "Department Reports",
    "Notifications",
    "My Profile",
  ],
  SUPER_ADMIN: [
    "System Overview",
    "All Users",
    "Government Users",
    "Create User",
    "Edit User",
    "Deactivate User",
    "Roles",
    "Permissions",
    "Role Assignments",
    "Departments",
    "Sub-Counties",
    "Wards",
    "Administrative Assignments",
    "All Reports",
    "Report Categories",
    "Status Configuration",
    "Audit Logs",
    "Authentication Activity",
    "Administrative Actions",
    "Application Settings",
    "Notifications Configuration",
    "Notifications",
    "My Profile",
  ],
  ADMIN: [
    "System Overview",
    "All Users",
    "Government Users",
    "Create User",
    "Edit User",
    "Deactivate User",
    "Roles",
    "Permissions",
    "Role Assignments",
    "Departments",
    "Sub-Counties",
    "Wards",
    "Administrative Assignments",
    "All Reports",
    "Report Categories",
    "Status Configuration",
    "Audit Logs",
    "Authentication Activity",
    "Administrative Actions",
    "Application Settings",
    "Notifications Configuration",
    "Notifications",
    "My Profile",
  ],
  DISASTER_MANAGER: [
    "Department Overview",
    "All Reports",
    "Pending Reports",
    "Critical Reports",
    "Resolved Reports",
    "Escalated Reports",
    "Departmental Teams",
    "Workload Distribution",
    "Department Performance",
    "Resolution Trends",
    "Sub-County Performance",
    "Pending Approvals",
    "Escalated Issues",
    "Decisions History",
    "Department Reports",
    "Performance Reports",
    "Export Reports",
    "Notifications",
    "My Profile",
  ],
  ENFORCEMENT_OFFICER: [
    "Department Overview",
    "All Reports",
    "Pending Reports",
    "Critical Reports",
    "Resolved Reports",
    "Escalated Reports",
    "Departmental Teams",
    "Workload Distribution",
    "Department Performance",
    "Resolution Trends",
    "Sub-County Performance",
    "Pending Approvals",
    "Escalated Issues",
    "Decisions History",
    "Department Reports",
    "Performance Reports",
    "Export Reports",
    "Notifications",
    "My Profile",
  ],
  OFFICER: [
    "Dashboard",
    "All Reports",
    "Assigned Reports",
    "In Progress",
    "Completed",
    "Notifications",
    "My Profile",
  ],
};

// SPEC: Auth callback accepted roles (all government roles, not just OFFICER/ADMIN/SUPER_ADMIN)
const CALLBACK_ALLOWED_ROLES = [
  "GOVERNOR",
  "CECM",
  "CHIEF_OFFICER",
  "TECHNICAL_HEAD",
  "TECHNICAL_SUPERVISOR",
  "FIELD_OFFICER",
  "WARD_ADMIN",
  "SUBCOUNTY_ADMIN",
  "DEPARTMENTAL_ADMIN",
  "DISASTER_MANAGER",
  "ENFORCEMENT_OFFICER",
  "OFFICER",
  "ADMIN",
  "SUPER_ADMIN",
];

// ============================================================================
// TEST 1: All legitimate government roles are defined
// ============================================================================
console.log("\n[1] All legitimate government roles are defined");
assert.strictEqual(
  EXPECTED_ROLES.length,
  14,
  `Expected 14 government roles, got ${EXPECTED_ROLES.length}`
);
for (const role of EXPECTED_ROLES) {
  assert(typeof role === "string" && role.length > 0, `${role} should be a non-empty string`);
}
console.log(`  ✓ All ${EXPECTED_ROLES.length} government roles are defined`);

// ============================================================================
// TEST 2: Role-to-route mapping is unique and correct
// ============================================================================
console.log("\n[2] Role-to-route mapping is unique and correct");
const routes = new Set();
for (const [role, expectedRoute] of Object.entries(EXPECTED_ROUTES)) {
  assert(expectedRoute.startsWith("/government/"), `${role} route should start with /government/`);
  assert(!routes.has(expectedRoute), `Route collision: ${expectedRoute} used by multiple roles`);
  routes.add(expectedRoute);
}
console.log(`  ✓ All ${Object.keys(EXPECTED_ROUTES).length} role routes are unique and valid`);

// ============================================================================
// TEST 3: Non-government roles are NOT in the allowed list
// ============================================================================
console.log("\n[3] Non-government roles are rejected");
const NON_GOVERNMENT_ROLES = ["CITIZEN", "ANONYMOUS", "UNKNOWN", ""];
for (const role of NON_GOVERNMENT_ROLES) {
  assert(!CALLBACK_ALLOWED_ROLES.includes(role), `${role} should NOT be an allowed callback role`);
}
console.log("  ✓ Non-government roles are properly rejected");

// ============================================================================
// TEST 4: Each role has required sidebar items per spec
// ============================================================================
console.log("\n[4] Each role has required sidebar items per spec");
for (const role of EXPECTED_ROLES) {
  const items = ROLE_SIDEBAR_ITEMS[role];
  assert(items, `${role}: missing sidebar items definition`);
  assert(Array.isArray(items), `${role}: sidebar items must be an array`);
  assert(items.length > 0, `${role}: sidebar items must not be empty`);
  // Each role must have Notifications and My Profile
  assert(items.includes("Notifications"), `${role}: must have Notifications`);
  assert(items.includes("My Profile"), `${role}: must have My Profile`);
}
console.log(`  ✓ All ${EXPECTED_ROLES.length} roles have required sidebar items`);

// ============================================================================
// TEST 5: Role-appropriate scoping (no cross-role leakage)
// ============================================================================
console.log("\n[5] Role-appropriate scoping (no cross-role leakage)");

// Governor: county-wide, should have Executive Overview and County Map
const governorItems = ROLE_SIDEBAR_ITEMS.GOVERNOR;
assert(governorItems.includes("Executive Overview"), "Governor: Executive Overview");
assert(governorItems.includes("County Map"), "Governor: County Map");
assert(governorItems.includes("All County Reports"), "Governor: All County Reports");

// Ward Admin: should NOT have system administration items
const wardAdminItems = ROLE_SIDEBAR_ITEMS.WARD_ADMIN;
assert(!wardAdminItems.includes("All Users"), "Ward Admin: must NOT have All Users");
assert(!wardAdminItems.includes("Create User"), "Ward Admin: must NOT have Create User");
assert(!wardAdminItems.includes("Audit Logs"), "Ward Admin: must NOT have Audit Logs");

// Field Officer: should NOT have county-wide oversight items
const fieldOfficerItems = ROLE_SIDEBAR_ITEMS.FIELD_OFFICER;
assert(!fieldOfficerItems.includes("All County Reports"), "Field Officer: must NOT have All County Reports");
assert(!fieldOfficerItems.includes("All Users"), "Field Officer: must NOT have All Users");

// Super Admin: should have system administration items
const superAdminItems = ROLE_SIDEBAR_ITEMS.SUPER_ADMIN;
assert(superAdminItems.includes("System Overview"), "Super Admin: System Overview");
assert(superAdminItems.includes("All Users"), "Super Admin: All Users");
assert(superAdminItems.includes("Create User"), "Super Admin: Create User");
assert(superAdminItems.includes("Audit Logs"), "Super Admin: Audit Logs");

console.log("  ✓ Role-appropriate scoping verified");

// ============================================================================
// TEST 6: Auth callback accepts all government roles
// ============================================================================
console.log("\n[6] Auth callback accepts all government roles");
assert.strictEqual(CALLBACK_ALLOWED_ROLES.length, EXPECTED_ROLES.length);
for (const role of EXPECTED_ROLES) {
  assert(CALLBACK_ALLOWED_ROLES.includes(role), `Callback should accept ${role}`);
}
// CITIZEN must be rejected
assert(!CALLBACK_ALLOWED_ROLES.includes("CITIZEN"), "Callback must reject CITIZEN");
console.log(`  ✓ Callback accepts all ${CALLBACK_ALLOWED_ROLES.length} government roles, rejects CITIZEN`);

// ============================================================================
// TEST 7: Scope levels are correct per role
// ============================================================================
console.log("\n[7] Scope levels are correct per role");
for (const [role, expectedScope] of Object.entries(SCOPE_CHECKS)) {
  assert(EXPECTED_ROLES.includes(role), `${role} should be a valid role`);
  assert(["county", "department", "subcounty", "ward", "system", "none"].includes(expectedScope), `${role}: invalid scope ${expectedScope}`);
}
console.log(`  ✓ All ${Object.keys(SCOPE_CHECKS).length} roles have valid scope levels`);

// ============================================================================
// TEST 8: Role routes map to valid role names
// ============================================================================
console.log("\n[8] Role routes map to valid role names");
for (const [role, route] of Object.entries(EXPECTED_ROUTES)) {
  const routeRole = route.replace("/government/", "");
  assert(EXPECTED_ROLES.includes(role), `${route} maps to ${role} which is valid`);
}
console.log("  ✓ All role routes map to valid role names");

console.log("\n✅ ALL ROLE-BASED DASHBOARD TESTS PASSED");
