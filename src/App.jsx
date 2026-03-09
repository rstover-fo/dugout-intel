import { useState, useEffect, useCallback, useRef } from "react";

// --- Constants ---
const OUTS = new Set(["K", "GO", "FO"]);
const HITS = new Set(["1B", "2B", "3B", "HR"]);
const NON_AB = new Set(["BB", "HBP"]);
const isOut = (r) => OUTS.has(r);

const PITCHER_OUTCOMES = [["K","#34d399"],["GO","#34d399"],["FO","#34d399"],["1B","#eab308"],["2B","#eab308"],["3B","#ea580c"],["BB","#ef4444"],["HBP","#ef4444"]];
const BATTER_OUTCOMES = [["1B","#34d399"],["2B","#34d399"],["3B","#34d399"],["HR","#34d399"],["BB","#eab308"],["HBP","#eab308"],["K","#ef4444"],["GO","#ef4444"],["FO","#ef4444"]];
const ALL_OUTCOMES = ["K","GO","FO","1B","2B","3B","HR","BB","HBP"];
const QUICK_ALERTS = ["Move up in box","Slide step!","Mound visit","Be patient","Steal next pitch","Warm someone up","Infield in"];

const DAILY_PITCH_MAX = 75;
const WEEKEND_PITCH_MAX = 100;

const REST_TIERS = [
  { min: 1, max: 20, days: 0, label: "No rest" },
  { min: 21, max: 35, days: 1, label: "1 day" },
  { min: 36, max: 50, days: 2, label: "2 days" },
  { min: 51, max: 65, days: 3, label: "3 days" },
  { min: 66, max: 75, days: 4, label: "4 days" },
];

// --- Data ---
const OUR_PITCHERS = {
  "Sidor #1": { ppi:16.0, fps:55.8, bb:0.58, notes:"Ace. Most efficient. Quick delivery helps Quigley throw.", proj35:"2.2 inn", fatiguePoint:35 },
  "Grawunder #2": { ppi:22.8, fps:53.4, bb:0.88, notes:"Workhorse. Burns counts (22.8 P/IP). FPS fades after 28p.", proj35:"1.5 inn", fatiguePoint:28 },
  "C. Duhon #99": { ppi:25.7, fps:58.0, bb:1.26, notes:"Highest fresh FPS (66%) but falls fastest. Watch after 30p. 12 WP in 8 GP.", proj35:"1.4 inn", fatiguePoint:28 },
  "Corriveau #23": { ppi:29.6, fps:42.5, bb:2.0, notes:"1 inning max. 42.5% FPS. Use with empty bases only.", proj35:"1.2 inn", fatiguePoint:25 },
  "Bell #12": { ppi:37.0, fps:41.8, bb:2.32, notes:"Emergency only. 37 P/IP worst on staff. If walks 2, pull.", proj35:"0.9 inn", fatiguePoint:25 },
  "Quigley #14": { ppi:0, fps:0, bb:0, notes:"No pitching data. Power bat (.778 SLG). Catcher.", proj35:"--", fatiguePoint:30 },
  "Stover #21": { ppi:0, fps:0, bb:0, notes:"No pitching data. RISP killer (.478). Good contact.", proj35:"--", fatiguePoint:30 },
  "A. Duhon #17": { ppi:0, fps:0, bb:0, notes:"No pitching data. Walk machine (.469 OBP). Speed.", proj35:"--", fatiguePoint:30 },
  "Carver #3": { ppi:0, fps:0, bb:0, notes:"No pitching data. Good eye (.462 OBP). GB hitter.", proj35:"--", fatiguePoint:30 },
  "Lovett #0": { ppi:0, fps:0, bb:0, notes:"No pitching data. Project player. 22% contact.", proj35:"--", fatiguePoint:30 },
};

const OUR_BATTING_ORDER = [
  { name:"C. Duhon #99", order:1, avg:.489, obp:.631, slg:.723, risp:.400, so:7, bb:18, sb:39, ct:78, notes:"Leadoff engine. .631 OBP. 39 SB at 95%+." },
  { name:"Corriveau #23", order:2, avg:.343, obp:.566, slg:.429, risp:.333, so:7, bb:16, sb:15, ct:72, notes:"Elite discipline. 2.286 BB/K. Draws walks, moves runners." },
  { name:"Bell #12", order:3, avg:.362, obp:.545, slg:.468, risp:.292, so:18, bb:18, sb:22, ct:62, notes:"59.1% QAB. Great eye. RISP dips to .292 -- might press." },
  { name:"Sidor #1", order:4, avg:.533, obp:.625, slg:.622, risp:.621, so:7, bb:10, sb:20, ct:84, notes:"CLUTCH. .621 RISP best on team. 84% contact. Want him up with runners on." },
  { name:"Quigley #14", order:5, avg:.500, obp:.545, slg:.778, risp:.400, so:13, bb:6, sb:13, ct:76, notes:"Power bat. .778 SLG, 11 XBH. Swings for fences." },
  { name:"Stover #21", order:6, avg:.298, obp:.404, slg:.319, risp:.478, so:9, bb:8, sb:27, ct:81, notes:"RISP KILLER. .478 RISP 2nd best. 81% contact. Puts ball in play." },
  { name:"Grawunder #2", order:7, avg:.375, obp:.508, slg:.417, risp:.333, so:11, bb:10, sb:13, ct:70, notes:"Solid .508 OBP. Only 2 XBH. Good baserunner." },
  { name:"A. Duhon #17", order:8, avg:.227, obp:.469, slg:.227, risp:.182, so:11, bb:20, sb:33, ct:55, notes:"Walk machine (20 BB). But .182 RISP worst. 65.6% GB rate." },
  { name:"Carver #3", order:9, avg:.282, obp:.462, slg:.282, risp:.300, so:8, bb:13, sb:18, ct:68, notes:"Good eye .462 OBP. 0 XBH, 79.3% GB. 15 RBI despite no XBH." },
  { name:"Lovett #0", order:10, avg:.111, obp:.385, slg:.111, risp:.000, so:7, bb:3, sb:3, ct:22, notes:"Project. 22% contact. Gets on via walks/HBP." },
];

