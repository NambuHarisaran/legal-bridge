import { useState, useRef, useEffect } from "react";
import { loginWithEmail, registerWithEmail, loginWithGoogle, completeGoogleRedirectLogin, logout } from "./auth-service.js";
import { createUserProfile } from "./firestore-service.js";
import ProfilePage from "./ProfilePage.jsx";

/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS — matching the blue mockup exactly
═══════════════════════════════════════════════════════ */
const C = {
  blue:      "#2563EB",
  blueDark:  "#1E3A8A",
  blueDeep:  "#1e40af",
  blueSide:  "#1D3461",  // sidebar dark navy
  blueLight: "#EFF6FF",
  blueHover: "#DBEAFE",
  accent:    "#3B82F6",
  white:     "#FFFFFF",
  bg:        "#E8EEFF",  // lavender-blue page bg
  card:      "#FFFFFF",
  border:    "#E2E8F0",
  text:      "#1E293B",
  muted:     "#64748B",
  light:     "#F1F5F9",
  green:     "#16A34A",
  red:       "#DC2626",
  amber:     "#D97706",
  riskLow:   "#22C55E",
  riskMed:   "#F59E0B",
  riskHigh:  "#EF4444",
};

/* ═══════════════════════════════════════════════════════
   SIDEBAR NAV ITEMS  (matching mockup)
═══════════════════════════════════════════════════════ */
const NAV = [
  { id: "home",       icon: "⊞",  label: "Home" },
  { id: "chatbot",    icon: "💬", label: "Ask Legal Question" },
  { id: "schemes",    icon: "🏛",  label: "Govt. Schemes" },
  { id: "document",   icon: "📄", label: "Document Analyser" },
  { id: "fir",        icon: "📋", label: "FIR Guidance" },
  { id: "history",    icon: "🕘", label: "My Queries History" },
  { id: "profile",    icon: "👤", label: "My Profile" },
  { id: "admin",      icon: "⚙",  label: "Admin Panel" },
];

const SCHEMES = [
  { icon: "🌾", name: "PM Kisan Samman Nidhi Yojana",              desc: "₹6,000/year direct income support for small and marginal farmers." },
  { icon: "🌿", name: "Pradhan Mantri Fasal Bima Yojana",          desc: "Crop insurance scheme providing financial support to farmers for crop loss." },
  { icon: "🏗",  name: "Mahatma Gandhi National Rural Employment Guarantee Scheme", desc: "Guarantees 100 days of wage employment per year to rural households." },
  { icon: "🏠", name: "PM Awas Yojana (Gramin)",                   desc: "Housing for all — financial aid to build pucca houses for BPL families." },
  { icon: "💊", name: "Ayushman Bharat – PM Jan Arogya Yojana",    desc: "Health coverage up to ₹5 lakh/year for eligible families." },
];

const FIR_STEPS = [
  { icon: "🔍", title: "Identify Issue",       desc: "Recognise and document the issue clearly with dates, witnesses, and evidence." },
  { icon: "📝", title: "Prepare Complaint",    desc: "Prepare the written complaint, including full summary of the cause." },
  { icon: "📁", title: "File FIR",             desc: "Visit the local police station and file the FIR. You have a right to a free copy." },
  { icon: "📡", title: "Track Complaint",      desc: "Track your complaint status using the FIR number at the station or online portal." },
];

const AWARENESS = [
  { tag: "Rights",   color: C.green,  title: "Right to Free Legal Aid",       body: "Every Indian citizen unable to afford a lawyer has the right to free legal services under the Legal Services Authorities Act, 1987. Contact your nearest DLSA." },
  { tag: "Land",     color: C.blue,   title: "Land Dispute Resolution",        body: "Land disputes can be filed at Revenue Court (Tehsil), Civil Court, or Lok Adalat. Always keep Khasra/Khatauni records ready." },
  { tag: "Scheme",   color: C.amber,  title: "PM Awas Yojana – Housing",       body: "Eligible beneficiaries (no pucca house) can apply for ₹1.2–2.5 lakh housing aid through Gram Panchayat. Docs: Aadhaar, bank account, income cert." },
  { tag: "RTI",      color: C.blue,   title: "Right to Information Act",       body: "Any citizen can request government information within 30 days. File online at rtionline.gov.in or at the PIO of any department." },
  { tag: "Safety",   color: C.red,    title: "Domestic Violence Protection",   body: "Under PWDV Act 2005, file with Protection Officer, Police, or Magistrate. Emergency helpline: 181." },
  { tag: "Consumer", color: "#7C3AED",title: "Consumer Rights & Complaints",   body: "File at consumerhelpline.gov.in or District Consumer Forum. No lawyer required for claims below ₹5 lakh." },
];

const RISK_QUESTIONS = [
  { id: "issue",    label: "What is your main legal issue?",           options: ["Land/Property dispute","Employment problem","Family/Matrimonial","Consumer complaint","Criminal matter","Scheme denial"] },
  { id: "docs",     label: "Do you have relevant documents?",          options: ["Yes, all documents","Some documents","Very few","No documents"] },
  { id: "duration", label: "How long has this issue been ongoing?",    options: ["< 1 month","1–6 months","6 mo – 2 years","> 2 years"] },
  { id: "opponent", label: "Who is the opposing party?",               options: ["Individual","Company","Government dept","Multiple parties"] },
  { id: "action",   label: "Have you taken any legal action so far?",  options: ["Legal notice sent","Filed a complaint","No action yet","Tried informally"] },
];

/* ═══════════════════════════════════════════════════════
   TINY HELPERS
═══════════════════════════════════════════════════════ */
const css = (obj) => obj;

function Spinner({ size = 18, color = C.blue }) {
  return (
    <span style={{ display:"inline-block", width:size, height:size,
      border:`2px solid ${color}33`, borderTopColor:color,
      borderRadius:"50%", animation:"spin .7s linear infinite" }} />
  );
}

