const { scTable, scView, scField, scForm, scWorkflow, scHelper } = require("./_resolve");
const {
  div,
  span,
  a,
  button,
  script,
  domReady,
  text,
} = require("@saltcorn/markup/tags");

// ─── helpers ──────────────────────────────────────────────────────────────────

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function calDays(year, month) {
  // month is 0-indexed
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  // pad start
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++)
    days.push(new Date(year, month, d));
  // pad end to complete the last week
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ─── configuration workflow ───────────────────────────────────────────────────

const configuration_workflow = (req) => {
  const Workflow = scWorkflow();
  return new Workflow({
    steps: [
      {
        name: req.__("Calendar settings"),
        form: async (context) => {
          const Table = scTable();
          const View = scView();
          const Form = scForm();
          const table = Table.findOne({ id: parseInt(context.table_id, 10) });
          const fields = table.getFields();
          const dateFields = fields.filter((f) => !f.primary_key && f.type?.name === "Date");
          const allFields = fields.filter((f) => !f.primary_key);

          const show_views = await View.find_table_views_where(
            context.table_id,
            ({ state_fields, viewrow }) =>
              viewrow.name !== context.viewname &&
              state_fields.some((sf) => sf.name === "id")
          );

          return new Form({
            fields: [
              {
                name: "date_field",
                label: req.__("Date field"),
                sublabel: req.__("Date field used to place items on the calendar"),
                type: "String",
                required: true,
                attributes: { options: dateFields.map((f) => f.name) },
              },
              {
                name: "title_field",
                label: req.__("Event title field"),
                sublabel: req.__("Field shown as the event label on each day"),
                type: "String",
                required: true,
                attributes: { options: allFields.map((f) => f.name) },
              },
              {
                name: "color_field",
                label: req.__("Color field"),
                sublabel: req.__(
                  "Optional String field — values primary/success/warning/danger/info/secondary set the event chip colour"
                ),
                type: "String",
                required: false,
                attributes: {
                  options: [
                    { label: req.__("None"), value: "" },
                    ...allFields.map((f) => f.name),
                  ],
                },
              },
              {
                name: "show_view",
                label: req.__("Event detail view"),
                sublabel: req.__("Optional: clicking an event opens this view in a modal"),
                type: "String",
                required: false,
                attributes: {
                  options: [
                    { label: req.__("None"), value: "" },
                    ...show_views.map((v) => v.select_option),
                  ],
                },
              },
              {
                name: "min_role",
                label: req.__("Minimum role to drag events"),
                type: "String",
                required: false,
                attributes: {
                  options: [
                    { name: "1", label: req.__("Admin") },
                    { name: "40", label: req.__("Staff") },
                    { name: "80", label: req.__("User") },
                    { name: "100", label: req.__("Public") },
                  ],
                },
              },
            ],
          });
        },
      },
    ],
  });
};

// ─── state fields ─────────────────────────────────────────────────────────────

const get_state_fields = async (table_id) => {
  const Table = scTable();
  const Field = scField();
  const table = Table.findOne({ id: parseInt(table_id, 10) });
  return table
    .getFields()
    .filter((f) => !f.primary_key)
    .map((f) => {
      const sf = new Field(f);
      sf.required = false;
      return sf;
    });
};

// ─── run ──────────────────────────────────────────────────────────────────────

