import Image from "next/image";
import Link from "next/link";

export function Brand({ size = 36 }: { size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src="/logo.png"
        alt=""
        width={size}
        height={size}
        className="rounded-full"
        priority
      />
      <span className="font-display text-2xl text-[#E88C46]">포갠</span>
    </Link>
  );
}
