/**
 * Role-based configuration for the MTAA Fix government portal.
 *
 * Defines, for every legitimate government role:
 *   - route: the URL path segment under /government (e.g. "governor")
 *   - label: human-readable role title
 *   - scope: jurisdiction level (county, department, subcounty, ward, system, none)
 *   - sidebar: navigation groups with items specific to the role
 *   - welcome: landing page title and subtitle
 *   - defaultPage: the sidebar item that opens on landing
 *
 * This is the single source of truth for role-specific experiences.
 * Backend APIs already scope data by jurisdiction via scopeDashboardQuery.
 */

const DEPARTMENT_LABELS = {
  INFRA: "Infrastructure, Roads & Public Works",
  WATER: "Water, Environment, Natural Resources, Energy & Climate Change",
  PUBLIC_SERVICE: "Public Service, County Administration",
  TRADE: "Trade, Tourism, Industry & Marketing",
  YOUTH: "Youth, Sports, Culture, Arts & Social Services",
  DISASTER: "Disaster Management",
  ENFORCEMENT: "Enforcement",
};

// Icons used by sidebar items (lucide-react icon names).
const ICON_MAP: Record<string, string> = {
  Dashboard: "LayoutDashboard",
  Reports: "FileText",
  Users: "Users",
  Statistics: "BarChart3",
  Settings: "Settings",
  "Audit Logs": "FileText",
  "All County Reports": "FileText",
  "Critical Reports": "AlertTriangle",
  "Escalated Reports": "Share2",
  "Unresolved Reports": "Clock",
  "Resolved Reports": "CheckCircle",
  "Sub-County Performance": "Map",
  "Ward Performance": "MapPin",
  "Departmental Performance": "Building2",
  "Resolution Statistics": "PieChart",
  "Department Directory": "Building",
  "Department Performance": "Building2",
  "Department Issues": "FileText",
  "County Map": "Map",
  "Reports by Sub-County": "MapPin",
  "Reports by Ward": "MapPin",
  "Executive Approvals": "CheckCircle2",
  "County Performance Reports": "FileText",
  "Monthly Reports": "Calendar",
  "Departmental Reports": "FileText",
  "Exportable Reports": "Download",
  Notifications: "Bell",
  "My Profile": "User",
  "Department Overview": "LayoutDashboard",
  "All Reports": "FileText",
  "Pending Reports": "Clock",
  "Department Operations": "Building2",
  "Chief Officers": "Users",
  "Departmental Teams": "Users",
  "Workload Distribution": "PieChart",
  "Officer Performance": "User",
  "Resolution Trends": "TrendingUp",
  "Pending Approvals": "Clock",
  "Escalated Issues": "Share2",
  "Decisions History": "History",
  "Department Reports": "FileText",
  "Performance Reports": "BarChart3",
  "Export Reports": "Download",
  "Operations Overview": "LayoutDashboard",
  "All Department Reports": "FileText",
  "Unassigned Reports": "UserPlus",
  "Assigned Reports": "UserCheck",
  "In Progress": "Loader",
  "Pending Verification": "Clock",
  "Overdue Reports": "AlertCircle",
  "Assign Reports": "UserPlus",
  "Reassign Reports": "UserMinus",
  "Assignment History": "History",
  "Field Officers": "User",
  "Technical Supervisors": "User",
  "Team Workload": "PieChart",
  "Inspection Requests": "Search",
  "Inspection Schedule": "Calendar",
  "Inspection Results": "FileText",
  "Incoming Escalations": "Share2",
  "Outgoing Escalations": "Share2",
  "Operational Reports": "FileText",
  "Technical Overview": "LayoutDashboard",
  "All Technical Reports": "FileText",
  "Pending Assessment": "Clock",
  "Completed Assessments": "CheckCircle",
  "Technical Reviews": "FileText",
  "Awaiting Review": "Clock",
  "Approved Assessments": "CheckCircle",
  "Rejected Assessments": "AlertTriangle",
  "Technical Officers": "User",
  "Team Performance": "BarChart3",
  "Active Projects": "Activity",
  "Completed Projects": "CheckCircle",
  "Delayed Projects": "AlertCircle",
  "Assessment Statistics": "PieChart",
  "Inspection Performance": "BarChart3",
  "Technical Resolution Reports": "FileText",
  "Team Overview": "LayoutDashboard",
  "My Assignments": "FileText",
  "New Assignments": "UserPlus",
  Completed: "CheckCircle",
  "Field Inspections": "Search",
  "Scheduled Inspections": "Calendar",
  "My Inspection History": "History",
  "Report Updates": "FileText",
  "Submit Progress Update": "Plus",
  "Upload Evidence": "Upload",
  "Submit Findings": "FileText",
  "My Performance": "BarChart3",
  "Resolution History": "History",
  "Performance Summary": "PieChart",
  "Sub-County Overview": "LayoutDashboard",
  "Ward Management": "Map",
  "Ward Directory": "Map",
  "Service Delivery": "Building2",
  Roads: "Road",
  "Water & Sewerage": "Droplets",
  Drainage: "Waves",
  "Waste Management": "Trash2",
  Lighting: "Bulb",
  "Public Facilities": "Building",
  Safety: "Shield",
  "Pending Escalations": "Clock",
  "Escalation History": "History",
  "Ward Reports": "FileText",
  "Ward Overview": "LayoutDashboard",
  "Community Reports": "FileText",
  "Critical Issues": "AlertTriangle",
  "Follow-ups": "Clock",
  "Reports Awaiting Action": "Clock",
  "Delayed Reports": "AlertCircle",
  "Follow-up History": "History",
  "Escalate Report": "Share2",
  "Category Statistics": "PieChart",
  "Department Administration": "LayoutDashboard",
  "Reports Management": "FileText",
  "Department Personnel": "Users",
  "Personnel Directory": "Users",
  "Authorized User Management": "UserPlus",
  "Role Assignments": "UserCheck",
  "Assignment Monitoring": "UserCheck",
  "Workload Monitoring": "PieChart",
  "Operational Status": "Activity",
  "System Overview": "LayoutDashboard",
  "User Management": "Users",
  "Government Users": "User",
  "Create User": "UserPlus",
  "Edit User": "User",
  "Deactivate User": "UserMinus",
  "Role & Permissions": "Shield",
  Roles: "Shield",
  Permissions: "Key",
  "Government Structure": "Building",
  Departments: "Building",
  "Sub-Counties": "Map",
  Wards: "MapPin",
  "Administrative Assignments": "UserPlus",
  "Reports Administration": "FileText",
  "Report Categories": "FileText",
  "Status Configuration": "Settings",
  "System Audit": "Activity",
  "Authentication Activity": "LogIn",
  "Administrative Actions": "List",
  "System Configuration": "Settings",
  "Application Settings": "Settings",
  "Notifications Configuration": "Bell",
  "GIS Map": "Map",
  Inspections: "Search",
  "Work Updates": "FileText",
  Resolutions: "FileText",
};

