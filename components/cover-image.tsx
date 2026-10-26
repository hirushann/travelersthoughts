import Image from "next/image";

type Props = {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

/** Fills its (relatively positioned) parent. Posts without a cover get a quiet textured block. */
export function CoverImage({ src, alt, sizes, priority, className = "" }: Props) {
  if (!src) {
    return (
      <div
        aria-hidden
        className={`absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--accent-soft),transparent_60%),linear-gradient(135deg,var(--sunken),var(--line))] ${className}`}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={priority}
      loading={priority ? "eager" : undefined}
      fetchPriority={priority ? "high" : undefined}
      className={`object-cover ${className}`}
    />
  );
}
