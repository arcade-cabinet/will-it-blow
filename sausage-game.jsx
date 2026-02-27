import { useState, useEffect, useRef } from "react";

// ==================== DATA ====================

const INGREDIENTS = [
  { name: "Big Mac", emoji: "🍔", category: "fast food", tasteMod: 3, textureMod: 3, burstRisk: 0.2, blowPower: 2, color: "#D4A017" },
  { name: "SpaghettiOs", emoji: "🍝", category: "canned", tasteMod: 2, textureMod: 1, burstRisk: 0.5, blowPower: 4, color: "#E85D2C" },
  { name: "Lobster", emoji: "🦞", category: "fancy", tasteMod: 5, textureMod: 4, burstRisk: 0.1, blowPower: 1, color: "#C41E3A" },
  { name: "Water", emoji: "💧", category: "absurd", tasteMod: 0, textureMod: 0, burstRisk: 0.9, blowPower: 5, color: "#4FC3F7" },
  { name: "Air", emoji: "💨", category: "absurd", tasteMod: 0, textureMod: 0, burstRisk: 0.1, blowPower: 0, color: "#E0E0E0" },
  { name: "Candy Cane", emoji: "🍬", category: "sweet", tasteMod: 3, textureMod: 2, burstRisk: 0.3, blowPower: 2, color: "#FF1744" },
  { name: "Carolina Reaper", emoji: "🌶️", category: "spicy", tasteMod: 1, textureMod: 2, burstRisk: 0.6, blowPower: 3, color: "#B71C1C" },
  { name: "Chicken Soup", emoji: "🍲", category: "comfort", tasteMod: 4, textureMod: 3, burstRisk: 0.4, blowPower: 3, color: "#FFC107" },
  { name: "Elmer's Glue", emoji: "🧴", category: "absurd", tasteMod: 0, textureMod: 1, burstRisk: 0.7, blowPower: 1, color: "#FAFAFA" },
  { name: "Beef Wellington", emoji: "🥩", category: "fancy", tasteMod: 5, textureMod: 5, burstRisk: 0.15, blowPower: 2, color: "#8D6E63" },
  { name: "Habanero", emoji: "🫑", category: "spicy", tasteMod: 1, textureMod: 2, burstRisk: 0.4, blowPower: 3, color: "#FF6D00" },
  { name: "Jawbreaker", emoji: "🔴", category: "absurd", tasteMod: 1, textureMod: 0, burstRisk: 0.5, blowPower: 1, color: "#E040FB" },
  { name: "Pad Thai", emoji: "🍜", category: "international", tasteMod: 4, textureMod: 3, burstRisk: 0.3, blowPower: 3, color: "#FF8A65" },
  { name: "Taco Bell Crunchwrap", emoji: "🌮", category: "fast food", tasteMod: 3, textureMod: 2, burstRisk: 0.3, blowPower: 2, color: "#7B1FA2" },
  { name: "Cotton Candy", emoji: "🍭", category: "sweet", tasteMod: 2, textureMod: 1, burstRisk: 0.6, blowPower: 4, color: "#F48FB1" },
  { name: "Vanilla Cake", emoji: "🎂", category: "sweet", tasteMod: 4, textureMod: 3, burstRisk: 0.25, blowPower: 2, color: "#FFF9C4" },
  { name: "Pizza", emoji: "🍕", category: "fast food", tasteMod: 4, textureMod: 3, burstRisk: 0.3, blowPower: 3, color: "#F57C00" },
  { name: "Dirt", emoji: "🟤", category: "absurd", tasteMod: 0, textureMod: 1, burstRisk: 0.2, blowPower: 1, color: "#5D4037" },
  { name: "Rice Crispy Treat", emoji: "🍚", category: "sweet", tasteMod: 5, textureMod: 4, burstRisk: 0.15, blowPower: 2, color: "#FFE082" },
  { name: "Sushi Party Tray", emoji: "🍣", category: "fancy", tasteMod: 5, textureMod: 4, burstRisk: 0.2, blowPower: 2, color: "#EF5350" },
  { name: "Hot Pocket", emoji: "📦", category: "fast food", tasteMod: 2, textureMod: 2, burstRisk: 0.5, blowPower: 3, color: "#1565C0" },
  { name: "Menthol Cough Drop", emoji: "💊", category: "absurd", tasteMod: -1, textureMod: 1, burstRisk: 0.3, blowPower: 2, color: "#00BFA5" },
  { name: "Mac & Cheese", emoji: "🧀", category: "comfort", tasteMod: 4, textureMod: 2, burstRisk: 0.4, blowPower: 3, color: "#FFCA28" },
  { name: "Corn Dog", emoji: "🌽", category: "fast food", tasteMod: 3, textureMod: 3, burstRisk: 0.2, blowPower: 2, color: "#F9A825" },
];

const SONGS = [
  "🎵 Don't Fear The Sausage 🎵",
  "🎵 Bohemian Sausage-dy 🎵",
  "🎵 Sweet Sausage O' Mine 🎵",
  "🎵 Sausage In A Bottle 🎵",
  "🎵 Livin' On A Sausage 🎵",
  "🎵 Hotel Sausage-fornia 🎵",
  "🎵 Stairway To Sausage 🎵",
  "🎵 We Will Sausage You 🎵",
];

const FAN_ART = [
  "a sausage wearing sunglasses riding a skateboard",
  "Mr. Sausage as a superhero with a cape",
  "a sausage fighting a giant lobster in space",
  "the grinder as a noble castle with sausage flags",
  "Mrs. Sausage chasing Mr. Sausage with a mop",
  "a sausage link chain holding up the Statue of Liberty",
  "Mark Ruffalo made entirely of tiny sausages",
  "a sausage in a hot tub full of mustard",
  "a sausage graduating from culinary school",
  "Mr. Potato Sausage running for president",
];

const PHASE_STEPS = ["select","grind","stuff","blow","cook","taste"];
const PHASE_LABELS = ["Pick","Grind","Stuff","Blow","Cook","Taste"];
const PHASE_EMOJIS = ["🛒","⚙️","🫙","🌬️","🔥","😋"];

// Mr. Sausage commentary per phase
const MR_SAUSAGE_LINES = {
  select: [
    "Well hey 'dere folks! Pick your poison!",
    "Choose wisely... or don't. It's all sausage.",
    "Ooh, some interesting options today!",
    "What are we sausaging today, folks?",
    "Remember: there are no bad sausages... okay maybe some.",
  ],
  grind: [
    "Get in there! Into the grinder!",
    "BZZZZZZ! Love that sound!",
    "This is going to be... something!",
    "Keep grinding, we're almost there!",
    "The grinder is HUNGRY today!",
  ],
  stuff: [
    "Three... two... one... LET'S SAUSAGE!",
    "Pack it in nice and tight!",
    "Looking like a beautiful sausage!",
    "Fill 'er up! Fill 'er up!",
    "That casing is holding up great!",
  ],
  blow: [
    "So will it blow?!",
    "Mrs. Sausage is NOT gonna be happy...",
    "This is gonna be messy, I can feel it!",
    "Watch the wall! Watch the wall!",
    "Mark Ruffalo would be proud!",
  ],
  cook: [
    "HERE WE GO! Into the pan!",
    "Sizzle sizzle, baby!",
    "Oh man, please don't burst...",
    "Smells... like something cooking!",
    "The moment of truth approaches!",
  ],
  taste: [
    "Let's open it up and see how we did!",
    "Moment of truth, folks...",
    "Time for the taste test!",
    "I'm both excited and terrified!",
    "May God have mercy on my soul!",
  ],
  results: [
    "And THAT'S how you sausage!",
    "Another one for the books!",
    "I'm the goddamn sausage king!",
    "This is a special message from Corporate!",
    "Subscribe and hit that sausage bell!",
  ],
};

// ==================== UTILITY COMPONENTS ====================

function SausageRating({ count, max = 5, size = 28 }) {
  return (
    <div style={{ display:"flex", gap:4, justifyContent:"center", flexWrap:"wrap" }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{
          fontSize: size,
          filter: i < count ? "none" : "grayscale(1) opacity(0.25)",
          transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          transitionDelay: `${i*150}ms`,
          transform: i < count ? "scale(1)" : "scale(0.7)",
          display: "inline-block",
        }}>🌭</span>
      ))}
    </div>
  );
}

function RuffaloRating({ count }) {
  return (
    <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{
          width:42, height:42, borderRadius:"50%",
          background: i<count ? "linear-gradient(135deg,#4CAF50,#1B5E20)" : "#222",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:11, fontWeight:900, color: i<count ? "#fff" : "#444",
          border: i<count ? "2px solid #66BB6A" : "2px solid #333",
          transition: "all 0.5s cubic-bezier(0.34,1.56,0.64,1)",
          transitionDelay: `${i*180}ms`,
          transform: i<count ? "scale(1)" : "scale(0.7) rotate(-10deg)",
          fontFamily: "'Bangers', cursive",
          boxShadow: i<count ? "0 0 12px rgba(76,175,80,0.4)" : "none",
        }}>MR</div>
      ))}
    </div>
  );
}

