import Link from 'next/link';
import Header from '@/components/Header';
import SeatPicker from '@/components/SeatPicker';

const demo = [
  { seat_no: 1, price: 450, state: 'free' as const },
  { seat_no: 2, price: 350, state: 'taken' as const },
  { seat_no: 3, price: 350, state: 'free' as const },
  { seat_no: 4, price: 350, state: 'free' as const },
];

export default function Home() {
  return (
    <>
      <Header />
      <main className="wrap stack">
        <section>
          <h1>Every seat on your daily ride, in one place.</h1>
          <p className="muted">
            Drivers post a trip and share one link on WhatsApp. Passengers pick a seat and book. No more scrolling
            through old messages or booking the same seat twice.
          </p>
        </section>

        <SeatPicker layout="sedan4" seats={demo} selected={[3]} />

        <div className="stack">
          <Link href="/login" className="btn block">I am a driver</Link>
          <Link href="/my-bookings" className="btn secondary block">Find my bookings</Link>
        </div>
        <p className="muted small">Have a trip link from a driver? Open it directly to see seats and prices.</p>
      </main>
    </>
  );
}
