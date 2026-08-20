import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { bookPmuConsultation, bookPmuDeposit, getPmuCatalog, getPmuConsultationAvailability, getPmuTechniqueAvailability } from "@/api/pmu";
import { ApiError } from "@/api/client";
import { PMU_LOCATION, PMU_SMS_CONSENT_TEXT } from "@/data/pmuCopy";
import { ErrorNotice } from "@/features/landing/ErrorNotice";
import { Spinner } from "@/features/landing/Spinner";
import { TurnstileWidget } from "@/features/booking/TurnstileWidget";
import { PmuCardField } from "@/features/pmu/PmuCardField";
import { usePmuBookingModalContext } from "@/features/pmu/PmuBookingModalContext";
import { buildGoogleCalendarLink, buildIcsDataUri } from "@/lib/calendar";
import { formatPrice, formatSlotDay, formatSlotTime, groupSlotsByDateKey, pacificTodayKey, slotHour, toPacificDateKey } from "@/lib/formatting";
import { getTrackingSnapshot } from "@/lib/tracking";
import type { PmuCatalogResponse, PmuConsultationConfirmation, PmuDepositBookingConfirmation, PmuSlotOption } from "@/types/pmu";

type Step = "slot" | "contact" | "card" | "done";

export function PmuBookingModal() {
  const { mode, close, promoAttempt } = usePmuBookingModalContext();
  const isOpen = mode !== null;

  const [step, setStep] = useState<Step>("slot");
  const [catalog, setCatalog] = useState<PmuCatalogResponse | null>(null);
  const [slots, setSlots] = useState<PmuSlotOption[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<PmuSlotOption | null>(null);

  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  // Off by default, unlike mani's own checkbox — California requires marketing SMS consent to be
  // an affirmative, unchecked-by-default action, not pre-ticked.
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [formRenderedAt, setFormRenderedAt] = useState("");

  const [cardError, setCardError] = useState<string | null>(null);
  const tokenizeRef = useRef<(() => Promise<string>) | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consultationConfirmation, setConsultationConfirmation] = useState<PmuConsultationConfirmation | null>(null);
  const [depositConfirmation, setDepositConfirmation] = useState<PmuDepositBookingConfirmation | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep("slot");
    setSlots(null);
    setSlotsError(null);
    setSelectedSlot(null);
    setSubmitError(null);
    setCardError(null);
    setConsultationConfirmation(null);
    setDepositConfirmation(null);
    setFormRenderedAt(new Date().toISOString());
    tokenizeRef.current = null;

    getPmuCatalog()
      .then(setCatalog)
      .catch(() => setCatalog(null));

    if (mode?.kind === "consultation") {
      getPmuConsultationAvailability(mode.consultationSlug)
        .then((res) => setSlots(res.slots))
        .catch((err) => setSlotsError(err instanceof ApiError ? err.message : "Couldn't load available times."));
    } else if (mode?.kind === "deposit") {
      getPmuTechniqueAvailability(mode.techniqueSlug)
        .then((res) => setSlots(res.slots))
        .catch((err) => setSlotsError(err instanceof ApiError ? err.message : "Couldn't load available times."));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode?.kind, mode?.kind === "consultation" ? mode.consultationSlug : mode?.kind === "deposit" ? mode.techniqueSlug : null]);

  if (!isOpen || !mode) return null;

  const consultationOffer = mode.kind === "consultation" ? catalog?.consultations.find((c) => c.slug === mode.consultationSlug) : undefined;
  const techniqueOffer = mode.kind === "deposit" ? catalog?.techniques.find((t) => t.slug === mode.techniqueSlug) : undefined;
  const title = mode.kind === "consultation" ? consultationOffer?.name ?? "Consultation" : techniqueOffer?.name ?? "Book Your Appointment";

  const canContinueFromContact = givenName.trim().length > 0 && familyName.trim().length > 0 && phone.trim().length >= 7;

  async function handleContactContinue() {
    if (mode?.kind === "deposit") {
      setStep("card");
    } else {
      await submitConsultation();
    }
  }

  async function submitConsultation() {
    if (mode?.kind !== "consultation" || !selectedSlot) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const confirmation = await bookPmuConsultation({
        consultation_slug: mode.consultationSlug,
        team_member_id: selectedSlot.team_member_id,
        start_at: selectedSlot.start_at,
        customer: {
          given_name: givenName,
          family_name: familyName,
          email_address: email || null,
          phone_number: phone,
          marketing_opt_in: smsOptIn,
        },
        tracking: getTrackingSnapshot(),
        website: website || null,
        form_rendered_at: formRenderedAt,
        turnstile_token: turnstileToken,
      });
      setConsultationConfirmation(confirmation);
      setStep("done");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitDeposit() {
    if (mode?.kind !== "deposit" || !selectedSlot || !tokenizeRef.current) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const sourceId = await tokenizeRef.current();
      const confirmation = await bookPmuDeposit({
        technique_slug: mode.techniqueSlug,
        team_member_id: selectedSlot.team_member_id,
        start_at: selectedSlot.start_at,
        customer: {
          given_name: givenName,
          family_name: familyName,
          email_address: email || null,
          phone_number: phone,
          marketing_opt_in: smsOptIn,
        },
        source_id: sourceId,
        tracking: getTrackingSnapshot(),
        promo: promoAttempt,
        website: website || null,
        form_rendered_at: formRenderedAt,
        turnstile_token: turnstileToken,
      });
      setDepositConfirmation(confirmation);
      setStep("done");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={close}>
      <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.grabberRow}>
          <div style={styles.grabber} />
          <button onClick={close} style={styles.closeButton} aria-label="Close">
            ✕
          </button>
        </div>

        {step !== "done" ? <h3 style={styles.title}>{title}</h3> : null}

        {step === "slot" ? (
          <SlotStep
            slots={slots}
            error={slotsError}
            selectedSlot={selectedSlot}
            onSelect={(slot) => {
              setSelectedSlot(slot);
              setStep("contact");
            }}
          />
        ) : step === "contact" ? (
          <ContactFields
            mode={mode}
            techniqueOffer={techniqueOffer}
            selectedSlot={selectedSlot}
            givenName={givenName}
            familyName={familyName}
            phone={phone}
            email={email}
            smsOptIn={smsOptIn}
            website={website}
            onGivenNameChange={setGivenName}
            onFamilyNameChange={setFamilyName}
            onPhoneChange={setPhone}
            onEmailChange={setEmail}
            onSmsOptInChange={setSmsOptIn}
            onWebsiteChange={setWebsite}
            canContinue={canContinueFromContact}
            submitting={submitting}
            submitError={submitError}
            onContinue={handleContactContinue}
            onBack={() => setStep("slot")}
          />
        ) : step === "card" && mode.kind === "deposit" ? (
          <CardStep
            catalog={catalog}
            techniqueOffer={techniqueOffer}
            cardError={cardError}
            submitting={submitting}
            submitError={submitError}
            onCardReady={(tokenize) => {
              tokenizeRef.current = tokenize;
              setCardError(null);
            }}
            onCardError={setCardError}
            onPay={submitDeposit}
            onBack={() => setStep("contact")}
          />
        ) : (
          <DoneStep
            consultationConfirmation={consultationConfirmation}
            depositConfirmation={depositConfirmation}
            consultationDurationMinutes={consultationOffer?.duration_minutes ?? null}
            onClose={close}
          />
        )}

        <TurnstileWidget onToken={setTurnstileToken} />
      </div>
    </div>
  );
}

