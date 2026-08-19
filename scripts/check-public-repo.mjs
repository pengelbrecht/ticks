import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  LEGACY_TRACKER_IDENTITIES,
  PUBLIC_REPO_ALLOWLIST,
} from "./public-repo-allowlist.mjs";

const MAX_ALLOWLIST_ENTRIES = 4;
const MIN_FILLER_PAYLOAD_LENGTH = 16;
const RESERVED_EMAIL_DOMAINS = new Set(["example.com", "example.org", "example.net"]);
const RESERVED_EMAIL_TLDS = new Set(["invalid", "test", "localhost", "example"]);

// Keep these patterns deliberately high-confidence. Documentation examples
// use placeholders such as tkf_... and pbkdf2-sha256$<iterations>$<salt>$<key>,
// while real credential payloads have the lengths below.
const RULES = [
  {
    kind: "factoryToken",
    pattern: /(?<![A-Za-z0-9_])tkf_[A-Za-z0-9_-]{20,}/g,
  },
  {
    kind: "pbkdf2",
    pattern: /(?<![A-Za-z0-9_])pbkdf2-sha256\$[0-9]{4,}\$[A-Za-z0-9_-]{16,}\$[A-Za-z0-9_-]{16,}/g,
  },
  {
    kind: "githubClassic",
    pattern: /(?<![A-Za-z0-9_])gh[opusr]_[A-Za-z0-9]{36,}/g,
  },
  {
    kind: "githubFineGrained",
    pattern: /(?<![A-Za-z0-9_])github_pat_[A-Za-z0-9_]{20,}/g,
  },
  {
    kind: "cloudflare",
    pattern: /(?<![A-Za-z0-9_])(?:cf_|cfk_|cfut_|cfat_)[A-Za-z0-9_-]{20,}/g,
  },
  {
    kind: "doppler",
    pattern:
      /(?<![A-Za-z0-9_])dp\.(?:ct|pt|sa|said|scim|audit)\.[A-Za-z0-9]{40,}|(?<![A-Za-z0-9_])dp\.st\.(?:[a-z0-9_-]{2,35}\.)?[A-Za-z0-9]{40,}/g,
  },
  {
    kind: "account",
    pattern: /(?<![A-Za-z0-9_])[0-9a-f]{32}(?![A-Za-z0-9_])/gi,
  },
  {
    kind: "email",
    pattern: /[A-Za-z0-9][A-Za-z0-9._%+-]*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}/g,
  },
];

function parseArgs(argv) {
  let root;
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "--root") {
      root = argv[++index];
      if (!root) throw new Error("--root requires a directory");
    } else if (argument === "--help" || argument === "-h") {
      console.log("Usage: node scripts/check-public-repo.mjs [--root <git repository>]");
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }

  if (root) return resolve(root);
  return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
}

function validateAllowlist() {
  if (PUBLIC_REPO_ALLOWLIST.length > MAX_ALLOWLIST_ENTRIES) {
    throw new Error(
      `public-repo allowlist has ${PUBLIC_REPO_ALLOWLIST.length} entries; the maximum is ${MAX_ALLOWLIST_ENTRIES}`
    );
  }

  const seen = new Set();
  for (const entry of PUBLIC_REPO_ALLOWLIST) {
    if (
      !entry ||
      typeof entry.path !== "string" ||
      typeof entry.rule !== "string" ||
      typeof entry.literal !== "string" ||
      typeof entry.reason !== "string" ||
      (entry.line !== undefined &&
        (!Number.isInteger(entry.line) || entry.line < 1)) ||
      entry.reason.trim() === ""
    ) {
      throw new Error("every public-repo allowlist entry needs path, rule, literal, and reason");
    }
    const key = `${entry.path}\0${entry.rule}\0${entry.literal}\0${entry.line ?? ""}`;
    if (seen.has(key)) throw new Error(`duplicate public-repo allowlist entry: ${entry.path}`);
    seen.add(key);
  }
}

