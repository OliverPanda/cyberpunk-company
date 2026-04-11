import type { CLIAdapterModule } from "@cyberpunk-company/adapter-utils";
import { printProcessStdoutEvent } from "./format-event.js";

export const processCLIAdapter: CLIAdapterModule = {
  type: "process",
  formatStdoutEvent: printProcessStdoutEvent,
};