// Buckets a day's slots into three time-of-day sections instead of one long flat list — reading
// three short headed groups of ~4-8 large buttons is far faster to scan on a phone than scrolling
// past 20-30 same-size 15-minute slots for two artists mixed together.
const TIME_BUCKETS = [
  { key: "morning", label: "Morning", test: (h: number) => h < 12 },
  { key: "afternoon", label: "Afternoon", test: (h: number) => h >= 12 && h < 17 },
  { key: "evening", label: "Evening", test: (h: number) => h >= 17 },
] as const;

function bucketSlotsByTimeOfDay(daySlots: PmuSlotOption[]): { key: string; label: string; slots: PmuSlotOption[] }[] {
  return TIME_BUCKETS.map((b) => ({ key: b.key, label: b.label, slots: daySlots.filter((s) => b.test(slotHour(s.start_at))) })).filter(
    (b) => b.slots.length > 0,
  );
}

function isAnastasiia(slot: PmuSlotOption): boolean {
  return (slot.artist_name ?? "").toLowerCase().includes("anastasiia");
}

function dayChipLabel(dateKey: string): { top: string; bottom: string } {
  const todayKey = pacificTodayKey();
  const [y, m, d] = dateKey.split("-").map(Number);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toPacificDateKey(tomorrow.toISOString());
  if (dateKey === todayKey) return { top: "Today", bottom: String(d) };
  if (dateKey === tomorrowKey) return { top: "Tmrw", bottom: String(d) };
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(y, m - 1, d));
  return { top: weekday, bottom: String(d) };
}

