# Timetable Allocation & Management — frontend

React 19 + Vite single-page app for the Timetable Allocation & Management system. It talks to
the Express/MongoDB API in `../../backend` and renders a different workspace per role.

## Run it

```bash
npm install
npm run dev
```

Vite serves the app on `http://localhost:5174` and proxies `/api` requests to the API on
`http://localhost:4000`, so start the backend first (see the repository root README).

Set `VITE_API_BASE_URL` to point the app at a different API origin. When it is unset, requests
go to `/api` on the same origin and rely on the dev proxy (or on the rewrites in
`vercel.json` in production).

## Scripts

| Command           | Purpose                          |
| ----------------- | -------------------------------- |
| `npm run dev`     | Start the dev server with HMR     |
| `npm run build`   | Produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint`    | Run ESLint over the project       |

## Workspaces

| Route              | Role             | Screens                                                        |
| ------------------ | ---------------- | -------------------------------------------------------------- |
| `/student`         | Student          | Today, weekly timetable, change notifications                  |
| `/faculty`         | Faculty          | Timetable, workload, request changes, request leave            |
| `/department-admin`| Department Admin | Department timetable, manual builder, faculty, workload, conflicts, approvals, change requests |
| `/academic-admin`  | Academic Admin   | Institution-wide schedules, standards, working hours, approvals |
| `/super-admin`     | Super Admin      | Directory records, faculty management, analytics, audit, request form fields, settings |

## Layout

```
src/
  api.js                       fetch wrapper, token storage, error normalisation
  index.css                    global theme tokens and shared primitives
  App.jsx                      routes, session restore, role guards
  components/
    LoginPage.*                sign in
    DashboardPage.*            student and faculty workspace
    AdminDashboardPage.*       department and academic admin workspace
    ManualTimetablePage.*      manual timetable builder
    SuperAdminDashboardPage.*  system administration workspace
    FacultyManagementPage.*    faculty directory and availability
    RequestFormFieldsPage.*    super admin editor for request form fields
    ReferenceDashboard.css     shared dashboard chrome
```
