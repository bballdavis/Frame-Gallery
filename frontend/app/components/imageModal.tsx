import React from "react";
import { Dialog, Popover } from "radix-ui";
import {
  Crop as CropIcon,
  FolderSimplePlus as AlbumAddIcon,
  Play as PlayIcon,
  Power as PowerIcon,
  Trash as TrashIcon,
  UploadSimple as ArrowUpTrayIcon,
  WarningCircle as ExclamationCircleIcon,
  X as XMarkIcon,
} from "@phosphor-icons/react";
import { MATTE_STYLES, MATTE_COLORS, MATTE_STYLE_LABELS, MATTE_COLOR_LABELS, MATTE_SWATCHES } from "../utils/matte";
import { Tooltip } from "./ui/tooltip";
import ImageSource from "./ImageSource";
import MattePreview from "./MattePreview";

export interface TV {
  ip: string;
  name?: string;
  mac?: string;
  default_matte?: string | null;
  one_slot_mode?: boolean;
}

export interface AlbumOption {
  id: string;
  name: string;
  images: string[];
}

export interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageURL: string;
  alt: string;
  title: string;
  filename?: string;
  image?: any;
  tvs: TV[];
  selectedTvIp: string;
  setSelectedTvIp: (ip: string) => void;
  matteStyle: string;
  setMatteStyle: (style: string) => void;
  matteColor: string;
  setMatteColor: (color: string) => void;
  /** the matte shown is the TV's default, not one picked for this picture */
  matteIsDefault: boolean;
  tvLoading: boolean;
  handleSendToTV: () => void;
  handlePlayUploadedImage: () => void;
  handleTvPowerOn: () => void;
  error: string;
  isLocalImage: boolean;
  onDelete?: () => Promise<void>;
  deleteLoading: boolean;
  onOpenCrop: () => void;
  availableAlbums: AlbumOption[];
  onAssignToAlbum: (albumName: string) => void;
  assigning: boolean;
}

const iconButton =
  "inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";

