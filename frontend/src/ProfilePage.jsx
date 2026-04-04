import { useState, useEffect } from "react";
import { updateUserProfile, getUserProfile } from "./firestore-service.js";
import { updateProfile } from "./firebase-config.js";
import { auth } from "./firebase-config.js";

// Design tokens (from App.jsx)
const C = {
  blue:      "#2563EB",
  blueDark:  "#1E3A8A",
  blueDeep:  "#1e40af",
  blueSide:  "#1D3461",
  blueLight: "#EFF6FF",
  blueHover: "#DBEAFE",
  accent:    "#3B82F6",
  white:     "#FFFFFF",
  bg:        "#E8EEFF",
  card:      "#FFFFFF",
  border:    "#E2E8F0",
  text:      "#1E293B",
  muted:     "#64748B",
  light:     "#F1F5F9",
  green:     "#16A34A",
  red:       "#DC2626",
};

function Spinner({ size = 18, color = C.blue }) {
  return (
    <span style={{ display:"inline-block", width:size, height:size,
      border:`2px solid ${color}33`, borderTopColor:color,
      borderRadius:"50%", animation:"spin .7s linear infinite" }} />
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background:C.card, borderRadius:14,
      border:`1px solid ${C.border}`, padding:"18px 20px",
      boxShadow:"0 1px 8px rgba(37,99,235,.07)", ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 style={{ fontSize:18, fontWeight:700, color:C.text, margin:"0 0 16px",
    fontFamily:"'Georgia',serif" }}>{children}</h2>;
}

export default function ProfilePage({ user, onProfileUpdate }) {
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: "",
    location: "",
    caseType: "",
    language: "en",
    notifications: true,
  });

  useEffect(() => {
    loadProfile();
  }, [user?.uid]);

  async function loadProfile() {
    if (!user?.uid) return;
    setLoading(true);
    const result = await getUserProfile(user.uid);
    if (result.success) {
      setProfile(result.data);
      setFormData({
        name: result.data.name || "",
        phone: result.data.phone || "",
        location: result.data.location || "",
        caseType: result.data.caseType || "",
        language: result.data.settings?.language || "en",
        notifications: result.data.settings?.notifications ?? true,
      });
    }
    setLoading(false);
  }

  async function handleSaveProfile() {
    setLoading(true);
    setMessage("");

    try {
      // Update Firebase Auth profile
      if (formData.name !== user.name) {
        await updateProfile(auth.currentUser, { displayName: formData.name });
      }

      // Update Firestore
      await updateUserProfile(user.uid, {
        name: formData.name,
        phone: formData.phone,
        location: formData.location,
        caseType: formData.caseType,
        settings: {
          language: formData.language,
          notifications: formData.notifications,
          theme: profile?.settings?.theme || "light",
        },
      });

      setProfile({ ...profile, ...formData });
      setEditing(false);
      setMessage("Profile updated successfully!");
      onProfileUpdate?.({ ...profile, ...formData });

      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
    setLoading(false);
  }

  const inp = { width:"100%", border:`1.5px solid ${C.border}`, borderRadius:10,
    padding:"12px 14px", fontSize:14, fontFamily:"inherit", outline:"none",
    boxSizing:"border-box", background:"#fff", color:C.text };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
      {/* Left: Profile Info */}
      <Card>
        <SectionTitle>My Profile</SectionTitle>

        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:24 }}>
          <div style={{ width:80, height:80, borderRadius:"50%", background:C.blue,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:32, fontWeight:700, color:"#fff" }}>
            {(formData.name || user?.name || "U")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:20, fontWeight:700, color:C.text }}>{formData.name || user?.name}</div>
            <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>{user?.email}</div>
            <div style={{ fontSize:12, color:C.green, marginTop:2 }}>● Online</div>
          </div>
        </div>

        {message && (
          <div style={{ background: message.includes("Error") ? "#FEE2E2" : "#DCFCE7",
            color: message.includes("Error") ? C.red : C.green,
            padding:"12px 14px", borderRadius:8, marginBottom:16, fontSize:13 }}>
            {message}
          </div>
        )}

        {!editing ? (
          <div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:600, color:C.muted, display:"block", marginBottom:4 }}>Email Address</label>
              <div style={{ fontSize:14, color:C.text, padding:"10px 0" }}>{user?.email}</div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:600, color:C.muted, display:"block", marginBottom:4 }}>Full Name</label>
              <div style={{ fontSize:14, color:C.text, padding:"10px 0" }}>{formData.name || "—"}</div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:600, color:C.muted, display:"block", marginBottom:4 }}>Phone</label>
              <div style={{ fontSize:14, color:C.text, padding:"10px 0" }}>{formData.phone || "—"}</div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:600, color:C.muted, display:"block", marginBottom:4 }}>Location</label>
              <div style={{ fontSize:14, color:C.text, padding:"10px 0" }}>{formData.location || "—"}</div>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.muted, display:"block", marginBottom:4 }}>Primary Case Type</label>
              <div style={{ fontSize:14, color:C.text, padding:"10px 0" }}>{formData.caseType || "—"}</div>
            </div>
            <button onClick={() => setEditing(true)}
              style={{ width:"100%", background:C.blue, color:"#fff",
                border:"none", borderRadius:10, padding:"12px", fontWeight:700,
                fontSize:14, cursor:"pointer", marginTop:20, fontFamily:"inherit" }}>
              ✏ Edit Profile
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, color:C.text, display:"block", marginBottom:6 }}>Full Name</label>
              <input style={inp} value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})}
                placeholder="Your full name"/>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, color:C.text, display:"block", marginBottom:6 }}>Phone Number</label>
              <input style={inp} value={formData.phone} onChange={e=>setFormData({...formData, phone:e.target.value})}
                placeholder="+91 XXXXX XXXXX"/>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, color:C.text, display:"block", marginBottom:6 }}>Location</label>
              <input style={inp} value={formData.location} onChange={e=>setFormData({...formData, location:e.target.value})}
                placeholder="City, State"/>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:600, color:C.text, display:"block", marginBottom:6 }}>Primary Case Type</label>
              <select style={{...inp, fontFamily:"inherit"}} value={formData.caseType}
                onChange={e=>setFormData({...formData, caseType:e.target.value})}>
                <option value="">Select a case type</option>
                <option value="Land/Property">Land/Property Dispute</option>
                <option value="Employment">Employment Issue</option>
                <option value="Family">Family/Matrimonial</option>
                <option value="Consumer">Consumer Complaint</option>
                <option value="Criminal">Criminal Matter</option>
                <option value="Scheme">Government Scheme Denial</option>
              </select>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={handleSaveProfile} disabled={loading}
                style={{ flex:1, background:C.green, color:"#fff", border:"none",
                  borderRadius:10, padding:"12px", fontWeight:700, fontSize:14,
                  cursor:"pointer", fontFamily:"inherit", opacity:loading?0.7:1 }}>
                {loading ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><Spinner size={14} color="#fff"/> Saving…</span> : "✓ Save"}
              </button>
              <button onClick={() => setEditing(false)} disabled={loading}
                style={{ flex:1, background:C.border, color:C.text, border:"none",
                  borderRadius:10, padding:"12px", fontWeight:700, fontSize:14,
                  cursor:"pointer", fontFamily:"inherit" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Right: Settings */}
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <Card>
          <SectionTitle>Preferences</SectionTitle>

          <div style={{ marginBottom:18 }}>
            <label style={{ fontSize:13, fontWeight:600, color:C.text, display:"block", marginBottom:6 }}>Language</label>
            <select style={{...inp, fontFamily:"inherit"}} value={formData.language}
              onChange={e=>setFormData({...formData, language:e.target.value})}>
              <option value="en">English</option>
              <option value="ta">Tamil (தமிழ்)</option>
              <option value="hi">Hindi (हिंदी)</option>
              <option value="ml">Malayalam (മലയാളം)</option>
              <option value="te">Telugu (తెలుగు)</option>
            </select>
          </div>

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"12px 14px", background:C.light, borderRadius:10, marginBottom:18 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:C.text }}>Notifications</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>Get updates on your queries</div>
            </div>
            <button onClick={() => setFormData({...formData, notifications:!formData.notifications})}
              style={{ background: formData.notifications ? C.green : C.border, color:"#fff",
                border:"none", borderRadius:20, padding:"6px 14px", fontSize:12,
                fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              {formData.notifications ? "On" : "Off"}
            </button>
          </div>

          <button onClick={handleSaveProfile} disabled={loading}
            style={{ width:"100%", background:C.blue, color:"#fff", border:"none",
              borderRadius:10, padding:"12px", fontWeight:700, fontSize:14,
              cursor:"pointer", fontFamily:"inherit", opacity:loading?0.7:1 }}>
            {loading ? "Saving..." : "💾 Save Settings"}
          </button>
        </Card>

        <Card>
          <SectionTitle>About</SectionTitle>
          <div style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>
            <div style={{ marginBottom:12 }}>
              <strong>Legal Brdige</strong> is your AI-powered legal companion for rural Indian citizens.
            </div>
            <div style={{ marginBottom:12 }}>
              <strong>Version:</strong> 1.0.0
            </div>
            <div style={{ marginBottom:12 }}>
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </div>
            <div>
              <a href="#" style={{ color:C.blue, textDecoration:"none" }}>Privacy Policy</a> • 
              <a href="#" style={{ color:C.blue, textDecoration:"none", marginLeft:8 }}>Terms of Service</a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
