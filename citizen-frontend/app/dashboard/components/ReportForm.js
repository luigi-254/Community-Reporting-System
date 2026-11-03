"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera as CameraIcon, Image as GalleryIcon, X } from "lucide-react";
import {
  formatFileSize,
  resolveMediaUrl,
  toSentenceCase,
} from "../utils/reportUtils";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const MAX_FILES = 5;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

let kisiiBoundaryPromise = null;

function pointInRing(longitude, latitude, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const crosses =
      (yi > latitude) !== (yj > latitude) &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(longitude, latitude, rings) {
  if (!Array.isArray(rings) || rings.length === 0) return false;
  if (!pointInRing(longitude, latitude, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(longitude, latitude, rings[i])) return false;
  }
  return true;
}

function pointInGeometry(longitude, latitude, geometry) {
  if (!geometry) return false;
  if (geometry.type === "GeometryCollection") {
    return (geometry.geometries || []).some((item) =>
      pointInGeometry(longitude, latitude, item)
    );
  }
  if (geometry.type === "Polygon") {
    return pointInPolygon(longitude, latitude, geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates || []).some((polygon) =>
      pointInPolygon(longitude, latitude, polygon)
    );
  }
  return false;
}

function pointIsInsideKisii(latitude, longitude, geoJson) {
  let geometries = [];
  if (geoJson?.type === "FeatureCollection") {
    geometries = (geoJson.features || []).map((f) => f.geometry);
  } else if (geoJson?.type === "Feature") {
    geometries = [geoJson.geometry];
  } else if (geoJson) {
    geometries = [geoJson];
  }
  return geometries.some((g) => pointInGeometry(longitude, latitude, g));
}

async function getKisiiCountyBoundary() {
  if (!kisiiBoundaryPromise) {
    kisiiBoundaryPromise = fetch("/kisii-county.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Kisii County boundary file is missing.");
        }
        return response.json();
      })
      .catch((error) => {
        kisiiBoundaryPromise = null;
        throw error;
      });
  }
  return kisiiBoundaryPromise;
}