const SCOUTED_TEAMS = {
  "GBA Tigres 9U": [
    {name:"Alex R",number:"",pos:"SS",avg:.800,obp:.857,so:0,sb:11,xbh:6,threat:"elite",notes:"Best player. 0 SO. Will steal every base. Closer (6K,0H,61% strikes).",def:"Play to pull. Shift SS toward 2B hole. Quigley must throw."},
    {name:"George H",number:"10",pos:"1B/P",avg:.636,obp:.667,so:1,sb:13,xbh:0,threat:"high",notes:"13 SB. All singles. Pitching: 45% strikes, be patient.",def:"Normal depth. Infield in only with runner on 3rd."},
    {name:"Sammy R",number:"7",pos:"C/P",avg:.444,obp:.643,so:0,sb:8,xbh:0,threat:"high",notes:"0 SO all season. Primary pitcher (8 SO in 5 IP).",def:"Expect ball in play every AB. OF medium depth."},
    {name:"Idris R",number:"1",pos:"C/3B/P",avg:.375,obp:.615,so:1,sb:10,xbh:1,threat:"medium",notes:"10 SB, 3 E. Pitching: 9 BB/3 IP, 34% strikes. DONT SWING.",def:"Normal. Error-prone, expect rushed throws."},
    {name:"Peyton C",number:"3",pos:"CF/3B",avg:.429,obp:.556,so:4,sb:9,xbh:1,threat:"medium",notes:"Can K (4 SO). 9 SB. Pitches relief.",def:"Can strike out. Normal alignment."},
    {name:"Griffin K",number:"31",pos:"2B",avg:.125,obp:.364,so:3,sb:5,xbh:0,threat:"low",notes:".125 AVG. Attack with strikes.",def:"Attack zone. OF shallow."},
    {name:"Ashford S",number:"27",pos:"1B/CF",avg:.200,obp:.273,so:3,sb:7,xbh:0,threat:"low",notes:".200 AVG worst OBP. 2 errors 1B.",def:"Attack. Shallow OF."},
    {name:"Jude W",number:"11",pos:"RF",avg:.250,obp:.400,so:5,sb:2,xbh:0,threat:"low",notes:"5 SO in 10 PA. Swing and miss.",def:"Attack. Expect K."},
    {name:"Levi B",number:"21",pos:"LF",avg:.000,obp:.500,so:5,sb:1,xbh:0,threat:"low",notes:"0 hits. 5 SO. Zero bat threat.",def:"Throw strikes. Shallow OF."},
    {name:"Luke R",number:"",pos:"OF",avg:.500,obp:.667,so:0,sb:1,xbh:0,threat:"medium",notes:"Limited data (2 GP).",def:"Normal. Small sample."},
  ],
  "LBC Central Zubia 9U": [
    {name:"Jax K #99",number:"99",pos:"SS/P/3B",avg:0.571,obp:0.75,so:1,sb:8,xbh:3,threat:"elite",notes:"Top hitter (0.571 AVG). Patient (5 BB). SPEED THREAT: 8 SB. Has XBH power (2x2B, 1x3B). ERROR PRONE: 5 errors in 6 GP. When pitching: 44% strikes -- BE PATIENT, walks are free. Wild (6 BB in 2.0 IP). Pitching: 44% strikes, 4K/6BB in 2.0IP.",def:"Normal depth, expect ball in play. STEAL WATCH: 8 SB. Hold runners tight. Has gap power. OF medium-deep."},
    {name:"Freddy S #9",number:"9",pos:"CF/1B/LF",avg:0.5,obp:0.636,so:1,sb:2,xbh:1,threat:"elite",notes:"Top hitter (0.500 AVG). 2 errors. When pitching: 62% strikes, respectable. Pitching: 62% strikes, 4K/3BB in 2.2IP.",def:"Normal depth, expect ball in play."},
    {name:"Kai M #34",number:"34",pos:"RF/P/LF",avg:0.286,obp:0.545,so:4,sb:6,xbh:0,threat:"high",notes:"Decent bat (0.286). Strikeout prone (4 SO in 11 PA). Patient (4 BB). SPEED THREAT: 6 SB. When pitching: 60% strikes, respectable. Pitching: 60% strikes, 4K/3BB in 2.6000000000000005IP.",def:"Normal alignment. STEAL WATCH: 6 SB. Hold runners tight. Can strike out. Go after him."},
    {name:"Ford G #4",number:"4",pos:"2B/3B/CF",avg:0.364,obp:0.5,so:2,sb:6,xbh:1,threat:"high",notes:"Decent bat (0.364). SPEED THREAT: 6 SB. When pitching: 30% strikes -- BE PATIENT, walks are free. Pitching: 30% strikes, 0K/4BB in 0.0IP.",def:"Normal alignment. STEAL WATCH: 6 SB. Hold runners tight."},
    {name:"CJ S #25",number:"25",pos:"C/3B/P",avg:0.429,obp:0.467,so:0,sb:4,xbh:0,threat:"high",notes:"Top hitter (0.429 AVG). ZERO strikeouts -- puts ball in play. Runs well (4 SB). ERROR PRONE: 5 errors in 6 GP. When pitching: 56% strikes, respectable. Pitching: 56% strikes, 1K/3BB in 1.1IP.",def:"Normal depth, expect ball in play."},
    {name:"Koda K #7",number:"7",pos:"1B/P/RF",avg:0.222,obp:0.364,so:4,sb:2,xbh:1,threat:"medium",notes:"Strikeout prone (4 SO in 11 PA). 2 errors. When pitching: 52% strikes, average. Pitching: 52% strikes, 0K/4BB in 1.3IP.",def:"Normal alignment. Can strike out. Go after him."},
    {name:"AJ H #3",number:"3",pos:"C/3B/SS",avg:0.25,obp:0.308,so:2,sb:1,xbh:0,threat:"medium",notes:"Decent bat (0.250). ERROR PRONE: 7 errors in 6 GP. When pitching: 51% strikes, average. Pitching: 51% strikes, 4K/3BB in 1.1IP.",def:"Normal alignment."},
    {name:"CJ T #44",number:"44",pos:"2B/LF/P",avg:0.125,obp:0.3,so:2,sb:4,xbh:0,threat:"low",notes:"Weak bat (0.125). Runs well (4 SB). 2 errors. When pitching: 47% strikes, average. Wild (8 BB in 4.1 IP). Pitching: 47% strikes, 5K/8BB in 4.1IP.",def:"Attack zone. OF shallow."},
    {name:"Anthony E #10",number:"10",pos:"LF/2B/P",avg:0.0,obp:0.3,so:5,sb:4,xbh:0,threat:"low",notes:"Weak bat (0.000). Strikeout prone (5 SO in 10 PA). Runs well (4 SB). 3 errors. When pitching: 37% strikes -- BE PATIENT, walks are free. Wild (11 BB in 1.2 IP). Pitching: 37% strikes, 2K/11BB in 1.2IP.",def:"Attack zone. OF shallow. Can strike out. Go after him."},
    {name:"Matteo M #13",number:"13",pos:"CF/LF/RF",avg:0.2,obp:0.2,so:0,sb:1,xbh:1,threat:"medium",notes:"ZERO strikeouts -- puts ball in play.",def:"Normal alignment."}
  ],
  "1836 Roughriders Vega 9U": [
    {name:"Elijah M #18",number:"18",pos:"RF/LF/18",avg:0.0,obp:0.714,so:2,sb:4,xbh:0,threat:"high",notes:"Patient (4 BB). Gets HBP (1x). Runs well (4 SB).",def:"Normal alignment."},
    {name:"Charlie K #10",number:"10",pos:"CF/C/LF",avg:0.444,obp:0.615,so:0,sb:10,xbh:1,threat:"elite",notes:"Top hitter (0.444 AVG). ZERO K -- puts ball in play. Gets HBP (2x). SPEED THREAT: 10 SB. HOME RUN HITTER. Pitching: 46% strikes, avg. Has K stuff (5K). Wild (5BB in 2.2IP). Pitching: 46%STR, 5K/5BB in 2.2IP.",def:"Respect this hitter. Normal depth. STEAL WATCH: 10 SB. HR power. OF deep."},
    {name:"Jaxon B #36",number:"36",pos:"2B/P/LF",avg:0.444,obp:0.583,so:2,sb:5,xbh:1,threat:"elite",notes:"Top hitter (0.444 AVG). Patient (3 BB). SPEED THREAT: 5 SB. Pitching: 43% strikes -- BE PATIENT. Has K stuff (5K). Wild (4BB in 3.0IP). Pitching: 43%STR, 5K/4BB in 3.0IP.",def:"Respect this hitter. Normal depth. STEAL WATCH: 5 SB."},
    {name:"Tamanaco A #5",number:"5",pos:"LF/P/RF",avg:0.5,obp:0.556,so:0,sb:6,xbh:1,threat:"elite",notes:"Top hitter (0.500 AVG). ZERO K -- puts ball in play. SPEED THREAT: 6 SB. Pitching: 50% strikes, avg. Pitching: 50%STR, 0K/2BB in 2.0IP.",def:"Respect this hitter. Normal depth. STEAL WATCH: 6 SB."},
    {name:"Matthew E #87",number:"87",pos:"SS/P/3B",avg:0.375,obp:0.545,so:3,sb:4,xbh:2,threat:"high",notes:"Decent bat (0.375). Patient (3 BB). Runs well (4 SB). XBH power (1x2B, 1x3B, 0xHR). 2 errors. Pitching: 51% strikes, avg. Has K stuff (5K). Wild (4BB in 2.3IP). Pitching: 51%STR, 5K/4BB in 2.3IP.",def:"Normal alignment. Gap power. OF medium-deep."},
    {name:"Maverick T #28",number:"28",pos:"1B/P/RF",avg:0.167,obp:0.5,so:5,sb:3,xbh:0,threat:"high",notes:"Strikeout prone (5 SO). Gets HBP (2x). Runs well (3 SB). ERROR PRONE: 3E in 6GP. Pitching: 47% strikes, avg. Has K stuff (7K). Wild (8BB in 1.5IP). Pitching: 47%STR, 7K/8BB in 1.5IP.",def:"Normal alignment. Can K. Go after him."},
    {name:"Bryce B #27",number:"27",pos:"RF/2B/LF",avg:0.286,obp:0.444,so:4,sb:1,xbh:1,threat:"medium",notes:"Decent bat (0.286). Strikeout prone (4 SO). 2 errors. Pitching: 55% strikes. Has K stuff (6K). Pitching: 55%STR, 6K/2BB in 3.1IP.",def:"Normal alignment. Can K. Go after him."},
    {name:"Jalen W #1",number:"1",pos:"CF/3B/LF",avg:0.111,obp:0.333,so:3,sb:8,xbh:0,threat:"medium",notes:"Patient (3 BB). SPEED THREAT: 8 SB. Pitching: 56% strikes. Pitching: 56%STR, 2K/1BB in 1.2IP.",def:"Normal alignment. STEAL WATCH: 8 SB."},
    {name:"Mateo C #7",number:"7",pos:"SS/3B/P",avg:0.111,obp:0.333,so:2,sb:7,xbh:0,threat:"low",notes:"Patient (3 BB). SPEED THREAT: 7 SB. Pitching: 57% strikes. Wild (4BB in 3.1IP). Pitching: 57%STR, 3K/4BB in 3.1IP.",def:"Normal alignment. STEAL WATCH: 7 SB."},
    {name:"Decker A #14",number:"14",pos:"C/1B/3B",avg:0.0,obp:0.333,so:2,sb:0,xbh:0,threat:"low",notes:"Can't hit (0.000). Gets HBP (1x).",def:"Attack zone. Shallow OF."},
    {name:"Jean U #11",number:"11",pos:"2B/11",avg:0.0,obp:0.286,so:5,sb:0,xbh:0,threat:"low",notes:"Can't hit (0.000). Strikeout prone (5 SO). ERROR PRONE: 3E in 6GP.",def:"Attack zone. Shallow OF. Can K. Go after him."}
  ]
};

// --- Helpers ---
function getRestInfo(pitchCount) {
  if (pitchCount === 0) return { days: 0, label: "Available" };
  for (const tier of REST_TIERS) {
    if (pitchCount >= tier.min && pitchCount <= tier.max) return tier;
  }
  return { days: 4, label: "4+ days" };
}

