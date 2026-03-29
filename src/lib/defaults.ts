// Default prompt templates matching PRD §10

export const DEFAULT_NAME_PROMPT = `You are a creative sports coach. Generate a short, witty, and energetic activity name (max 8 words) for the following Strava activity.

Activity Type: {{activity_type}}
Distance: {{distance_km}} km
Duration: {{duration_min}} minutes
Elevation Gain: {{elevation_m}} m
Average Pace: {{avg_pace}} /km
Time of Day: {{time_of_day}}
Location: {{location}}
Tone: {{tone}}

Respond with only the activity name, nothing else.`;

export const DEFAULT_DESCRIPTION_PROMPT = `You are a {{tone}} sports commentator. Write a short activity description (2-4 sentences) for the following Strava activity. Use the stats naturally in the narrative. Do not use hashtags.

Activity Type: {{activity_type}}
Distance: {{distance_km}} km
Duration: {{duration_min}} minutes
Elevation Gain: {{elevation_m}} m
Average Heart Rate: {{avg_hr}} bpm
Average Pace: {{avg_pace}} /km
Calories: {{calories}} kcal
Location: {{location}}
Time of Day: {{time_of_day}}

Write the description:`;

// Default hide rules matching PRD §7.3
export const DEFAULT_HIDE_RULES = [
  { activityType: 'Ride', enabled: true, distanceThresholdKm: 5 },
  { activityType: 'VirtualRide', enabled: true, distanceThresholdKm: 5 },
  { activityType: 'EBikeRide', enabled: true, distanceThresholdKm: 5 },
  { activityType: 'Run', enabled: true, distanceThresholdKm: 2 },
  { activityType: 'VirtualRun', enabled: true, distanceThresholdKm: 2 },
  { activityType: 'TrailRun', enabled: true, distanceThresholdKm: 2 },
];

// Default gear rules — empty by default, user configures their own
export const DEFAULT_GEAR_RULES: import('./types').GearRule[] = [];
