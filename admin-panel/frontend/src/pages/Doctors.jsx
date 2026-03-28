import { useEffect, useState, useCallback } from "react";
import api from "../api.js";

const BLANK = {
  name: "", email: "", specialization: "", experience: "",
  hospital: "", location: "", phone: "", image: "", description: "",
};

function Badge({ text, color }) {
  return (
    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: color + "18", color }}>
      {text}
    </span>
  );
}

function DoctorModal({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial ? {
    name: initial.name ?? "", email: initial.email ?? "",
    specialization: initial.specialization ?? "", experience: initial.experience ?? "",
    hospital: initial.hospital ?? "", location: initial.location ?? "",
    phone: initial.phone ?? "", image: initial.image ?? "", description: initial.description ?? "",
  } : { ...BLANK });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const FIELDS = [
    { key: "name",           label: "Full Name",       type: "text",   required: true  },
    { key: "email",          label: "Email",            type: "email",  required: true  },
    { key: "specialization", label: "Specialization",   type: "text",   required: true  },
    { key: "experience",     label: "Experience (yrs)", type: "number", required: false },
    { key: "hospital",       label: "Hospital",         type: "text",   required: false },
    { key: "location",       label: "Location",         type: "text",   required: false },
    { key: "phone",          label: "Phone",            type: "tel",    required: false },
    { key: "image",          label: "Photo URL",        type: "url",    required: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <h2 className="text-lg font-bold text-gray-900">{initial ? "Edit Doctor" : "Add Doctor"}</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-700 leading-none">&times;</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="px-6 py-5 grid grid-cols-2 gap-4">
          {FIELDS.map(({ key, label, type, required }) => (
            <div key={key}>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</label>
              <input
                type={type} value={form[key]} onChange={set(key)} required={required}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-200"
              />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Description</label>
            <textarea value={form.description} onChange={set("description")} rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-400 resize-none" />
          </div>
          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60">
              {saving ? "Saving…" : initial ? "Update" : "Add Doctor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-sm">
        <p className="text-sm font-semibold text-gray-800 mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel}  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function Doctors() {
  const [doctors,  setDoctors]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDoc,  setEditDoc]  = useState(null);
  const [confirm,  setConfirm]  = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [toasting, setToasting] = useState(null);

  const toast = (msg, type = "success") => {
    setToasting({ msg, type });
    setTimeout(() => setToasting(null), 3000);
  };

  const load = useCallback(() => {
    setLoading(true);
    api.get("/doctors").then((r) => setDoctors(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editDoc) {
        const res = await api.put(`/doctors/${editDoc._id}`, form);
        setDoctors((prev) => prev.map((d) => d._id === editDoc._id ? { ...d, ...res.data.doctor } : d));
        toast("Doctor updated");
      } else {
        const res = await api.post("/doctors", form);
        setDoctors((prev) => [...prev, { ...res.data.doctor, totalConnections: 0 }]);
        toast("Doctor added");
      }
      setShowForm(false); setEditDoc(null);
    } catch (err) {
      toast(err.response?.data?.message ?? "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (doc) => {
    try {
      const res = await api.patch(`/doctors/${doc._id}/toggle`);
      setDoctors((prev) => prev.map((d) => d._id === doc._id ? { ...d, isActive: res.data.isActive } : d));
      toast(res.data.message);
    } catch { toast("Failed to update status", "error"); }
  };

  const handleDelete = async (id) => {
    try {
      // admin-backend doesn't have DELETE /doctors yet — we'll call toggle to inactive instead
      // If you add DELETE route, change this line to: await api.delete(`/doctors/${id}`)
      toast("Delete not yet supported — deactivate instead", "error");
    } finally { setConfirm(null); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {toasting && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg border ${
          toasting.type === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"
        }`}>{toasting.msg}</div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Doctors</h1>
          <p className="text-sm text-gray-400 mt-1">{doctors.length} doctor{doctors.length !== 1 ? "s" : ""} total</p>
        </div>
        <button onClick={() => { setEditDoc(null); setShowForm(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-xl hover:bg-rose-600 transition-colors">
          <span className="text-lg leading-none">+</span> Add Doctor
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
          </div>
        ) : doctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <span className="text-4xl">🩺</span>
            <p className="text-sm text-gray-400">No doctors registered yet</p>
            <button onClick={() => setShowForm(true)} className="text-xs text-rose-500 font-semibold hover:underline mt-1">Add the first doctor →</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Doctor", "Email", "Specialization", "Connections", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => (
                <tr key={doc._id} className="border-b border-gray-50 hover:bg-rose-50/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {doc.image
                        ? <img src={doc.image} alt={doc.name} className="w-8 h-8 rounded-full object-cover border border-gray-100 shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-sm shrink-0">👨‍⚕️</div>
                      }
                      <div>
                        <p className="font-semibold text-gray-900">{doc.name}</p>
                        <p className="text-[11px] text-gray-400 truncate max-w-[120px]">{doc.hospital || doc.location || ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{doc.email}</td>
                  <td className="px-5 py-3.5 text-gray-700">{doc.specialization}</td>
                  <td className="px-5 py-3.5 text-center font-bold text-blue-600">{doc.totalConnections ?? 0}</td>
                  <td className="px-5 py-3.5">
                    <Badge text={doc.isActive ? "Active" : "Inactive"} color={doc.isActive ? "#059669" : "#9ca3af"} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditDoc(doc); setShowForm(true); }}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100">Edit</button>
                      <button onClick={() => handleToggle(doc)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                          doc.isActive ? "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600" : "bg-green-50 text-green-600 hover:bg-green-100"
                        }`}>
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

      {showForm && <DoctorModal initial={editDoc} onSave={handleSave} onClose={() => { setShowForm(false); setEditDoc(null); }} saving={saving} />}
      {confirm  && <ConfirmModal message="Delete this doctor?" onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
