/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : Instruments.tsx
 * Responsibility :
 * Displays the collection of
 * Cockpit instruments.
 * ============================================
 */

import InstrumentCard from "./InstrumentCard";

export default function Instruments() {
  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

      <InstrumentCard title="Agenda">
        Aucun rendez-vous.
      </InstrumentCard>

      <InstrumentCard title="Emails">
        Aucun nouvel email.
      </InstrumentCard>

      <InstrumentCard title="Automatisations">
        Toutes les automatisations sont opérationnelles.
      </InstrumentCard>

    </section>
  );
}