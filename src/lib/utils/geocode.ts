/**
 * Reverse-geocodes a lat/lng pair to a city name using the free
 * Nominatim OpenStreetMap API. Returns null on any failure.
 *
 * Nominatim usage policy: max 1 req/sec, must send a descriptive User-Agent.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'pedal-fiddle/1.0 (personal strava automation)' },
    });
    if (!res.ok) return null;

    const data = await res.json() as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        county?: string;
        state?: string;
      };
    };

    // Nominatim returns city > town > village in decreasing urban specificity
    return (
      data.address?.city ??
      data.address?.town ??
      data.address?.village ??
      null
    );
  } catch {
    return null;
  }
}
