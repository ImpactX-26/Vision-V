
import { useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// ---------------------------------
// SAVED REPORT HELPERS
// ---------------------------------
function getReports() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("resqflowReports") || "[]"
    );

    if (saved.length === 0) {
      const oldReport = JSON.parse(
        localStorage.getItem("resqflowReport") || "null"
      );

      if (oldReport?.id) {
        const migrated = [
          {
            ...oldReport,
            severity: oldReport.severity || "Not specified",
            description: oldReport.description || "",
            location: oldReport.location || "Not provided",
            name: oldReport.name || "Not provided",
            phone: oldReport.phone || "Not provided",
            assignedTeam: oldReport.assignedTeam || "",
            status: oldReport.status || "Received",
            createdAt:
              oldReport.createdAt || "Previously submitted",
          },
        ];

        localStorage.setItem(
          "resqflowReports",
          JSON.stringify(migrated)
        );

        return migrated;
      }
    }

    return saved.map((report) => ({
      ...report,
      severity: report.severity || "Not specified",
      description: report.description || "",
      location: report.location || "Not provided",
      name: report.name || "Not provided",
      phone: report.phone || "Not provided",
      assignedTeam: report.assignedTeam || "",
      status: report.status || "Received",
    }));
  } catch {
    return [];
  }
}

function saveReports(reports) {
  localStorage.setItem(
    "resqflowReports",
    JSON.stringify(reports)
  );
}

function saveLatestReport(report) {
  if (report) {
    localStorage.setItem(
      "resqflowReport",
      JSON.stringify(report)
    );
  }
}

