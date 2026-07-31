import Hero from "./hero/Hero";
import Instruments from "./Instruments";
import Journal from "./Journal";
import QuickActions from "./QuickActions";

export default function Cockpit() {
  return (
    <main className="space-y-8">

      <Hero />

      <section className="grid grid-cols-12 gap-6">

        <div className="col-span-8">
          <Instruments />
        </div>

        <aside className="col-span-4">
          <Journal />
        </aside>

      </section>

      <QuickActions />

    </main>
  );
}