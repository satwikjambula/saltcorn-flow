# saltcorn-kanban-simple

A simple Kanban board view plugin for [Saltcorn](https://github.com/saltcorn/saltcorn).

Displays table rows as cards grouped into swim-lane columns by a field value, with drag-and-drop reordering powered by [SortableJS](https://sortablejs.com).

## Features

- Group rows into columns by any String or Integer field
- Drag cards between columns — updates the database immediately
- Configurable column order
- Optional card-click modal (link to a Show view)
- Optional "Add card" button per column (link to a Create view)
- Role-based drag permission (Admin / Staff / User / Public)
- Badge showing card count per column

## Installation

Install from the Saltcorn plugin store, or manually:

```
npm install saltcorn-kanban-simple
```

Then add the plugin in **Settings → Plugins**.

## Configuration

| Field | Description |
|-------|-------------|
| Group-by field | String or Integer field whose value determines the column |
| Column order | Optional comma-separated list of values, e.g. `To Do,In Progress,Done` |
| Card title field | Field displayed as the card heading |
| Card detail view | Optional Show view opened in a modal on card click |
| Use view to create | Optional Create view linked from an Add button in each column |
| Minimum role to move cards | Lowest role that can drag cards (default: User) |

## License

MIT
