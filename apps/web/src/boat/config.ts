export type BoatVmSize = "small" | "default" | "large" | "xlarge";
export type BoatNetworkMode = "environment" | "open" | "deny";

export interface BoatVmSizeOption {
  readonly value: BoatVmSize;
  readonly label: string;
  readonly specs: string;
}

/** Machine types accepted by `boat new --type`. */
export const BOAT_VM_SIZES: readonly BoatVmSizeOption[] = [
  { value: "small", label: "Small", specs: "2 vCPU · 4 GB RAM" },
  { value: "default", label: "Default", specs: "4 vCPU · 8 GB RAM" },
  { value: "large", label: "Large", specs: "8 vCPU · 16 GB RAM" },
  { value: "xlarge", label: "XLarge", specs: "16 vCPU · 32 GB RAM" },
] as const;

export const BOAT_NETWORK_MODES = [
  { value: "environment", label: "Default" },
  { value: "open", label: "Open" },
  { value: "deny", label: "Deny" },
] as const satisfies readonly { readonly value: BoatNetworkMode; readonly label: string }[];

export interface BoatConfig {
  /** Machine size passed to `boat new --type`. */
  readonly size: BoatVmSize;
  /** Named Boat environment (`--environment`); empty uses the account default (`base`). */
  readonly environment: string;
  /** Whether the sandbox auto-stops after idle/TTL; false passes `--no-auto-stop`. */
  readonly autoStop: boolean;
  /** Lifetime in minutes (`--ttl <seconds>`); empty uses Boat's default. */
  readonly ttlMinutes: string;
  /** Optional saved snapshot name or `bsh_...` share code (`--from`). */
  readonly from: string;
  /** Outbound network policy (`--network`); `environment` leaves Boat's default in charge. */
  readonly network: BoatNetworkMode;
  /** Whether background/stop snapshots stay enabled; false passes `--no-snapshots`. */
  readonly snapshots: boolean;
  /** Stop the sandbox via `boat stop` after the SSH session exits. */
  readonly stopOnExit: boolean;
  /** Optional organization billing scope (`--org`). */
  readonly org: string;
  /** Boat CLI binary name or absolute path. */
  readonly binary: string;
  /** Additional flags appended to `boat new`. */
  readonly extraArgs: string;
}

export const DEFAULT_BOAT_CONFIG: BoatConfig = {
  size: "default",
  environment: "",
  autoStop: true,
  ttlMinutes: "",
  from: "",
  network: "environment",
  snapshots: true,
  stopOnExit: false,
  org: "",
  binary: "",
  extraArgs: "",
};

const DEFAULT_BINARY = "boat";

const SIZES: readonly BoatVmSize[] = BOAT_VM_SIZES.map((entry) => entry.value);
const NETWORKS: readonly BoatNetworkMode[] = BOAT_NETWORK_MODES.map((entry) => entry.value);

const text = (record: object, key: string): string | undefined => {
  const value: unknown = Reflect.get(record, key);
  return typeof value === "string" ? value : undefined;
};

const flag = (record: object, key: string): boolean | undefined => {
  const value: unknown = Reflect.get(record, key);
  return typeof value === "boolean" ? value : undefined;
};

/** Parses stored JSON into a valid BoatConfig, filling any missing or invalid fields with defaults. */
export function parseBoatConfig(stored: unknown): BoatConfig {
  if (typeof stored !== "object" || stored === null) return DEFAULT_BOAT_CONFIG;
  const size = SIZES.find((entry) => entry === text(stored, "size")) ?? DEFAULT_BOAT_CONFIG.size;
  const network = NETWORKS.find((entry) => entry === text(stored, "network")) ?? DEFAULT_BOAT_CONFIG.network;
  return {
    size,
    environment: text(stored, "environment") ?? DEFAULT_BOAT_CONFIG.environment,
    autoStop: flag(stored, "autoStop") ?? DEFAULT_BOAT_CONFIG.autoStop,
    ttlMinutes: text(stored, "ttlMinutes") ?? DEFAULT_BOAT_CONFIG.ttlMinutes,
    from: text(stored, "from") ?? DEFAULT_BOAT_CONFIG.from,
    network,
    snapshots: flag(stored, "snapshots") ?? DEFAULT_BOAT_CONFIG.snapshots,
    stopOnExit: flag(stored, "stopOnExit") ?? DEFAULT_BOAT_CONFIG.stopOnExit,
    org: text(stored, "org") ?? DEFAULT_BOAT_CONFIG.org,
    binary: text(stored, "binary") ?? DEFAULT_BOAT_CONFIG.binary,
    extraArgs: text(stored, "extraArgs") ?? DEFAULT_BOAT_CONFIG.extraArgs,
  };
}

