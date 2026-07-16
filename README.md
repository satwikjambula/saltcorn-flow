# saltcorn-flow

Asana-style project and task management plugin for [Saltcorn](https://github.com/saltcorn/saltcorn).

Adds three view templates to any table:

- **FlowBoard** — drag-and-drop kanban board with columns, card metadata, and inline column creation
- **FlowList** — flat sortable task list with inline status editing, priority badges, due dates, and assignee avatars
- **FlowZone** — configurable drag-and-drop zones (e.g. wishlist → cart → purchased) with per-zone colour headers, item counts, and optional max-item limits

Powered by [SortableJS](https://sortablejs.com).

---

## Screenshots

### FlowBoard

![FlowBoard — kanban board with draggable cards, priority badges, due dates and assignee avatars](https://raw.githubusercontent.com/satwikjambula/saltcorn-flow/main/public/screenshots/flowboard.png)

### FlowList

![FlowList — flat task list with inline status and priority dropdowns, due dates, assignee avatars](https://raw.githubusercontent.com/satwikjambula/saltcorn-flow/main/public/screenshots/flowlist.png)

### FlowZone

![FlowZone — configurable drop zones with colour-coded headers and item counts](https://raw.githubusercontent.com/satwikjambula/saltcorn-flow/main/public/screenshots/flowzone.png)

---

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [FlowBoard](#flowboard)
- [FlowList](#flowlist)
- [FlowZone](#flowzone)
- [Testing locally](#testing-locally)
- [License](#license)

---

## Requirements

- **Saltcorn** v1.0.0 or later

---

## Installation

### From the plugin store

1. Go to **Settings → Plugins → Plugin Store**
2. Search for `saltcorn-flow`
3. Click **Install**

### From npm

```bash
npm install saltcorn-flow
```

Then in Saltcorn: **Settings → Plugins → Install from npm** → enter `saltcorn-flow`.

---

## FlowBoard

A kanban board that groups rows into columns by any field value. Cards can be dragged between columns to update the database instantly.

### Configuration

| Field | Required | Description |
|---|---|---|
| Group-by field | ✅ | String or Integer field whose value determines the column (e.g. `status`, `stage`) |
| Column order | — | Comma-separated list of column names in display order, e.g. `To Do,In Progress,Done` |
| Card title field | ✅ | Field shown as the card heading |
| Due date field | — | Date field — cards show a coloured due date badge (red if overdue, yellow if ≤ 3 days) |
| Assignee field | — | String field — shown as a circular avatar with the first two characters |
| Priority field | — | String field — values `Urgent` / `High` show a danger badge; `Medium` warning; `Low` secondary |
| Card detail view | — | Show view opened in a modal when a card is clicked |
| Use view to create | — | Create view linked from an **Add card** button at the bottom of each column |
| Minimum role to move cards | — | Lowest role that can drag cards between columns (default: User) |

### Features

- Drag cards between columns — group-by field updated immediately via `POST /view/{name}/move_card`
- Card count badge per column
- Colour-coded due date, circular assignee avatar, priority badge on each card
- **Add column** widget at the right end of the board — type a name and click + to append a new column (persisted to view config)
- Optional card-click modal and per-column Add card button

### Example table setup

| Field | Type | Used for |
|---|---|---|
| `title` | String | Card title field |
| `status` | String | Group-by field (values: `To Do`, `In Progress`, `Done`) |
| `due_date` | Date | Due date field |
| `assignee` | String | Assignee field (e.g. `Alice`, `Bob`) |
| `priority` | String | Priority field (values: `Urgent`, `High`, `Medium`, `Low`) |

---

## FlowList

A flat, sortable task list displayed as a table. Status and priority can be edited inline without leaving the page. Rows can be dragged to reorder if a position field is configured.

### Configuration

| Field | Required | Description |
|---|---|---|
| Title field | ✅ | Field shown in the first column as the task name |
| Status field | — | String field — rendered as an inline `<select>` dropdown |
| Status options | — | Comma-separated list of valid status values, e.g. `Open,In Progress,Done` |
| Due date field | — | Date field — shown with colour coding (red if overdue, yellow if ≤ 3 days) |
| Assignee field | — | String field — shown as a circular avatar |
| Priority field | — | String field — rendered as an inline `<select>` with badge-coloured options |
| Position field | — | Integer field that stores row order — enables drag-to-reorder |
| Minimum role to edit / reorder | — | Lowest role that can change status, priority, or drag rows (default: User) |

### Features

- Inline status and priority editing via `<select>` dropdowns — saves to DB immediately
- Drag handle column for reordering rows — positions saved in bulk
- Due date colour coding and assignee avatars consistent with FlowBoard
- Scrollable table layout — works on mobile

### Example table setup

| Field | Type | Used for |
|---|---|---|
| `title` | String | Title field |
| `status` | String | Status field (values: `Open`, `In Progress`, `Done`) |
| `priority` | String | Priority field (values: `Urgent`, `High`, `Medium`, `Low`) |
| `due_date` | Date | Due date field |
| `assignee` | String | Assignee field |
| `position` | Integer | Position field (for drag-to-reorder) |

---

## FlowZone

A drag-and-drop zone board for categorising items into named buckets — e.g. a product wishlist, a shopping cart, or a pipeline stage view. Each zone gets a coloured header, item count badge, and optional max-item cap enforced on both client and server.

### Configuration

| Field | Required | Description |
|---|---|---|
| Container field | ✅ | String or Integer field updated when an item is dropped into a zone |
| Zone names | ✅ | Comma-separated zone identifiers written to the container field, e.g. `wishlist,cart,purchased` |
| Zone display labels | — | Comma-separated display names (same order as zones), e.g. `Wishlist,My Cart,Purchased` |
| Zone colors | — | Comma-separated Bootstrap colour names per zone: `primary`, `success`, `warning`, `danger`, `info`, `secondary` |
| Max items per zone | — | Comma-separated max item counts per zone (0 = unlimited), e.g. `0,5,1` |
| Card title field | ✅ | Field shown as the item label on each card |
| Card subtitle field | — | Optional second field shown below the title |
| Card detail view | — | Optional: clicking a card opens this view in a modal |
| Show unassigned bin | — | Show items with no container value in an Unassigned zone above the grid |
| Minimum role to drag items | — | Lowest role that can move items between zones (default: User) |
| Zones with a Submit button | — | Comma-separated zone names — each gets a Submit button in its header |
| Submit button label | — | Text on each Submit button (default: "Submit") |
| Submit trigger name | — | Saltcorn trigger "When" name fired on submit — create a Custom trigger with this value; it receives `{ zone, rows, count }` |
| Minimum role to submit | — | Lowest role that can click Submit (defaults to same as drag role) |

### Features

- Responsive CSS grid — zones flow automatically across the available width
- Per-zone colour-coded headers with item count badges
- Optional max-item limit: drop is blocked client-side and validated server-side
- Unassigned bin for items not yet placed in any zone
- Fires Saltcorn `Update` triggers after every successful drop — business rules apply automatically
- **Submit zone contents** — each configured zone gets a Submit button; clicking it POSTs all rows currently in that zone to the server as JSON and fires a named Saltcorn trigger
- Ghost card while dragging with smooth 150 ms animation

### Submit zone contents — how it works

When a Submit button is clicked the plugin calls `POST /view/{name}/submit_zone` with `{ zone }`. The server re-fetches every row in that zone from the database (respecting row-level permissions) and returns:

```json
{ "success": true, "zone": "cart", "count": 3, "rows": [ { "id": 1, "name": "Item A", "zone": "cart" }, ... ] }
```

If **Submit trigger name** is set (e.g. `CartSubmit`) Saltcorn fires that trigger before responding. Create a Custom trigger on the same table with `When = CartSubmit` and attach a Webhook, JavaScript, or any other action — the trigger row contains `{ zone, rows, count }`.

This pattern covers loyalty-program and gamification scenarios where business rules depend on the full composition of a zone (e.g. "award a badge when the cart contains 3+ items from the same category") without any custom route code.

**Example trigger setup:**
1. Go to **Tables → {your table} → Edit → Triggers → Add trigger**
2. Set When = `CartSubmit` (must match Submit trigger name exactly)
3. Set Action = Webhook, URL = `https://your-backend.com/process-cart`
4. The webhook receives the full rows array — parse it with custom code

### Example table setup

| Field | Type | Used for |
|---|---|---|
| `name` | String | Card title field |
| `description` | String | Card subtitle field |
| `zone` | String | Container field (values: `wishlist`, `cart`, `purchased`) |

---

## Testing locally

### Prerequisites

- Node.js 18+
- Saltcorn installed globally: `npm install -g @saltcorn/cli`

### Step 1 — Clone the plugin

```bash
git clone https://github.com/satwikjambula/saltcorn-flow
cd saltcorn-flow
npm install
```

### Step 2 — Register with your local Saltcorn instance

```bash
saltcorn install-plugin -d /absolute/path/to/saltcorn-flow
```

> If the command silently fails, insert directly:
> ```bash
> sqlite3 ~/Library/Application\ Support/saltcorn/scdb.sqlite \
>   "INSERT OR REPLACE INTO _sc_plugins (name, source, location) \
>    VALUES ('saltcorn-flow', 'local', '/absolute/path/to/saltcorn-flow');"
> ```

### Step 3 — Start the server

```bash
saltcorn serve
```

### Step 4 — Create a test table

Go to **Tables → Add table** and create a table with the fields from the example setup above.

### Step 5 — Create a FlowBoard view

1. Go to **Views → Add view**
2. Select the table, template: **FlowBoard**, give it a name
3. Set group-by field to `status`, card title field to `title`
4. Optionally set due date, assignee, and priority fields
5. Save — insert a few rows first, then open the view to see cards

### Step 6 — Create a FlowList view

1. Go to **Views → Add view**
2. Select the same table, template: **FlowList**
3. Set title field, status field (`status`), status options (`Open,In Progress,Done`), position field (`position`)
4. Save and open — drag rows to reorder and edit status inline

### Step 7 — Create a FlowZone view

1. Go to **Views → Add view**
2. Select the same table, template: **FlowZone**
3. Set container field to `zone`, zone names to `wishlist,cart,purchased`
4. Optionally set zone labels, colours, max items, and card subtitle field
5. Save and open — drag cards between zones to update the container field

---

## License

MIT
