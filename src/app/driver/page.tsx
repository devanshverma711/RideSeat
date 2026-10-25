'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { useDriver } from '@/lib/useDriver';
import { when } from '@/lib/format';
import { newCode } from '@/lib/code';

type TripRow = {
  id: string; code: string; from_place: string; to_place: string; depart_at: string;
  distance_km: number | null; status: string; auto_confirm: boolean; car_id: string;
  trip_seats: { seat_no: number; price: number }[];
  bookings: { status: string }[];
};

export default function Dashboard() {
  const router = useRouter();
  const { loading, userId, driver } = useDriver();
  const [trips, setTrips] = useState<TripRow[] | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('trips')
      .select('id, code, from_place, to_place, depart_at, distance_km, status, auto_confirm, car_id, trip_seats(seat_no, price), bookings(status)')
      .eq('driver_id', userId)
      .order('depart_at', { ascending: true });
    setTrips((data ?? []) as TripRow[]);
  }, [userId]);

  useEffect(() => {
    if (loading) return;
    if (driver === null) { router.replace('/driver/setup'); return; }
    load();
  }, [loading, driver, router, load]);

  async function repeatNextDay(t: TripRow) {
    const next = new Date(new Date(t.depart_at).getTime() + 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('trips').insert({
      code: newCode(), driver_id: userId, car_id: t.car_id, from_place: t.from_place, to_place: t.to_place,
      depart_at: next, distance_km: t.distance_km, auto_confirm: t.auto_confirm,
    }).select('id').single();
    if (error || !data) { alert('Could not repeat this trip. Try again.'); return; }
    await supabase.from('trip_seats').insert(t.trip_seats.map((s) => ({ trip_id: data.id, seat_no: s.seat_no, price: s.price })));
    load();
  }

  const now = Date.now();
  const upcoming = (trips ?? []).filter((t) => new Date(t.depart_at).getTime() >= now - 3 * 3600_000 && t.status !== 'cancelled');
  const past = (trips ?? []).filter((t) => !upcoming.includes(t)).reverse();

  const card = (t: TripRow, showRepeat: boolean) => {
    const active = t.bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed').length;
    const pending = t.bookings.filter((b) => b.status === 'pending').length;
    return (
      <div className="card" key={t.id}>
        <Link href={`/driver/trips/${t.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="route">{t.from_place} <span>to</span> {t.to_place}</div>
          <p className="muted small" style={{ margin: '.25rem 0 .5rem' }}>{when(t.depart_at)}</p>
          <div className="row">
            <span className="chip">{active} of {t.trip_seats.length} seats booked</span>
            {pending > 0 && <span className="chip pending">{pending} to review</span>}
            {t.status === 'cancelled' && <span className="chip cancelled">Cancelled</span>}
          </div>
        </Link>
        {showRepeat && t.status !== 'cancelled' && (
          <div style={{ marginTop: '.75rem' }}>
            <button className="btn secondary small" onClick={() => repeatNextDay(t)}>Repeat next day</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Header signOut />
      <main className="wrap stack">
        <div className="row between">
          <h1 style={{ margin: 0 }}>Your trips</h1>
          <Link href="/driver/trips/new" className="btn">New trip</Link>
        </div>

        {trips === null && <p className="muted">Loading trips…</p>}
        {trips && upcoming.length === 0 && (
          <div className="card">
            <p><strong>No upcoming trips.</strong></p>
            <p className="muted">Create a trip, then share its link in your WhatsApp groups.</p>
          </div>
        )}
        {upcoming.map((t) => card(t, true))}

        {past.length > 0 && (
          <>
            <h2>Past and cancelled</h2>
            {past.slice(0, 15).map((t) => card(t, true))}
          </>
        )}
        <p><Link href="/driver/setup" className="small">Add another car</Link></p>
      </main>
    </>
  );
}