function getNextThreshold(pitchCount) {
  for (const tier of REST_TIERS) {
    if (pitchCount < tier.max) return { threshold: tier.max, nextRestDays: getRestInfo(tier.max + 1).days };
  }
  return null;
}

function calcPct(num, den) {
  return den > 0 ? ((num / den) * 100).toFixed(0) : "--";
}

function arrayAvg(arr) {
  return arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "--";
}

function arrayPeak(arr) {
  return arr.length > 0 ? Math.max(...arr).toFixed(1) : "--";
}

function tierColor(value, thresholds) {
  for (const [limit, color] of thresholds) {
    if (value <= limit) return color;
  }
  return thresholds[thresholds.length - 1][1];
}

function threatColors(threat) {
  if (threat === "elite") return { bg: "#2a0a0a", border: "#dc2626", text: "#fca5a5", label: "ELITE" };
  if (threat === "high") return { bg: "#2a1a0a", border: "#ea580c", text: "#fdba74", label: "HIGH" };
  if (threat === "medium") return { bg: "#2a2a0a", border: "#ca8a04", text: "#fde047", label: "MED" };
  return { bg: "#0a2a15", border: "#16a34a", text: "#86efac", label: "LOW" };
}

// --- Audio (single shared context) ---
let _audioCtx = null;
function beep(freq) {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.connect(gain);
    gain.connect(_audioCtx.destination);
    osc.frequency.value = freq;
    gain.gain.value = 0.12;
    osc.start();
    osc.stop(_audioCtx.currentTime + 0.1);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  } catch (e) {}
}

// --- Persistence ---
async function loadData() {
  try { const r = await window.storage.get('di-v5'); if (r && r.value) return JSON.parse(r.value); } catch (e) {}
  return null;
}
async function saveData(d) {
  try { await window.storage.set('di-v5', JSON.stringify(d)); } catch (e) {}
}

// --- Clipboard helper ---
function copyToClipboard(text, addAlert, msg = "Copied!") {
  navigator.clipboard?.writeText(text);
  addAlert(msg, "info");
}

// --- Extracted Components ---
const MONO_FONT = { fontFamily: "'SF Mono','JetBrains Mono','Fira Code',monospace" };

function StatBox({ value, label, color = "#34d399", fontSize, theme }) {
  return (
    <div style={{ textAlign: "center", padding: "7px 4px", background: theme.inp, borderRadius: 6, border: `1px solid ${color}20` }}>
      <div style={{ fontSize: fontSize || 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8, color: theme.sub, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function VeloChart({ velocities, maxBars = 35, barHeight = 0.5, barWidth = 5, height = 50 }) {
  const peak = velocities.length > 0 ? Math.max(...velocities) : 0;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height }}>
      {velocities.slice(-maxBars).map((v, i) => {
        const pct = peak > 0 ? v / peak * 100 : 50;
        return <div key={i} style={{ height: Math.max(6, pct * barHeight), width: barWidth, borderRadius: 2, background: pct > 92 ? "#34d399" : pct > 85 ? "#eab308" : "#ef4444" }} />;
      })}
    </div>
  );
}

function ResultPills({ results, outBg = "#081814", hitBg = "#0a1a10", outColor = "#ef4444", hitColor = "#34d399" }) {
  if (results.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 3, marginTop: 3, flexWrap: "wrap" }}>
      {results.map((r, j) => (
        <span key={j} style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: isOut(r) ? outBg : hitBg, color: isOut(r) ? outColor : hitColor }}>{r}</span>
      ))}
    </div>
  );
}

function OutcomeButtons({ outcomes, onClick, styles }) {
  return (
    <div style={{ display: "flex", gap: 3, marginTop: 3, flexWrap: "wrap" }}>
      {outcomes.map(([result, color]) => (
        <button key={result} style={{ ...styles.btn(color, true), padding: "3px 6px", fontSize: 8 }} onClick={() => onClick(result)}>{result}</button>
      ))}
    </div>
  );
}

function ProgressBar({ value, max, height = 16, thresholdMarkers = [] }) {
  const pct = Math.min(value / max * 100, 100);
  const barColor = pct >= 88 ? "linear-gradient(90deg,#ef4444,#dc2626)" : pct >= 68 ? "linear-gradient(90deg,#ea580c,#ef4444)" : pct >= 48 ? "linear-gradient(90deg,#eab308,#ea580c)" : pct >= 28 ? "linear-gradient(90deg,#34d399,#eab308)" : "#34d399";
  return (
    <div style={{ height, background: "#060c16", borderRadius: 8, overflow: "hidden", position: "relative" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 8, transition: "width 0.3s" }} />
      {thresholdMarkers.map(x => (
        <div key={x} style={{ position: "absolute", left: `${x / max * 100}%`, top: 0, height: "100%", width: 1, background: "#ffffff30" }} />
      ))}
    </div>
  );
}

