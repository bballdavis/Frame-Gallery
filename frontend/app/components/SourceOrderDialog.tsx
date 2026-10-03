import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { ArrowDown as ArrowDownIcon, ArrowUp as ArrowUpIcon } from "@phosphor-icons/react";
import SourceLogo from "./SourceLogo";
import { Button } from "./ui/button";
import type { DiscoverSource } from "~/utils/discoverApi";

interface SourceOrderDialogProps {
  open: boolean;
  /** The sources in use now, free and keyed together, in their current order */
  sources: DiscoverSource[];
  onClose: () => void;
  onSave: (orderedIds: string[]) => void;
}

/**
 * One list for every source in use, whichever section of Settings it is switched on in.
 * Buttons move a source up or down, which works the same with a keyboard or a thumb.
 */
export default function SourceOrderDialog({ open, sources, onClose, onSave }: SourceOrderDialogProps) {
  const [list, setList] = useState<DiscoverSource[]>(sources);

  useEffect(() => {
    if (open) setList(sources);
    // Start from the saved order each time it opens, not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const move = (from: number, to: number) =>
    setList((current) => {
      if (to < 0 || to >= current.length) return current;
      const next = [...current];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-3rem)] w-[min(28rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card p-5 text-card-foreground shadow-lg focus:outline-none">
          <Dialog.Title className="mb-1 text-base font-semibold">Search order</Dialog.Title>
          <Dialog.Description className="mb-3 text-sm text-muted-foreground">
            Results from “All sources” appear in this order, and so do the sources in the picker.
          </Dialog.Description>
          <ol className="-mx-1 flex-1 divide-y divide-border overflow-y-auto px-1">
            {list.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 py-2">
                <span className="w-5 text-right text-sm tabular-nums text-muted-foreground" aria-hidden="true">
                  {i + 1}
                </span>
                <SourceLogo source={s} className="size-8" />
                <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  aria-label={`Move ${s.name} up`}
                >
                  <ArrowUpIcon className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === list.length - 1}
                  onClick={() => move(i, i + 1)}
                  aria-label={`Move ${s.name} down`}
                >
                  <ArrowDownIcon className="size-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                onSave(list.map((s) => s.id));
                onClose();
              }}
            >
              Save order
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
