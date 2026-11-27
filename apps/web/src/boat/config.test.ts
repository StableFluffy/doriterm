import { describe, expect, test } from "bun:test";
import {
  boatCommandLine,
  boatCommandPreview,
  boatNewArgs,
  boatTabTitle,
  DEFAULT_BOAT_CONFIG,
  isDefaultBoatConfig,
  parseBoatConfig,
  parsedTtlSeconds,
  shellQuote,
  splitArgs,
} from "./config.ts";

describe("boat.dev config", () => {
  test("parses missing or invalid values as defaults", () => {
    expect(parseBoatConfig(null)).toEqual(DEFAULT_BOAT_CONFIG);
    expect(parseBoatConfig("bad")).toEqual(DEFAULT_BOAT_CONFIG);
    expect(parseBoatConfig({ size: "huge", network: "custom", binary: "" })).toEqual(DEFAULT_BOAT_CONFIG);
  });

  test("preserves valid stored fields", () => {
    const parsed = parseBoatConfig({
      size: "large",
      environment: "dev",
      autoStop: false,
      ttlMinutes: "60",
      from: "snap-1",
      network: "open",
      snapshots: false,
      stopOnExit: true,
      org: "acme",
      binary: "/usr/local/bin/boat",
      extraArgs: "--fail-fast --host 3000",
    });
    expect(parsed).toEqual({
      size: "large",
      environment: "dev",
      autoStop: false,
      ttlMinutes: "60",
      from: "snap-1",
      network: "open",
      snapshots: false,
      stopOnExit: true,
      org: "acme",
      binary: "/usr/local/bin/boat",
      extraArgs: "--fail-fast --host 3000",
    });
  });

  test("builds default boat new args cleanly", () => {
    expect(boatNewArgs(DEFAULT_BOAT_CONFIG)).toEqual(["new", "--no-update", "--type", "default"]);
    expect(boatCommandPreview(DEFAULT_BOAT_CONFIG)).toBe("boat new --type default && boat ssh <id>");
    expect(boatTabTitle(DEFAULT_BOAT_CONFIG)).toBe("boat.dev");
    expect(isDefaultBoatConfig(DEFAULT_BOAT_CONFIG)).toBe(true);
  });

  test("maps all configured flags onto boat new and boat ssh", () => {
    const config = {
      ...DEFAULT_BOAT_CONFIG,
      size: "xlarge" as const,
      environment: "prod",
      ttlMinutes: "30",
      from: "bsh_abc",
      network: "deny" as const,
      snapshots: false,
      stopOnExit: true,
      org: "my-org",
      extraArgs: '--name "my box" --fail-fast',
    };
    expect(boatNewArgs(config)).toEqual([
      "new",
      "--no-update",
      "--type",
      "xlarge",
      "--environment",
      "prod",
      "--ttl",
      "1800",
      "--from",
      "bsh_abc",
      "--network",
      "deny",
      "--no-snapshots",
      "--org",
      "my-org",
      "--name",
      "my box",
      "--fail-fast",
    ]);
    const line = boatCommandLine(config);
    expect(line).toContain("boat new --no-update --type xlarge");
    expect(line).toContain("--name 'my box'");
    expect(line).toContain('boat ssh --no-update --org my-org "$id"');
    expect(line).toContain('boat stop --no-update --org my-org "$id"');
    expect(boatTabTitle(config)).toBe("boat.dev · xlarge");
    expect(isDefaultBoatConfig(config)).toBe(false);
  });

  test("uses --no-auto-stop instead of --ttl when auto-stop is disabled", () => {
    const args = boatNewArgs({ ...DEFAULT_BOAT_CONFIG, autoStop: false, ttlMinutes: "45" });
    expect(args).toContain("--no-auto-stop");
    expect(args).not.toContain("--ttl");
  });

  test("handles shell quoting, TTL parsing, and argument splitting", () => {
    expect(shellQuote("simple-flag")).toBe("simple-flag");
    expect(shellQuote("it's here")).toBe("'it'\\''s here'");
    expect(parsedTtlSeconds("")).toBeNull();
    expect(parsedTtlSeconds("0")).toBeNull();
    expect(parsedTtlSeconds("-5")).toBeNull();
    expect(parsedTtlSeconds("15")).toBe(900);
    expect(splitArgs(`--name "a b" --env 'FOO=bar baz' --fast`)).toEqual([
      "--name",
      "a b",
      "--env",
      "FOO=bar baz",
      "--fast",
    ]);
  });
});