/** Splits shell-style extra arguments (supports single/double quotes and backslash escapes). */
export function splitArgs(input: string): readonly string[] {
  const args: string[] = [];
  let current = "";
  let inToken = false;
  let quote: "'" | '"' | null = null;
  let escape = false;
  for (const ch of input) {
    if (escape) {
      current += ch;
      inToken = true;
      escape = false;
      continue;
    }
    if (quote === "'") {
      if (ch === "'") quote = null;
      else current += ch;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      inToken = true;
      continue;
    }
    if (quote === '"') {
      if (ch === '"') quote = null;
      else current += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      inToken = true;
      continue;
    }
    if (/\s/.test(ch)) {
      if (inToken) {
        args.push(current);
        current = "";
        inToken = false;
      }
      continue;
    }
    current += ch;
    inToken = true;
  }
  if (escape) current += "\\";
  if (inToken) args.push(current);
  return args;
}

/** POSIX single-quote escaping for shell commands. */
export function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:=,@+-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

/** Positive TTL in seconds parsed from `ttlMinutes`, or null when empty/invalid. */
export function parsedTtlSeconds(ttlMinutes: string): number | null {
  const trimmed = ttlMinutes.trim();
  if (trimmed === "" || !/^\d+$/.test(trimmed)) return null;
  const minutes = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(minutes) && minutes > 0 ? minutes * 60 : null;
}

const resolvedBinary = (config: BoatConfig): string => {
  const trimmed = config.binary.trim();
  return trimmed === "" ? DEFAULT_BINARY : trimmed;
};

/** Arguments passed to `boat new` (excluding the binary itself). */
export function boatNewArgs(config: BoatConfig): readonly string[] {
  const args: string[] = ["new", "--no-update", "--type", config.size];
  const env = config.environment.trim();
  if (env !== "") args.push("--environment", env);
  if (!config.autoStop) {
    args.push("--no-auto-stop");
  } else {
    const ttl = parsedTtlSeconds(config.ttlMinutes);
    if (ttl !== null) args.push("--ttl", String(ttl));
  }
  const from = config.from.trim();
  if (from !== "") args.push("--from", from);
  if (config.network !== "environment") args.push("--network", config.network);
  if (!config.snapshots) args.push("--no-snapshots");
  const org = config.org.trim();
  if (org !== "") args.push("--org", org);
  const extra = splitArgs(config.extraArgs);
  if (extra.length > 0) args.push(...extra);
  return args;
}

/** Arguments passed to `boat ssh` (before the sandbox ID). */
export function boatSshBaseArgs(config: BoatConfig): readonly string[] {
  const args: string[] = ["ssh", "--no-update"];
  const org = config.org.trim();
  if (org !== "") args.push("--org", org);
  return args;
}

/** Arguments passed to `boat stop` (before the sandbox ID). */
export function boatStopBaseArgs(config: BoatConfig): readonly string[] {
  const args: string[] = ["stop", "--no-update"];
  const org = config.org.trim();
  if (org !== "") args.push("--org", org);
  return args;
}

/**
 * Shell command executed in a new terminal tab (`terminal.run` `line`) to provision a boat.dev sandbox
 * and attach an interactive SSH session to it.
 */
