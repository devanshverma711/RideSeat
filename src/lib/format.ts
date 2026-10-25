export const rupee = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
  });

export const isPhone = (v: string) => /^[6-9][0-9]{9}$/.test(v);
export const digits = (v: string) => v.replace(/\D/g, '').slice(-10);

export function bookingError(message: string): string {
  if (message.includes('seat_taken')) return 'Someone just booked one of those seats. Pick another seat and try again.';
  if (message.includes('trip_closed')) return 'This trip is no longer taking bookings.';
  if (message.includes('trip_not_found')) return 'This trip link is not valid.';
  if (message.includes('bad_phone')) return 'Enter a valid 10-digit mobile number.';
  if (message.includes('bad_name')) return 'Enter your name.';
  if (message.includes('bad_seats')) return 'Select between 1 and 6 seats.';
  return 'Something went wrong. Please try again.';
}

export const waLink = (phone10: string, text: string) =>
  `https://wa.me/91${phone10}?text=${encodeURIComponent(text)}`;
