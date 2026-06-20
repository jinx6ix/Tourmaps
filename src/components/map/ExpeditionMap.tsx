"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Stop, RouteSegment, StopType } from "@/types/itinerary";

const TYPE_ICON: Record<StopType, string> = {
  destination: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z",
  accommodation: "M3 21V8l9-5 9 5v13h-6v-7H9v7H3z",
  game_park: "M12 2L4 14h5l-3 8 11-13h-5l3-7z",
  airport: "M2.5 19l19-7-19-7v6l13 1-13 1z",
  activity: "M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.4h7.6z",
};

const TYPE_COLOR: Record<StopType, string> = {
  destination: "#9AAB8E",
  accommodation: "#378ADD",
  game_park: "#7A8B6F",
  airport: "#D9AC3F",
  activity: "#C97C3D",
};

export interface ExpeditionMapProps {
  mapboxToken: string;
  stops: Stop[];
  segments: RouteSegment[];
  /** Called when the active stop changes during navigation or flythrough */
  onStopChange?: (stop: Stop, index: number) => void;
  className?: string;
}

export function ExpeditionMap({
  mapboxToken,
  stops,
  segments,
  onStopChange,
  className = "",
}: ExpeditionMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortedStops = [...stops].sort(
    (a, b) => a.dayNumber - b.dayNumber || a.orderIndex - b.orderIndex
  );

  const goToStop = useCallback(
    (index: number) => {
      if (!map.current || !sortedStops[index]) return;
      const stop = sortedStops[index];
      const nextStop = sortedStops[index + 1];

      // Orient the camera bearing toward the next stop for a natural
      // flyover feel, instead of an arbitrary alternating angle.
      let bearing = map.current.getBearing();
      if (nextStop) {
        const dy = nextStop.lat - stop.lat;
        const dx = nextStop.lng - stop.lng;
        bearing = (Math.atan2(dx, dy) * 180) / Math.PI;
      }

      setCurrentIndex(index);
      onStopChange?.(stop, index);

      map.current.flyTo({
        center: [stop.lng, stop.lat],
        zoom: stop.stopType === "game_park" ? 10.5 : 12.5,
        pitch: 58,
        bearing,
        duration: 2200,
        essential: true,
      });
    },
    [sortedStops, onStopChange]
  );

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    const initialCenter: [number, number] =
      sortedStops.length > 0
        ? [sortedStops[0].lng, sortedStops[0].lat]
        : [36.8219, -1.2921];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: initialCenter,
      zoom: 6.2,
      pitch: 55,
      bearing: 0,
      antialias: true,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    map.current.on("load", () => {
      if (!map.current) return;

      map.current.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map.current.setTerrain({ source: "mapbox-dem", exaggeration: 1.4 });
      map.current.addLayer({
        id: "sky",
        type: "sky",
        paint: { "sky-type": "atmosphere", "sky-atmosphere-sun-intensity": 8 },
      });

      setLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken]);

  // Render route + markers once loaded and whenever stops/segments change
  useEffect(() => {
    if (!loaded || !map.current) return;
    const m = map.current;

    const features = segments.map((seg) => ({
      type: "Feature" as const,
      properties: { mode: seg.mode },
      geometry: { type: "LineString" as const, coordinates: seg.geometry },
    }));

    const geojson = { type: "FeatureCollection" as const, features };

    if (m.getSource("route")) {
      (m.getSource("route") as mapboxgl.GeoJSONSource).setData(geojson);
    } else {
      m.addSource("route", { type: "geojson", data: geojson });
      m.addLayer({
        id: "route-road",
        type: "line",
        source: "route",
        filter: ["==", ["get", "mode"], "road"],
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#5E6F54", "line-width": 3 },
      });
      m.addLayer({
        id: "route-flight",
        type: "line",
        source: "route",
        filter: ["==", ["get", "mode"], "flight"],
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#D9AC3F",
          "line-width": 2.5,
          "line-dasharray": [2, 2],
        },
      });
    }

    markersRef.current.forEach((mk) => mk.remove());
    markersRef.current = [];

    sortedStops.forEach((stop, index) => {
      const el = document.createElement("button");
      el.setAttribute("aria-label", `Day ${stop.dayNumber}: ${stop.name}`);
      el.style.cssText = `
        width: 30px; height: 30px; border-radius: 50%;
        background: #F2EDE1; border: 2px solid ${TYPE_COLOR[stop.stopType]};
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; box-sizing: border-box; padding: 0;
      `;
      el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="${TYPE_COLOR[stop.stopType]}"><path d="${TYPE_ICON[stop.stopType]}"/></svg>`;
      el.addEventListener("click", () => goToStop(index));

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([stop.lng, stop.lat])
        .addTo(m);
      markersRef.current.push(marker);
    });

    if (sortedStops.length > 0) {
      goToStop(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, segments, sortedStops.length]);

  const stopPlaying = useCallback(() => {
    setPlaying(false);
    if (playTimer.current) clearTimeout(playTimer.current);
  }, []);

  const togglePlay = useCallback(() => {
    if (playing) {
      stopPlaying();
      return;
    }
    setPlaying(true);
    const step = (index: number) => {
      const next = index + 1;
      if (next >= sortedStops.length) {
        setPlaying(false);
        return;
      }
      goToStop(next);
      playTimer.current = setTimeout(() => step(next), 3200);
    };
    playTimer.current = setTimeout(() => step(currentIndex), 1200);
  }, [playing, currentIndex, sortedStops.length, goToStop, stopPlaying]);

  useEffect(() => () => stopPlaying(), [stopPlaying]);

  const currentStop = sortedStops[currentIndex];

  return (
    <div className={`relative rounded-lg overflow-hidden border border-sage-600/30 ${className}`}>
      <div ref={mapContainer} className="w-full h-full min-h-[420px]" />

      {currentStop && (
        <div className="absolute top-3 left-3 max-w-[280px] bg-bush-900/90 backdrop-blur-sm border border-sage-600/40 rounded-md px-4 py-3">
          <div className="eyebrow text-gold-400 mb-1">Day {currentStop.dayNumber}</div>
          <div className="font-display text-lg text-sand-100 mb-1">{currentStop.name}</div>
          {currentStop.description && (
            <div className="text-sm text-sage-400 mb-2">{currentStop.description}</div>
          )}
          <div className="coord text-xs text-sage-500">
            {currentStop.lat.toFixed(4)}°, {currentStop.lng.toFixed(4)}°
          </div>
        </div>
      )}

      {sortedStops.length > 0 && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
          <button
            aria-label="Previous stop"
            onClick={() => {
              stopPlaying();
              goToStop(Math.max(0, currentIndex - 1));
            }}
            className="px-3 py-2 bg-bush-900/90 border border-sage-600/40 rounded-md text-sand-200 hover:bg-bush-800"
          >
            ←
          </button>
          <button
            onClick={togglePlay}
            className="flex-1 px-3 py-2 bg-bush-900/90 border border-sage-600/40 rounded-md text-sand-200 hover:bg-bush-800 text-sm"
          >
            {playing ? "Pause flythrough" : "Fly through route"}
          </button>
          <button
            aria-label="Next stop"
            onClick={() => {
              stopPlaying();
              goToStop(Math.min(sortedStops.length - 1, currentIndex + 1));
            }}
            className="px-3 py-2 bg-bush-900/90 border border-sage-600/40 rounded-md text-sand-200 hover:bg-bush-800"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