export function boatCommandLine(config: BoatConfig): string {
  const bin = resolvedBinary(config);
  const quotedBin = shellQuote(bin);
  const newCmd = [quotedBin, ...boatNewArgs(config).map(shellQuote)].join(" ");
  const sshCmd = [quotedBin, ...boatSshBaseArgs(config).map(shellQuote)].join(" ");
  const stopCmd = [quotedBin, ...boatStopBaseArgs(config).map(shellQuote)].join(" ");
  const sizeSpec = BOAT_VM_SIZES.find((entry) => entry.value === config.size);
  const banner = sizeSpec === undefined ? config.size : `${config.size} (${sizeSpec.specs})`;
  const connect = config.stopOnExit
    ? `${sshCmd} "$id"; status=$?; printf '\\nStopping %s...\\n' "$id"; ${stopCmd} "$id"; exit "$status"`
    : `exec ${sshCmd} "$id"`;

  return [
    'export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"',
    `if ! command -v ${quotedBin} >/dev/null 2>&1; then printf 'boat CLI not found (%s). Install it from https://boat.dev or set its path in Settings > Boat.dev.\\n' ${quotedBin} >&2; exit 127; fi`,
    `printf 'Creating boat.dev sandbox (%s)...\\n' ${shellQuote(banner)}`,
    `out=$(${newCmd}) || { status=$?; [ -n "$out" ] && printf '%s\\n' "$out" >&2; exit "$status"; }`,
    `id=$(printf '%s\\n' "$out" | grep -oE 'bx_[A-Za-z0-9_-]+' | tail -n 1)`,
    `if [ -z "$id" ]; then printf 'Could not read sandbox ID from boat output:\\n%s\\n' "$out" >&2; exit 1; fi`,
    `printf 'Connecting to %s...\\n' "$id"`,
    connect,
  ].join("; ");
}

/** Short human-readable preview of the configured Boat.dev launch command for Settings. */
export function boatCommandPreview(config: BoatConfig): string {
  const bin = resolvedBinary(config);
  const newArgs = boatNewArgs(config)
    .filter((arg) => arg !== "--no-update")
    .map(shellQuote);
  const sshArgs = boatSshBaseArgs(config)
    .filter((arg) => arg !== "--no-update")
    .map(shellQuote);
  const base = `${shellQuote(bin)} ${newArgs.join(" ")} && ${shellQuote(bin)} ${sshArgs.join(" ")} <id>`;
  if (!config.stopOnExit) return base;
  const stopArgs = boatStopBaseArgs(config)
    .filter((arg) => arg !== "--no-update")
    .map(shellQuote);
  return `${base}; ${shellQuote(bin)} ${stopArgs.join(" ")} <id>`;
}

/** Label shown on a tab opened via Boat.dev. */
export function boatTabTitle(config: BoatConfig): string {
  return config.size === "default" ? "boat.dev" : `boat.dev · ${config.size}`;
}

/** Whether every option matches `DEFAULT_BOAT_CONFIG`. */
export function isDefaultBoatConfig(config: BoatConfig): boolean {
  return (
    config.size === DEFAULT_BOAT_CONFIG.size &&
    config.environment.trim() === DEFAULT_BOAT_CONFIG.environment &&
    config.autoStop === DEFAULT_BOAT_CONFIG.autoStop &&
    config.ttlMinutes.trim() === DEFAULT_BOAT_CONFIG.ttlMinutes &&
    config.from.trim() === DEFAULT_BOAT_CONFIG.from &&
    config.network === DEFAULT_BOAT_CONFIG.network &&
    config.snapshots === DEFAULT_BOAT_CONFIG.snapshots &&
    config.stopOnExit === DEFAULT_BOAT_CONFIG.stopOnExit &&
    config.org.trim() === DEFAULT_BOAT_CONFIG.org &&
    resolvedBinary(config) === DEFAULT_BINARY &&
    config.extraArgs.trim() === DEFAULT_BOAT_CONFIG.extraArgs
  );
}
