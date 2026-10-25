'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { useDriver } from '@/lib/useDriver';
import { getLayout, seatNumbers } from '@/lib/layouts';
import { newCode } from '@/lib/code';
import type { Car } from '@/lib/types';

export default function NewTrip() {
  const router = useRouter();
  const { userId } = useDriver();
  const [cars, setCars] = useState<Car[]>([]);
  const [carId, setCarId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [at, setAt] = useState('');
  const [km, setKm] = useState('');
  const [auto, setAuto] = useState(false);
  const [base, setBase] = useState('350');
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!userId) return;
    supabase.from('cars').select('*').eq('driver_id', userId).then(({ data }) => {
      const list = (data ?? []) as Car[];
      if (list.length === 0) { router.replace('/driver/setup'); return; }
      setCars(list);
      setCarId(list[0].id);
    });
  }, [userId, router]);

  const car = cars.find((c) => c.id === carId);
  const layoutKey = car?.layout;

  // Changing the car or the base price resets every seat to the base price.
  useEffect(() => {
    if (!layoutKey) return;
    setPrices(Object.fromEntries(seatNumbers(getLayout(layoutKey)).map((n) => [n, base])));
  }, [layoutKey, base]);

  const layout = layoutKey ? getLayout(layoutKey) : null;

  async function create() {
    setErr('');
    if (!userId || !car || !layout) return;
    if (!from.trim() || !to.trim()) return setErr('Enter where the trip starts and ends.');
    if (!at) return setErr('Choose the date and time.');
    const departAt = new Date(at);
    if (departAt.getTime() < Date.now()) return setErr('Choose a time in the future.');
    const seatRows = seatNumbers(layout)
      .filter((n) => (prices[n] ?? '') !== '')
      .map((n) => ({ seat_no: n, price: Number(prices[n]) }));
    if (seatRows.length === 0) return setErr('Set a price for at least one seat.');
    if (seatRows.some((s) => !Number.isFinite(s.price) || s.price < 0)) return setErr('Enter a valid price for each seat.');

    setBusy(true);
    let tripId: string | null = null;
    for (let i = 0; i < 3 && !tripId; i++) {
      const { data, error } = await supabase.from('trips').insert({
        code: newCode(), driver_id: userId, car_id: car.id, from_place: from.trim(), to_place: to.trim(),
        depart_at: departAt.toISOString(), distance_km: km ? Number(km) : null, auto_confirm: auto,
      }).select('id').single();
      if (data) tripId = data.id;
      else if (error?.code !== '23505') break; // retry only on a code collision
    }
    if (!tripId) { setBusy(false); return setErr('Could not create the trip. Try again.'); }
    const { error } = await supabase.from('trip_seats').insert(seatRows.map((s) => ({ ...s, trip_id: tripId })));
    setBusy(false);
    if (error) return setErr('The trip was created but seats could not be saved. Open it and try again.');
    router.replace(`/driver/trips/${tripId}`);
  }

  return (
    <>
      <Header signOut />
      <main className="wrap stack">
        <h1>New trip</h1>
        <div className="card">
          <div className="grid2">
            <div className="field">
              <label htmlFor="from">From</label>
              <input id="from" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Pune, Hinjewadi" />
            </div>
            <div className="field" style={{ marginTop: 0 }}>
              <label htmlFor="to">To</label>
              <input id="to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Mumbai, Dadar" />
            </div>
          </div>
          <div className="grid2" style={{ marginTop: '.85rem' }}>
            <div>
              <label htmlFor="at">Date and time</label>
              <input id="at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
            </div>
            <div>
              <label htmlFor="km">Distance (km)</label>
              <input id="km" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
          {cars.length > 1 && (
            <div className="field">
              <label htmlFor="car">Car</label>
              <select id="car" value={carId} onChange={(e) => setCarId(e.target.value)}>
                {cars.map((c) => <option key={c.id} value={c.id}>{c.name}{c.plate ? ` (${c.plate})` : ''}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Seat prices</h2>
          <div className="field">
            <label htmlFor="base">Price for every seat (₹)</label>
            <input id="base" inputMode="numeric" value={base} onChange={(e) => setBase(e.target.value.replace(/\D/g, ''))} />
          </div>
          <p className="muted small" style={{ marginTop: '.85rem' }}>Change a single seat below, for example a higher price for the front seat. Leave a seat empty to keep it off sale.</p>
          <div className="prices">
            {layout && layout.cells.map((c) => c.kind === 'seat' && (
              <div key={c.no}>
                <label htmlFor={`p${c.no}`}>{c.label} (₹)</label>
                <input id={`p${c.no}`} inputMode="numeric" value={prices[c.no] ?? ''}
                  onChange={(e) => setPrices((p) => ({ ...p, [c.no]: e.target.value.replace(/\D/g, '') }))} />
              </div>
            ))}
          </div>
        </div>

        <label className="check card">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          <span>Confirm bookings automatically<br /><span className="muted small">Off means you accept or reject each request.</span></span>
        </label>

        {err && <p className="notice error">{err}</p>}
        <button className="btn block" disabled={busy || !car} onClick={create}>Create trip</button>
      </main>
    </>
  );
}
