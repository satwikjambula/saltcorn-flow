const { scTable, scView, scField, scForm, scWorkflow, scHelper } = require("./_resolve");
const {
  div,
  span,
  a,
  script,
  domReady,
  text,
} = require("@saltcorn/markup/tags");

// ─── helpers ──────────────────────────────────────────────────────────────────

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

// ─── configuration workflow ───────────────────────────────────────────────────

const configuration_workflow = (req) => {
  const Workflow = scWorkflow();
  return new Workflow({
    steps: [
      {
        name: req.__("Timeline settings"),
        form: async (context) => {
          const Table = scTable();
          const View = scView();
          const Form = scForm();
          const table = Table.findOne({ id: parseInt(context.table_id, 10) });
          const fields = table.getFields();
          const dateFields = fields.filter((f) => !f.primary_key && f.type?.name === "Date");
          const allFields = fields.filter((f) => !f.primary_key);
          const stringFields = allFields.filter((f) => f.type?.name === "String");

          const show_views = await View.find_table_views_where(
            context.table_id,
            ({ state_fields, viewrow }) =>
              viewrow.name !== context.viewname &&
              state_fields.some((sf) => sf.name === "id")
          );

          return new Form({
            fields: [
              {
                name: "start_field",
                label: req.__("Start date field"),
                type: "String",
                required: true,
                attributes: { options: dateFields.map((f) => f.name) },
              },
              {
                name: "end_field",
                label: req.__("End date field"),
                type: "String",
                required: true,
                attributes: { options: dateFields.map((f) => f.name) },
              },
              {
                name: "label_field",
                label: req.__("Label field"),
                sublabel: req.__("Field shown in the row label column and on the bar"),
                type: "String",
                required: true,
                attributes: { options: allFields.map((f) => f.name) },
              },
              {
                name: "color_field",
                label: req.__("Color field"),
                sublabel: req.__(
                  "Optional String field — values primary/success/warning/danger/info/secondary colour the bar"
                ),
                type: "String",
                required: false,
                attributes: {
                  options: [
                    { label: req.__("None"), value: "" },
                    ...stringFields.map((f) => f.name),
                  ],
                },
              },
              {
                name: "window_days",
                label: req.__("Window (days)"),
                sublabel: req.__("Number of days shown across the timeline (default: 30)"),
                type: "Integer",
                required: false,
              },
              {
                name: "show_view",
                label: req.__("Bar detail view"),
                sublabel: req.__("Optional: clicking a bar opens this view in a modal"),
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
                label: req.__("Minimum role to drag bars"),
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
    start_field,
    end_field,
    label_field,
    color_field,
    window_days: windowDaysRaw,
    show_view,
    min_role,
  } = cfg || {};

  if (!start_field || !end_field || !label_field) {
    return div(
      { class: "alert alert-warning" },
      "FlowTimeline: start_field, end_field, and label_field are required."
    );
  }

  const windowDays = parseInt(windowDaysRaw || "30", 10) || 30;

  const Table = scTable();
  const { stateFieldsToWhere, stateFieldsToQuery } = scHelper();
  const table = Table.findOne({ id: parseInt(table_id, 10) });
  const pk_name = table.pk_name;
  const fields = table.getFields();

  // window start from state or today
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const winStart = state._tl_start
    ? new Date(state._tl_start)
    : now;
  winStart.setHours(0, 0, 0, 0);
  const winEnd = addDays(winStart, windowDays);

  const where = stateFieldsToWhere({ fields, state, table });
  const q = stateFieldsToQuery({ state, fields });
  const rows = await table.getRows(where, {
    ...q,
    forUser: req.user,
    forPublic: !req.user,
  });

  const role = req.user ? req.user.role_id : 100;
  const canDrag = role <= parseInt(min_role || "80", 10);

  // ── build column header dates ───────────────────────────────────────────────
  const headerDates = [];
  for (let d = new Date(winStart); d < winEnd; d = addDays(d, 1)) {
    headerDates.push(new Date(d));
  }

  const todayStr = isoDate(now);

  // ── day column header ───────────────────────────────────────────────────────
  const headerHtml = div(
    { class: "sc-flowtl-row sc-flowtl-header-row" },
    div({ class: "sc-flowtl-label-col sc-flowtl-header-label text-muted small" }, ""),
    div(
      { class: "sc-flowtl-grid-col" },
      div(
        {
          class: "sc-flowtl-day-headers",
          style: `grid-template-columns: repeat(${windowDays}, 1fr)`,
        },
        ...headerDates.map((d) => {
          const iso = isoDate(d);
          const isToday = iso === todayStr;
          return div(
            {
              class:
                "sc-flowtl-day-header text-center small" +
                (isToday ? " sc-flowtl-today-col fw-bold text-primary" : " text-muted"),
            },
            d.getDate() === 1 || d.getDay() === 0
              ? `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
              : String(d.getDate())
          );
        })
      )
    )
  );

  // ── row HTML ────────────────────────────────────────────────────────────────
  const COLOR_MAP = {
    Urgent: "danger", High: "warning", Medium: "info", Low: "secondary",
    Done: "success", "In Progress": "primary", "To Do": "light",
    danger: "danger", warning: "warning", info: "info", success: "success",
    primary: "primary", secondary: "secondary",
  };
  const rowHtml = (row) => {
    const label = String(row[label_field] ?? row[pk_name]);
    const rawColor = color_field && row[color_field] ? String(row[color_field]) : "primary";
    const color = COLOR_MAP[rawColor] || "primary";

    const startRaw = row[start_field] ? new Date(row[start_field]) : null;
    const endRaw = row[end_field] ? new Date(row[end_field]) : null;

    let barStyle = "";
    if (startRaw && endRaw) {
      const clampedStart = startRaw < winStart ? winStart : startRaw;
      const clampedEnd = endRaw > winEnd ? winEnd : endRaw;
      if (clampedStart < clampedEnd) {
        const colStart = daysBetween(winStart, clampedStart) + 1;
        const colEnd = daysBetween(winStart, clampedEnd) + 1;
        barStyle = `grid-column: ${colStart} / ${colEnd};`;
      }
    }

    const duration = startRaw && endRaw ? daysBetween(startRaw, endRaw) : 0;

    const barContent = div(
      {
        class: `sc-flowtl-bar badge bg-${color}` + (canDrag ? " sc-flowtl-draggable" : ""),
        style: barStyle || "display:none",
        "data-id": String(row[pk_name]),
        "data-start": startRaw ? isoDate(startRaw) : "",
        "data-duration": String(duration),
        "data-viewname": viewname,
        title: `${label} ${startRaw ? isoDate(startRaw) : "?"} → ${endRaw ? isoDate(endRaw) : "?"}`,
      },
      show_view
        ? a(
            {
              href: "javascript:void(0)",
              "data-sc-modal": `/view/${show_view}?id=${row[pk_name]}`,
              class: "text-white text-decoration-none",
            },
            text(label)
          )
        : text(label)
    );

    return div(
      { class: "sc-flowtl-row" },
      div(
        { class: "sc-flowtl-label-col small text-truncate pe-2" },
        text(label)
      ),
      div(
        {
          class: "sc-flowtl-grid-col",
          style: `grid-template-columns: repeat(${windowDays}, 1fr)`,
        },
        ...(barStyle ? [barContent] : [])
      )
    );
  };

  // ── nav ─────────────────────────────────────────────────────────────────────
  const prevStart = isoDate(addDays(winStart, -windowDays));
  const nextStart = isoDate(addDays(winStart, windowDays));

  const navBar = div(
    { class: "sc-flowtl-nav d-flex align-items-center justify-content-between mb-2" },
    a(
      {
        href: `?_tl_start=${prevStart}`,
        class: "btn btn-sm btn-outline-secondary",
      },
      "‹"
    ),
    span(
      { class: "fw-semibold small text-muted" },
      `${isoDate(winStart)} — ${isoDate(addDays(winEnd, -1))}`
    ),
    a(
      {
        href: `?_tl_start=${nextStart}`,
        class: "btn btn-sm btn-outline-secondary",
      },
      "›"
    )
  );

  const tlId = `sc-flowtl-${viewname.replace(/\W/g, "_")}`;

  const tlHtml = div(
    { class: "sc-flowtl-wrapper", id: tlId },
    navBar,
    div(
      { class: "sc-flowtl-board" },
      headerHtml,
      ...rows.map(rowHtml)
    )
  );

  if (!canDrag) return tlHtml;

  // ── drag script ─────────────────────────────────────────────────────────────
  // Bars are draggable horizontally. We use mouse events (not SortableJS)
  // because SortableJS is list-oriented — horizontal pixel drag is more natural
  // for Gantt bars. We track mousedown, mousemove, mouseup and compute the
  // day offset from the drag delta.
  const dragScript = script(
    domReady(`
(function() {
  var tl = document.getElementById(${JSON.stringify(tlId)});
  if (!tl) return;

  var DAY_PX = null; // computed once on first drag

  function getDayWidth() {
    if (DAY_PX) return DAY_PX;
    var headers = tl.querySelectorAll('.sc-flowtl-day-header');
    if (headers.length > 1) DAY_PX = headers[1].getBoundingClientRect().left - headers[0].getBoundingClientRect().left;
    return DAY_PX || 32;
  }

  tl.querySelectorAll('.sc-flowtl-draggable').forEach(function(bar) {
    var startX = 0;
    var origStart = '';
    var duration = 0;
    var dragging = false;

    bar.addEventListener('mousedown', function(e) {
      if (e.target.closest('a[data-sc-modal]')) return; // let modal link through
      e.preventDefault();
      dragging = true;
      startX = e.clientX;
      origStart = bar.getAttribute('data-start');
      duration = parseInt(bar.getAttribute('data-duration') || '1', 10);
      bar.style.opacity = '0.6';
      bar.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dayOffset = Math.round(dx / getDayWidth());
      bar.setAttribute('data-drag-offset', dayOffset);
      bar.style.transform = 'translateX(' + (dayOffset * getDayWidth()) + 'px)';
    });

    document.addEventListener('mouseup', function(e) {
      if (!dragging) return;
      dragging = false;
      bar.style.opacity = '';
      bar.style.cursor = '';
      bar.style.transform = '';

      var dayOffset = parseInt(bar.getAttribute('data-drag-offset') || '0', 10);
      bar.removeAttribute('data-drag-offset');
      if (dayOffset === 0) return;

      var orig = new Date(origStart);
      var newStart = new Date(orig);
      newStart.setDate(newStart.getDate() + dayOffset);
      var newStartIso = newStart.toISOString().slice(0, 10);
      var newEnd = new Date(newStart);
      newEnd.setDate(newEnd.getDate() + duration);
      var newEndIso = newEnd.toISOString().slice(0, 10);

      var id = bar.getAttribute('data-id');
      var vn = bar.getAttribute('data-viewname');

      fetch('/view/' + vn + '/reschedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': _sc_get_csrf_token(),
        },
        body: JSON.stringify({ id: id, start: newStartIso, end: newEndIso }),
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.error) notifyAlert({ type: 'danger', text: data.error });
          else location.reload();
        })
        .catch(function() { location.reload(); });
    });
  });
})();
`)
  );

  return tlHtml + dragScript;
};

// ─── route: reschedule ────────────────────────────────────────────────────────

const reschedule = async (
  table_id,
  _vn,
  { start_field, end_field, min_role },
  body,
  { req }
) => {
  const role = req.user ? req.user.role_id : 100;
  if (role > parseInt(min_role || "80", 10))
    return { json: { error: "Not authorized" } };

  const { id, start, end } = body;
  if (!id || !start || !end)
    return { json: { error: "Missing id, start, or end" } };

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(start) || !dateRe.test(end))
    return { json: { error: "Invalid date format" } };

  if (new Date(start) >= new Date(end))
    return { json: { error: "Start must be before end" } };

  const table = scTable().findOne({ id: parseInt(table_id, 10) });
  try {
    await table.updateRow(
      { [start_field]: start, [end_field]: end },
      parseInt(id, 10),
      req.user
    );
    return { json: { success: true } };
  } catch (e) {
    return { json: { error: e.message || "Reschedule failed" } };
  }
};

// ─── export ───────────────────────────────────────────────────────────────────

module.exports = {
  name: "FlowTimeline",
  description:
    "Horizontal Gantt timeline — items shown as bars spanning start_date to end_date. Drag a bar left/right to shift both dates while preserving duration.",
  configuration_workflow,
  run,
  get_state_fields,
  routes: { reschedule },
  getStringsForI18n() { return []; },
};