// --- Main App ---
export default function App() {
  // Core UI
  const [activeTab, setActiveTab] = useState("pitching");
  const [dark, setDark] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const alertIdRef = useRef(0);
  const [ready, setReady] = useState(false);

  // Teams
  const [allTeams, setAllTeams] = useState(SCOUTED_TEAMS);
  const [activeTeam, setActiveTeam] = useState("GBA Tigres 9U");

  // Pitching
  const [pitcherName, setPitcherName] = useState("Sidor #1");
  const [pitchLog, setPitchLog] = useState([]);
  const [velocities, setVelocities] = useState([]);
  const [outs, setOuts] = useState(0);
  const [inning, setInning] = useState(1);
  const prevPitchCount = useRef(0);
  const prevFpsAlert = useRef(null);
  const prevVeloDropAlert = useRef(null);

  // Scouting
  const [currentHitter, setCurrentHitter] = useState(null);
  const [liveAtBats, setLiveAtBats] = useState({});
  const [coachMessages, setCoachMessages] = useState([]);

  // Manage teams
  const [manageView, setManageView] = useState("list");
  const [editTeamName, setEditTeamName] = useState("");
  const [editPlayers, setEditPlayers] = useState([]);
  const [newPlayerForm, setNewPlayerForm] = useState({ name: "", number: "", pos: "", avg: "", obp: "", so: "", sb: "", notes: "", def: "" });

  // Game state
  const [pitcherAvailability, setPitcherAvailability] = useState({});
  const [ourScore, setOurScore] = useState(0);
  const [theirScore, setTheirScore] = useState(0);

  // Opponent pitcher tracking
  const [oppPitcherName, setOppPitcherName] = useState("");
  const [oppPitchCount, setOppPitchCount] = useState(0);
  const [oppStrikes, setOppStrikes] = useState(0);
  const [oppBalls, setOppBalls] = useState(0);
  const [oppVelocities, setOppVelocities] = useState([]);
  const [oppVeloInput, setOppVeloInput] = useState("");

  // Our at-bat results
  const [ourAtBats, setOurAtBats] = useState({});

  // Pitcher done report
  const [doneReport, setDoneReport] = useState(null);
  const [pitcherOutcomes, setPitcherOutcomes] = useState([]);
  const [weeklyPitchCounts, setWeeklyPitchCounts] = useState({});
  const [weeklyPitcherSelect, setWeeklyPitcherSelect] = useState("");
  const [weeklyPitchInput, setWeeklyPitchInput] = useState("");

  // Opponent pitch budgets
  const [oppBudgets, setOppBudgets] = useState({});
  const [budgetTeamName, setBudgetTeamName] = useState("");
  const [budgetAddForm, setBudgetAddForm] = useState({ name: "", pitches: "" });

  // Velocity input for our pitcher
  const [veloInput, setVeloInput] = useState("");

  // --- Persistence ---
  useEffect(() => {
    loadData().then(d => {
      const userTeams = (d && d.teams) ? d.teams : {};
      const merged = { ...userTeams, ...SCOUTED_TEAMS };
      setAllTeams(merged);
      const keys = Object.keys(merged);
      if (d && d.acT && keys.includes(d.acT)) setActiveTeam(d.acT);
      else setActiveTeam(keys[0] || "GBA Tigres 9U");
      if (d && d.pAv) setPitcherAvailability(d.pAv);
      if (d && d.oppBudget) setOppBudgets(d.oppBudget);
      if (d && d.weekPC) setWeeklyPitchCounts(d.weekPC);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) saveData({ teams: allTeams, acT: activeTeam, pAv: pitcherAvailability, oppBudget: oppBudgets, weekPC: weeklyPitchCounts });
  }, [allTeams, activeTeam, pitcherAvailability, oppBudgets, weeklyPitchCounts, ready]);

  // --- Derived values ---
  const scoutedRoster = allTeams[activeTeam] || [];
  const currentPitcherProfile = OUR_PITCHERS[pitcherName] || null;

  const addAlert = useCallback((msg, type = "info") => {
    const id = ++alertIdRef.current;
    setAlerts(prev => [{ id, msg, type }, ...prev].slice(0, 30));
    if (type === "danger") beep(880);
    else if (type === "warning") beep(440);
  }, []);

  const addCoachMsg = useCallback((msg) => {
    setCoachMessages(prev => [{ msg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...prev].slice(0, 50));
  }, []);

  // Pitch stats (derived from pitchLog)
  const pitchCount = pitchLog.length;
  const strikeCount = pitchLog.filter(p => p.s).length;
  const strikePct = calcPct(strikeCount, pitchCount);

  // Batters-faced and FPS tracking
  const battersFaced = [];
  let currentBatter = [];
  pitchLog.forEach((p, i) => {
    if (p.nb && i > 0) { battersFaced.push({ fps: currentBatter[0]?.s || false }); currentBatter = []; }
    currentBatter.push(p);
  });
  if (currentBatter.length > 0) battersFaced.push({ fps: currentBatter[0]?.s || false });

  const totalBattersFaced = battersFaced.length;
  const fpsOverall = calcPct(battersFaced.filter(b => b.fps).length, totalBattersFaced);
  const last5BF = battersFaced.slice(-5);
  const fpsLast5 = last5BF.length >= 3 ? calcPct(last5BF.filter(b => b.fps).length, last5BF.length) : "--";

  // Velocity stats
  const avgVelo = arrayAvg(velocities);
  const peakVelo = arrayPeak(velocities);
  const recentVelos = velocities.slice(-5);
  const recentAvgVelo = arrayAvg(recentVelos);
  const veloDropPct = velocities.length >= 5 && +peakVelo > 0 ? ((1 - recentAvgVelo / peakVelo) * 100).toFixed(1) : null;

  // Rest info
  const restInfo = getRestInfo(pitchCount);
  const nextThreshold = getNextThreshold(pitchCount);

  // --- Alert effects ---
  useEffect(() => {
    const prev = prevPitchCount.current;
    if (pitchCount !== prev) {
      if (currentPitcherProfile && pitchCount === currentPitcherProfile.fatiguePoint && prev < currentPitcherProfile.fatiguePoint) {
        addAlert(`${pitcherName} at fatigue point (${currentPitcherProfile.fatiguePoint}p)`, "warning");
        addCoachMsg(`${pitcherName} hitting fatigue at ${currentPitcherProfile.fatiguePoint}p. Watch for wildness.`);
      }
      if (nextThreshold && pitchCount === nextThreshold.threshold && prev < nextThreshold.threshold) {
        addAlert(`${pitcherName} crossed ${nextThreshold.threshold}p -- now ${nextThreshold.nextRestDays} rest days`, "danger");
        addCoachMsg(`${pitcherName} over ${nextThreshold.threshold}p. ${nextThreshold.nextRestDays} rest days required.`);
      }
      if (pitchCount === 35 && prev < 35) { addAlert(`${pitcherName} at 35 -- 1d rest. +1 more=2d!`, "danger"); addCoachMsg(`${pitcherName} at 35. 1d rest. ONE MORE=2d.`); }
      if (pitchCount === 50 && prev < 50) { addAlert(`${pitcherName} at 50 -- 2d rest`, "danger"); addCoachMsg(`${pitcherName} AT 50. 2d rest.`); }
      if (pitchCount === 65 && prev < 65) { addAlert(`${pitcherName} at 65 -- 3d rest. +1=4d!`, "danger"); addCoachMsg(`${pitcherName} AT 65. 3d. +1=4d!`); }
      if (pitchCount === 75 && prev < 75) { addAlert(`${pitcherName} at 75 PG MAX`, "danger"); addCoachMsg(`${pitcherName} AT 75 PG MAX. PULL.`); }
      prevPitchCount.current = pitchCount;
    }
  }, [pitchCount, pitcherName, addAlert, addCoachMsg, currentPitcherProfile, nextThreshold]);

  useEffect(() => {
    if (fpsLast5 !== "--" && +fpsLast5 < 40 && fpsLast5 !== prevFpsAlert.current && last5BF.length >= 3) {
      addAlert(`${pitcherName} FPS at ${fpsLast5}%`, "warning");
      addCoachMsg(`${pitcherName} FPS ${fpsLast5}% last 5 BF.`);
    }
    prevFpsAlert.current = fpsLast5;
  }, [fpsLast5, pitcherName, addAlert, addCoachMsg, last5BF.length]);

  useEffect(() => {
    if (veloDropPct && +veloDropPct > 8 && veloDropPct !== prevVeloDropAlert.current) {
      addAlert(`${pitcherName} velo down ${veloDropPct}%`, "danger");
      addCoachMsg(`${pitcherName} velo -${veloDropPct}%. Peak ${peakVelo}, now ${recentAvgVelo}.`);
    }
    prevVeloDropAlert.current = veloDropPct;
  }, [veloDropPct, pitcherName, peakVelo, recentAvgVelo, addAlert, addCoachMsg]);

  // --- Actions ---
  const logPitch = (isStrike, velo) => {
    const newBatter = pitchLog.length === 0 || pitchLog[pitchLog.length - 1]?.end;
    setPitchLog(prev => [...prev, { s: isStrike, nb: newBatter, end: false }]);
    if (velo && velo > 0) setVelocities(prev => [...prev, velo]);
  };

  const endAtBat = (result) => {
    setPitchLog(prev => { const u = [...prev]; if (u.length > 0) u[u.length - 1] = { ...u[u.length - 1], end: true }; return u; });
    setPitcherOutcomes(prev => [...prev, result]);
    if (currentHitter !== null && scoutedRoster[currentHitter]) {
      const name = scoutedRoster[currentHitter].name;
      setLiveAtBats(prev => ({ ...prev, [name]: [...(prev[name] || []), result] }));
    }
  };

  const recordOut = (result) => {
    endAtBat(result);
    if (outs + 1 >= 3) {
      setOuts(0);
      setInning(prev => prev + 1);
      addAlert(`End inn ${inning}. ${pitcherName} at ${pitchCount}p.`, "info");
    } else {
      setOuts(outs + 1);
    }
  };

  const resetPitcher = () => {
    if (pitchCount > 0) {
      setPitcherAvailability(prev => ({ ...prev, [pitcherName]: { pc: pitchCount, dt: new Date().toISOString().split('T')[0] } }));
      const counts = {};
      pitcherOutcomes.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
      const parts = [];
      ALL_OUTCOMES.forEach(r => { if (counts[r]) parts.push(`${counts[r]}${r}`); });
      const veloStr = velocities.length > 0 ? `, Avg ${arrayAvg(velocities)} mph` : "";
      const report = `${pitcherName}: ${pitchCount}p, ${calcPct(strikeCount, pitchCount)}% strikes, ${fpsOverall}% FPS, ${totalBattersFaced} BF${veloStr}. ${parts.join(", ")}`;
      setDoneReport(report);
      addCoachMsg(report);
    }
    setPitchLog([]);
    setVelocities([]);
    setOuts(0);
    setPitcherOutcomes([]);
    prevPitchCount.current = 0;
    prevFpsAlert.current = null;
    prevVeloDropAlert.current = null;
  };

  const saveTeam = (name, players) => {
    setAllTeams(prev => ({ ...prev, [name]: players }));
    setActiveTeam(name);
    addAlert(`Saved: ${name} (${players.length}p)`, "info");
  };

  const deleteTeam = (name) => {
    setAllTeams(prev => { const copy = { ...prev }; delete copy[name]; return copy; });
    const remaining = Object.keys(allTeams).filter(k => k !== name);
    if (remaining.length > 0) setActiveTeam(remaining[0]);
  };

  const logOpponentPitch = (isStrike) => {
    setOppPitchCount(prev => prev + 1);
    if (isStrike) setOppStrikes(prev => prev + 1);
    else setOppBalls(prev => prev + 1);
    if (oppVeloInput) setOppVelocities(prev => [...prev, parseFloat(oppVeloInput)]);
    setOppVeloInput("");
  };

  const logOurAtBat = (name, result) => {
    setOurAtBats(prev => ({ ...prev, [name]: [...(prev[name] || []), result] }));
  };

  // --- Theming ---
  const D = dark;
  const theme = {
    bg: D ? "#080c14" : "#f5f5f0", fg: D ? "#d0d8e4" : "#1a1a1a", card: D ? "#0e1824" : "#ffffff",
    bdr: D ? "#1c3050" : "#d4d4d4", sub: D ? "#3a5a70" : "#888888", inp: D ? "#060c16" : "#f0f0ea",
    accent: "#34d399", hdr: D ? "linear-gradient(135deg,#0c1420,#14243a)" : "linear-gradient(135deg,#e8f5e9,#c8e6c9)",
    tabBg: D ? "#0a1018" : "#eaeae4", note: D ? "#6a8a9a" : "#555555", noteBg: D ? "#060c16" : "#f0f0ea",
    altBg: D ? "#8aa0b8" : "#444444",
  };
  const styles = {
    card: { background: theme.card, borderRadius: 8, border: `1px solid ${theme.bdr}`, padding: 12, marginBottom: 8 },
    label: { fontSize: 10, fontWeight: 700, color: theme.accent, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
    grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 },
    input: { ...MONO_FONT, background: theme.inp, border: `1px solid ${theme.bdr}`, borderRadius: 5, padding: "7px 9px", color: theme.fg, fontSize: 12, width: "100%", outline: "none" },
    select: { ...MONO_FONT, background: theme.inp, border: `1px solid ${theme.bdr}`, borderRadius: 5, padding: "7px 9px", color: theme.fg, fontSize: 12, width: "100%", outline: "none" },
    btn: (c = "#34d399", sm = false) => ({ ...MONO_FONT, padding: sm ? "5px 9px" : "9px 14px", borderRadius: 5, border: `1px solid ${c}`, background: D ? `${c}12` : `${c}18`, color: c, fontSize: sm ? 9 : 11, fontWeight: 700, cursor: "pointer" }),
    btnSolid: (c = "#34d399") => ({ ...MONO_FONT, padding: "9px 14px", borderRadius: 5, border: "none", background: c, color: D ? "#080c14" : "#ffffff", fontSize: 11, fontWeight: 800, cursor: "pointer" }),
    alertRow: (t) => ({ padding: "7px 9px", borderRadius: 5, marginBottom: 3, fontSize: 11, borderLeft: `3px solid ${t === "danger" ? "#ef4444" : t === "warning" ? "#eab308" : "#34d399"}`, background: t === "danger" ? (D ? "#180808" : "#fef2f2") : t === "warning" ? (D ? "#181408" : "#fefce8") : (D ? "#081814" : "#ecfdf5"), color: t === "danger" ? "#ef4444" : t === "warning" ? "#ca8a04" : "#059669" }),
    tab: (on) => ({ ...MONO_FONT, flex: "0 0 auto", padding: "9px 10px", fontSize: 8, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", cursor: "pointer", border: "none", background: "transparent", color: on ? theme.accent : theme.sub, borderBottom: on ? `2px solid ${theme.accent}` : "2px solid transparent", whiteSpace: "nowrap" }),
  };

  // --- Session Export ---
  const exportSession = () => {
    const now = new Date();
    const dt = now.toLocaleDateString();
    const tm = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let txt = `DUGOUT INTEL — Game Report\n${dt} ${tm}\n${"=".repeat(40)}\n\n`;
    txt += `SCORE: Armadillos ${ourScore} - ${theirScore} Opponent\n\n`;
    const usedPitchers = Object.entries(pitcherAvailability).filter(([, v]) => v.dt === now.toISOString().split('T')[0]);
    if (usedPitchers.length > 0) { txt += `OUR PITCHERS:\n`; usedPitchers.forEach(([n, v]) => { const r = getRestInfo(v.pc); txt += `  ${n}: ${v.pc}p — ${r.label}\n`; }); txt += `\n`; }
    const abEntries = Object.entries(ourAtBats).filter(([, v]) => v.length > 0);
    if (abEntries.length > 0) { txt += `OUR AT-BATS:\n`; abEntries.forEach(([n, res]) => { const h = res.filter(r => HITS.has(r)).length; const ab = res.filter(r => !NON_AB.has(r)).length; const avg = ab > 0 ? (h / ab).toFixed(3) : ".000"; txt += `  ${n}: ${res.join(", ")} (${h}-${ab}, ${avg})\n`; }); txt += `\n`; }
    if (oppPitchCount > 0) { const sp = calcPct(oppStrikes, oppStrikes + oppBalls); txt += `THEIR PITCHER: ${oppPitcherName || "Unknown"} — ${oppPitchCount}p, ${sp}% strikes, ${getRestInfo(oppPitchCount).label}\n\n`; }
    if (coachMessages.length > 0) { txt += `COACH MESSAGES:\n`; coachMessages.slice().reverse().forEach(m => { txt += `  [${m.time}] ${m.msg}\n`; }); txt += `\n`; }
    if (alerts.length > 0) { txt += `ALERTS:\n`; alerts.slice().reverse().forEach(a => { txt += `  [${a.type.toUpperCase()}] ${a.msg}\n`; }); }
    return txt;
  };

  const downloadSession = () => {
    const txt = exportSession();
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DugoutIntel_${new Date().toISOString().split('T')[0]}_${ourScore}-${theirScore}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addAlert("Downloaded!", "info");
  };

  // --- Pitching colors ---
  const pitchCountColor = pitchCount >= 65 ? "#ef4444" : pitchCount >= 50 ? "#ea580c" : pitchCount >= 35 ? "#eab308" : "#34d399";
  const fpsColor = fpsLast5 !== "--" && +fpsLast5 < 40 ? "#ef4444" : fpsLast5 !== "--" && +fpsLast5 < 50 ? "#eab308" : "#34d399";
  const veloColor = veloDropPct && +veloDropPct > 8 ? "#ef4444" : "#34d399";
  const restColor = restInfo.days >= 3 ? "#ef4444" : restInfo.days >= 2 ? "#ea580c" : restInfo.days >= 1 ? "#eab308" : "#34d399";

  // --- Pitching Tab ---
  const PitchingTab = () => {
    const handlePitch = (isStrike) => { logPitch(isStrike, veloInput ? parseFloat(veloInput) : null); setVeloInput(""); };
    return (<div>
      <div style={styles.card}>
        <div style={{ display: "flex", gap: 6 }}>
          <select style={{ ...styles.select, flex: 1 }} value={pitcherName} onChange={e => { if (pitchCount > 0) resetPitcher(); setPitcherName(e.target.value); }}>
            {Object.keys(OUR_PITCHERS).map(n => <option key={n}>{n}</option>)}<option>Other</option>
          </select>
          <button style={styles.btn("#ef4444", true)} onClick={resetPitcher}>DONE</button>
        </div>
        {doneReport && <div style={{ marginTop: 6, padding: "8px 10px", background: "#081814", borderRadius: 5, border: "1px solid #34d399", cursor: "pointer" }} onClick={() => copyToClipboard(doneReport, addAlert)}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={{ fontSize: 8, color: "#34d399", fontWeight: 700 }}>PITCHER REPORT — TAP TO COPY</span>
            <span style={{ fontSize: 8, color: "#3a5a70", cursor: "pointer" }} onClick={e => { e.stopPropagation(); setDoneReport(null); }}>DISMISS</span>
          </div>
          <div style={{ fontSize: 11, color: "#d0d8e4" }}>{doneReport}</div>
        </div>}
        <div style={{ display: "flex", gap: 8, marginTop: 5, fontSize: 10, color: "#3a5a70", flexWrap: "wrap" }}>
          <span>INN <b style={{ color: "#d0d8e4" }}>{inning}</b></span>
          <span>OUTS <b style={{ color: "#d0d8e4" }}>{outs}</b></span>
          <span>BF <b style={{ color: "#d0d8e4" }}>{totalBattersFaced}</b></span>
          <span>REST <b style={{ color: restColor }}>{restInfo.days}d</b></span>
        </div>
        {currentPitcherProfile && <div style={{ marginTop: 6, padding: "6px 8px", background: theme.noteBg, borderRadius: 5, fontSize: 10, color: theme.note }}>
          <b style={{ color: "#34d399" }}>Profile:</b> {currentPitcherProfile.ppi > 0 ? `${currentPitcherProfile.ppi} P/IP | ${currentPitcherProfile.fps}% FPS | ${currentPitcherProfile.bb} BB/inn | ${currentPitcherProfile.proj35} @35p | Fatigue ~${currentPitcherProfile.fatiguePoint}p` : currentPitcherProfile.notes}
        </div>}
      </div>

      <div style={styles.card}>
        <div style={styles.grid3}>
          <StatBox value={pitchCount} label="Pitches" color={pitchCountColor} theme={theme} />
          <StatBox value={`${strikePct}%`} label="Strike %" theme={theme} />
          <StatBox value={`${fpsOverall}%`} label="FPS %" color={fpsColor} theme={theme} />
        </div>
        <div style={{ ...styles.grid3, marginTop: 6 }}>
          <StatBox value={`${fpsLast5}%`} label="FPS Last 5" color={fpsColor} fontSize={15} theme={theme} />
          <StatBox value={avgVelo} label="Avg Velo" fontSize={15} theme={theme} />
          <StatBox value={veloDropPct ? `-${veloDropPct}%` : "--"} label="Velo Drop" color={veloColor} fontSize={15} theme={theme} />
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.label}>Pitch Count / Rest</div>
        <ProgressBar value={pitchCount} max={DAILY_PITCH_MAX} thresholdMarkers={[20, 35, 50, 65, 75]} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 7, color: "#3a5a70", marginTop: 3 }}>
          <span>0d:20</span><span style={{ color: "#eab308" }}>1d:35</span><span style={{ color: "#ea580c" }}>2d:50</span><span style={{ color: "#ef4444" }}>3d:65</span><span style={{ color: "#dc2626" }}>MAX:75</span>
        </div>
        {nextThreshold && pitchCount > 0 && <div style={{ marginTop: 4, fontSize: 10, color: restColor }}>{restInfo.label}. {nextThreshold.threshold - pitchCount}p until {nextThreshold.nextRestDays}-day rest.</div>}
      </div>

      {velocities.length > 0 && <div style={styles.card}>
        <div style={styles.label}>Velocity (Peak: {peakVelo})</div>
        <VeloChart velocities={velocities} maxBars={35} barHeight={0.5} barWidth={5} height={50} />
      </div>}

      <div style={styles.card}>
        <div style={styles.label}>Log Pitch</div>
        <input style={{ ...styles.input, width: 100, marginBottom: 8 }} value={veloInput} onChange={e => setVeloInput(e.target.value)} placeholder="Velo" type="number" step="0.1" />
        <div style={styles.grid2}>
          <button style={styles.btnSolid("#34d399")} onClick={() => handlePitch(true)}>STRIKE</button>
          <button style={styles.btnSolid("#ef4444")} onClick={() => handlePitch(false)}>BALL</button>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
          {PITCHER_OUTCOMES.map(([r, c]) => <button key={r} style={styles.btn(c, true)} onClick={() => isOut(r) ? recordOut(r) : endAtBat(r)}>{r}</button>)}
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.label}>Our Staff (PG 9-10U)</div>
        <div style={{ fontSize: 9, color: "#3a5a70", marginBottom: 6 }}>Daily max 75p. Weekend max 100p.</div>
        {Object.entries(OUR_PITCHERS).map(([name]) => {
          const avail = pitcherAvailability[name];
          const restDays = avail ? getRestInfo(avail.pc) : { days: 0 };
          const isAvailable = !avail || restDays.days === 0;
          const canStartGame2 = avail && avail.pc <= 20;
          const weekPitches = weeklyPitchCounts[name] || 0;
          const weekRemaining = 100 - weekPitches;
          const weekColor = tierColor(weekRemaining, [[0, "#ef4444"], [20, "#ea580c"], [35, "#eab308"], [Infinity, "#34d399"]]);
          return (<div key={name} style={{ padding: "5px 0", borderBottom: "1px solid #1c305030" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: name === pitcherName ? theme.accent : theme.fg, fontWeight: name === pitcherName ? 800 : 400 }}>{name}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {weekPitches > 0 && <span style={{ fontSize: 9, color: weekColor, fontWeight: 700 }}>{weekRemaining}p left</span>}
                <span style={{ fontSize: 9, color: isAvailable ? theme.accent : "#ef4444", fontWeight: 700 }}>
                  {name === pitcherName && pitchCount > 0 ? `${pitchCount}p live` : avail ? `${avail.pc}p ${isAvailable ? "AVAIL" : `${restDays.days}d`}${canStartGame2 && isAvailable ? " G2ok" : ""}` : "Avail"}
                </span>
              </div>
            </div>
            {weekPitches > 0 && <div style={{ height: 4, background: theme.inp, borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${weekPitches}%`, background: weekColor, borderRadius: 2 }} />
            </div>}
          </div>);
        })}
        <div style={{ marginTop: 8, padding: 8, background: theme.inp, borderRadius: 5 }}>
          <div style={{ ...styles.label, fontSize: 9 }}>Set Weekend Pitch Count</div>
          <div style={{ display: "flex", gap: 4 }}>
            <select style={{ ...styles.select, flex: 2 }} value={weeklyPitcherSelect} onChange={e => setWeeklyPitcherSelect(e.target.value)}>
              <option value="">Select pitcher</option>
              {Object.keys(OUR_PITCHERS).map(n => <option key={n} value={n}>{n} {weeklyPitchCounts[n] ? `(${weeklyPitchCounts[n]}p)` : ""}</option>)}
            </select>
            <input style={{ ...styles.input, flex: 1 }} placeholder="P#" type="number" value={weeklyPitchInput} onChange={e => setWeeklyPitchInput(e.target.value)} />
            <button style={styles.btn(theme.accent, true)} onClick={() => {
              if (!weeklyPitcherSelect) return;
              setWeeklyPitchCounts(prev => ({ ...prev, [weeklyPitcherSelect]: parseInt(weeklyPitchInput) || 0 }));
              setWeeklyPitchInput("");
            }}>SET</button>
          </div>
          <button style={{ ...styles.btn("#ef4444", true), width: "100%", marginTop: 4 }} onClick={() => setWeeklyPitchCounts({})}>RESET ALL</button>
        </div>
      </div>
    </div>);
  };

  // --- Lineup Tab ---
  const LineupTab = () => {
    const oppStrikePct = calcPct(oppStrikes, oppStrikes + oppBalls);
    const oppPeakVelo = arrayPeak(oppVelocities);
    return (<div>
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={styles.label}>Score</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button style={styles.btn("#34d399", true)} onClick={() => setOurScore(prev => prev + 1)}>US+</button>
            <span style={{ fontSize: 16, fontWeight: 800, color: theme.fg }}>{ourScore}-{theirScore}</span>
            <button style={styles.btn("#ef4444", true)} onClick={() => setTheirScore(prev => prev + 1)}>THEM+</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
          <button style={styles.btn("#3a5a70", true)} onClick={() => setOurScore(prev => Math.max(0, prev - 1))}>US-</button>
          <button style={styles.btn("#3a5a70", true)} onClick={() => setTheirScore(prev => Math.max(0, prev - 1))}>THEM-</button>
          <button style={styles.btn("#ef4444", true)} onClick={() => { setOurScore(0); setTheirScore(0); }}>RESET</button>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.label}>Their Pitcher</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input style={{ ...styles.input, flex: 2 }} value={oppPitcherName} onChange={e => setOppPitcherName(e.target.value)} placeholder="Opponent pitcher name" />
          <input style={{ ...styles.input, flex: 1 }} value={oppVeloInput} onChange={e => setOppVeloInput(e.target.value)} placeholder="Velo" type="number" step="0.1" />
        </div>
        <div style={styles.grid3}>
          <StatBox value={oppPitchCount} label="Pitches" theme={theme} />
          <StatBox value={`${oppStrikePct}%`} label="Strike %" fontSize={15} theme={theme} />
          <StatBox value={oppPeakVelo} label="Peak Velo" fontSize={15} theme={theme} />
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
          <button style={styles.btnSolid("#34d399")} onClick={() => logOpponentPitch(true)}>STR</button>
          <button style={styles.btnSolid("#ef4444")} onClick={() => logOpponentPitch(false)}>BALL</button>
          <button style={styles.btn("#3a5a70", true)} onClick={() => {
            const msg = `Their P ${oppPitcherName || "?"}: ${oppPitchCount}p, ${oppStrikePct}% STR, Peak ${oppPeakVelo}, Avg ${arrayAvg(oppVelocities)}`;
            addCoachMsg(msg);
            copyToClipboard(msg, addAlert);
          }}>REPORT</button>
          <button style={styles.btn("#ef4444", true)} onClick={() => { setOppPitchCount(0); setOppStrikes(0); setOppBalls(0); setOppPitcherName(""); setOppVelocities([]); setOppVeloInput(""); }}>NEW P</button>
        </div>
        {oppVelocities.length > 0 && <VeloChart velocities={oppVelocities} maxBars={30} barHeight={0.35} barWidth={4} height={35} />}
      </div>

      <div style={styles.card}>
        <div style={styles.label}>Our At-Bats</div>
        {OUR_BATTING_ORDER.map((batter, i) => {
          const results = ourAtBats[batter.name] || [];
          const rispColor = batter.risp >= .4 ? "#34d399" : batter.risp >= .25 ? "#eab308" : "#ef4444";
          return (<div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #1c305040" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><span style={{ fontSize: 9, color: "#3a5a70", marginRight: 4 }}>#{batter.order}</span><span style={{ fontWeight: 700, fontSize: 12, color: "#d0d8e4" }}>{batter.name}</span></div>
              <span style={{ fontSize: 9, color: rispColor }}>RISP {batter.risp.toFixed(3)}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 2, fontSize: 9, color: "#3a5a70" }}>
              <span>AVG <b style={{ color: "#d0d8e4" }}>{batter.avg.toFixed(3)}</b></span>
              <span>OBP <b style={{ color: "#d0d8e4" }}>{batter.obp.toFixed(3)}</b></span>
              <span>CT <b>{batter.ct}%</b></span>
            </div>
            <ResultPills results={results} outBg="#081814" hitBg="#0a1a10" outColor="#ef4444" hitColor="#34d399" />
            <OutcomeButtons outcomes={BATTER_OUTCOMES} onClick={(r) => logOurAtBat(batter.name, r)} styles={styles} />
          </div>);
        })}
      </div>
    </div>);
  };

  // --- Scouting Tab ---
  const ScoutingTab = () => (<div>
    <div style={styles.card}>
      <div style={styles.label}>Opponent</div>
      <select style={styles.select} value={activeTeam} onChange={e => { setActiveTeam(e.target.value); setCurrentHitter(null); setLiveAtBats({}); }}>
        {Object.keys(allTeams).map(t => <option key={t} value={t}>{t} ({allTeams[t].length}p)</option>)}
      </select>
    </div>
    {scoutedRoster.map((hitter, i) => {
      const tc = threatColors(hitter.threat);
      const liveResults = liveAtBats[hitter.name] || [];
      const isSelected = currentHitter === i;
      return (<div key={i} style={{ ...styles.card, borderColor: isSelected ? "#34d399" : `${tc.border}44`, borderWidth: isSelected ? 2 : 1, cursor: "pointer" }} onClick={() => setCurrentHitter(isSelected ? null : i)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: 13, color: theme.fg }}>{hitter.name}{hitter.number && <span style={{ color: "#3a5a70" }}> #{hitter.number}</span>}</span>
            <span style={{ fontSize: 9, color: "#3a5a70", marginLeft: 6 }}>{hitter.pos}</span>
          </div>
          <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 3, background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>{tc.label}</span>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 10 }}>
          <span style={{ color: "#3a5a70" }}>AVG <b style={{ color: hitter.avg >= .4 ? "#fca5a5" : "#d0d8e4" }}>{hitter.avg.toFixed(3)}</b></span>
          <span style={{ color: "#3a5a70" }}>OBP <b style={{ color: "#d0d8e4" }}>{hitter.obp.toFixed(3)}</b></span>
          <span style={{ color: "#3a5a70" }}>SO <b style={{ color: "#d0d8e4" }}>{hitter.so}</b></span>
          <span style={{ color: "#3a5a70" }}>SB <b style={{ color: hitter.sb >= 7 ? "#fca5a5" : "#d0d8e4" }}>{hitter.sb}</b></span>
        </div>
        <ResultPills results={liveResults} outBg="#081814" hitBg="#180808" outColor="#34d399" hitColor="#fca5a5" />
        {isSelected && <div style={{ marginTop: 6 }}>
          <div style={{ padding: "7px 9px", background: theme.noteBg, borderRadius: 5, fontSize: 11, color: theme.altBg, lineHeight: 1.5, borderLeft: `3px solid ${tc.border}`, marginBottom: 4 }}>
            <b style={{ color: tc.text }}>APPROACH:</b> {hitter.notes}
          </div>
          {hitter.def && <div style={{ padding: "7px 9px", background: theme.noteBg, borderRadius: 5, fontSize: 11, color: theme.altBg, lineHeight: 1.5, borderLeft: "3px solid #3b82f6" }}>
            <b style={{ color: "#93c5fd" }}>DEFENSE:</b> {hitter.def}
          </div>}
          {hitter.sb >= 7 && <div style={{ marginTop: 4, padding: "3px 7px", background: "#180505", borderRadius: 3, color: "#fca5a5", fontSize: 10 }}>STEAL ALERT: {hitter.sb} SB</div>}
        </div>}
      </div>);
    })}
  </div>);

  // --- Manage Tab ---
  const ManageTab = () => {
    if (manageView === "edit") return (<div>
      <button style={{ ...styles.btn("#3a5a70", true), marginBottom: 8 }} onClick={() => setManageView("list")}>Back</button>
      <div style={styles.card}>
        <div style={styles.label}>Edit Team</div>
        <input style={{ ...styles.input, marginBottom: 8 }} value={editTeamName} onChange={e => setEditTeamName(e.target.value)} placeholder="Team name" />
        {editPlayers.map((p, i) => (<div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #1c3050", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><span style={{ fontSize: 12, fontWeight: 700, color: "#d0d8e4" }}>{p.name}</span><span style={{ fontSize: 10, color: "#3a5a70", marginLeft: 4 }}>#{p.number} {p.pos}</span></div>
          <div style={{ display: "flex", gap: 4 }}>
            <select style={{ ...styles.select, width: 70, fontSize: 10, padding: 3 }} value={p.threat} onChange={e => { const u = [...editPlayers]; u[i] = { ...u[i], threat: e.target.value }; setEditPlayers(u); }}>
              <option value="elite">Elite</option><option value="high">High</option><option value="medium">Med</option><option value="low">Low</option>
            </select>
            <button style={styles.btn("#ef4444", true)} onClick={() => setEditPlayers(x => x.filter((_, j) => j !== i))}>X</button>
          </div>
        </div>))}
        <div style={{ marginTop: 10, padding: 8, background: theme.inp, borderRadius: 5 }}>
          <div style={{ ...styles.label, fontSize: 9 }}>Add Player</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 50px 50px", gap: 4, marginBottom: 4 }}>
            <input style={styles.input} placeholder="Name" value={newPlayerForm.name} onChange={e => setNewPlayerForm(p => ({ ...p, name: e.target.value }))} />
            <input style={styles.input} placeholder="#" value={newPlayerForm.number} onChange={e => setNewPlayerForm(p => ({ ...p, number: e.target.value }))} />
            <input style={styles.input} placeholder="Pos" value={newPlayerForm.pos} onChange={e => setNewPlayerForm(p => ({ ...p, pos: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4, marginBottom: 4 }}>
            <input style={styles.input} placeholder="AVG" value={newPlayerForm.avg} onChange={e => setNewPlayerForm(p => ({ ...p, avg: e.target.value }))} />
            <input style={styles.input} placeholder="OBP" value={newPlayerForm.obp} onChange={e => setNewPlayerForm(p => ({ ...p, obp: e.target.value }))} />
            <input style={styles.input} placeholder="SO" value={newPlayerForm.so} onChange={e => setNewPlayerForm(p => ({ ...p, so: e.target.value }))} />
            <input style={styles.input} placeholder="SB" value={newPlayerForm.sb} onChange={e => setNewPlayerForm(p => ({ ...p, sb: e.target.value }))} />
          </div>
          <input style={{ ...styles.input, marginBottom: 4 }} placeholder="Notes" value={newPlayerForm.notes} onChange={e => setNewPlayerForm(p => ({ ...p, notes: e.target.value }))} />
          <input style={{ ...styles.input, marginBottom: 4 }} placeholder="Defensive alignment notes" value={newPlayerForm.def} onChange={e => setNewPlayerForm(p => ({ ...p, def: e.target.value }))} />
          <button style={{ ...styles.btn("#34d399", true), width: "100%" }} onClick={() => {
            if (!newPlayerForm.name) return;
            setEditPlayers(prev => [...prev, { name: newPlayerForm.name, number: newPlayerForm.number, pos: newPlayerForm.pos, avg: parseFloat(newPlayerForm.avg) || 0, obp: parseFloat(newPlayerForm.obp) || 0, so: parseInt(newPlayerForm.so) || 0, sb: parseInt(newPlayerForm.sb) || 0, xbh: 0, threat: newPlayerForm.avg && parseFloat(newPlayerForm.avg) >= .4 ? "high" : "medium", notes: newPlayerForm.notes || "", def: newPlayerForm.def || "" }]);
            setNewPlayerForm({ name: "", number: "", pos: "", avg: "", obp: "", so: "", sb: "", notes: "", def: "" });
          }}>Add</button>
        </div>
        <button style={{ ...styles.btnSolid("#34d399"), marginTop: 10, width: "100%" }} onClick={() => { saveTeam(editTeamName, editPlayers); setManageView("list"); }}>Save Team</button>
      </div>
    </div>);

    return (<div>
      <div style={styles.card}>
        <div style={styles.label}>Scouted Teams</div>
        {Object.entries(allTeams).map(([name, players]) => (<div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1c3050" }}>
          <div><div style={{ fontSize: 13, fontWeight: 700, color: "#d0d8e4" }}>{name}</div><div style={{ fontSize: 10, color: "#3a5a70" }}>{players.length}p</div></div>
          <div style={{ display: "flex", gap: 4 }}>
            <button style={styles.btn("#34d399", true)} onClick={() => { setEditTeamName(name); setEditPlayers([...players]); setManageView("edit"); }}>Edit</button>
            <button style={styles.btn("#ef4444", true)} onClick={() => { if (Object.keys(allTeams).length > 1) deleteTeam(name); }}>Del</button>
          </div>
        </div>))}
      </div>
      <button style={{ ...styles.btnSolid("#34d399"), width: "100%" }} onClick={() => { setEditTeamName("New Team"); setEditPlayers([]); setManageView("edit"); }}>+ Add Team Manually</button>
    </div>);
  };

  // --- Coach Tab ---
  const CoachTab = () => (<div>
    <div style={styles.card}>
      <div style={styles.label}>Coach Messages</div>
      <div style={{ fontSize: 10, color: "#3a5a70", marginBottom: 6 }}>Tap to copy.</div>
      {coachMessages.length === 0 && <div style={{ fontSize: 11, color: "#3a5a70", fontStyle: "italic" }}>Auto-generates as you log pitches.</div>}
      {coachMessages.map((m, i) => (<div key={i} style={{ padding: "8px 10px", background: "#060c16", borderRadius: 5, marginBottom: 4, cursor: "pointer", border: "1px solid #1c3050" }} onClick={() => copyToClipboard(m.msg, addAlert)}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><span style={{ fontSize: 8, color: "#3a5a70" }}>{m.time}</span><span style={{ fontSize: 8, color: "#34d399" }}>COPY</span></div>
        <div style={{ fontSize: 11, color: "#d0d8e4" }}>{m.msg}</div>
      </div>))}
    </div>
    <div style={styles.card}>
      <div style={styles.label}>Quick Alerts</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {QUICK_ALERTS.map((m, i) => <button key={i} style={styles.btn("#34d399", true)} onClick={() => addCoachMsg(m)}>{m}</button>)}
      </div>
    </div>
    <div style={styles.card}>
      <div style={styles.label}>Export Game Session</div>
      <div style={{ fontSize: 10, color: theme.sub, marginBottom: 6 }}>Save the full game report with all pitcher data, at-bats, messages, and alerts.</div>
      <div style={styles.grid2}>
        <button style={styles.btnSolid("#34d399")} onClick={() => copyToClipboard(exportSession(), addAlert, "Full report copied!")}>Copy to Clipboard</button>
        <button style={styles.btnSolid("#3b82f6")} onClick={downloadSession}>Download .txt File</button>
      </div>
    </div>
  </div>);

  // --- Feed Tab ---
  const FeedTab = () => (<div>
    <div style={styles.card}>
      <div style={styles.label}>Live Feed</div>
      {alerts.length === 0 && <div style={{ fontSize: 11, color: "#3a5a70", fontStyle: "italic" }}>Alerts appear as you log pitches.</div>}
      {alerts.map(a => <div key={a.id} style={styles.alertRow(a.type)}>{a.msg}</div>)}
    </div>
  </div>);

  // --- Intel Tab ---
  const IntelTab = () => {
    const budgetTeams = Object.keys(oppBudgets);
    const currentBudget = oppBudgets[budgetTeamName] || {};
    const addBudgetPitcher = () => {
      if (!budgetAddForm.name || !budgetAddForm.pitches) return;
      const pitches = parseInt(budgetAddForm.pitches) || 0;
      setOppBudgets(prev => ({ ...prev, [budgetTeamName]: { ...(prev[budgetTeamName] || {}), [budgetAddForm.name]: { sat: pitches, notes: `${pitches}p Saturday` } } }));
      setBudgetAddForm({ name: "", pitches: "" });
    };
    const removeBudgetPitcher = (name) => {
      setOppBudgets(prev => { const t = { ...(prev[budgetTeamName] || {}) }; delete t[name]; return { ...prev, [budgetTeamName]: t }; });
    };
    const addBudgetTeam = () => {
      if (!budgetTeamName.trim()) return;
      if (!oppBudgets[budgetTeamName]) setOppBudgets(prev => ({ ...prev, [budgetTeamName]: {} }));
    };

    return (<div>
      <div style={styles.card}>
        <div style={styles.label}>Opponent Pitch Budget</div>
        <p style={{ fontSize: 10, color: "#3a5a70", marginBottom: 8 }}>Track opponent pitchers from Saturday to know who is available/limited on Sunday. PG weekend max: {WEEKEND_PITCH_MAX}p.</p>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input style={{ ...styles.input, flex: 1 }} value={budgetTeamName} onChange={e => setBudgetTeamName(e.target.value)} placeholder="Opponent team name" />
          <button style={styles.btn("#34d399", true)} onClick={addBudgetTeam}>+</button>
        </div>
        {budgetTeams.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
          {budgetTeams.map(t => <button key={t} style={styles.btn(t === budgetTeamName ? "#34d399" : "#3a5a70", true)} onClick={() => setBudgetTeamName(t)}>{t}</button>)}
        </div>}
      </div>

      <div style={{ ...styles.card, display: budgetTeamName ? "block" : "none" }}>
        <div style={styles.label}>{budgetTeamName || "Select team"} — Sunday Availability</div>
        {Object.keys(currentBudget).length === 0 && <div style={{ fontSize: 11, color: "#3a5a70", fontStyle: "italic", marginBottom: 8 }}>Add pitchers and their Saturday pitch counts below.</div>}
        {Object.entries(currentBudget).map(([name, data]) => {
          const remaining = WEEKEND_PITCH_MAX - data.sat;
          const restDay = getRestInfo(data.sat);
          const canPitch = restDay.days === 0;
          const dailyMax = Math.min(remaining, DAILY_PITCH_MAX);
          const barPct = data.sat / WEEKEND_PITCH_MAX * 100;
          const remainColor = tierColor(remaining, [[0, "#ef4444"], [20, "#ea580c"], [35, "#eab308"], [Infinity, "#34d399"]]);
          return (<div key={name} style={{ padding: "8px 0", borderBottom: "1px solid #1c305040" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 12, color: "#d0d8e4" }}>{name}</span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: canPitch ? remainColor : "#ef4444" }}>{canPitch ? `${dailyMax}p avail` : "RESTING"}</span>
                <button style={{ ...styles.btn("#ef4444", true), padding: "2px 5px", fontSize: 8 }} onClick={() => removeBudgetPitcher(name)}>X</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 3, fontSize: 9, color: "#3a5a70" }}>
              <span>Sat: <b style={{ color: "#d0d8e4" }}>{data.sat}p</b></span>
              <span>Remaining: <b style={{ color: remainColor }}>{Math.max(remaining, 0)}p</b></span>
              <span>Rest: <b style={{ color: canPitch ? "#34d399" : "#ef4444" }}>{restDay.label}</b></span>
              {canPitch && <span>Sun max: <b style={{ color: remainColor }}>{dailyMax}p</b></span>}
            </div>
            <div style={{ height: 8, background: "#060c16", borderRadius: 4, marginTop: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${barPct}%`, background: remaining <= 0 ? "#ef4444" : remaining <= 20 ? "#ea580c" : "#eab308", borderRadius: 4, transition: "width 0.3s" }} />
            </div>
            {!canPitch && <div style={{ marginTop: 3, padding: "2px 6px", background: "#180808", borderRadius: 3, color: "#fca5a5", fontSize: 9 }}>Threw {data.sat}p Sat = {restDay.label} rest. CANNOT PITCH SUNDAY.</div>}
            {canPitch && remaining <= 20 && <div style={{ marginTop: 3, padding: "2px 6px", background: "#181408", borderRadius: 3, color: "#fde047", fontSize: 9 }}>LIMITED: Only {remaining}p left for the weekend.</div>}
          </div>);
        })}

        <div style={{ marginTop: 10, padding: 8, background: "#060c16", borderRadius: 5 }}>
          <div style={{ ...styles.label, fontSize: 9 }}>Add Saturday Pitcher</div>
          <div style={{ display: "flex", gap: 4 }}>
            <input style={{ ...styles.input, flex: 2 }} value={budgetAddForm.name} onChange={e => setBudgetAddForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Pitcher name" />
            <input style={{ ...styles.input, flex: 1 }} value={budgetAddForm.pitches} onChange={e => setBudgetAddForm(prev => ({ ...prev, pitches: e.target.value }))} placeholder="Sat P" type="number" />
            <button style={styles.btn("#34d399", true)} onClick={addBudgetPitcher}>Add</button>
          </div>
        </div>

        {Object.keys(currentBudget).length > 0 && <button style={{ ...styles.btn("#3a5a70", true), width: "100%", marginTop: 8 }} onClick={() => {
          const lines = Object.entries(currentBudget).map(([n, d]) => {
            const rem = WEEKEND_PITCH_MAX - d.sat;
            const r = getRestInfo(d.sat);
            return r.days === 0 ? `${n}: ${d.sat}p Sat, ${Math.min(rem, DAILY_PITCH_MAX)}p avail Sun` : `${n}: ${d.sat}p Sat, RESTING (${r.label})`;
          });
          copyToClipboard(`${budgetTeamName} Sunday Availability:\n` + lines.join("\n"), addAlert);
        }}>Copy Full Report</button>}
      </div>
    </div>);
  };

  // --- Tab config ---
  const tabs = [
    { id: "pitching", label: "Pitch" },
    { id: "lineup", label: "Lineup" },
    { id: "scouting", label: "Scout" },
    { id: "intel", label: "Intel" },
    { id: "manage", label: "Teams" },
    { id: "coach", label: "Coach", badge: coachMessages.length },
    { id: "feed", label: "Feed" },
  ];

  return (<div style={{ ...MONO_FONT, background: theme.bg, color: theme.fg, minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>
    <div style={{ background: theme.hdr, padding: "14px 16px 10px", borderBottom: `1px solid ${theme.bdr}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <h1 style={{ fontSize: 17, fontWeight: 800, color: theme.accent, margin: 0, letterSpacing: -0.5 }}>DUGOUT INTEL</h1>
        <div style={{ fontSize: 9, color: theme.sub, letterSpacing: 2, textTransform: "uppercase", marginTop: 1 }}>Real-Time Coaching Intelligence</div>
      </div>
      <button style={{ ...MONO_FONT, background: "none", border: `1px solid ${theme.bdr}`, borderRadius: 5, padding: "4px 8px", fontSize: 9, color: theme.sub, cursor: "pointer" }} onClick={() => setDark(prev => !prev)}>{D ? "LIGHT" : "DARK"}</button>
    </div>
    <div style={{ display: "flex", background: theme.tabBg, borderBottom: `1px solid ${theme.bdr}`, overflow: "auto" }}>
      {tabs.map(t => (<button key={t.id} style={styles.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
        {t.label}{t.badge > 0 && <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: 8, lineHeight: "14px", textAlign: "center", marginLeft: 3, fontWeight: 800 }}>{t.badge}</span>}
      </button>))}
    </div>
    <div style={{ padding: 10, paddingBottom: 50 }}>
      {activeTab === "pitching" && PitchingTab()}
      {activeTab === "lineup" && LineupTab()}
      {activeTab === "scouting" && ScoutingTab()}
      {activeTab === "intel" && IntelTab()}
      {activeTab === "manage" && ManageTab()}
      {activeTab === "coach" && CoachTab()}
      {activeTab === "feed" && FeedTab()}
    </div>
  </div>);
}
