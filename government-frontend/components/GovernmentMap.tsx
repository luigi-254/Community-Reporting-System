"use client";

import { useEffect, useState } from "react";
import {
  CircleMarker,
  GeoJSON as GeoJsonLayer,
  MapContainer,
  Popup,
  TileLayer,
} from "react-leaflet";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

// Approximate viewport limits around Kisii County.
// Actual report inclusion is checked against the county boundary file.
const KISII_CENTER: [number, number] = [-0.68174, 34.76666];

const KISII_VIEW_BOUNDS: [[number, number], [number, number]] = [
  [-1.05, 34.45],
  [-0.4, 35.1],
];

type Report = {
  id?: string | number;
  reportId?: string | number;
  _id?: string;
  title?: string;
  description?: string;
  category?: string;
  status?: string;
  location?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  mediaUrls?: unknown;
  media?: unknown;
  imageUrl?: string;
  photoUrl?: string;
};

type BoundaryGeometry = {
  type: string;
  coordinates?: any;
  geometries?: BoundaryGeometry[];
};

type KisiiBoundary = {
  type: string;
  geometries?: BoundaryGeometry[];
  coordinates?: any;
};

type MappedReport = Report & {
  mapId: string;
  mapLatitude: number;
  mapLongitude: number;
};

function extractReports(payload: any): Report[] {
  if (Array.isArray(payload?.data?.reports)) {
    return payload.data.reports;
  }

  if (Array.isArray(payload?.reports)) {
    return payload.reports;
  }

  return [];
}

function parseCoordinate(
  value: number | string | null | undefined
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

// GeoJSON stores coordinate pairs in [longitude, latitude] order.
function pointInRing(
  longitude: number,
  latitude: number,
  ring: number[][]
): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const crosses =
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;

    if (crosses) {
      inside = !inside;
    }
  }

  return inside;
}

function pointInPolygon(
  longitude: number,
  latitude: number,
  rings: number[][][]
): boolean {
  if (!rings?.length) return false;

  // Must be inside the outer ring.
  if (!pointInRing(longitude, latitude, rings[0])) {
    return false;
  }

  // Exclude holes inside the polygon, if there are any.
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(longitude, latitude, rings[i])) {
      return false;
    }
  }

  return true;
}

function pointInsideGeometry(
  longitude: number,
  latitude: number,
  geometry: BoundaryGeometry
): boolean {
  if (geometry.type === "GeometryCollection") {
    return (geometry.geometries || []).some((child) =>
      pointInsideGeometry(longitude, latitude, child)
    );
  }

  if (geometry.type === "Polygon") {
    return pointInPolygon(longitude, latitude, geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates || []).some((polygon: number[][][]) =>
      pointInPolygon(longitude, latitude, polygon)
    );
  }

  return false;
}

function isInsideKisii(
  latitude: number,
  longitude: number,
  boundary: KisiiBoundary
): boolean {
  if (boundary.type === "GeometryCollection") {
    return (boundary.geometries || []).some((geometry) =>
      pointInsideGeometry(longitude, latitude, geometry)
    );
  }

  return pointInsideGeometry(longitude, latitude, boundary);
}

function getFirstImage(report: Report): string | null {
  const media = report.mediaUrls ?? report.media;

  let candidate: any = null;

  if (Array.isArray(media) && media.length > 0) {
    candidate = media[0];
  } else if (typeof media === "string") {
    candidate = media;
  } else {
    candidate = report.imageUrl ?? report.photoUrl ?? null;
  }

  if (candidate && typeof candidate === "object") {
    candidate =
      candidate.url ?? candidate.path ?? candidate.mediaUrl ?? null;
  }

  if (typeof candidate !== "string" || !candidate.trim()) {
    return null;
  }

  if (
    candidate.startsWith("http://") ||
    candidate.startsWith("https://") ||
    candidate.startsWith("data:")
  ) {
    return candidate;
  }

  if (candidate.startsWith("/")) {
    return `${API_URL}${candidate}`;
  }

  return `${API_URL}/${candidate}`;
}

