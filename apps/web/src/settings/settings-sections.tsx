import {
  Bell,
  Cloud,
  Keyboard,
  Mic,
  MonitorSmartphone,
  Network,
  Palette,
  PanelBottom,
  Plug,
  Sparkles,
  SquareTerminal,
} from "lucide-react";

export const SETTINGS_GROUPS = ["General", "Agents & Integrations", "Devices & Network", "Mobile"] as const;
export type SettingsGroup = (typeof SETTINGS_GROUPS)[number];

/** Settings' sections in grouped order, putting everyday controls first and mobile-only controls at the end. */
export const SECTIONS = [
  { id: "appearance", label: "Appearance", group: "General", icon: <Palette /> },
  { id: "terminal", label: "Terminal", group: "General", icon: <SquareTerminal /> },
  { id: "keybindings", label: "Keybindings", group: "General", icon: <Keyboard /> },
  { id: "notifications", label: "Notifications", group: "General", icon: <Bell /> },
  { id: "skills", label: "Agent Skills", group: "Agents & Integrations", icon: <Sparkles /> },
  { id: "mcp", label: "MCP", group: "Agents & Integrations", icon: <Plug /> },
  { id: "boat", label: "Boat.dev", group: "Agents & Integrations", icon: <Cloud /> },
  { id: "voice", label: "Voice input", group: "Agents & Integrations", icon: <Mic /> },
  { id: "machines", label: "Machines & Mesh", group: "Devices & Network", icon: <Network /> },
  { id: "device", label: "This device", group: "Devices & Network", icon: <MonitorSmartphone /> },
  { id: "keyboard", label: "Phone key bar", group: "Mobile", icon: <PanelBottom /> },
] as const;

export type SettingsSection = (typeof SECTIONS)[number];
export type SectionId = SettingsSection["id"];

/** The id of the Connect a machine group on Machines: connecting a machine joins it to your mesh, so they are one screen. */
export const CONNECT_GROUP = "connect-a-machine";

/**
 * Links that name the Connect a machine group rather than a section: the join page's `#connect`, and `#pair` from when
 * Connect a machine was its own section.
 */
const GROUPS: Readonly<Record<string, { readonly section: SectionId; readonly group: string }>> = {
  pair: { section: "machines", group: CONNECT_GROUP },
  connect: { section: "machines", group: CONNECT_GROUP },
};

/** The section a link's hash asks for, and the group in it to show, else the one Settings opens on by default. */
export function sectionFromLink(hash: string): { readonly section: SectionId; readonly group?: string } {
  const asked = hash.replace(/^#/, "");
  const group = Object.hasOwn(GROUPS, asked) ? GROUPS[asked] : undefined;
  if (group !== undefined) return group;
  const section = SECTIONS.find((entry) => entry.id === asked);
  return { section: section === undefined ? "appearance" : section.id };
}
