export interface WeatherData {
  temperature: number;
  windspeed: number;
  weathercode: number;
  is_day: number;
}

export interface GeoResult {
  latitude: number;
  longitude: number;
  name: string;
  admin1?: string;
}

const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: "Clear",
  1: "Mostly Clear",
  2: "Partly Cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Rime Fog",
  51: "Light Drizzle",
  53: "Drizzle",
  55: "Heavy Drizzle",
  61: "Light Rain",
  63: "Rain",
  65: "Heavy Rain",
  66: "Freezing Rain",
  67: "Heavy Freezing Rain",
  71: "Light Snow",
  73: "Snow",
  75: "Heavy Snow",
  77: "Snow Grains",
  80: "Light Showers",
  81: "Showers",
  82: "Heavy Showers",
  85: "Light Snow Showers",
  86: "Heavy Snow Showers",
  95: "Thunderstorm",
  96: "Thunderstorm w/ Hail",
  99: "Severe Thunderstorm",
};

export function getWeatherDescription(code: number): string {
  return WEATHER_DESCRIPTIONS[code] || "Unknown";
}

export function getWeatherIcon(code: number, isDay: boolean): string {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if (code <= 2) return isDay ? "⛅" : "☁️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 67) return "🌧️";
  if (code <= 75) return "❄️";
  if (code === 77) return "❄️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

export function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

export function kmhToMph(kmh: number): number {
  return Math.round(kmh * 0.621371);
}

export async function geocodeZip(zip: string): Promise<GeoResult | null> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(zip)}&count=1&language=en&format=json`
    );
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results[0];
    }
    return null;
  } catch {
    return null;
  }
}

export interface DailyForecast {
  date: string;
  weathercode: number;
  tempMax: number;
  tempMin: number;
  windspeedMax: number;
  precipitationSum: number;
  precipitationProbMax: number;
  sunrise: string;
  sunset: string;
}

export async function fetchWeather(
  lat: number,
  lng: number
): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&temperature_unit=celsius&windspeed_unit=kmh`
    );
    const data = await res.json();
    return data.current_weather || null;
  } catch {
    return null;
  }
}

export async function fetchWeekForecast(
  lat: number,
  lng: number
): Promise<DailyForecast[]> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,windspeed_10m_max,precipitation_sum,precipitation_probability_max,sunrise,sunset&temperature_unit=celsius&windspeed_unit=kmh&timezone=America%2FNew_York`
    );
    const data = await res.json();
    const d = data.daily;
    if (!d || !d.time) return [];

    return d.time.map((date: string, i: number) => ({
      date,
      weathercode: d.weathercode[i],
      tempMax: d.temperature_2m_max[i],
      tempMin: d.temperature_2m_min[i],
      windspeedMax: d.windspeed_10m_max[i],
      precipitationSum: d.precipitation_sum[i],
      precipitationProbMax: d.precipitation_probability_max[i],
      sunrise: d.sunrise[i],
      sunset: d.sunset[i],
    }));
  } catch {
    return [];
  }
}
