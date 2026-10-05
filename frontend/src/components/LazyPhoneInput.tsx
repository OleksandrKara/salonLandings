import { lazy, Suspense, type ComponentProps, type CSSProperties } from "react";

/** PhoneInput carries the phone-number metadata (libphonenumber-js, ~40 KB gzipped): loaded only
 * when a contact form actually renders, never on the landing page's first load. The fallback is a
 * plain box of the same size so nothing jumps. */
const PhoneInputImpl = lazy(() => import("@/components/PhoneInput"));

function outerMargin(margin?: CSSProperties["margin"], marginTop?: CSSProperties["marginTop"], marginBottom?: CSSProperties["marginBottom"]): CSSProperties {
  const out: CSSProperties = {};
  if (margin !== undefined) out.margin = margin;
  if (marginTop !== undefined) out.marginTop = marginTop;
  if (marginBottom !== undefined) out.marginBottom = marginBottom;
  return out;
}

export function PhoneInput(props: ComponentProps<typeof PhoneInputImpl>) {
  const { margin, marginTop, marginBottom, ...look } = props.fieldStyle ?? {};
  return (
    <Suspense fallback={<div style={outerMargin(margin, marginTop, marginBottom)}><div style={{ ...look, minHeight: 48 }} /></div>}>
      <PhoneInputImpl {...props} />
    </Suspense>
  );
}
