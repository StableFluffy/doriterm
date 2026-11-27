import { Button, Input, SegmentedControl, SettingRow, Switch } from "@doriface/ui";
import {
  BOAT_NETWORK_MODES,
  BOAT_VM_SIZES,
  boatCommandPreview,
  isDefaultBoatConfig,
  parsedTtlSeconds,
  type BoatNetworkMode,
  type BoatVmSize,
} from "../boat/config.ts";
import { boatConfigStore, useBoatConfig } from "../boat/store.ts";
import { Subgroup, sectionStackClass } from "./settings-layout.tsx";

const SIZE_OPTIONS = BOAT_VM_SIZES.map(({ value, label }) => ({ value, label }));

/** Settings for launching remote terminals on boat.dev sandboxes. */
export function BoatSection() {
  const config = useBoatConfig();
  const activeSize = BOAT_VM_SIZES.find((entry) => entry.value === config.size);
  const ttlInvalid = config.autoStop && config.ttlMinutes.trim() !== "" && parsedTtlSeconds(config.ttlMinutes) === null;
  const preview = boatCommandPreview(config);

  return (
    <div className={sectionStackClass}>
      <p className="max-w-measure text-prose text-pretty text-muted-foreground">
        Configure defaults for remote terminals opened via Boat.dev from the tab bar&apos;s + menu. Works out of the box
        with the Boat CLI installed and signed in.
      </p>

      <Subgroup title="Virtual machine">
        <SettingRow
          title="VM size"
          description={
            activeSize === undefined
              ? "Machine type passed to boat new --type."
              : `${activeSize.label} — ${activeSize.specs}`
          }
          control={
            <SegmentedControl<BoatVmSize>
              label="VM size"
              value={config.size}
              options={SIZE_OPTIONS}
              onValueChange={(size) => boatConfigStore.update({ size })}
            />
          }
        />
        <SettingRow
          title="Environment"
          description="Named Boat environment (repos, env vars, secrets). Leave empty to use your default environment."
          control={
            <Input
              aria-label="Environment"
              className="w-56"
              placeholder="base (default)"
              value={config.environment}
              onValueChange={(environment) => boatConfigStore.update({ environment })}
            />
          }
        />
        <SettingRow
          title="Snapshot or share code"
          description="Start from a saved snapshot name or a bsh_… share code instead of a fresh VM."
          control={
            <Input
              aria-label="Snapshot or share code"
              mono
              className="w-56"
              placeholder="Fresh sandbox"
              value={config.from}
              onValueChange={(from) => boatConfigStore.update({ from })}
            />
          }
        />
        <SettingRow
          title="Outbound network"
          description="Connections the sandbox may open. Default follows the chosen environment's policy."
          control={
            <SegmentedControl<BoatNetworkMode>
              label="Outbound network"
              value={config.network}
              options={BOAT_NETWORK_MODES}
              onValueChange={(network) => boatConfigStore.update({ network })}
            />
          }
        />
      </Subgroup>

      <Subgroup title="Lifecycle">
        <SettingRow
          inline
          title="Auto-stop"
          description="Automatically stop and snapshot the sandbox after its lifetime expires. Turn off to pass --no-auto-stop."
          control={
            <Switch
              aria-label="Auto-stop"
              checked={config.autoStop}
              onCheckedChange={(autoStop) => boatConfigStore.update({ autoStop })}
            />
          }
        />
        {config.autoStop ? (
          <SettingRow
            title="Lifetime (minutes)"
            description={
              ttlInvalid
                ? "Enter a positive whole number of minutes, or leave empty for Boat's default."
                : "Minutes before the sandbox is eligible for cleanup (--ttl). Leave empty for Boat's default."
            }
            control={
              <Input
                aria-label="Lifetime (minutes)"
                inputMode="numeric"
                className="w-32"
                placeholder="Default"
                invalid={ttlInvalid}
                value={config.ttlMinutes}
                onValueChange={(ttlMinutes) => boatConfigStore.update({ ttlMinutes })}
              />
            }
          />
        ) : (
          <SettingRow
            title="Lifetime (minutes)"
            description="Minutes before the sandbox is eligible for cleanup (--ttl)."
            disabledReason="Auto-stop is off, so no lifetime limit applies."
            control={(reason) => (
              <Input
                aria-label="Lifetime (minutes)"
                className="w-32"
                placeholder="Default"
                value={config.ttlMinutes}
                disabled
                {...reason}
              />
            )}
          />
        )}
        <SettingRow
          inline
          title="Snapshots"
          description="Keep snapshots so stopped sandboxes can be resumed or forked. Turn off to pass --no-snapshots."
          control={
            <Switch
              aria-label="Snapshots"
              checked={config.snapshots}
              onCheckedChange={(snapshots) => boatConfigStore.update({ snapshots })}
            />
          }
        />
        <SettingRow
          inline
          title="Stop sandbox on disconnect"
          description="Run boat stop automatically when you exit the remote SSH session."
          control={
            <Switch
              aria-label="Stop sandbox on disconnect"
              checked={config.stopOnExit}
              onCheckedChange={(stopOnExit) => boatConfigStore.update({ stopOnExit })}
            />
          }
        />
      </Subgroup>

      <Subgroup title="CLI & billing">
        <SettingRow
          title="Organization"
          description="Optional organization billing scope (--org). Leave empty to use your active Boat account."
          control={
            <Input
              aria-label="Organization"
              className="w-56"
              placeholder="Active account"
              value={config.org}
              onValueChange={(org) => boatConfigStore.update({ org })}
            />
          }
        />
        <SettingRow
          title="CLI path"
          description="Command or full path to the boat CLI binary. Defaults to boat (~/.local/bin and Homebrew paths are searched automatically)."
          control={
            <Input
              aria-label="CLI path"
              mono
              className="w-56"
              placeholder="boat"
              value={config.binary}
              onValueChange={(binary) => boatConfigStore.update({ binary })}
            />
          }
        />
        <SettingRow
          title="Extra arguments"
          description="Additional flags appended to boat new (for example --fail-fast or --host 3000)."
          control={
            <Input
              aria-label="Extra arguments"
              mono
              className="w-64"
              placeholder="--fail-fast"
              value={config.extraArgs}
              onValueChange={(extraArgs) => boatConfigStore.update({ extraArgs })}
            />
          }
        />
      </Subgroup>

      <Subgroup title="Command preview">
        <div className="flex flex-col gap-3 py-3">
          <pre className="overflow-x-auto rounded-md border border-border bg-background/60 px-3 py-2 font-mono text-xs text-foreground">
            {preview}
          </pre>
          <div>
            <Button variant="ghost" disabled={isDefaultBoatConfig(config)} onClick={() => boatConfigStore.reset()}>
              Reset Boat.dev settings
            </Button>
          </div>
        </div>
      </Subgroup>
    </div>
  );
}
