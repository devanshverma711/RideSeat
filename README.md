# RideSeat

Seat booking for drivers who run daily rides. Drivers post a trip (route, time, car, seat prices) and share one link
on WhatsApp. Passengers open the link, pick seats on a car diagram and book. Nobody has to search chat history, and a
seat can never be booked twice.

Built with Next.js 14 (App Router, TypeScript) and Supabase (Postgres + phone OTP). No payment is taken; passengers pay the driver.

## Try it first (demo mode, no Supabase)

```bash
npm install
npm run dev
```

With no `.env.local` file the app runs on sample data stored in your browser. Sign in with any phone number and any code, and open `/t/demo123` for the passenger view. To reset the demo data, clear this site's data in your browser. When you are ready for the real database, do the Setup below; the demo mode switches off by itself once the keys are present.

## Setup

1. Create a free project at https://supabase.com.
2. SQL Editor: paste and run `supabase/schema.sql`.
3. Authentication > Providers > Phone: enable it and connect an SMS provider (Twilio, MessageBird, Vonage or TextLocal).
   For testing without SMS, use "Test phone numbers and OTPs" on the same page.
4. Copy `.env.example` to `.env.local` and fill in the project URL and anon key (Project Settings > API).
5. Run:

```bash
npm install
npm run dev
```

Open http://localhost:3000. Sign in as a driver, add your car, create a trip, then open the share link in a private
window to test booking as a passenger.

## Deploy

Push to GitHub, import in Vercel, add the two environment variables, deploy. Passengers can use "Add to Home Screen" to install it like an app.

## How it works

| Piece | Where |
| --- | --- |
| Tables, security rules, booking functions | `supabase/schema.sql` |
| Double-booking guard | unique index `one_active_booking_per_seat` |
| Passenger booking (no login) | `request_seats`, `get_trip_public`, `my_bookings`, `cancel_booking` functions |
| Seat diagrams (4, 5, 6, 7 passenger seats) | `src/lib/layouts.ts` |
| Car models and their default seat layout | `src/lib/cars.ts` |
| Driver side of the seat map (`right` for India) | `src/lib/config.ts` |
| Driver pages | `src/app/driver/*` |
| Passenger pages | `src/app/t/[code]`, `src/app/my-bookings` |
| App name | `src/lib/config.ts` |

## Known limits of this first version

- "My bookings" is found by mobile number only, with no OTP. Anyone who knows a number can see its bookings. Add OTP before real use at scale.
- Pending requests do not expire on their own. The driver accepts or rejects them.
- No push or WhatsApp notifications yet; drivers see new requests on their dashboard. Next step: WhatsApp Business API or SMS.
- No online payments yet (Razorpay UPI is the natural next step).
- Booking spam is not rate limited yet.
- Rules for carrying paying passengers in private cars vary in India. Check local RTO or permit requirements.
