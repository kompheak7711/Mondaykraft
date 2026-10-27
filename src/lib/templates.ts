// The five built-in templates. Our own content. Applied by rpc create_board (see the migration for the definition shape).
// View settings refer to columns with "{col:key}" placeholders that the database swaps for the new column ids.

export type TemplateDefinition = {
  description?: string;
  columns: { key: string; title: string; type: string; scope?: "item" | "subitem"; settings?: Record<string, unknown> }[];
  groups: { title: string; color: string; items?: { name: string; values?: Record<string, unknown>; subitems?: { name: string; values?: Record<string, unknown> }[] }[] }[];
  views?: { type: string; name: string; settings?: Record<string, unknown> }[];
};

export type Template = { key: string; name: string; description: string; category: string; definition: TemplateDefinition };

const label = (id: string, text: string, color: string, is_done = false) => ({ id, label: text, color, is_done });
const statusLabels = [label("todo", "Not started", "gray"), label("working", "Working on it", "orange"), label("stuck", "Stuck", "red"), label("done", "Done", "green", true)];
const priorityLabels = [label("critical", "Critical", "red"), label("high", "High", "orange"), label("medium", "Medium", "blue"), label("low", "Low", "gray")];
const subitemColumns = (prefix: string) => [
  { key: `${prefix}_owner`, title: "Owner", type: "people", scope: "subitem" as const },
  { key: `${prefix}_status`, title: "Status", type: "status", scope: "subitem" as const, settings: { labels: statusLabels } },
  { key: `${prefix}_due`, title: "Due", type: "date", scope: "subitem" as const },
];
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const templates: Template[] = [
  {
    key: "project-tracker",
    name: "Project tracker",
    description: "Phases as groups, owners, priorities, due dates and a timeline. The default for a team project.",
    category: "Work",
    definition: {
      columns: [
        { key: "owner", title: "Owner", type: "people" },
        { key: "status", title: "Status", type: "status", settings: { labels: statusLabels } },
        { key: "priority", title: "Priority", type: "priority", settings: { labels: priorityLabels } },
        { key: "due", title: "Due", type: "date" },
        { key: "timeline", title: "Timeline", type: "timeline" },
        { key: "notes", title: "Notes", type: "long_text" },
        ...subitemColumns("sub"),
      ],
      groups: [
        {
          title: "Planning", color: "blue",
          items: [
            { name: "Write the project brief", values: { status: { label_id: "done" }, priority: { label_id: "high" }, due: { date: day(-3) } }, subitems: [{ name: "Collect requirements", values: { sub_status: { label_id: "done" } } }, { name: "Review with the team" }] },
            { name: "Agree the timeline", values: { status: { label_id: "working" }, priority: { label_id: "medium" }, due: { date: day(2) }, timeline: { from: day(-2), to: day(5) } } },
          ],
        },
        {
          title: "In progress", color: "orange",
          items: [
            { name: "Build the first version", values: { status: { label_id: "working" }, priority: { label_id: "critical" }, timeline: { from: day(0), to: day(14) } } },
            { name: "Set up the test plan", values: { status: { label_id: "todo" }, priority: { label_id: "medium" }, due: { date: day(7) } } },
          ],
        },
        { title: "Done", color: "green", items: [{ name: "Kick-off meeting", values: { status: { label_id: "done" }, due: { date: day(-10) } } }] },
      ],
      views: [
        { type: "kanban", name: "Kanban", settings: { kanban_column_id: "{col:status}", card_column_ids: ["{col:owner}", "{col:due}"] } },
        { type: "timeline", name: "Gantt", settings: { timeline_column_id: "{col:timeline}", color_by: "group" } },
      ],
    },
  },
  {
    key: "task-list",
    name: "Task list",
    description: "A simple list by week with owners, status and due dates. Good for a personal or small-team backlog.",
    category: "Work",
    definition: {
      columns: [
        { key: "owner", title: "Owner", type: "people" },
        { key: "status", title: "Status", type: "status", settings: { labels: statusLabels } },
        { key: "due", title: "Due", type: "date" },
        { key: "priority", title: "Priority", type: "priority", settings: { labels: priorityLabels } },
        { key: "done", title: "Checked", type: "checkbox" },
        ...subitemColumns("sub"),
      ],
      groups: [
        { title: "Today", color: "red", items: [{ name: "Reply to the client", values: { status: { label_id: "working" }, due: { date: day(0) }, priority: { label_id: "high" } } }, { name: "Prepare the stand-up notes", values: { status: { label_id: "todo" }, due: { date: day(0) } } }] },
        { title: "This week", color: "orange", items: [{ name: "Draft the proposal", values: { status: { label_id: "todo" }, due: { date: day(3) }, priority: { label_id: "medium" } } }] },
        { title: "Later", color: "gray", items: [{ name: "Tidy the shared drive", values: { priority: { label_id: "low" } } }] },
      ],
      views: [{ type: "calendar", name: "Calendar", settings: { calendar_column_id: "{col:due}" } }],
    },
  },
  {
    key: "content-calendar",
    name: "Content calendar",
    description: "Posts by month with a channel, a publish date and a link to the draft. Calendar view included.",
    category: "Marketing",
    definition: {
      columns: [
        { key: "owner", title: "Writer", type: "people" },
        { key: "status", title: "Status", type: "status", settings: { labels: [label("idea", "Idea", "gray"), label("drafting", "Drafting", "orange"), label("review", "In review", "purple"), label("scheduled", "Scheduled", "blue"), label("published", "Published", "green", true)] } },
        { key: "channel", title: "Channel", type: "dropdown", settings: { options: [{ id: "blog", label: "Blog", color: "blue" }, { id: "newsletter", label: "Newsletter", color: "teal" }, { id: "social", label: "Social", color: "pink" }, { id: "video", label: "Video", color: "red" }] } },
        { key: "publish", title: "Publish date", type: "date" },
        { key: "link", title: "Draft", type: "link" },
        { key: "timeline", title: "Production", type: "timeline" },
      ],
      groups: [
        { title: "This month", color: "purple", items: [{ name: "Launch announcement", values: { status: { label_id: "review" }, channel: { ids: ["blog", "newsletter"] }, publish: { date: day(4) }, timeline: { from: day(-5), to: day(4) } } }, { name: "Customer story: Acme", values: { status: { label_id: "drafting" }, channel: { ids: ["blog"] }, publish: { date: day(12) } } }] },
        { title: "Next month", color: "sky", items: [{ name: "How we plan a quarter", values: { status: { label_id: "idea" }, channel: { ids: ["video"] }, publish: { date: day(35) } } }] },
      ],
      views: [{ type: "calendar", name: "Calendar", settings: { calendar_column_id: "{col:publish}" } }, { type: "kanban", name: "Pipeline", settings: { kanban_column_id: "{col:status}", card_column_ids: ["{col:owner}", "{col:publish}"] } }],
    },
  },
  {
    key: "bug-tracker",
    name: "Bug tracker",
    description: "Reports with severity, an assignee, reproduction steps and a fixed column. Open and fixed groups.",
    category: "Product",
    definition: {
      columns: [
        { key: "reporter", title: "Reporter", type: "people", settings: { max: 1 } },
        { key: "assignee", title: "Assignee", type: "people" },
        { key: "severity", title: "Severity", type: "priority", settings: { labels: priorityLabels } },
        { key: "status", title: "Status", type: "status", settings: { labels: [label("new", "New", "gray"), label("confirmed", "Confirmed", "orange"), label("progress", "In progress", "blue"), label("fixed", "Fixed", "green", true), label("wontfix", "Won't fix", "brown", true)] } },
        { key: "steps", title: "Steps to reproduce", type: "long_text" },
        { key: "reported", title: "Reported", type: "date" },
        { key: "regression", title: "Regression", type: "checkbox" },
        { key: "tags", title: "Area", type: "tags" },
      ],
      groups: [
        { title: "Open", color: "red", items: [{ name: "Saving a cell twice shows a stale value", values: { severity: { label_id: "high" }, status: { label_id: "confirmed" }, reported: { date: day(-1) }, steps: { text: "1. Edit a status\n2. Edit it again within a second\n3. The first value flashes back" } } }, { name: "Kanban cards overlap at 390px", values: { severity: { label_id: "medium" }, status: { label_id: "new" }, reported: { date: day(0) } } }] },
        { title: "Fixed", color: "green", items: [{ name: "Date picker ignores the time zone", values: { severity: { label_id: "critical" }, status: { label_id: "fixed" }, reported: { date: day(-9) }, regression: { checked: false } } }] },
      ],
      views: [{ type: "kanban", name: "By status", settings: { kanban_column_id: "{col:status}", card_column_ids: ["{col:assignee}", "{col:severity}"] } }, { type: "chart", name: "Severity", settings: { chart: { type: "bar", x_column_id: "{col:severity}", y_fn: "count" } } }],
    },
  },
  {
    key: "crm-lite",
    name: "CRM lite",
    description: "Deals through a pipeline with a value, a close date and a contact. A sum footer and a chart by stage.",
    category: "Sales",
    definition: {
      columns: [
        { key: "owner", title: "Owner", type: "people", settings: { max: 1 } },
        { key: "stage", title: "Stage", type: "status", settings: { labels: [label("lead", "Lead", "gray"), label("contacted", "Contacted", "sky"), label("proposal", "Proposal", "purple"), label("won", "Won", "green", true), label("lost", "Lost", "red", true)] } },
        { key: "value", title: "Value", type: "numbers", settings: { unit: "$", unit_position: "prefix", decimals: 0, summary: "sum" } },
        { key: "close", title: "Close date", type: "date" },
        { key: "contact", title: "Contact", type: "text" },
        { key: "site", title: "Website", type: "link" },
        { key: "notes", title: "Notes", type: "long_text" },
      ],
      groups: [
        { title: "Pipeline", color: "blue", items: [{ name: "Northwind renewal", values: { stage: { label_id: "proposal" }, value: { number: 12000 }, close: { date: day(10) }, contact: { text: "Dana Whitfield" } } }, { name: "Bluebird onboarding", values: { stage: { label_id: "contacted" }, value: { number: 4500 }, close: { date: day(21) } } }, { name: "Harbor Labs pilot", values: { stage: { label_id: "lead" }, value: { number: 8000 } } }] },
        { title: "Closed", color: "green", items: [{ name: "Summit Co. annual plan", values: { stage: { label_id: "won" }, value: { number: 18000 }, close: { date: day(-4) } } }] },
      ],
      views: [{ type: "kanban", name: "Pipeline", settings: { kanban_column_id: "{col:stage}", card_column_ids: ["{col:owner}", "{col:value}"] } }, { type: "chart", name: "Value by stage", settings: { chart: { type: "bar", x_column_id: "{col:stage}", y_fn: "sum", y_column_id: "{col:value}" } } }],
    },
  },
];
