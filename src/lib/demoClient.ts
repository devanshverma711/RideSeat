// Demo mode: a tiny in-browser stand-in for Supabase. Data lives in localStorage.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type DB = { drivers: Row[]; cars: Row[]; trips: Row[]; trip_seats: Row[]; bookings: Row[] };
type Result = { data: any; error: any };

const DB_KEY = 'rideseat_demo_db';
const SESSION_KEY = 'rideseat_demo_session';
const DEMO_DRIVER = 'demo-driver';
const ACTIVE = ['pending', 'confirmed'];

const uid = () => crypto.randomUUID();

function seed(): DB {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  t.setHours(7, 0, 0, 0);
  const tripId = uid();
  const carId = uid();
  return {
    drivers: [{ id: DEMO_DRIVER, name: 'Demo Driver', phone: '9999999999' }],
    cars: [{ id: carId, driver_id: DEMO_DRIVER, name: 'Maruti Swift Dzire', plate: 'MH 12 AB 1234', layout: 'sedan4' }],
    trips: [{
      id: tripId, code: 'demo123', driver_id: DEMO_DRIVER, car_id: carId, from_place: 'Pune, Hinjewadi',
      to_place: 'Mumbai, Dadar', depart_at: t.toISOString(), distance_km: 150, auto_confirm: false,
      status: 'open', created_at: new Date().toISOString(),
    }],
    trip_seats: [
      { trip_id: tripId, seat_no: 1, price: 450 }, { trip_id: tripId, seat_no: 2, price: 350 },
      { trip_id: tripId, seat_no: 3, price: 350 }, { trip_id: tripId, seat_no: 4, price: 350 },
    ],
    bookings: [
      { id: uid(), trip_id: tripId, seat_no: 2, passenger_name: 'Rohan', passenger_phone: '9876543210', status: 'confirmed', source: 'manual', created_at: new Date().toISOString() },
      { id: uid(), trip_id: tripId, seat_no: 3, passenger_name: 'Priya', passenger_phone: '9812345678', status: 'pending', source: 'link', created_at: new Date().toISOString() },
    ],
  };
}

function load(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch { /* fall through to seed */ }
  const db = seed();
  save(db);
  return db;
}
function save(db: DB) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* storage unavailable */ }
}

const withNested = (db: DB, table: keyof DB, r: Row): Row =>
  table === 'trips'
    ? {
        ...r,
        trip_seats: db.trip_seats.filter((s) => s.trip_id === r.id),
        bookings: db.bookings.filter((b) => b.trip_id === r.id),
        cars: db.cars.find((c) => c.id === r.car_id) ?? null,
      }
    : r;

class Query implements PromiseLike<Result> {
  private op: 'select' | 'insert' | 'update' = 'select';
  private payload: any;
  private filters: ((r: Row) => boolean)[] = [];
  private ordering?: { col: string; asc: boolean };
  private single: null | 'single' | 'maybe' = null;
  private returning = false;
  constructor(private table: keyof DB) {}

  select(_cols?: string) { if (this.op !== 'select') this.returning = true; return this; }
  insert(rows: Row | Row[]) { this.op = 'insert'; this.payload = rows; return this; }
  update(values: Row) { this.op = 'update'; this.payload = values; return this; }
  eq(col: string, val: any) { this.filters.push((r) => r[col] === val); return this; }
  in(col: string, vals: any[]) { this.filters.push((r) => vals.includes(r[col])); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.ordering = { col, asc: opts?.ascending !== false }; return this; }
  maybeSingle() { this.single = 'maybe'; return this; }
  // Real Supabase returns the data as a single object here
  singleRow() { this.single = 'single'; return this; }

  then<A = Result, B = never>(onF?: ((v: Result) => A | PromiseLike<A>) | null, onR?: ((e: any) => B | PromiseLike<B>) | null) {
    return Promise.resolve(this.run()).then(onF, onR);
  }

  private shape(db: DB, rows: Row[]): Result {
    const out = rows.map((r) => withNested(db, this.table, r));
    if (this.single === 'maybe') return { data: out[0] ?? null, error: null };
    if (this.single === 'single') return out[0] ? { data: out[0], error: null } : { data: null, error: { message: 'No rows' } };
    return { data: out, error: null };
  }

  private run(): Result {
    const db = load();
    const tbl = db[this.table];
    if (this.op === 'select') {
      let rows = tbl.filter((r) => this.filters.every((f) => f(r)));
      if (this.ordering) {
        const { col, asc } = this.ordering;
        rows = [...rows].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1));
      }
      return this.shape(db, rows);
    }
    if (this.op === 'update') {
      tbl.filter((r) => this.filters.every((f) => f(r))).forEach((r) => Object.assign(r, this.payload));
      save(db);
      return { data: null, error: null };
    }
    // insert
    const incoming: Row[] = Array.isArray(this.payload) ? this.payload : [this.payload];
    const added: Row[] = [];
    for (const raw of incoming) {
      const row: Row = { ...raw };
      if (this.table !== 'trip_seats' && this.table !== 'drivers') row.id = row.id ?? uid();
      row.created_at = new Date().toISOString();
      if (this.table === 'trips') {
        row.status = row.status ?? 'open';
        if (db.trips.some((t) => t.code === row.code)) return { data: null, error: { code: '23505', message: 'duplicate code' } };
      }
      if (this.table === 'bookings') {
        row.status = row.status ?? 'pending';
        row.source = row.source ?? 'link';
        const clash = db.bookings.some((b) => b.trip_id === row.trip_id && b.seat_no === row.seat_no && ACTIVE.includes(b.status));
        if (clash && ACTIVE.includes(row.status)) return { data: null, error: { code: '23505', message: 'seat taken' } };
      }
      tbl.push(row);
      added.push(row);
    }
    save(db);
    return this.returning ? this.shape(db, added) : { data: null, error: null };
  }
}
// supabase-js uses .single(); keep the same name on the mock
(Query.prototype as any).single = Query.prototype.singleRow;