const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  imageURL,
  alt,
  title,
  filename,
  image,
  tvs,
  selectedTvIp,
  setSelectedTvIp,
  matteStyle,
  setMatteStyle,
  matteColor,
  setMatteColor,
  matteIsDefault,
  tvLoading,
  handleSendToTV,
  handlePlayUploadedImage,
  handleTvPowerOn,
  error,
  isLocalImage,
  onDelete,
  deleteLoading,
  onOpenCrop,
  availableAlbums,
  onAssignToAlbum,
  assigning,
}) => {
  const [albumsOpen, setAlbumsOpen] = React.useState(false);
  // Delete asks twice: the first press arms it, the second (within a few seconds) deletes.
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  React.useEffect(() => {
    if (!confirmingDelete) return;
    const timer = window.setTimeout(() => setConfirmingDelete(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmingDelete]);
  React.useEffect(() => {
    if (!isOpen) setConfirmingDelete(false);
  }, [isOpen]);

  const selectedTv = tvs.find((t) => t.ip === selectedTvIp);
  const isOneSlotMode = !!selectedTv?.one_slot_mode;
  const hasTvs = tvs.length > 0;
  const noTv = tvLoading || !selectedTvIp;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={
            "fixed z-50 flex flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-2xl focus:outline-none " +
            // Phones: a sheet from the bottom. Larger screens: centred, never taller than the window.
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl " +
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[calc(100dvh-2rem)] sm:w-[min(60rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl " +
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95"
          }
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-base font-semibold" title={title}>
                {title}
              </Dialog.Title>
              <Dialog.Description className="truncate text-xs text-muted-foreground" title={filename}>
                {filename || "Image actions"}
              </Dialog.Description>
            </div>
            <Dialog.Close className="-mr-1 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Close">
              <XMarkIcon className="size-5" />
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid gap-5 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] md:gap-6">
              {/* The picture, as it will look on the TV */}
              <div className="space-y-3 md:sticky md:top-0 md:self-start">
                <MattePreview
                  imageURL={imageURL}
                  alt={alt}
                  matteStyle={hasTvs ? matteStyle : "none"}
                  matteColor={matteColor}
                />

                <div className="flex items-start gap-3">
                  {isLocalImage && (
                    <div className="flex shrink-0 gap-2">
                      <Tooltip label="Crop">
                        <button type="button" className={iconButton} onClick={onOpenCrop} aria-label="Crop">
                          <CropIcon className="size-[18px]" />
                        </button>
                      </Tooltip>

                      {availableAlbums.length > 0 && (
                        <Popover.Root open={albumsOpen} onOpenChange={setAlbumsOpen}>
                          <Tooltip label="Add to album">
                            <Popover.Trigger className={iconButton} aria-label="Add to album" disabled={assigning}>
                              <AlbumAddIcon className="size-[18px]" />
                            </Popover.Trigger>
                          </Tooltip>
                          <Popover.Portal>
                            <Popover.Content
                              align="start"
                              sideOffset={6}
                              collisionPadding={12}
                              className="z-50 max-h-64 w-56 overflow-y-auto rounded-lg border border-border bg-popover p-1.5 text-sm text-popover-foreground shadow-lg focus:outline-none"
                            >
                              <p className="px-2 pb-1 pt-0.5 text-xs font-medium text-muted-foreground">Add to album</p>
                              {availableAlbums.map((album) => (
                                <button
                                  key={album.id}
                                  type="button"
                                  className="block w-full truncate rounded-md px-2 py-1.5 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                                  onClick={() => {
                                    onAssignToAlbum(album.name);
                                    setAlbumsOpen(false);
                                  }}
                                >
                                  {album.name}
                                </button>
                              ))}
                            </Popover.Content>
                          </Popover.Portal>
                        </Popover.Root>
                      )}
                    </div>
                  )}
                  {image?.provenance && <ImageSource provenance={image.provenance} className="min-w-0 pt-0.5" />}
                </div>
              </div>

              {/* Sending it to a TV */}
              <div className="flex flex-col gap-4">
                {hasTvs ? (
                  <>
                    <div className="space-y-1.5">
                      <label htmlFor="image-modal-tv" className="text-xs font-medium text-muted-foreground">
                        Frame TV
                      </label>
                      <select
                        id="image-modal-tv"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/60"
                        value={selectedTvIp}
                        onChange={(e) => setSelectedTvIp(e.target.value)}
                        disabled={tvLoading}
                      >
                        <option value="">Select a TV</option>
                        {tvs.map((tv) => (
                          <option key={tv.ip} value={tv.ip}>
                            {tv.name || tv.ip} {tv.one_slot_mode ? "(1-Slot Mode)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedTvIp && isOneSlotMode && (
                      <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-surface p-2.5 text-xs text-warning">
                        <span className="mt-1 inline-block size-2 shrink-0 animate-pulse rounded-full bg-warning" />
                        <span>
                          <strong>1-Slot Mode:</strong> uploading shows this picture and replaces the artwork on the TV.
                        </span>
                      </div>
                    )}

                    {/* Matte */}
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <label htmlFor="image-modal-matte" className="text-xs font-medium text-muted-foreground">
                          Matte
                        </label>
                        {matteIsDefault && <span className="text-[11px] text-muted-foreground">TV default</span>}
                      </div>
                      <select
                        id="image-modal-matte"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/60"
                        value={matteStyle}
                        onChange={(e) => setMatteStyle(e.target.value)}
                      >
                        {MATTE_STYLES.map((style) => (
                          <option key={style} value={style}>
                            {MATTE_STYLE_LABELS[style] ?? style}
                          </option>
                        ))}
                      </select>
                      <div
                        role="radiogroup"
                        aria-label="Matte color"
                        className={`grid grid-cols-8 gap-1.5 transition-opacity ${matteStyle === "none" ? "pointer-events-none opacity-40" : ""}`}
                      >
                        {MATTE_COLORS.map((color) => {
                          const selected = color === matteColor;
                          return (
                            <Tooltip key={color} label={MATTE_COLOR_LABELS[color] ?? color}>
                              <button
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                aria-label={MATTE_COLOR_LABELS[color] ?? color}
                                disabled={matteStyle === "none"}
                                onClick={() => setMatteColor(color)}
                                className={
                                  "aspect-square w-full rounded-full border border-black/15 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 dark:border-white/15 " +
                                  (selected ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "")
                                }
                                style={{ backgroundColor: MATTE_SWATCHES[color] }}
                              />
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent disabled:opacity-50 border border-border"
                          onClick={handleTvPowerOn}
                          disabled={noTv}
                        >
                          <PowerIcon className="size-4" weight="bold" />
                          Power on
                        </button>
                        <button
                          type="button"
                          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
                          onClick={handleSendToTV}
                          disabled={noTv}
                        >
                          <ArrowUpTrayIcon className="size-4" weight="bold" />
                          {tvLoading ? "Sending…" : "Upload to TV"}
                        </button>
                      </div>
                      {!isOneSlotMode && (
                        <button
                          type="button"
                          className="mx-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                          onClick={handlePlayUploadedImage}
                          disabled={noTv}
                        >
                          <PlayIcon className="size-3.5" weight="fill" />
                          Already on this TV? Show it without re-uploading
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
                    <ExclamationCircleIcon className="size-5 shrink-0 text-warning" />
                    <span>No TVs configured. Add one in Settings to send pictures to it.</span>
                  </div>
                )}

                {error && (
                  <div role="alert" className="rounded-lg border border-destructive/30 bg-danger-surface p-3 text-xs text-destructive">
                    {error}
                  </div>
                )}

                {onDelete && isLocalImage && (
                  <div className="mt-auto border-t border-border/60 pt-4">
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-danger px-3 py-2.5 text-sm font-medium text-danger-foreground shadow-xs transition-colors hover:bg-danger-hover disabled:opacity-50"
                      onClick={() => {
                        if (!confirmingDelete) {
                          setConfirmingDelete(true);
                          return;
                        }
                        setConfirmingDelete(false);
                        onDelete();
                      }}
                      disabled={deleteLoading}
                    >
                      <TrashIcon className="size-4" />
                      {deleteLoading ? "Deleting…" : confirmingDelete ? "Press again to delete" : "Delete image"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ImageModal;
