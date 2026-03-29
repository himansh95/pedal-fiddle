import type { StravaActivity } from '@/lib/types';

function metersToKm(m: number): string {
  return (m / 1000).toFixed(2);
}

function secondsToMinutes(s: number): string {
  return Math.round(s / 60).toString();
}

function pacePerKm(distanceM: number, movingTimeSec: number): string {
  if (distanceM === 0) return 'N/A';
  const secPerKm = movingTimeSec / (distanceM / 1000);
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
}

function timeOfDay(startDateLocal: string): string {
  // Parse the hour directly from the local time string (e.g. "2024-03-22T07:30:00Z")
  // to avoid JS treating the timestamp as UTC and returning the wrong local hour.
  const hour = parseInt(startDateLocal.slice(11, 13), 10);
  if (hour < 6) return 'early morning';
  if (hour < 12) return 'morning';
  if (hour < 14) return 'midday';
  if (hour < 18) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

function location(activity: StravaActivity): string {
  const parts = [activity.location_city, activity.location_state, activity.location_country];
  const loc = parts.filter(Boolean).join(', ');
  return loc || 'Unknown location';
}

/**
 * Replaces all {{placeholder}} tokens in a prompt template with real
 * values derived from the Strava activity object.
 */
export function resolvePrompt(
  template: string,
  activity: StravaActivity,
  tone: string,
): string {
  const replacements: Record<string, string> = {
    activity_type: activity.sport_type ?? activity.type,
    distance_km: metersToKm(activity.distance),
    duration_min: secondsToMinutes(activity.moving_time),
    elevation_m: Math.round(activity.total_elevation_gain).toString(),
    avg_pace: pacePerKm(activity.distance, activity.moving_time),
    avg_hr: activity.average_heartrate?.toFixed(0) ?? 'N/A',
    max_hr: activity.max_heartrate?.toFixed(0) ?? 'N/A',
    avg_watts: activity.average_watts?.toFixed(0) ?? 'N/A',
    calories: activity.calories?.toFixed(0) ?? 'N/A',
    time_of_day: timeOfDay(activity.start_date_local),
    location: location(activity),
    tone,
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => replacements[key] ?? `{{${key}}}`);
}
