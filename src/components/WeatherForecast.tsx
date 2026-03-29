"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import {
  DailyForecast,
  WeatherData,
  fetchWeather,
  fetchWeekForecast,
  geocodeZip,
  getWeatherDescription,
  getWeatherIcon,
  celsiusToFahrenheit,
  kmhToMph,
} from "@/lib/weather";
import { Droplets, Wind, Sunrise, Thermometer } from "lucide-react";

const DEFAULT_LAT = 43.06;
const DEFAULT_LNG = -74.19;
const DEFAULT_ZIP = "12025";
const DEFAULT_LOCATION = "Broadalbin, NY";
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function WeatherForecast() {
  const [current, setCurrent] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<DailyForecast[]>([]);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      let lat = DEFAULT_LAT;
      let lng = DEFAULT_LNG;
      let locName = DEFAULT_LOCATION;

      try {
        const settingsDoc = await getDoc(doc(getDb(), "settings", "weather"));
        if (settingsDoc.exists()) {
          const zip = settingsDoc.data().zipCode || DEFAULT_ZIP;
          if (zip !== DEFAULT_ZIP) {
            const geo = await geocodeZip(zip);
            if (geo) {
              lat = geo.latitude;
              lng = geo.longitude;
              locName = geo.admin1 ? `${geo.name}, ${geo.admin1}` : geo.name;
            }
          }
        }
      } catch {
        // defaults
      }

      const [currentData, forecastData] = await Promise.all([
        fetchWeather(lat, lng),
        fetchWeekForecast(lat, lng),
      ]);

      setCurrent(currentData);
      setForecast(forecastData);
      setLocation(locName);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 animate-pulse h-64" />
      </section>
    );
  }

  if (!current || forecast.length === 0) return null;

  const today = forecast[0];
  const upcoming = forecast.slice(1);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* Current conditions */}
        <div className="p-6 md:p-8 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <span className="text-5xl" role="img" aria-label={getWeatherDescription(current.weathercode)}>
                {getWeatherIcon(current.weathercode, current.is_day === 1)}
              </span>
              <div>
                <p className="text-4xl font-bold text-gray-900">
                  {celsiusToFahrenheit(current.temperature)}°F
                </p>
                <p className="text-gray-500">
                  {getWeatherDescription(current.weathercode)}
                </p>
                <p className="text-gray-400 text-sm">{location}</p>
              </div>
            </div>

            {today && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Thermometer size={16} className="text-red-500" />
                  <div>
                    <p className="text-gray-400 text-xs">High / Low</p>
                    <p>{celsiusToFahrenheit(today.tempMax)}° / {celsiusToFahrenheit(today.tempMin)}°</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Wind size={16} className="text-blue-500" />
                  <div>
                    <p className="text-gray-400 text-xs">Wind</p>
                    <p>{kmhToMph(today.windspeedMax)} mph</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Droplets size={16} className="text-cyan-500" />
                  <div>
                    <p className="text-gray-400 text-xs">Precip</p>
                    <p>{today.precipitationProbMax}% &middot; {Math.round(today.precipitationSum * 0.0394 * 100) / 100}&quot;</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Sunrise size={16} className="text-amber-500" />
                  <div>
                    <p className="text-gray-400 text-xs">Sun</p>
                    <p>{formatTime(today.sunrise)} / {formatTime(today.sunset)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 6-day forecast */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 divide-x divide-gray-100">
          {upcoming.map((day) => {
            const d = new Date(day.date + "T12:00:00");
            const dayName = DAY_NAMES[d.getDay()];
            const monthDay = `${d.getMonth() + 1}/${d.getDate()}`;

            return (
              <div key={day.date} className="p-4 text-center hover:bg-gray-50 transition-colors">
                <p className="text-gray-900 font-medium text-sm">{dayName}</p>
                <p className="text-gray-400 text-xs mb-2">{monthDay}</p>
                <span className="text-2xl block mb-2" role="img" aria-label={getWeatherDescription(day.weathercode)}>
                  {getWeatherIcon(day.weathercode, true)}
                </span>
                <p className="text-gray-900 text-sm font-medium">
                  {celsiusToFahrenheit(day.tempMax)}°
                  <span className="text-gray-400 font-normal"> / {celsiusToFahrenheit(day.tempMin)}°</span>
                </p>
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-400">
                  <Droplets size={10} className="text-cyan-500" />
                  {day.precipitationProbMax}%
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                  <Wind size={10} className="text-blue-500" />
                  {kmhToMph(day.windspeedMax)} mph
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