function ProgressBar({ value, max, color = "#FF6B35", label, height = 18 }) {
  const pct = Math.min((value/max)*100, 100);
  return (
    <div style={{ width:"100%", marginBottom:8 }}>
      {label && <div style={{ fontSize:12, color:"#aaa", marginBottom:4, fontFamily:"'Bangers', cursive", letterSpacing:1 }}>{label}</div>}
      <div style={{ background:"#111", borderRadius:height/2+2, overflow:"hidden", height, border:"2px solid #2a2a2a", position:"relative" }}>
        <div style={{
          width:`${pct}%`, height:"100%",
          background:`linear-gradient(90deg, ${color}cc, ${color})`,
          transition:"width 0.2s ease", borderRadius:height/2,
          boxShadow: pct>5 ? `0 0 10px ${color}44` : "none",
          position:"relative",
        }}>
          {pct > 15 && <div style={{
            position:"absolute", top:2, left:4, right:4, height:"35%",
            background:"linear-gradient(180deg, rgba(255,255,255,0.25), transparent)",
            borderRadius:height/2,
          }} />}
        </div>
      </div>
    </div>
  );
}

function ShakeWrapper({ children, active, intensity = 3 }) {
  const [offset, setOffset] = useState({ x:0, y:0 });
  useEffect(() => {
    if (!active) { setOffset({ x:0, y:0 }); return; }
    const iv = setInterval(() => {
      setOffset({ x:(Math.random()-0.5)*intensity*2, y:(Math.random()-0.5)*intensity*2 });
    }, 50);
    return () => clearInterval(iv);
  }, [active, intensity]);
  return <div style={{ transform:`translate(${offset.x}px, ${offset.y}px)`, transition:"transform 0.05s" }}>{children}</div>;
}

function PhaseTracker({ currentPhase }) {
  const idx = PHASE_STEPS.indexOf(currentPhase);
  if (idx < 0) return null;
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"10px 8px 6px", gap:0 }}>
      {PHASE_STEPS.map((step, i) => {
        const done = i < idx; const active = i === idx;
        return (
          <div key={step} style={{ display:"flex", alignItems:"center" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, opacity: done?0.5:active?1:0.3, transition:"all 0.4s" }}>
              <div style={{
                width:active?36:28, height:active?36:28, borderRadius:"50%",
                background: done?"#4CAF50":active?"#FF6B35":"#222",
                border: active?"2px solid #FFD54F":done?"2px solid #388E3C":"2px solid #333",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize: active?18:14, transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                boxShadow: active?"0 0 14px rgba(255,107,53,0.5)":"none",
              }}>{done ? "✓" : PHASE_EMOJIS[i]}</div>
              <span style={{ fontFamily:"'Bangers', cursive", fontSize:active?10:9, color:active?"#FF6B35":done?"#4CAF50":"#555", letterSpacing:0.5 }}>{PHASE_LABELS[i]}</span>
            </div>
            {i < PHASE_STEPS.length-1 && (
              <div style={{ width:16, height:2, margin:"0 2px", background:done?"#4CAF50":"#333", marginBottom:14, transition:"background 0.4s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FloatingParticles({ ingredients }) {
  const [particles] = useState(() =>
    Array.from({ length: 16 }).map((_, i) => ({
      id: i,
      emoji: ingredients?.length ? ingredients[i % ingredients.length].emoji : ["🌭","⚙️","🔥","🌬️","🍖"][i%5],
      x: Math.random()*100, y: Math.random()*100,
      size: 10+Math.random()*14, duration: 18+Math.random()*25, delay: Math.random()*-20,
    }))
  );
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", overflow:"hidden", zIndex:0 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position:"absolute", left:`${p.x}%`, top:`${p.y}%`,
          fontSize:p.size, opacity:0.06,
          animation:`floatParticle ${p.duration}s ${p.delay}s linear infinite`,
        }}>{p.emoji}</div>
      ))}
    </div>
  );
}

function ConfettiExplosion({ active }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!active) return;
    setPieces(Array.from({ length: 35 }).map((_, i) => ({
      id: i, emoji: ["🌭","🎉","⭐","🔥","✨","🏆"][i%6],
      x: 40+Math.random()*20, vx: (Math.random()-0.5)*400,
      vy: -(200+Math.random()*400), size: 14+Math.random()*16, delay: Math.random()*0.3,
    })));
  }, [active]);
  if (!active) return null;
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:50, overflow:"hidden" }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position:"absolute", left:`${p.x}%`, top:"50%", fontSize:p.size,
          animation:`confettiFall 2.5s ${p.delay}s ease-out forwards`,
          "--vx":`${p.vx}px`, "--vy":`${p.vy}px`,
        }}>{p.emoji}</div>
      ))}
    </div>
  );
}

// ==================== MR. SAUSAGE AVATAR ====================