const fail = (message: string): Result => ({ data: null, error: { message } });

function rpc(name: string, args: Row): Result {
  const db = load();
  if (name === 'get_trip_public') {
    const t = db.trips.find((x) => x.code === args.p_code);
    if (!t) return { data: null, error: null };
    const d = db.drivers.find((x) => x.id === t.driver_id)!;
    const c = db.cars.find((x) => x.id === t.car_id)!;
    const seats = db.trip_seats.filter((s) => s.trip_id === t.id).sort((a, b) => a.seat_no - b.seat_no).map((s) => ({
      seat_no: s.seat_no, price: s.price,
      taken: db.bookings.some((b) => b.trip_id === t.id && b.seat_no === s.seat_no && ACTIVE.includes(b.status)),
    }));
    return {
      data: {
        id: t.id, code: t.code, from_place: t.from_place, to_place: t.to_place, depart_at: t.depart_at,
        distance_km: t.distance_km, status: t.status, auto_confirm: t.auto_confirm, driver_name: d.name,
        driver_phone: d.phone, car_name: c.name, car_plate: c.plate, layout: c.layout, seats,
      },
      error: null,
    };
  }
  if (name === 'request_seats') {
    const t = db.trips.find((x) => x.code === args.p_code);
    if (!t) return fail('trip_not_found');
    if (t.status !== 'open' || new Date(t.depart_at).getTime() < Date.now()) return fail('trip_closed');
    const seats: number[] = args.p_seats ?? [];
    if (seats.length === 0 || seats.length > 6) return fail('bad_seats');
    if (String(args.p_name).trim().length < 2) return fail('bad_name');
    if (!/^[6-9][0-9]{9}$/.test(args.p_phone)) return fail('bad_phone');
    const offered = db.trip_seats.filter((s) => s.trip_id === t.id).map((s) => s.seat_no);
    const status = t.auto_confirm ? 'confirmed' : 'pending';
    const taken = new Set(db.bookings.filter((b) => b.trip_id === t.id && ACTIVE.includes(b.status)).map((b) => b.seat_no));
    for (const s of seats) {
      if (!offered.includes(s)) return fail('bad_seats');
      if (taken.has(s)) return fail('seat_taken');
      taken.add(s);
    }
    seats.forEach((s) => db.bookings.push({
      id: uid(), trip_id: t.id, seat_no: s, passenger_name: String(args.p_name).trim(),
      passenger_phone: args.p_phone, status, source: 'link', created_at: new Date().toISOString(),
    }));
    save(db);
    return { data: { status, seats }, error: null };
  }
  if (name === 'my_bookings') {
    const rows = db.bookings.filter((b) => b.passenger_phone === args.p_phone).map((b) => {
      const t = db.trips.find((x) => x.id === b.trip_id)!;
      const s = db.trip_seats.find((x) => x.trip_id === b.trip_id && x.seat_no === b.seat_no)!;
      const d = db.drivers.find((x) => x.id === t.driver_id)!;
      return {
        id: b.id, seat_no: b.seat_no, status: b.status, passenger_name: b.passenger_name, code: t.code,
        from_place: t.from_place, to_place: t.to_place, depart_at: t.depart_at, trip_status: t.status,
        price: s.price, driver_name: d.name, driver_phone: d.phone,
      };
    }).sort((a, b) => (a.depart_at < b.depart_at ? 1 : -1));
    return { data: rows, error: null };
  }
  if (name === 'cancel_booking') {
    const b = db.bookings.find((x) => x.id === args.p_id && x.passenger_phone === args.p_phone && ACTIVE.includes(x.status));
    if (b) { b.status = 'cancelled'; save(db); }
    return { data: !!b, error: null };
  }
  return fail('unknown_function');
}

export function createDemoClient() {
  return {
    from: (table: keyof DB) => new Query(table),
    rpc: async (name: string, args: Row) => rpc(name, args),
    auth: {
      getSession: async () => {
        let raw: string | null = null;
        try { raw = localStorage.getItem(SESSION_KEY); } catch { /* storage unavailable */ }
        return { data: { session: raw ? { user: JSON.parse(raw) } : null }, error: null };
      },
      signInWithOtp: async () => ({ data: {}, error: null }),
      verifyOtp: async ({ phone }: { phone: string }) => {
        load(); // make sure demo data exists
        try { localStorage.setItem(SESSION_KEY, JSON.stringify({ id: DEMO_DRIVER, phone: phone.replace('+', '') })); } catch { /* storage unavailable */ }
        return { data: {}, error: null };
      },
      signOut: async () => {
        try { localStorage.removeItem(SESSION_KEY); } catch { /* storage unavailable */ }
        return { error: null };
      },
    },
  };
}
