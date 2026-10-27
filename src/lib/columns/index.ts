import { statusModule, priorityModule } from "./status";
import { peopleModule } from "./people";
import { dateModule, timelineModule } from "./date";
import { numbersModule } from "./numbers";
import { textModule, longTextModule } from "./text";
import { dropdownModule, tagsModule } from "./dropdown";
import { checkboxModule } from "./checkbox";
import { linkModule } from "./link";
import { filesModule } from "./files";
import { progressModule } from "./progress";
import { creationLogModule, lastUpdatedModule } from "./derived";
import type { ColumnModule, ColumnType } from "./types";

export const columnModules: Record<ColumnType, ColumnModule> = {
  status: statusModule,
  priority: priorityModule,
  people: peopleModule,
  date: dateModule,
  timeline: timelineModule,
  numbers: numbersModule,
  text: textModule,
  long_text: longTextModule,
  dropdown: dropdownModule,
  tags: tagsModule,
  checkbox: checkboxModule,
  link: linkModule,
  files: filesModule,
  progress: progressModule,
  creation_log: creationLogModule,
  last_updated: lastUpdatedModule,
};

/** Column center order: essentials first, then the rest. */
export const columnCenter = Object.values(columnModules).sort((a, b) => Number(a.group === "more") - Number(b.group === "more"));

export const moduleFor = (type: string) => columnModules[type as ColumnType] ?? textModule;

export * from "./types";
