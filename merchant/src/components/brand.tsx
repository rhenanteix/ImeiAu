import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-2 align-middle"
      aria-label="IMEIAU"
    >
      <Image
        src="/imeiau.png"
        alt=""
        width={compact ? 38 : 52}
        height={compact ? 38 : 52}
        className="rounded-full bg-white"
        priority={!compact}
      />
      <span
        className={
          compact
            ? "text-xl font-extrabold tracking-tight"
            : "text-3xl font-extrabold tracking-tight"
        }
      >
        IMEI<span className="text-[#d88100]">AU</span>
      </span>
    </span>
  );
}
