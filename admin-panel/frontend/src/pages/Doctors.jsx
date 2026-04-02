import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api.js";
import Topbar from "../components/Topbar.jsx";

const PINK    = "#C57C8A";
const LIGHT   = "#fce7ea";
const CARD_BG = "rgba(255,255,255,0.85)";
const BORDER  = "rgba(252,228,233,0.8)";

const BLANK = { name:"", email:"", specialization:"", experience:"", hospital:"", location:"", phone:"", image:"", description:"" };
const SPECIALIZATIONS = ["Gynecologist","Endocrinologist","Dermatologist","Nutritionist","General Physician","Dietitian"];

function Toast({ msg, type }) {
  return (
    <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }}
      className="fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg"
      style={type === "error"
        ? { background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca" }
        : { background:"#f0fdf4", color:"#16a34a", border:"1px solid #bbf7d0" }}>
      {msg}
    </motion.div>
  );
}

function DoctorModal({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial ? { ...BLANK, ...Object.fromEntries(Object.keys(BLANK).map((k) => [k, initial[k] ?? ""])) } : { ...BLANK });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const FIELDS = [
    { key:"name",        label:"Full Name",       type:"text",   required:true  },
    { key:"email",       label:"Email",            type:"email",  required:true  },
    { key:"experience",  label:"Experience (yrs)", type:"number", required:false },
    { key:"hospital",    label:"Hospital",         type:"text",   required:false },
    { key:"location",    label:"Location",         type:"text",   required:false },
    { key:"phone",       label:"Phone",            type:"tel",    required:false },
    { key:"image",       label:"Photo URL",        type:"url",    required:false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.4)" }} onClick={onClose}>
      <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        style={{ border:`1px solid ${BORDER}` }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-between rounded-t-3xl z-10" style={{ borderBottom:`1px solid ${BORDER}` }}>
          <h2 className="text-lg font-bold text-gray-900">{initial ? "Edit Doctor" : "Add Doctor"}</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-700 leading-none">&times;</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="px-6 py-5 grid grid-cols-2 gap-4">
          {FIELDS.map(({ key, label, type, required }) => (
            <div key={key}>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color:"#c4a0a8" }}>{label}</label>
              <input type={type} value={form[key]} onChange={set(key)} required={required}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ border:`1px solid ${BORDER}`, background:"#fff9fb" }}
                onFocus={(e)=>e.target.style.borderColor=PINK}
                onBlur={(e)=>e.target.style.borderColor=BORDER} />
            </div>
          ))}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color:"#c4a0a8" }}>Specialization *</label>
            <select value={form.specialization} onChange={set("specialization")} required
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-white"
              style={{ border:`1px solid ${BORDER}` }}>
              <option value="">Select…</option>
              {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color:"#c4a0a8" }}>Description</label>
            <textarea value={form.description} onChange={set("description")} rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ border:`1px solid ${BORDER}`, background:"#fff9fb" }} />
          </div>
          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ background:"linear-gradient(135deg, #C57C8A, #e8a0ae)" }}>
              {saving ? "Saving…" : initial ? "Update" : "Add Doctor"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(0,0,0,0.35)" }}>
      <motion.div initial={{ scale:0.92, opacity:0 }} animate={{ scale:1, opacity:1 }}
        className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-sm" style={{ border:`1px solid ${BORDER}` }}>
        <p className="text-sm font-semibold text-gray-800 mb-6">Permanently delete this doctor?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500">Delete</button>
        </div>
      </motion.div>
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
  const [toast,    setToast]    = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

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
        showToast("Doctor updated");
      } else {
        const res = await api.post("/doctors", form);
        setDoctors((prev) => [...prev, { ...res.data.doctor, totalConnections: 0 }]);
        showToast("Doctor added");
      }
      setShowForm(false); setEditDoc(null);
    } catch (err) {
      showToast(err.response?.data?.message ?? "Save failed", "error");
    } finally { setSaving(false); }
  };

  const handleToggle = async (doc) => {
    try {
      const res = await api.patch(`/doctors/${doc._id}/toggle`);
      setDoctors((prev) => prev.map((d) => d._id === doc._id ? { ...d, isActive: res.data.isActive } : d));
      showToast(res.data.message);
    } catch { showToast("Failed to update status", "error"); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/doctors/${id}`);
      setDoctors((prev) => prev.filter((d) => d._id !== id));
      showToast("Doctor deleted");
    } catch (err) {
      showToast(err.response?.data?.message ?? "Delete failed", "error");
    } finally { setConfirm(null); }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Topbar title="Doctors" subtitle={`${doctors.length} doctors in database`} />
      <AnimatePresence>{toast && <Toast msg={toast.msg} type={toast.type} />}</AnimatePresence>

      <div className="p-8 max-w-[1400px] mx-auto w-full">
        <div className="flex justify-end mb-6">
          <button onClick={() => { setEditDoc(null); setShowForm(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all hover:scale-105"
            style={{ background:"linear-gradient(135deg, #C57C8A, #e8a0ae)", boxShadow:"0 4px 16px rgba(197,124,138,0.35)" }}>
            <span className="text-lg leading-none">+</span> Add Doctor
          </button>
        </div>

        <div style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:20, boxShadow:"0 4px 24px rgba(197,124,138,0.08)" }} className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor:LIGHT, borderTopColor:PINK }} />
            </div>
          ) : doctors.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <span className="text-5xl">🩺</span>
              <p className="text-sm font-medium text-gray-400">No doctors registered yet</p>
              <button onClick={() => setShowForm(true)} className="text-xs font-semibold hover:underline" style={{ color:PINK }}>Add the first doctor →</button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom:`1px solid ${BORDER}`, background:"rgba(252,228,233,0.25)" }}>
                  {["Doctor","Email","Specialization","Connections","Status","Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color:"#c4a0a8" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {doctors.map((doc, i) => (
                  <motion.tr key={doc._id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.03 }}
                    style={{ borderBottom:`1px solid rgba(252,228,233,0.4)` }} className="hover:bg-pink-50/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {doc.image ? (
                          <img src={doc.image} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ background:"linear-gradient(135deg, #C57C8A, #e8a0ae)" }}>
                            {doc.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{doc.name}</p>
                          {doc.hospital && <p className="text-[11px]" style={{ color:"#c4a0a8" }}>{doc.hospital}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{doc.email}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background:LIGHT, color:PINK }}>
                        {doc.specialization ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold" style={{ color:"#f59e0b" }}>{doc.totalConnections ?? 0}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase"
                        style={doc.isActive ? { background:"#f0fdf4", color:"#16a34a" } : { background:"#f9fafb", color:"#9ca3af" }}>
                        {doc.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggle(doc)}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                          style={doc.isActive ? { background:"#fff7ed", color:"#ea580c" } : { background:"#f0fdf4", color:"#16a34a" }}>
                          {doc.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => { setEditDoc(doc); setShowForm(true); }}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                          style={{ background:LIGHT, color:PINK }}>Edit</button>
                        <button onClick={() => setConfirm(doc._id)}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                          style={{ background:"#fef2f2", color:"#dc2626" }}>Delete</button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && <DoctorModal initial={editDoc} onSave={handleSave} onClose={() => { setShowForm(false); setEditDoc(null); }} saving={saving} />}
      {confirm && <ConfirmModal onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
