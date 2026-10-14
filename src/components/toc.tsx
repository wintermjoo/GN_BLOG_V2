import type { TocItem } from "@/lib/toc";

export function Toc({ items }: { items: TocItem[] }) {
  if (items.length < 3) return null;
  return (
    <nav
      aria-label="목차"
      className="rounded-xl border border-zinc-200 bg-white/60 p-4 text-sm dark:border-zinc-800"
    >
      <p className="mb-2 font-medium">목차</p>
      <ol className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id} className={item.level === 3 ? "pl-4" : ""}>
            <a href={`#${item.id}`} className="text-zinc-600 hover:underline dark:text-zinc-400">
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
