# saltcorn-flow

**Six drag-and-drop view templates for [Saltcorn](https://github.com/saltcorn/saltcorn) — turn any database table into a kanban board, task list, zone bucket, priority matrix, monthly calendar, or Gantt timeline in minutes. No code required.**

---

## What is saltcorn-flow?

Saltcorn is a no-code platform where you build apps by creating tables and attaching views to them. `saltcorn-flow` adds six new view templates to the platform — all focused on project and task management:

| Template | Best for |
|---|---|
| **FlowBoard** | Moving tasks through stages (kanban) |
| **FlowList** | Reviewing and editing many tasks at once |
| **FlowZone** | Categorising items into named buckets |
| **FlowMatrix** | Visualising tasks on two axes (e.g. priority × status) |
| **FlowCalendar** | Seeing what is due when, month by month |
| **FlowTimeline** | Planning work across a date range (Gantt) |

Every view works with the same table. Create all six views on one `tasks` table and switch between them depending on what you need to see.

---

## Which view should I use?

| I want to… | Use |
|---|---|
| Move tasks through stages like Trello | **FlowBoard** |
| See all tasks in a list and edit them fast | **FlowList** |
| Let users drag items into a cart / basket / bucket | **FlowZone** |
| Visualise tasks by priority AND status at the same time | **FlowMatrix** |
| See what is due this month and drag tasks to new dates | **FlowCalendar** |
| Plan sprints or projects with start and end dates | **FlowTimeline** |

---

## Screenshots

### FlowBoard
<img width="1497" height="379" alt="FlowBoard" src="https://github.com/user-attachments/assets/2a9b952a-46f1-452a-871f-6d5d1cab4138" />

### FlowList
<img width="1498" height="486" alt="FlowList" src="https://github.com/user-attachments/assets/5efd3510-a2ae-448a-908f-9dcf33bcb76a" />

### FlowZone
<img width="1495" height="445" alt="FlowZone" src="https://github.com/user-attachments/assets/f81058e8-bdc4-40ac-a21b-77c184c1ad39" />

### FlowMatrix
<img width="1490" height="442" alt="FlowMatrix" src="https://github.com/user-attachments/assets/1f904462-6ba4-40cc-8e0a-90ea837f6302" />

### FlowCalendar
<img width="1499" height="538" alt="FlowCalendar" src="https://github.com/user-attachments/assets/ef0db3cb-e391-4e78-a5f3-d732c58fc287" />

### FlowTimeline
<img width="1505" height="466" alt="FlowTimeline" src="https://github.com/user-attachments/assets/edf048b0-29c0-4955-8c41-b3c7be85d8f4" />

---

## Installation

### Option A — Plugin store (recommended)

1. In Saltcorn go to **Settings → Plugins → Plugin Store**
2. Search for `saltcorn-flow` and click **Install**
3. Done — the six view templates appear immediately in **Views → Add view**

### Option B — npm

```bash
npm install -g saltcorn-flow
```

Then in Saltcorn: **Settings → Plugins → Install from npm** → type `saltcorn-flow` → Install.

---

## Quick start (5 minutes)

This walks you through creating one table and one FlowBoard view so you can see the plugin working before reading the full docs.

### 1. Create the table

Go to **Tables → Add table**, name it `tasks`, then add these fields:

| Field name | Type |
|---|---|
| `title` | String |
| `status` | String |
| `priority` | String |
| `assignee` | String |
| `due_date` | Date |

### 2. Add some rows

Go to **Tables → tasks → Edit rows** and add 4–6 rows. Use these values so the board looks good:

- `status`: `To Do`, `In Progress`, or `Done`
- `priority`: `Urgent`, `High`, `Medium`, or `Low`
- `assignee`: any first name (e.g. `Alice`, `Bob`)
- `due_date`: various dates

### 3. Create a FlowBoard view

1. Go to **Views → Add view**
2. Name: `task-board` · Template: **FlowBoard** · Table: **tasks**
3. Click **Configure**
4. Set **Group-by field** = `status`
5. Set **Column order** = `To Do,In Progress,Done`
6. Set **Card title field** = `title`
7. Set **Priority field** = `priority`
8. Set **Due date field** = `due_date`
9. Set **Assignee field** = `assignee`
10. Set **Minimum role to move cards** = `Public`
11. Click **Finish**

Open the view — you will see three columns with your tasks as cards. Drag a card to another column; the status field in the database updates instantly.

---

## FlowBoard — Kanban Board

A board that groups rows into columns by any field value. Drag cards between columns to update the database. Add new columns directly from the board.

### How it works

Each unique value in the **Group-by field** becomes a column. Drag a card to a different column and the group-by field on that row is updated to the new column's value. The card count badge on each column header updates in real time.

### Step-by-step setup

**Table fields you need:**

| Field | Type | Purpose |
|---|---|---|
| `title` | String | Card heading |
| `status` | String | Group-by field — each value becomes a column |
| `priority` | String | (Optional) colour badge: `Urgent`/`High`/`Medium`/`Low` |
| `due_date` | Date | (Optional) coloured due date on the card |
| `assignee` | String | (Optional) circular avatar from the first two letters |
| `position` | Integer | (Optional) enables drag-to-reorder within a column |

**View configuration:**

| Setting | What to enter | Required |
|---|---|---|
| Group-by field | `status` | ✅ |
| Column order | `To Do,In Progress,Done` | — |
| Card title field | `title` | ✅ |
| Due date field | `due_date` | — |
| Assignee field | `assignee` | — |
| Priority field | `priority` | — |
| WIP limits | e.g. `0,3,0` — max cards per column (0 = no limit) | — |
| Position field | `position` | — |
| Card detail view | name of a Show view on the same table | — |
| Use view to create | name of an Edit/New view on the same table | — |
| Minimum role to move cards | `Public` / `User` / `Staff` / `Admin` | — |

### Features in detail

**Drag between columns** — drop a card on any column; the group-by field is updated server-side.

**WIP limits** — set a maximum number of cards per column. The column header turns red when the limit is reached, and the drop is blocked on both the client and the server. Configure as a comma-separated list matching the column order, e.g. `0,3,0` means no limit on "To Do", max 3 on "In Progress", no limit on "Done".

**Within-column reorder** — add an Integer field (e.g. `position`) to your table, select it as the Position field, and cards can be dragged up and down within a column. Order is saved in a single bulk update.

**Add column** — a text input + button at the right end of the board lets any authorised user add a new column by typing its name. The new column value is appended to the column order in the view config.

**Search bar** — a filter input above the board hides cards whose title does not match the typed text. Counts on column headers update to reflect the filtered count.

**Card badges** — priority badge colour: `Urgent` → red, `High` → yellow, `Medium` → blue, `Low` → grey. Due date badge: red if past due, yellow if due within 3 days, grey otherwise.

**Card detail modal** — set Card detail view to a Show view and clicking any card opens it in a Saltcorn modal overlay.

---

## FlowList — Flat Task List

A table view where every row is a task. Status and priority can be changed via inline dropdowns. Multiple rows can be edited at once with the bulk toolbar. Rows can be dragged to reorder.

### How it works

Rows are displayed as a sortable table. Clicking a dropdown in the Status or Priority column saves the new value immediately — no Save button needed. Selecting rows with checkboxes reveals the bulk edit toolbar, which lets you apply a value to all selected rows at once.

### Step-by-step setup

**Table fields you need:**

| Field | Type | Purpose |
|---|---|---|
| `title` | String | Row label (first column) |
| `status` | String | Inline status dropdown |
| `priority` | String | Inline priority dropdown with colour badges |
| `due_date` | Date | Coloured due date |
| `assignee` | String | Circular avatar |
| `position` | Integer | (Optional) enables drag-to-reorder |

**View configuration:**

| Setting | What to enter | Required |
|---|---|---|
| Title field | `title` | ✅ |
| Status field | `status` | — |
| Status options | `To Do,In Progress,Done` | — |
| Priority field | `priority` | — |
| Due date field | `due_date` | — |
| Assignee field | `assignee` | — |
| Editable fields | `status,priority` | — |
| Position field | `position` | — |
| Show view | name of a Show view for modal on title click | — |
| Minimum role to edit | `Public` / `User` / `Staff` / `Admin` | — |

### Features in detail

**Inline status and priority editing** — each cell is a `<select>` that POSTs the change on blur. No page reload.

**Bulk edit** — tick any number of rows, pick a field and new value from the toolbar, click Apply. Useful for closing a sprint, reassigning tasks, or mass-changing priority.

**Drag-to-reorder** — a drag handle appears on the left of each row when a position field is configured. Drop order is saved in one bulk request.

**Inline title edit** — click any title to edit it in place. Press Enter to save, Escape to cancel.

**Clickable title modal** — if a Show view is configured, the title becomes a link that opens the full record in a Saltcorn modal.

**Search / filter bar** — live text filter above the table. Hides rows that do not match.

---

## FlowZone — Drop Zone Board

A board of named zones (buckets). Drag items between zones to update a field. Ideal for wish lists, shopping carts, intake pipelines, or any "drag-to-categorise" use case.

### How it works

Items sit in zones based on the value of their **container field**. Dragging an item to a different zone sets the container field to that zone's name. Items with no container value appear in the Unassigned bin.

### Step-by-step setup

**Table fields you need:**

| Field | Type | Purpose |
|---|---|---|
| `name` | String | Card title |
| `description` | String | (Optional) subtitle below the title |
| `zone` | String | Container field — stores which zone the item is in |
| `position` | Integer | (Optional) enables reorder within a zone |

**View configuration:**

| Setting | What to enter | Required |
|---|---|---|
| Container field | `zone` | ✅ |
| Zone names | `wishlist,current,completed` | ✅ |
| Zone display labels | `Wishlist,Current Sprint,Completed` | — |
| Zone colors | `secondary,primary,success` | — |
| Max items per zone | `0,5,0` | — |
| Position field | `position` | — |
| Card title field | `name` | ✅ |
| Card subtitle field | `description` | — |
| Show unassigned bin | on | — |
| Clear zones | `completed` | — |
| Zones with a Submit button | `current` | — |
| Submit button label | `Send to review` | — |
| Submit trigger name | `SprintSubmit` | — |
| Minimum role to drag | `Public` | — |

### Features in detail

**Drag between zones** — drop an item on any zone header or drop area; the container field is updated.

**WIP limits** — the zone header turns red and further drops are blocked when the limit is reached.

**Within-zone reorder** — configure a position field to enable drag-to-reorder inside a zone.

**Unassigned bin** — a collapsible panel above the main grid shows all items where the container field is empty. Click the toggle arrow to show or hide it. On mobile it collapses to a sidebar.

**Clear button** — add a zone name to Clear zones and a Clear button appears in that zone's header. Clicking it sets the container field to null for every item in that zone.

**Submit button** — add a zone name to Zones with a Submit button and a Submit button appears in the zone header. Clicking it:
1. Re-fetches every row currently in that zone (respecting row-level permissions)
2. Fires the named Saltcorn trigger with `{ zone, rows, count }` as the payload
3. Returns the full rows array to the client

**How to set up a Submit trigger:**
1. Go to **Tables → your table → Triggers → Add trigger**
2. Set **When** to the same value as Submit trigger name (e.g. `SprintSubmit`)
3. Set **Action** to Webhook, JavaScript, or any Saltcorn action
4. The trigger receives `{ zone: "current", count: 5, rows: [...] }` — parse it to run your business logic

This pattern is useful for: placing an order, submitting a sprint for review, sending a batch for processing, or triggering any workflow once a user has finished assembling items in a zone.

---

## FlowMatrix — 2-D Priority Grid

A grid view that maps rows to cells at the intersection of two field values. Drag a card to any cell to update both fields at once.

### How it works

You configure two categorical fields — one for columns (X axis) and one for rows (Y axis). Every item appears in the cell matching its current X and Y values. Dragging a card to a different cell writes both the X field and the Y field in a single update.

### Step-by-step setup

**Table fields you need:**

| Field | Type | Purpose |
|---|---|---|
| `title` | String | Card heading |
| `priority` | String | X axis field |
| `status` | String | Y axis field |
| `assignee` | String | (Optional) card subtitle |

**View configuration:**

| Setting | What to enter | Required |
|---|---|---|
| X axis field | `priority` | ✅ |
| X axis values | `Low,Medium,High,Urgent` | ✅ |
| X axis label | `Priority` | — |
| Y axis field | `status` | ✅ |
| Y axis values | `To Do,In Progress,Done` | ✅ |
| Y axis label | `Status` | — |
| Card title field | `title` | — |
| Card subtitle field | `assignee` | — |
| Card detail view | name of a Show view | — |
| Minimum role to drag | `Public` | — |

### Features in detail

**2-D drag and drop** — drag any card to a different cell; both the X field and Y field are updated together in one server call.

**Responsive grid** — columns are distributed evenly across the available width using CSS Grid.

**Cards outside the axis** — items whose field values are not in the configured axis lists are ignored and will not appear on the matrix. Make sure all existing values are included in the axis value lists.

**Use cases** — Eisenhower matrix (urgency × importance), backlog grooming (effort × value), QA sign-off board (severity × status), team capacity view (assignee × sprint).

---

## FlowCalendar — Monthly Calendar

A calendar view showing items as chips on their due date. Drag a chip to another day to reschedule.

### How it works

Each row with a non-empty date field appears as a coloured chip on the matching calendar day. The colour comes from a second field you choose (e.g. priority). Drag a chip to a different day cell and the date field is updated.

### Step-by-step setup

**Table fields you need:**

| Field | Type | Purpose |
|---|---|---|
| `title` | String | Event label on the chip |
| `due_date` | Date | Date field — determines which day the chip appears on |
| `priority` | String | (Optional) colour field |

**View configuration:**

| Setting | What to enter | Required |
|---|---|---|
| Date field | `due_date` | ✅ |
| Event title field | `title` | ✅ |
| Color field | `priority` | — |
| Event detail view | name of a Show view | — |
| Minimum role to drag events | `Public` | — |

**Colour mapping for the color field:**

| Field value | Chip colour |
|---|---|
| `Urgent` or `danger` | Red |
| `High` or `warning` | Yellow |
| `Medium` or `info` | Blue |
| `Low` or `secondary` | Grey |
| `Done` or `success` | Green |
| `In Progress` or `primary` | Dark blue |

### Features in detail

**Month navigation** — use the `‹` / `›` arrows to go back or forward one month. You can also link directly to a specific month: add `?_cal_year=2026&_cal_month=6` to the view URL (month is 0-indexed, so 6 = July).

**Today highlight** — the current day cell has a blue background so it is easy to find.

**Drag to reschedule** — drag any chip to a different day. The server validates the date before writing. Items outside the displayed month cannot be dropped on padding cells.

**Click to open** — if an Event detail view is configured, clicking a chip opens the full record in a Saltcorn modal.

**Timezone safe** — date matching uses the local calendar day, not UTC midnight, so chips appear on the correct day regardless of the server or browser timezone.

---

## FlowTimeline — Gantt Timeline

A horizontal bar chart showing each row as a bar spanning from its start date to its end date. Drag a bar left or right to shift both dates by the same number of days.

### How it works

Each row with both a start date and an end date appears as a coloured bar in its own row. The bar is positioned using CSS Grid — no canvas or SVG. Drag a bar horizontally to shift the task; the number of days dragged is added to both the start and end fields so the duration stays the same.

### Step-by-step setup

**Table fields you need:**

| Field | Type | Purpose |
|---|---|---|
| `title` | String | Row label (shown left of the bar) |
| `start_date` | Date | Left edge of the bar |
| `end_date` | Date | Right edge of the bar |
| `priority` | String | (Optional) colour field |

**View configuration:**

| Setting | What to enter | Required |
|---|---|---|
| Start date field | `start_date` | ✅ |
| End date field | `end_date` | ✅ |
| Label field | `title` | ✅ |
| Color field | `priority` | — |
| Window (days) | `21` (default) | — |
| Bar detail view | name of a Show view | — |
| Minimum role to drag bars | `Public` | — |

**Colour mapping** — same as FlowCalendar: `Urgent` → red, `High` → yellow, `Medium` → blue, `Low` → grey, `Done` → green.

### Features in detail

**Window navigation** — use `‹` / `›` to shift the window by the number of days configured. Link directly to a date with `?_tl_start=2026-07-01`.

**Drag to reschedule** — click and drag a bar left or right. A tooltip shows the original dates while dragging. On mouse-up, both start and end fields are updated (duration preserved). The server validates that start < end before writing.

**Hover tooltip** — hovering over a bar shows the task name plus the start → end date range.

**Today marker** — the current day column header is highlighted.

**Bars outside the window** — tasks whose date range falls completely outside the window are still listed as rows (with no bar). Navigate to their date range to see the bar.

**Partial bars** — tasks that start before the window or end after it are clipped at the window edges and still show the visible portion.

---

## Configuration reference

All configuration fields for all six views in one place.

### FlowBoard

| Field | Type | Default | Description |
|---|---|---|---|
| `group_field` | String field | — | Column grouping field |
| `column_order` | Text | — | Comma-separated column names |
| `card_title_field` | Any field | — | Card heading |
| `due_date_field` | Date field | — | Due date badge |
| `assignee_field` | String field | — | Avatar (first 2 chars) |
| `priority_field` | String field | — | Priority badge |
| `wip_limits` | Text | — | Comma-separated max counts per column |
| `position_field` | Integer field | — | Within-column ordering |
| `show_view` | View name | — | Detail modal on card click |
| `create_view` | View name | — | Add card button per column |
| `min_role` | Role | User | Who can drag cards |

### FlowList

| Field | Type | Default | Description |
|---|---|---|---|
| `title_field` | Any field | — | Row label |
| `status_field` | String field | — | Inline status dropdown |
| `status_options` | Text | — | Comma-separated options |
| `priority_field` | String field | — | Inline priority dropdown |
| `due_date_field` | Date field | — | Due date badge |
| `assignee_field` | String field | — | Avatar |
| `editable_fields` | Text | — | Fields available in bulk toolbar |
| `position_field` | Integer field | — | Drag-to-reorder |
| `show_view` | View name | — | Modal on title click |
| `min_role` | Role | User | Who can edit |

### FlowZone

| Field | Type | Default | Description |
|---|---|---|---|
| `container_field` | String/Int field | — | Field written on drop |
| `zones` | Text | — | Comma-separated zone names |
| `zone_labels` | Text | — | Display names (same order) |
| `zone_colors` | Text | — | Bootstrap colours (same order) |
| `max_items` | Text | — | Max per zone (0 = unlimited) |
| `position_field` | Integer field | — | Within-zone ordering |
| `card_title_field` | Any field | — | Card heading |
| `card_subtitle_field` | Any field | — | Card subtitle |
| `show_view` | View name | — | Detail modal |
| `unassigned_sidebar` | Boolean | off | Show unassigned bin |
| `clear_zones` | Text | — | Zones with a Clear button |
| `submit_zones` | Text | — | Zones with a Submit button |
| `submit_label` | Text | Submit | Submit button label |
| `submit_trigger` | Text | — | Trigger name to fire on submit |
| `min_role` | Role | User | Who can drag |
| `min_role_submit` | Role | (same) | Who can submit |

### FlowMatrix

| Field | Type | Default | Description |
|---|---|---|---|
| `x_field` | String/Int field | — | Column axis field |
| `x_values` | Text | — | Comma-separated column values |
| `x_label` | Text | — | Column axis header |
| `y_field` | String/Int field | — | Row axis field |
| `y_values` | Text | — | Comma-separated row values |
| `y_label` | Text | — | Row axis label |
| `card_title_field` | Any field | — | Card heading |
| `card_subtitle_field` | Any field | — | Card subtitle |
| `show_view` | View name | — | Detail modal |
| `min_role` | Role | User | Who can drag |

### FlowCalendar

| Field | Type | Default | Description |
|---|---|---|---|
| `date_field` | Date field | — | Field that places the event on a day |
| `title_field` | Any field | — | Event chip label |
| `color_field` | String field | — | Chip colour (see colour mapping) |
| `show_view` | View name | — | Detail modal on chip click |
| `min_role` | Role | User | Who can drag to reschedule |

### FlowTimeline

| Field | Type | Default | Description |
|---|---|---|---|
| `start_field` | Date field | — | Bar left edge |
| `end_field` | Date field | — | Bar right edge |
| `label_field` | Any field | — | Row label |
| `color_field` | String field | — | Bar colour (see colour mapping) |
| `window_days` | Integer | 21 | Days shown in the grid |
| `show_view` | View name | — | Detail modal on bar click |
| `min_role` | Role | User | Who can drag to reschedule |

---

## Colour mapping (FlowCalendar and FlowTimeline)

Both views translate the colour field value to a Bootstrap colour using this map:

| Field value | Bootstrap colour | Appearance |
|---|---|---|
| `Urgent` | `danger` | Red |
| `High` | `warning` | Yellow |
| `Medium` | `info` | Blue |
| `Low` | `secondary` | Grey |
| `Done` | `success` | Green |
| `In Progress` | `primary` | Dark blue |
| `To Do` | `light` | Light grey |
| Any Bootstrap name directly | (used as-is) | — |

---

## License

MIT