function MrSausageAvatar({ phase, mood }) {
  const [line, setLine] = useState("");
  const [lineKey, setLineKey] = useState(0);
  const [bobPhase, setBobPhase] = useState(0);
  const lineTimeout = useRef(null);
  const cycleRef = useRef(null);

  // Mood determines face: "happy" "excited" "nervous" "disgusted" "shocked" "singing"
  const faces = {
    happy: "😊", excited: "😆", nervous: "😬", disgusted: "🤢",
    shocked: "😱", singing: "🎤", proud: "😎", thinking: "🤔",
    neutral: "🙂",
  };
  const face = faces[mood] || faces.neutral;

  useEffect(() => {
    const lines = MR_SAUSAGE_LINES[phase];
    if (!lines) return;
    const pick = () => {
      const l = lines[Math.floor(Math.random()*lines.length)];
      setLine(l);
      setLineKey(k => k+1);
    };
    pick();
    cycleRef.current = setInterval(pick, 5000);
    return () => clearInterval(cycleRef.current);
  }, [phase]);

  useEffect(() => {
    const iv = setInterval(() => setBobPhase(p => p+1), 600);
    return () => clearInterval(iv);
  }, []);

  const bob = Math.sin(bobPhase * 0.5) * 3;

  return (
    <div style={{
      position:"fixed", bottom:16, left:12, zIndex:40,
      display:"flex", flexDirection:"column", alignItems:"flex-start", gap:4,
      pointerEvents:"none",
      animation:"mrSausageEnter 0.5s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      {/* Speech bubble */}
      {line && (
        <div key={lineKey} style={{
          background:"rgba(30,30,30,0.95)", border:"2px solid #FF6B35",
          borderRadius:"14px 14px 14px 4px", padding:"8px 12px",
          maxWidth:200, position:"relative",
          animation:"bubblePop 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          boxShadow:"0 4px 16px rgba(0,0,0,0.5)",
        }}>
          <div style={{
            fontFamily:"'Patrick Hand', cursive", fontSize:12, color:"#eee",
            lineHeight:1.4,
          }}>{line}</div>
          {/* Bubble tail */}
          <div style={{
            position:"absolute", bottom:-8, left:14, width:0, height:0,
            borderLeft:"8px solid transparent", borderRight:"4px solid transparent",
            borderTop:"8px solid #FF6B35",
          }} />
          <div style={{
            position:"absolute", bottom:-5, left:15, width:0, height:0,
            borderLeft:"6px solid transparent", borderRight:"3px solid transparent",
            borderTop:"6px solid rgba(30,30,30,0.95)",
          }} />
        </div>
      )}
      {/* Avatar body */}
      <div style={{
        transform:`translateY(${bob}px)`,
        transition:"transform 0.3s ease",
      }}>
        <div style={{
          width:52, height:52, borderRadius:"50%",
          background:"linear-gradient(135deg, #FF6B35, #D84315)",
          border:"3px solid #FFD54F",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:26, position:"relative",
          boxShadow:"0 4px 16px rgba(255,107,53,0.4)",
        }}>
          {face}
          {/* Chef hat */}
          <div style={{
            position:"absolute", top:-14, left:"50%", transform:"translateX(-50%)",
            width:28, height:18,
            background:"linear-gradient(180deg, #fff 0%, #eee 100%)",
            borderRadius:"10px 10px 2px 2px",
            border:"1px solid #ccc",
            boxShadow:"0 -2px 4px rgba(0,0,0,0.1)",
          }}>
            <div style={{
              position:"absolute", top:-6, left:"50%", transform:"translateX(-50%)",
              width:16, height:10, background:"#fff", borderRadius:"8px 8px 0 0",
              border:"1px solid #ddd", borderBottom:"none",
            }} />
          </div>
        </div>
        {/* Name tag */}
        <div style={{
          fontFamily:"'Bangers', cursive", fontSize:7, color:"#FFD54F",
          textAlign:"center", letterSpacing:0.5, marginTop:2,
          textShadow:"0 0 4px rgba(0,0,0,0.8)",
        }}>MR. SAUSAGE</div>
      </div>
    </div>
  );
}

// ==================== SFX TEXT OVERLAY ====================

function SfxText({ texts, active }) {
  const [sfxItems, setSfxItems] = useState([]);

  useEffect(() => {
    if (!active || !texts?.length) { setSfxItems([]); return; }
    const iv = setInterval(() => {
      setSfxItems(prev => {
        const now = Date.now();
        const filtered = prev.filter(s => now - s.id < 1500);
        if (Math.random() > 0.6) {
          filtered.push({
            id: now,
            text: texts[Math.floor(Math.random()*texts.length)],
            x: 10 + Math.random()*80,
            y: 10 + Math.random()*60,
            rot: (Math.random()-0.5)*30,
            size: 14 + Math.random()*12,
          });
        }
        return filtered.slice(-6);
      });
    }, 400);
    return () => clearInterval(iv);
  }, [active, texts]);

  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden", zIndex:5 }}>
      {sfxItems.map(s => (
        <div key={s.id} style={{
          position:"absolute", left:`${s.x}%`, top:`${s.y}%`,
          fontFamily:"'Bangers', cursive", fontSize:s.size,
          color:"rgba(255,213,79,0.35)", transform:`rotate(${s.rot}deg)`,
          animation:"sfxFloat 1.5s ease-out forwards",
          letterSpacing:2, whiteSpace:"nowrap",
          textShadow:"0 0 8px rgba(255,213,79,0.15)",
        }}>{s.text}</div>
      ))}
    </div>
  );
}

// ==================== "BUT FIRST!" EVENT ====================

function ButFirstEvent({ onComplete }) {
  const [phase, setPhase] = useState("smash");
  const [smashCount, setSmashCount] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [fanArt] = useState(() => FAN_ART[Math.floor(Math.random()*FAN_ART.length)]);
  const [bonusPoints] = useState(() => Math.floor(Math.random()*8)+3);

  const handleSmash = () => {
    if (phase !== "smash") return;
    const n = smashCount + 1;
    setSmashCount(n);
    if (n >= 5) {
      setPhase("reveal");
      setTimeout(() => setRevealed(true), 400);
    }
  };

  const crk = Math.min(smashCount/5, 1);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:100,
      background:"rgba(0,0,0,0.94)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      gap:16, padding:24, animation:"fadeIn 0.3s ease-out",
    }}>
      <div style={{
        fontFamily:"'Bangers', cursive", fontSize:"clamp(44px,10vw,68px)",
        color:"#FFD54F",
        textShadow:"0 0 30px rgba(255,213,79,0.6), 0 4px 0 #B8860B",
        animation:"butFirstSlam 0.5s cubic-bezier(0.34,1.56,0.64,1)",
        letterSpacing:3,
      }}>BUT FIRST!</div>

      {phase === "smash" && (
        <>
          <div style={{ fontFamily:"'Patrick Hand', cursive", fontSize:16, color:"#ccc", textAlign:"center" }}>
            Smash the sausage with your fist to reveal fan art!
          </div>
          <button onClick={handleSmash} style={{
            width:170, height:85, borderRadius:42, cursor:"pointer",
            background:"linear-gradient(90deg, #D84315, #FF6B35, #D84315)",
            border:"3px solid #8D6E63",
            boxShadow:"0 6px 20px rgba(216,67,21,0.5), inset 0 -4px 8px rgba(0,0,0,0.3), inset 0 4px 8px rgba(255,255,255,0.15)",
            position:"relative", overflow:"hidden", transition:"transform 0.1s",
            transform:`scale(${1 - crk*0.15})`,
          }}>
            {Array.from({ length: Math.min(smashCount, 5) }).map((_, i) => (
              <div key={i} style={{
                position:"absolute",
                left:`${25+i*12}%`, top:`${15+(i%3)*22}%`,
                width:2+i, height:10+i*6,
                background:"#111", transform:`rotate(${-30+i*25}deg)`,
                borderRadius:1, opacity:0.7,
              }} />
            ))}
            <div style={{
              position:"absolute", top:2, left:8, right:8, height:"35%",
              background:"linear-gradient(180deg, rgba(255,255,255,0.15), transparent)",
              borderRadius:40,
            }} />
          </button>
          <div style={{ fontFamily:"'Bangers', cursive", fontSize:15, color:"#FF6B35" }}>
            👊 {5-smashCount} smash{5-smashCount!==1?"es":""} left!
          </div>
        </>
      )}

      {phase === "reveal" && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, animation:"fadeIn 0.6s ease-out" }}>
          <div style={{
            width:250, height:190, borderRadius:14,
            border:"4px solid #FFD54F",
            background:"linear-gradient(135deg, #1a1a2e, #16213e)",
            display:"flex", alignItems:"center", justifyContent:"center",
            padding:20, textAlign:"center",
            boxShadow:"0 8px 30px rgba(255,213,79,0.2), inset 0 0 40px rgba(255,213,79,0.05)",
            opacity:revealed?1:0, transform:revealed?"scale(1) rotate(0deg)":"scale(0.3) rotate(-10deg)",
            transition:"all 0.6s cubic-bezier(0.34,1.56,0.64,1)",
          }}>
            <div>
              <div style={{ fontSize:44, marginBottom:8 }}>🎨</div>
              <div style={{ fontFamily:"'Patrick Hand', cursive", fontSize:15, color:"#FFD54F", lineHeight:1.5 }}>
                Fan art of {fanArt}
              </div>
            </div>
          </div>
          <div style={{ fontFamily:"'Patrick Hand', cursive", fontSize:14, color:"#81C784" }}>
            With special thanks to today's Mark Boxalo box artist!
          </div>
          <div style={{ fontFamily:"'Bangers', cursive", fontSize:30, color:"#4CAF50", textShadow:"0 0 15px rgba(76,175,80,0.4)", animation:"popIn 0.4s 0.3s both" }}>
            +{bonusPoints}% BONUS!
          </div>
          <button onClick={() => onComplete(bonusPoints)} style={{
            fontFamily:"'Bangers', cursive", fontSize:20, padding:"12px 36px",
            background:"linear-gradient(135deg, #FF6B35, #D84315)", color:"#fff",
            border:"3px solid #FFD54F", borderRadius:10, cursor:"pointer",
            boxShadow:"0 4px 15px rgba(255,107,53,0.4)",
          }}>BACK TO THE SAUSAGE!</button>
        </div>
      )}
    </div>
  );
}

// ==================== PHASE COMPONENTS ====================

function TitleScreen({ onStart }) {
  const [glow, setGlow] = useState(false);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const iv = setInterval(() => setGlow(g=>!g), 1200);
    setTimeout(() => setShow(true), 100);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      minHeight:"100vh", textAlign:"center", padding:30, gap:20,
      opacity:show?1:0, transform:show?"translateY(0)":"translateY(30px)",
      transition:"all 0.8s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      <div style={{ fontSize:80, filter:"drop-shadow(0 4px 20px rgba(255,107,53,0.6))", animation:"sausageSpin 3s ease-in-out infinite" }}>🌭</div>
      <h1 style={{
        fontFamily:"'Bangers', cursive", fontSize:"clamp(42px,9vw,72px)", color:"#FF6B35",
        textShadow:glow?"0 0 40px #FF6B35, 0 0 80px #FF6B3555, 0 4px 0 #993D1F":"0 0 15px #FF6B3544, 0 4px 0 #993D1F",
        transition:"text-shadow 0.6s", lineHeight:1, margin:0,
      }}>ORDINARY<br/>SAUSAGE</h1>
      <div style={{ fontFamily:"'Permanent Marker', cursive", fontSize:"clamp(16px,3.5vw,22px)", color:"#FFD54F", letterSpacing:3, textShadow:"0 0 10px rgba(255,213,79,0.3)" }}>
        ★ THE GAME ★
      </div>
      <div style={{ fontSize:15, color:"#888", maxWidth:360, lineHeight:1.7, fontFamily:"'Patrick Hand', cursive" }}>
        Grind it. Stuff it. Blow it. Cook it. Rate it.<br/>Can you become the Sausage King?
      </div>
      <button onClick={onStart} style={{
        fontFamily:"'Bangers', cursive", fontSize:28, padding:"16px 52px",
        background:"linear-gradient(135deg, #FF6B35, #D84315)", color:"#fff",
        border:"3px solid #FFD54F", borderRadius:14, cursor:"pointer",
        boxShadow:"0 6px 24px rgba(255,107,53,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
        letterSpacing:3, marginTop:10,
      }}
        onMouseEnter={e=>{e.target.style.transform="scale(1.06) translateY(-2px)";e.target.style.boxShadow="0 10px 35px rgba(255,107,53,0.7)";}}
        onMouseLeave={e=>{e.target.style.transform="scale(1)";e.target.style.boxShadow="0 6px 24px rgba(255,107,53,0.5)";}}
      >LET'S SAUSAGE!</button>
      <div style={{ fontSize:11, color:"#555", marginTop:6, fontStyle:"italic" }}>Based on the YouTube series by Mr. Sausage</div>
    </div>
  );
}