export default function GovernmentMap() {
  const [reports, setReports] = useState<Report[]>([]);
  const [boundary, setBoundary] = useState<KisiiBoundary | null>(null);

  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingBoundary, setLoadingBoundary] = useState(true);

  const [reportError, setReportError] = useState("");
  const [boundaryError, setBoundaryError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadBoundary() {
      try {
        const response = await fetch("/kisii-county.geojson");

        if (!response.ok) {
          throw new Error("Could not load the Kisii County boundary file.");
        }

        const result = (await response.json()) as KisiiBoundary;

        if (!cancelled) {
          setBoundary(result);
        }
      } catch (error) {
        if (!cancelled) {
          setBoundaryError(
            error instanceof Error ? error.message : "Boundary loading failed."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingBoundary(false);
        }
      }
    }

    async function loadReports() {
      try {
        const allReports: Report[] = [];
        const limit = 100;
        let page = 1;
        let totalPages = 1;

        do {
          const response = await fetch(
            `${API_URL}/api/reports?page=${page}&limit=${limit}`,
            { cache: "no-store" }
          );

          const payload = await response.json();

          if (!response.ok) {
            throw new Error(
              payload?.message || "Could not load community reports."
            );
          }

          allReports.push(...extractReports(payload));

          const reportedPages = Number(
            payload?.data?.totalPages ?? payload?.totalPages ?? 1
          );

          totalPages = Number.isFinite(reportedPages)
            ? Math.max(1, reportedPages)
            : 1;

          page += 1;
        } while (page <= totalPages && page <= 100);

        if (!cancelled) {
          setReports(allReports);
        }
      } catch (error) {
        if (!cancelled) {
          setReportError(
            error instanceof Error ? error.message : "Report loading failed."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingReports(false);
        }
      }
    }

    void loadBoundary();
    void loadReports();

    return () => {
      cancelled = true;
    };
  }, []);

  const mappedReports: MappedReport[] = [];

  if (boundary) {
    reports.forEach((report, index) => {
      const latitude = parseCoordinate(report.latitude ?? report.lat);
      const longitude = parseCoordinate(
        report.longitude ?? report.lng
      );

      // Do not invent missing GPS coordinates.
      if (latitude === null || longitude === null) {
        return;
      }

      // Only show reports whose coordinates fall inside Kisii County.
      if (!isInsideKisii(latitude, longitude, boundary)) {
        return;
      }

      mappedReports.push({
        ...report,
        mapId: String(
          report.id ?? report.reportId ?? report._id ?? `report-${index}`
        ),
        mapLatitude: latitude,
        mapLongitude: longitude,
      });
    });
  }

  const missingOrOutsideCount = reports.length - mappedReports.length;

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Kisii County GIS Map
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Report locations are displayed using their saved GPS coordinates.
          </p>
        </div>

        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
          {mappedReports.length} mapped report
          {mappedReports.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="border-b border-gray-100 px-4 py-3 text-sm">
        {loadingReports || loadingBoundary ? (
          <p className="text-gray-500">Loading Kisii map and report locations…</p>
        ) : null}

        {reportError ? (
          <p className="text-red-600">
            Reports could not be loaded: {reportError}
          </p>
        ) : null}

        {boundaryError ? (
          <p className="text-red-600">
            County boundary could not be loaded: {boundaryError}
          </p>
        ) : null}

        {!loadingReports && !loadingBoundary && !reportError && !boundaryError ? (
          <p className="text-gray-600">
            {missingOrOutsideCount > 0
              ? `${missingOrOutsideCount} report(s) are not shown because their GPS coordinates are missing or outside Kisii County.`
              : "All reports with coordinates are within the Kisii County boundary."}
          </p>
        ) : null}
      </div>

      <div className="h-[520px] w-full">
        <MapContainer
          center={KISII_CENTER}
          zoom={10}
          minZoom={9}
          maxZoom={18}
          maxBounds={KISII_VIEW_BOUNDS}
          maxBoundsViscosity={0.9}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {boundary ? (
            <GeoJsonLayer
              data={boundary as any}
              style={{
                color: "#15803d",
                weight: 3,
                fillColor: "#22c55e",
                fillOpacity: 0.07,
              }}
            />
          ) : null}

          {mappedReports.map((report) => {
            const imageUrl = getFirstImage(report);

            return (
              <CircleMarker
                key={report.mapId}
                center={[report.mapLatitude, report.mapLongitude]}
                radius={8}
                pathOptions={{
                  color: "#ffffff",
                  weight: 2,
                  fillColor:
                    report.status?.toLowerCase() === "resolved"
                      ? "#16a34a"
                      : report.status?.toLowerCase() === "in progress"
                        ? "#2563eb"
                        : "#dc2626",
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <div className="max-w-[240px] space-y-2">
                    <h3 className="font-semibold">
                      {report.title || "Community report"}
                    </h3>

                    {report.category ? (
                      <p>Category: {report.category}</p>
                    ) : null}

                    {report.status ? (
                      <p>Status: {report.status}</p>
                    ) : null}

                    {report.location ? (
                      <p>Location: {report.location}</p>
                    ) : null}

                    <p className="text-xs">
                      Latitude: {report.mapLatitude.toFixed(6)}
                      <br />
                      Longitude: {report.mapLongitude.toFixed(6)}
                    </p>

                    {imageUrl ? (
                      <a
                        href={imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 underline"
                      >
                        View report photo
                      </a>
                    ) : null}

                    {report.description ? (
                      <p>{report.description}</p>
                    ) : null}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </section>
  );
}