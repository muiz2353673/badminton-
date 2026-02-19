// Force this route to be dynamic so useSearchParams() works without static prerender errors
export const dynamic = "force-dynamic";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
