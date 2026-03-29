"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import {
  WeatherData,
  fetchWeather,
  geocodeZip,
  getWeatherDescription,
  getWeatherIcon,
  celsiusToFahrenheit,
  kmhToMph,
} from "@/lib/weather";

const DEFAULT_LAT = 43.06;
const DEFAULT_LNG = -74.19;
const DEFAULT_ZIP = "12025";
const DEFAULT_LOCATION = "Broadalbin, NY";

export default function WeatherWidget() {
  const [weather, setWeather] = useState<{
    data: WeatherData | null;
    location: string;
    loading: boolean;
  }>({ data: null, location: DEFAULT_LOCATION, loading: true });

  useEffect(() => {
    async function loadWeather() {
      let lat = DEFAULT_LAT;
      let lng = DEFAULT_LNG;
      let locationName = DEFAULT_LOCATION;

      try {
        const settingsDoc = await getDoc(doc(getDb(), "settings", "weather"));
        if (settingsDoc.exists()) {
          const zip = settingsDoc.data().zipCode || DEFAULT_ZIP;
          if (zip !== DEFAULT_ZIP) {
            const geo = await geocodeZip(zip);
            if (geo) {
              lat = geo.latitude;
              lng = geo.longitude;
              locationName = geo.admin1
                ? `${geo.name}, ${geo.admin1}`
                : geo.name;
            }
          }
        }
      } catch {
        // defaults
      }

      const data = await fetchWeather(lat, lng);
      setWeather({ data, location: locationName, loading: false });
    }

    loadWeather();
  }, []);

  if (weather.loading) {
    return <div className="text-gray-400 text-xs animate-pulse">Loading weather...</div>;
  }

  if (!weather.data) return null;

  const { data, location } = weather;
  const icon = getWeatherIcon(data.weathercode, data.is_day === 1);
  const desc = getWeatherDescription(data.weathercode);
  const tempF = celsiusToFahrenheit(data.temperature);
  const windMph = kmhToMph(data.windspeed);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-lg" role="img" aria-label={desc}>
        {icon}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-gray-900 font-medium">{tempF}°F</span>
        <span className="text-gray-500 hidden sm:inline">
          {desc} · Wind {windMph} mph
        </span>
        <span className="text-gray-400 hidden md:inline text-xs">
          — {location}
        </span>
      </div>
    </div>
  );
}
