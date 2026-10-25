'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import SeatPicker, { SeatView } from '@/components/SeatPicker';
import { supabase } from '@/lib/supabase';
import { useDriver } from '@/lib/useDriver';
import { digits, isPhone, rupee, waLink, when } from '@/lib/format';
import type { BookingStatus } from '@/lib/types';

type Booking = {
  id: string; seat_no: number; passenger_name: string; passenger_phone: string;
  status: BookingStatus; source: string; created_at: string;
};
type Trip = {
  id: string; code: string; from_place: string; to_place: string; depart_at: string; status: string;
  trip_seats: { seat_no: number; price: number }[];
  bookings: Booking[];
  cars: { name: string; plate: string | null; layout: string };
};

const isActive = (b: Booking) => b.status === 'pending' || b.status === 'confirmed';

export default function TripDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { userId } = useDriver();
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined);
  const [picked, setPicked] = useState<number[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('trips')
      .select('*, trip_seats(seat_no, price), bookings(*), cars(name, plate, layout)')
      .eq('id', params.id)
      .maybeSingle();
    setTrip((data as Trip) ?? null);
  }, [params.id]);

  useEffect(() => { if (userId) load(); }, [userId, load]);

  if (trip === undefined) return <Header signOut />;
  if (trip === null) {
    return (
      <>
        <Header signOut />
        <main className="wrap"><p>Trip not found.</p><Link href="/driver">Back to your trips</Link></main>
      </>
    );
  }

  const seatViews: SeatView[] = trip.trip_seats.map((s) => {
    const b = trip.bookings.find((x) => x.seat_no === s.seat_no && isActive(x));
    return { seat_no: s.seat_no, price: s.price, state: b ? b.status as 'pending' | 'confirmed' : 'free' };
  });
  const freeCount = seatViews.filter((s) => s.state === 'free').length;
  const link = typeof window !== 'undefined' ? `${window.location.origin}/t/${trip.code}` : '';
  const shareText = `${trip.from_place} to ${trip.to_place}, ${when(trip.depart_at)}. ${freeCount} seats left. Book your seat: ${link}`;
  const open = trip.status === 'open';

  async function setStatus(id: string, status: BookingStatus) {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
    if (error) setMsg('Could not update this booking. Refresh and try again.');
    load();
  }

  async function addManual() {
    setMsg('');
    if (picked.length === 0) return setMsg('Select at least one seat above.');
    if (name.trim().length < 2) return setMsg('Enter the passenger name.');
    if (!isPhone(phone)) return setMsg('Enter a valid 10-digit mobile number.');
    const rows = picked.map((n) => ({
      trip_id: trip!.id, seat_no: n, passenger_name: name.trim(), passenger_phone: phone, status: 'confirmed', source: 'manual',
    }));
    const { error } = await supabase.from('bookings').insert(rows);
    if (error) { setMsg('One of those seats was just taken. Pick another.'); load(); return; }
    setPicked([]); setName(''); setPhone('');
    load();
  }

  async function cancelTrip() {
    if (!confirm('Cancel this trip? All bookings will be cancelled.')) return;
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('trip_id', trip!.id).in('status', ['pending', 'confirmed']);
    await supabase.from('trips').update({ status: 'cancelled' }).eq('id', trip!.id);
    router.replace('/driver');
  }

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const active = trip.bookings.filter(isActive).sort((a, b) => a.seat_no - b.seat_no);
  const income = active.filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + (trip.trip_seats.find((s) => s.seat_no === b.seat_no)?.price ?? 0), 0);

  return (
    <>
      <Header signOut />
      <main className="wrap stack">
        <Link href="/driver" className="small">All trips</Link>
        <div>
          <div className="route">{trip.from_place} <span>to</span> {trip.to_place}</div>
          <p className="muted">{when(trip.depart_at)} · {trip.cars.name}{trip.cars.plate ? ` · ${trip.cars.plate}` : ''}</p>
          {!open && <span className="chip cancelled">{trip.status}</span>}
        </div>

        {open && (
          <div className="card stack">
            <h2>Share this trip</h2>
            <div className="row">
              <a className="btn grow" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}>Share on WhatsApp</a>
              <button className="btn secondary" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
            </div>
            <p className="muted small" style={{ wordBreak: 'break-all' }}>{link}</p>
          </div>
        )}

        <SeatPicker layout={trip.cars.layout} seats={seatViews} selected={picked}
          onToggle={open ? (n) => setPicked((p) => p.includes(n) ? p.filter((x) => x !== n) : [...p, n]) : undefined} />
        <p className="muted small" style={{ textAlign: 'center' }}>{freeCount} free · confirmed income {rupee(income)}</p>

        <section className="stack">
          <h2>Bookings</h2>
          {active.length === 0 && <p className="muted">No bookings yet.</p>}
          {active.map((b) => (
            <div className="card" key={b.id}>
              <div className="row between">
                <strong>Seat {b.seat_no}: {b.passenger_name}</strong>
                <span className={`chip ${b.status}`}>{b.status}</span>
              </div>
              <p className="muted small" style={{ margin: '.25rem 0 .6rem' }}>
                {b.passenger_phone}{b.source === 'manual' ? ' · added by you' : ''}
              </p>
              <div className="row">
                {b.status === 'pending' && <button className="btn small" onClick={() => setStatus(b.id, 'confirmed')}>Accept</button>}
                {b.status === 'pending' && <button className="btn danger small" onClick={() => setStatus(b.id, 'rejected')}>Reject</button>}
                {b.status === 'confirmed' && <button className="btn danger small" onClick={() => setStatus(b.id, 'cancelled')}>Cancel seat</button>}
                <a className="btn secondary small" href={`tel:+91${b.passenger_phone}`}>Call</a>
                <a className="btn secondary small" target="_blank" rel="noreferrer"
                  href={waLink(b.passenger_phone, `Hi ${b.passenger_name}, about your seat ${b.seat_no} on ${trip.from_place} to ${trip.to_place}, ${when(trip.depart_at)}.`)}>WhatsApp</a>
              </div>
            </div>
          ))}
        </section>

        {open && (
          <section className="card">
            <h2>Add a booking you took on WhatsApp</h2>
            <p className="muted small">Tap free seats above, then enter the passenger. This keeps every booking in one list and blocks double booking.</p>
            <div className="field">
              <label htmlFor="pn">Passenger name</label>
              <input id="pn" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pp">Mobile number</label>
              <input id="pp" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(digits(e.target.value))} />
            </div>
            {msg && <p className="notice error" style={{ marginTop: '.85rem' }}>{msg}</p>}
            <div style={{ marginTop: '1rem' }}>
              <button className="btn block" onClick={addManual}>Add booking{picked.length ? ` for ${picked.length} seat${picked.length > 1 ? 's' : ''}` : ''}</button>
            </div>
          </section>
        )}

        {open && <button className="btn danger block" onClick={cancelTrip}>Cancel this trip</button>}
      </main>
    </>
  );
}
