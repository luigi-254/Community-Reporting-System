
"use client";

import { useEffect, useRef, useState } from "react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const TOKEN_KEY = "crs_citizen_access_token";

const categories = [
  "Roads",
  "Drainage",
  "Waste Management",
  "Water",
  "Street Lighting",
  "Public Facilities",
  "Other",
];

const statusLabels = {
  SUBMITTED: "Submitted",
  PENDING: "Pending",
  UNDER_REVIEW: "Under review",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
  ESCALATED: "Escalated",
  "IN PROGRESS": "In progress",
  "UNDER REVIEW": "Under review",
};

const statusStyles = {
  Submitted: "bg-[#e6ece3] text-[#31543a]",
  Pending: "bg-[#f0ebd9] text-[#66572f]",
  "Under review": "bg-[#e4e8dd] text-[#344338]",
  "In progress": "bg-[#dce8d8] text-[#244637]",
  Resolved: "bg-[#dce8d8] text-[#244637]",
  Rejected: "bg-[#f2e2dc] text-[#7d4435]",
  Escalated: "bg-[#f0ebd9] text-[#66572f]",
};

const initialForm = {
  title: "",
  category: "Roads",
  location: "",
  description: "",
  isAnonymous: false,
};

const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_FILES = 5;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
// Load the official Kisii County boundary.
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
      longitude <
        ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;

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
    geometries = (geoJson.features || []).map(
      (feature) => feature.geometry
    );
  } else if (geoJson?.type === "Feature") {
    geometries = [geoJson.geometry];
  } else if (geoJson) {
    geometries = [geoJson];
  }

  return geometries.some((geometry) =>
    pointInGeometry(longitude, latitude, geometry)
  );
}

async function getKisiiCountyBoundary() {
  if (!kisiiBoundaryPromise) {
    kisiiBoundaryPromise = fetch("/kisii-county.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Kisii County boundary file is missing. Check the public folder."
          );
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

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.message || `Request failed with status ${response.status}.`
    );
  }

  return result;
}

function normalizeReport(report) {
  const rawStatus = String(report.status || "SUBMITTED").toUpperCase();
  const rawDate = report.createdAt || report.date || "";

  return {
    ...report,
    id: String(report.id || report._id || ""),
    date: rawDate ? String(rawDate).slice(0, 10) : "",
    status: statusLabels[rawStatus] || report.status || "Submitted",
    mediaUrls: Array.isArray(report.mediaUrls) ? report.mediaUrls : [],
  };
}