function IngredientSelect({ onSelect }) {
  const [selected, setSelected] = useState([]);
  const [pool, setPool] = useState([]);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    const shuffled = [...INGREDIENTS].sort(()=>Math.random()-0.5);
    setPool(shuffled.slice(0,12));
    setTimeout(()=>setFadeIn(true), 50);
  }, []);

  const toggle = (ing) => {
    setSelected(prev => {
      if (prev.find(i=>i.name===ing.name)) return prev.filter(i=>i.name!==ing.name);
      if (prev.length>=3) return prev;
      return [...prev, ing];
    });
  };

  const catColors = {"fast food":"#FF6B35","canned":"#E85D2C","fancy":"#FFD700","absurd":"#E040FB","sweet":"#F48FB1","spicy":"#FF1744","comfort":"#FFC107","international":"#4FC3F7"};

  return (
    <div style={{
      padding:"16px 16px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:14,
      opacity:fadeIn?1:0, transform:fadeIn?"translateY(0)":"translateY(20px)", transition:"all 0.5s ease-out",
    }}>
      <div style={{ fontFamily:"'Bangers', cursive", fontSize:28, color:"#FF6B35", textAlign:"center" }}>CHOOSE YOUR INGREDIENTS</div>
      <div style={{ color:"#FFD54F", fontFamily:"'Patrick Hand', cursive", fontSize:16 }}>Pick 1–3 items to grind into a sausage!</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))", gap:10, width:"100%", maxWidth:600 }}>
        {pool.map((ing, idx) => {
          const sel = selected.find(i=>i.name===ing.name);
          return (
            <button key={ing.name} onClick={()=>toggle(ing)} style={{
              background: sel?`linear-gradient(135deg, ${ing.color}22, ${ing.color}0a)`:"#141414",
              border: sel?`2px solid ${ing.color}`:"2px solid #282828",
              borderRadius:12, padding:"14px 8px", cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", gap:4,
              transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
              position:"relative", overflow:"hidden",
              transform: sel?"scale(1.04)":"scale(1)",
              boxShadow: sel?`0 0 16px ${ing.color}33`:"none",
              animation:`cardFadeIn 0.4s ${idx*0.04}s both ease-out`,
            }}>
              {sel && <div style={{
                position:"absolute", top:6, right:6, background:"#4CAF50", color:"#fff",
                borderRadius:"50%", width:20, height:20, fontSize:12,
                display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900,
              }}>✓</div>}
              <span style={{ fontSize:34, transition:"transform 0.2s", transform:sel?"scale(1.15)":"scale(1)" }}>{ing.emoji}</span>
              <span style={{ fontFamily:"'Bangers', cursive", fontSize:13, color:"#eee", letterSpacing:0.5 }}>{ing.name}</span>
              <span style={{ fontSize:9, color:catColors[ing.category]||"#888", fontFamily:"'Patrick Hand', cursive", textTransform:"uppercase", letterSpacing:1 }}>{ing.category}</span>
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <button onClick={()=>onSelect(selected)} style={{
          fontFamily:"'Bangers', cursive", fontSize:22, padding:"14px 40px",
          background:"linear-gradient(135deg, #FF6B35, #D84315)", color:"#fff",
          border:"3px solid #FFD54F", borderRadius:12, cursor:"pointer",
          boxShadow:"0 4px 18px rgba(255,107,53,0.5)", letterSpacing:1, marginTop:6,
          animation:"fadeIn 0.3s ease-out",
        }}>GRIND {selected.map(i=>i.emoji).join(" ")} → 🌭</button>
      )}
    </div>
  );
}

function GrindPhase({ ingredients, onComplete }) {
  const [grindProgress, setGrindProgress] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [particles, setParticles] = useState([]);
  const [grinderOn, setGrinderOn] = useState(false);
  const [turnOnItem] = useState(() => {
    const items = ["his elbow","a spatula","a rubber duck","his forehead","a TV remote","a banana","his pinky toe","a flip-flop","Mrs. Sausage's keys"];
    return items[Math.floor(Math.random()*items.length)];
  });

  const handleGrind = () => {
    if (!grinderOn) return;
    setClicks(c=>c+1);
    setGrindProgress(p => {
      const n = Math.min(p+2.5+Math.random()*2, 100);
      if (n>=100) setTimeout(()=>onComplete(), 600);
      return n;
    });
    setParticles(p => [...p.slice(-20), ...Array.from({length:2}).map(()=>({
      id: Date.now()+Math.random(),
      x: 35+Math.random()*30, y: 50+Math.random()*15,
      emoji: ingredients[Math.floor(Math.random()*ingredients.length)].emoji,
    }))]);
  };

  useEffect(() => {
    const iv = setInterval(()=>setParticles(p=>p.filter(pt=>Date.now()-pt.id<1200)), 150);
    return () => clearInterval(iv);
  }, []);

  const done = grindProgress >= 100;

  return (
    <div style={{ padding:20, display:"flex", flexDirection:"column", alignItems:"center", gap:16, animation:"fadeIn 0.4s ease-out", position:"relative" }}>
      <SfxText texts={["BZZZZZ!","GRRRND!","CRUNCH!","*grinding*","WHIRRRR!"]} active={grinderOn && !done} />
      <div style={{ fontFamily:"'Bangers', cursive", fontSize:28, color:"#FF6B35" }}>GRIND PHASE</div>
      {!grinderOn ? (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, marginTop:20, animation:"fadeIn 0.5s" }}>
          <div style={{ fontSize:64, animation:"wobble 2s ease-in-out infinite" }}>⚙️</div>
          <div style={{ fontFamily:"'Patrick Hand', cursive", fontSize:18, color:"#FFD54F", textAlign:"center" }}>
            Mr. Sausage turns on the grinder with...
          </div>
          <button onClick={()=>setGrinderOn(true)} style={{
            fontFamily:"'Bangers', cursive", fontSize:22, padding:"14px 36px",
            background:"linear-gradient(135deg, #4CAF50, #2E7D32)", color:"#fff",
            border:"2px solid #81C784", borderRadius:12, cursor:"pointer",
            boxShadow:"0 4px 18px rgba(76,175,80,0.5)",
          }}>{turnOnItem.toUpperCase()}! ⚡</button>
        </div>
      ) : (
        <>
          <div style={{ color:"#bbb", fontFamily:"'Patrick Hand', cursive", fontSize:15 }}>
            Tap the grinder to grind your {ingredients.map(i=>i.name).join(" + ")}!
          </div>
          <div style={{ position:"relative", width:200, height:200, margin:"10px 0" }}>
            {particles.map(p => (
              <div key={p.id} style={{
                position:"absolute", left:`${p.x}%`, top:`${p.y}%`,
                fontSize:18, pointerEvents:"none",
                animation:"particlePop 0.8s forwards ease-out",
              }}>{p.emoji}</div>
            ))}
            <ShakeWrapper active={!done&&grindProgress>0} intensity={grindProgress/18}>
              <button onClick={handleGrind} disabled={done} style={{
                width:160, height:160, borderRadius:"50%", cursor:done?"default":"pointer",
                background:`conic-gradient(#FF6B35 ${grindProgress*3.6}deg, #1a1a1a ${grindProgress*3.6}deg)`,
                border:"4px solid #FF6B35", display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", gap:4,
                boxShadow:`0 0 ${10+grindProgress/3}px rgba(255,107,53,${0.2+grindProgress/300}), inset 0 0 20px rgba(0,0,0,0.6)`,
                margin:"20px auto",
              }}>
                <span style={{ fontSize:52, display:"inline-block", transform:`rotate(${clicks*45}deg)`, transition:"transform 0.15s" }}>⚙️</span>
                <span style={{ fontFamily:"'Bangers', cursive", color:"#fff", fontSize:16 }}>{Math.round(grindProgress)}%</span>
              </button>
            </ShakeWrapper>
          </div>
          <ProgressBar value={grindProgress} max={100} color="#FF6B35" label="GRIND PROGRESS" />
          {done && <div style={{ fontFamily:"'Bangers', cursive", fontSize:26, color:"#4CAF50", textShadow:"0 0 20px rgba(76,175,80,0.5)", animation:"popIn 0.4s" }}>✅ FULLY GROUND!</div>}
        </>
      )}
    </div>
  );
}