const run = async (
  table_id,
  viewname,
  cfg,
  state,
  { req }
) => {
  const {
    date_field,
    title_field,
    color_field,
    show_view,
    min_role,
  } = cfg || {};

  if (!date_field || !title_field) {
    return div(
      { class: "alert alert-warning" },
      "FlowCalendar: date_field and title_field are required."
    );
  }

  const Table = scTable();
  const { stateFieldsToWhere, stateFieldsToQuery } = scHelper();
  const table = Table.findOne({ id: parseInt(table_id, 10) });
  const pk_name = table.pk_name;
  const fields = table.getFields();

  // determine month to display (from state or default to current month)
  const now = new Date();
  const displayYear = parseInt(state._cal_year || now.getFullYear(), 10);
  const displayMonth = parseInt(state._cal_month ?? now.getMonth(), 10); // 0-indexed

  const where = stateFieldsToWhere({ fields, state, table });
  const q = stateFieldsToQuery({ state, fields });
  const rows = await table.getRows(where, {
    ...q,
    forUser: req.user,
    forPublic: !req.user,
  });

  const role = req.user ? req.user.role_id : 100;
  const canDrag = role <= parseInt(min_role || "80", 10);

  // index rows by ISO date string
  const byDate = {};
  for (const row of rows) {
    if (!row[date_field]) continue;
    const key = isoDate(new Date(row[date_field]));
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(row);
  }

  const todayStr = isoDate(now);
  const days = calDays(displayYear, displayMonth);

  // ── event chip HTML ─────────────────────────────────────────────────────────
  const chipHtml = (row) => {
    const title = String(row[title_field] ?? row[pk_name]);
    const color = color_field && row[color_field] ? String(row[color_field]) : "primary";
    const attrs = {
      class: `badge bg-${color} sc-flowcal-chip d-block text-truncate mb-1`,
      "data-id": String(row[pk_name]),
      "data-viewname": viewname,
    };
    if (show_view) {
      return a(
        {
          ...attrs,
          href: "javascript:void(0)",
          "data-sc-modal": `/view/${show_view}?id=${row[pk_name]}`,
        },
        text(title)
      );
    }
    return span(attrs, text(title));
  };

  // ── day cell HTML ───────────────────────────────────────────────────────────
  const dayCellHtml = (date) => {
    if (!date) return div({ class: "sc-flowcal-day sc-flowcal-day--empty" }, "");
    const iso = isoDate(date);
    const isToday = iso === todayStr;
    const events = byDate[iso] || [];
    return div(
      {
        class:
          "sc-flowcal-day" +
          (isToday ? " sc-flowcal-day--today" : ""),
        "data-date": iso,
        "data-viewname": viewname,
      },
      div(
        { class: "sc-flowcal-day-num" + (isToday ? " fw-bold text-primary" : " text-muted") },
        String(date.getDate())
      ),
      div(
        { class: "sc-flowcal-events" },
        ...events.map(chipHtml)
      )
    );
  };

  // ── nav bar ─────────────────────────────────────────────────────────────────
  const prevMonth = displayMonth === 0 ? 11 : displayMonth - 1;
  const prevYear = displayMonth === 0 ? displayYear - 1 : displayYear;
  const nextMonth = displayMonth === 11 ? 0 : displayMonth + 1;
  const nextYear = displayMonth === 11 ? displayYear + 1 : displayYear;

  const navBar = div(
    { class: "sc-flowcal-nav d-flex align-items-center justify-content-between mb-2" },
    a(
      {
        href: `?_cal_year=${prevYear}&_cal_month=${prevMonth}`,
        class: "btn btn-sm btn-outline-secondary sc-flowcal-nav-btn",
      },
      "‹"
    ),
    span(
      { class: "fw-semibold" },
      `${MONTHS[displayMonth]} ${displayYear}`
    ),
    a(
      {
        href: `?_cal_year=${nextYear}&_cal_month=${nextMonth}`,
        class: "btn btn-sm btn-outline-secondary sc-flowcal-nav-btn",
      },
      "›"
    )
  );

  // ── day-of-week header ──────────────────────────────────────────────────────
  const dowHeader = div(
    { class: "sc-flowcal-grid sc-flowcal-dow-header" },
    ...DAYS.map((d) => div({ class: "sc-flowcal-dow text-muted small text-center" }, d))
  );

  const calendarId = `sc-flowcal-${viewname.replace(/\W/g, "_")}`;

  const calHtml = div(
    { class: "sc-flowcal-wrapper", id: calendarId },
    navBar,
    dowHeader,
    div({ class: "sc-flowcal-grid" }, ...days.map(dayCellHtml))
  );

  if (!canDrag) return calHtml;

  // ── drag script ─────────────────────────────────────────────────────────────
  const dragScript = script(
    domReady(`
(function() {
  var cal = document.getElementById(${JSON.stringify(calendarId)});
  if (!cal) return;

  cal.querySelectorAll('.sc-flowcal-day:not(.sc-flowcal-day--empty)').forEach(function(cell) {
    new Sortable(cell.querySelector('.sc-flowcal-events'), {
      group: ${JSON.stringify(calendarId)},
      animation: 150,
      ghostClass: 'sc-flowcal-ghost',
      onEnd: function(evt) {
        var id = evt.item.getAttribute('data-id');
        var newDate = evt.to.closest('.sc-flowcal-day').getAttribute('data-date');
        var vn = evt.to.closest('.sc-flowcal-day').getAttribute('data-viewname');
        if (!id || !newDate || !vn) return;

        evt.item.setAttribute('data-date', newDate);

        fetch('/view/' + vn + '/reschedule', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': _sc_get_csrf_token(),
          },
          body: JSON.stringify({ id: id, date: newDate }),
        })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data.error) {
              notifyAlert({ type: 'danger', text: data.error });
              location.reload();
            }
          })
          .catch(function() { location.reload(); });
      },
    });
  });
})();
`)
  );

  return calHtml + dragScript;
};

// ─── route: reschedule ────────────────────────────────────────────────────────

const reschedule = async (
  table_id,
  _vn,
  { date_field, min_role },
  body,
  { req }
) => {
  const role = req.user ? req.user.role_id : 100;
  if (role > parseInt(min_role || "80", 10))
    return { json: { error: "Not authorized" } };

  const { id, date } = body;
  if (!id || !date)
    return { json: { error: "Missing id or date" } };

  // basic ISO date sanity check
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return { json: { error: "Invalid date format" } };

  const table = scTable().findOne({ id: parseInt(table_id, 10) });
  try {
    await table.updateRow({ [date_field]: date }, parseInt(id, 10), req.user);
    return { json: { success: true } };
  } catch (e) {
    return { json: { error: e.message || "Reschedule failed" } };
  }
};

// ─── export ───────────────────────────────────────────────────────────────────

module.exports = {
  name: "FlowCalendar",
  description:
    "Monthly calendar view — items placed by a Date field with drag-to-reschedule. Supports event colour coding and card-click modals.",
  configuration_workflow,
  run,
  get_state_fields,
  routes: { reschedule },
  getStringsForI18n() { return []; },
};
