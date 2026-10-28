import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * Admin links never prefetch. Admin pages are per-user and always fresh, so prefetching
 * them wastes work, and on shared hosting the burst (one request per visible link) gets
 * requests rejected with 503s.
 */
export default function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}
