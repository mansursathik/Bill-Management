

## Smart Expense Bill Approval System — Implementation Plan

### 1. Supabase Setup — Database & Auth
- **Connect Supabase** to the project
- **Database tables**: `profiles`, `user_roles` (enum: employee/accounts/manager/md), `bills`, `approvals`, `audit_logs`, `bill_duplicates`
- **Auth**: Email/password signup with Supabase Auth; auto-create profile on signup
- **RLS policies**: Employees see own bills; Accounts/Manager/MD see bills routed to them; role-based access via `has_role()` security definer function
- **Storage bucket**: `bill-images` for uploaded bill files (JPG, PNG, PDF)

### 2. Role-Based Access & Auth Pages
- **Login & Signup pages** with email/password
- **Role assignment**: Admin can assign roles; for demo, seed users with each role
- **Auth context** wrapping the app with role-aware routing
- **Protected routes** based on user role

### 3. App Layout & Navigation
- **Sidebar navigation** with role-based menu items:
  - Employee: Dashboard, Upload Bill, My Bills, Analytics
  - Accounts: Dashboard, All Bills, Pending Approvals, Analytics
  - Manager: Dashboard, Pending Approvals, Analytics
  - MD: Dashboard, All Bills, Pending Approvals, Full Analytics
- **Header** with user info, role badge, and logout

### 4. Bill Upload & Simulated OCR
- **Upload form**: File picker (JPG/PNG/PDF, max 10MB), preview of uploaded image
- **Simulated OCR**: On upload, generate realistic extracted data (vendor name, date, amount) and auto-populate form fields
- **Confidence indicators**: Show green/yellow/red badges for extraction confidence
- **User verification**: Editable fields for correcting extracted data, category selector
- **File upload** to Supabase Storage bucket

### 5. Approval Workflow Engine
- **Rules-based routing** (implemented via database triggers/edge function):
  - < ₹1,000 → Accounts only
  - ₹1,000–₹10,000 → Accounts → Manager (sequential)
  - > ₹10,000 → Accounts → Manager → MD (sequential)
- **Approval records** created automatically on bill submission
- **Sequential gating**: Next approver's record activates only after previous approval

### 6. Duplicate Bill Detection
- **Transaction matching**: Check vendor + amount + date within 7-day window on submission
- **Warning dialog** if duplicate detected, with option to override with justification
- **Duplicate records** stored in `bill_duplicates` table

### 7. Bill Management Pages
- **Bills list page**: Searchable, filterable table (status, date range, category, vendor)
- **Bill detail page**: Full image preview with zoom, extracted details, approval timeline component, comments
- **Approval dashboard**: Per-role view of pending bills with approve/reject actions and comment field
- **CSV export** of filtered bill list

### 8. Audit Trail
- **Automatic logging** of every action (upload, extraction, routing, approval, rejection)
- **Timeline component** on bill detail page showing chronological history with actor, role, timestamp, and notes

### 9. Analytics Dashboard
- **Summary cards**: Total expenses (month), pending count, approval rate, avg approval time
- **Recharts visualizations**: Category breakdown (pie chart), vendor breakdown (bar chart), monthly trend (line chart)
- **Date range filter**
- **Role-scoped data**: Employees see personal analytics; MD sees organization-wide

### 10. Additional Features
- **Console-logged email notifications** when bills need approval
- **Responsive design** for mobile viewing
- **Seed data**: Demo users (one per role), sample bills at various stages
- **Toast notifications** for actions (submit, approve, reject)

### Pages Summary
1. `/login` — Login page
2. `/signup` — Signup page
3. `/` — Role-appropriate dashboard
4. `/bills/upload` — Bill upload with OCR
5. `/bills` — Bills list with filters
6. `/bills/:id` — Bill detail with image, timeline, actions
7. `/approvals` — Approval dashboard (Accounts/Manager/MD)
8. `/analytics` — Analytics dashboard with charts
9. `/profile` — User profile with role display

