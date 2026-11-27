import { useSyncExternalStore } from "react";
import { guardedLocalStorage } from "../storage/guarded.ts";
import { DEFAULT_BOAT_CONFIG, parseBoatConfig, type BoatConfig } from "./config.ts";

const KEY = "doriface.boat.config";

function readStored(): BoatConfig {
  const raw = guardedLocalStorage().getItem(KEY);
  if (raw === null) return DEFAULT_BOAT_CONFIG;
  try {
    return parseBoatConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_BOAT_CONFIG;
  }
}

class BoatConfigStore {
  #value = readStored();
  readonly #listeners = new Set<() => void>();

  get value(): BoatConfig {
    return this.#value;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  update(patch: Partial<BoatConfig>): void {
    this.#value = parseBoatConfig({ ...this.#value, ...patch });
    guardedLocalStorage().setItem(KEY, JSON.stringify(this.#value));
    for (const listener of this.#listeners) listener();
  }

  reset(): void {
    this.#value = DEFAULT_BOAT_CONFIG;
    guardedLocalStorage().removeItem(KEY);
    for (const listener of this.#listeners) listener();
  }
}

export const boatConfigStore = new BoatConfigStore();

export function useBoatConfig(): BoatConfig {
  return useSyncExternalStore(boatConfigStore.subscribe, () => boatConfigStore.value);
}
