import { lazy, Suspense, type ComponentProps } from "react";

/** PhoneInput carries the phone-number metadata (libphonenumber-js, ~40 KB gzipped): loaded only
 * when a contact form actually renders, never on the landing page's first load. The fallback is a
 * plain box of the same size so nothing jumps. */
const PhoneInputImpl = lazy(() => import("@/components/PhoneInput"));

export function PhoneInput(props: ComponentProps<typeof PhoneInputImpl>) {
  const { margin, marginTop, marginBottom, ...look } = props.fieldStyle ?? {};
  return (
    <Suspense fallback={<div style={{ margin, marginTop, marginBottom }}><div style={{ ...look, minHeight: 48 }} /></div>}>
      <PhoneInputImpl {...props} />
    </Suspense>
  );
}