export const ROLE_CONFIGS = {
  GOVERNOR: {
    route: "governor",
    label: "Governor",
    scope: "county",
    defaultPage: "Executive Overview",
    welcome: {
      title: "County Executive Oversight — Kisii County",
      subtitle: "County-wide service delivery performance, escalated cases, and department accountability.",
    },
    sidebar: [
      { group: "Executive Overview", items: ["Executive Overview"] },
      {
        group: "Reports Oversight",
        items: [
          "All County Reports",
          "Critical Reports",
          "Escalated Reports",
          "Unresolved Reports",
          "Resolved Reports",
        ],
      },
      {
        group: "County Performance",
        items: [
          "Sub-County Performance",
          "Ward Performance",
          "Departmental Performance",
          "Resolution Statistics",
        ],
      },
      { group: "Departments", items: ["Department Directory", "Department Issues"] },
      {
        group: "Geographic Overview",
        items: ["County Map", "Reports by Sub-County", "Reports by Ward"],
      },
      { group: "Executive Approvals", items: ["Executive Approvals"] },
      {
        group: "Analytics & Reports",
        items: ["County Performance Reports"],
      },
      { group: "Notifications", items: ["Notifications"] },
      { group: "My Profile", items: ["My Profile"] },
    ],
  },
  CECM: {
    route: "cecm",
    label: "CECM",
    scope: "department",
    defaultPage: "Department Overview",
    welcome: {
      title: "Department Oversight",
      subtitle: "Department-level reports, SLA compliance, and executive accountability for your portfolio.",
    },
    sidebar: [
      { group: "Department Overview", items: ["Department Overview"] },
      {
        group: "Department Reports",
        items: ["All Reports", "Pending Reports", "Critical Reports", "Resolved Reports", "Escalated Reports"],
      },
      {
        group: "Department Operations",
        items: ["Chief Officers", "Departmental Teams", "Workload Distribution"],
      },
      {
        group: "Performance",
        items: ["Department Performance", "Officer Performance", "Resolution Trends"],
      },
      {
        group: "Approvals & Escalations",
        items: ["Pending Approvals", "Escalated Issues", "Decisions History"],
      },
      {
        group: "Analytics & Reports",
        items: ["Department Reports", "Performance Reports", "Export Reports"],
      },
      { group: "Notifications", items: ["Notifications"] },
      { group: "My Profile", items: ["My Profile"] },
    ],
  },
  CHIEF_OFFICER: {
    route: "chief-officer",
    label: "Chief Officer",
    scope: "department",
    defaultPage: "Operations Overview",
    welcome: {
      title: "Department Operations",
      subtitle: "Department report queues, officer assignments, overdue cases, and operational oversight.",
    },
    sidebar: [
      { group: "Operations Overview", items: ["Operations Overview"] },
      {
        group: "Reports Management",
        items: [
          "All Department Reports",
          "Unassigned Reports",
          "Assigned Reports",
          "In Progress",
          "Resolved Reports",
          "Overdue Reports",
        ],
      },
      {
        group: "Assignments",
        items: ["Assign Reports", "Reassign Reports", "Assignment History"],
      },
      {
        group: "Officers & Teams",
        items: ["Field Officers", "Technical Supervisors", "Officer Performance", "Team Workload"],
      },
      { group: "Inspections", items: ["Inspection Requests", "Inspection Results", "Pending Verification"] },
      { group: "Escalations", items: ["Incoming Escalations", "Outgoing Escalations"] },
      {
        group: "Analytics & Reports",
        items: ["Operational Reports", "Resolution Statistics"],
      },
      { group: "Notifications", items: ["Notifications"] },
      { group: "My Profile", items: ["My Profile"] },
    ],
  },
  TECHNICAL_HEAD: {
    route: "technical-head",
    label: "Technical Head",
    scope: "department",
    defaultPage: "Technical Overview",
    welcome: {
      title: "Technical Operations",
      subtitle: "Technical assignments, quality assurance, resolution progress, and departmental technical oversight.",
    },
    sidebar: [
      { group: "Technical Overview", items: ["Technical Overview"] },
      {
        group: "Technical Reports",
        items: ["All Technical Reports", "Pending Assessment", "In Progress", "Completed Assessments"],
      },
      { group: "Inspections", items: ["Inspection Requests", "Inspection Schedule", "Inspection Results", "Failed Inspections"] },
      { group: "Technical Reviews", items: ["Awaiting Review", "Approved Assessments", "Rejected Assessments"] },
      { group: "Technical Teams", items: ["Technical Supervisors", "Technical Officers", "Team Performance"] },
      { group: "Projects & Resolution", items: ["Active Projects", "Completed Projects", "Delayed Projects"] },
      {
        group: "Technical Analytics",
        items: ["Assessment Statistics", "Inspection Performance", "Technical Resolution Reports"],
      },
      { group: "Notifications", items: ["Notifications"] },
      { group: "My Profile", items: ["My Profile"] },
    ],
  },
  TECHNICAL_SUPERVISOR: {
    route: "technical-supervisor",
    label: "Technical Supervisor",
    scope: "ward",
    defaultPage: "Team Overview",
    welcome: {
      title: "Field Team Supervision",
      subtitle: "Supervise field officers, review inspections, approve work updates, and manage technical assignments.",
    },
    sidebar: [
      { group: "Team Overview", items: ["Team Overview"] },
      {
        group: "My Assignments",
        items: ["All Assignments", "Pending", "In Progress", "Completed", "Overdue"],
      },
      { group: "Field Inspections", items: ["Inspection Requests", "Scheduled Inspections", "Inspection Reports", "Inspection Evidence"] },
      { group: "Team Management", items: ["Field Team", "Team Assignments", "Team Performance"] },
      { group: "Technical Verification", items: ["Pending Verification", "Verified Work", "Rejected Work"] },
      { group: "Reports", items: ["Task Completion Reports"] },
      { group: "Notifications", items: ["Notifications"] },
      { group: "My Profile", items: ["My Profile"] },
    ],
  },
  FIELD_OFFICER: {
    route: "field-officer",
    label: "Field Officer",
    scope: "none",
    defaultPage: "My Dashboard",
    welcome: {
      title: "Field Operations",
      subtitle: "Your assigned cases, inspections, evidence capture, work updates, and resolution submissions.",
    },
    sidebar: [
      { group: "My Dashboard", items: ["My Dashboard"] },
      {
        group: "My Assignments",
        items: ["All Assignments", "New Assignments", "In Progress", "Completed", "Overdue"],
      },
      { group: "Field Inspections", items: ["Scheduled Inspections", "My Inspection History"] },
      { group: "Report Updates", items: ["Submit Progress Update", "Upload Evidence", "Submit Findings"] },
      { group: "My Performance", items: ["Resolution History", "Performance Summary"] },
      { group: "Notifications", items: ["Notifications"] },
      { group: "My Profile", items: ["My Profile"] },
    ],
  },
  SUBCOUNTY_ADMIN: {
    route: "subcounty-admin",
    label: "Sub-County Administrator",
    scope: "subcounty",
    defaultPage: "Sub-County Overview",
    welcome: {
      title: "Sub-County Administration",
      subtitle: "Reports and escalations across wards in your sub-county, local follow-up, and administrative oversight.",
    },
    sidebar: [
      { group: "Sub-County Overview", items: ["Sub-County Overview"] },
      {
        group: "Reports",
        items: [
          "All Sub-County Reports",
          "Pending",
          "In Progress",
          "Resolved",
          "Critical",
          "Escalated",
        ],
      },
      { group: "Ward Management", items: ["Ward Directory", "Ward Performance", "Ward Issues"] },
      { group: "Service Delivery", items: ["Roads", "Water & Sewerage", "Drainage", "Waste Management", "Lighting", "Public Facilities", "Safety"] },
      { group: "Escalations", items: ["Pending Escalations", "Escalation History"] },
      { group: "Analytics & Reports", items: ["Sub-County Performance", "Ward Reports", "Resolution Statistics"] },
      { group: "Notifications", items: ["Notifications"] },
      { group: "My Profile", items: ["My Profile"] },
    ],
  },
  WARD_ADMIN: {
    route: "ward-admin",
    label: "Ward Administrator",
    scope: "ward",
    defaultPage: "Ward Overview",
    welcome: {
      title: "Ward Administration",
      subtitle: "Reports and follow-ups within your ward jurisdiction, local service delivery monitoring, and escalations.",
    },
    sidebar: [
      { group: "Ward Overview", items: ["Ward Overview"] },
      {
        group: "Community Reports",
        items: ["All Ward Reports", "Pending Reports", "In Progress", "Resolved", "Critical Issues"],
      },
      { group: "Service Delivery", items: ["Roads", "Water", "Drainage", "Waste", "Lighting", "Public Facilities", "Safety"] },
      { group: "Follow-ups", items: ["Reports Awaiting Action", "Delayed Reports", "Follow-up History"] },
      { group: "Escalations", items: ["Escalate Report", "Escalation History"] },
      { group: "Ward Analytics", items: ["Category Statistics", "Monthly Reports"] },
      { group: "Notifications", items: ["Notifications"] },
      { group: "My Profile", items: ["My Profile"] },
    ],
  },
  DEPARTMENTAL_ADMIN: {
    route: "departmental-admin",
    label: "Departmental Administrator",
    scope: "department",
    defaultPage: "Department Overview",
    welcome: {
      title: "Department Administration",
      subtitle: "Department records, officer management, categories, and administrative oversight.",
    },
    sidebar: [
      { group: "Department Overview", items: ["Department Overview"] },
      { group: "Reports Management", items: ["All Reports", "Pending", "Assigned", "Completed"] },
      {
        group: "Department Personnel",
        items: ["Personnel Directory", "Authorized User Management", "Role Assignments"],
      },
      {
        group: "Department Operations",
        items: ["Assignment Monitoring", "Workload Monitoring", "Operational Status"],
      },
      { group: "Analytics & Reports", items: ["Department Reports"] },
      { group: "Notifications", items: ["Notifications"] },
      { group: "My Profile", items: ["My Profile"] },
    ],
  },
  SUPER_ADMIN: {
    route: "super-admin",
    label: "Super Admin",
    scope: "system",
    defaultPage: "System Overview",
    welcome: {
      title: "System Administration",
      subtitle: "Full platform oversight, system administration, and global configuration.",
    },
    sidebar: [
      { group: "System Overview", items: ["System Overview"] },
      { group: "User Management", items: ["All Users", "Government Users", "Create User", "Edit User", "Deactivate User"] },
      { group: "Role & Permissions", items: ["Roles", "Permissions", "Role Assignments"] },
      { group: "Government Structure", items: ["Departments", "Sub-Counties", "Wards", "Administrative Assignments"] },
      { group: "Reports Administration", items: ["All Reports", "Report Categories", "Status Configuration"] },
      { group: "System Audit", items: ["Audit Logs", "Authentication Activity", "Administrative Actions"] },
      { group: "System Configuration", items: ["Application Settings", "Notifications Configuration"] },
      { group: "My Profile", items: ["My Profile"] },
    ],
  },
  ADMIN: {
    route: "admin",
    label: "Administrator",
    scope: "system",
    defaultPage: "System Overview",
    welcome: {
      title: "Platform Administration",
      subtitle: "Platform-wide oversight, user management, audit logs, and system configuration.",
    },
    sidebar: [
      { group: "System Overview", items: ["System Overview"] },
      { group: "User Management", items: ["All Users", "Government Users", "Create User", "Edit User", "Deactivate User"] },
      { group: "Role & Permissions", items: ["Roles", "Permissions", "Role Assignments"] },
      { group: "Government Structure", items: ["Departments", "Sub-Counties", "Wards", "Administrative Assignments"] },
      { group: "Reports Administration", items: ["All Reports", "Report Categories", "Status Configuration"] },
      { group: "System Audit", items: ["Audit Logs", "Authentication Activity", "Administrative Actions"] },
      { group: "System Configuration", items: ["Application Settings", "Notifications Configuration"] },
      { group: "My Profile", items: ["My Profile"] },
    ],
  },
  DISASTER_MANAGER: {
    route: "disaster-manager",
    label: "Disaster Manager",
    scope: "department",
    defaultPage: "Department Overview",
    welcome: {
      title: "Disaster Management",
      subtitle: "Hazard reports, emergency incidents, disaster response coordination, and escalation oversight.",
    },
    sidebar: [
      { group: "Department Overview", items: ["Department Overview"] },
      { group: "Department Reports", items: ["All Reports", "Pending Reports", "Critical Reports", "Resolved Reports", "Escalated Reports"] },
      { group: "Department Operations", items: ["Departmental Teams", "Workload Distribution"] },
      { group: "Performance", items: ["Department Performance", "Resolution Trends"] },
      { group: "Approvals & Escalations", items: ["Pending Approvals", "Escalated Issues", "Decisions History"] },
      { group: "Analytics & Reports", items: ["Department Reports", "Performance Reports", "Export Reports"] },
      { group: "Notifications", items: ["Notifications"] },
      { group: "My Profile", items: ["My Profile"] },
    ],
  },
  ENFORCEMENT_OFFICER: {
    route: "enforcement-officer",
    label: "Enforcement Officer",
    scope: "department",
    defaultPage: "Department Overview",
    welcome: {
      title: "Enforcement Operations",
      subtitle: "Enforcement cases, compliance violations, and enforcement actions within your department.",
    },
    sidebar: [
      { group: "Department Overview", items: ["Department Overview"] },
      { group: "Department Reports", items: ["All Reports", "Pending Reports", "Critical Reports", "Resolved Reports", "Escalated Reports"] },
      { group: "Department Operations", items: ["Departmental Teams", "Workload Distribution"] },
      { group: "Performance", items: ["Department Performance", "Resolution Trends"] },
      { group: "Approvals & Escalations", items: ["Pending Approvals", "Escalated Issues", "Decisions History"] },
      { group: "Analytics & Reports", items: ["Department Reports", "Performance Reports", "Export Reports"] },
      { group: "Notifications", items: ["Notifications"] },
      { group: "My Profile", items: ["My Profile"] },
    ],
  },
  OFFICER: {
    route: "officer",
    label: "Government Officer",
    scope: "none",
    defaultPage: "Dashboard",
    welcome: {
      title: "Government Officer",
      subtitle: "Assigned reports and operational tasks within your jurisdiction.",
    },
    sidebar: [
      { group: "Dashboard", items: ["Dashboard"] },
      { group: "Reports", items: ["All Reports", "Assigned Reports", "In Progress", "Completed"] },
      { group: "Notifications", items: ["Notifications"] },
      { group: "My Profile", items: ["My Profile"] },
    ],
  },
};

/**
 * Get the route path for a role (e.g. "/government/governor").
 */
export function getRoleRoute(role) {
  const config = ROLE_CONFIGS[role];
  return config ? `/government/${config.route}` : "/government";
}

/**
 * Get the config for a role, falling back to OFFICER config.
 */
export function getRoleConfig(role) {
  return ROLE_CONFIGS[role] || ROLE_CONFIGS.OFFICER;
}

/**
 * Get all valid government roles.
 */
export function getAllRoles() {
  return Object.keys(ROLE_CONFIGS);
}

/**
 * Check whether a role string is a valid government role.
 */
export function isValidRole(role) {
  return role in ROLE_CONFIGS;
}

/**
 * Get the icon component name for a sidebar item.
 */
export function getIconForItem(itemName) {
  return ICON_MAP[itemName] || "LayoutDashboard";
}

/**
 * Get the department label for a department code.
 */
export function getDepartmentLabel(departmentId) {
  return DEPARTMENT_LABELS[departmentId] || departmentId || "Unassigned";
}

export default {
  ROLE_CONFIGS,
  getRoleRoute,
  getRoleConfig,
  getAllRoles,
  isValidRole,
  getIconForItem,
  getDepartmentLabel,
};
