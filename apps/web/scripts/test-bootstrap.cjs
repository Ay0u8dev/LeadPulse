const os = require("node:os");
const path = require("node:path");

// Some restricted Windows shells cannot resolve the current account through
// uv_os_get_passwd. tsx only needs the username to choose a cache directory.
try {
  os.userInfo();
} catch {
  os.userInfo = () => ({ username: "leadpulse" });
}

// Test workers must never share a developer's CRM-lite database. A per-process
// filename also prevents SQLite schema races when Node runs test files in parallel.
process.env.LEADPULSE_DB_PATH = path.join(
  os.tmpdir(),
  "leadpulse-tests",
  `leadpulse-${process.pid}.db`,
);
