import Link from "next/link";

export function Logo({ href = "/dashboard", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="brand" aria-label="OCTA Perito">
      <span className="brand-mark" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, index) => <i key={index} />)}
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>OCTA</strong>
          <small>PERITO</small>
        </span>
      )}
    </Link>
  );
}