// Horizontal-scrolling day strip with click/tap arrows and edge fades. Swipe alone is enough on a
// phone, but a mouse-only desktop visitor has no way to reveal days scrolled off-screen without
// them — arrows make every available day reachable there too, and the fade (only shown on the
// side that actually has more content) is what signals there's more to see in the first place,
// rather than the strip silently looking like the whole list of available days.
function DayStrip({
  dateKeys,
  activeDateKey,
  onSelect,
}: {
  dateKeys: string[];
  activeDateKey: string | null;
  onSelect: (dateKey: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    // New filter/data can change whether the strip overflows at all — recheck once laid out.
    updateScrollState();
  }, [dateKeys]);

  function scrollByChips(direction: 1 | -1) {
    scrollRef.current?.scrollBy({ left: direction * 168, behavior: "smooth" });
  }

  return (
    <div style={styles.dayStripWrap}>
      <div ref={scrollRef} onScroll={updateScrollState} style={styles.dayStrip}>
        {dateKeys.map((k) => {
          const label = dayChipLabel(k);
          const active = k === activeDateKey;
          return (
            <button key={k} onClick={() => onSelect(k)} style={{ ...styles.dayChip, ...(active ? styles.chipSelected : {}) }}>
              <span style={styles.dayChipTop}>{label.top}</span>
              <span style={styles.dayChipBottom}>{label.bottom}</span>
            </button>
          );
        })}
      </div>
      <div style={{ ...styles.dayStripFade, left: 0, background: "linear-gradient(to right, var(--color-card), transparent)", opacity: canScrollLeft ? 1 : 0 }} />
      <div style={{ ...styles.dayStripFade, right: 0, background: "linear-gradient(to left, var(--color-card), transparent)", opacity: canScrollRight ? 1 : 0 }} />
      {canScrollLeft ? (
        <button aria-label="Earlier days" onClick={() => scrollByChips(-1)} style={{ ...styles.dayStripArrow, left: 2 }}>
          ‹
        </button>
      ) : null}
      {canScrollRight ? (
        <button aria-label="Later days" onClick={() => scrollByChips(1)} style={{ ...styles.dayStripArrow, right: 2 }}>
          ›
        </button>
      ) : null}
    </div>
  );
}