function StuffPhase({ ingredients, onComplete }) {
  const [phase, setPhase] = useState("countdown");
  const [count, setCount] = useState(3);
  const [stuffProgress, setStuffProgress] = useState(0);
  const [song] = useState(()=>SONGS[Math.floor(Math.random()*SONGS.length)]);
  const [songOpacity, setSongOpacity] = useState(0);

  useEffect(() => {
    if (phase==="countdown") {
      if (count>0) { const t=setTimeout(()=>setCount(c=>c-1), 800); return ()=>clearTimeout(t); }
      else setPhase("singing");
    }
  }, [phase, count]);

  useEffect(() => {
    if (phase==="singing") {
      setSongOpacity(1);
      const t=setTimeout(()=>{setSongOpacity(0);setTimeout(()=>setPhase("stuffing"),500);},2500);
      return ()=>clearTimeout(t);
    }
  }, [phase]);

  const handleStuff = () => {
    if (phase!=="stuffing") return;
    setStuffProgress(p => {
      const n=Math.min(p+4+Math.random()*3, 100);
      if (n>=100) { setPhase("done"); setTimeout(()=>onComplete(),1000); }
      return n;
    });
  };
  const done = phase==="done";

  return (
    <div style={{ padding:20, display:"flex", flexDirection:"column", alignItems:"center", gap:16, justifyContent:"center", animation:"fadeIn 0.4s ease-out", position:"relative" }}>
      <SfxText texts={["SQUISH!","SQUELCH!","*stuffing*","PACK!","SQUEEZE!"]} active={phase==="stuffing"} />
      <div style={{ fontFamily:"'Bangers', cursive", fontSize:28, color:"#FF6B35" }}>STUFF THE CASING</div>
      {phase==="countdown" && (
        <div key={count} style={{
          fontFamily:"'Bangers', cursive", fontSize:count>0?100:44, color:count>0?"#FFD54F":"#4CAF50",
          textShadow:"0 0 40px currentColor", animation:"popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)", marginTop:30,
        }}>{count>0?count:"LET'S SAUSAGE!"}</div>
      )}
      {phase==="singing" && (
        <div style={{
          fontFamily:"'Permanent Marker', cursive", fontSize:"clamp(18px,4.5vw,28px)", color:"#F48FB1",
          textAlign:"center", opacity:songOpacity, transition:"opacity 0.5s",
          textShadow:"0 0 25px rgba(244,143,177,0.4)", padding:"30px 0",
        }}>{song}</div>
      )}
      {(phase==="stuffing"||done) && (
        <>
          <div style={{ color:"#bbb", fontFamily:"'Patrick Hand', cursive", fontSize:15 }}>
            {done?"That's a beautiful sausage!":"Tap to stuff the casing!"}
          </div>
          <div style={{ width:"85%", maxWidth:360, margin:"20px 0", position:"relative" }}>
            <div style={{
              height:64, borderRadius:32, border:"3px solid #6D4C41",
              background:"#151515", overflow:"hidden", position:"relative",
              boxShadow:"inset 0 2px 8px rgba(0,0,0,0.6)",
            }}>
              <div style={{
                width:`${stuffProgress}%`, height:"100%",
                background:`linear-gradient(90deg, ${ingredients.map(i=>i.color).join(", ")})`,
                borderRadius:30, transition:"width 0.15s",
                boxShadow:"inset 0 -4px 8px rgba(0,0,0,0.3), inset 0 4px 8px rgba(255,255,255,0.1)",
                position:"relative",
              }}>
                <div style={{ position:"absolute", top:3, left:8, right:8, height:"30%", background:"linear-gradient(180deg, rgba(255,255,255,0.2), transparent)", borderRadius:30 }} />
              </div>
              {Array.from({length:12}).map((_,i)=>(
                <div key={i} style={{ position:"absolute", top:0, left:`${i*8+4}%`, width:1, height:"100%", background:"rgba(255,255,255,0.03)" }} />
              ))}
            </div>
            <div style={{ position:"absolute", left:-8, top:18, fontSize:22 }}>🪢</div>
            {done && <div style={{ position:"absolute", right:-8, top:18, fontSize:22, animation:"popIn 0.3s" }}>🪢</div>}
          </div>
          {phase==="stuffing" && (
            <button onClick={handleStuff} style={{
              fontFamily:"'Bangers', cursive", fontSize:24, padding:"16px 44px",
              background:"linear-gradient(135deg, #8D6E63, #4E342E)", color:"#fff",
              border:"3px solid #A1887F", borderRadius:14, cursor:"pointer",
              boxShadow:"0 4px 18px rgba(141,110,99,0.5)",
            }}>STUFF! 💪</button>
          )}
          <ProgressBar value={stuffProgress} max={100} color="#8D6E63" label="SAUSAGE FULLNESS" />
          {done && <div style={{ fontFamily:"'Bangers', cursive", fontSize:26, color:"#4CAF50", animation:"popIn 0.4s" }}>✅ PERFECTLY STUFFED!</div>}
        </>
      )}
    </div>
  );
}

function WillItBlow({ ingredients, onComplete }) {
  const [phase, setPhase] = useState("ready");
  const [ruffalos, setRuffalos] = useState(0);
  const [holdStart, setHoldStart] = useState(null);
  const [holdPower, setHoldPower] = useState(0);
  const [splats, setSplats] = useState([]);
  const holdInterval = useRef(null);
  const avgBlow = ingredients.reduce((a,i)=>a+i.blowPower,0)/ingredients.length;

  const startBlow = () => {
    if (phase!=="ready") return;
    setPhase("blowing"); setHoldStart(Date.now());
    holdInterval.current = setInterval(()=>setHoldPower(p=>Math.min(p+2,100)), 30);
  };
  const endBlow = () => {
    if (phase!=="blowing") return;
    clearInterval(holdInterval.current);
    const dur = Math.min((Date.now()-holdStart)/1000, 3);
    const pow = Math.min((dur/3)*avgBlow+Math.random()*1.5, 5);
    const ruf = Math.round(Math.max(0,Math.min(5,pow)));
    setRuffalos(ruf);
    setSplats(Array.from({length:Math.round(ruf*4)+3}).map((_,i)=>({
      id:i, x:10+Math.random()*80, y:5+Math.random()*70,
      size:6+Math.random()*24, color:ingredients[Math.floor(Math.random()*ingredients.length)].color,
      delay:Math.random()*0.6,
    })));
    setPhase("result");
  };

  return (
    <div style={{ padding:20, display:"flex", flexDirection:"column", alignItems:"center", gap:16, justifyContent:"center", animation:"fadeIn 0.4s ease-out", position:"relative" }}>
      <SfxText texts={["WHOOSH!","PFFFT!","SPLAT!","*blowing*","FWOOOM!"]} active={phase==="blowing"} />
      <div style={{ fontFamily:"'Bangers', cursive", fontSize:28, color:"#FF6B35" }}>WILL IT BLOW?!</div>
      {phase==="ready" && (
        <>
          <div style={{ color:"#FFD54F", fontFamily:"'Patrick Hand', cursive", fontSize:16, textAlign:"center" }}>
            Hold the button to blow the leftover filling<br/>out of the tube!
          </div>
          <div style={{ fontSize:80, margin:16, animation:"wobble 2s ease-in-out infinite" }}>🌬️</div>
          <button onMouseDown={startBlow} onTouchStart={e=>{e.preventDefault();startBlow();}} style={{
            fontFamily:"'Bangers', cursive", fontSize:24, padding:"16px 48px",
            background:"linear-gradient(135deg, #2196F3, #0D47A1)", color:"#fff",
            border:"3px solid #64B5F6", borderRadius:14, cursor:"pointer",
            boxShadow:"0 4px 18px rgba(33,150,243,0.5)", userSelect:"none",
          }}>HOLD TO BLOW!</button>
        </>
      )}
      {phase==="blowing" && (
        <>
          <div style={{ fontSize:100, animation:"wobble 0.2s infinite" }}>🌬️</div>
          <div style={{ width:"70%", maxWidth:250 }}>
            <ProgressBar value={holdPower} max={100} color="#2196F3" label="BLOW POWER" height={22} />
          </div>
          <button onMouseUp={endBlow} onTouchEnd={endBlow} style={{
            fontFamily:"'Bangers', cursive", fontSize:24, padding:"16px 48px",
            background:"linear-gradient(135deg, #F44336, #B71C1C)", color:"#fff",
            border:"3px solid #EF9A9A", borderRadius:14, cursor:"pointer",
            animation:"pulse 0.4s infinite", userSelect:"none",
          }}>RELEASE!</button>
        </>
      )}
      {phase==="result" && (
        <>
          <div style={{
            width:"85%", maxWidth:320, height:190, position:"relative",
            background:"linear-gradient(180deg, #111, #0a0a0a)", borderRadius:14,
            border:"2px solid #282828", overflow:"hidden", margin:"8px 0",
            boxShadow:"inset 0 0 20px rgba(0,0,0,0.5)",
          }}>
            {splats.map(s=>(
              <div key={s.id} style={{
                position:"absolute", left:`${s.x}%`, top:`${s.y}%`,
                width:s.size, height:s.size, borderRadius:"50%",
                background:`radial-gradient(circle at 35% 35%, ${s.color}, ${s.color}88)`,
                animation:`splatIn 0.4s ${s.delay}s both ease-out`,
                boxShadow:`0 0 ${s.size}px ${s.color}33`,
              }} />
            ))}
            <div style={{ position:"absolute", bottom:8, width:"100%", textAlign:"center", fontFamily:"'Patrick Hand', cursive", fontSize:11, color:"#444" }}>
              Mrs. Sausage's kitchen wall 😤
            </div>
          </div>
          <div style={{ fontFamily:"'Bangers', cursive", fontSize:24, color:"#FFD54F", textShadow:"0 0 12px rgba(255,213,79,0.3)", animation:"popIn 0.5s" }}>
            {ruffalos} MARK RUFFALO{ruffalos!==1?"S":""}!
          </div>
          <RuffaloRating count={ruffalos} />
          <button onClick={()=>onComplete(ruffalos)} style={{
            fontFamily:"'Bangers', cursive", fontSize:20, padding:"12px 36px",
            background:"linear-gradient(135deg, #FF6B35, #D84315)", color:"#fff",
            border:"3px solid #FFD54F", borderRadius:12, cursor:"pointer", marginTop:8,
          }}>TIME TO COOK! 🔥</button>
        </>
      )}
    </div>
  );
}