export default function ReportForm({ token, onSubmitSuccess }) {
  const [form, setForm] = useState({
    title: "",
    category: "",
    location: "",
    description: "",
    county: "",
    subCounty: "",
    ward: "",
    isAnonymous: false,
  });
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [counties, setCounties] = useState([]);
  const [subCounties, setSubCounties] = useState([]);
  const [wards, setWards] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("");
  const [locationMode, setLocationMode] = useState("manual"); // "manual" or "gps"

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function loadCategories() {
      setCategoriesLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/categories`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        const raw = Array.isArray(data?.data?.categories) ? data.data.categories : [];
        if (!cancelled) setCategories(raw.map((c) => c.name || c.title || "Other"));
      } catch {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    }

    async function loadCounties() {
      setLocationsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/locations/counties`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        const raw = Array.isArray(data?.data?.counties) ? data.data.counties : [];
        setCounties(raw);
        const kisii = raw.find(
          (c) => String(c.name || "").toLowerCase().includes("kisii")
        );
        if (!cancelled && kisii) {
          setForm((prev) => ({ ...prev, county: kisii.name || kisii.id || "" }));
          fetchSubCounties(kisii.id, token);
        }
      } catch {
        if (!cancelled) setCounties([]);
      } finally {
        if (!cancelled) setLocationsLoading(false);
      }
    }

    void loadCategories();
    void loadCounties();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function fetchSubCounties(countyId, accessToken) {
    if (!countyId || !accessToken) {
      setSubCounties([]);
      setWards([]);
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/locations/counties/${countyId}/sub-counties`,
        { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
      );
      const data = await response.json().catch(() => ({}));
      const raw = Array.isArray(data?.data?.subCounties) ? data.data.subCounties : [];
      setSubCounties(raw);
      setWards([]);
      setForm((prev) => ({ ...prev, subCounty: "", ward: "" }));
    } catch {
      setSubCounties([]);
    }
  }

  async function fetchWards(subCountyId, accessToken) {
    if (!subCountyId || !accessToken) {
      setWards([]);
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/locations/sub-counties/${subCountyId}/wards`,
        { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
      );
      const data = await response.json().catch(() => ({}));
      const raw = Array.isArray(data?.data?.wards) ? data.data.wards : [];
      setWards(raw);
      setForm((prev) => ({ ...prev, ward: "" }));
    } catch {
      setWards([]);
    }
  }

  // Camera effects
  useEffect(() => {
    if (!cameraOpen || !cameraStream || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = cameraStream;
    video.play().catch((error) => {
      console.error("Camera preview could not start:", error);
      setCameraError(
        "The camera preview could not start. Check browser permissions."
      );
    });
    return () => {
      if (video.srcObject === cameraStream) video.srcObject = null;
    };
  }, [cameraOpen, cameraStream]);

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, []);

  async function openCamera() {
    setCameraError("");
    if (selectedFiles.length >= MAX_FILES) {
      setFormError(`You can attach a maximum of ${MAX_FILES} photos.`);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Live camera access is unavailable in this browser. Use localhost or HTTPS."
      );
      setCameraOpen(true);
      return;
    }
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraStream(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setCameraOpen(true);
      setCameraError("");
    } catch (error) {
      console.error("Could not open camera:", error);
      if (error.name === "NotAllowedError") {
        setCameraError("Camera permission was denied.");
      } else if (error.name === "NotFoundError") {
        setCameraError("No camera was found.");
      } else {
        setCameraError(error.message || "Unable to open the camera.");
      }
      setCameraOpen(true);
    }
  }

  function closeCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStream(null);
    setCameraOpen(false);
    setCameraError("");
  }

  function getDeviceCoordinates() {
    setGpsCoordinates(null);
    setGpsStatus("Getting GPS coordinates...");
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = new Error("GPS is not supported by this browser.");
        setGpsStatus(error.message);
        reject(error);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          try {
            const boundary = await getKisiiCountyBoundary();
            if (
              !pointIsInsideKisii(
                coords.latitude,
                coords.longitude,
                boundary
              )
            ) {
              throw new Error(
                "Your GPS location is outside Kisii County. Only Kisii County reports are accepted."
              );
            }
            setGpsCoordinates(coords);
            setLocationMode("gps");
            setGpsStatus(
              `GPS verified inside Kisii County. Accuracy: ~${Math.round(
                coords.accuracy
              )} metres.`
            );
            resolve(coords);
          } catch (error) {
            setGpsCoordinates(null);
            const message =
              error instanceof Error ? error.message : "Could not verify your GPS location.";
            setGpsStatus(message);
            reject(new Error(message));
          }
        },
        (error) => {
          const message =
            error.code === error.PERMISSION_DENIED
              ? "Location permission denied. Allow location access and try again."
              : error.code === error.TIMEOUT
                ? "GPS timed out. Try again."
                : "Could not obtain GPS coordinates.";
          setGpsCoordinates(null);
          setGpsStatus(message);
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    });
  }

  async function captureReportLocation() {
    setGpsBusy(true);
    setFormError("");
    try {
      await getDeviceCoordinates();
    } catch {} finally {
      setGpsBusy(false);
    }
  }

  async function capturePhoto() {
    if (selectedFiles.length >= MAX_FILES) {
      setFormError(`You can attach a maximum of ${MAX_FILES} photos.`);
      closeCamera();
      return;
    }
    setGpsBusy(true);
    setCameraError("");
    try {
      await getDeviceCoordinates();
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) {
        throw new Error("The camera is still starting. Please try again.");
      }
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not capture the photo.");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((createdBlob) => {
          if (!createdBlob) reject(new Error("Could not create the photo."));
          else resolve(createdBlob);
        }, "image/jpeg", 0.9);
      });
      const file = new File([blob], `community-photo-${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("The photo exceeds the 15 MB limit.");
      }
      const current = [...selectedFiles, file];
      setSelectedFiles(current);
      closeCamera();
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "Could not capture the photo.");
    } finally {
      setGpsBusy(false);
    }
  }

  function addSelectedFiles(newFiles) {
    if (newFiles.length === 0) return;
    const invalidFile = newFiles.find(
      (file) => !allowedImageTypes.includes(file.type)
    );
    if (invalidFile) {
      setFormError(
        `${invalidFile.name} is not a supported image. Use JPEG, PNG, WebP, or GIF.`
      );
      return;
    }
    const oversizedFile = newFiles.find((file) => file.size > MAX_FILE_SIZE);
    if (oversizedFile) {
      setFormError(`${oversizedFile.name} exceeds the 15 MB per-photo limit.`);
      return;
    }
    if (selectedFiles.length + newFiles.length > MAX_FILES) {
      setFormError(
        `You can attach up to ${MAX_FILES} photos. You currently have ${selectedFiles.length} selected.`
      );
      return;
    }
    setSelectedFiles((current) => [...current, ...newFiles]);
    setFormError("");
  }

  function handleFileSelection(event) {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    input.value = "";
    addSelectedFiles(files);
  }

  function removeSelectedFile(indexToRemove) {
    setSelectedFiles((current) =>
      current.filter((_, index) => index !== indexToRemove)
    );
    setFormError("");
  }

  async function uploadFilesToCloudinary(files) {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(TOKEN_KEY)
        : null;
    const urls = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${API_BASE_URL}/api/uploads/upload-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to upload image to Cloudinary.");
      }
      const data = await res.json();
      urls.push(data.data.url);
    }
    return urls;
  }

  async function handleSubmitReport(event) {
    event.preventDefault();
    setFormError("");
    setMessage("");

    if (!token) {
      setFormError("Your session has expired. Please sign in again.");
      return;
    }
    if (
      !form.title.trim() ||
      !form.location.trim() ||
      form.description.trim().length < 10
    ) {
      setFormError(
        "Enter a title, a location, and a description of at least 10 characters."
      );
      return;
    }
    if (!form.category) {
      setFormError("Please select an issue category.");
      return;
    }

    // Location: GPS takes priority, otherwise manual county/sub-county/ward
    let latitude = null;
    let longitude = null;
    let county = form.county;
    let subCounty = form.subCounty;
    let ward = form.ward;

    if (gpsCoordinates) {
      latitude = gpsCoordinates.latitude;
      longitude = gpsCoordinates.longitude;
    } else if (locationMode === "manual") {
      if (!county || !subCounty || !ward) {
        setFormError(
          "Please select county, sub-county, and ward, or use GPS location capture instead."
        );
        return;
      }
    } else {
      setFormError(
        "Please provide a location: either capture GPS or select county, sub-county, and ward."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", toSentenceCase(form.title.trim()));
      formData.append("category", form.category);
      formData.append("location", toSentenceCase(form.location.trim()));
      formData.append("description", toSentenceCase(form.description.trim()));
      formData.append("priority", "MEDIUM");
      formData.append("isAnonymous", String(form.isAnonymous));
      if (county) formData.append("county", county);
      if (subCounty) formData.append("subCounty", subCounty);
      if (ward) formData.append("ward", ward);
      if (latitude !== null) formData.append("latitude", String(latitude));
      if (longitude !== null) formData.append("longitude", String(longitude));

      let mediaUrls = [];
      if (selectedFiles.length > 0) {
        mediaUrls = await uploadFilesToCloudinary(selectedFiles);
      }
      formData.append("mediaUrls", JSON.stringify(mediaUrls));

      const response = await fetch(`${API_BASE_URL}/api/reports`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "Failed to submit report.");
      }

      setForm({
        title: "",
        category: "",
        location: "",
        description: "",
        county: form.county || "",
        subCounty: "",
        ward: "",
        isAnonymous: false,
      });
      setSelectedFiles([]);
      setGpsCoordinates(null);
      setGpsStatus("");
      setIsSubmitting(false);
      setMessage(result.message || "Your report was submitted successfully.");

      if (onSubmitSuccess) {
        onSubmitSuccess(result?.data?.report);
      }
    } catch (error) {
      setFormError(error.message);
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
          Community services
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">
          Report a community issue
        </h2>
        <p className="mt-3 text-sm leading-7 text-[#687468]">
          Describe the problem and where it happened. Photos help
          authorities understand the issue.
        </p>
      </div>

      {message && (
        <div role="status" className="mb-6 border-l-4 border-[#55745c] bg-[#e8eee3] p-4 text-sm text-[#244637]">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmitReport} className="border border-[#dce2d8] bg-[#fdfdf9] p-5 sm:p-8">
        {formError && (
          <div role="alert" className="mb-5 border-l-4 border-[#9c654d] bg-[#f5e9df] p-4 text-sm leading-6 text-[#70452f]">
            {formError}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label htmlFor="report-title" className="mb-2 block text-sm font-semibold">
              Issue title *
            </label>
            <input
              id="report-title"
              required
              minLength={3}
              maxLength={150}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              onBlur={(event) => setForm({ ...form, title: toSentenceCase(event.target.value.trim()) })}
              autoCapitalize="sentences"
              placeholder="e.g. Pothole near the market entrance"
              className="w-full border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#55745c]"
            />
          </div>

          <div>
            <label htmlFor="report-category" className="mb-2 block text-sm font-semibold">
              Issue category *
            </label>
            <select
              id="report-category"
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value })
              }
              className="w-full border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#55745c]"
            >
              {categoriesLoading ? (
                <option disabled>Loading categories…</option>
              ) : categories.length === 0 ? (
                <option disabled>No categories available</option>
              ) : (
                categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label htmlFor="report-location" className="mb-2 block text-sm font-semibold">
              Location description *
            </label>
            <input
              id="report-location"
              required
              maxLength={200}
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
              onBlur={(event) => setForm({ ...form, location: toSentenceCase(event.target.value.trim()) })}
              autoCapitalize="sentences"
              placeholder="Town, estate, road, or nearby landmark"
              className="w-full border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#55745c]"
            />
          </div>

          {/* Manual geographic selection */}
          <div className="border border-[#dce2d8] rounded-xl bg-[#f7f7f2] p-4">
            <p className="mb-3 text-sm font-semibold text-[#244637]">
              Geographic location
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[200px]">
                <label className="mb-1 block text-xs font-semibold text-[#7a8378]">
                  County *
                </label>
                <select
                  value={form.county}
                  onChange={(event) => {
                    const selected = counties.find((c) => c.name === event.target.value || c.id === event.target.value);
                    setForm((prev) => ({ ...prev, county: event.target.value, subCounty: "", ward: "" }));
                    if (selected) fetchSubCounties(selected.id, token);
                  }}
                  className="w-full border border-[#cbd6c8] bg-white px-3 py-2 text-sm outline-none focus:border-[#55745c]"
                >
                  <option value="">Select county</option>
                  {counties.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[200px]">
                <label className="mb-1 block text-xs font-semibold text-[#7a8378]">
                  Sub-county *
                </label>
                <select
                  value={form.subCounty}
                  onChange={(event) => {
                    const selected = subCounties.find((s) => s.name === event.target.value);
                    setForm((prev) => ({ ...prev, subCounty: event.target.value, ward: "" }));
                    if (selected) fetchWards(selected.id, token);
                  }}
                  className="w-full border border-[#cbd6c8] bg-white px-3 py-2 text-sm outline-none focus:border-[#55745c]"
                  disabled={subCounties.length === 0}
                >
                  <option value="">Select sub-county</option>
                  {subCounties.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[200px]">
                <label className="mb-1 block text-xs font-semibold text-[#7a8378]">
                  Ward *
                </label>
                <select
                  value={form.ward}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, ward: event.target.value }))
                  }
                  className="w-full border border-[#cbd6c8] bg-white px-3 py-2 text-sm outline-none focus:border-[#55745c]"
                  disabled={wards.length === 0}
                >
                  <option value="">Select ward</option>
                  {wards.map((w) => (
                    <option key={w.id} value={w.name}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-3 text-xs text-[#687468]">
              Select county, sub-county, and ward for manual location, or use GPS capture below.
            </p>
          </div>

          {/* GPS section */}
          <div className="border border-[#dce2d8] rounded-xl bg-[#f7f7f2] p-4">
            <p className="mb-3 text-sm font-semibold text-[#244637]">
              GPS location (optional alternative)
            </p>
            <p className="mb-3 text-xs leading-5 text-[#687468]">
              Stand near the reported problem and capture your current GPS location.
              Only locations inside Kisii County are accepted.
            </p>
            <button
              type="button"
              onClick={captureReportLocation}
              disabled={gpsBusy}
              className="mb-3 border border-[#244637] px-4 py-2.5 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9] disabled:opacity-60"
            >
              {gpsBusy ? "Getting GPS location..." : "Capture GPS Location"}
            </button>
            <p className="mt-2 text-xs leading-5 text-[#687468]" role="status" aria-live="polite">
              {gpsStatus || "No GPS location captured yet."}
            </p>
            {gpsCoordinates && (
              <p className="mt-2 break-words font-mono text-xs text-[#344338]">
                Latitude: {gpsCoordinates.latitude.toFixed(6)}
                <br />
                Longitude: {gpsCoordinates.longitude.toFixed(6)}
                <br />
                Accuracy: approximately {Math.round(gpsCoordinates.accuracy)} metres
              </p>
            )}
          </div>

          <div>
            <label htmlFor="report-description" className="mb-2 block text-sm font-semibold">
              Description *
            </label>
              <textarea
              id="report-description"
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              onBlur={(event) =>
                setForm({ ...form, description: toSentenceCase(event.target.value.trim()) })
              }
              autoCapitalize="sentences"
              placeholder="Describe the condition of the issue and how it affects the community..."
              className="w-full resize-y border border-[#cbd6c8] bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#55745c]"
            />
          </div>

          <div>
            <p className="mb-2 block text-sm font-semibold">
              Add photo evidence <span className="ml-2 font-normal text-[#7a8378]">(optional)</span>
            </p>
            <p className="mb-4 text-sm leading-6 text-[#687468]">
              Use your camera to photograph the issue or choose existing photos from your device.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openCamera}
                disabled={selectedFiles.length >= MAX_FILES}
                className="inline-flex items-center gap-3 bg-[#244637] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#19372a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CameraIcon />
                <span>Take Photo</span>
              </button>
              <label className={`inline-flex items-center gap-3 border border-[#cbd6c8] bg-white px-5 py-3.5 text-sm font-semibold text-[#244637] transition hover:bg-[#eff1e9] ${selectedFiles.length >= MAX_FILES ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  disabled={selectedFiles.length >= MAX_FILES}
                  onChange={handleFileSelection}
                  className="sr-only"
                  aria-label="Choose existing photos"
                />
                <GalleryIcon />
                <span>Choose Photos</span>
              </label>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#7a8378]">
              Up to 5 photos in total, each up to 15 MB. Supported formats: JPEG, PNG, WebP, and GIF.
            </p>
            {selectedFiles.length > 0 && (
              <div className="mt-5 space-y-3">
                <h4 className="text-sm font-semibold">
                  Selected photos ({selectedFiles.length}/{MAX_FILES})
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {selectedFiles.map((file, index) => (
                    <div key={`${file.name}-${file.lastModified}-${index}`} className="flex min-w-0 items-center justify-between gap-3 border border-[#dce2d8] bg-white p-3">
                      <div className="min-w-0">
                        <p className="break-all text-sm font-medium">{file.name}</p>
                        <p className="mt-1 text-xs text-[#7a8378]">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(index)}
                        className="shrink-0 px-2 py-1 text-sm font-semibold text-[#805b42] hover:underline"
                        aria-label={`Remove ${file.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <label className="flex items-start gap-3 border-t border-[#e5e9e1] pt-5 text-sm leading-6 text-[#465448]">
            <input
              type="checkbox"
              checked={form.isAnonymous}
              onChange={(event) =>
                setForm({ ...form, isAnonymous: event.target.checked })
              }
              className="mt-1 accent-[#244637]"
            />
            <span>
              <span className="font-semibold">Submit anonymously</span>
              <span className="mt-1 block text-xs text-[#7a8378]">
                You must still sign in to submit a report.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-7 flex flex-wrap gap-3 border-t border-[#dce2d8] pt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#244637] px-5 py-3 text-sm font-semibold text-white hover:bg-[#19372a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Submitting report..." : "Submit Report"}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm({
                title: "",
                category: "",
                location: "",
                description: "",
                county: form.county || "",
                subCounty: "",
                ward: "",
                isAnonymous: false,
              });
              setSelectedFiles([]);
              setFormError("");
            }}
            className="border border-[#cbd6c8] px-5 py-3 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9]"
          >
            Clear Form
          </button>
        </div>
      </form>

      {cameraOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={(event) => {
          if (event.target === event.currentTarget) closeCamera();
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="camera-title" className="w-full max-w-2xl overflow-hidden bg-[#fdfdf9] shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-[#dce2d8] px-5 py-4">
              <div>
                <h2 id="camera-title" className="text-lg font-semibold text-[#243329]">
                  Take a Photo
                </h2>
                <p className="mt-1 text-sm text-[#687468]">
                  Aim the camera at the community issue.
                </p>
              </div>
              <button type="button" onClick={closeCamera} aria-label="Close camera" className="px-3 py-2 text-2xl text-[#244637] hover:bg-[#eff1e9]">
                <X className="w-6 h-6" aria-hidden="true" />
              </button>
            </div>
            {cameraError ? (
              <div role="alert" className="p-6">
                <p className="text-sm leading-6 text-[#80513d]">{cameraError}</p>
                <button type="button" onClick={openCamera} className="mt-4 border border-[#cbd6c8] px-4 py-2 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9]">
                  Try Again
                </button>
              </div>
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="max-h-[65vh] min-h-64 w-full bg-black object-contain" />
            )}
            <div className="flex flex-wrap justify-end gap-3 border-t border-[#dce2d8] px-5 py-4">
              <button type="button" onClick={closeCamera} className="border border-[#cbd6c8] px-5 py-3 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9]">
                Cancel
              </button>
              {!cameraError && (
                <button type="button" onClick={capturePhoto} disabled={gpsBusy} className="inline-flex items-center gap-2 bg-[#244637] px-5 py-3 text-sm font-semibold text-white hover:bg-[#19372a] disabled:cursor-not-allowed disabled:opacity-60">
                  <CameraIcon />
                  {gpsBusy ? "Getting GPS..." : "Capture Photo"}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