// ---------------------------------
// EMERGENCY LOCATION MAP
// ---------------------------------
function EmergencyMap({ reports }) {
  const mappedReports = reports
    .map((report) => {
      const location = String(report.location || "").trim();

      if (!location || location === "Not provided") {
        return null;
      }

      const parts = location.split(",").map((value) => {
        return value.trim() === "" ? NaN : Number(value.trim());
      });

      if (
        parts.length !== 2 ||
        !Number.isFinite(parts[0]) ||
        !Number.isFinite(parts[1]) ||
        parts[0] < -90 ||
        parts[0] > 90 ||
        parts[1] < -180 ||
        parts[1] > 180
      ) {
        return null;
      }

      return {
        ...report,
        latitude: parts[0],
        longitude: parts[1],
      };
    })
    .filter(Boolean);

  const center =
    mappedReports.length > 0
      ? [
          mappedReports[0].latitude,
          mappedReports[0].longitude,
        ]
      : [20.5937, 78.9629];

  return (
    <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">
        Emergency Location Map
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        View the GPS locations attached to emergency reports.
        Select a marker to see report details.
      </p>

      {mappedReports.length === 0 && (
        <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          No GPS locations are available yet. Submit a test report
          using “Use My Location” to add a map marker.
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-lg">
        <MapContainer
          key={
            mappedReports.length > 0
              ? `${center[0]}-${center[1]}`
              : "default-map"
          }
          center={center}
          zoom={mappedReports.length > 0 ? 13 : 5}
          scrollWheelZoom={true}
          style={{
            height: "380px",
            width: "100%",
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mappedReports.map((report) => (
            <Marker
              key={report.id}
              position={[
                report.latitude,
                report.longitude,
              ]}
            >
              <Popup>
                <strong>{report.emergencyType}</strong>
                <br />
                Report ID: {report.id}
                <br />
                Severity: {report.severity}
                <br />
                Status: {report.status}
                <br />
                Team: {report.assignedTeam || "Not assigned"}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Map markers are based on saved GPS coordinates. The map
        requires an internet connection. This demo does not dispatch
        emergency services.
      </p>
    </section>
  );
}

// ---------------------------------
// 1. REPORT EMERGENCY PAGE
// ---------------------------------
function ReportEmergency() {
  const [location, setLocation] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  const handleSubmit = (event) => {
    const handleSubmit = async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const data = new FormData(form);

  if (!location) {
    alert("Please click 'Use My Location' before submitting.");
    return;
  }

  const coordinates = location.split(",").map(Number);

  if (
    coordinates.length !== 2 ||
    !Number.isFinite(coordinates[0]) ||
    !Number.isFinite(coordinates[1]) ||
    coordinates[0] < -90 ||
    coordinates[0] > 90 ||
    coordinates[1] < -180 ||
    coordinates[1] > 180
  ) {
    alert("Invalid GPS coordinates. Please detect your location again.");
    return;
  }

  const [lat, lng] = coordinates;

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/api/reports`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: data.get("emergencyType"),
          description: data.get("description"),
          location,
          lat,
          lng,
          category: data.get("emergencyType"),
          severity: data.get("severity"),
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof result.detail === "string"
          ? result.detail
          : JSON.stringify(result.detail || result)
      );
    }

    const reportId =
      result.report?.id ??
      result.report?.incident_id ??
      result.report?.report_id ??
      result.id ??
      result.incident_id ??
      result.report_id;

    alert(
      `Report submitted successfully!\nReport ID: ${
        reportId ?? "Created successfully"
      }\nStatus: ${result.report?.status ?? "Submitted"}`
    );

    form.reset();
    setLocation("");
  } catch (error) {
    alert(`Submission failed: ${error.message}`);
  }
};
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const reportId = "RQ-" + Date.now();

    const newReport = {
      id: reportId,
      emergencyType: data.get("emergencyType"),
      severity: data.get("severity"),
      description: data.get("description"),
      location: location || "Not provided",
      name: data.get("name") || "Not provided",
      phone: data.get("phone") || "Not provided",
      status: "Received",
      assignedTeam: "",
      createdAt: new Date().toLocaleString(),
    };

    const reports = getReports();
    reports.unshift(newReport);

    saveReports(reports);
    saveLatestReport(newReport);

    alert(
      `Report submitted!\n\nReport ID: ${reportId}\nEmergency: ${newReport.emergencyType}\nStatus: Received\n\nSave your Report ID to track it.`
    );

    form.reset();
    setLocation("");
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Location services are not supported by this browser.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(
          `${position.coords.latitude}, ${position.coords.longitude}`
        );
        setLocationLoading(false);
        alert("Location detected successfully!");
      },
      () => {
        setLocationLoading(false);
        alert(
          "Unable to get your location. Allow browser location access or continue without it."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-8 py-5">
        <Link to="/" className="text-2xl font-bold text-red-500">
          ResQFlow
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-4xl font-bold">Report an Emergency</h1>
        <p className="mt-3 text-slate-400">
          Provide details about the emergency.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <div>
            <label className="mb-2 block font-semibold">
              Emergency Type
            </label>
            <select
              name="emergencyType"
              required
              defaultValue=""
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3"
            >
              <option value="" disabled>
                Select emergency type
              </option>
              <option>Building Collapse</option>
              <option>Fire</option>
              <option>Flood</option>
              <option>Road Accident</option>
              <option>Medical Emergency</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Severity Level
            </label>
            <select
              name="severity"
              required
              defaultValue=""
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3"
            >
              <option value="" disabled>
                Select severity
              </option>
              <option>Critical - Immediate danger</option>
              <option>High - Urgent response needed</option>
              <option>Medium - Response required</option>
              <option>Low - Non-urgent</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Describe the Emergency
            </label>
            <textarea
              name="description"
              required
              rows="5"
              placeholder="Tell us what happened..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Location
            </label>

            <button
              type="button"
              onClick={detectLocation}
              disabled={locationLoading}
              className="w-full rounded-lg border border-red-500 bg-red-500/10 p-3 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
            >
              {locationLoading
                ? "Detecting..."
                : "📍 Use My Location"}
            </button>

            {location && (
              <p className="mt-2 break-all text-sm text-green-400">
                Location saved: {location}
              </p>
            )}

            <p className="mt-2 text-xs text-slate-400">
              Allow location permission when your browser asks.
              GPS coordinates will be included with your report.
            </p>
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Add Photo (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3"
            />
            <p className="mt-1 text-xs text-slate-400">
              Photos are not stored with reports in this demo yet.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-semibold">
                Your Name (Optional)
              </label>
              <input
                name="name"
                type="text"
                placeholder="Enter your name"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Phone Number (Optional)
              </label>
              <input
                name="phone"
                type="tel"
                placeholder="Enter phone number"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-red-600 py-4 text-lg font-bold hover:bg-red-700"
          >
            🚨 Submit Emergency Report
          </button>
        </form>

        <Link to="/" className="mt-6 inline-block text-slate-400">
          ← Back to Home
        </Link>
      </main>
    </div>
  );
}

// ---------------------------------
// 2. HOME PAGE
// ---------------------------------
function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-8 py-5">
        <Link to="/" className="text-2xl font-bold text-red-500">
          ResQFlow
        </Link>

        <div className="flex flex-wrap gap-5 text-sm">
          <Link to="/">Home</Link>
          <Link to="/report">Report Emergency</Link>
          <Link to="/track">Track Report</Link>
          <Link to="/emergency-info">Emergency Info</Link>
          <Link to="/authority">Authority Portal</Link>
        </div>
      </nav>

      <section className="px-6 py-24 text-center">
        <p className="mb-4 font-semibold text-red-400">
          EMERGENCY RESPONSE PLATFORM
        </p>

        <h1 className="text-5xl font-bold leading-tight md:text-6xl">
          Rapid Response.
          <br />
          <span className="text-red-500">Save Lives.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          ResQFlow helps citizens report emergencies and gives
          authorities a place to review and manage incident reports.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/report"
            className="rounded-lg bg-red-600 px-6 py-3 font-semibold hover:bg-red-700"
          >
            Report Emergency
          </Link>

          <Link
            to="/authority"
            className="rounded-lg border border-slate-600 px-6 py-3 font-semibold hover:bg-slate-800"
          >
            Authority Portal
          </Link>
        </div>
      </section>

      <section className="bg-slate-900 px-6 py-16">
        <h2 className="text-center text-3xl font-bold">
          How ResQFlow Works
        </h2>

        <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700 p-6">
            <div className="text-3xl">📢</div>
            <h3 className="mt-4 text-xl font-bold">1. Report</h3>
            <p className="mt-2 text-slate-400">
              Citizens submit an emergency type, severity and details.
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 p-6">
            <div className="text-3xl">🚨</div>
            <h3 className="mt-4 text-xl font-bold">2. Respond</h3>
            <p className="mt-2 text-slate-400">
              Authorities review reports and update their status.
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 p-6">
            <div className="text-3xl">🛟</div>
            <h3 className="mt-4 text-xl font-bold">3. Rescue</h3>
            <p className="mt-2 text-slate-400">
              Real rescue coordination requires authorized service integration.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 px-8 py-6 text-center text-slate-500">
        © 2026 ResQFlow — Emergency Response Platform
      </footer>
    </div>
  );
}

// ---------------------------------
// 3. TRACK REPORT PAGE
// ---------------------------------
function TrackReport() {
  const [reportId, setReportId] = useState("");
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleTrack = (event) => {
    event.preventDefault();

    const report = getReports().find(
      (item) => item.id === reportId.trim()
    );

    setResult(report || null);
    setSearched(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <main className="mx-auto max-w-2xl">
        <Link to="/" className="text-2xl font-bold text-red-500">
          ResQFlow
        </Link>

        <h1 className="mt-10 text-4xl font-bold">
          Track Your Report
        </h1>
        <p className="mt-3 text-slate-400">
          Enter your report ID to check its status.
        </p>

        <form
          onSubmit={handleTrack}
          className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          <label className="mb-2 block font-semibold">
            Report ID
          </label>

          <input
            value={reportId}
            onChange={(event) => setReportId(event.target.value)}
            required
            placeholder="Example: RQ-123456789"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
          />

          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-red-600 py-3 font-semibold hover:bg-red-700"
          >
            Track Report
          </button>

          {searched && (
            <div className="mt-6 rounded-lg border border-slate-700 p-4">
              {result ? (
                <>
                  <h2 className="font-bold text-green-400">
                    Report Found
                  </h2>
                  <p className="mt-2">
                    <strong>ID:</strong> {result.id}
                  </p>
                  <p className="mt-2">
                    <strong>Emergency:</strong> {result.emergencyType}
                  </p>
                  <p className="mt-2">
                    <strong>Status:</strong> {result.status}
                  </p>
                  <p className="mt-2">
                    <strong>Severity:</strong> {result.severity}
                  </p>
                  <p className="mt-2">
                    <strong>Assigned team:</strong>{" "}
                    {result.assignedTeam || "Not assigned yet"}
                  </p>
                </>
              ) : (
                <p className="text-red-400">
                  Report not found. Please check your ID.
                </p>
              )}
            </div>
          )}
        </form>

        <Link to="/" className="mt-6 inline-block text-slate-400">
          ← Back to Home
        </Link>
      </main>
    </div>
  );
}

// ---------------------------------
// 4. EMERGENCY INFORMATION PAGE
// ---------------------------------
function EmergencyInfo() {
  const tips = [
    {
      title: "🔥 Fire Emergency",
      text: "Leave using a safe exit if possible. Avoid elevators and do not re-enter a burning building.",
    },
    {
      title: "🏚️ Building Collapse",
      text: "Move away from unstable structures. Do not enter damaged buildings to attempt a rescue.",
    },
    {
      title: "🌊 Flood",
      text: "Move to higher ground when safe. Never walk or drive through floodwater.",
    },
    {
      title: "🚑 Medical Emergency",
      text: "Contact emergency services and follow instructions from trained responders.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <main className="mx-auto max-w-4xl">
        <Link to="/" className="text-2xl font-bold text-red-500">
          ResQFlow
        </Link>

        <h1 className="mt-10 text-4xl font-bold">
          Emergency Information
        </h1>

        <p className="mt-3 text-slate-400">
          Stay calm, move to safety when possible, and contact official emergency services.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {tips.map((tip) => (
            <section
              key={tip.title}
              className="rounded-xl border border-slate-700 bg-slate-900 p-6"
            >
              <h2 className="text-xl font-bold">{tip.title}</h2>
              <p className="mt-3 text-slate-300">{tip.text}</p>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">
            Emergency Number in India
          </h2>
          <p className="mt-3 text-slate-300">
            Emergency response: <strong>112</strong>
          </p>
          <p className="mt-3 text-sm text-slate-400">
            This is a frontend demo. It does not contact emergency
            services or dispatch real rescue teams.
          </p>
        </section>

        <Link
          to="/"
          className="mt-8 inline-block rounded-lg bg-red-600 px-5 py-3 font-semibold"
        >
          Back to Home
        </Link>
      </main>
    </div>
  );
}

// ---------------------------------
// 5. AUTHORITY PORTAL
// ---------------------------------
function AuthorityPortal() {
  const [reports, setReports] = useState(() => getReports());
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);

  const updateReport = (reportId, changes) => {
    const updatedReports = reports.map((report) =>
      report.id === reportId
        ? { ...report, ...changes }
        : report
    );

    setReports(updatedReports);
    saveReports(updatedReports);
    saveLatestReport(updatedReports[0]);

    setSelectedReport((current) =>
      current?.id === reportId
        ? { ...current, ...changes }
        : current
    );
  };

  const pendingCount = reports.filter(
    (report) =>
      report.status === "Received" ||
      report.status === "Under Review"
  ).length;

  const dispatchedCount = reports.filter(
    (report) => report.status === "Team Dispatched"
  ).length;

  const resolvedCount = reports.filter(
    (report) => report.status === "Resolved"
  ).length;

  const cards = [
    {
      title: "Total Reports",
      value: reports.length,
      color: "text-slate-900",
    },
    {
      title: "Pending Reports",
      value: pendingCount,
      color: "text-orange-600",
    },
    {
      title: "Teams Dispatched",
      value: dispatchedCount,
      color: "text-blue-600",
    },
    {
      title: "Resolved Reports",
      value: resolvedCount,
      color: "text-green-600",
    },
  ];

  const emergencyTypes = [
    "Building Collapse",
    "Fire",
    "Flood",
    "Road Accident",
    "Medical Emergency",
    "Other",
  ];

  const emergencySummary = emergencyTypes.map((type) => ({
    type,
    count: reports.filter(
      (report) => report.emergencyType === type
    ).length,
  }));

  const severityRank = (severity) => {
    const value = (severity || "").toLowerCase();

    if (value.startsWith("critical")) return 1;
    if (value.startsWith("high")) return 2;
    if (value.startsWith("medium")) return 3;
    if (value.startsWith("low")) return 4;

    return 5;
  };

  const visibleReports = reports
    .filter((report) => {
      const matchesFilter =
        filter === "All" || report.status === filter;

      const query = search.toLowerCase();

      const matchesSearch = [
        report.id,
        report.emergencyType,
        report.severity,
        report.location,
        report.assignedTeam || "",
      ].some((value) =>
        String(value).toLowerCase().includes(query)
      );

      return matchesFilter && matchesSearch;
    })
    .sort(
      (a, b) => severityRank(a.severity) - severityRank(b.severity)
    );

  const severityStyle = (severity) => {
    const rank = severityRank(severity);

    if (rank === 1) return "bg-red-100 text-red-800";
    if (rank === 2) return "bg-orange-100 text-orange-800";
    if (rank === 3) return "bg-yellow-100 text-yellow-800";
    if (rank === 4) return "bg-green-100 text-green-800";

    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-900 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/" className="text-2xl font-bold text-red-400">
              ResQFlow
            </Link>
            <p className="mt-1 text-sm text-slate-300">
              Authority Response Dashboard
            </p>
          </div>

          <Link
            to="/"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="mt-2 text-slate-500">
          Review reports, update statuses, and assign a response team.
        </p>

        {/* DASHBOARD SUMMARY CARDS */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl bg-white p-6 shadow-sm"
            >
              <p className="text-sm text-slate-500">{card.title}</p>
              <p className={`mt-3 text-3xl font-bold ${card.color}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* EMERGENCY TYPE SUMMARY */}
        <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Emergency Type Summary
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Number of reports submitted for each emergency type.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {emergencySummary.map((item) => (
              <div
                key={item.type}
                className="rounded-xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="text-sm text-slate-500">{item.type}</p>
                <p className="mt-2 text-3xl font-bold text-blue-600">
                  {item.count}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Reports submitted
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* EMERGENCY LOCATION MAP */}
        <EmergencyMap reports={reports} />

        {/* REPORT MANAGEMENT */}
        <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Recent Emergency Reports
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ID, emergency, severity, location or team"
              className="w-full rounded-lg border border-slate-300 p-3"
            />

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3"
            >
              <option>All</option>
              <option>Received</option>
              <option>Under Review</option>
              <option>Team Dispatched</option>
              <option>Resolved</option>
            </select>
          </div>

          {visibleReports.length === 0 ? (
            <div className="mt-6 rounded-lg bg-slate-50 p-8 text-center">
              <p className="font-semibold text-slate-600">
                No reports found
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Submit a test report to display it here.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {visibleReports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">
                        {report.emergencyType}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Report ID: {report.id}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        View Details
                      </button>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
                        {report.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <p>
                      <strong>Severity:</strong>{" "}
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${severityStyle(report.severity)}`}
                      >
                        {report.severity}
                      </span>
                    </p>

                    <p>
                      <strong>Submitted:</strong> {report.createdAt}
                    </p>

                    <p className="break-words">
                      <strong>Location:</strong> {report.location}
                    </p>

                    <p>
                      <strong>Contact:</strong> {report.name}
                      {report.phone !== "Not provided"
                        ? ` · ${report.phone}`
                        : ""}
                    </p>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">
                    {report.description}
                  </p>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Update Report Status
                      </label>
                      <select
                        value={report.status}
                        onChange={(event) =>
                          updateReport(report.id, {
                            status: event.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white p-3"
                      >
                        <option>Received</option>
                        <option>Under Review</option>
                        <option>Team Dispatched</option>
                        <option>Resolved</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Assign Rescue Team
                      </label>
                      <select
                        value={report.assignedTeam || ""}
                        onChange={(event) =>
                          updateReport(report.id, {
                            assignedTeam: event.target.value,
                            ...(event.target.value
                              ? { status: "Team Dispatched" }
                              : {}),
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white p-3"
                      >
                        <option value="">Select a rescue team</option>
                        <option value="Fire and Rescue">Fire and Rescue</option>
                        <option value="Medical Team">Medical Team</option>
                        <option value="Search and Rescue">Search and Rescue</option>
                        <option value="Flood Rescue">Flood Rescue</option>
                        <option value="Road Accident Response">Road Accident Response</option>
                      </select>

                      <p className="mt-2 text-sm text-slate-600">
                        Assigned team:{" "}
                        <strong>
                          {report.assignedTeam || "Not assigned"}
                        </strong>
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* FULL REPORT DETAILS */}
        {selectedReport && (
          <section className="mt-8 rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Report Details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Full information for report {selectedReport.id}
                </p>
              </div>

              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-lg bg-slate-200 px-4 py-2 font-semibold hover:bg-slate-300"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <p><strong>Report ID:</strong> {selectedReport.id}</p>
              <p><strong>Emergency:</strong> {selectedReport.emergencyType}</p>
              <p><strong>Severity:</strong> {selectedReport.severity}</p>
              <p><strong>Status:</strong> {selectedReport.status}</p>
              <p>
                <strong>Assigned Team:</strong>{" "}
                {selectedReport.assignedTeam || "Not assigned"}
              </p>
              <p><strong>Submitted:</strong> {selectedReport.createdAt}</p>
              <p><strong>Reporter:</strong> {selectedReport.name}</p>
              <p><strong>Phone:</strong> {selectedReport.phone}</p>
              <p className="break-words sm:col-span-2">
                <strong>Location:</strong> {selectedReport.location}
              </p>

              <div className="sm:col-span-2">
                <strong>Description:</strong>
                <p className="mt-2 whitespace-pre-wrap text-slate-600">
                  {selectedReport.description}
                </p>
              </div>
            </div>
          </section>
        )}

        <p className="mt-6 text-xs text-slate-500">
          Demo only: reports and assignments are saved in this browser.
          This does not notify authorities or dispatch real rescue teams.
          Use official emergency services for real emergencies.
        </p>
      </main>
    </div>
  );
}

// ---------------------------------
// 6. APP ROUTER
// ---------------------------------
function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/report" element={<ReportEmergency />} />
        <Route path="/track" element={<TrackReport />} />
        <Route path="/emergency-info" element={<EmergencyInfo />} />
        <Route path="/authority" element={<AuthorityPortal />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
