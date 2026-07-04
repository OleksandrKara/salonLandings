import { FormEvent, useState } from "react";
import { createBooking } from "@/api/bookings";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { formatPrice, formatSlotDay, formatSlotTime } from "@/lib/formatting";
import type { BookingConfirmation, CustomerContact, ServiceOffer, SlotOption } from "@/types/api";
import styles from "./ContactStep.module.css";

interface ContactStepProps {
  offer: ServiceOffer;
  slot: SlotOption;
  onBookingConfirmed: (confirmation: BookingConfirmation) => void;
}

export function ContactStep({ offer, slot, onBookingConfirmed }: ContactStepProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const customer: CustomerContact = {
      given_name: String(formData.get("given_name") ?? "").trim(),
      family_name: String(formData.get("family_name") ?? "").trim(),
      email_address: String(formData.get("email_address") ?? "").trim(),
      phone_number: String(formData.get("phone_number") ?? "").trim(),
      marketing_opt_in: formData.get("marketing_opt_in") === "on",
    };
    const note = String(formData.get("note") ?? "").trim();

    setSubmitting(true);
    try {
      const confirmation = await createBooking({
        slot: {
          service_slug: offer.slug,
          start_at: slot.start_at,
          service_variation_id: slot.service_variation_id,
          service_variation_version: slot.service_variation_version,
          team_member_id: slot.team_member_id,
        },
        customer,
        note: note || undefined,
      });
      onBookingConfirmed(confirmation);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "We couldn't confirm your appointment. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <Card>
        <p className={styles.summaryService}>{offer.name}</p>
        <p className={styles.summaryDetail}>
          {formatSlotDay(slot.start_at)} at {formatSlotTime(slot.start_at)}
          {slot.artist_name ? ` · ${slot.artist_name}` : ""}
        </p>
        <p className={styles.summaryPrice}>{formatPrice(slot.price)}</p>
      </Card>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.row}>
          <Field label="First name" name="given_name" autoComplete="given-name" required />
          <Field label="Last name" name="family_name" autoComplete="family-name" required />
        </div>
        <Field label="Email" name="email_address" type="email" autoComplete="email" required />
        <Field label="Phone" name="phone_number" type="tel" autoComplete="tel" required />
        <label className={styles.checkboxRow}>
          <input type="checkbox" name="marketing_opt_in" />
          <span>Send me exclusive offers and appointment reminders</span>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Anything we should know? (optional)</span>
          <textarea name="note" rows={2} maxLength={500} className={styles.textarea} />
        </label>

        {error ? <ErrorNotice message={error} /> : null}

        <Button type="submit" fullWidth loading={submitting}>
          Confirm Appointment
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input
        className={styles.input}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
      />
    </label>
  );
}
