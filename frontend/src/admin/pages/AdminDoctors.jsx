import { useEffect, useState, useCallback } from "react";
import adminApi from "../../utils/adminApi";

const BLANK_FORM = {
  name: "", email: "", specialization: "", experience: "",
  hospital: "", location: "", image: "", description: "", phone: "",
};

const RISK_COLORS = { high: "#ef4444", medium: "#f59e0b", low: "#059669" };
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function Badge({ text, color }) {
  return (
    <span
      className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
      style={{ background: color + "18", color }}
    >
      {text}
    </span>
  );
}

/* ── Doctor Detail Modal ─────────────────────────────────────────────── */
function DoctorDetailModal({ doctorId, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get(`/doctors/${doctorId}`)
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [doctorId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-md overflow-y-auto shadow-2xl"
        style={{ background: "var(--card-bg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 px-6 py-4 flex items-center justify-between z-10"
          style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}
        >
          <h2 className="text-lg font-bold" style={{ color: "var(--text-main)" }}>Doctor Details</h2>
          <button onClick={onClose} className="text-2xl leading-none hover:opacity-60" style={{ color: "var(--text-muted)" }}>&times;</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-7 h-7 border-4 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <p className="p-8 text-sm text-gray-400">Failed to load doctor</p>
        ) : (
          <div className="px-6 py-5 flex flex-col gap-7">
            {/* Profile header */}
            <section className="flex items-start gap-4">
              {data.image ? (
                <img src={data.image} alt={data.name} className="w-16 h-16 rounded-2xl object-cover border border-gray-100" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-2xl">👨‍⚕️</div>
              )}
              <div>
                <h3 className="font-bold text-base" style={{ color: "var(--text-main)" }}>{data.name}</h3>
                <p className="text-sm font-medium" style={{ color: "var(--primary)" }}>{data.specialization}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{data.hospital}</p>
                <div className="mt-1.5">
                  <Badge text={data.isActive ? "Active" : "Inactive"} color={data.isActive ? "#059669" : "#9ca3af"} />
                </div>
              </div>
            </section>

            {/* Info grid */}
            <section>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Info</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Email",       data.email],
                  ["Phone",       data.phone || "—"],
                  ["Experience",  data.experience ? `${data.experience} yrs` : "—"],
                  ["Location",    data.location || "—"],
                  ["Total Users", data.totalConnections],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl px-3 py-2.5" style={{ background: "var(--bg-main)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{k}</p>
                    <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: "var(--text-main)" }}>{v}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Description */}
            {data.description && (
              <section>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>About</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{data.description}</p>
              </section>
            )}

            {/* Recent connections */}
            <section>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                Recent Connections ({data.recentConnections?.length ?? 0})
              </p>
              {(!data.recentConnections || data.recentConnections.length === 0) ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No connections yet</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.recentConnections.map((c) => (
                    <div key={c._id} className="px-4 py-3 rounded-xl" style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>{c.userId?.name ?? "—"}</p>
                        <Badge
                          text={c.status}
                          color={c.status === "connected" ? "#059669" : c.status === "emailed" ? "#3b82f6" : "#9ca3af"}
                        />
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {c.userId?.email} · {fmt(c.connectedAt)}
                        {c.reportId?.risk_level && (
                          <span
                            className="ml-2 font-semibold"
                            style={{ color: RISK_COLORS[c.reportId.risk_level.toLowerCase()] ?? "#64748b" }}
                          >
                            {c.reportId.risk_level} risk
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Add / Edit Doctor Form Modal ────────────────────────────────────── */
function DoctorForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial ? {
    name:           initial.name           ?? "",
    email:          initial.email          ?? "",
    specialization: initial.specialization ?? "",
    experience:     initial.experience     ?? "",
    hospital:       initial.hospital       ?? "",
    location:       initial.location       ?? "",
    image:          initial.image          ?? "",
    description:    initial.description    ?? "",
    phone:          initial.phone          ?? "",
  } : { ...BLANK_FORM });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const FIELDS = [
    { key: "name",           label: "Full Name",       type: "text",   required: true },
    { key: "email",          label: "Email",            type: "email",  required: true },
    { key: "specialization", label: "Specialization",   type: "text",   required: true },
    { key: "experience",     label: "Experience (yrs)", type: "number", required: false },
    { key: "hospital",       label: "Hospital",         type: "text",   required: false },
    { key: "location",       label: "Location",         type: "text",   required: false },
    { key: "phone",          label: "Phone",            type: "tel",    required: false },
    { key: "image",          label: "Photo URL",        type: "url",    required: false },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--card-bg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 px-6 py-4 flex items-center justify-between z-10 rounded-t-3xl"
          style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}
        >
          <h2 className="text-lg font-bold" style={{ color: "var(--text-main)" }}>{initial ? "Edit Doctor" : "Add Doctor"}</h2>
          <button onClick={onClose} className="text-2xl leading-none hover:opacity-60" style={{ color: "var(--text-muted)" }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 grid grid-cols-2 gap-4">
          {FIELDS.map(({ key, label, type, required }) => (
            <div key={key}>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={set(key)}
                required={required}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)", color: "var(--text-main)" }}
              />
            </div>
          ))}

          {/* Description — full width */}
          <div className="col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Description</label>
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
              style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)", color: "var(--text-main)" }}
            />
          </div>

          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: "var(--bg-main)", color: "var(--text-muted)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : initial ? "Update Doctor" : "Add Doctor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────── */
export default function AdminDoctors() {
  const [doctors,  setDoctors]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDoc,  setEditDoc]  = useState(null);   // null = add mode
  const [viewId,   setViewId]   = useState(null);   // doctorId for detail panel
  const [saving,   setSaving]   = useState(false);
  const [toasting, setToasting] = useState(null);

  const toast = (message, type = "success") => {
    setToasting({ message, type });
    setTimeout(() => setToasting(null), 3000);
  };

  const loadDoctors = useCallback(() => {
    setLoading(true);
    adminApi.get("/doctors")
      .then((r) => setDoctors(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadDoctors(); }, [loadDoctors]);

  const openAdd  = () => { setEditDoc(null); setShowForm(true); };
  const openEdit = (doc) => { setEditDoc(doc); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditDoc(null); };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editDoc) {
        const res = await adminApi.put(`/doctors/${editDoc._id}`, form);
        setDoctors((prev) =>
          prev.map((d) => d._id === editDoc._id ? { ...d, ...res.data.doctor } : d)
        );
        toast("Doctor updated successfully");
      } else {
        const res = await adminApi.post("/doctors", form);
        setDoctors((prev) => [...prev, { ...res.data.doctor, totalConnections: 0 }]);
        toast("Doctor added successfully");
      }
      closeForm();
    } catch (err) {
      toast(err.response?.data?.message ?? "Failed to save doctor", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (doc) => {
    try {
      const res = await adminApi.patch(`/doctors/${doc._id}/status`);
      setDoctors((prev) =>
        prev.map((d) => d._id === doc._id ? { ...d, isActive: res.data.isActive } : d)
      );
      toast(res.data.message);
    } catch {
      toast("Failed to update status", "error");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Toast notification */}
      {toasting && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg border ${
            toasting.type === "error"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-green-50 text-green-700 border-green-200"
          }`}
        >
          {toasting.message}
        </div>
      )}

      {/* Page header */}
      <div
        className="mb-8 rounded-2xl px-7 py-5"
        style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, transparent) 0%, color-mix(in srgb, var(--primary) 6%, transparent) 100%)", border: "1px solid var(--border-color)" }}
      >
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "var(--accent)" }}>Doctor Management</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Add, edit and manage all registered doctors</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-xl hover:bg-rose-600 transition-colors shadow-sm"
        >
          <span className="text-lg leading-none">+</span> Add Doctor
        </button>
      </div>

      {/* Summary bar */}
      {!loading && doctors.length > 0 && (
        <div className="flex gap-4 mb-6">
          {[
            { label: "Total",    value: doctors.length,                              color: "var(--primary)" },
            { label: "Active",   value: doctors.filter((d) => d.isActive).length,    color: "#059669" },
            { label: "Inactive", value: doctors.filter((d) => !d.isActive).length,   color: "var(--text-muted)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl px-4 py-2.5 flex items-center gap-2" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <span className="text-xl font-extrabold" style={{ color }}>{value}</span>
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Doctors table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
          </div>
        ) : doctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <span className="text-4xl">🩺</span>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No doctors registered yet</p>
            <button
              onClick={openAdd}
              className="text-xs text-rose-500 font-semibold mt-1 hover:underline"
            >
              Add the first doctor →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", background: "var(--bg-main)" }}>
                {["Doctor", "Email", "Specialization", "Users Connected", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => (
                <tr key={doc._id} className="hover:bg-rose-50/30 transition-colors" style={{ borderBottom: "1px solid var(--border-color)" }}>
                  {/* Doctor name + avatar */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {doc.image ? (
                        <img
                          src={doc.image}
                          alt={doc.name}
                          className="w-8 h-8 rounded-full object-cover border border-gray-100 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-sm shrink-0">
                          👨‍⚕️
                        </div>
                      )}
                      <div>
                        <p className="font-semibold" style={{ color: "var(--text-main)" }}>{doc.name}</p>
                        <p className="text-[11px] truncate max-w-[140px]" style={{ color: "var(--text-muted)" }}>
                          {doc.hospital || doc.location || ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5" style={{ color: "var(--text-muted)" }}>{doc.email}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--text-main)" }}>{doc.specialization}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="font-bold text-blue-600">{doc.totalConnections ?? 0}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge
                      text={doc.isActive ? "Active" : "Inactive"}
                      color={doc.isActive ? "#059669" : "#9ca3af"}
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewId(doc._id)}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openEdit(doc)}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(doc)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                          doc.isActive
                            ? "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600"
                            : "bg-green-50 text-green-600 hover:bg-green-100"
                        }`}
                      >
                        {doc.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>{doctors.length} doctor{doctors.length !== 1 ? "s" : ""} total</p>

      {/* Modals */}
      {showForm && (
        <DoctorForm
          initial={editDoc}
          onSave={handleSave}
          onClose={closeForm}
          saving={saving}
        />
      )}
      {viewId && <DoctorDetailModal doctorId={viewId} onClose={() => setViewId(null)} />}
    </div>
  );
}
