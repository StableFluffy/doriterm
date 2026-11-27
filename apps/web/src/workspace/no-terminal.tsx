import { Button, EmptyState } from "@doriface/ui";
import { Cloud, SquareTerminal } from "lucide-react";

export function NoTerminal({ onNew, onNewBoat }: { readonly onNew: () => void; readonly onNewBoat?: () => void }) {
  return (
    <EmptyState
      className="flex-1"
      icon={<SquareTerminal aria-hidden />}
      title="No terminal open"
      description="Start a local shell, connect to a Boat.dev sandbox, or pick an agent or space."
      actions={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="primary" onClick={onNew}>
            New terminal
          </Button>
          {onNewBoat === undefined ? null : (
            <Button variant="secondary" onClick={onNewBoat}>
              <Cloud aria-hidden />
              Remote terminal (boat.dev)
            </Button>
          )}
        </div>
      }
    />
  );
}
