import { useEffect, useRef, useState, type CSSProperties } from "react";
import { bookPmuConsultation, bookPmuDeposit, getPmuCatalog, getPmuConsultationAvailability, getPmuTechniqueAvailability } from "@/api/pmu";
import { ApiError } from "@/api/client";
import { PMU_SMS_CONSENT_TEXT } from "@/data/pmuCopy";
import { ErrorNotice } from "@/features/landing/ErrorNotice";
import { Spinner } from "@/features/landing/Spinner";
import { TurnstileWidget } from "@/features/booking/TurnstileWidget";
import { PmuCardField } from "@/features/pmu/PmuCardField";
import { usePmuBookingModalContext } from "@/features/pmu/PmuBookingModalContext";
import { formatPrice, formatSlotDay, formatSlotTime, groupSlotsByDateKey } from "@/lib/formatting";
import { getTrackingSnapshot } from "@/lib/tracking";
import type { PmuCatalogResponse, PmuConsultationConfirmation, PmuDepositBookingConfirmation, PmuSlotOption } from "@/types/pmu";

type Step = "slot" | "contact" | "card" | "done";

export function PmuBookingModal() {
  const { mode, close } = usePmuBookingModalContext();
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
  const [smsOptIn, setSmsOptIn] = useState(true);
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
          <DoneStep consultationConfirmation={consultationConfirmation} depositConfirmation={depositConfirmation} onClose={close} />
        )}

        <TurnstileWidget onToken={setTurnstileToken} />
      </div>
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
  if (error) return <ErrorNotice message={error} />;
  if (!slots) return <Spinner label="Loading available times…" />;
  if (slots.length === 0) {
    return (
      <div style={styles.emptyState}>
        No open times in the next few weeks — book a free online consultation instead and we'll find a time together.
      </div>
    );
  }

  const groups = groupSlotsByDateKey(slots);

  return (
    <div>
      <p style={styles.stepSubtitle}>Pick a day and time that works for you.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: "55vh", overflowY: "auto" }}>
        {Array.from(groups.entries()).map(([dateKey, daySlots]) => (
          <div key={dateKey}>
            <div style={styles.dayLabel}>{formatSlotDay(daySlots[0].start_at)}</div>
            <div style={styles.slotGrid}>
              {daySlots.map((slot) => (
                <button
                  key={slot.start_at + slot.team_member_id}
                  onClick={() => onSelect(slot)}
                  style={{
                    ...styles.slotButton,
                    ...(selectedSlot?.start_at === slot.start_at ? styles.slotButtonSelected : {}),
                  }}
                >
                  <span>{formatSlotTime(slot.start_at)}</span>
                  {slot.artist_name ? <span style={styles.slotArtist}>{slot.artist_name}</span> : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
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

      <label style={styles.label}>First name</label>
      <input value={givenName} onChange={(e) => onGivenNameChange(e.target.value)} name="fname" autoComplete="given-name" style={styles.input} />
      <label style={styles.label}>Last name</label>
      <input value={familyName} onChange={(e) => onFamilyNameChange(e.target.value)} name="lname" autoComplete="family-name" style={styles.input} />
      <label style={styles.label}>Mobile number</label>
      <input value={phone} onChange={(e) => onPhoneChange(e.target.value)} type="tel" name="phone" autoComplete="tel" inputMode="numeric" maxLength={14} placeholder="(619) 000-0000" style={styles.input} />
      <label style={styles.label}>Email (optional)</label>
      <input value={email} onChange={(e) => onEmailChange(e.target.value)} type="email" name="email" autoComplete="email" style={{ ...styles.input, marginBottom: 10 }} />
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
        <span style={{ display: "block", fontSize: 10.5, lineHeight: 1.45, color: "var(--color-muted-3)", marginTop: 10 }}>
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

function DoneStep({
  consultationConfirmation,
  depositConfirmation,
  onClose,
}: {
  consultationConfirmation: PmuConsultationConfirmation | null;
  depositConfirmation: PmuDepositBookingConfirmation | null;
  onClose: () => void;
}) {
  if (depositConfirmation) {
    return (
      <div style={styles.doneWrap}>
        <div style={styles.doneCheck}>✓</div>
        <h3 style={styles.doneTitle}>You're Booked!</h3>
        <p style={styles.doneSubtitle}>
          {depositConfirmation.service_name} with {depositConfirmation.artist_name ?? "Anna"} —{" "}
          {formatSlotDay(depositConfirmation.start_at)}, {formatSlotTime(depositConfirmation.start_at)}
        </p>
        <div style={styles.doneSummary}>
          <div>Deposit paid: {formatPrice(depositConfirmation.deposit_amount)}</div>
          <div>Due at appointment: {formatPrice(depositConfirmation.remaining_balance)}</div>
        </div>
        <button onClick={onClose} style={styles.continueButton}>
          Done
        </button>
      </div>
    );
  }
  if (consultationConfirmation) {
    return (
      <div style={styles.doneWrap}>
        <div style={styles.doneCheck}>✓</div>
        <h3 style={styles.doneTitle}>Consultation Booked!</h3>
        <p style={styles.doneSubtitle}>
          {consultationConfirmation.service_name} with {consultationConfirmation.artist_name ?? "your artist"} —{" "}
          {formatSlotDay(consultationConfirmation.start_at)}, {formatSlotTime(consultationConfirmation.start_at)}
        </p>
        <button onClick={onClose} style={styles.continueButton}>
          Done
        </button>
      </div>
    );
  }
  return null;
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
    padding: "20px 22px 30px",
    animation: "sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)",
    maxHeight: "95vh",
    overflowY: "auto",
  },
  grabberRow: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: 24, marginBottom: 8 },
  grabber: { width: 38, height: 4, borderRadius: 2, background: "#e3d3ca" },
  closeButton: { position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "#f4ece7", border: "none", borderRadius: "50%", fontSize: 20, color: "var(--color-muted-2)", cursor: "pointer", lineHeight: 1, padding: 0 },
  title: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 24, margin: "6px 0 4px" },
  stepSubtitle: { fontSize: 13.5, color: "var(--color-muted-2)", margin: "0 0 14px", lineHeight: 1.5 },
  emptyState: { fontSize: 14, color: "var(--color-muted)", lineHeight: 1.6, padding: "20px 0" },
  dayLabel: { fontSize: 12.5, fontWeight: 600, color: "var(--color-ink-soft)", marginBottom: 8 },
  slotGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  slotButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    border: "1px solid #e0cfc6",
    background: "#fff",
    borderRadius: 10,
    padding: "10px 6px",
    fontSize: 13,
    fontWeight: 500,
    color: "var(--color-ink)",
    cursor: "pointer",
  },
  slotButtonSelected: { border: "1.5px solid var(--color-accent)", background: "var(--color-accent-tint-2)" },
  slotArtist: { fontSize: 10.5, color: "var(--color-muted-3)" },
  selectedSlotBanner: { fontSize: 13, color: "var(--color-ink-soft)", background: "var(--color-accent-tint)", borderRadius: 10, padding: "8px 12px", marginBottom: 14 },
  label: { fontSize: 13, fontWeight: 500, color: "var(--color-ink-soft)" },
  input: { width: "100%", minWidth: 0, margin: "6px 0 14px", padding: 14, fontSize: 16, border: "1px solid #e0cfc6", borderRadius: 11, background: "#fff" },
  smsCard: { display: "block", padding: "15px 16px", border: "2px solid", borderRadius: 14, cursor: "pointer", marginBottom: 16 },
  honeypot: { position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0, pointerEvents: "none" },
  continueButton: { width: "100%", marginTop: 6, border: "none", color: "#fff7f3", background: "var(--color-accent)", fontSize: 16, fontWeight: 600, padding: 16, borderRadius: 12, cursor: "pointer" },
  backButton: { width: "100%", marginTop: 9, border: "none", background: "none", color: "var(--color-muted-2)", fontSize: 14, padding: 8, cursor: "pointer" },
  securityNote: { fontSize: 11.5, color: "var(--color-muted-3)", textAlign: "center", marginTop: 12 },
  doneWrap: { textAlign: "center", padding: "12px 0" },
  doneCheck: { width: 56, height: 56, borderRadius: "50%", background: "var(--color-success-bg)", color: "var(--color-success)", fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" },
  doneTitle: { fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 24, margin: "0 0 8px" },
  doneSubtitle: { fontSize: 14, color: "var(--color-muted)", lineHeight: 1.5, margin: "0 0 14px" },
  doneSummary: { fontSize: 13, color: "var(--color-ink-soft)", background: "var(--color-accent-tint-2)", borderRadius: 10, padding: "12px 14px", marginBottom: 18, display: "flex", flexDirection: "column", gap: 4 },
};