function trackedFiles(root) {
  const output = execFileSync("git", ["ls-files", "-z"], { cwd: root });
  return output
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

function isReservedEmail(value) {
  const domain = value.slice(value.lastIndexOf("@") + 1).toLowerCase();
  if (RESERVED_EMAIL_DOMAINS.has(domain)) return true;

  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  return RESERVED_EMAIL_TLDS.has(tld);
}

function isNonEmailIdentifier(value) {
  // SSH repository URLs use git@github.com as a host credential, not an
  // operator email address. The surrounding URL remains tracked and scanned.
  return value.toLowerCase() === "git@github.com";
}

function isSyntheticPlaceholder(value) {
  // Detector matches can include a fixed prefix or an example marker before
  // the payload. A sufficiently long terminal run of one character is an
  // explicit filler payload (for example, the zero account IDs and PATs used
  // by fixtures), so it carries no operator-specific information.
  const filler = value.match(/([A-Za-z0-9])\1+$/);
  return filler !== null && filler[0].length >= MIN_FILLER_PAYLOAD_LENGTH;
}

function isLegacyTrackerIdentity(path, line, literal, column) {
  if (!path.startsWith(".tick/")) return false;
  if (!LEGACY_TRACKER_IDENTITIES.includes(literal)) return false;

  // Generated tracker metadata is kept for history, but a matching identity
  // in a note or description must still fail. Only exempt the exact value of
  // an actor/owner/created_by JSON field on this line.
  const metadata = /"(?:actor|owner|created_by)"\s*:\s*"([^"\\]*)"/g;
  for (const match of line.matchAll(metadata)) {
    const value = match[1];
    const valueStart = (match.index ?? 0) + match[0].indexOf(value);
    if (value === literal && column === valueStart) return true;
  }
  return false;
}

function isAllowed(path, kind, literal, line) {
  return PUBLIC_REPO_ALLOWLIST.some(
    (entry) =>
      entry.path === path &&
      entry.rule === kind &&
      entry.literal === literal &&
      (entry.line === undefined || entry.line === line)
  );
}

function redact(value) {
  if (value.length <= 12) return `${value.slice(0, 4)}…`;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export function scanTrackedFiles(root) {
  validateAllowlist();
  const findings = [];
  let textFiles = 0;
  let binaryFiles = 0;
  let symlinkFiles = 0;

  for (const path of trackedFiles(root)) {
    const absolutePath = resolve(root, path);
    if (lstatSync(absolutePath).isSymbolicLink()) {
      // Git tracks the link itself; its target may be a directory (the
      // repository's .claude/skills links are), so there is no file payload to
      // scan here. The target's tracked source path is scanned separately.
      symlinkFiles++;
      continue;
    }
    let source;
    try {
      const buffer = readFileSync(absolutePath);
      if (buffer.includes(0)) {
        binaryFiles++;
        continue;
      }
      source = buffer.toString("utf8");
      textFiles++;
    } catch (error) {
      throw new Error(`could not scan tracked file ${path}: ${error.message}`);
    }

    for (const [lineIndex, line] of source.split(/\r?\n/).entries()) {
      for (const rule of RULES) {
        rule.pattern.lastIndex = 0;
        for (const match of line.matchAll(rule.pattern)) {
          const literal = match[0];
          if (isSyntheticPlaceholder(literal)) continue;
          if (rule.kind === "email" && isReservedEmail(literal)) continue;
          if (rule.kind === "email" && isNonEmailIdentifier(literal)) continue;
          if (
            rule.kind === "email" &&
            isLegacyTrackerIdentity(path, line, literal, match.index ?? 0)
          ) {
            continue;
          }
          if (isAllowed(path, rule.kind, literal, lineIndex + 1)) continue;
          findings.push({
            path,
            line: lineIndex + 1,
            column: (match.index ?? 0) + 1,
            kind: rule.kind,
            literal,
          });
        }
      }
    }
  }

  return { findings, textFiles, binaryFiles, symlinkFiles };
}

function main() {
  const root = parseArgs(process.argv.slice(2));
  const result = scanTrackedFiles(root);

  if (result.findings.length > 0) {
    console.error(`Public-repo guard failed: ${result.findings.length} finding(s)`);
    for (const finding of result.findings) {
      console.error(
        `  ${finding.path}:${finding.line}:${finding.column} [${finding.kind}] ${redact(finding.literal)}`
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Public-repo guard passed: scanned ${result.textFiles} tracked text file(s)` +
      (result.binaryFiles ? `; skipped ${result.binaryFiles} binary file(s)` : "") +
      (result.symlinkFiles ? `; skipped ${result.symlinkFiles} symlink(s)` : "")
  );
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  try {
    main();
  } catch (error) {
    console.error(`Public-repo guard error: ${error.message}`);
    process.exitCode = 2;
  }
}