function SlotStep({
  slots,
  error,
  selectedSlot,
  onSelect,
}: {
  slots: PmuSlotOption[] | null;
  error: string | null;
  selectedSlot: PmuSlotOption | null;
  onSelect: (slot: PmuSlotOption) => void;
}) {
  const [providerId, setProviderId] = useState<string | null>(null); // null = any artist
  const [dateKey, setDateKey] = useState<string | null>(null);

  // Every artist who has at least one open slot, in first-seen (i.e. earliest-availability) order.
  const providers = useMemo(() => {
    if (!slots) return [];
    const seen = new Map<string, string>();
    for (const s of slots) {
      if (s.team_member_id && !seen.has(s.team_member_id)) seen.set(s.team_member_id, s.artist_name ?? "Artist");
    }
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [slots]);

  const filteredSlots = useMemo(() => {
    if (providerId) return (slots ?? []).filter((s) => s.team_member_id === providerId);
    // "Any artist": when two artists are both open at the exact same start time, show one button
    // for it, not two — Anastasiia is the salon's primary provider (does the large majority of
    // appointments), so she's the one kept on a tie rather than whichever artist's slot happened
    // to come back first from Square. Times where only one artist is open are unaffected.
    const bySlot = new Map<string, PmuSlotOption>();
    for (const s of slots ?? []) {
      const existing = bySlot.get(s.start_at);
      bySlot.set(s.start_at, !existing || isAnastasiia(s) ? s : existing);
    }
    return Array.from(bySlot.values());
  }, [slots, providerId]);
  const groups = useMemo(() => groupSlotsByDateKey(filteredSlots), [filteredSlots]);
  const dateKeys = useMemo(() => Array.from(groups.keys()).sort(), [groups]);
  const activeDateKey = dateKey && groups.has(dateKey) ? dateKey : dateKeys[0] ?? null;
  const daySlots = activeDateKey ? groups.get(activeDateKey) ?? [] : [];
  const buckets = bucketSlotsByTimeOfDay(daySlots);
  const showArtistOnButton = providerId === null && providers.length > 1;

  if (error) return <ErrorNotice message={error} />;
  if (!slots) return <Spinner label="Loading available times…" />;
  if (slots.length === 0) {
    return (
      <div style={styles.emptyState}>
        No open times in the next few weeks — book a free online consultation instead and we'll find a time together.
      </div>
    );
  }

  return (
    <div>
      <p style={styles.stepSubtitle}>Pick a day and time that works for you.</p>

      {providers.length > 1 ? (
        <div style={styles.chipRow}>
          <button
            onClick={() => {
              setProviderId(null);
              setDateKey(null);
            }}
            style={{ ...styles.providerChip, ...(providerId === null ? styles.chipSelected : {}) }}
          >
            Any artist
          </button>
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setProviderId(p.id);
                setDateKey(null);
              }}
              style={{ ...styles.providerChip, ...(providerId === p.id ? styles.chipSelected : {}) }}
            >
              {p.name}
            </button>
          ))}
        </div>
      ) : null}

      {dateKeys.length === 0 ? (
        <div style={styles.emptyState}>No open times with this artist — try "Any artist" above.</div>
      ) : (
        <>
          <DayStrip dateKeys={dateKeys} activeDateKey={activeDateKey} onSelect={setDateKey} />

          {activeDateKey ? <div style={styles.dayFullLabel}>{formatSlotDay(daySlots[0]?.start_at ?? `${activeDateKey}T12:00:00Z`)}</div> : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "42vh", overflowY: "auto" }}>
            {buckets.map((bucket) => (
              <div key={bucket.key}>
                <div style={styles.timeSectionLabel}>{bucket.label}</div>
                <div style={styles.slotGrid}>
                  {bucket.slots.map((slot) => (
                    <button
                      key={slot.start_at + slot.team_member_id}
                      onClick={() => onSelect(slot)}
                      style={{
                        ...styles.slotButton,
                        ...(selectedSlot?.start_at === slot.start_at && selectedSlot?.team_member_id === slot.team_member_id
                          ? styles.slotButtonSelected
                          : {}),
                      }}
                    >
                      <span>{formatSlotTime(slot.start_at)}</span>
                      {showArtistOnButton && slot.artist_name ? <span style={styles.slotArtist}>{slot.artist_name}</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ContactFields({
  mode,
  techniqueOffer,
  selectedSlot,
  givenName,
  familyName,
  phone,
  email,
  smsOptIn,
  website,
  onGivenNameChange,
  onFamilyNameChange,
  onPhoneChange,
  onEmailChange,
  onSmsOptInChange,
  onWebsiteChange,
  canContinue,
  submitting,
  submitError,
  onContinue,
  onBack,
}: {
  mode: { kind: "consultation" | "deposit" };
  techniqueOffer: { name: string; price: number } | undefined;
  selectedSlot: PmuSlotOption | null;
  givenName: string;
  familyName: string;
  phone: string;
  email: string;
  smsOptIn: boolean;
  website: string;
  onGivenNameChange: (v: string) => void;
  onFamilyNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onSmsOptInChange: (v: boolean) => void;
  onWebsiteChange: (v: string) => void;
  canContinue: boolean;
  submitting: boolean;
  submitError: string | null;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      {selectedSlot ? (
        <div style={styles.selectedSlotBanner}>
          {formatSlotDay(selectedSlot.start_at)}, {formatSlotTime(selectedSlot.start_at)}
          {selectedSlot.artist_name ? ` · ${selectedSlot.artist_name}` : ""}
        </div>
      ) : null}
      {mode.kind === "deposit" && techniqueOffer ? (
        <p style={styles.stepSubtitle}>
          {techniqueOffer.name} — full price {formatPrice(techniqueOffer.price)}. Next, you'll reserve this time with a
          $100 deposit.
        </p>
      ) : (
        <p style={styles.stepSubtitle}>Almost done — just your contact info.</p>
      )}

      {/* First/last share one row on every screen size — two short fields side by side instead of
          stacked saves a whole field's worth of vertical space, the biggest single contributor to
          this step not fitting on a phone screen without scrolling. */}
      <div style={styles.nameRow}>
        <div>
          <label style={styles.label}>First name</label>
          <input value={givenName} onChange={(e) => onGivenNameChange(e.target.value)} name="fname" autoComplete="given-name" style={styles.input} />
        </div>
        <div>
          <label style={styles.label}>Last name</label>
          <input value={familyName} onChange={(e) => onFamilyNameChange(e.target.value)} name="lname" autoComplete="family-name" style={styles.input} />
        </div>
      </div>
      <label style={styles.label}>Mobile number</label>
      <input value={phone} onChange={(e) => onPhoneChange(e.target.value)} type="tel" name="phone" autoComplete="tel" inputMode="numeric" maxLength={14} placeholder="(619) 000-0000" style={styles.input} />
      <label style={styles.label}>Email (optional)</label>
      <input value={email} onChange={(e) => onEmailChange(e.target.value)} type="email" name="email" autoComplete="email" style={{ ...styles.input, marginBottom: 8 }} />
      <label
        onClick={() => onSmsOptInChange(!smsOptIn)}
        style={{
          ...styles.smsCard,
          borderColor: smsOptIn ? "var(--color-accent)" : "var(--color-accent-border-soft)",
          background: smsOptIn ? "var(--color-accent-tint)" : "var(--color-accent-tint-2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <SmsCheckbox checked={smsOptIn} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 600, fontSize: 14.5, color: "var(--color-ink)" }}>
              Text me reminders &amp; exclusive offers
            </span>
            <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-accent)", marginTop: 2 }}>
              {smsOptIn ? "You're in — enjoy VIP offers & booking updates." : "Never miss your slot + first dibs on last-minute openings"}
            </span>
          </span>
          <span
            style={{
              flex: "none",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: smsOptIn ? "#fff" : "var(--color-accent)",
              background: smsOptIn ? "var(--color-accent)" : "var(--color-accent-tint)",
              padding: "4px 8px",
              borderRadius: 20,
              whiteSpace: "nowrap",
            }}
          >
            {smsOptIn ? "On" : "Recommended"}
          </span>
        </div>
        <span style={{ display: "block", fontSize: 10.5, lineHeight: 1.4, color: "var(--color-muted-3)", marginTop: 8 }}>
          {PMU_SMS_CONSENT_TEXT}
        </span>
      </label>

      <input value={website} onChange={(e) => onWebsiteChange(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={styles.honeypot} />

      {submitError ? <ErrorNotice message={submitError} /> : null}

      <button
        onClick={onContinue}
        disabled={!canContinue || submitting}
        style={{ ...styles.continueButton, background: canContinue && !submitting ? "var(--color-accent)" : "var(--color-accent-border-soft)" }}
      >
        {submitting ? "Booking…" : mode.kind === "deposit" ? "Continue to Payment" : "Confirm Consultation"}
      </button>
      <button onClick={onBack} style={styles.backButton}>
        Back
      </button>
    </div>
  );
}

function CardStep({
  catalog,
  techniqueOffer,
  cardError,
  submitting,
  submitError,
  onCardReady,
  onCardError,
  onPay,
  onBack,
}: {
  catalog: PmuCatalogResponse | null;
  techniqueOffer: { name: string; price: number } | undefined;
  cardError: string | null;
  submitting: boolean;
  submitError: string | null;
  onCardReady: (tokenize: () => Promise<string>) => void;
  onCardError: (message: string) => void;
  onPay: () => void;
  onBack: () => void;
}) {
  const [cardFieldReady, setCardFieldReady] = useState(false);

  if (!catalog) return <Spinner label="Loading payment form…" />;

  return (
    <div>
      <p style={styles.stepSubtitle}>
        Reserve your appointment with a <strong>${catalog.deposit_amount.toFixed(0)} deposit</strong>. The remaining{" "}
        {techniqueOffer ? formatPrice(techniqueOffer.price - catalog.deposit_amount) : ""} is due at your appointment.
      </p>

      <PmuCardField
        applicationId={catalog.square_application_id}
        locationId={catalog.square_location_id}
        onReady={(tokenize) => {
          onCardReady(tokenize);
          setCardFieldReady(true);
        }}
        onError={onCardError}
      />
      {cardError ? <ErrorNotice message={cardError} /> : null}
      {submitError ? <ErrorNotice message={submitError} /> : null}

      <button
        onClick={onPay}
        disabled={!cardFieldReady || submitting}
        style={{ ...styles.continueButton, background: cardFieldReady && !submitting ? "var(--color-accent)" : "var(--color-accent-border-soft)" }}
      >
        {submitting ? "Processing…" : `Pay $${catalog.deposit_amount.toFixed(0)} & Reserve`}
      </button>
      <button onClick={onBack} style={styles.backButton} disabled={submitting}>
        Back
      </button>
      <p style={styles.securityNote}>🔒 Secured by Square. Your card details never touch our servers.</p>
    </div>
  );
}

// Same detail-card + "Add to Google/Apple Calendar" pattern as mani's own DoneStep
// (@/features/booking/steps/DoneStep.tsx) — reusing the shared @/lib/calendar builders and the
// same two glyphs/labels so a client who's booked on both pages sees a consistent confirmation.
function DoneStep({
  consultationConfirmation,
  depositConfirmation,
  consultationDurationMinutes,
  onClose,
}: {
  consultationConfirmation: PmuConsultationConfirmation | null;
  depositConfirmation: PmuDepositBookingConfirmation | null;
  consultationDurationMinutes: number | null;
  onClose: () => void;
}) {
  const confirmation = depositConfirmation ?? consultationConfirmation;
  if (!confirmation) return null;

  const durationMinutes = depositConfirmation?.duration_minutes ?? consultationDurationMinutes ?? 60;
  const calDetails = `Your appointment at ${PMU_LOCATION.name}. ${confirmation.service_name}. Please arrive 5 minutes early.`;
  const calTitle = `${PMU_LOCATION.name} — ${confirmation.service_name}`;
  const calGoogle = buildGoogleCalendarLink({
    title: calTitle,
    startAt: confirmation.start_at,
    durationMinutes,
    details: calDetails,
    location: PMU_LOCATION.address,
  });
  const calIcs = buildIcsDataUri({
    title: calTitle,
    startAt: confirmation.start_at,
    durationMinutes,
    details: calDetails,
    location: PMU_LOCATION.address,
  });

  return (
    <div style={styles.doneWrap}>
      <div style={styles.doneCheck}>✓</div>
      <h3 style={styles.doneTitle}>{depositConfirmation ? "You're Booked!" : "Consultation Booked!"}</h3>
      <p style={styles.doneSubtitle}>
        {depositConfirmation ? "Your appointment is reserved. Details:" : "We'll be in touch to confirm. Details:"}
      </p>

      <div style={styles.doneDetailsCard}>
        <DoneDetailRow label="Service" value={confirmation.service_name} />
        <DoneDetailRow label="When" value={`${formatSlotDay(confirmation.start_at)} · ${formatSlotTime(confirmation.start_at)}`} />
        <DoneDetailRow label="Artist" value={confirmation.artist_name ?? "Your artist"} />
        <DoneDetailRow label="Where" value={PMU_LOCATION.address} last={!depositConfirmation} />
        {depositConfirmation ? (
          <>
            <DoneDetailRow label="Deposit paid" value={formatPrice(depositConfirmation.deposit_amount)} />
            <DoneDetailRow label="Due at appointment" value={formatPrice(depositConfirmation.remaining_balance)} last />
          </>
        ) : null}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={styles.calendarEyebrow}>Save the date</div>
        <div style={styles.calendarStack}>
          <a href={calGoogle} target="_blank" rel="noopener noreferrer" style={styles.calendarLink}>
            <span style={{ ...styles.calendarIconBadge, background: "#4285F4" }}>
              <CalendarCheckGlyph />
            </span>
            <span style={styles.calendarTextBlock}>
              <span style={styles.calendarLinkTitle}>Add to Google Calendar</span>
              <span style={styles.calendarLinkSubtitle}>Get a reminder before your visit</span>
            </span>
            <span style={styles.calendarChevron}>›</span>
          </a>
          <a href={calIcs} download="appointment.ics" style={styles.calendarLink}>
            <span style={{ ...styles.calendarIconBadge, background: "#1d1d1f" }}>
              <AppleGlyph />
            </span>
            <span style={styles.calendarTextBlock}>
              <span style={styles.calendarLinkTitle}>Add to Apple Calendar</span>
              <span style={styles.calendarLinkSubtitle}>Works with iPhone, iPad &amp; Mac</span>
            </span>
            <span style={styles.calendarChevron}>›</span>
          </a>
        </div>
      </div>

      <button onClick={onClose} style={styles.continueButton}>
        Done
      </button>
    </div>
  );
}

function DoneDetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ ...styles.doneDetailRow, ...(last ? { borderBottom: "none" } : {}) }}>
      <span style={styles.doneDetailLabel}>{label}</span>
      <span style={styles.doneDetailValue}>{value}</span>
    </div>
  );
}

function CalendarCheckGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="15" rx="3" stroke="#fff" strokeWidth="1.7" />
      <path d="M3 9.5H21" stroke="#fff" strokeWidth="1.7" />
      <path d="M8 3V6.2" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16 3V6.2" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8.5 14L10.5 16L15.5 11.5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.416-2.09-3.629-2.324-4.415-2.376-2.006-.156-3.688 1.09-4.65 1.09zm3.634-3.428c.834-1.014 1.401-2.402 1.245-3.793-1.207.052-2.662.805-3.532 1.818-.78.896-1.46 2.336-1.284 3.702 1.336.104 2.702-.688 3.571-1.727z" />
    </svg>
  );
}

function SmsCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      style={{
        flex: "none",
        width: 22,
        height: 22,
        borderRadius: 6,
        border: `2px solid ${checked ? "var(--color-accent)" : "var(--color-accent-border-soft)"}`,
        background: checked ? "var(--color-accent)" : "#fff",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
      }}
    >
      {checked ? "✓" : ""}
    </span>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 60,
    background: "rgba(30,18,14,0.5)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    animation: "fadeIn 0.2s ease",
  },
  sheet: {
    position: "relative",
    width: "100%",
    maxWidth: 480,
    background: "var(--color-card)",
    borderRadius: "22px 22px 0 0",
    padding: "18px 20px calc(18px + env(safe-area-inset-bottom, 0px))",
    animation: "sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)",
    // dvh, not vh: iOS Safari's vh is sized against the viewport with the address bar collapsed,
    // which overshoots the actually-visible area while it's showing — the modal would compute
    // itself taller than what's on screen and hide the Continue button below the fold, forcing a
    // scroll to find it every time. dvh tracks the real, current visible viewport instead.
    maxHeight: "94dvh",
    overflowY: "auto",
  },
  grabberRow: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: 22, marginBottom: 4 },
  grabber: { width: 38, height: 4, borderRadius: 2, background: "#e3d3ca" },
  closeButton: { position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "#f4ece7", border: "none", borderRadius: "50%", fontSize: 20, color: "var(--color-muted-2)", cursor: "pointer", lineHeight: 1, padding: 0 },
  title: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 22, margin: "2px 0 3px" },
  stepSubtitle: { fontSize: 13, color: "var(--color-muted-2)", margin: "0 0 10px", lineHeight: 1.45 },
  emptyState: { fontSize: 14, color: "var(--color-muted)", lineHeight: 1.6, padding: "20px 0" },
  // Artist filter chips — shown only when the technique/consultation has more than one artist
  // available, so a solo-provider offer never displays a redundant single choice.
  chipRow: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  providerChip: {
    border: "1px solid #e0cfc6",
    background: "#fff",
    borderRadius: 20,
    padding: "9px 16px",
    fontSize: 13.5,
    fontWeight: 600,
    color: "var(--color-ink)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  chipSelected: { border: "1.5px solid var(--color-accent)", background: "var(--color-accent)", color: "#fff" },
  // Horizontal-scrolling day strip: one row instead of a stacked section per day, so only the
  // selected day's times take up vertical space — the actual fix for "too many choices at once".
  dayStripWrap: { position: "relative", marginBottom: 4 },
  dayStrip: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" },
  dayStripFade: { position: "absolute", top: 0, bottom: 4, width: 30, pointerEvents: "none", transition: "opacity 0.15s ease" },
  dayStripArrow: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 26,
    height: 26,
    borderRadius: "50%",
    border: "1px solid #e0cfc6",
    background: "#fff",
    color: "var(--color-ink)",
    fontSize: 15,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
    padding: 0,
  },
  dayChip: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
    flex: "none",
    width: 52,
    border: "1px solid #e0cfc6",
    background: "#fff",
    borderRadius: 12,
    padding: "8px 4px",
    cursor: "pointer",
    color: "var(--color-ink)",
  },
  dayChipTop: { fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, opacity: 0.75 },
  dayChipBottom: { fontSize: 17, fontWeight: 700, lineHeight: 1.2 },
  dayFullLabel: { fontSize: 12.5, fontWeight: 600, color: "var(--color-ink-soft)", margin: "12px 0 8px" },
  timeSectionLabel: { fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--color-muted-3)", marginBottom: 7 },
  // Two large columns, not three cramped ones — bigger touch targets are the other half of the fix.
  slotGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 },
  slotButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    border: "1px solid #e0cfc6",
    background: "#fff",
    borderRadius: 12,
    padding: "13px 8px",
    fontSize: 15,
    fontWeight: 600,
    color: "var(--color-ink)",
    cursor: "pointer",
  },
  slotButtonSelected: { border: "1.5px solid var(--color-accent)", background: "var(--color-accent-tint-2)" },
  slotArtist: { fontSize: 11, fontWeight: 500, color: "var(--color-muted-3)" },
  selectedSlotBanner: { fontSize: 12.5, color: "var(--color-ink-soft)", background: "var(--color-accent-tint)", borderRadius: 10, padding: "7px 12px", marginBottom: 10 },
  label: { fontSize: 12.5, fontWeight: 500, color: "var(--color-ink-soft)" },
  input: { width: "100%", minWidth: 0, margin: "4px 0 10px", padding: 12, fontSize: 16, border: "1px solid #e0cfc6", borderRadius: 11, background: "#fff" },
  // Two equal columns for first/last name — see the ContactFields comment for why.
  nameRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  smsCard: { display: "block", padding: "12px 14px", border: "2px solid", borderRadius: 14, cursor: "pointer", marginBottom: 12 },
  honeypot: { position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0, pointerEvents: "none" },
  continueButton: { width: "100%", marginTop: 4, border: "none", color: "#fff7f3", background: "var(--color-accent)", fontSize: 16, fontWeight: 600, padding: 14, borderRadius: 12, cursor: "pointer" },
  backButton: { width: "100%", marginTop: 4, border: "none", background: "none", color: "var(--color-muted-2)", fontSize: 14, padding: 6, cursor: "pointer" },
  securityNote: { fontSize: 11.5, color: "var(--color-muted-3)", textAlign: "center", marginTop: 12 },
  doneWrap: { textAlign: "center", padding: "12px 0" },
  doneCheck: { width: 56, height: 56, borderRadius: "50%", background: "var(--color-success-bg)", color: "var(--color-success)", fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" },
  doneTitle: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 24, margin: "0 0 8px" },
  doneSubtitle: { fontSize: 14, color: "var(--color-muted)", lineHeight: 1.5, margin: "0 0 14px" },
  doneDetailsCard: { textAlign: "left", border: "1px solid #e0cfc6", borderRadius: 14, overflow: "hidden", marginBottom: 16 },
  doneDetailRow: { display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderBottom: "1px solid #f0e4dc" },
  doneDetailLabel: { fontSize: 11.5, color: "var(--color-muted-3)", textTransform: "uppercase", letterSpacing: 0.6, flexShrink: 0 },
  doneDetailValue: { fontSize: 13, fontWeight: 600, color: "var(--color-ink)", textAlign: "right" },
  calendarEyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 10, textAlign: "left" },
  calendarStack: { display: "flex", flexDirection: "column", gap: 10 },
  calendarLink: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "11px 14px",
    border: "1px solid #e0cfc6",
    borderRadius: 14,
    background: "var(--color-card)",
    textDecoration: "none",
    boxShadow: "0 1px 2px rgba(42,33,29,0.06)",
  },
  calendarIconBadge: { width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  calendarTextBlock: { display: "flex", flexDirection: "column", flex: 1, textAlign: "left", gap: 1 },
  calendarLinkTitle: { fontSize: 13.5, fontWeight: 700, color: "var(--color-ink)" },
  calendarLinkSubtitle: { fontSize: 11.5, color: "var(--color-muted-2)" },
  calendarChevron: { fontSize: 20, color: "var(--color-muted-3)", flexShrink: 0, lineHeight: 1 },
};