function Badge({ children, color = C.blue }) {
  return (
    <span style={{ background:`${color}18`, color, fontSize:11, fontWeight:700,
      padding:"2px 9px", borderRadius:20, border:`1px solid ${color}33`, letterSpacing:.3 }}>
      {children}
    </span>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{ background:C.card, borderRadius:14,
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

/* ═══════════════════════════════════════════════════════
   RISK GAUGE  (semi-circle, matches mockup)
═══════════════════════════════════════════════════════ */
function RiskGauge({ score = 50 }) {
  const pct = Math.min(100, Math.max(0, score));
  // needle angle: 0 → -90deg (left), 100 → 90deg (right)
  const angle = -90 + pct * 1.8;
  const riskLabel = pct < 34 ? "Low Risk" : pct < 67 ? "Medium Risk" : "High Risk";
  const riskColor = pct < 34 ? C.riskLow : pct < 67 ? C.riskMed : C.riskHigh;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <svg width="160" height="90" viewBox="0 0 160 90">
        <defs>
          <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#22C55E"/>
            <stop offset="50%"  stopColor="#F59E0B"/>
            <stop offset="100%" stopColor="#EF4444"/>
          </linearGradient>
        </defs>
        {/* Track */}
        <path d="M 16 82 A 64 64 0 0 1 144 82" fill="none" stroke="#E2E8F0" strokeWidth="14" strokeLinecap="round"/>
        {/* Colored arc */}
        <path d="M 16 82 A 64 64 0 0 1 144 82" fill="none" stroke="url(#gauge-grad)" strokeWidth="14" strokeLinecap="round"/>
        {/* Needle */}
        <g transform={`rotate(${angle}, 80, 82)`}>
          <line x1="80" y1="82" x2="80" y2="26" stroke={C.blueSide} strokeWidth="3" strokeLinecap="round"/>
          <circle cx="80" cy="82" r="5" fill={C.blueSide}/>
        </g>
        {/* Labels */}
        <text x="12" y="90" fontSize="9" fill={C.muted} textAnchor="middle">0</text>
        <text x="80" y="18" fontSize="9" fill={C.muted} textAnchor="middle">50</text>
        <text x="148" y="90" fontSize="9" fill={C.muted} textAnchor="middle">100</text>
      </svg>
      <span style={{ fontSize:16, fontWeight:700, color:riskColor }}>{riskLabel}</span>
      <span style={{ fontSize:12, color:C.muted }}>Score: {score}/100</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LOGIN PAGE
═══════════════════════════════════════════════════════ */
function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function handleRedirectResult() {
      const result = await completeGoogleRedirectLogin();
      if (!active || !result.success) return;

      const profileResult = await createUserProfile(result.uid, result.email, result.name, result.photoURL || null);
      if (!profileResult.success) {
        setErr(profileResult.error || "Failed to initialize profile. Check Firestore rules.");
        setLoading(false);
        return;
      }

      onLogin(result);
    }

    handleRedirectResult();
    return () => { active = false; };
  }, [onLogin]);

  async function submit() {
    if (!email || !pass || (mode==="register" && !name)) { 
      setErr("Please fill all fields"); 
      return; 
    }
    if (pass.length < 6) { 
      setErr("Password must be 6+ characters"); 
      return; 
    }
    
    setLoading(true);
    setErr("");
    
    let result;
    if (mode === "register") {
      result = await registerWithEmail(email, pass, name);
    } else {
      result = await loginWithEmail(email, pass);
    }
    
    if (result.success) {
      // Create Firestore profile
      const profileResult = await createUserProfile(result.uid, result.email, result.name, result.photoURL || null);
      if (!profileResult.success) {
        setErr(profileResult.error || "Failed to initialize profile. Check Firestore rules.");
        setLoading(false);
        return;
      }
      onLogin(result);
    } else {
      setErr(result.error || "Authentication failed");
    }
    
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setErr("");
    const result = await loginWithGoogle();
    if (result.success) {
      // Create Firestore profile
      const profileResult = await createUserProfile(result.uid, result.email, result.name, result.photoURL || null);
      if (!profileResult.success) {
        setErr(profileResult.error || "Failed to initialize profile. Check Firestore rules.");
        setLoading(false);
        return;
      }
      onLogin(result);
    } else if (result.pendingRedirect) {
      setErr("Opening Google Sign-In redirect...");
    } else {
      setErr(result.error || "Google Sign-In failed");
    }
    setLoading(false);
  }

  const inp = { width:"100%", border:`1.5px solid ${C.border}`, borderRadius:10,
    padding:"12px 14px", fontSize:14, fontFamily:"inherit", outline:"none",
    boxSizing:"border-box", background:"#fff", color:C.text };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex",
      alignItems:"center", justifyContent:"center", padding:20 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus{border-color:${C.blue}!important;outline:none;}`}</style>

      <div style={{ display:"flex", gap:0, width:"100%", maxWidth:860,
        borderRadius:20, overflow:"hidden", boxShadow:"0 24px 64px rgba(30,58,138,.22)" }}>

        {/* Left blue panel */}
        <div style={{ flex:1, background:`linear-gradient(145deg, ${C.blueSide} 0%, ${C.blue} 100%)`,
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          padding:"48px 36px", color:"#fff" }}>
          <div style={{ fontSize:52, marginBottom:16 }}>⚖️</div>
          <h1 style={{ fontSize:28, fontWeight:800, textAlign:"center", margin:"0 0 12px",
            fontFamily:"'Georgia',serif", lineHeight:1.25 }}>
            Intelligent<br/>Legal Companion
          </h1>
          <p style={{ fontSize:14, opacity:.8, textAlign:"center", lineHeight:1.7, maxWidth:220 }}>
            AI-powered legal assistance for rural citizens — available 24/7 in simple language.
          </p>
        </div>

        {/* Right form */}
        <div style={{ flex:1, background:"#fff", padding:"48px 40px", display:"flex",
          flexDirection:"column", justifyContent:"center" }}>
          <h2 style={{ fontSize:24, fontWeight:700, color:C.text, margin:"0 0 8px" }}>
            {mode === "login" ? "Login" : "Create Account"}
          </h2>
          <p style={{ fontSize:13, color:C.muted, margin:"0 0 24px" }}>
            {mode === "login" ? "Welcome back! Sign in to continue." : "Join Legal Bridge today."}
          </p>

          {/* Google Sign-In Button */}
          <button onClick={handleGoogleLogin} disabled={loading} style={{ width:"100%", background:"#fff",
            border:`1.5px solid ${C.border}`, borderRadius:10, padding:"12px 14px", fontWeight:600, 
            fontSize:14, cursor:loading?"default":"pointer", fontFamily:"inherit",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            opacity:loading?0.6:1, transition:"all .2s" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", margin:"20px 0", gap:12 }}>
            <div style={{ flex:1, height:1, background:C.border }}/>
            <span style={{ fontSize:12, color:C.muted }}>or</span>
            <div style={{ flex:1, height:1, background:C.border }}/>
          </div>

          {mode === "register" && (
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, color:C.text, display:"block", marginBottom:6 }}>Full Name</label>
              <input style={inp} value={name} onChange={e=>setName(e.target.value)} 
                placeholder="Your full name" disabled={loading}/>
            </div>
          )}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:13, fontWeight:600, color:C.text, display:"block", marginBottom:6 }}>Email</label>
            <input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} 
              placeholder="Email address" disabled={loading}/>
          </div>
          <div style={{ marginBottom:err?12:24 }}>
            <label style={{ fontSize:13, fontWeight:600, color:C.text, display:"block", marginBottom:6 }}>Password</label>
            <input style={inp} type="password" value={pass} onChange={e=>setPass(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&!loading&&submit()} placeholder="Password (6+ characters)"
              disabled={loading}/>
          </div>
          {err && <p style={{ color:C.red, fontSize:13, marginBottom:14 }}>⚠ {err}</p>}

          <button onClick={submit} disabled={loading} style={{ width:"100%", background:C.blue, color:"#fff",
            border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:15,
            cursor:loading?"default":"pointer", fontFamily:"inherit", opacity:loading?0.7:1,
            display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {loading && <Spinner size={16} color="#fff"/>}
            {mode==="login" ? "Login" : "Sign Up"}
          </button>

          <p style={{ textAlign:"center", fontSize:13, color:C.muted, marginTop:18 }}>
            {mode==="login" ? "New user? " : "Already have an account? "}
            <span onClick={()=>{!loading&&setMode(m=>m==="login"?"register":"login");setErr("");}}
              style={{ color:C.blue, fontWeight:600, cursor:"pointer", textDecoration:"underline" }}>
              {mode==="login" ? "Sign Up" : "Sign In"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════════════════ */
function Sidebar({ page, setPage, user, onLogout }) {
  return (
    <div style={{ width:220, flexShrink:0, background:C.blueSide,
      minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      {/* Logo */}
      <div style={{ padding:"22px 20px 18px", borderBottom:`1px solid rgba(255,255,255,.1)` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:8, background:C.blue,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⚖</div>
          <div>
            <div style={{ color:"#fff", fontSize:11, fontWeight:700, lineHeight:1.2 }}>Intelligent</div>
            <div style={{ color:"#93C5FD", fontSize:10, lineHeight:1.2 }}>Legal Companion</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:"12px 0" }}>
        {NAV.map(item => {
          const active = page === item.id;
          return (
            <button key={item.id} onClick={()=>setPage(item.id)}
              style={{ display:"flex", alignItems:"center", gap:12, width:"100%",
                padding:"11px 20px", border:"none", background:active?"rgba(255,255,255,.12)":"transparent",
                color: active?"#fff":"rgba(255,255,255,.65)", fontSize:13,
                fontWeight:active?600:400, cursor:"pointer", textAlign:"left",
                fontFamily:"inherit", borderLeft:active?`3px solid ${C.accent}`:"3px solid transparent",
                transition:"all .15s" }}>
              <span style={{ fontSize:15, width:18, textAlign:"center" }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding:"16px 20px", borderTop:`1px solid rgba(255,255,255,.1)` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:C.accent,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:14, fontWeight:700, color:"#fff" }}>
            {user.name[0].toUpperCase()}
          </div>
          <div>
            <div style={{ color:"#fff", fontSize:12, fontWeight:600 }}>{user.name}</div>
            <div style={{ color:"rgba(255,255,255,.5)", fontSize:10 }}>Rural Citizen</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width:"100%", background:"rgba(255,255,255,.1)",
          border:"1px solid rgba(255,255,255,.15)", borderRadius:8, padding:"8px",
          color:"rgba(255,255,255,.7)", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TOPBAR
═══════════════════════════════════════════════════════ */
function TopBar({ title, user, onProfileClick }) {
  return (
    <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}`,
      padding:"0 24px", height:60, display:"flex", alignItems:"center",
      justifyContent:"space-between", flexShrink:0 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:28, height:28, borderRadius:6, background:C.blue,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#fff" }}>⚖</div>
        <span style={{ fontWeight:700, fontSize:15, color:C.text }}>Intelligent Legal Companion</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <span style={{ fontSize:13, color:C.muted }}>Rural Citizens & Farmers</span>
        <div style={{ display:"flex", gap:10 }}>
          {["✉","🔔","🔒"].map(i=>(
            <span key={i} style={{ fontSize:17, cursor:"pointer", opacity:.6 }}>{i}</span>
          ))}
        </div>
        <button onClick={onProfileClick}
          style={{ width:32, height:32, borderRadius:"50%", background:C.blue,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:14, fontWeight:700, color:"#fff", border:"none", cursor:"pointer" }}>
          {user.name[0].toUpperCase()}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   HOME PAGE — matches mockup dashboard
═══════════════════════════════════════════════════════ */
function HomePage({ setPage, user }) {
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:20, fontWeight:700, color:C.text, margin:"0 0 4px",
          fontFamily:"'Georgia',serif" }}>Welcome to Intelligent Legal Companion</h2>
        <p style={{ color:C.muted, fontSize:13, margin:0 }}>Hello, {user.name} — how can we assist you today?</p>
      </div>

      {/* 3 quick action cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:24 }}>
        {[
          { icon:"⚖",  label:"Ask Legal Question",    page:"chatbot",  bg:"#EFF6FF" },
          { icon:"📄", label:"Upload Legal Document",  page:"document", bg:"#F0FDF4" },
          { icon:"🏛", label:"Government Schemes",     page:"schemes",  bg:"#FFF7ED" },
        ].map(f=>(
          <Card key={f.page} onClick={()=>setPage(f.page)}
            style={{ textAlign:"center", padding:"28px 16px", cursor:"pointer",
              background:f.bg, transition:"transform .15s, box-shadow .15s" }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(37,99,235,.14)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 1px 8px rgba(37,99,235,.07)";}}>
            <div style={{ fontSize:36, marginBottom:10 }}>{f.icon}</div>
            <div style={{ fontWeight:600, fontSize:14, color:C.text }}>{f.label}</div>
          </Card>
        ))}
      </div>

      {/* Bottom 2-col: Risk Score + Chatbot preview */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Risk Score card */}
        <Card>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:C.text, margin:0 }}>Legal Risk Score</h3>
          </div>
          <div style={{ display:"flex", gap:16, alignItems:"center" }}>
            <div style={{ flex:1 }}>
              {[
                { color:C.riskLow,  label:"Weak factors", sub:"Missing documents" },
                { color:C.riskMed,  label:"Problem haag bornat movies", sub:"from yolami cirus" },
              ].map((r,i)=>(
                <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:10 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:r.color,
                    marginTop:5, flexShrink:0 }}/>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{r.label}</div>
                    <div style={{ fontSize:11, color:C.muted }}>{r.sub}</div>
                  </div>
                </div>
              ))}
              <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:12 }}>
                <span style={{ fontSize:14 }}>📊</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text }}>Disorganised Progress</div>
                  <div style={{ fontSize:11, color:C.muted }}>desum ipose ndaencias</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                <span style={{ fontSize:14 }}>✅</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text }}>Matignencies Corrigas</div>
                  <div style={{ fontSize:11, color:C.muted }}>Risk oure Mamt revioles</div>
                </div>
              </div>
            </div>
            <div style={{ flexShrink:0 }}>
              <RiskGauge score={50}/>
              <p style={{ fontSize:11, color:C.muted, textAlign:"center", margin:"8px 0 0",
                maxWidth:130 }}>AI Case risk estimation. Analyse your legal case risk level.</p>
            </div>
          </div>
          <button onClick={()=>setPage("risk")} style={{ width:"100%", marginTop:14,
            background:C.blue, color:"#fff", border:"none", borderRadius:8, padding:"10px",
            fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            → Laïdie Now
          </button>
        </Card>

        {/* Chatbot preview */}
        <Card>
          <h3 style={{ fontSize:16, fontWeight:700, color:C.text, margin:"0 0 14px" }}>AI Legal Chatbot</h3>
          <div style={{ display:"flex", gap:10, marginBottom:10 }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:"#ddd",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>👤</div>
            <div style={{ background:C.blueLight, borderRadius:"0 12px 12px 12px",
              padding:"10px 14px", fontSize:13, color:C.text, flex:1 }}>
              Land problem inukka enna panna?
            </div>
          </div>
          <div style={{ background:"#F8FAFC", borderRadius:10, padding:"12px 14px",
            border:`1px solid ${C.border}`, marginBottom:12 }}>
            <div style={{ fontWeight:600, fontSize:12, color:C.blue, marginBottom:6 }}>
              Aetplemed Legal keompenttanone?
            </div>
            {["Rule boce ohenor issuel tasmem ninkle, no oeterpactions the ehenle legant, sa nestion.",
              "Utilishem agal oetomel tgal tmetoad ol nndes, sosporaht tnan agreement consumer phdile.",
              "Delnis toasal legrant tntis thisr sna leglef lesus, armntal inclsants nnstiation aolstion..."
            ].map((t,i)=>(
              <div key={i} style={{ display:"flex", gap:6, marginBottom:6 }}>
                <span style={{ color:C.blue, fontWeight:700, flexShrink:0 }}>•</span>
                <span style={{ fontSize:11, color:C.muted, lineHeight:1.5 }}>{t}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            marginBottom:8 }}>
            <span style={{ fontSize:12, color:C.muted }}>Suggested</span>
            <select style={{ fontSize:11, border:`1px solid ${C.border}`, borderRadius:6,
              padding:"2px 6px", color:C.muted, outline:"none" }}>
              <option>Intered indie selesi?</option>
            </select>
          </div>
          {["Land boundary problem na enna panna?","Rental agreement egal syppain?","Police complaint egal poodem?"].map((s,i)=>(
            <div key={i} style={{ display:"flex", gap:6, marginBottom:5 }}>
              <span style={{ color:C.blue, fontSize:13 }}>•</span>
              <span style={{ fontSize:12, color:C.text }}>{s}</span>
            </div>
          ))}
          <button onClick={()=>setPage("chatbot")}
            style={{ width:"100%", marginTop:12, background:C.blueLight,
              border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px",
              display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
            <span style={{ fontSize:14, opacity:.5 }}>📍</span>
            <span style={{ fontSize:12, color:C.muted, flex:1, textAlign:"left" }}>Type your legal question here...</span>
            <span style={{ fontSize:16, color:C.blue }}>🎤</span>
          </button>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CHATBOT PAGE
═══════════════════════════════════════════════════════ */
function ChatbotPage({ user, addHistory }) {
  const [msgs, setMsgs] = useState([
    { role:"assistant", text:"Vanakkam! 🙏 I am your AI Legal Assistant. Ask me any legal question in English, Tamil, or Tanglish.\n\nExample: \"Land problem na enna pananum?\"" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottom = useRef(null);

  useEffect(()=>{ bottom.current?.scrollIntoView({behavior:"smooth"}); }, [msgs]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = { role:"user", text:input };
    const userQuestion = input;
    setMsgs(m=>[...m, userMsg]);
    setInput(""); setLoading(true);
    try {
      // Save user message to Firestore
      const { saveChatMessage } = await import("./firestore-service.js");
      await saveChatMessage(user.uid, userQuestion, "user");
      
      const history = [...msgs, userMsg].slice(-10).map(m=>({ role:m.role, content:m.text }));
      const res = await fetch("/api/chat", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ messages: history })
      });
      const data = await res.json();
      const reply = data.reply || data.error || "Sorry, try again.";
      setMsgs(m=>[...m, { role:"assistant", text:reply }]);
      
      // Save assistant message to Firestore
      await saveChatMessage(user.uid, reply, "assistant");
      
      addHistory({ type:"chat", q:userQuestion.slice(0,55), date:new Date().toLocaleDateString() });
    } catch {
      setMsgs(m=>[...m, { role:"assistant", text:"⚠ Network error. Please try again." }]);
    }
    setLoading(false);
  }

  function resetChat() {
    setMsgs([
      { role:"assistant", text:"Vanakkam! 🙏 I am your AI Legal Assistant. Ask me any legal question in English, Tamil, or Tanglish.\n\nExample: \"Land problem na enna pananum?\"" }
    ]);
    setInput("");
  }

  const suggestions = [
    "My landlord is not returning my deposit. What to do?",
    "Land dispute with neighbour — how to file case?",
    "How to apply for free legal aid?",
    "என் நில ஆவணம் தொலைந்துவிட்டது. என்ன செய்வது?",
  ];

  return (
    <div style={{ display:"flex", gap:16, height:"calc(100vh - 100px)" }}>
      {/* Main chat */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        <Card style={{ flex:1, display:"flex", flexDirection:"column", padding:0, overflow:"hidden" }}>
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex",
            alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:C.blue,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:"#fff" }}>⚖</div>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:C.text }}>AI Legal Assistant</div>
              <div style={{ fontSize:11, color:C.green }}>● Online — replies instantly</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"16px 20px",
            display:"flex", flexDirection:"column", gap:14, background:"#FAFBFF" }}>
            {msgs.map((m,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", gap:10 }}>
                {m.role==="assistant"&&(
                  <div style={{ width:30,height:30,borderRadius:"50%",background:C.blue,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:14,color:"#fff",flexShrink:0 }}>⚖</div>
                )}
                <div style={{ background:m.role==="user"?C.blue:"#fff",
                  color:m.role==="user"?"#fff":C.text,
                  borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",
                  padding:"11px 15px", maxWidth:"76%", fontSize:13.5, lineHeight:1.7,
                  border:m.role==="assistant"?`1px solid ${C.border}`:"none",
                  whiteSpace:"pre-wrap", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
                  {m.text}
                </div>
                {m.role==="user"&&(
                  <div style={{ width:30,height:30,borderRadius:"50%",background:"#E2E8F0",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0 }}>
                    {user.name[0].toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            {loading&&(
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:30,height:30,borderRadius:"50%",background:C.blue,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff" }}>⚖</div>
                <div style={{ background:"#fff",borderRadius:"18px 18px 18px 4px",
                  padding:"11px 15px",border:`1px solid ${C.border}`,
                  display:"flex",alignItems:"center",gap:8 }}>
                  <Spinner size={14}/><span style={{ fontSize:12,color:C.muted }}>Analysing your question…</span>
                </div>
              </div>
            )}
            <div ref={bottom}/>
          </div>

          {/* Input */}
          <div style={{ padding:"14px 16px", borderTop:`1px solid ${C.border}`,
            display:"flex", gap:10, background:"#fff" }}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&send()}
              placeholder="Type your legal question here…"
              style={{ flex:1, border:`1.5px solid ${C.border}`, borderRadius:10,
                padding:"11px 14px", fontSize:14, fontFamily:"inherit", outline:"none" }}/>
            <button onClick={send} disabled={!input.trim()||loading}
              style={{ background:C.blue,color:"#fff",border:"none",borderRadius:10,
                padding:"11px 20px",fontWeight:700,fontSize:14,cursor:"pointer",
                opacity:(!input.trim()||loading)?.5:1, fontFamily:"inherit" }}>
              Send ↑
            </button>
            <button onClick={resetChat}
              style={{ background:C.border,color:C.text,border:"none",borderRadius:10,
                padding:"11px 16px",fontWeight:700,fontSize:14,cursor:"pointer",
                fontFamily:"inherit" }}>
              ⟳ New
            </button>
          </div>
        </Card>
      </div>

      {/* Suggestions sidebar */}
      <div style={{ width:240, flexShrink:0 }}>
        <Card style={{ marginBottom:14 }}>
          <h3 style={{ fontSize:14,fontWeight:700,color:C.text,margin:"0 0 12px" }}>💡 Suggested Questions</h3>
          {suggestions.map((s,i)=>(
            <button key={i} onClick={()=>setInput(s)}
              style={{ width:"100%",textAlign:"left",background:C.blueLight,
                border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",
                fontSize:12,color:C.text,cursor:"pointer",marginBottom:8,
                fontFamily:"inherit",lineHeight:1.5 }}>
              {s}
            </button>
          ))}
        </Card>
        <Card style={{ background:C.blueDeep, border:"none" }}>
          <div style={{ fontSize:13,color:"rgba(255,255,255,.7)",marginBottom:8 }}>🆓 Free Legal Helpline</div>
          <div style={{ fontSize:22,fontWeight:800,color:"#fff",fontFamily:"'Georgia',serif" }}>1800-110-1000</div>
          <div style={{ fontSize:11,color:"rgba(255,255,255,.6)",marginTop:4 }}>Toll-free · Mon–Sat 9am–7pm</div>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   DOCUMENT ANALYSER PAGE
═══════════════════════════════════════════════════════ */
function DocumentPage({ user, addHistory }) {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [paste, setPaste] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function analyse() {
    const content = paste ? text : (file ? `[File: ${file.name}] Simulated legal document about land ownership in Tamil Nadu — agreement between Nattlee Karesh (buyer) and Sureck Kumer (seller) for 2.56 acre plot, witnessed by Dr Salami Kumer.` : "");
    if (!content) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/analyse", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ content })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      
      // Save to Firestore
      const { saveDocumentAnalysis } = await import("./firestore-service.js");
      await saveDocumentAnalysis(user.uid, file?.name || "Pasted text", data);
      
      addHistory({ type:"doc", q:file?.name||"Pasted text", date:new Date().toLocaleDateString() });
    } catch {
      setResult({ summary:"Analysis failed. Please try again.", key_points:[], parties:[], dates:[], risks:[], next_steps:[] });
    }
    setLoading(false);
  }

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
      {/* Left: Upload */}
      <Card>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <h2 style={{ fontSize:18,fontWeight:700,color:C.text,margin:0,fontFamily:"'Georgia',serif" }}>Document Analyser</h2>
          <div style={{ display:"flex",gap:8 }}>
            <span style={{ cursor:"pointer",opacity:.5 }}>🔍</span>
            <span style={{ cursor:"pointer",opacity:.5 }}>👤</span>
          </div>
        </div>

        <h3 style={{ fontSize:15,fontWeight:700,color:C.text,margin:"0 0 4px" }}>Upload Legal Document</h3>
        <p style={{ fontSize:13,color:C.muted,margin:"0 0 16px" }}>Drag & drop or select legal document</p>

        <div style={{ display:"flex",gap:8,marginBottom:14 }}>
          {["Upload File","Paste Text"].map((m,i)=>(
            <button key={m} onClick={()=>setPaste(i===1)}
              style={{ flex:1,padding:"8px",borderRadius:8,
                border:`1.5px solid ${paste===(i===1)?C.blue:C.border}`,
                background:paste===(i===1)?C.blueLight:"#fff",
                color:paste===(i===1)?C.blue:C.muted,
                fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
              {m}
            </button>
          ))}
        </div>

        {!paste ? (
          <label style={{ display:"block",border:`2px dashed ${C.blue}55`,borderRadius:12,
            padding:"36px 20px",textAlign:"center",cursor:"pointer",
            background:file?"#EFF6FF":"#FAFBFF",marginBottom:14 }}>
            <div style={{ fontSize:36,marginBottom:8 }}>{file?"📄":"☁"}</div>
            <div style={{ fontWeight:600,color:file?C.blue:C.muted,fontSize:13,marginBottom:4 }}>
              {file?file.name:"Drag & drop or select legal document (PDF / Image)"}
            </div>
            {file&&<div style={{ fontSize:11,color:C.muted }}>{(file.size/1024).toFixed(1)} KB</div>}
            <input type="file" accept=".pdf,.docx,.txt,.jpg,.png" style={{display:"none"}}
              onChange={e=>setFile(e.target.files[0])}/>
          </label>
        ) : (
          <textarea value={text} onChange={e=>setText(e.target.value)}
            placeholder="Paste legal document text here…"
            style={{ width:"100%",height:160,border:`1.5px solid ${C.border}`,borderRadius:10,
              padding:"12px",fontSize:13,fontFamily:"inherit",resize:"vertical",
              boxSizing:"border-box",marginBottom:14,outline:"none" }}/>
        )}

        {/* Scanning preview (matches mockup) */}
        {(file||text) && !loading && !result && (
          <div style={{ background:"#F8FAFC",borderRadius:10,padding:"12px 14px",
            border:`1px solid ${C.border}`,marginBottom:14 }}>
            <div style={{ fontSize:13,fontWeight:600,color:C.text,marginBottom:8 }}>Scanning Document…</div>
            {["Owner: Nattlee Karesh, Buyer: Sureck Kumer","Agreement Date: 2.56 Acre","Witness: Dr Salemi Kumer"].map((t,i)=>(
              <div key={i} style={{ display:"flex",gap:8,marginBottom:5 }}>
                <span style={{ color:C.blue }}>•</span>
                <span style={{ fontSize:12,color:C.text }}>{t}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={analyse} disabled={loading||(!file&&!text)}
          style={{ width:"100%",background:C.blue,color:"#fff",border:"none",borderRadius:10,
            padding:"12px",fontWeight:700,fontSize:14,cursor:"pointer",
            opacity:(loading||(!file&&!text))?.5:1,fontFamily:"inherit" }}>
          {loading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><Spinner size={16} color="#fff"/> Analysing…</span>:"🔍 Analyse Document"}
        </button>

        {/* Bottom input (matching mockup) */}
        <div style={{ marginTop:14,display:"flex",alignItems:"center",gap:8,
          border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",
          background:"#FAFBFF" }}>
          <span style={{ fontSize:12,color:C.muted,flex:1 }}>Type your legal question here…</span>
          <span style={{ fontSize:13,color:C.muted }}>Thip fan comendi</span>
        </div>
      </Card>

      {/* Right: Results */}
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        {!result && !loading && (
          <Card style={{ textAlign:"center",padding:48 }}>
            <div style={{ fontSize:48,marginBottom:14 }}>📋</div>
            <div style={{ fontWeight:600,color:C.text,marginBottom:8 }}>Upload a document to analyse</div>
            <div style={{ fontSize:13,color:C.muted,lineHeight:1.7 }}>
              Our AI will extract key points, identify parties, flag risks, and suggest next steps — all in simple language.
            </div>
          </Card>
        )}
        {loading && (
          <Card style={{ textAlign:"center",padding:48 }}>
            <Spinner size={32}/>
            <p style={{ color:C.muted,marginTop:16,fontSize:14 }}>Reading and summarising your document…</p>
          </Card>
        )}
        {result && <>
          <Card>
            <h3 style={{ fontSize:14,fontWeight:700,color:C.text,margin:"0 0 10px" }}>📋 Summary</h3>
            <p style={{ fontSize:13,lineHeight:1.75,color:C.text,margin:0 }}>{result.summary}</p>
          </Card>
          {result.parties?.length>0&&(
            <Card>
              <h3 style={{ fontSize:14,fontWeight:700,color:C.text,margin:"0 0 10px" }}>👥 Parties Involved</h3>
              <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                {result.parties.map((p,i)=><Badge key={i} color={C.blue}>{p}</Badge>)}
              </div>
            </Card>
          )}
          {result.key_points?.length>0&&(
            <Card>
              <h3 style={{ fontSize:14,fontWeight:700,color:C.text,margin:"0 0 10px" }}>🔑 Key Points</h3>
              {result.key_points.map((p,i)=>(
                <div key={i} style={{ display:"flex",gap:10,marginBottom:8 }}>
                  <span style={{ color:C.accent,fontWeight:700,flexShrink:0 }}>{i+1}.</span>
                  <span style={{ fontSize:13,lineHeight:1.6 }}>{p}</span>
                </div>
              ))}
            </Card>
          )}
          {result.risks?.length>0&&(
            <Card style={{ borderLeft:`4px solid ${C.red}` }}>
              <h3 style={{ fontSize:14,fontWeight:700,color:C.red,margin:"0 0 10px" }}>⚠ Risks</h3>
              {result.risks.map((r,i)=><div key={i} style={{ fontSize:13,color:"#555",marginBottom:6 }}>• {r}</div>)}
            </Card>
          )}
          {result.next_steps?.length>0&&(
            <Card style={{ borderLeft:`4px solid ${C.green}` }}>
              <h3 style={{ fontSize:14,fontWeight:700,color:C.green,margin:"0 0 10px" }}>✅ Next Steps</h3>
              {result.next_steps.map((s,i)=>(
                <div key={i} style={{ display:"flex",gap:10,marginBottom:8 }}>
                  <span style={{ background:C.green,color:"#fff",borderRadius:"50%",width:20,height:20,
                    fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{i+1}</span>
                  <span style={{ fontSize:13,lineHeight:1.6 }}>{s}</span>
                </div>
              ))}
            </Card>
          )}
        </>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   GOVT SCHEMES PAGE
═══════════════════════════════════════════════════════ */
function SchemesPage() {
  const [search, setSearch] = useState("");
  const filtered = SCHEMES.filter(s=>s.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
        <div>
          <SectionTitle>Government Schemes for You</SectionTitle>
          <p style={{ color:C.muted,fontSize:13,margin:"-10px 0 0" }}>Find schemes relevant to your situation</p>
        </div>
        <div style={{ display:"flex",gap:10 }}>
          <button style={{ background:C.blue,color:"#fff",border:"none",borderRadius:8,
            padding:"10px 18px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>
            Manage Legal Database
          </button>
          <button style={{ background:"#fff",color:C.text,border:`1px solid ${C.border}`,
            borderRadius:8,padding:"10px 18px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>
            Update Schemes
          </button>
        </div>
      </div>

      <input value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="Search schemes (e.g. farmer, housing, health)…"
        style={{ width:"100%",border:`1.5px solid ${C.border}`,borderRadius:10,
          padding:"12px 16px",fontSize:14,fontFamily:"inherit",outline:"none",
          boxSizing:"border-box",marginBottom:18 }}/>

      <h3 style={{ fontSize:15,fontWeight:700,color:C.text,margin:"0 0 14px" }}>
        Government Schemes Recommendation
      </h3>

      <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
        {filtered.map((s,i)=>(
          <Card key={i} style={{ display:"flex",gap:14,alignItems:"flex-start",cursor:"pointer",
            transition:"box-shadow .15s" }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(37,99,235,.12)"}
            onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 8px rgba(37,99,235,.07)"}>
            <div style={{ width:44,height:44,borderRadius:12,background:C.blueLight,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>
              {s.icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700,fontSize:14,color:C.text,marginBottom:4 }}>{s.name}</div>
              <div style={{ fontSize:13,color:C.muted,lineHeight:1.6 }}>{s.desc}</div>
            </div>
            <button style={{ background:C.blue,color:"#fff",border:"none",borderRadius:8,
              padding:"8px 14px",fontSize:12,fontWeight:600,cursor:"pointer",
              flexShrink:0,fontFamily:"inherit" }}>
              Apply →
            </button>
          </Card>
        ))}
        {filtered.length===0&&<p style={{ textAlign:"center",color:C.muted,padding:32 }}>No schemes found.</p>}
      </div>

      {/* Awareness section */}
      <h3 style={{ fontSize:15,fontWeight:700,color:C.text,margin:"28px 0 14px" }}>Legal Awareness Articles</h3>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12 }}>
        {AWARENESS.map((a,i)=>(
          <Card key={i}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
              <h4 style={{ fontSize:13,fontWeight:700,color:C.text,margin:0 }}>{a.title}</h4>
              <Badge color={a.color}>{a.tag}</Badge>
            </div>
            <p style={{ fontSize:12,color:C.muted,lineHeight:1.7,margin:0 }}>{a.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   FIR GUIDANCE PAGE
═══════════════════════════════════════════════════════ */
function FIRPage() {
  const [step, setStep] = useState(0);
  return (
    <div>
      <SectionTitle>FIR Guidance</SectionTitle>
      <p style={{ color:C.muted,fontSize:13,margin:"-10px 0 20px" }}>
        Step-by-step guide to filing a First Information Report in India
      </p>

      {/* Steps grid */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14,marginBottom:24 }}>
        {FIR_STEPS.map((s,i)=>(
          <Card key={i} onClick={()=>setStep(i)}
            style={{ display:"flex",gap:14,alignItems:"flex-start",cursor:"pointer",
              border:`1.5px solid ${step===i?C.blue:C.border}`,
              background:step===i?C.blueLight:"#fff",transition:"all .15s" }}>
            <div style={{ width:44,height:44,borderRadius:12,
              background:step===i?C.blue:C.light,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontWeight:700,fontSize:14,color:step===i?C.blue:C.text,marginBottom:4 }}>
                Step {i+1}: {s.title}
              </div>
              <div style={{ fontSize:12,color:C.muted,lineHeight:1.6 }}>{s.desc}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Detail card */}
      <Card style={{ background:`linear-gradient(135deg,${C.blueSide} 0%,${C.blue} 100%)`,border:"none" }}>
        <h3 style={{ color:"#fff",fontSize:16,fontWeight:700,margin:"0 0 10px" }}>
          How to File a Complaint — Step {step+1}: {FIR_STEPS[step].title}
        </h3>
        <p style={{ color:"rgba(255,255,255,.85)",fontSize:14,lineHeight:1.7,margin:"0 0 16px" }}>
          {FIR_STEPS[step].desc}
        </p>
        {step===0&&<div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {["Collect all evidence: photos, documents, receipts","Note down exact date, time and location of the incident","List names and contact details of all witnesses","Write a brief factual account of what happened"].map((t,i)=>(
            <div key={i} style={{ display:"flex",gap:10 }}>
              <span style={{ color:"#86EFAC",fontWeight:700 }}>✓</span>
              <span style={{ color:"rgba(255,255,255,.85)",fontSize:13 }}>{t}</span>
            </div>
          ))}
        </div>}
        {step===1&&<div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {["Use clear, simple language — avoid legal jargon","Include: Full name, address, contact number","State the crime/offence clearly with specific details","Mention names of accused if known"].map((t,i)=>(
            <div key={i} style={{ display:"flex",gap:10 }}>
              <span style={{ color:"#86EFAC",fontWeight:700 }}>✓</span>
              <span style={{ color:"rgba(255,255,255,.85)",fontSize:13 }}>{t}</span>
            </div>
          ))}
        </div>}
        {step===2&&<div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {["Visit the nearest police station with jurisdiction","If police refuse, contact SP/SSP or file online at your state police portal","You have the right to a FREE copy of the FIR","If serious crime, police MUST register FIR within 24 hours"].map((t,i)=>(
            <div key={i} style={{ display:"flex",gap:10 }}>
              <span style={{ color:"#86EFAC",fontWeight:700 }}>✓</span>
              <span style={{ color:"rgba(255,255,255,.85)",fontSize:13 }}>{t}</span>
            </div>
          ))}
        </div>}
        {step===3&&<div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {["Use the FIR number given at the station to track progress","Call 100 or visit the station for follow-up","File a complaint with SP if no action in 30 days","Approach Magistrate under Section 156(3) CrPC if police are unresponsive"].map((t,i)=>(
            <div key={i} style={{ display:"flex",gap:10 }}>
              <span style={{ color:"#86EFAC",fontWeight:700 }}>✓</span>
              <span style={{ color:"rgba(255,255,255,.85)",fontSize:13 }}>{t}</span>
            </div>
          ))}
        </div>}
        <div style={{ display:"flex",gap:10,marginTop:16 }}>
          {step>0&&<button onClick={()=>setStep(s=>s-1)}
            style={{ background:"rgba(255,255,255,.15)",color:"#fff",border:"1px solid rgba(255,255,255,.3)",
              borderRadius:8,padding:"10px 20px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
            ← Previous
          </button>}
          {step<FIR_STEPS.length-1&&<button onClick={()=>setStep(s=>s+1)}
            style={{ background:"#fff",color:C.blue,border:"none",borderRadius:8,
              padding:"10px 20px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
            Next Step →
          </button>}
        </div>
      </Card>

      {/* Emergency */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginTop:20 }}>
        {[["🚔","Police Emergency","100"],["⚖","Legal Aid Helpline","1800-110-1000"],["👩","Women Helpline","181"]].map(([icon,label,num])=>(
          <Card key={num} style={{ textAlign:"center",padding:"20px 16px" }}>
            <div style={{ fontSize:28,marginBottom:8 }}>{icon}</div>
            <div style={{ fontSize:13,color:C.muted,marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:22,fontWeight:800,color:C.blue,fontFamily:"'Georgia',serif" }}>{num}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   RISK PAGE
═══════════════════════════════════════════════════════ */
function RiskPage({ user, addHistory }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const allDone = RISK_QUESTIONS.every(q=>answers[q.id]);

  async function calculate() {
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/risk", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ answers })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      
      // Save to Firestore
      const { saveRiskAssessment } = await import("./firestore-service.js");
      await saveRiskAssessment(user.uid, answers, data);
      
      addHistory({ type:"risk", q:answers.issue, date:new Date().toLocaleDateString() });
    } catch {
      setResult({ risk_level:"Medium", risk_score:55, reason:"Could not fully assess. Please consult a legal professional.", urgent_actions:["Gather all documents","Contact DLSA for free advice","Do not sign anything without review"], long_term_advice:"Seek proper legal counsel." });
    }
    setLoading(false);
  }

  const rc = result?.risk_level==="High"?C.riskHigh:result?.risk_level==="Medium"?C.riskMed:C.riskLow;

  return (
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
      <div>
        <SectionTitle>⚠ Legal Risk Assessment</SectionTitle>
        <p style={{ color:C.muted,fontSize:13,margin:"-10px 0 20px" }}>Answer 5 questions to assess your legal risk level</p>
        {RISK_QUESTIONS.map((q,qi)=>(
          <Card key={q.id} style={{ marginBottom:14 }}>
            <p style={{ fontWeight:700,fontSize:13,color:C.text,margin:"0 0 10px" }}>
              <span style={{ color:C.blue }}>Q{qi+1}.</span> {q.label}
            </p>
            <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
              {q.options.map(opt=>(
                <label key={opt} style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",
                  padding:"8px 12px",borderRadius:8,
                  background:answers[q.id]===opt?C.blueLight:"#FAFBFF",
                  border:`1.5px solid ${answers[q.id]===opt?C.blue:C.border}`,
                  transition:"all .12s" }}>
                  <input type="radio" name={q.id} value={opt}
                    checked={answers[q.id]===opt}
                    onChange={()=>setAnswers(a=>({...a,[q.id]:opt}))}
                    style={{ accentColor:C.blue }}/>
                  <span style={{ fontSize:13,color:answers[q.id]===opt?C.blue:C.text }}>{opt}</span>
                </label>
              ))}
            </div>
          </Card>
        ))}
        <button onClick={calculate} disabled={!allDone||loading}
          style={{ width:"100%",background:C.blue,color:"#fff",border:"none",borderRadius:10,
            padding:"13px",fontWeight:700,fontSize:15,cursor:"pointer",
            opacity:(!allDone||loading)?.5:1,fontFamily:"inherit" }}>
          {loading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><Spinner size={16} color="#fff"/> Calculating…</span>:"📊 Calculate Risk Score"}
        </button>
      </div>

      <div>
        {!result&&!loading&&(
          <Card style={{ textAlign:"center",padding:48,marginTop:44 }}>
            <div style={{ fontSize:48,marginBottom:14 }}><RiskGauge score={0}/></div>
            <div style={{ fontSize:13,color:C.muted,lineHeight:1.7 }}>
              Complete the questionnaire on the left to get your personalised legal risk score with AI-powered recommendations.
            </div>
          </Card>
        )}
        {loading&&<Card style={{ textAlign:"center",padding:48,marginTop:44 }}><Spinner size={32}/><p style={{ color:C.muted,marginTop:16 }}>Calculating your risk score…</p></Card>}
        {result&&<div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <Card style={{ textAlign:"center",padding:"28px 20px" }}>
            <RiskGauge score={result.risk_score}/>
            <p style={{ fontSize:13,color:C.muted,marginTop:14,lineHeight:1.7,maxWidth:320,margin:"14px auto 0" }}>
              {result.reason}
            </p>
          </Card>
          <Card style={{ borderLeft:`4px solid ${rc}` }}>
            <h3 style={{ fontSize:14,fontWeight:700,color:C.text,margin:"0 0 12px" }}>🚨 Immediate Actions</h3>
            {result.urgent_actions?.map((a,i)=>(
              <div key={i} style={{ display:"flex",gap:10,marginBottom:8 }}>
                <span style={{ background:rc,color:"#fff",borderRadius:"50%",width:22,height:22,
                  fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{i+1}</span>
                <span style={{ fontSize:13,lineHeight:1.6 }}>{a}</span>
              </div>
            ))}
          </Card>
          <Card style={{ borderLeft:`4px solid ${C.green}` }}>
            <h3 style={{ fontSize:14,fontWeight:700,color:C.green,margin:"0 0 8px" }}>💡 Long-term Advice</h3>
            <p style={{ fontSize:13,color:C.muted,lineHeight:1.7,margin:0 }}>{result.long_term_advice}</p>
          </Card>
        </div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   HISTORY PAGE
═══════════════════════════════════════════════════════ */
function HistoryPage({ user }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadHistory();
  }, [user]);

  async function loadHistory() {
    setLoading(true);
    try {
      const { getQueryHistory } = await import("./firestore-service.js");
      const result = await getQueryHistory(user.uid, filter);
      if (result.success) {
        const formatted = result.data.map(item => ({
          id: item.id,
          type: item.type === "chat" ? "chat" : item.type === "document" ? "doc" : "risk",
          q: item.text || item.filename || `Risk Assessment (${item.risk_level})`,
          date: new Date(item.timestamp?.toDate?.() || item.savedAt?.toDate?.() || item.assessedAt?.toDate?.() || Date.now()).toLocaleDateString(),
          ...item
        }));
        setHistory(formatted);
      }
    } catch (error) {
      console.error("Error loading history:", error);
    }
    setLoading(false);
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <SectionTitle style={{ margin: 0 }}>🕘 My Queries History</SectionTitle>
        <div style={{ display:"flex", gap:8 }}>
          {["all", "chat", "doc", "risk"].map(f => (
            <button key={f} onClick={() => { setFilter(f); loadHistory(); }}
              style={{ padding:"8px 12px", borderRadius:8,
                border: filter === f ? `2px solid ${C.blue}` : `1px solid ${C.border}`,
                background: filter === f ? C.blueLight : "#fff",
                color: filter === f ? C.blue : C.muted,
                fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              {f === "all" ? "All" : f === "chat" ? "💬 Chats" : f === "doc" ? "📄 Docs" : "⚠ Risk"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card style={{ textAlign:"center", padding:48 }}>
          <Spinner size={32} />
          <div style={{ marginTop:12, color:C.muted }}>Loading history...</div>
        </Card>
      ) : history.length === 0 ? (
        <Card style={{ textAlign:"center", padding:48 }}>
          <div style={{ fontSize:48, marginBottom:14 }}>📂</div>
          <div style={{ fontWeight:600, color:C.text, marginBottom:8 }}>No activity yet</div>
          <div style={{ fontSize:13, color:C.muted }}>Start by using the AI chatbot, uploading a document, or checking your risk score.</div>
        </Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[...history].reverse().map((h,i)=>(
            <Card key={i} style={{ display:"flex", alignItems:"center", gap:14 }}>
              <span style={{ fontSize:22 }}>{h.type==="chat"?"💬":h.type==="doc"?"📄":"⚠"}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{h.q}</div>
                <div style={{ fontSize:12, color:C.muted }}>{h.date}</div>
              </div>
              <Badge color={h.type==="chat"?C.blue:h.type==="doc"?C.green:C.amber}>
                {h.type==="chat"?"Chat":h.type==="doc"?"Document":"Risk"}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ADMIN PAGE
═══════════════════════════════════════════════════════ */
function AdminPage() {
  return (
    <div>
      <SectionTitle>⚙ Admin Panel</SectionTitle>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:24 }}>
        {[["👥","Total Users","1,248"],["💬","Total Chats","8,430"],["📄","Docs Analysed","3,120"],["⚠","Risk Reports","2,090"],["🏛","Schemes Viewed","5,600"],["📋","FIR Filed","412"]].map(([icon,lbl,val])=>(
          <Card key={lbl} style={{ textAlign:"center",padding:"22px 16px" }}>
            <div style={{ fontSize:28,marginBottom:8 }}>{icon}</div>
            <div style={{ fontSize:22,fontWeight:800,color:C.blue,fontFamily:"'Georgia',serif" }}>{val}</div>
            <div style={{ fontSize:12,color:C.muted,marginTop:4 }}>{lbl}</div>
          </Card>
        ))}
      </div>
      <Card>
        <h3 style={{ fontSize:15,fontWeight:700,color:C.text,margin:"0 0 14px" }}>Recent Activity Log</h3>
        {[
          { time:"2 min ago", action:"New user registered", user:"Kiran Kumar, Chennai" },
          { time:"8 min ago", action:"Document analysed — Land agreement",  user:"Priya S, Madurai" },
          { time:"15 min ago",action:"FIR guidance viewed",                 user:"Rajan M, Coimbatore" },
          { time:"1 hr ago",  action:"Risk score calculated — High",        user:"Anbu K, Salem" },
          { time:"2 hr ago",  action:"Scheme applied — PM Kisan",           user:"Selvi T, Trichy" },
        ].map((log,i)=>(
          <div key={i} style={{ display:"flex",gap:14,padding:"10px 0",
            borderBottom:i<4?`1px solid ${C.border}`:"none",alignItems:"center" }}>
            <span style={{ fontSize:12,color:C.muted,minWidth:72 }}>{log.time}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13,fontWeight:600,color:C.text }}>{log.action}</div>
              <div style={{ fontSize:12,color:C.muted }}>{log.user}</div>
            </div>
            <span style={{ width:8,height:8,borderRadius:"50%",background:C.green,flexShrink:0 }}/>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════ */
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("home");
  const [history, setHistory] = useState([]);

  function addHistory(item) { setHistory(h=>[...h, item]); }

  async function handleLogout() {
    await logout();
    setUser(null);
  }

  if (!user) return <LoginPage onLogin={setUser}/>;

  const pages = {
    home:     <HomePage setPage={setPage} user={user}/>,
    chatbot:  <ChatbotPage user={user} addHistory={addHistory}/>,
    document: <DocumentPage user={user} addHistory={addHistory}/>,
    schemes:  <SchemesPage/>,
    fir:      <FIRPage/>,
    risk:     <RiskPage user={user} addHistory={addHistory}/>,
    history:  <HistoryPage user={user}/>,
    profile:  <ProfilePage user={user} onProfileUpdate={u=>setUser(u)}/>,
    admin:    <AdminPage/>,
  };

  const pageTitle = NAV.find(n=>n.id===page)?.label || "Home";

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Segoe UI',-apple-system,sans-serif",
      background:C.bg }}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes spin{to{transform:rotate(360deg)}}
        input:focus,textarea:focus{border-color:${C.blue}!important;box-shadow:0 0 0 3px ${C.blue}22}
        button:active{transform:scale(.98)}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px}
        select{background:#fff;font-family:inherit}
      `}</style>

      <Sidebar page={page} setPage={setPage} user={user} onLogout={handleLogout}/>

      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, minHeight:"100vh" }}>
        <TopBar title={pageTitle} user={user} onProfileClick={() => setPage("profile")}/>
        <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
          {pages[page] || pages.home}
        </div>
      </div>
    </div>
  );
}
