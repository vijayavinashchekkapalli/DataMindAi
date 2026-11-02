import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, Link } from "react-router-dom";
import {
  Bell,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  Package,
  Settings,
  Sparkles,
  TrendingUp,
  Upload,
  UserCircle2,
  Wand2,
  CheckCircle2,
  ArrowRight,
  Download,
  Search,
  BarChart3,
  ChevronDown,
  FileCheck2
} from "lucide-react";
import {
  dailySales,
  forecastList,
  overviewStats,
  recentActivity,
  recommendationList,
  reportTemplates,
  topProducts
} from "./dashboardData";
const WeeklyRevenueChart = lazy(() => import("./WeeklyRevenueChart"));
import "./Dashboard.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const getAuthHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("datamind-token") || ""}` });
const formatCurrency = (value) => `₹${(Number(value) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const getApiData = async (response, fallbackMessage) => {
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || fallbackMessage);
  }
  return payload?.data;
};

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/upload", label: "Upload Sales Data", icon: Upload },
  { to: "/dashboard/cleaning", label: "Data Cleaning", icon: CheckCircle2 },
  { to: "/dashboard/analytics", label: "Sales Analytics", icon: LineChart },
  { to: "/dashboard/predictions", label: "AI Predictions", icon: TrendingUp },
  { to: "/dashboard/recommendations", label: "AI Recommendations", icon: Sparkles },
  { to: "/dashboard/reports", label: "Reports", icon: FileText },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

function DashboardPage({ onLogout, authNotice }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState({ overview: null, trends: [], topProducts: [], categories: [] });
  const [dashboardError, setDashboardError] = useState("");
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("datamind-user") || "null");
    } catch {
      return null;
    }
  })();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Your account";

  const refreshDashboardData = useCallback(async () => {
    setDashboardError("");
    setDashboardData({ overview: null, trends: [], topProducts: [], categories: [] });
    try {
      const endpoints = [
        `${API_BASE_URL}/api/analytics/overview?range=all`,
        `${API_BASE_URL}/api/analytics/sales-trends?range=30d`,
        `${API_BASE_URL}/api/analytics/top-products`,
        `${API_BASE_URL}/api/analytics/categories`,
      ];
      const responses = await Promise.all(endpoints.map((url) => fetch(url, { headers: getAuthHeaders() })));
      const payloads = await Promise.all(responses.map((response) => getApiData(response, "Could not refresh dashboard data.")));
      setDashboardData({ overview: payloads[0], trends: payloads[1] || [], topProducts: payloads[2] || [], categories: payloads[3] || [] });
    } catch (error) {
      console.error("Dashboard data refresh failed:", error);
      setDashboardError(error.message || "Could not refresh dashboard data.");
    }
  }, []);

  useEffect(() => {
    refreshDashboardData();
  }, [refreshDashboardData]);

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">D</div>
          <div>
            <p className="brand-label">DataMind</p>
            <strong>AI</strong>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button type="button" className="logout-btn" onClick={onLogout}>
          <LogOut size={17} />
          Logout
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h1>Good morning, {user?.firstName || "there"}</h1>
          </div>

          <div className="header-actions">
            <div className="date-pill">{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
            <button type="button" className="icon-btn" aria-label="Notifications">
              <Bell size={17} />
            </button>
            <div className="profile-menu">
              <button
                type="button"
                className="profile-pill"
                aria-expanded={profileOpen}
                aria-haspopup="true"
                onClick={() => setProfileOpen((open) => !open)}
              >
                <UserCircle2 size={18} />
                <span>Profile</span>
                <ChevronDown size={15} />
              </button>
              {profileOpen && (
                <div className="profile-dropdown" role="menu">
                  <div className="profile-details">
                    <strong>{fullName}</strong>
                    {user?.email && <span>{user.email}</span>}
                    {!user?.email && user?.phoneNumber && <span>{user.phoneNumber}</span>}
                  </div>
                  <button
                    type="button"
                    className="profile-logout-btn"
                    role="menuitem"
                    onClick={onLogout}
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {authNotice && <div className="upload-message success" role="status">{authNotice}</div>}
        {dashboardError && <div className="upload-message error" role="alert">{dashboardError}</div>}

        <Routes>
          <Route path="/" element={<OverviewPage dashboardData={dashboardData} />} />
          <Route path="/upload" element={<UploadPage onImported={refreshDashboardData} />} />
          <Route path="/cleaning" element={<CleaningPage onImported={refreshDashboardData} />} />
          <Route path="/analytics" element={<AnalyticsPage dashboardData={dashboardData} />} />
          <Route path="/predictions" element={<PredictionsPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function OverviewPage({ dashboardData }) {
  const overview = dashboardData.overview;
  const bestProduct = dashboardData.topProducts[0];
  const stats = overview ? [
    { ...overviewStats[0], value: formatCurrency(overview.totalRevenue) },
    { ...overviewStats[1], value: Number(overview.totalProductsSold || 0).toLocaleString("en-IN") },
    { ...overviewStats[2], value: Number(overview.totalTransactions || 0).toLocaleString("en-IN") },
    { ...overviewStats[3], value: bestProduct?.name || "No data yet", change: bestProduct ? `${bestProduct.units} units` : "Upload sales" },
  ] : overviewStats;
  const trend = dashboardData.trends.slice(-7);
  const maxDailyRevenue = Math.max(...trend.map((item) => Number(item.revenue) || 0), 1);
  const chartDays = trend.length
    ? trend.map((item) => ({
      day: new Date(`${item.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" }),
      sales: (Number(item.revenue) / maxDailyRevenue) * 100,
    }))
    : dailySales;
  const products = dashboardData.topProducts.length
    ? dashboardData.topProducts.map((item) => ({ ...item, revenue: formatCurrency(item.revenue) }))
    : topProducts;
  const activity = overview?.recentSales?.length
    ? overview.recentSales.map((sale, index) => ({
      id: `${sale.productName}-${sale.date}-${index}`,
      product: sale.productName,
      status: `${sale.quantitySold} units · ${formatCurrency(sale.totalSales)}`,
      time: new Date(sale.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    }))
    : recentActivity;
  const monthlyTrend = dashboardData.trends.slice(-30);
  const maxMonthlyRevenue = Math.max(...monthlyTrend.map((item) => Number(item.revenue) || 0), 1);
  const monthlyPath = monthlyTrend.length > 1
    ? monthlyTrend.map((item, index) => {
      const x = (index / (monthlyTrend.length - 1)) * 300;
      const y = 110 - ((Number(item.revenue) || 0) / maxMonthlyRevenue) * 100;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ")
    : "M0 90 C 40 80, 60 30, 110 45 S 200 100, 300 35";

  return (
    <div className="page-stack">
      <section className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className={`stat-card tone-${stat.tone}`}>
            <div className="stat-topline">
              <span>{stat.label}</span>
              <span className="change-pill">{stat.change}</span>
            </div>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Overview</p>
            <h2>Business performance</h2>
          </div>
          <Link to="/dashboard/upload" className="primary-link">
            Upload Sales Data <ArrowRight size={16} />
          </Link>
        </div>

        {Number(overview?.totalTransactions || 0) === 0 && <div className="empty-state-card">
          <div className="empty-state-icon">
            <Upload size={28} />
          </div>
          <h3>No sales data uploaded yet</h3>
          <p>
            Upload your CSV or Excel file to unlock revenue insights, AI forecasting, and business recommendations.
          </p>
          <Link to="/dashboard/upload" className="primary-btn small">
            Upload data
          </Link>
        </div>}
      </section>

      <section className="dashboard-grid two-col">
        <div className="panel-card">
          <div className="panel-header">
            <h3>Daily sales trend</h3>
            <span>7 days</span>
          </div>
          <div className="bar-chart">
            {chartDays.map((item) => (
              <div key={item.day} className="bar-group">
                <div className="bar" style={{ height: `${Math.max(item.sales, 8)}%` }} />
                <span>{item.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h3>Top-selling products</h3>
            <span>Today</span>
          </div>
          <ul className="product-list">
            {products.map((item) => (
              <li key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.units} units</span>
                </div>
                <b>{item.revenue}</b>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dashboard-grid two-col">
        <div className="panel-card">
          <div className="panel-header">
            <h3>Recent sales activity</h3>
            <span>Live</span>
          </div>
          <ul className="activity-list">
            {activity.map((item) => (
              <li key={item.id}>
                <div className="activity-icon"><Package size={16} /></div>
                <div>
                  <strong>{item.product}</strong>
                  <span>{item.status}</span>
                </div>
                <time>{item.time}</time>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h3>Monthly revenue</h3>
            <span>Overview</span>
          </div>
          <div className="line-chart-shell">
            <svg viewBox="0 0 300 120" className="mini-chart" preserveAspectRatio="none">
              <path d={monthlyPath} />
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
}

function UploadPage({ onImported }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadState, setUploadState] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [storage, setStorage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const refreshStorage = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/uploads/storage`, { headers: getAuthHeaders() });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not load storage usage.");
      setStorage(result.data);
    } catch (error) {
      console.error("Storage usage request failed:", error);
    }
  }, []);

  useEffect(() => {
    refreshStorage();
  }, [refreshStorage]);

  const selectFile = (file) => {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xls", "xlsx"].includes(extension)) {
      setMessage({ type: "error", text: "Unsupported file type. Choose a CSV, XLS, or XLSX file." });
      return;
    }
    if (file.size === 0) {
      setMessage({ type: "error", text: "This file is empty. Choose a file containing sales records." });
      return;
    }
    const maxBytes = storage?.maxFileSizeBytes || 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setMessage({ type: "error", text: `This file is larger than your ${storage?.maxFileSizeMb || 10} MB per-file limit.` });
      return;
    }
    setSelectedFile(file);
    setUploadResult(null);
    setProgress(0);
    setUploadState("idle");
    setMessage(null);
  };

  const removeSelectedFile = async () => {
    if (uploadResult?.fileId) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/uploads/${uploadResult.fileId}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not remove the staged upload.");
        await refreshStorage();
      } catch (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }
    }
    setSelectedFile(null);
    setUploadResult(null);
    setProgress(0);
    setUploadState("idle");
    setMessage(null);
  };

  const uploadSelectedFile = () => {
    if (!selectedFile || uploadState === "uploading") return;
    setUploadState("uploading");
    setProgress(0);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", selectedFile);
    const request = new XMLHttpRequest();
    request.open("POST", `${API_BASE_URL}/api/uploads`);
    request.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("datamind-token") || ""}`);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) setProgress(Math.min(Math.round((event.loaded / event.total) * 100), 99));
    });
    request.addEventListener("load", () => {
      let payload;
      try {
        payload = JSON.parse(request.responseText);
      } catch {
        payload = { message: "The server returned an unreadable response. Check the backend logs." };
      }
      if (request.status < 200 || request.status >= 300) {
        console.error("Upload request failed:", request.status, payload);
        setUploadState("error");
        setMessage({ type: "error", text: payload.message || `Upload failed (HTTP ${request.status}).` });
        return;
      }
      setUploadResult(payload.data);
      setProgress(100);
      setUploadState("ready");
      setMessage({ type: "success", text: payload.message || "File validated. Review the results before importing." });
      setStorage(payload.data.storage || null);
      refreshStorage();
    });
    request.addEventListener("error", () => {
      console.error("Upload network error", request);
      setUploadState("error");
      setMessage({ type: "error", text: "Network error while uploading. Check that the backend is running and try again." });
    });
    request.addEventListener("abort", () => {
      setUploadState("error");
      setMessage({ type: "error", text: "Upload was cancelled." });
    });
    request.send(formData);
  };

  const confirmImport = async () => {
    if (!uploadResult?.fileId || uploadState === "importing") return;
    setUploadState("importing");
    setMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/uploads/${uploadResult.fileId}/import`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Sales data import failed.");
      setUploadResult((previous) => ({ ...previous, ...result.data, imported: true }));
      setUploadState("imported");
      setMessage({ type: "success", text: result.message || "Sales records imported successfully." });
      await onImported?.();
      await refreshStorage();
    } catch (error) {
      console.error("Sales data import failed:", error);
      setUploadState("ready");
      setMessage({ type: "error", text: error.message || "Unable to import this file. Please try again." });
    }
  };

  const previewRows = uploadResult?.preview || [];
  const previewColumns = previewRows.length ? Object.keys(previewRows[0]).slice(0, 7) : [];
  const storagePercent = storage ? Math.min((storage.usedBytes / storage.maxBytes) * 100, 100) : 0;

  return (
    <div className="page-stack">
      <section className="upload-card">
        <div className="section-header compact">
          <div>
            <p className="eyebrow">Upload</p>
            <h2>Sales data intake</h2>
          </div>
        </div>

        <div
          className={`dropzone ${isDragging ? "dragging" : ""}`}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
          onDrop={(event) => { event.preventDefault(); setIsDragging(false); selectFile(event.dataTransfer.files?.[0]); }}
        >
          <Upload size={28} />
          <h3>Drag and drop your sales file here</h3>
          <p>Supports CSV, XLS and XLSX files up to {storage?.maxFileSizeMb || 10} MB.</p>
          <label className="upload-button">
            <input type="file" accept=".csv,.xls,.xlsx" onChange={(event) => { selectFile(event.target.files?.[0]); event.target.value = ""; }} />
            Browse files
          </label>
        </div>

        {storage && <div className="storage-usage" aria-label="Upload storage usage">
          <div className="storage-usage-label">
            <strong>Storage used</strong>
            <span>{storage.usedMb} MB of {storage.maxMb} MB · {storage.fileCount}/{storage.maxFiles} files</span>
          </div>
          <div className="storage-track"><span style={{ width: `${storagePercent}%` }} /></div>
        </div>}

        {selectedFile && <div className="selected-file-card">
          <div className="selected-file-info">
            <strong>{selectedFile.name}</strong>
            <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
          {!uploadResult?.imported && <button type="button" className="secondary-btn small" onClick={removeSelectedFile} disabled={uploadState === "uploading" || uploadState === "importing"}>
            Remove file
          </button>}
        </div>}

        {selectedFile && !uploadResult?.imported && <div className="upload-controls">
          {uploadState === "uploading" && <div className="upload-progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
            <div className="upload-progress-label"><span>Uploading and validating…</span><strong>{progress}%</strong></div>
            <div className="storage-track"><span style={{ width: `${progress}%` }} /></div>
          </div>}
          {uploadState === "idle" || uploadState === "error" ? <button type="button" className="primary-btn small" onClick={uploadSelectedFile}>
            <Upload size={16} /> Upload and validate
          </button> : null}
          {uploadResult && uploadState !== "importing" && <button type="button" className="primary-btn small" onClick={confirmImport} disabled={!uploadResult.canImport || uploadResult.imported}>
            <CheckCircle2 size={16} /> Confirm import ({uploadResult.validRows || 0} valid rows)
          </button>}
          {uploadState === "importing" && <p className="upload-working">Importing validated records…</p>}
        </div>}

        {message && <div className={`upload-message ${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.text}</div>}

        {uploadResult && <section className="upload-results" aria-live="polite">
          <div className="section-header compact">
            <div><p className="eyebrow">Validation results</p><h3>{uploadResult.imported ? "Import complete" : "Review before import"}</h3></div>
          </div>
          <div className="upload-summary-grid">
            <div><span>Total rows</span><strong>{uploadResult.totalRows}</strong></div>
            <div><span>Valid rows</span><strong>{uploadResult.validRows}</strong></div>
            <div><span>Invalid rows</span><strong>{uploadResult.invalidRows}</strong></div>
            <div><span>Duplicate rows</span><strong>{uploadResult.duplicateRows}</strong></div>
            <div><span>Imported records</span><strong>{uploadResult.importedRecords || 0}</strong></div>
          </div>

          {previewRows.length > 0 && <div className="data-preview">
            <h4>Data preview (first {previewRows.length} rows)</h4>
            <div className="data-preview-scroll"><table><thead><tr>{previewColumns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
              <tbody>{previewRows.map((row, index) => <tr key={index}>{previewColumns.map((column) => <td key={column}>{String(row[column] ?? "")}</td>)}</tr>)}</tbody>
            </table></div>
          </div>}

          {uploadResult.validationErrors?.length > 0 && <div className="validation-error-list">
            <h4>Rows needing attention</h4>
            {uploadResult.validationErrors.slice(0, 10).map((item) => <p key={`${item.row ?? "duplicate"}-${item.errors.join("|")}`}><strong>{item.row ? `Row ${item.row}:` : "Duplicate:"}</strong> {item.errors.join(", ")}</p>)}
            {uploadResult.validationErrors.length > 10 && <span>Showing the first 10 validation issues.</span>}
          </div>}
        </section>}
      </section>
    </div>
  );
}

function CleaningPage({ onImported }) {
  const [files, setFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [options, setOptions] = useState({
    removeDuplicates: true,
    handleMissingValues: false,
    normalizeProductNames: true,
  });

  const refreshFiles = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/api/uploads`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    const uploads = await getApiData(response, "Could not load uploaded files.");
    setFiles(Array.isArray(uploads) ? uploads : []);
    return uploads;
  }, []);

  const refreshHistory = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/api/cleaning/history`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    const records = await getApiData(response, "Could not load cleaning history.");
    setHistory(Array.isArray(records) ? records : []);
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingFiles(true);
    Promise.all([refreshFiles(), refreshHistory()])
      .then(([uploads]) => {
        if (active && uploads?.length) {
          setSelectedFileId((current) => current || String(uploads[0]._id || uploads[0].id));
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load cleaning data.");
      })
      .finally(() => {
        if (active) setLoadingFiles(false);
      });
    return () => { active = false; };
  }, [refreshFiles, refreshHistory]);

  useEffect(() => {
    if (!selectedFileId) {
      setPreview(null);
      return undefined;
    }

    let active = true;
    setPreview(null);
    setError("");
    setNotice("");
    setLoadingPreview(true);

    const loadPreview = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/cleaning/${encodeURIComponent(selectedFileId)}`, {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ operations: options }),
          cache: "no-store",
        });
        const result = await getApiData(response, "Could not prepare the cleaning preview.");
        if (active) setPreview(result);
      } catch (requestError) {
        if (active) setError(requestError.message || "Could not prepare the cleaning preview.");
      } finally {
        if (active) setLoadingPreview(false);
      }
    };

    loadPreview();
    return () => { active = false; };
  }, [selectedFileId, options]);

  const setOption = (key, value) => {
    setOptions((previous) => ({ ...previous, [key]: value }));
  };

  const confirmImport = async () => {
    if (!selectedFileId || !preview?.summary?.cleanedRowCount || preview.fileStatus === "processed" || importing) return;
    setImporting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/uploads/${encodeURIComponent(selectedFileId)}/import`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ cleaningOptions: options }),
      });
      const result = await getApiData(response, "Could not import the reviewed records.");
      setPreview((previous) => ({
        ...previous,
        fileStatus: "processed",
        summary: { ...previous.summary, cleanedRowCount: result.importedRecords },
      }));
      setNotice(`${result.importedRecords} reviewed sales records imported successfully.`);
      await Promise.all([refreshFiles(), refreshHistory(), onImported?.()]);
    } catch (requestError) {
      setError(requestError.message || "Could not import the reviewed records.");
    } finally {
      setImporting(false);
    }
  };

  const summary = preview?.summary;
  const statCards = summary ? [
    { label: "Uploaded rows", value: summary.originalRowCount, tone: "green" },
    { label: "Valid records", value: summary.validRecordCount, tone: "blue" },
    { label: "Invalid records", value: summary.invalidRecordCount, tone: "slate" },
    { label: "Duplicate records", value: summary.duplicateRecordCount, tone: "gold" },
    { label: "Missing values", value: summary.missingValues, tone: "gold" },
    { label: "Invalid dates", value: summary.invalidDates, tone: "slate" },
    { label: "Negative quantities", value: summary.negativeQuantities, tone: "slate" },
    { label: "Negative prices", value: summary.negativePrices, tone: "slate" },
    { label: "Invalid prices", value: summary.invalidPrices, tone: "slate" },
  ] : [];
  const originalColumns = preview?.headers || [];
  const selectedFile = files.find((file) => String(file._id || file.id) === selectedFileId);

  return (
    <div className="page-stack">
      <section className="panel-card cleaning-toolbar">
        <div className="section-header compact">
          <div>
            <p className="eyebrow">Review before import</p>
            <h2>Data cleaning</h2>
          </div>
          <label className="input-group cleaning-file-select">
            <span>Uploaded file</span>
            <select
              value={selectedFileId}
              onChange={(event) => setSelectedFileId(event.target.value)}
              disabled={loadingFiles || files.length === 0}
            >
              {!files.length && <option value="">No uploaded files</option>}
              {files.map((file) => (
                <option key={file._id || file.id} value={file._id || file.id}>
                  {file.originalFileName} · {file.status}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loadingFiles && <p className="upload-working">Loading uploaded sales files…</p>}
        {!loadingFiles && !files.length && (
          <div className="empty-state-card">
            <h3>No uploaded sales file</h3>
            <p>Upload a CSV or Excel file to review its original data and cleaning results.</p>
          </div>
        )}
        {error && <div className="upload-message error" role="alert">{error}</div>}
        {notice && <div className="upload-message success" role="status">{notice}</div>}
        {loadingPreview && <p className="upload-working">Analyzing the original uploaded rows…</p>}

        {preview && <div className="cleaning-actions">
          <label><input type="checkbox" checked={options.removeDuplicates} onChange={(event) => setOption("removeDuplicates", event.target.checked)} /> Remove exact duplicates</label>
          <label><input type="checkbox" checked={options.handleMissingValues} onChange={(event) => setOption("handleMissingValues", event.target.checked)} /> Fill missing category and derivable total sales</label>
          <label><input type="checkbox" checked={options.normalizeProductNames} onChange={(event) => setOption("normalizeProductNames", event.target.checked)} /> Normalize product names</label>
          <span className="cleaning-validation-note">Dates, quantities, prices, and total sales are always validated.</span>
          {selectedFile?.status !== "processed" && <button type="button" className="primary-btn small" onClick={confirmImport} disabled={importing || !summary?.cleanedRowCount}>
            <FileCheck2 size={16} /> {importing ? "Importing reviewed rows…" : `Confirm import (${summary?.cleanedRowCount || 0})`}
          </button>}
          {selectedFile?.status === "processed" && <span className="review-badge good"><CheckCircle2 size={15} /> Already imported</span>}
        </div>}
      </section>

      {summary && <section className="stats-grid compact-grid">
        {statCards.map((card) => (
          <div key={card.label} className={`stat-card tone-${card.tone}`}>
            <span>{card.label}</span>
            <strong>{Number(card.value || 0).toLocaleString("en-IN")}</strong>
          </div>
        ))}
      </section>}

      {summary && <section className="dashboard-grid two-col">
        <div className="panel-card">
          <div className="panel-header"><h3>Data quality summary</h3><span>{preview.fileName}</span></div>
          <div className="quality-summary-grid">
            {summary.qualitySummary.map((item) => (
              <div key={item.key}><span>{item.label}</span><strong>{Number(item.count || 0).toLocaleString("en-IN")}</strong></div>
            ))}
          </div>
        </div>
        <div className="panel-card">
          <div className="panel-header"><h3>Before and after</h3><span>{summary.recordsAffected} affected</span></div>
          <div className="quality-summary-grid">
            <div><span>Original rows</span><strong>{summary.originalRowCount}</strong></div>
            <div><span>Cleaned rows ready</span><strong>{summary.cleanedRowCount}</strong></div>
            <div><span>Duplicates removed</span><strong>{summary.removedDuplicateCount}</strong></div>
            <div><span>Invalid records</span><strong>{summary.invalidRecordCount}</strong></div>
            <div><span>Missing cells handled</span><strong>{summary.missingValuesHandled}</strong></div>
            <div><span>Corrected records</span><strong>{summary.correctedRecords}</strong></div>
          </div>
        </div>
      </section>}

      {preview && <section className="dashboard-grid two-col cleaning-preview-grid">
        <div className="panel-card">
          <div className="panel-header"><h3>Original uploaded data</h3><span>First {preview.originalPreview.length} rows · unchanged</span></div>
          {preview.originalPreview.length ? <div className="cleaning-table-wrap"><table className="cleaning-table">
            <thead><tr><th>Row</th>{originalColumns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
            <tbody>{preview.originalPreview.map((row) => (
              <tr key={row.rowNumber} className={row.issues.length ? "row-needs-review" : ""}>
                <td>{row.rowNumber}</td>
                {originalColumns.map((column) => <td key={column}>{String(row.values[column] ?? "")}</td>)}
              </tr>
            ))}</tbody>
          </table></div> : <p className="empty-state-card">No source rows found.</p>}
        </div>
        <div className="panel-card">
          <div className="panel-header"><h3>Cleaned data preview</h3><span>First {preview.cleanedPreview.length} importable rows</span></div>
          {preview.cleanedPreview.length ? <div className="cleaning-table-wrap"><table className="cleaning-table">
            <thead><tr>{["rowNumber", "date", "productName", "category", "quantitySold", "unitPrice", "totalSales"].map((column) => <th key={column}>{column === "rowNumber" ? "Source row" : column}</th>)}</tr></thead>
            <tbody>{preview.cleanedPreview.map((row) => (
              <tr key={row.rowNumber}>
                <td>{row.rowNumber}</td><td>{new Date(row.date).toLocaleDateString("en-IN", { timeZone: "UTC" })}</td>
                <td>{row.productName}</td><td>{row.category}</td><td>{row.quantitySold}</td>
                <td>{formatCurrency(row.unitPrice)}</td><td>{formatCurrency(row.totalSales)}</td>
              </tr>
            ))}</tbody>
          </table></div> : <div className="empty-state-card"><h3>No importable rows yet</h3><p>Rows with missing or invalid values remain available for review in the original file.</p></div>}
          {!!preview.reviewPreview.length && <div className="validation-error-list">
            <h4>Records requiring review</h4>
            {preview.reviewPreview.slice(0, 10).map((row) => (
              <p key={row.rowNumber}><strong>Row {row.rowNumber}:</strong> {row.issues.map((issue) => issue.message).join(", ") || "Duplicate row selected for removal"}</p>
            ))}
            {preview.reviewPreview.length > 10 && <span>Showing the first 10 rows requiring review.</span>}
          </div>}
        </div>
      </section>}

      <section className="panel-card">
        <div className="panel-header"><h3>Cleaning history</h3><span>{history.length} operations</span></div>
        {history.length ? <div className="cleaning-table-wrap"><table className="cleaning-table">
          <thead><tr><th>Filename</th><th>Cleaning date</th><th>Rows before</th><th>Rows after</th><th>Records affected</th><th>Status</th></tr></thead>
          <tbody>{history.map((item) => (
            <tr key={item._id}>
              <td>{item.fileName || "Uploaded sales file"}</td>
              <td>{new Date(item.createdAt).toLocaleString("en-IN")}</td>
              <td>{item.rowsBefore}</td><td>{item.rowsAfter}</td><td>{item.recordsAffected || 0}</td>
              <td>{item.status || "imported"}</td>
            </tr>
          ))}</tbody>
        </table></div> : <p className="empty-state-card">Confirmed cleaning imports will appear here.</p>}
      </section>
    </div>
  );
}

function AnalyticsPage({ dashboardData }) {
  const [range, setRange] = useState("30d");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [weeklyRevenue, setWeeklyRevenue] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyError, setWeeklyError] = useState("");
  const customRangeIncomplete = range === "custom" && (!customStartDate || !customEndDate);

  useEffect(() => {
    let active = true;
    setWeeklyRevenue([]);
    setWeeklyError("");
    if (customRangeIncomplete) {
      setWeeklyLoading(false);
      return () => { active = false; };
    }

    setWeeklyLoading(true);
    const query = new URLSearchParams({ range });
    if (range === "custom") {
      query.set("startDate", customStartDate);
      query.set("endDate", customEndDate);
    }

    fetch(`${API_BASE_URL}/api/analytics/weekly-revenue?${query}`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    })
      .then((response) => getApiData(response, "Could not load weekly revenue."))
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("The weekly revenue API returned an invalid response.");
        if (active) setWeeklyRevenue(data);
      })
      .catch((requestError) => {
        if (active) setWeeklyError(requestError.message || "Could not load weekly revenue.");
      })
      .finally(() => {
        if (active) setWeeklyLoading(false);
      });

    return () => { active = false; };
  }, [range, customStartDate, customEndDate, customRangeIncomplete]);

  const overview = dashboardData.overview;
  const categories = dashboardData.categories.slice().sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0));
  const totalCategoryRevenue = categories.reduce((total, category) => total + Number(category.revenue || 0), 0);
  const topCategoryShare = totalCategoryRevenue ? Math.round((Number(categories[0]?.revenue || 0) / totalCategoryRevenue) * 100) : 0;

  return (
    <div className="page-stack">
      <section className="stats-grid compact-grid">
        <div className="stat-card tone-green">
          <span>Total revenue</span>
          <strong>{formatCurrency(overview?.totalRevenue)}</strong>
        </div>
        <div className="stat-card tone-blue">
          <span>Quantity sold</span>
          <strong>{Number(overview?.totalProductsSold || 0).toLocaleString("en-IN")}</strong>
        </div>
        <div className="stat-card tone-gold">
          <span>Avg. transaction</span>
          <strong>{formatCurrency(overview?.averageTransactionValue)}</strong>
        </div>
        <div className="stat-card tone-slate">
          <span>Top category</span>
          <strong>{categories[0]?._id || "Waiting for data"}</strong>
        </div>
      </section>

      <section className="dashboard-grid two-col">
        <div className="panel-card">
          <div className="panel-header">
            <h3>Revenue by week</h3>
            <label className="weekly-range-select">
              <span className="sr-only">Weekly revenue date range</span>
              <select value={range} onChange={(event) => setRange(event.target.value)}>
                <option value="thisWeek">This week</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="6m">Last 6 months</option>
                <option value="custom">Custom date range</option>
              </select>
            </label>
          </div>
          {range === "custom" && <div className="weekly-custom-range">
            <label>From <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} /></label>
            <label>To <input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} /></label>
          </div>}
          {weeklyLoading && <p className="upload-working">Loading weekly sales data…</p>}
          {weeklyError && <div className="upload-message error" role="alert">{weeklyError}</div>}
          {!weeklyLoading && !weeklyError && customRangeIncomplete && <div className="empty-state-card"><p>Select a start and end date to view weekly revenue.</p></div>}
          {!weeklyLoading && !weeklyError && !customRangeIncomplete && weeklyRevenue.length === 0 && (
            <div className="empty-state-card"><p>No weekly sales data available. Upload your sales file to view revenue trends.</p></div>
          )}
          {!weeklyLoading && !weeklyError && weeklyRevenue.length > 0 && (
            <Suspense fallback={<p className="upload-working">Preparing the revenue chart…</p>}>
              <WeeklyRevenueChart data={weeklyRevenue} />
            </Suspense>
          )}
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h3>Product category performance</h3>
            <span>Imported data</span>
          </div>
          <div className="donut-wrap">
            <div className="donut-ring">
              <span>{topCategoryShare}%</span>
            </div>
            <ul className="legend-list">
              {(categories.length ? categories.slice(0, 3) : [{ _id: "Upload data", revenue: 0 }]).map((category, index) => (
                <li key={category._id}><span className={`dot ${["green", "blue", "gold"][index]}`} /> {category._id}: {formatCurrency(category.revenue)}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function PredictionsPage() {
  const [period, setPeriod] = useState("7d");
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const generate = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE_URL}/api/predictions/generate`, {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ forecastPeriod: period }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not generate predictions.");
        if (active) setPredictions(result.data || []);
      } catch (requestError) {
        console.error("Prediction request failed:", requestError);
        if (active) setError(requestError.message || "Unable to connect to the prediction service.");
      } finally {
        if (active) setLoading(false);
      }
    };
    generate();
    return () => { active = false; };
  }, [period]);

  return (
    <div className="page-stack">
      <section className="section-box">
        <div className="section-header compact">
          <div>
            <p className="eyebrow">Forecasting</p>
            <h2>Demand forecasts</h2>
          </div>
          <div className="chip-group">
            {[['7d', '7 Days'], ['15d', '15 Days'], ['30d', '30 Days']].map(([value, label]) => (
              <button type="button" className={`chip ${period === value ? 'active' : ''}`} key={value} onClick={() => setPeriod(value)}>{label}</button>
            ))}
          </div>
        </div>

        {loading && <p className="upload-working">Generating forecasts from your imported sales…</p>}
        {error && <div className="upload-message error" role="alert">{error}</div>}
        {!loading && !error && predictions.length === 0 && <div className="empty-state-card"><h3>No sales data available for prediction</h3><p>Upload and import sales records first. Predictions are generated from your sales history.</p></div>}
        {!loading && predictions.length > 0 && <div className="forecast-list">
          {predictions.map((item) => (
            <div key={`${item.productName}-${item.forecastPeriod}`} className="forecast-card">
              <div className="forecast-head">
                <div>
                  <strong>{item.productName}</strong>
                  <span>{item.forecastPeriod}</span>
                </div>
                <span className="confidence-tag">{Math.round(Number(item.confidence || 0) * 100)}% confidence</span>
              </div>
              <div className="forecast-metric">
                <b>{Number(item.predictedQuantity || 0).toLocaleString("en-IN")} units</b>
                <small>{item.notes || "Forecast based on imported sales history."}</small>
              </div>
            </div>
          ))}
        </div>}
      </section>
    </div>
  );
}

function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/api/recommendations`, { headers: getAuthHeaders() })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load recommendations.");
        if (active) setRecommendations(result.data || []);
      })
      .catch((requestError) => {
        console.error("Recommendation request failed:", requestError);
        if (active) setError(requestError.message || "Unable to load recommendations.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="page-stack">
      <section className="section-box">
        <div className="section-header compact">
          <div>
            <p className="eyebrow">AI suggestions</p>
            <h2>Business recommendations</h2>
          </div>
        </div>

        {loading && <p className="upload-working">Analyzing imported sales…</p>}
        {error && <div className="upload-message error" role="alert">{error}</div>}
        {!loading && !error && recommendations.length === 0 && <div className="empty-state-card"><h3>Upload sales data to generate recommendations</h3><p>Recommendations will use your imported products and revenue.</p></div>}
        {!loading && recommendations.length > 0 && <div className="recommendation-list">
          {recommendations.map((item) => (
            <article key={item.title} className="recommendation-item">
              <div className="recommendation-tag">{item.suggestedAction ? "Based on your sales" : item.tag}</div>
              <h3>{item.title}</h3>
              <p>{item.description || item.reason}</p>
              {item.suggestedAction && <p><strong>Suggested action:</strong> {item.suggestedAction}</p>}
            </article>
          ))}
        </div>}
      </section>
    </div>
  );
}

function ReportsPage() {
  return (
    <div className="page-stack">
      <section className="section-box">
        <div className="section-header compact">
          <div>
            <p className="eyebrow">Reports</p>
            <h2>Generate reports</h2>
          </div>
        </div>

        <div className="report-grid">
          {reportTemplates.map((report) => (
            <div key={report.name} className="report-card">
              <div className="report-type">{report.type}</div>
              <h3>{report.name}</h3>
              <p>{report.updated}</p>
              <button type="button" className="secondary-btn small">
                <Download size={16} />
                Download
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="page-stack">
      <section className="settings-card">
        <div className="section-header compact">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>Profile & account</h2>
          </div>
        </div>

        <div className="settings-grid">
          <div className="input-group">
            <label>First name</label>
            <input type="text" defaultValue="Shopkeeper" />
          </div>
          <div className="input-group">
            <label>Last name</label>
            <input type="text" defaultValue="User" />
          </div>
          <div className="input-group full-width">
            <label>Email</label>
            <input type="email" defaultValue="shopkeeper@datamind.ai" />
          </div>
          <div className="input-group">
            <label>Phone number</label>
            <input type="tel" defaultValue="+91 98765 43210" />
          </div>
          <div className="input-group">
            <label>Business name</label>
            <input type="text" defaultValue="Your Shop" />
          </div>
          <div className="input-group full-width">
            <label>Change password</label>
            <input type="password" placeholder="Enter new password" />
          </div>
        </div>

        <button type="button" className="primary-btn small">Save profile</button>
      </section>
    </div>
  );
}

export default DashboardPage;
