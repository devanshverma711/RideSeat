'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import SeatPicker, { SeatView } from '@/components/SeatPicker';
import { supabase } from '@/lib/supabase';
import { bookingError, digits, isPhone, rupee, waLink, when } from '@/lib/format';
import type { PublicTrip } from '@/lib/types';

export default function PublicTrip({ params }: { params: { code: string } }) {
  const [trip, setTrip] = useState<PublicTrip | null | undefined>(undefined);
  const [picked, setPicked] = useState<number[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ status: string; seats: number[] } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_trip_public', { p_code: params.code });
    setTrip(error ? null : (data as PublicTrip | null));
  }, [params.code]);

  useEffect(() => {
    load();
    try { setPhone(localStorage.getItem('rideseat_phone') ?? ''); } catch { /* storage unavailable */ }
  }, [load]);

  if (trip === undefined) return <Header />;
  if (trip === null) {
    return (
      <>
        <Header />
        <main className="wrap stack">
          <h1>Trip not found</h1>
          <p className="muted">This link is not valid. Ask the driver to send it again.</p>
        </main>
      </>
    );
  }

  const seats: SeatView[] = trip.seats.map((s) => ({ seat_no: s.seat_no, price: s.price, state: s.taken ? 'taken' : 'free' }));
  const total = trip.seats.filter((s) => picked.includes(s.seat_no)).reduce((n, s) => n + s.price, 0);
  const free = seats.filter((s) => s.state === 'free').length;
  const bookable = trip.status === 'open' && new Date(trip.depart_at).getTime() > Date.now();

  async function submit() {
    setErr('');
    if (picked.length === 0) return setErr('Select at least one seat.');
    if (name.trim().length < 2) return setErr('Enter your name.');
    if (!isPhone(phone)) return setErr('Enter a valid 10-digit mobile number.');
    setBusy(true);
    const { data, error } = await supabase.rpc('request_seats', {
      p_code: params.code, p_name: name.trim(), p_phone: phone, p_seats: picked,
    });
    setBusy(false);
    if (error) {
      setErr(bookingError(error.message));
      setPicked([]);
      load();
      return;
    }
    try { localStorage.setItem('rideseat_phone', phone); } catch { /* storage unavailable */ }
    setDone({ status: (data as { status: string }).status, seats: picked });
    load();
  }

  if (done) {
    const confirmed = done.status === 'confirmed';
    return (
      <>
        <Header />
        <main className="wrap stack">
          <h1>{confirmed ? 'Seat booked' : 'Request sent'}</h1>
          <p className={`notice ${confirmed ? 'ok' : ''}`}>
            {confirmed
              ? `Your seat${done.seats.length > 1 ? 's are' : ' is'} confirmed.`
              : `${trip.driver_name} will accept or reject your request. Check Find my bookings for the answer.`}
          </p>
          <div className="card">
            <div className="route">{trip.from_place} <span>to</span> {trip.to_place}</div>
            <p className="muted">{when(trip.depart_at)} · Seat {done.seats.join(', ')}</p>
          </div>
          <a className="btn block" target="_blank" rel="noreferrer"
            href={waLink(trip.driver_phone, `Hi ${trip.driver_name}, I booked seat ${done.seats.join(', ')} for ${trip.from_place} to ${trip.to_place}, ${when(trip.depart_at)}. Name: ${name.trim()}.`)}>
            Message the driver on WhatsApp
          </a>
          <Link href="/my-bookings" className="btn secondary block">Find my bookings</Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="wrap stack">
        <div>
          <div className="route">{trip.from_place} <span>to</span> {trip.to_place}</div>
          <p className="muted">
            {when(trip.depart_at)}{trip.distance_km ? ` · ${trip.distance_km} km` : ''}<br />
            {trip.driver_name} · {trip.car_name}{trip.car_plate ? ` · ${trip.car_plate}` : ''}
          </p>
        </div>

        {!bookable && <p className="notice">This trip is no longer taking bookings.</p>}
        {bookable && free === 0 && <p className="notice">All seats are taken.</p>}

        <SeatPicker layout={trip.layout} seats={seats} selected={picked}
          onToggle={bookable ? (n) => setPicked((p) => p.includes(n) ? p.filter((x) => x !== n) : [...p, n]) : undefined} />
        {bookable && <p className="muted small" style={{ textAlign: 'center' }}>Tap a seat to select it. {free} of {seats.length} free.</p>}

        {bookable && free > 0 && (
          <div className="card">
            <div className="field">
              <label htmlFor="n">Your name</label>
              <input id="n" value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="p">Mobile number</label>
              <input id="p" inputMode="numeric" maxLength={10} autoComplete="tel-national"
                value={phone} onChange={(e) => setPhone(digits(e.target.value))} />
            </div>
            {err && <p className="notice error" style={{ marginTop: '.85rem' }}>{err}</p>}
          </div>
        )}

        {bookable && free > 0 && (
          <div className="sticky-total">
            <button className="btn block" disabled={busy} onClick={submit}>
              {picked.length === 0 ? 'Select a seat to continue' : `${trip.auto_confirm ? 'Book' : 'Request'} ${picked.length} seat${picked.length > 1 ? 's' : ''} · ${rupee(total)}`}
            </button>
            <p className="muted small" style={{ textAlign: 'center', margin: '.4rem 0 0' }}>Pay the driver directly. {trip.auto_confirm ? '' : 'The driver confirms your seat.'}</p>
          </div>
        )}
      </main>
    </>
  );
}
