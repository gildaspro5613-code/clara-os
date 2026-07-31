import InstrumentCard from "./InstrumentCard";

const instruments = [
  {
    title: "Prospects",
    value: "17",
    subtitle: "3 nouveaux aujourd'hui",
  },
  {
    title: "Rendez-vous",
    value: "4",
    subtitle: "2 cet après-midi",
  },
  {
    title: "Automatisations",
    value: "31",
    subtitle: "Toutes opérationnelles",
  },
  {
    title: "Emails",
    value: "12",
    subtitle: "5 nécessitent une réponse",
  },
];

export default function Instruments() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {instruments.map((card) => (
        <InstrumentCard
          key={card.title}
          title={card.title}
          value={card.value}
          subtitle={card.subtitle}
        />
      ))}
    </section>
  );
}