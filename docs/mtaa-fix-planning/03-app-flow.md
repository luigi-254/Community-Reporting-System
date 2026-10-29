# 03 — Application Flow Specification

**Project:** Mtaa Fix  
**Status:** Completion blueprint for existing project  
**Last Updated:** 2026-10-22  

---

## 1. Overview

This document defines how each user role navigates and interacts with Mtaa Fix, covering the complete citizen reporting-to-resolution process and all administrative workflows.

---

## 2. Public Website Flows

### 2.1 Landing Page
**Route:** `/` (to be created in all frontends or main site)

**Flow:**
1. User visits landing page
2. Sees Mtaa Fix branding, purpose, how it works
3. Can click "Report an Issue", "Track Report", "Browse Public Issues"
4. Can sign in or register

**States:** Default, mobile responsive

### 2.2 Browse Public Issues
**Route:** `/issues` or `/public/issues`

**Flow:**
1. View list of public issues (sanitized - no PII)
2. Filter by category, location, status
3. View on map
4. Click issue for public detail view

**Privacy:** Only non-anonymous, approved public issues shown with sanitized data

### 2.3 Public Issue Detail
**Route:** `/issues/[id]`

**Flow:**
1. View issue details (title, category, location, status, timeline)
2. View public updates
3. See resolution status (if verified)
4. Cannot see reporter details or internal notes

---

## 3. Authentication Flows

### 3.1 Registration
**Route:** `/register`

**Flow:**
1. User enters name, email, phone, password
2. Client validates
3. Submit to `POST /api/auth/register`
4. Receive verification email/SMS (or dev code)
5. Verify account
6. Redirect to login

### 3.2 Login
**Route:** `/login`

**Flow:**
1. Enter email/phone and password
2. Submit to `POST /api/auth/login`
3. Receive access + refresh tokens (httpOnly cookies)
4. Redirect to role-appropriate dashboard
5. Store session

### 3.3 Password Recovery
**Route:** `/forgot-password`, `/reset-password`

**Flow:**
1. Request reset via email/phone
2. Receive token/code
3. Reset password
4. Login with new password

---

## 4. Citizen Flows

### 4.1 Citizen Dashboard
**Route:** `/citizen/dashboard`

**Sections:**
- My Reports (all statuses)
- Reports Awaiting Verification
- Reports in Progress
- Resolved/Closed
- Notifications
- Quick Actions (Report New Issue)

### 4.2 Report Issue Wizard (7 Steps)
**Route:** `/citizen/report/new`

**Step 1: Select Category**
- Display 7 categories as cards with icons
- User selects one
- Next enabled

**Step 2: Select Sub-Issue**
- Show sub-issues for selected category
- Include "Other (describe)" option
- If Other selected, show text input (required)
- Next enabled

**Step 3: Describe Problem**
- Title (auto-generate or user input)
- Description (required)
- Date/time observed
- Ongoing? (checkbox)
- Impact on community
- Additional details

**Step 4: Location**
- Option 1: Use GPS (with permission)
- Option 2: Select on map (Leaflet)
- Option 3: Manual selection
  - County: Kisii (pre-selected)
  - Sub-county/Constituency (dropdown - 9 options)
  - Ward (dropdown - filtered by sub-county, 45 total)
  - Village/Estate/Landmark (optional)
- Validate ward belongs to sub-county
- Capture lat/lng if available

**Step 5: Upload Evidence**
- Photo upload (multiple)
- Video upload (optional)
- File type/size validation
- Preview thumbnails
- Can remove before submit
- Max files configurable

**Step 6: Review & Submit**
- Show all entered data
- Edit any step
- Submit button
- On success: show report reference number, confirmation message, next steps
- Prevent double submission

### 4.3 Track Report
**Route:** `/citizen/reports/[id]`

**View:**
- Report details
- Status timeline
- Assigned department/officer (if assigned)
- Updates from officers
- Evidence uploaded
- Resolution proposal (if submitted)
- Action buttons (Verify Resolution, Reject, Reopen if eligible)

### 4.4 Verify Resolution
**Flow:**
1. Citizen notified when resolution submitted
2. View resolution evidence (photos, notes)
3. Options: Confirm Resolved / Reject / Report Partial Resolution
4. If reject: provide reason (required)
5. Submit verification
6. Status updates accordingly

---

## 5. Government/Admin Flows

### 5.1 Role-Based Dashboard Routing
On login, user redirected based on primary role:
- CITIZEN → `/citizen/dashboard`
- OFFICER/Field Officer → `/field/dashboard`
- Technical Supervisor → `/supervisor/dashboard`
- Technical Head → `/technical-head/dashboard`
- Chief Officer → `/chief-officer/dashboard`
- CECM → `/cecm/dashboard`
- Governor → `/governor/dashboard`
- Ward Admin → `/ward-admin/dashboard`
- Sub-County Admin → `/subcounty-admin/dashboard`
- Disaster Management → `/disaster/dashboard`
- Enforcement → `/enforcement/dashboard`
- ADMIN/Departmental Admin → `/admin/dashboard`
- SUPER_ADMIN → `/platform-admin/dashboard`

