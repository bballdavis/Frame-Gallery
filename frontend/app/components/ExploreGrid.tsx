import type { ExploreTile } from "~/lib/explore";

interface ExploreGridProps {
  tiles: ExploreTile[];
  onPick: (tile: ExploreTile) => void;
}

/**
 * On a phone, how tile `i` of `count` sits in a two-column list: every fifth is a wide one,
 * the pairs between alternate tall and short, and a tile left alone in its row is widened.
 * Different sizes keep a long list from reading as a wall of identical boxes.
 */
function phoneShape(i: number, count: number) {
  const slot = i % 5;
  const wide = slot === 0 || (i === count - 1 && (slot === 1 || slot === 3));
  if (wide) return i === 0 ? "col-span-2 h-28" : "col-span-2 h-24";
  return slot <= 2 ? "h-36" : "h-28";
}

/**
 * Topics to start from. A phone gets a list of chips running down the page, in a few sizes;
 * from tablet width up they fill the page evenly. The first tile is what is in season, and
 * is twice as wide.
 */
export default function ExploreGrid({ tiles, onPick }: ExploreGridProps) {
  return (
    <section aria-labelledby="explore-heading" className="mb-6">
      <h2 id="explore-heading" className="mb-2 text-sm font-medium text-muted-foreground">
        Explore
      </h2>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile, i) => {
          const Icon = tile.icon;
          return (
            <li key={tile.id} className={`${phoneShape(i, tiles.length)} ${i === 0 ? "sm:col-span-2" : "sm:col-span-1"} sm:h-32`}>
              <button
                type="button"
                onClick={() => onPick(tile)}
                className={`group relative flex size-full flex-col justify-end overflow-hidden rounded-xl bg-gradient-to-br p-3 text-left text-white shadow-xs transition-transform hover:-translate-y-0.5 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none ${tile.gradient}`}
              >
                {/* Duotone line art in the chip's own white: the second tone is the same colour, faded. */}
                <Icon
                  aria-hidden="true"
                  weight="duotone"
                  className="pointer-events-none absolute right-3 top-3 size-12 text-white/90 transition-transform duration-300 group-hover:scale-110 sm:size-14"
                />
                {i === 0 && (
                  <span className="mb-auto inline-flex w-fit rounded-full bg-black/25 px-2 py-0.5 text-[0.7rem] font-medium uppercase tracking-wide">
                    In season
                  </span>
                )}
                <span className="relative text-base font-semibold leading-tight">{tile.label}</span>
                <span className="relative line-clamp-2 text-xs leading-snug text-white/85">{tile.blurb}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
