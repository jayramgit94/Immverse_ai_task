# ⚡ Smart Task Manager Web Application

A modern, high-performance, real-world task management application built with **Next.js 14 (App Router)**, **TypeScript**, and **Tailwind CSS**. Features real-time state management, an in-memory graph database, dynamic dependency resolution, circular dependency detection, and strict state-transition invariants.

Developed for the **Immverse AI Technical Assessment**.

---

## 🚀 Deployment Status: Ready for Production

The application has been structured directly at the repository root and verified for seamless one-click deployment on **Vercel**, **Render**, **Railway**, or **AWS/Docker**.

### Deploying to Vercel (Recommended)
1. Push this repository to your GitHub account.
2. Go to [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Import your `Immverse_ai_task` repository.
4. Framework Preset will auto-detect as **Next.js** (Root Directory: `./`).
5. Click **Deploy** — zero configuration required!

---

## 📸 Screenshots & Walkthrough

| Feature | Preview |
|---|---|
| **1. Main Workspace & Data Grid**<br>Live task statuses, priorities, assignee avatars, resolved prerequisite badges, and inline quick-add row. | ![Main Dashboard](screenshots/01-dashboard.png) |
| **2. Dependency Blocker Alert & Prevention**<br>Attempting to complete a blocked task is strictly prevented; triggers an inline blocker banner with direct jump-to links to prerequisite tasks. | ![Blocker Alert Banner](screenshots/02-blocker-alert.png) |
| **3. Task Creation & Dependency Graph Linking**<br>Full modal sheet supporting title, rich description, priority, status, assignee, and multi-select prerequisites with cycle detection. | ![Task Creation Modal](screenshots/03-new-task-modal.png) |
| **4. Filtered Views & Search**<br>Filter by tabs (`All`, `My Tasks`, `Blocked`), instant priority filtering (`High`, `Medium`, `Low`), and fast search across titles, descriptions, and assignees. | ![Blocked Tasks Filter](screenshots/04-blocked-filter.png) |

---

## 📋 Requirements Verification Matrix

Every requirement outlined in the problem statement has been implemented, tested, and validated:

### 1. User Actions
| # | Requirement | Implementation Details | Status |
|---|---|---|:---:|
| 1 | **Create a new user** | • Backend: `POST /api/users` with input validation (name, email format, role).<br>• Frontend: Interactive "Add team member..." modal accessible in the top-bar User Switcher. | ✅ Complete |
| 2 | **Login a user (mock auth)** | • Backend: `POST /api/auth/login` accepts `userId` or `email` and issues a session token.<br>• Frontend: One-click session switcher instantly switches active user context across the app. | ✅ Complete |
| 3 | **View all users** | • Backend: `GET /api/users` returns all workspace team members.<br>• Frontend: User Switcher dropdown & Task Modal assignee picker display full user list with roles & avatars. | ✅ Complete |

### 2. Task Actions
| # | Requirement | Implementation Details | Status |
|---|---|---|:---:|
| 1 | **Create a new task** | • Fields: **Title**, **Description**, **Priority** (*Low*, *Medium*, *High*), **Status** (*To Do*, *In Progress*, *Done*).<br>• Both standard modal sheet and inline quick-entry row (type & press Enter). | ✅ Complete |
| 2 | **Assign User** | • Select assignee during creation or edit.<br>• One-click inline assignee dropdown in task table to quickly reassign tasks on the fly. | ✅ Complete |
| 3 | **Dependencies (Task B depends on Task A)** | • Multi-select prerequisite picker with live search.<br>• Directed Acyclic Graph (DAG) with Depth-First Search (DFS) cycle detection prevents circular locks ($A \to B \to A$). Self-dependencies are forbidden. | ✅ Complete |
| 4 | **Update / Delete a task** | • Update: Edit full task details or change status/assignee inline.<br>• Delete: Trash action deletes task and cascades through graph to purge its ID from all other tasks' dependency lists. | ✅ Complete |
| 5 | **Mark task as complete (only when dependencies are complete)** | • **Strict Invariant**: Cannot set status to `Done` if any prerequisite is unfinished.<br>• **UI Guard**: Checkbox click or status change to `Done` triggers `handleBlockedAttempt`, displaying `BlockerAlertBanner` listing pending blockers.<br>• **API Guard**: Returns `400 Bad Request` with itemized list of pending blockers if called directly. | ✅ Complete |
| 6 | **View all tasks for a user (My Tasks)** | • Dedicated **"My Tasks"** tab in top bar displaying live count of tasks assigned to the currently logged-in user (`currentUser.id`). | ✅ Complete |
| 7 | **View blocked tasks** | • Dedicated **"Blocked"** tab with live count and alert badge displaying all tasks that currently have unresolved prerequisites. | ✅ Complete |

### 3. Bonus & Architecture
| # | Requirement | Implementation Details | Status |
|---|---|---|:---:|
| 1 | **Simple UI Filtering** | • Priority filter dropdown (`All`, `High`, `Medium`, `Low`).<br>• Instant search bar matching task IDs, titles, descriptions, and assignee names. | ✅ Complete |
| 2 | **Structured Code & Reusability** | • Clean modular architecture: separate API route handlers, dedicated reusable UI components (`TaskTable`, `TaskRow`, `TaskModal`, `UserSwitcher`, `BlockerAlertBanner`). | ✅ Complete |
| 3 | **Proper Logic Comments** | • Thorough JSDoc comments explaining graph resolution, cycle detection, cascading deletions, and optimistic UI transitions. | ✅ Complete |

---

## 🏗️ Architecture & Technical Highlights

```
┌────────────────────────────────────────────────────────┐
│                   Next.js 14 Frontend                  │
│   (App Router, React 18, Tailwind CSS, Lucide Icons)   │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / JSON API
┌──────────────────────────▼─────────────────────────────┐
│                 Node.js Route Handlers                 │
│  /api/users  •  /api/auth/login  •  /api/tasks/[id]    │
└──────────────────────────┬─────────────────────────────┘
                           │ Thread-Safe In-Memory Singleton
┌──────────────────────────▼─────────────────────────────┐
│                   InMemoryDatabase                     │
│  • Map<string, User>     • Map<string, Task>           │
│  • Cycle Detection (DFS) • Cascading Deletion Engine   │
│  • Dynamic Blocker Computation                         │
└────────────────────────────────────────────────────────┘
```

### In-Memory Storage & HMR Resilience
- Stores all entities in memory using JavaScript `Map` and `Set` structures for $O(1)$ lookups and clean referential integrity.
- Bound to `globalThis` in development so hot-reloading does not wipe mock state during local work.

### Directed Acyclic Graph (DAG) & Cycle Detection
- Uses Depth-First Search (DFS) with visited node tracking to ensure adding a dependency cannot create a circular wait condition ($A \to B \to C \to A$).
- When a task is deleted, the cascade engine scans all tasks in $O(N)$ and purges the deleted task ID from all dependency arrays to prevent orphaned blockers.

---

## 📁 Repository Structure

```text
.
├── app/
│   ├── api/
│   │   ├── auth/login/route.ts    # Mock authentication session API
│   │   ├── tasks/route.ts         # GET (filter/search), POST (create task)
│   │   ├── tasks/[id]/route.ts    # GET, PATCH (update/guardrails), DELETE (cascade)
│   │   └── users/route.ts         # GET (all users), POST (register new user)
│   ├── globals.css                # Global styles & Tailwind utilities
│   ├── layout.tsx                 # Root HTML shell & meta configuration
│   └── page.tsx                   # Main workspace UI & client state manager
├── components/
│   ├── BlockerAlertBanner.tsx     # Warning banner for attempted completion of blocked tasks
│   ├── DependencyPopover.tsx      # Prerequisite inspection popover
│   ├── EmptyState.tsx             # Friendly empty states for tabs & filters
│   ├── TaskModal.tsx              # Create & edit modal sheet with validation
│   ├── TaskRow.tsx                # Responsive row with inline controls & blocker tags
│   ├── TaskTable.tsx              # Grid container with headers and quick-add row
│   └── UserSwitcher.tsx           # Session switcher & user creation modal
├── lib/
│   ├── store.ts                   # In-memory database, DAG engine & cycle detection
│   └── types.ts                   # TypeScript interfaces, types & API schemas
├── screenshots/                   # Demo walkthrough images
├── .gitignore                     # Production Git ignore rules
├── next.config.mjs                # Next.js configuration
├── package.json                   # Dependencies & NPM scripts
├── package-lock.json              # Deterministic dependency lockfile
├── postcss.config.js              # PostCSS configuration
├── tailwind.config.ts             # Tailwind CSS tokens & design system
├── tsconfig.json                  # Strict TypeScript configuration
└── README.md                      # Documentation & verification report
```

---

## 🛠️ Local Development & Build

### Prerequisites
- **Node.js**: v18.17.0 or later
- **npm**: v9.0.0 or later

### 1. Clone & Install
```bash
git clone https://github.com/jayramgit94/Immverse_ai_task.git
cd Immverse_ai_task
npm install
```

### 2. Run Locally in Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

### 3. Production Build & Start
```bash
npm run build
npm start
```

---

## 🔌 API Reference

### Users
- `GET /api/users` — Returns list of all registered team members.
- `POST /api/users` — Creates a new team member (`{ name, email, role }`).
- `POST /api/auth/login` — Sets active mock session for user (`{ userId }` or `{ email }`).

### Tasks
- `GET /api/tasks` — List tasks with optional query filters:
  - `?assignedUserId=USR-1` — Filter by assigned user
  - `?blockedOnly=true` — Filter by blocked state
  - `?priority=High` — Filter by priority (`Low`, `Medium`, `High`)
  - `?status=Done` — Filter by status (`To Do`, `In Progress`, `Done`)
  - `?search=billing` — Text search across ID, title, description, and assignee
- `POST /api/tasks` — Create task (`{ title, description?, priority?, status?, assignedUserId, dependencyIds? }`).
- `GET /api/tasks/:id` — Retrieve task details with resolved dependency graph.
- `PATCH /api/tasks/:id` — Update task fields with cycle detection & blocker checks.
- `DELETE /api/tasks/:id` — Delete task and cascade cleanup of dependency references.

---

## 📄 License
MIT License. Created for the Immverse AI Internship Assessment.