function CookPhase({ ingredients, onComplete }) {
  const [cookProgress, setCookProgress] = useState(0);
  const [hasBurst, setHasBurst] = useState(false);
  const [burstChecked, setBurstChecked] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [sizzle, setSizzle] = useState(false);
  const [hereWeGo, setHereWeGo] = useState(true);
  const [sparks, setSparks] = useState([]);
  const ivRef = useRef(null);
  const avgBurstRisk = ingredients.reduce((a,i)=>a+i.burstRisk,0)/ingredients.length;

  useEffect(() => { if(hereWeGo){const t=setTimeout(()=>setHereWeGo(false),1500);return()=>clearTimeout(t);} }, []);

  useEffect(() => {
    if (!cooking) return;
    ivRef.current = setInterval(() => {
      setCookProgress(p => {
        const n = p+1;
        if (n>=100) { clearInterval(ivRef.current); setTimeout(()=>onComplete(hasBurst),800); }
        if (n>=40 && !burstChecked) { setBurstChecked(true); if(Math.random()<avgBurstRisk) setHasBurst(true); }
        return Math.min(n,100);
      });
      setSizzle(s=>!s);
      if (Math.random()>0.5) setSparks(prev=>[...prev.slice(-8),{id:Date.now()+Math.random(),x:30+Math.random()*40,y:30+Math.random()*20}]);
    }, 80);
    return ()=>clearInterval(ivRef.current);
  }, [cooking]);

  useEffect(() => {
    const iv=setInterval(()=>setSparks(p=>p.filter(pt=>Date.now()-pt.id<800)),200);
    return ()=>clearInterval(iv);
  }, []);

  const done=cookProgress>=100;

  return (
    <div style={{ padding:20, display:"flex", flexDirection:"column", alignItems:"center", gap:16, justifyContent:"center", animation:"fadeIn 0.4s ease-out", position:"relative" }}>
      <SfxText texts={["SIZZLE!","CRACKLE!","*sizzling*","POP!","TSSSSS!","HISSSSS!"]} active={cooking && !done} />
      <div style={{ fontFamily:"'Bangers', cursive", fontSize:28, color:"#FF6B35" }}>COOK THE SAUSAGE</div>
      {hereWeGo && (
        <div style={{
          fontFamily:"'Bangers', cursive", fontSize:52, color:"#FFD54F",
          textShadow:"0 0 40px rgba(255,213,79,0.6), 0 4px 0 #B8860B",
          animation:"popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)", marginTop:40,
        }}>HERE WE GO!</div>
      )}
      {!hereWeGo && (
        <>
          <div style={{
            width:230, height:230, borderRadius:"50%",
            background:"radial-gradient(circle at 45% 45%, #2a2a2a 0%, #111 70%, #0a0a0a 100%)",
            border:"7px solid #444", position:"relative",
            boxShadow:"inset 0 0 40px rgba(0,0,0,0.9), 0 10px 30px rgba(0,0,0,0.6)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            {cooking && <div style={{
              position:"absolute", width:"80%", height:"80%", borderRadius:"50%",
              background:"radial-gradient(ellipse at 35% 35%, rgba(255,200,50,0.08) 0%, transparent 55%)",
              animation:"pulse 3s ease-in-out infinite",
            }} />}
            {sparks.map(p=>(
              <div key={p.id} style={{
                position:"absolute", left:`${p.x}%`, top:`${p.y}%`,
                width:4, height:4, borderRadius:"50%", background:"#FFD54F",
                animation:"sizzleSpark 0.6s forwards ease-out",
              }} />
            ))}
            <ShakeWrapper active={cooking&&!done} intensity={sizzle?2.5:1}>
              <div style={{
                width:150, height:44, borderRadius:22,
                background:`linear-gradient(90deg, ${ingredients.map(i=>i.color).join(", ")})`,
                border:`3px solid ${hasBurst?"#F44336":"#6D4C41"}`,
                boxShadow:cooking?`0 0 ${cookProgress/4}px rgba(255,107,53,${cookProgress/250}), inset 0 -4px 8px rgba(0,0,0,0.35)`:"inset 0 -4px 8px rgba(0,0,0,0.35)",
                position:"relative",
              }}>
                <div style={{ position:"absolute", top:3, left:8, right:8, height:"30%", background:"linear-gradient(180deg, rgba(255,255,255,0.15), transparent)", borderRadius:20 }} />
                {hasBurst && <div style={{
                  position:"absolute", top:-14, left:"30%",
                  fontFamily:"'Bangers', cursive", color:"#F44336", fontSize:16,
                  animation:"pulse 0.4s infinite", whiteSpace:"nowrap",
                  textShadow:"0 0 10px rgba(244,67,54,0.5)",
                }}>💥 BURST! 💥</div>}
              </div>
            </ShakeWrapper>
            <div style={{
              position:"absolute", right:-55, top:"50%", transform:"translateY(-50%)",
              width:55, height:18, background:"linear-gradient(180deg, #444, #2a2a2a)",
              borderRadius:"0 10px 10px 0", border:"2px solid #555", borderLeft:"none",
            }} />
          </div>
          {hasBurst && <div style={{ fontFamily:"'Bangers', cursive", fontSize:22, color:"#F44336", textShadow:"0 0 12px rgba(244,67,54,0.5)", animation:"popIn 0.4s" }}>Oh, we got a burst!</div>}
          <ProgressBar value={cookProgress} max={100} color={hasBurst?"#F44336":"#FF6B35"} label="COOK PROGRESS" />
          {!cooking && (
            <button onClick={()=>setCooking(true)} style={{
              fontFamily:"'Bangers', cursive", fontSize:24, padding:"14px 44px",
              background:"linear-gradient(135deg, #F44336, #B71C1C)", color:"#fff",
              border:"3px solid #EF9A9A", borderRadius:14, cursor:"pointer",
              boxShadow:"0 4px 18px rgba(244,67,54,0.5)",
            }}>🔥 START COOKING! 🔥</button>
          )}
          {done && <div style={{ fontFamily:"'Bangers', cursive", fontSize:24, color:"#4CAF50", animation:"popIn 0.4s" }}>✅ COOKED{hasBurst?" (with a burst!)":" PERFECTLY"}!</div>}
        </>
      )}
    </div>
  );
}

