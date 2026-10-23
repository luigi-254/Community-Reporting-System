
"use client";

import { createElement, useState } from "react";

type Coordinates = { latitude: number; longitude: number };

export default function GovernmentMap() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [message, setMessage] = useState("Select a location to view it on the map.");

  function showMyLocation() {
    if (!navigator.geolocation) {
      setMessage("Location services are not supported by this browser.");
      return;
    }

    setMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
        setMessage("");
      },
      () => setMessage("Could not access your location. Check your browser permissions and try again."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const mapUrl = coordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coordinates.longitude - 0.05}%2C${coordinates.latitude - 0.05}%2C${coordinates.longitude + 0.05}%2C${coordinates.latitude + 0.05}&layer=mapnik&marker=${coordinates.latitude}%2C${coordinates.longitude}`
    : undefined;

  return createElement(
    "section",
    { className: "overflow-hidden rounded-xl border border-gray-200 bg-white" },
    createElement(
      "div",
      { className: "flex min-h-16 items-center justify-between gap-4 p-4" },
      createElement("p", { className: "text-sm text-gray-600", role: "status" }, message),
      createElement(
        "button",
        {
          className:
            "shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          onClick: showMyLocation,
          type: "button",
        },
        "Show my location"
      )
    ),
    mapUrl
      ? createElement("iframe", {
          className: "h-[440px] w-full border-0",
          src: mapUrl,
          title: "OpenStreetMap showing your location",
          loading: "lazy",
        })
      : createElement(
          "div",
          {
            className:
              "flex h-[440px] items-center justify-center bg-gray-100 text-sm text-gray-500",
          },
          "The map will appear here after you choose a location."
        )
  );
}