### 5.2 Ward Administrator Flow
**Dashboard:** `/ward-admin/dashboard`
- View reports in assigned ward
- Filter by status, category, priority
- Monitor local follow-up
- Flag issues for escalation
- Add internal notes
- View resolution evidence
- Escalate to Sub-County Admin or Supervisor

### 5.3 Sub-County Administrator Flow
**Dashboard:** `/subcounty-admin/dashboard`
- View all reports in sub-county wards
- Compare ward performance
- Monitor overdue reports
- Follow up with supervisors
- Escalate to departmental leadership
- View geographic heatmap

### 5.4 Field Officer Flow
**Dashboard:** `/field/dashboard`
- View assigned cases
- Acknowledge assignment
- View location on map
- Conduct inspection, add notes
- Upload before/after evidence
- Request assistance/reassignment
- Submit resolution proposal
- Mark unable to resolve with reason

### 5.5 Technical Supervisor Flow
**Dashboard:** `/supervisor/dashboard`
- Review assigned departmental cases
- Assign to field teams
- Monitor progress
- Review resolution proposals
- Approve/reject resolutions
- Reassign work
- Escalate overdue cases
- Manage team workload

### 5.6 Technical Head/Engineer Flow
**Dashboard:** `/technical-head/dashboard`
- Department-wide overview
- Review recurring issues
- Oversee supervisors
- Validate solutions
- Coordinate resources
- Produce technical reports

### 5.7 Chief Officer Flow
**Dashboard:** `/chief-officer/dashboard`
- Department oversight
- Monitor overdue/escalated
- Team performance
- Escalate to CECM
- Department reports

### 5.8 CECM Flow
**Dashboard:** `/cecm/dashboard`
- Department executive overview
- Escalations from Chief Officers
- Performance across units
- Identify persistent failures
- Review trends

### 5.9 Governor Flow
**Dashboard:** `/governor/dashboard`
- County-wide overview
- Geographic distribution/heatmap
- Departmental performance
- Priority hazards
- Escalations requiring attention
- Accountability indicators

### 5.10 Disaster Management Flow
**Dashboard:** `/disaster/dashboard`
- Hazard reports
- Emergency incidents
- Response queue
- Coordinate with departments
- Incident tracking

### 5.11 Enforcement Flow
**Dashboard:** `/enforcement/dashboard`
- Enforcement-related cases
- Investigation workflow
- Evidence management
- Follow-up tracking

### 5.12 Platform Admin Flow
**Dashboard:** `/platform-admin/dashboard`
- User management
- Role assignments
- Departments, geographic data, taxonomy
- Routing rules configuration
- SLA/escalation policies
- System settings
- Audit logs
- Data imports

---

## 6. Routing & Escalation Flows

### 6.1 Automatic Routing
1. Report submitted
2. System evaluates routing rules based on category, sub-issue, location
3. Determine destination department
4. Create assignment/task if rule matches
5. Notify relevant personnel
6. If no rule matches → Exception queue for review

### 6.2 Escalation Flow
**Triggers:**
- SLA deadline approaching/breached
- No acknowledgment within time
- No progress within time
- Stuck in same status too long
- Citizen requests escalation

**Flow:**
1. Escalation triggered
2. Notify next level in chain
3. Create escalation record
4. Update priority if needed
5. Log in audit trail
6. Track escalation resolution

---

## 7. Notification Flows

**Events triggering notifications:**
- Report submitted (to relevant dept/admin)
- Report assigned
- Assignment acknowledged
- Status changed
- More info requested
- Resolution submitted (to citizen)
- Citizen verification requested
- Report resolved/closed/rejected/reopened
- Escalation occurred
- SLA breach warning

**Channels:** In-app (primary), Email (optional via Resend)

---

## 8. Error & Edge Cases

- **GPS denied**: Fall back to manual location selection
- **No network**: Show appropriate error, allow retry
- **Duplicate submission**: Prevent with button disable + idempotency
- **Invalid location**: Validate ward-subcounty relationship
- **Unauthorized access**: Redirect to login or show 403
- **File upload failure**: Allow retry, show error
- **Missing required data**: Client and server validation

---

## 9. UI/UX Flow Principles

- **Preserve existing design**: Keep admin dashboard look and feel
- **Mobile first**: All flows work on mobile
- **Progressive disclosure**: Wizard steps, collapsible sections
- **Clear feedback**: Loading states, success/error messages
- **Accessibility**: Keyboard navigation, ARIA labels, proper contrast
- **Consistency**: Use existing component patterns where they exist
- **Minimal clicks**: Streamline common actions