async function fetchMyReports(accessToken) {
  const response = await apiRequest("/api/reports/me?page=1&limit=50", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const reports = response?.data?.reports;

  return Array.isArray(reports) ? reports.map(normalizeReport) : [];
}

function resolveMediaUrl(path) {
  if (!path) return "";

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function isImageUrl(path) {
  return /\.(jpe?g|png|webp|gif)(?:[?#]|$)/i.test(path || "");
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatFileSize(size) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function CameraIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 4h-4L8 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

export default function CitizenDashboard() {
  const [sessionReady, setSessionReady] = useState(false);
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);

  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(null);

  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");

  const [activePage, setActivePage] = useState("Overview");
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState("");
  const [message, setMessage] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [form, setForm] = useState(initialForm);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [formError, setFormError] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState(null);
const [gpsBusy, setGpsBusy] = useState(false);
const [gpsStatus, setGpsStatus] = useState("");

  // Live camera state.
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraStream, setCameraStream] = useState(null);

  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // Restore an existing login when the page opens.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const savedToken = window.localStorage.getItem(TOKEN_KEY);

      if (!savedToken) {
        setSessionReady(true);
        return;
      }

      try {
        const response = await apiRequest("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
          cache: "no-store",
        });

        const currentUser = response?.data?.user;

        if (!currentUser) {
          throw new Error("Your account session could not be restored.");
        }

        if (cancelled) return;

        setToken(savedToken);
        setUser(currentUser);

        try {
          const savedReports = await fetchMyReports(savedToken);

          if (!cancelled) {
            setReports(savedReports);
          }
        } catch (error) {
          if (!cancelled) {
            setReportsError(error.message);
          }
        }
      } catch {
        window.localStorage.removeItem(TOKEN_KEY);

        if (!cancelled) {
          setAuthNotice("Please sign in to continue.");
        }
      } finally {
        if (!cancelled) {
          setSessionReady(true);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // Attach the live camera stream to the preview.
  useEffect(() => {
    if (!cameraOpen || !cameraStream || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    video.srcObject = cameraStream;

    video.play().catch((error) => {
      console.error("Camera preview could not start:", error);
      setCameraError(
        "The camera preview could not start. Check browser permissions and try again."
      );
    });

    return () => {
      if (video.srcObject === cameraStream) {
        video.srcObject = null;
      }
    };
  }, [cameraOpen, cameraStream]);

  // Stop camera hardware if the component is removed.
  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, []);

  async function refreshReports(accessToken = token) {
    if (!accessToken) return;

    setReportsLoading(true);
    setReportsError("");

    try {
      const data = await fetchMyReports(accessToken);
      setReports(data);
    } catch (error) {
      setReportsError(error.message);
    } finally {
      setReportsLoading(false);
    }
  }

  async function finishSignIn(accessToken, account) {
    if (!accessToken || !account) {
      throw new Error("The server did not return a valid login session.");
    }

    window.localStorage.setItem(TOKEN_KEY, accessToken);

    setToken(accessToken);
    setUser(account);
    setActivePage("Overview");
    setAuthError("");
    setAuthNotice("");
    setMessage("You are signed in.");
    setReportsError("");

    try {
      const data = await fetchMyReports(accessToken);
      setReports(data);
    } catch (error) {
      setReportsError(error.message);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    setAuthNotice("");

    try {
      const response = await apiRequest("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: authEmail.trim(),
          password: authPassword,
        }),
      });

      await finishSignIn(
        response?.data?.accessToken,
        response?.data?.user
      );
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    setAuthNotice("");

    if (authPassword !== confirmPassword) {
      setAuthError("Your passwords do not match.");
      setAuthBusy(false);
      return;
    }

    if (authPassword.length < 6) {
      setAuthError("Your password must contain at least 6 characters.");
      setAuthBusy(false);
      return;
    }

    try {
      const response = await apiRequest("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: authName.trim(),
          email: authEmail.trim().toLowerCase(),
          phone: authPhone.trim() || undefined,
          password: authPassword,
          role: "CITIZEN",
        }),
      });

      const data = response?.data || {};

      setPendingVerification({
        email: authEmail.trim().toLowerCase(),
        accessToken: data.accessToken || "",
        user: data.user || null,
        verificationToken: data.verificationToken || "",
        developmentCode: data.verificationCode
          ? String(data.verificationCode)
          : "",
      });

      setVerificationCode(
        data.verificationCode ? String(data.verificationCode) : ""
      );

      setAuthMode("verify");
      setAuthNotice(
        response.message ||
          "Account created. Enter the verification code sent to your email."
      );
      setAuthPassword("");
      setConfirmPassword("");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleVerify(event) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    setAuthNotice("");

    try {
      if (!pendingVerification) {
        throw new Error("Please register again to request a verification code.");
      }

      const body = {
        email: pendingVerification.email,
        type: "EMAIL",
      };

      if (verificationCode.trim()) {
        body.code = verificationCode.trim();
      } else if (pendingVerification.verificationToken) {
        body.token = pendingVerification.verificationToken;
      } else {
        throw new Error("Enter the verification code sent to your email.");
      }

      const response = await apiRequest("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const verifiedUser = response?.data?.user || pendingVerification.user;
      const accessToken = pendingVerification.accessToken;

      setPendingVerification(null);

      if (!accessToken) {
        setAuthMode("login");
        setAuthNotice("Email verified successfully. Please sign in.");
        return;
      }

      await finishSignIn(accessToken, verifiedUser);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    closeCamera();

    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
    } catch {
      // Clear the local session even if the logout request fails.
    }

    window.localStorage.removeItem(TOKEN_KEY);

    setToken("");
    setUser(null);
    setReports([]);
    setSelectedFiles([]);
    setActivePage("Overview");
    setAuthMode("login");
    setAuthError("");
    setAuthNotice("You have signed out.");
    setMessage("");
  }

  function navigateTo(page) {
    closeCamera();
    setActivePage(page);
    setMobileMenuOpen(false);
    setMessage("");
    setFormError("");
    setReportsError("");
  }

  // Add images selected from the gallery or produced by the camera.
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

    const oversizedFile = newFiles.find(
      (file) => file.size > MAX_FILE_SIZE
    );

    if (oversizedFile) {
      setFormError(
        `${oversizedFile.name} exceeds the 15 MB per-photo limit.`
      );
      return;
    }

    if (selectedFiles.length + newFiles.length > MAX_FILES) {
      setFormError(
        `You can attach up to ${MAX_FILES} photos in total. You currently have ${selectedFiles.length} selected.`
      );
      return;
    }

    setSelectedFiles((currentFiles) => [...currentFiles, ...newFiles]);
    setFormError("");
  }

  function handleFileSelection(event) {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);

    // Allow users to select the same photo again if needed.
    input.value = "";

    addSelectedFiles(files);
  }

  function removeSelectedFile(indexToRemove) {
    setSelectedFiles((currentFiles) =>
      currentFiles.filter((_, index) => index !== indexToRemove)
    );
    setFormError("");
  }

  // Open the real camera rather than opening File Explorer.
  async function openCamera() {
    setCameraError("");

    if (selectedFiles.length >= MAX_FILES) {
      setFormError(`You can attach a maximum of ${MAX_FILES} photos.`);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Live camera access is unavailable in this browser. Open this page using localhost or HTTPS, and use a supported browser."
      );
      setCameraOpen(true);
      return;
    }

    // Stop any previous stream before requesting a new one.
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraStream(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setCameraOpen(true);
      setCameraError("");
    } catch (error) {
      console.error("Could not open camera:", error);

      if (error.name === "NotAllowedError") {
        setCameraError(
          "Camera permission was denied. Allow camera access in your browser settings, then try again."
        );
      } else if (error.name === "NotFoundError") {
        setCameraError(
          "No camera was found. Connect or enable your webcam and try again."
        );
      } else if (error.name === "NotReadableError") {
        setCameraError(
          "The camera may be in use by another application. Close that application and try again."
        );
      } else {
        setCameraError(
          error.message || "Unable to open the camera. Check browser permissions."
        );
      }

      setCameraOpen(true);
    }
  }
  // Close the camera and release camera hardware.
  function closeCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraStream(null);
    setCameraOpen(false);
    setCameraError("");
  }

  // Get the current GPS position and verify it against Kisii County.
  function getDeviceCoordinates() {
    setGpsCoordinates(null);
    setGpsStatus("Getting GPS coordinates...");

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = new Error(
          "GPS is not supported by this browser."
        );

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
            setGpsStatus(
              `GPS verified inside Kisii County. Approximate accuracy: ${Math.round(
                coords.accuracy
              )} metres.`
            );

            resolve(coords);
          } catch (error) {
            setGpsCoordinates(null);

            const message =
              error instanceof Error
                ? error.message
                : "Could not verify your GPS location.";

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
                : "Could not obtain GPS coordinates. Check your device settings.";

          setGpsCoordinates(null);
          setGpsStatus(message);
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        }
      );
    });
  }

  // Capture GPS manually when reporting an issue, including gallery photos.
  async function captureReportLocation() {
    setGpsBusy(true);
    setFormError("");

    try {
      await getDeviceCoordinates();
    } catch {
      // The reason for failure is displayed in gpsStatus.
    } finally {
      setGpsBusy(false);
    }
  }

  // Take a photo only after GPS has been verified.
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
        throw new Error(
          "The camera is still starting. Please try again."
        );
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Could not capture the photo. Please try again."
        );
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (createdBlob) => {
            if (!createdBlob) {
              reject(new Error("Could not create the photo."));
              return;
            }

            resolve(createdBlob);
          },
          "image/jpeg",
          0.9
        );
      });

      const file = new File(
        [blob],
        `community-photo-${Date.now()}.jpg`,
        {
          type: "image/jpeg",
          lastModified: Date.now(),
        }
      );

      if (file.size > MAX_FILE_SIZE) {
        throw new Error("The photo exceeds the 15 MB limit.");
      }

      addSelectedFiles([file]);
      closeCamera();
    } catch (error) {
      setCameraError(
        error instanceof Error
          ? error.message
          : "Could not capture the photo."
      );
    } finally {
      setGpsBusy(false);
    }
  }

  // Submit a report together with the verified GPS coordinates.
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

    if (!gpsCoordinates) {
      setFormError(
        "Capture and verify the issue's GPS location inside Kisii County before submitting."
      );
      setGpsStatus(
        "A verified Kisii County GPS location is required."
      );
      return;
    }

    setIsSubmittingReport(true);

    try {
      const formData = new FormData();

      formData.append("title", form.title.trim());
      formData.append("category", form.category);
      formData.append("location", form.location.trim());
      formData.append("description", form.description.trim());
      formData.append("priority", "MEDIUM");
      formData.append("isAnonymous", String(form.isAnonymous));

      formData.append(
        "latitude",
        String(gpsCoordinates.latitude)
      );

      formData.append(
        "longitude",
        String(gpsCoordinates.longitude)
      );

      selectedFiles.forEach((file) => {
        formData.append("media", file);
      });

      const response = await apiRequest("/api/reports", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      setForm(initialForm);
      setSelectedFiles([]);
      setGpsCoordinates(null);
      setGpsStatus("");

      setActivePage("My Reports");
      setMessage(
        response.message || "Your report was submitted successfully."
      );

      try {
        const latestReports = await fetchMyReports(token);
        setReports(latestReports);
        setReportsError("");
      } catch (error) {
        setReportsError(
          `The report was submitted, but the list could not refresh: ${error.message}`
        );
      }
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmittingReport(false);
    }
  }
  const pendingCount = reports.filter((report) =>
    ["Pending", "Submitted", "Under review"].includes(report.status)
  ).length;

  const inProgressCount = reports.filter(
    (report) => report.status === "In progress"
  ).length;

  const resolvedCount = reports.filter(
    (report) => report.status === "Resolved"
  ).length;

  const filteredReports = reports.filter((report) => {
    const query = searchTerm.trim().toLowerCase();

    const matchesSearch =
      report.id.toLowerCase().includes(query) ||
      String(report.title || "").toLowerCase().includes(query) ||
      String(report.category || "").toLowerCase().includes(query) ||
      String(report.location || "").toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "All" || report.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Initial session loading screen.
  if (!sessionReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f2] px-6 text-[#243329]">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center bg-[#244637] text-lg font-bold tracking-wider text-white">
            CR
          </div>
          <h1 className="mt-6 text-xl font-semibold">
            Community Reporting
          </h1>
          <p className="mt-2 text-sm text-[#687468]">
            Checking your session...
          </p>
        </div>
      </main>
    );
  }

  // Login, registration, and email verification screens.
  if (!token || !user) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] text-[#243329] lg:grid lg:grid-cols-2">
        <section className="flex flex-col justify-between bg-[#244637] px-6 py-9 text-[#f7f7f2] sm:px-10 lg:min-h-screen lg:px-14 lg:py-12">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center border border-white/40 text-sm font-bold">
                CR
              </div>
              <div>
                <p className="font-semibold">Community Reporting</p>
                <p className="mt-1 text-xs text-[#c4d3bf]">
                  Citizen Portal
                </p>
              </div>
            </div>

            <div className="mt-14 max-w-lg lg:mt-24">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c4d3bf]">
                Community services
              </p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Your community. Your voice. Clear follow-up.
              </h1>
              <p className="mt-6 max-w-md text-sm leading-7 text-[#d5dfd2] sm:text-base">
                Sign in to report local issues, keep track of your
                submissions, and review their progress.
              </p>
            </div>
          </div>

          <div className="mt-12 border-t border-white/20 pt-5 text-xs leading-6 text-[#bdcdbd]">
            Community Reporting System · Citizen workspace
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
                Citizen account
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                {authMode === "verify"
                  ? "Verify your email"
                  : authMode === "register"
                    ? "Create an account"
                    : "Welcome back"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#687468]">
                {authMode === "verify"
                  ? `Enter the verification code for ${pendingVerification?.email || authEmail}.`
                  : authMode === "register"
                    ? "Register to submit and track community reports."
                    : "Sign in to access your community reports."}
              </p>
            </div>

            {authNotice && (
              <div
                role="status"
                className="mb-5 border-l-4 border-[#55745c] bg-[#e8eee3] p-4 text-sm leading-6 text-[#244637]"
              >
                {authNotice}
              </div>
            )}

            {authMode === "verify" &&
              pendingVerification?.developmentCode && (
                <div className="mb-5 border border-[#cbd6c8] bg-[#eff1e9] p-4 text-sm text-[#344338]">
                  <p className="font-semibold">
                    Development verification code
                  </p>
                  <p className="mt-2 font-mono text-lg tracking-widest">
                    {pendingVerification.developmentCode}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#687468]">
                    This code is returned by the backend in development mode.
                    In production, use the code delivered to your email.
                  </p>
                </div>
              )}

            {authError && (
              <div
                role="alert"
                className="mb-5 border-l-4 border-[#9c654d] bg-[#f5e9df] p-4 text-sm leading-6 text-[#70452f]"
              >
                {authError}
              </div>
            )}

            {authMode === "verify" ? (
              <form onSubmit={handleVerify} className="space-y-5">
                <div>
                  <label
                    htmlFor="verification-code"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Email verification code
                  </label>
                  <input
                    id="verification-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={verificationCode}
                    onChange={(event) =>
                      setVerificationCode(event.target.value)
                    }
                    required={!pendingVerification?.verificationToken}
                    placeholder="Enter verification code"
                    className="w-full border border-[#cbd6c8] bg-white px-4 py-3 outline-none focus:border-[#55745c]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full bg-[#244637] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#19372a] disabled:opacity-60"
                >
                  {authBusy ? "Verifying..." : "Verify email"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setPendingVerification(null);
                    setAuthError("");
                    setAuthNotice("");
                  }}
                  className="w-full py-2 text-sm font-semibold text-[#244637] hover:underline"
                >
                  Back to sign in
                </button>
              </form>
            ) : authMode === "register" ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label
                    htmlFor="register-name"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Full name
                  </label>
                  <input
                    id="register-name"
                    type="text"
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                    required
                    value={authName}
                    onChange={(event) => setAuthName(event.target.value)}
                    placeholder="Enter your full name"
                    className="w-full border border-[#cbd6c8] bg-white px-4 py-3 outline-none focus:border-[#55745c]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="register-email"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Email address
                  </label>
                  <input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-[#cbd6c8] bg-white px-4 py-3 outline-none focus:border-[#55745c]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="register-phone"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Phone number{" "}
                    <span className="font-normal text-[#7a8378]">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="register-phone"
                    type="tel"
                    autoComplete="tel"
                    value={authPhone}
                    onChange={(event) => setAuthPhone(event.target.value)}
                    placeholder="+254..."
                    className="w-full border border-[#cbd6c8] bg-white px-4 py-3 outline-none focus:border-[#55745c]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="register-password"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Password
                  </label>
                  <input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    maxLength={100}
                    required
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    className="w-full border border-[#cbd6c8] bg-white px-4 py-3 outline-none focus:border-[#55745c]"
                  />
                  <p className="mt-2 text-xs text-[#7a8378]">
                    Use at least 6 characters.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="register-confirm-password"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Confirm password
                  </label>
                  <input
                    id="register-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    className="w-full border border-[#cbd6c8] bg-white px-4 py-3 outline-none focus:border-[#55745c]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full bg-[#244637] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#19372a] disabled:opacity-60"
                >
                  {authBusy ? "Creating account..." : "Create citizen account"}
                </button>

                <p className="text-center text-sm text-[#687468]">
                  Already registered?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError("");
                      setAuthNotice("");
                    }}
                    className="font-semibold text-[#244637] underline underline-offset-4"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Email address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-[#cbd6c8] bg-white px-4 py-3 outline-none focus:border-[#55745c]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    className="w-full border border-[#cbd6c8] bg-white px-4 py-3 outline-none focus:border-[#55745c]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full bg-[#244637] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#19372a] disabled:opacity-60"
                >
                  {authBusy ? "Signing in..." : "Sign in"}
                </button>

                <p className="text-center text-sm text-[#687468]">
                  New to the portal?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setAuthError("");
                      setAuthNotice("");
                    }}
                    className="font-semibold text-[#244637] underline underline-offset-4"
                  >
                    Create an account
                  </button>
                </p>
              </form>
            )}

            <p className="mt-8 border-t border-[#dce2d8] pt-5 text-xs leading-5 text-[#7a8378]">
              Use an account registered through this project&apos;s backend.
              Sample accounts from the dashboard do not work unless they
              also exist in the backend.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const navigation = [
    "Overview",
    "Report an Issue",
    "My Reports",
    "My Profile",
  ];

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#243329]">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#244637] text-[#f7f7f2] transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/15 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center border border-white/40 text-sm font-bold">
              CR
            </div>
            <div>
              <p className="text-sm font-semibold">Community Reporting</p>
              <p className="mt-1 text-xs text-[#c4d3bf]">Citizen Portal</p>
            </div>
          </div>
        </div>

        <div className="px-4 pt-7">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#bdcdbd]">
            Main menu
          </p>

          <nav aria-label="Citizen navigation" className="space-y-1">
            {navigation.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => navigateTo(item)}
                aria-current={activePage === item ? "page" : undefined}
                className={`w-full border-l-2 px-3 py-3 text-left text-sm transition-colors ${
                  activePage === item
                    ? "border-[#e1e8d9] bg-white/10 font-semibold text-white"
                    : "border-transparent text-[#d5dfd2] hover:bg-white/5 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto border-t border-white/15 p-5">
          <p className="text-xs text-[#bdcdbd]">Signed in as</p>
          <p className="mt-1 break-words text-sm font-semibold">
            {user.name || user.email}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-5 border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-h-screen min-w-0 lg:ml-64">
        <header className="sticky top-0 z-30 flex min-h-[76px] items-center justify-between gap-4 border-b border-[#dce2d8] bg-[#fdfdf9] px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="border border-[#dce2d8] px-3 py-2 text-sm lg:hidden"
            >
              Menu
            </button>

            <div>
              <p className="text-xs text-[#788277]">Citizen workspace</p>
              <h1 className="mt-1 text-lg font-semibold">{activePage}</h1>
            </div>
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">
              {user.name || user.email}
            </p>
            <p className="mt-1 text-xs text-[#7a8378]">
              {user.email}
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-[1400px] px-5 py-7 sm:px-8 sm:py-9">
          {message && (
            <div
              role="status"
              className="mb-6 flex flex-wrap items-center justify-between gap-3 border-l-4 border-[#55745c] bg-[#e8eee3] p-4 text-sm text-[#244637]"
            >
              <span>{message}</span>
              <button
                type="button"
                onClick={() => setMessage("")}
                className="font-semibold underline underline-offset-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {reportsError && (
            <div
              role="alert"
              className="mb-6 border-l-4 border-[#9c654d] bg-[#f5e9df] p-4 text-sm leading-6 text-[#70452f]"
            >
              Could not retrieve your reports: {reportsError}
              <button
                type="button"
                onClick={() => refreshReports()}
                className="ml-3 font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Overview */}
          {activePage === "Overview" && (
            <>
              <section className="border-b border-[#dce2d8] pb-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
                  Citizen services
                </p>

                <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                  <div>
                    <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                      Welcome, {String(user.name || "Citizen").split(" ")[0]}.
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-[#687468] sm:text-base">
                      Report problems in your community and follow the
                      progress of the issues you have submitted.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigateTo("Report an Issue")}
                    className="inline-flex min-h-12 items-center justify-center gap-3 self-start bg-[#244637] px-5 py-3 text-sm font-semibold text-white hover:bg-[#19372a] md:self-auto"
                  >
                    Report an Issue →
                  </button>
                </div>
              </section>

              <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "My Reports", value: reports.length },
                  { label: "Pending", value: pendingCount },
                  { label: "In Progress", value: inProgressCount },
                  { label: "Resolved", value: resolvedCount },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="border border-[#dce2d8] bg-[#fdfdf9] p-5"
                  >
                    <p className="text-sm text-[#687468]">{stat.label}</p>
                    <p className="mt-4 text-3xl font-semibold tabular-nums text-[#244637]">
                      {reportsLoading ? "—" : stat.value}
                    </p>
                  </div>
                ))}
              </section>

              <section className="mt-8 border border-[#dce2d8] bg-[#fdfdf9]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce2d8] px-5 py-5">
                  <div>
                    <h3 className="font-semibold">Recent Reports</h3>
                    <p className="mt-1 text-sm text-[#687468]">
                      Reports retrieved from your account.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigateTo("My Reports");
                      refreshReports();
                    }}
                    className="text-sm font-semibold text-[#244637] underline-offset-4 hover:underline"
                  >
                    View all
                  </button>
                </div>

                {reportsLoading ? (
                  <p className="p-6 text-sm text-[#687468]">
                    Loading your reports...
                  </p>
                ) : reports.length === 0 ? (
                  <div className="p-7">
                    <h4 className="font-medium">
                      No reports submitted yet
                    </h4>
                    <p className="mt-2 max-w-md text-sm leading-6 text-[#687468]">
                      Submit your first community issue to begin tracking it.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateTo("Report an Issue")}
                      className="mt-5 border border-[#244637] px-4 py-2.5 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9]"
                    >
                      Submit your first report
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[#e5e9e1]">
                    {reports.slice(0, 4).map((report) => (
                      <div
                        key={report.id}
                        className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{report.title}</p>
                          <p className="mt-1 text-xs text-[#7a8378]">
                            {report.id} · {report.location || "Location not specified"}
                          </p>
                          <p className="mt-2 text-xs text-[#687468]">
                            {formatDate(report.date)}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 px-3 py-1.5 text-xs font-semibold ${
                            statusStyles[report.status] ||
                            statusStyles.Submitted
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* Report form */}
          {activePage === "Report an Issue" && (
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

              <form
                onSubmit={handleSubmitReport}
                className="border border-[#dce2d8] bg-[#fdfdf9] p-5 sm:p-8"
              >
                {formError && (
                  <div
                    role="alert"
                    className="mb-5 border-l-4 border-[#9c654d] bg-[#f5e9df] p-4 text-sm leading-6 text-[#70452f]"
                  >
                    {formError}
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="report-title"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Issue title *
                    </label>
                    <input
                      id="report-title"
                      required
                      minLength={3}
                      maxLength={150}
                      value={form.title}
                      onChange={(event) =>
                        setForm({ ...form, title: event.target.value })
                      }
                      placeholder="e.g. Pothole near the market entrance"
                      className="w-full border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none placeholder:text-[#8a9488] focus:border-[#55745c]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="report-category"
                      className="mb-2 block text-sm font-semibold"
                    >
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
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="report-location"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Location *
                    </label>
                    <input
                      id="report-location"
                      required
                      maxLength={200}
                      value={form.location}
                      onChange={(event) =>
                        setForm({ ...form, location: event.target.value })
                      }
                      placeholder="Town, estate, road, or nearby landmark"
                      className="w-full border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none placeholder:text-[#8a9488] focus:border-[#55745c]"
                    />
                    <div className="mt-3 border border-[#dce2d8] bg-[#f7f7f2] p-4">
  <p className="text-sm font-semibold text-[#244637]">
    GPS Location — Kisii County
  </p>

  <p className="mt-1 text-xs leading-5 text-[#687468]">
    Stand near the reported problem and capture your current GPS location.
    Only locations inside Kisii County are accepted.
  </p>

  <button
    type="button"
    onClick={captureReportLocation}
    disabled={gpsBusy}
    className="mt-3 border border-[#244637] px-4 py-2.5 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9] disabled:opacity-60"
  >
    {gpsBusy ? "Getting GPS location..." : "Capture GPS Location"}
  </button>

  <p
    className="mt-3 text-xs leading-5 text-[#687468]"
    role="status"
    aria-live="polite"
  >
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
                  </div>

                  <div>
                    <label
                      htmlFor="report-description"
                      className="mb-2 block text-sm font-semibold"
                    >
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
                        setForm({
                          ...form,
                          description: event.target.value,
                        })
                      }
                      placeholder="Describe the condition of the issue and how it affects the community..."
                      className="w-full resize-y border border-[#cbd6c8] bg-white px-4 py-3 text-sm leading-6 outline-none placeholder:text-[#8a9488] focus:border-[#55745c]"
                    />
                  </div>

                  {/* Take photo directly or select existing photos */}
                  <div>
                    <p className="mb-2 block text-sm font-semibold">
                      Add photo evidence
                      <span className="ml-2 font-normal text-[#7a8378]">
                        (optional)
                      </span>
                    </p>

                    <p className="mb-4 text-sm leading-6 text-[#687468]">
                      Use your camera to photograph the issue or choose
                      existing photos from your device.
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

                      <label
                        className={`inline-flex items-center gap-3 border border-[#cbd6c8] bg-white px-5 py-3.5 text-sm font-semibold text-[#244637] transition hover:bg-[#eff1e9] ${
                          selectedFiles.length >= MAX_FILES
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer"
                        }`}
                      >
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
                      Up to 5 photos in total, each up to 15 MB. Supported
                      formats: JPEG, PNG, WebP, and GIF.
                    </p>

                    {selectedFiles.length > 0 && (
                      <div className="mt-5 space-y-3">
                        <h4 className="text-sm font-semibold">
                          Selected photos ({selectedFiles.length}/{MAX_FILES})
                        </h4>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={`${file.name}-${file.lastModified}-${index}`}
                              className="flex min-w-0 items-center justify-between gap-3 border border-[#dce2d8] bg-white p-3"
                            >
                              <div className="min-w-0">
                                <p className="break-all text-sm font-medium">
                                  {file.name}
                                </p>
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
                        setForm({
                          ...form,
                          isAnonymous: event.target.checked,
                        })
                      }
                      className="mt-1 accent-[#244637]"
                    />
                    <span>
                      <span className="font-semibold">
                        Submit anonymously
                      </span>
                      <span className="mt-1 block text-xs text-[#7a8378]">
                        You must still sign in to submit a report.
                      </span>
                    </span>
                  </label>
                </div>

                <div className="mt-7 flex flex-wrap gap-3 border-t border-[#dce2d8] pt-6">
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="bg-[#244637] px-5 py-3 text-sm font-semibold text-white hover:bg-[#19372a] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmittingReport
                      ? "Submitting report..."
                      : "Submit Report"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForm(initialForm);
                      setSelectedFiles([]);
                      setFormError("");
                    }}
                    className="border border-[#cbd6c8] px-5 py-3 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9]"
                  >
                    Clear Form
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* My reports */}
          {activePage === "My Reports" && (
            <section>
              <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
                    Your submissions
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                    My Reports
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[#687468]">
                    Reports retrieved from your signed-in citizen account.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => refreshReports()}
                  disabled={reportsLoading}
                  className="border border-[#cbd6c8] px-4 py-3 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9] disabled:opacity-60"
                >
                  {reportsLoading ? "Refreshing..." : "Refresh Reports"}
                </button>
              </div>

              <div className="mb-6 grid gap-3 md:grid-cols-[1fr_220px]">
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search report ID, title, category, or location..."
                  aria-label="Search my reports"
                  className="w-full border border-[#cbd6c8] bg-[#fdfdf9] px-4 py-3 text-sm outline-none focus:border-[#55745c]"
                />

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter reports by status"
                  className="border border-[#cbd6c8] bg-[#fdfdf9] px-4 py-3 text-sm outline-none focus:border-[#55745c]"
                >
                  <option value="All">All statuses</option>
                  {[
                    "Submitted",
                    "Pending",
                    "Under review",
                    "In progress",
                    "Resolved",
                    "Rejected",
                    "Escalated",
                  ].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {reportsLoading && reports.length === 0 ? (
                <p className="border border-[#dce2d8] bg-[#fdfdf9] p-8 text-sm text-[#687468]">
                  Loading your reports...
                </p>
              ) : filteredReports.length === 0 ? (
                <div className="border border-[#dce2d8] bg-[#fdfdf9] p-8">
                  <h3 className="font-semibold">
                    {reports.length === 0
                      ? "You have not submitted any reports yet."
                      : "No reports match your search."}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#687468]">
                    {reports.length === 0
                      ? "When you submit a community issue, it will appear here."
                      : "Try a different search term or status filter."}
                  </p>

                  {reports.length === 0 && (
                    <button
                      type="button"
                      onClick={() => navigateTo("Report an Issue")}
                      className="mt-5 bg-[#244637] px-5 py-3 text-sm font-semibold text-white hover:bg-[#19372a]"
                    >
                      Report an Issue
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReports.map((report) => (
                    <article
                      key={report.id}
                      className="border border-[#dce2d8] bg-[#fdfdf9] p-5 sm:p-6"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#55745c]">
                            {report.id}
                          </p>
                          <h3 className="mt-2 text-lg font-semibold">
                            {report.title}
                          </h3>
                          <p className="mt-2 text-sm text-[#687468]">
                            {report.category} ·{" "}
                            {report.location || "Location not specified"}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 px-3 py-1.5 text-xs font-semibold ${
                            statusStyles[report.status] ||
                            statusStyles.Submitted
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>

                      {report.description && (
                        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#59675b]">
                          {report.description}
                        </p>
                      )}

                      {report.mediaUrls.length > 0 && (
                        <div className="mt-5 border-t border-[#e5e9e1] pt-5">
                          <h4 className="mb-3 text-sm font-semibold">
                            Attachments
                          </h4>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {report.mediaUrls.map((media, index) => {
                              const url = resolveMediaUrl(media);

                              return (
                                <a
                                  key={`${media}-${index}`}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block overflow-hidden border border-[#dce2d8] bg-[#eff1e9]"
                                >
                                  {isImageUrl(media) ? (
                                    <img
                                      src={url}
                                      alt={`Attachment ${index + 1} for ${report.title}`}
                                      className="h-36 w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-28 items-center justify-center px-3 text-center text-sm font-medium text-[#244637]">
                                      Open attachment {index + 1}
                                    </div>
                                  )}
                                  <p className="break-all px-3 py-2 text-xs text-[#59675b]">
                                    View attachment {index + 1}
                                  </p>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="mt-5 border-t border-[#e5e9e1] pt-4 text-xs text-[#7a8378]">
                        Date submitted: {formatDate(report.date)}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Profile */}
          {activePage === "My Profile" && (
            <section className="max-w-3xl">
              <div className="mb-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
                  Account
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  My Profile
                </h2>
              </div>

              <div className="border border-[#dce2d8] bg-[#fdfdf9] p-6 sm:p-8">
                <div className="flex items-center gap-4 border-b border-[#dce2d8] pb-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#dce5d8] text-lg font-semibold text-[#244637]">
                    {String(user.name || "C")
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>

                  <div>
                    <h3 className="font-semibold">
                      {user.name || "Citizen"}
                    </h3>
                    <p className="mt-1 text-sm text-[#687468]">
                      {user.email}
                    </p>
                  </div>
                </div>

                <dl className="mt-6 space-y-5">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-[#7a8378]">
                      Account role
                    </dt>
                    <dd className="mt-2 text-sm font-medium">
                      {user.role || "CITIZEN"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs uppercase tracking-wide text-[#7a8378]">
                      Reports submitted
                    </dt>
                    <dd className="mt-2 text-sm font-medium">
                      {reports.length}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs uppercase tracking-wide text-[#7a8378]">
                      Account verification
                    </dt>
                    <dd className="mt-2 text-sm font-medium">
                      {user.isVerified ? "Verified" : "Not verified"}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-8 border border-[#cbd6c8] px-5 py-3 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9]"
                >
                  Sign out
                </button>
              </div>
            </section>
          )}
        </div>

        <footer className="border-t border-[#dce2d8] bg-[#fdfdf9] px-5 py-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#7a8378]">
            <p>Community Reporting System</p>
            <p>Citizen Portal</p>
          </div>
        </footer>
      </div>

      {/* Live camera modal */}
      {cameraOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeCamera();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="camera-title"
            className="w-full max-w-2xl overflow-hidden bg-[#fdfdf9] shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-[#dce2d8] px-5 py-4">
              <div>
                <h2
                  id="camera-title"
                  className="text-lg font-semibold text-[#243329]"
                >
                  Take a Photo
                </h2>
                <p className="mt-1 text-sm text-[#687468]">
                  Aim the camera at the community issue.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCamera}
                aria-label="Close camera"
                className="px-3 py-2 text-2xl text-[#244637] hover:bg-[#eff1e9]"
              >
                ×
              </button>
            </div>

            {cameraError ? (
              <div role="alert" className="p-6">
                <p className="text-sm leading-6 text-[#80513d]">
                  {cameraError}
                </p>

                <button
                  type="button"
                  onClick={openCamera}
                  className="mt-4 border border-[#cbd6c8] px-4 py-2 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9]"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-h-[65vh] min-h-64 w-full bg-black object-contain"
              />
            )}

            <div className="flex flex-wrap justify-end gap-3 border-t border-[#dce2d8] px-5 py-4">
              <button
                type="button"
                onClick={closeCamera}
                className="border border-[#cbd6c8] px-5 py-3 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9]"
              >
                Cancel
              </button>

              {!cameraError && (
               <button
  type="button"
  onClick={capturePhoto}
  disabled={gpsBusy}
  className="inline-flex items-center gap-2 bg-[#244637] px-5 py-3 text-sm font-semibold text-white hover:bg-[#19372a] disabled:cursor-not-allowed disabled:opacity-60"
>
  <CameraIcon />
  {gpsBusy ? "Getting GPS..." : "Capture Photo"}
</button>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
