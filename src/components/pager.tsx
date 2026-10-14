import Link from "next/link";

export function Pager({
  page,
  hasNext,
  hrefFor,
}: {
  page: number;
  hasNext: boolean;
  hrefFor: (page: number) => string;
}) {
  if (page === 1 && !hasNext) return null;
  return (
    <nav className="flex items-center justify-between py-6 text-sm">
      {page > 1 ? <Link href={hrefFor(page - 1)}>← 이전</Link> : <span />}
      <span className="text-zinc-500">{page}</span>
      {hasNext ? <Link href={hrefFor(page + 1)}>다음 →</Link> : <span />}
    </nav>
  );
}
