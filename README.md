# saltcorn-flow

An Asana-style project and task management plugin for [Saltcorn](https://github.com/saltcorn/saltcorn).

Adds a **FlowBoard** view template — drag-and-drop card board powered by [SortableJS](https://sortablejs.com). More view types (list, timeline, calendar) are planned.

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
npm install saltcorn-flow
```

Then add the plugin in **Settings → Plugins**.

## FlowBoard configuration

| Field | Description |
|-------|-------------|
| Group-by field | String or Integer field whose value determines the column |
| Column order | Optional comma-separated list, e.g. `To Do,In Progress,Done` |
| Card title field | Field displayed as the card heading |
| Card detail view | Optional Show view opened in a modal on card click |
| Use view to create | Optional Create view linked from an Add button in each column |
| Minimum role to move cards | Lowest role that can drag cards (default: User) |

## License

MIT
