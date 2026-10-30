import Image from "next/image";

/**
 * Official MTAA Fix brand mark.
 *
 * Renders the supplied logo artwork (transparent PNG, no background plate) so
 * the same mark is used everywhere the brand appears.
 */
export default function BrandLogo({
  className = "h-10 w-10",
  alt = "MTAA Fix",
  preload = false,
}: {
  className?: string;
  alt?: string;
  preload?: boolean;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5 ${className}`}
    >
      <Image
        src="/brand/mtaa-fix-logo.png"
        alt={alt}
        width={416}
        height={344}
        preload={preload}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