function TastePhase({ ingredients, hasBurst, onComplete }) {
  const [phase, setPhase] = useState("open");
  const [cutOpen, setCutOpen] = useState(false);
  const [rating, setRating] = useState(null);

  const calcRating = () => {
    let base = ingredients.reduce((a,i)=>a+i.tasteMod,0)/ingredients.length;
    const tex = ingredients.reduce((a,i)=>a+i.textureMod,0)/ingredients.length;
    base = base*0.6+tex*0.4;
    if (hasBurst) base -= 0.5;
    base += (Math.random()-0.5)*1.5;
    return Math.round(Math.max(0,Math.min(5,base)));
  };

  const openUp = () => {
    setCutOpen(true);
    setTimeout(()=>{setRating(calcRating());setPhase("rating");}, 1200);
  };

  const quotes = [
    "May God have mercy on my soul!",
    "It's... it's not great.",
    "Ehh, I've had worse.",
    "Hey, that's actually pretty decent!",
    "That's a darn good sausage!",
    "THIS IS THE GREATEST SAUSAGE EVER MADE!",
  ];

  return (
    <div style={{ padding:20, display:"flex", flexDirection:"column", alignItems:"center", gap:16, justifyContent:"center", animation:"fadeIn 0.4s ease-out" }}>
      <div style={{ fontFamily:"'Bangers', cursive", fontSize:28, color:"#FF6B35" }}>TASTE TEST</div>
      {phase==="open" && !cutOpen && (
        <>
          <div style={{ fontFamily:"'Patrick Hand', cursive", fontSize:18, color:"#FFD54F", textAlign:"center" }}>Let's open it up and see how we did!</div>
          <div style={{
            width:210, height:55, borderRadius:28, margin:"30px 0",
            background:`linear-gradient(90deg, ${ingredients.map(i=>i.color).join(", ")})`,
            border:"3px solid #6D4C41",
            boxShadow:"0 8px 20px rgba(0,0,0,0.5), inset 0 -4px 8px rgba(0,0,0,0.3), inset 0 4px 8px rgba(255,255,255,0.1)",
            position:"relative",
          }}>
            <div style={{ position:"absolute", top:3, left:10, right:10, height:"30%", background:"linear-gradient(180deg, rgba(255,255,255,0.15), transparent)", borderRadius:25 }} />
          </div>
          <button onClick={openUp} style={{
            fontFamily:"'Bangers', cursive", fontSize:22, padding:"14px 40px",
            background:"linear-gradient(135deg, #FF6B35, #D84315)", color:"#fff",
            border:"3px solid #FFD54F", borderRadius:12, cursor:"pointer",
          }}>🔪 CUT IT OPEN!</button>
        </>
      )}
      {phase==="open" && cutOpen && (
        <div style={{ display:"flex", gap:14, margin:"30px 0", alignItems:"center", animation:"fadeIn 0.5s" }}>
          <div style={{
            width:95, height:55, borderRadius:"28px 6px 6px 28px",
            background:`linear-gradient(90deg, ${ingredients[0]?.color||"#8D6E63"}, ${ingredients.length>1?ingredients[1].color:ingredients[0]?.color||"#A1887F"})`,
            border:"3px solid #6D4C41", boxShadow:"0 4px 12px rgba(0,0,0,0.4)",
            animation:"slideLeft 0.5s ease-out",
          }} />
          <div style={{ fontFamily:"'Bangers', cursive", color:"#FFD54F", fontSize:28, animation:"popIn 0.4s 0.2s both" }}>✂️</div>
          <div style={{
            width:95, height:55, borderRadius:"6px 28px 28px 6px",
            background:`linear-gradient(90deg, ${ingredients.length>1?ingredients[1].color:ingredients[0]?.color||"#A1887F"}, ${ingredients[ingredients.length-1]?.color||"#8D6E63"})`,
            border:"3px solid #6D4C41", boxShadow:"0 4px 12px rgba(0,0,0,0.4)",
            animation:"slideRight 0.5s ease-out",
          }} />
        </div>
      )}
      {phase==="rating" && rating!==null && (
        <div style={{ animation:"fadeIn 0.5s", display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
          <div style={{ fontFamily:"'Patrick Hand', cursive", fontSize:19, color:"#ccc", textAlign:"center", fontStyle:"italic", maxWidth:320 }}>
            "{quotes[rating]}"
          </div>
          <SausageRating count={rating} size={34} />
          <div style={{
            fontFamily:"'Bangers', cursive", fontSize:42,
            color:rating>=4?"#4CAF50":rating>=2?"#FFD54F":"#F44336",
            textShadow:`0 0 25px ${rating>=4?"rgba(76,175,80,0.5)":rating>=2?"rgba(255,213,79,0.5)":"rgba(244,67,54,0.5)"}`,
            animation:"popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)",
          }}>{rating}/5</div>
          <button onClick={()=>onComplete(rating)} style={{
            fontFamily:"'Bangers', cursive", fontSize:20, padding:"12px 36px",
            background:"linear-gradient(135deg, #FF6B35, #D84315)", color:"#fff",
            border:"3px solid #FFD54F", borderRadius:12, cursor:"pointer", marginTop:8,
          }}>SEE FINAL RESULTS 📋</button>
        </div>
      )}
    </div>
  );
}

function ResultsScreen({ ingredients, hasBurst, ruffalos, sausageRating, bonusPoints, onPlayAgain }) {
  const [showConfetti, setShowConfetti] = useState(false);
  const name = ingredients.map(i=>i.name).join(" & ")+" Sausage";
  let score = Math.round(((sausageRating/5)*60+(ruffalos/5)*20+(hasBurst?0:20)));
  score = Math.min(score+bonusPoints, 100);
  const titles = ["Sausage Disaster","Sausage Apprentice","Sausage Maker","Sausage Chef","Sausage Master","THE SAUSAGE KING"];
  const ti = Math.min(Math.floor(score/20), 5);
  useEffect(()=>{if(score>=60)setTimeout(()=>setShowConfetti(true),600);}, []);

  return (
    <div style={{ padding:24, display:"flex", flexDirection:"column", alignItems:"center", gap:16, animation:"fadeIn 0.5s" }}>
      <ConfettiExplosion active={showConfetti} />
      <div style={{ fontFamily:"'Bangers', cursive", fontSize:28, color:"#FF6B35" }}>SAUSAGE REPORT CARD</div>
      <div style={{
        background:"linear-gradient(135deg, #141414, #1a1a1a)", borderRadius:18, padding:22,
        width:"100%", maxWidth:380, border:"2px solid #252525",
        display:"flex", flexDirection:"column", gap:14, boxShadow:"0 8px 30px rgba(0,0,0,0.4)",
      }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"'Permanent Marker', cursive", fontSize:22, color:"#FFD54F" }}>{name}</div>
          <div style={{ display:"flex", gap:6, justifyContent:"center", marginTop:8 }}>
            {ingredients.map(i=><span key={i.name} style={{fontSize:28}}>{i.emoji}</span>)}
            <span style={{fontSize:28}}>→</span><span style={{fontSize:28}}>🌭</span>
          </div>
        </div>
        <div style={{height:1,background:"#252525"}} />
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div style={{fontFamily:"'Bangers', cursive",fontSize:13,color:"#888",marginBottom:6}}>TASTE RATING</div>
            <SausageRating count={sausageRating} />
            <div style={{fontFamily:"'Bangers', cursive",fontSize:20,color:"#FFD54F",textAlign:"center",marginTop:4}}>{sausageRating}/5</div>
          </div>
          <div>
            <div style={{fontFamily:"'Bangers', cursive",fontSize:13,color:"#888",marginBottom:6}}>WILL IT BLOW? RATING</div>
            <RuffaloRating count={ruffalos} />
            <div style={{fontFamily:"'Bangers', cursive",fontSize:14,color:"#66BB6A",textAlign:"center",marginTop:6}}>{ruffalos} Mark Ruffalo{ruffalos!==1?"s":""}</div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:"'Bangers', cursive",fontSize:13,color:"#888"}}>BURST STATUS</span>
            <span style={{fontFamily:"'Bangers', cursive",fontSize:16,color:hasBurst?"#F44336":"#4CAF50"}}>{hasBurst?"💥 BURST!":"✅ NO BURST!"}</span>
          </div>
          {bonusPoints>0 && (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:"'Bangers', cursive",fontSize:13,color:"#888"}}>BUT FIRST! BONUS</span>
              <span style={{fontFamily:"'Bangers', cursive",fontSize:16,color:"#FFD54F"}}>🎨 +{bonusPoints}%</span>
            </div>
          )}
        </div>
        <div style={{height:1,background:"#252525"}} />
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"'Bangers', cursive",fontSize:13,color:"#888"}}>OVERALL SCORE</div>
          <div style={{
            fontFamily:"'Bangers', cursive", fontSize:52,
            background:`linear-gradient(135deg, ${score>=60?"#4CAF50":score>=30?"#FFD54F":"#F44336"}, ${score>=60?"#1B5E20":score>=30?"#E65100":"#B71C1C"})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            animation:"popIn 0.6s 0.3s both cubic-bezier(0.34,1.56,0.64,1)",
          }}>{score}%</div>
          <div style={{fontFamily:"'Permanent Marker', cursive",fontSize:22,color:"#FF6B35",textShadow:"0 0 15px rgba(255,107,53,0.4)"}}>{titles[ti]}</div>
        </div>
      </div>
      <button onClick={onPlayAgain} style={{
        fontFamily:"'Bangers', cursive", fontSize:22, padding:"14px 44px",
        background:"linear-gradient(135deg, #FF6B35, #D84315)", color:"#fff",
        border:"3px solid #FFD54F", borderRadius:12, cursor:"pointer",
        boxShadow:"0 4px 18px rgba(255,107,53,0.5)", marginTop:6,
      }}>🌭 MAKE ANOTHER SAUSAGE! 🌭</button>
      <div style={{fontSize:11,color:"#444",fontStyle:"italic",textAlign:"center",maxWidth:300}}>Subscribe to Ordinary Sausage on YouTube for more sausage madness!</div>
    </div>
  );
}

// ==================== MAIN APP ====================

export default function OrdinarySausageGame() {
  const [gamePhase, setGamePhase] = useState("title");
  const [ingredients, setIngredients] = useState([]);
  const [hasBurst, setHasBurst] = useState(false);
  const [ruffalos, setRuffalos] = useState(0);
  const [sausageRating, setSausageRating] = useState(0);
  const [showButFirst, setShowButFirst] = useState(false);
  const [pendingPhase, setPendingPhase] = useState(null);
  const [bonusPoints, setBonusPoints] = useState(0);
  const butFirstUsed = useRef(false);

  const resetGame = () => {
    setGamePhase("title"); setIngredients([]); setHasBurst(false);
    setRuffalos(0); setSausageRating(0); setBonusPoints(0);
    setShowButFirst(false); setPendingPhase(null);
    butFirstUsed.current = false;
  };

  const tryButFirst = (nextPhase) => {
    if (!butFirstUsed.current && (nextPhase==="blow"||nextPhase==="cook") && Math.random()>0.4) {
      butFirstUsed.current = true;
      setPendingPhase(nextPhase);
      setShowButFirst(true);
    } else {
      setGamePhase(nextPhase);
    }
  };

  const handleButFirstComplete = (bonus) => {
    setBonusPoints(b=>b+bonus);
    setShowButFirst(false);
    if (pendingPhase) { setGamePhase(pendingPhase); setPendingPhase(null); }
  };

  const isPlaying = gamePhase!=="title" && gamePhase!=="results";

  // Mr. Sausage mood per phase
  const getMood = () => {
    if (gamePhase === "select") return "thinking";
    if (gamePhase === "grind") return "excited";
    if (gamePhase === "stuff") return "singing";
    if (gamePhase === "blow") return "nervous";
    if (gamePhase === "cook") return hasBurst ? "shocked" : "nervous";
    if (gamePhase === "taste") return "nervous";
    if (gamePhase === "results") return sausageRating >= 3 ? "proud" : "disgusted";
    return "happy";
  };

  return (
    <div style={{
      minHeight:"100vh", background:"#0a0a0a", color:"#fff",
      fontFamily:"'Patrick Hand', cursive", position:"relative", overflow:"hidden",
    }}>
      <FloatingParticles ingredients={ingredients.length?ingredients:null} />
      <div style={{
        position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
        backgroundImage:"radial-gradient(ellipse at 15% 50%, rgba(255,107,53,0.04) 0%, transparent 50%), radial-gradient(ellipse at 85% 20%, rgba(255,213,79,0.03) 0%, transparent 50%), radial-gradient(ellipse at 50% 90%, rgba(244,67,54,0.02) 0%, transparent 40%)",
      }} />

      {gamePhase!=="title" && (
        <div style={{
          background:"rgba(10,10,10,0.9)", borderBottom:"1px solid #1a1a1a",
          padding:"6px 16px", display:"flex", justifyContent:"space-between", alignItems:"center",
          position:"sticky", top:0, zIndex:20, backdropFilter:"blur(10px)",
        }}>
          <span style={{fontFamily:"'Bangers', cursive",color:"#FF6B35",fontSize:16}}>🌭 ORDINARY SAUSAGE</span>
          <button onClick={resetGame} style={{
            fontFamily:"'Bangers', cursive", fontSize:11, padding:"4px 12px",
            background:"transparent", color:"#666", border:"1px solid #333",
            borderRadius:6, cursor:"pointer",
          }}>START OVER</button>
        </div>
      )}

      {isPlaying && <PhaseTracker currentPhase={gamePhase} />}
      {showButFirst && <ButFirstEvent onComplete={handleButFirstComplete} />}

      {/* Mr. Sausage Avatar - visible during all gameplay phases */}
      {gamePhase !== "title" && !showButFirst && (
        <MrSausageAvatar phase={gamePhase} mood={getMood()} />
      )}

      <div style={{maxWidth:600, margin:"0 auto", position:"relative", zIndex:1}}>
        {gamePhase==="title" && <TitleScreen onStart={()=>setGamePhase("select")} />}
        {gamePhase==="select" && <IngredientSelect onSelect={ings=>{setIngredients(ings);setGamePhase("grind");}} />}
        {gamePhase==="grind" && <GrindPhase ingredients={ingredients} onComplete={()=>setGamePhase("stuff")} />}
        {gamePhase==="stuff" && <StuffPhase ingredients={ingredients} onComplete={()=>tryButFirst("blow")} />}
        {gamePhase==="blow" && <WillItBlow ingredients={ingredients} onComplete={r=>{setRuffalos(r);tryButFirst("cook");}} />}
        {gamePhase==="cook" && <CookPhase ingredients={ingredients} onComplete={burst=>{setHasBurst(burst);setGamePhase("taste");}} />}
        {gamePhase==="taste" && <TastePhase ingredients={ingredients} hasBurst={hasBurst} onComplete={r=>{setSausageRating(r);setGamePhase("results");}} />}
        {gamePhase==="results" && <ResultsScreen ingredients={ingredients} hasBurst={hasBurst} ruffalos={ruffalos} sausageRating={sausageRating} bonusPoints={bonusPoints} onPlayAgain={resetGame} />}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Permanent+Marker&family=Patrick+Hand&display=swap');
        @keyframes pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.05);} }
        @keyframes wobble { 0%,100%{transform:rotate(-3deg);} 50%{transform:rotate(3deg);} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px);} to{opacity:1;transform:translateY(0);} }
        @keyframes popIn { from{opacity:0;transform:scale(0.5);} to{opacity:1;transform:scale(1);} }
        @keyframes cardFadeIn { from{opacity:0;transform:scale(0.9) translateY(8px);} to{opacity:1;transform:scale(1) translateY(0);} }
        @keyframes splatIn { 0%{transform:scale(0);opacity:0;} 60%{transform:scale(1.4);opacity:1;} 100%{transform:scale(1);opacity:0.85;} }
        @keyframes particlePop { 0%{opacity:1;transform:translate(0,0) scale(1);} 100%{opacity:0;transform:translate(20px,-40px) scale(0.2) rotate(120deg);} }
        @keyframes sizzleSpark { 0%{opacity:1;transform:scale(1) translateY(0);} 100%{opacity:0;transform:scale(0) translateY(-20px);} }
        @keyframes floatParticle { 0%{transform:translateY(0) rotate(0deg);} 50%{transform:translateY(-30vh) rotate(180deg);} 100%{transform:translateY(-100vh) rotate(360deg);} }
        @keyframes sausageSpin { 0%,100%{transform:rotate(-5deg) scale(1);} 25%{transform:rotate(5deg) scale(1.05);} 50%{transform:rotate(-3deg) scale(1);} 75%{transform:rotate(4deg) scale(1.03);} }
        @keyframes butFirstSlam { 0%{transform:scale(3) rotate(-5deg);opacity:0;} 60%{transform:scale(0.9) rotate(1deg);opacity:1;} 100%{transform:scale(1) rotate(0deg);opacity:1;} }
        @keyframes confettiFall { 0%{transform:translate(0,0) rotate(0deg);opacity:1;} 100%{transform:translate(var(--vx),var(--vy)) rotate(720deg);opacity:0;} }
        @keyframes slideLeft { from{transform:translateX(20px);opacity:0;} to{transform:translateX(0);opacity:1;} }
        @keyframes slideRight { from{transform:translateX(-20px);opacity:0;} to{transform:translateX(0);opacity:1;} }
        @keyframes mrSausageEnter { from{opacity:0;transform:translateY(40px) scale(0.5);} to{opacity:1;transform:translateY(0) scale(1);} }
        @keyframes bubblePop { from{opacity:0;transform:scale(0.3) translateY(8px);} to{opacity:1;transform:scale(1) translateY(0);} }
        @keyframes sfxFloat { 0%{opacity:0.5;transform:scale(0.8) translateY(0);} 50%{opacity:0.35;} 100%{opacity:0;transform:scale(1.2) translateY(-30px);} }
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        body{margin:0;overflow-x:hidden;background:#0a0a0a;}
        button{transition:transform 0.15s, box-shadow 0.15s;}
        button:active{transform:scale(0.95) !important;}
        button:hover{filter:brightness(1.05);}
        ::-webkit-scrollbar{width:6px;}
        ::-webkit-scrollbar-track{background:#0a0a0a;}
        ::-webkit-scrollbar-thumb{background:#333;border-radius:3px;}
      `}</style>
    </div>
  );
}
