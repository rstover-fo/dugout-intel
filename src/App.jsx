import { useState, useEffect, useCallback, useRef } from "react";

const MY_P = {
  "Sidor #1": { ppi:16.0, fps:55.8, bb:0.58, notes:"Ace. Most efficient. Quick delivery helps Quigley throw.", proj35:"2.2 inn", fat:35 },
  "Grawunder #2": { ppi:22.8, fps:53.4, bb:0.88, notes:"Workhorse. Burns counts (22.8 P/IP). FPS fades after 28p.", proj35:"1.5 inn", fat:28 },
  "C. Duhon #99": { ppi:25.7, fps:58.0, bb:1.26, notes:"Highest fresh FPS (66%) but falls fastest. Watch after 30p. 12 WP in 8 GP.", proj35:"1.4 inn", fat:28 },
  "Corriveau #23": { ppi:29.6, fps:42.5, bb:2.0, notes:"1 inning max. 42.5% FPS. Use with empty bases only.", proj35:"1.2 inn", fat:25 },
  "Bell #12": { ppi:37.0, fps:41.8, bb:2.32, notes:"Emergency only. 37 P/IP worst on staff. If walks 2, pull.", proj35:"0.9 inn", fat:25 },
  "Quigley #14": { ppi:0, fps:0, bb:0, notes:"No pitching data. Power bat (.778 SLG). Catcher.", proj35:"--", fat:30 },
  "Stover #21": { ppi:0, fps:0, bb:0, notes:"No pitching data. RISP killer (.478). Good contact.", proj35:"--", fat:30 },
  "A. Duhon #17": { ppi:0, fps:0, bb:0, notes:"No pitching data. Walk machine (.469 OBP). Speed.", proj35:"--", fat:30 },
  "Carver #3": { ppi:0, fps:0, bb:0, notes:"No pitching data. Good eye (.462 OBP). GB hitter.", proj35:"--", fat:30 },
  "Lovett #0": { ppi:0, fps:0, bb:0, notes:"No pitching data. Project player. 22% contact.", proj35:"--", fat:30 },
};

const MY_B = [
  { name:"C. Duhon #99", o:1, avg:.489, obp:.631, slg:.723, risp:.400, so:7, bb:18, sb:39, ct:78, notes:"Leadoff engine. .631 OBP. 39 SB at 95%+." },
  { name:"Corriveau #23", o:2, avg:.343, obp:.566, slg:.429, risp:.333, so:7, bb:16, sb:15, ct:72, notes:"Elite discipline. 2.286 BB/K. Draws walks, moves runners." },
  { name:"Bell #12", o:3, avg:.362, obp:.545, slg:.468, risp:.292, so:18, bb:18, sb:22, ct:62, notes:"59.1% QAB. Great eye. RISP dips to .292 -- might press." },
  { name:"Sidor #1", o:4, avg:.533, obp:.625, slg:.622, risp:.621, so:7, bb:10, sb:20, ct:84, notes:"CLUTCH. .621 RISP best on team. 84% contact. Want him up with runners on." },
  { name:"Quigley #14", o:5, avg:.500, obp:.545, slg:.778, risp:.400, so:13, bb:6, sb:13, ct:76, notes:"Power bat. .778 SLG, 11 XBH. Swings for fences." },
  { name:"Stover #21", o:6, avg:.298, obp:.404, slg:.319, risp:.478, so:9, bb:8, sb:27, ct:81, notes:"RISP KILLER. .478 RISP 2nd best. 81% contact. Puts ball in play." },
  { name:"Grawunder #2", o:7, avg:.375, obp:.508, slg:.417, risp:.333, so:11, bb:10, sb:13, ct:70, notes:"Solid .508 OBP. Only 2 XBH. Good baserunner." },
  { name:"A. Duhon #17", o:8, avg:.227, obp:.469, slg:.227, risp:.182, so:11, bb:20, sb:33, ct:55, notes:"Walk machine (20 BB). But .182 RISP worst. 65.6% GB rate." },
  { name:"Carver #3", o:9, avg:.282, obp:.462, slg:.282, risp:.300, so:8, bb:13, sb:18, ct:68, notes:"Good eye .462 OBP. 0 XBH, 79.3% GB. 15 RBI despite no XBH." },
  { name:"Lovett #0", o:10, avg:.111, obp:.385, slg:.111, risp:.000, so:7, bb:3, sb:3, ct:22, notes:"Project. 22% contact. Gets on via walks/HBP." },
];

const PG_MAX=75;
const REST = [{mn:1,mx:20,d:0,l:"No rest"},{mn:21,mx:35,d:1,l:"1 day"},{mn:36,mx:50,d:2,l:"2 days"},{mn:51,mx:65,d:3,l:"3 days"},{mn:66,mx:75,d:4,l:"4 days"}];
function gR(p){if(p===0)return{d:0,l:"Available"};for(const r of REST){if(p>=r.mn&&p<=r.mx)return r;}return{d:4,l:"4+ days"};}
function gN(p){for(const r of REST){if(p<r.mx)return{th:r.mx,nd:gR(r.mx+1).d};}return null;}

const SC_T = {
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

function beep(f){try{const c=new(window.AudioContext||window.webkitAudioContext)();const o=c.createOscillator();const g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=f;g.gain.value=0.12;o.start();o.stop(c.currentTime+0.1);}catch(e){}}

async function ldD(){try{const r=await window.storage.get('di-v5');if(r&&r.value)return JSON.parse(r.value);}catch(e){}return null;}
async function svD(d){try{await window.storage.set('di-v5',JSON.stringify(d));}catch(e){}}

export default function App(){
  const[tab,sTab]=useState("pitching");const[dark,sDark]=useState(true);const[al,sAl]=useState([]);const ai=useRef(0);const[rdy,sRdy]=useState(false);
  const[aT,sAT]=useState(SC_T);const[acT,sAcT]=useState("GBA Tigres 9U");
  const[pN,sPN]=useState("Sidor #1");const[pL,sPL]=useState([]);const[vl,sVl]=useState([]);const[ot,sOt]=useState(0);const[inn,sIn]=useState(1);
  const ppc=useRef(0);const pfr=useRef(null);const pvdr=useRef(null);
  const[cH,sCH]=useState(null);const[lA,sLA]=useState({});const[cM,sCM]=useState([]);
  const[mV,sMV]=useState("list");const[eN,sEN]=useState("");const[eP,sEP]=useState([]);
  const[nf,sNf]=useState({name:"",number:"",pos:"",avg:"",obp:"",so:"",sb:"",notes:"",def:""});
  const[pAv,sPAv]=useState({});const[myS,sMyS]=useState(0);const[opS,sOpS]=useState(0);
  // Opponent pitcher tracking
  const[opN,sOpN]=useState("");const[opPC,sOpPC]=useState(0);const[opStr,sOpStr]=useState(0);const[opBall,sOpBall]=useState(0);const[opVelos,sOpVelos]=useState([]);const[opVIn,sOpVIn]=useState("");
  // Our at-bat results
  const[ourAB,sOurAB]=useState({});
  // Pitcher done report
  const[doneReport,sDoneReport]=useState(null);const[pOutcomes,sPOutcomes]=useState([]);const[weekPC,sWeekPC]=useState({});const[weekInput,sWeekInput]=useState("");
  // Opponent pitch budgets: { "Team Name": { "Player Name": { sat: 35, notes: "Started G1" } } }
  const[oppBudget,sOppBudget]=useState({});
  const[budgetTeam,sBudgetTeam]=useState("");
  const[budgetAdd,sBudgetAdd]=useState({name:"",pitches:""});

  useEffect(()=>{ldD().then(d=>{const userTeams=(d&&d.teams)?d.teams:{};const merged={...userTeams,...SC_T};sAT(merged);const keys=Object.keys(merged);if(d&&d.acT&&keys.includes(d.acT))sAcT(d.acT);else sAcT(keys[0]||"GBA Tigres 9U");if(d&&d.pAv)sPAv(d.pAv);if(d&&d.oppBudget)sOppBudget(d.oppBudget);if(d&&d.weekPC)sWeekPC(d.weekPC);sRdy(true);});},[]);
  useEffect(()=>{if(rdy)svD({teams:aT,acT,pAv,oppBudget,weekPC});},[aT,acT,pAv,rdy]);

  const sc=aT[acT]||[];const curP=MY_P[pN]||null;
  const addA=useCallback((m,t="info")=>{const id=++ai.current;sAl(p=>[{id,msg:m,type:t},...p].slice(0,30));if(t==="danger")beep(880);else if(t==="warning")beep(440);},[]);
  const addC=useCallback((m)=>{sCM(p=>[{msg:m,time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})},...p].slice(0,50));},[]);

  const pc=pL.length;const stk=pL.filter(p=>p.s).length;const sp=pc>0?(stk/pc*100).toFixed(0):"--";
  const bts=[];let cr=[];pL.forEach((p,i)=>{if(p.nb&&i>0){bts.push({fps:cr[0]?.s||false});cr=[];}cr.push(p);});if(cr.length>0)bts.push({fps:cr[0]?.s||false});
  const tb=bts.length;const fa=tb>0?(bts.filter(b=>b.fps).length/tb*100).toFixed(0):"--";
  const l5=bts.slice(-5);const f5=l5.length>=3?(l5.filter(b=>b.fps).length/l5.length*100).toFixed(0):"--";
  const avv=vl.length>0?(vl.reduce((a,b)=>a+b,0)/vl.length).toFixed(1):"--";
  const pkv=vl.length>0?Math.max(...vl).toFixed(1):"--";const rvl=vl.slice(-5);
  const rav=rvl.length>0?(rvl.reduce((a,b)=>a+b,0)/rvl.length).toFixed(1):"--";
  const vdp=vl.length>=5&&+pkv>0?((1-rav/pkv)*100).toFixed(1):null;
  const rst=gR(pc);const nxt=gN(pc);

  useEffect(()=>{const p=ppc.current;if(pc!==p){
    if(curP&&pc===curP.fat&&p<curP.fat){addA(`${pN} at fatigue point (${curP.fat}p)`,"warning");addC(`${pN} hitting fatigue at ${curP.fat}p. Watch for wildness.`);}
    if(nxt&&pc===nxt.th&&p<nxt.th){addA(`${pN} crossed ${nxt.th}p -- now ${nxt.nd} rest days`,"danger");addC(`${pN} over ${nxt.th}p. ${nxt.nd} rest days required.`);}
    if(pc===35&&p<35){addA(`${pN} at 35 -- 1d rest. +1 more=2d!`,"danger");addC(`${pN} at 35. 1d rest. ONE MORE=2d.`);}
    if(pc===50&&p<50){addA(`${pN} at 50 -- 2d rest`,"danger");addC(`${pN} AT 50. 2d rest.`);}
    if(pc===65&&p<65){addA(`${pN} at 65 -- 3d rest. +1=4d!`,"danger");addC(`${pN} AT 65. 3d. +1=4d!`);}
    if(pc===75&&p<75){addA(`${pN} at 75 PG MAX`,"danger");addC(`${pN} AT 75 PG MAX. PULL.`);}
    ppc.current=pc;}},[pc,pN,addA,addC,curP,nxt]);
  useEffect(()=>{if(f5!=="--"&&+f5<40&&f5!==pfr.current&&l5.length>=3){addA(`${pN} FPS at ${f5}%`,"warning");addC(`${pN} FPS ${f5}% last 5 BF.`);}pfr.current=f5;},[f5,pN,addA,addC,l5.length]);
  useEffect(()=>{if(vdp&&+vdp>8&&vdp!==pvdr.current){addA(`${pN} velo down ${vdp}%`,"danger");addC(`${pN} velo -${vdp}%. Peak ${pkv}, now ${rav}.`);}pvdr.current=vdp;},[vdp,pN,pkv,rav,addA,addC]);

  const lP=(s,v)=>{const nb=pL.length===0||pL[pL.length-1]?.end;sPL(p=>[...p,{s,nb,end:false}]);if(v&&v>0)sVl(p=>[...p,v]);};
  const eAB=(r)=>{sPL(p=>{const u=[...p];if(u.length>0)u[u.length-1]={...u[u.length-1],end:true};return u;});sPOutcomes(p=>[...p,r]);if(cH!==null&&sc[cH]){const k=sc[cH].name;sLA(p=>({...p,[k]:[...(p[k]||[]),r]}));}};
  const rO=(r)=>{eAB(r);if(ot+1>=3){sOt(0);sIn(p=>p+1);addA(`End inn ${inn}. ${pN} at ${pc}p.`,"info");}else sOt(ot+1);};
  const rP=()=>{if(pc>0){sPAv(p=>({...p,[pN]:{pc,dt:new Date().toISOString().split('T')[0]}}));const ks=pL.filter(p=>p.s).length;const oc=pOutcomes;const counts={};oc.forEach(r=>{counts[r]=(counts[r]||0)+1;});const parts=[];["K","GO","FO","1B","2B","3B","HR","BB","HBP"].forEach(r=>{if(counts[r])parts.push(`${counts[r]}${r}`);});const avgVel=vl.length>0?(vl.reduce((a,b)=>a+b,0)/vl.length).toFixed(1):null;const veloStr=avgVel?`, Avg ${avgVel} mph`:"";const report=`${pN}: ${pc}p, ${(ks/pc*100).toFixed(0)}% strikes, ${fa}% FPS, ${tb} BF${veloStr}. ${parts.join(", ")}`;sDoneReport(report);addC(report);}sPL([]);sVl([]);sOt(0);sPOutcomes([]);ppc.current=0;pfr.current=null;pvdr.current=null;};
  const svTm=(n,p)=>{sAT(x=>({...x,[n]:p}));sAcT(n);addA(`Saved: ${n} (${p.length}p)`,"info");};
  const dTm=(n)=>{sAT(x=>{const c={...x};delete c[n];return c;});const r=Object.keys(aT).filter(k=>k!==n);if(r.length>0)sAcT(r[0]);};

  const tc=(t)=>{if(t==="elite")return{bg:"#2a0a0a",bd:"#dc2626",tx:"#fca5a5",lb:"ELITE"};if(t==="high")return{bg:"#2a1a0a",bd:"#ea580c",tx:"#fdba74",lb:"HIGH"};if(t==="medium")return{bg:"#2a2a0a",bd:"#ca8a04",tx:"#fde047",lb:"MED"};return{bg:"#0a2a15",bd:"#16a34a",tx:"#86efac",lb:"LOW"};};
  const bf={fontFamily:"'SF Mono','JetBrains Mono','Fira Code',monospace"};
  const D=dark;
  const T={bg:D?"#080c14":"#f5f5f0",fg:D?"#d0d8e4":"#1a1a1a",card:D?"#0e1824":"#ffffff",bdr:D?"#1c3050":"#d4d4d4",sub:D?"#3a5a70":"#888888",inp:D?"#060c16":"#f0f0ea",accent:"#34d399",hdr:D?"linear-gradient(135deg,#0c1420,#14243a)":"linear-gradient(135deg,#e8f5e9,#c8e6c9)",tabBg:D?"#0a1018":"#eaeae4",note:D?"#6a8a9a":"#555555",noteBg:D?"#060c16":"#f0f0ea",abg:D?"#8aa0b8":"#444444"};
  const S={
    c:{background:T.card,borderRadius:8,border:`1px solid ${T.bdr}`,padding:12,marginBottom:8},
    lb:{fontSize:10,fontWeight:700,color:T.accent,letterSpacing:1,textTransform:"uppercase",marginBottom:6},
    g3:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6},g2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6},
    sb:(c="#34d399")=>({textAlign:"center",padding:"7px 4px",background:T.inp,borderRadius:6,border:`1px solid ${c}20`}),
    sv:(c="#34d399")=>({fontSize:20,fontWeight:800,color:c,lineHeight:1}),
    sl:{fontSize:8,color:T.sub,letterSpacing:0.8,textTransform:"uppercase",marginTop:3},
    i:{...bf,background:T.inp,border:`1px solid ${T.bdr}`,borderRadius:5,padding:"7px 9px",color:T.fg,fontSize:12,width:"100%",outline:"none"},
    ta:{...bf,background:T.inp,border:`1px solid ${T.bdr}`,borderRadius:5,padding:"7px 9px",color:T.fg,fontSize:11,width:"100%",minHeight:100,outline:"none",resize:"vertical"},
    b:(c="#34d399",sm=false)=>({...bf,padding:sm?"5px 9px":"9px 14px",borderRadius:5,border:`1px solid ${c}`,background:D?`${c}12`:`${c}18`,color:c,fontSize:sm?9:11,fontWeight:700,cursor:"pointer"}),
    bs:(c="#34d399")=>({...bf,padding:"9px 14px",borderRadius:5,border:"none",background:c,color:D?"#080c14":"#ffffff",fontSize:11,fontWeight:800,cursor:"pointer"}),
    se:{...bf,background:T.inp,border:`1px solid ${T.bdr}`,borderRadius:5,padding:"7px 9px",color:T.fg,fontSize:12,width:"100%",outline:"none"},
    ax:(t)=>({padding:"7px 9px",borderRadius:5,marginBottom:3,fontSize:11,borderLeft:`3px solid ${t==="danger"?"#ef4444":t==="warning"?"#eab308":"#34d399"}`,background:t==="danger"?(D?"#180808":"#fef2f2"):t==="warning"?(D?"#181408":"#fefce8"):(D?"#081814":"#ecfdf5"),color:t==="danger"?"#ef4444":t==="warning"?"#ca8a04":"#059669"}),
    tn:(on)=>({...bf,flex:"0 0 auto",padding:"9px 10px",fontSize:8,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",cursor:"pointer",border:"none",background:"transparent",color:on?T.accent:T.sub,borderBottom:on?`2px solid ${T.accent}`:"2px solid transparent",whiteSpace:"nowrap"}),
  };

  // PITCHING TAB
  const[vi,si]=useState("");
  const PT=()=>{const go=(s)=>{lP(s,vi?parseFloat(vi):null);si("");};
    const pcc=pc>=65?"#ef4444":pc>=50?"#ea580c":pc>=35?"#eab308":"#34d399";const fc=f5!=="--"&&+f5<40?"#ef4444":f5!=="--"&&+f5<50?"#eab308":"#34d399";const vc=vdp&&+vdp>8?"#ef4444":"#34d399";const rc=rst.d>=3?"#ef4444":rst.d>=2?"#ea580c":rst.d>=1?"#eab308":"#34d399";
    return(<div>
      <div style={S.c}><div style={{display:"flex",gap:6}}><select style={{...S.se,flex:1}} value={pN} onChange={e=>{if(pc>0)rP();sPN(e.target.value);}}>{Object.keys(MY_P).map(n=><option key={n}>{n}</option>)}<option>Other</option></select><button style={S.b("#ef4444",true)} onClick={rP}>DONE</button></div>
        {doneReport&&<div style={{marginTop:6,padding:"8px 10px",background:"#081814",borderRadius:5,border:"1px solid #34d399",cursor:"pointer"}} onClick={()=>{navigator.clipboard?.writeText(doneReport);addA("Copied!","info");}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:8,color:"#34d399",fontWeight:700}}>PITCHER REPORT — TAP TO COPY</span><span style={{fontSize:8,color:"#3a5a70",cursor:"pointer"}} onClick={e=>{e.stopPropagation();sDoneReport(null);}}>DISMISS</span></div><div style={{fontSize:11,color:"#d0d8e4"}}>{doneReport}</div></div>}
        <div style={{display:"flex",gap:8,marginTop:5,fontSize:10,color:"#3a5a70",flexWrap:"wrap"}}><span>INN <b style={{color:"#d0d8e4"}}>{inn}</b></span><span>OUTS <b style={{color:"#d0d8e4"}}>{ot}</b></span><span>BF <b style={{color:"#d0d8e4"}}>{tb}</b></span><span>REST <b style={{color:rc}}>{rst.d}d</b></span></div>
        {curP&&<div style={{marginTop:6,padding:"6px 8px",background:T.noteBg,borderRadius:5,fontSize:10,color:T.note}}><b style={{color:"#34d399"}}>Profile:</b> {curP.ppi>0?`${curP.ppi} P/IP | ${curP.fps}% FPS | ${curP.bb} BB/inn | ${curP.proj35} @35p | Fatigue ~${curP.fat}p`:curP.notes}</div>}</div>
      <div style={S.c}><div style={S.g3}><div style={S.sb(pcc)}><div style={S.sv(pcc)}>{pc}</div><div style={S.sl}>Pitches</div></div><div style={S.sb()}><div style={S.sv()}>{sp}%</div><div style={S.sl}>Strike %</div></div><div style={S.sb(fc)}><div style={S.sv(fc)}>{fa}%</div><div style={S.sl}>FPS %</div></div></div>
        <div style={{...S.g3,marginTop:6}}><div style={S.sb(fc)}><div style={{...S.sv(fc),fontSize:15}}>{f5}%</div><div style={S.sl}>FPS Last 5</div></div><div style={S.sb()}><div style={{...S.sv(),fontSize:15}}>{avv}</div><div style={S.sl}>Avg Velo</div></div><div style={S.sb(vc)}><div style={{...S.sv(vc),fontSize:15}}>{vdp?`-${vdp}%`:"--"}</div><div style={S.sl}>Velo Drop</div></div></div></div>
      <div style={S.c}><div style={S.lb}>Pitch Count / Rest</div><div style={{height:16,background:"#060c16",borderRadius:8,overflow:"hidden",position:"relative"}}><div style={{height:"100%",width:`${Math.min(pc/PG_MAX*100,100)}%`,background:pc>=66?"linear-gradient(90deg,#ef4444,#dc2626)":pc>=51?"linear-gradient(90deg,#ea580c,#ef4444)":pc>=36?"linear-gradient(90deg,#eab308,#ea580c)":pc>=21?"linear-gradient(90deg,#34d399,#eab308)":"#34d399",borderRadius:8,transition:"width 0.3s"}}/>{[20,35,50,65,75].map(x=><div key={x} style={{position:"absolute",left:`${x/PG_MAX*100}%`,top:0,height:"100%",width:1,background:"#ffffff30"}}/>)}</div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"#3a5a70",marginTop:3}}><span>0d:20</span><span style={{color:"#eab308"}}>1d:35</span><span style={{color:"#ea580c"}}>2d:50</span><span style={{color:"#ef4444"}}>3d:65</span><span style={{color:"#dc2626"}}>MAX:75</span></div>
        {nxt&&pc>0&&<div style={{marginTop:4,fontSize:10,color:rc}}>{rst.l}. {nxt.th-pc}p until {nxt.nd}-day rest.</div>}</div>
      {vl.length>0&&<div style={S.c}><div style={S.lb}>Velocity (Peak: {pkv})</div><div style={{display:"flex",alignItems:"flex-end",gap:2,height:50}}>{vl.slice(-35).map((v,i)=>{const p=+pkv>0?v/+pkv*100:50;return<div key={i} style={{height:Math.max(8,p*0.5),width:5,borderRadius:2,background:p>92?"#34d399":p>85?"#eab308":"#ef4444"}}/>;})}</div></div>}
      <div style={S.c}><div style={S.lb}>Log Pitch</div><input style={{...S.i,width:100,marginBottom:8}} value={vi} onChange={e=>si(e.target.value)} placeholder="Velo" type="number" step="0.1"/>
        <div style={S.g2}><button style={S.bs("#34d399")} onClick={()=>go(true)}>STRIKE</button><button style={S.bs("#ef4444")} onClick={()=>go(false)}>BALL</button></div>
        <div style={{display:"flex",gap:4,marginTop:8,flexWrap:"wrap"}}>{[["K","#34d399"],["GO","#34d399"],["FO","#34d399"],["1B","#eab308"],["2B","#eab308"],["3B","#ea580c"],["BB","#ef4444"],["HBP","#ef4444"]].map(([r,c])=><button key={r} style={S.b(c,true)} onClick={()=>["K","GO","FO"].includes(r)?rO(r):eAB(r)}>{r}</button>)}</div></div>
      <div style={S.c}><div style={S.lb}>Our Staff (PG 9-10U)</div><div style={{fontSize:9,color:"#3a5a70",marginBottom:6}}>Daily max 75p. Weekend max 100p.</div>
        {Object.entries(MY_P).map(([n])=>{const a=pAv[n];const rd=a?gR(a.pc):{d:0};const ok=!a||rd.d===0;const g2=a&&a.pc<=20;const wk=weekPC[n]||0;const wkRem=100-wk;const wkMax=Math.min(wkRem,PG_MAX);const wkC=wkRem<=0?"#ef4444":wkRem<=20?"#ea580c":wkRem<=35?"#eab308":"#34d399";
          return(<div key={n} style={{padding:"5px 0",borderBottom:"1px solid #1c305030"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:11,color:n===pN?T.accent:T.text,fontWeight:n===pN?800:400}}>{n}</span>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {wk>0&&<span style={{fontSize:9,color:wkC,fontWeight:700}}>{wkRem}p left</span>}
                <span style={{fontSize:9,color:ok?T.accent:"#ef4444",fontWeight:700}}>{n===pN&&pc>0?`${pc}p live`:a?`${a.pc}p ${ok?"AVAIL":`${rd.d}d`}${g2&&ok?" G2ok":""}`:"Avail"}</span>
              </div></div>
            {wk>0&&<div style={{height:4,background:T.input,borderRadius:2,marginTop:3,overflow:"hidden"}}><div style={{height:"100%",width:`${wk/100*100}%`,background:wkC,borderRadius:2}}/></div>}
          </div>);})
        }<div style={{marginTop:8,padding:8,background:T.input,borderRadius:5}}>
          <div style={{...S.lb,fontSize:9}}>Set Weekend Pitch Count</div>
          <div style={{display:"flex",gap:4}}>
            <select style={{...S.se,flex:2}} value={weekInput} onChange={e=>sWeekInput(e.target.value)}>
              <option value="">Select pitcher</option>
              {Object.keys(MY_P).map(n=><option key={n} value={n}>{n} {weekPC[n]?`(${weekPC[n]}p)`:""}</option>)}
            </select>
            <input style={{...S.i,flex:1}} placeholder="P#" type="number" id="weekPcInput"/>
            <button style={S.b(T.accent,true)} onClick={()=>{if(!weekInput)return;const v=parseInt(document.getElementById("weekPcInput").value)||0;sWeekPC(p=>({...p,[weekInput]:v}));document.getElementById("weekPcInput").value="";}}>SET</button>
          </div>
          <button style={{...S.b("#ef4444",true),width:"100%",marginTop:4}} onClick={()=>sWeekPC({})}>RESET ALL</button>
        </div></div>
    </div>);};

  // LINEUP TAB
  const logOurAB=(name,res)=>{sOurAB(p=>({...p,[name]:[...(p[name]||[]),res]}));};
  const LT=()=>{const opSP=opStr+opBall>0?((opStr/(opStr+opBall))*100).toFixed(0):"--";
    return(<div>
    <div style={S.c}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={S.lb}>Score</div><div style={{display:"flex",gap:6,alignItems:"center"}}><button style={S.b("#34d399",true)} onClick={()=>sMyS(p=>p+1)}>US+</button><span style={{fontSize:16,fontWeight:800,color:T.text}}>{myS}-{opS}</span><button style={S.b("#ef4444",true)} onClick={()=>sOpS(p=>p+1)}>THEM+</button></div></div><div style={{display:"flex",gap:4,marginTop:6}}><button style={S.b("#3a5a70",true)} onClick={()=>sMyS(p=>Math.max(0,p-1))}>US-</button><button style={S.b("#3a5a70",true)} onClick={()=>sOpS(p=>Math.max(0,p-1))}>THEM-</button><button style={S.b("#ef4444",true)} onClick={()=>{sMyS(0);sOpS(0);}}>RESET</button></div></div>

    <div style={S.c}><div style={S.lb}>Their Pitcher</div>
      <div style={{display:"flex",gap:6,marginBottom:6}}><input style={{...S.i,flex:2}} value={opN} onChange={e=>sOpN(e.target.value)} placeholder="Opponent pitcher name"/><input style={{...S.i,flex:1}} value={opVIn} onChange={e=>sOpVIn(e.target.value)} placeholder="Velo" type="number" step="0.1"/></div>
      <div style={S.g3}><div style={S.sb()}><div style={S.sv()}>{opPC}</div><div style={S.sl}>Pitches</div></div><div style={S.sb()}><div style={{...S.sv(),fontSize:15}}>{opSP}%</div><div style={S.sl}>Strike %</div></div><div style={S.sb()}><div style={{...S.sv(),fontSize:15}}>{opVelos.length>0?Math.max(...opVelos).toFixed(1):"--"}</div><div style={S.sl}>Peak Velo</div></div></div>
      <div style={{display:"flex",gap:4,marginTop:8,flexWrap:"wrap"}}><button style={S.bs("#34d399")} onClick={()=>{sOpPC(p=>p+1);sOpStr(p=>p+1);if(opVIn){sOpVelos(p=>[...p,parseFloat(opVIn)]);}sOpVIn("");}}>STR</button><button style={S.bs("#ef4444")} onClick={()=>{sOpPC(p=>p+1);sOpBall(p=>p+1);if(opVIn){sOpVelos(p=>[...p,parseFloat(opVIn)]);}sOpVIn("");}}>BALL</button><button style={S.b("#3a5a70",true)} onClick={()=>{const pk=opVelos.length>0?Math.max(...opVelos).toFixed(1):"?";const av=opVelos.length>0?(opVelos.reduce((a,b)=>a+b,0)/opVelos.length).toFixed(1):"?";const msg=`Their P ${opN||"?"}: ${opPC}p, ${opSP}% STR, Peak ${pk}, Avg ${av}`;addC(msg);navigator.clipboard?.writeText(msg);addA("Copied!","info");}}>REPORT</button><button style={S.b("#ef4444",true)} onClick={()=>{sOpPC(0);sOpStr(0);sOpBall(0);sOpN("");sOpVelos([]);sOpVIn("");}}>NEW P</button></div>
      {opVelos.length>0&&<div style={{display:"flex",alignItems:"flex-end",gap:2,height:35,marginTop:6}}>{opVelos.slice(-30).map((v,i)=>{const pk=Math.max(...opVelos);const p=pk>0?v/pk*100:50;return <div key={i} style={{height:Math.max(6,p*0.35),width:4,borderRadius:2,background:p>92?"#34d399":p>85?"#eab308":"#ef4444"}}/>;})}</div>}</div>

    <div style={S.c}><div style={S.lb}>Our At-Bats</div>
      {MY_B.map((b,i)=>{const res=ourAB[b.name]||[];const rc=b.risp>=.4?"#34d399":b.risp>=.25?"#eab308":"#ef4444";
        return(<div key={i} style={{padding:"6px 0",borderBottom:"1px solid #1c305040"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><span style={{fontSize:9,color:"#3a5a70",marginRight:4}}>#{b.o}</span><span style={{fontWeight:700,fontSize:12,color:"#d0d8e4"}}>{b.name}</span></div><span style={{fontSize:9,color:rc}}>RISP {b.risp.toFixed(3)}</span></div>
          <div style={{display:"flex",gap:8,marginTop:2,fontSize:9,color:"#3a5a70"}}><span>AVG <b style={{color:"#d0d8e4"}}>{b.avg.toFixed(3)}</b></span><span>OBP <b style={{color:"#d0d8e4"}}>{b.obp.toFixed(3)}</b></span><span>CT <b>{b.ct}%</b></span></div>
          {res.length>0&&<div style={{display:"flex",gap:3,marginTop:3,flexWrap:"wrap"}}>{res.map((r,j)=><span key={j} style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:["K","GO","FO"].includes(r)?"#081814":"#0a1a10",color:["K","GO","FO"].includes(r)?"#ef4444":"#34d399"}}>{r}</span>)}</div>}
          <div style={{display:"flex",gap:3,marginTop:3,flexWrap:"wrap"}}>{[["1B","#34d399"],["2B","#34d399"],["3B","#34d399"],["HR","#34d399"],["BB","#eab308"],["HBP","#eab308"],["K","#ef4444"],["GO","#ef4444"],["FO","#ef4444"]].map(([r,c])=><button key={r} style={{...S.b(c,true),padding:"3px 6px",fontSize:8}} onClick={()=>logOurAB(b.name,r)}>{r}</button>)}</div>
        </div>);})}</div>
  </div>);};

  // SCOUTING TAB
  const ScT=()=>(<div>
    <div style={S.c}><div style={S.lb}>Opponent</div><select style={S.se} value={acT} onChange={e=>{sAcT(e.target.value);sCH(null);sLA({});}}>{Object.keys(aT).map(t=><option key={t} value={t}>{t} ({aT[t].length}p)</option>)}</select></div>
    {sc.map((h,i)=>{const c=tc(h.threat);const lv=lA[h.name]||[];const on=cH===i;
      return(<div key={i} style={{...S.c,borderColor:on?"#34d399":`${c.bd}44`,borderWidth:on?2:1,cursor:"pointer"}} onClick={()=>sCH(on?null:i)}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><span style={{fontWeight:800,fontSize:13,color:T.fg}}>{h.name}{h.number&&<span style={{color:"#3a5a70"}}> #{h.number}</span>}</span><span style={{fontSize:9,color:"#3a5a70",marginLeft:6}}>{h.pos}</span></div>
          <span style={{fontSize:8,fontWeight:700,padding:"2px 7px",borderRadius:3,background:c.bg,color:c.tx,border:`1px solid ${c.bd}`}}>{c.lb}</span></div>
        <div style={{display:"flex",gap:10,marginTop:4,fontSize:10}}><span style={{color:"#3a5a70"}}>AVG <b style={{color:h.avg>=.4?"#fca5a5":"#d0d8e4"}}>{h.avg.toFixed(3)}</b></span><span style={{color:"#3a5a70"}}>OBP <b style={{color:"#d0d8e4"}}>{h.obp.toFixed(3)}</b></span><span style={{color:"#3a5a70"}}>SO <b style={{color:"#d0d8e4"}}>{h.so}</b></span><span style={{color:"#3a5a70"}}>SB <b style={{color:h.sb>=7?"#fca5a5":"#d0d8e4"}}>{h.sb}</b></span></div>
        {lv.length>0&&<div style={{display:"flex",gap:3,marginTop:5,flexWrap:"wrap"}}>{lv.map((r,j)=><span key={j} style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:["K","GO","FO"].includes(r)?"#081814":"#180808",color:["K","GO","FO"].includes(r)?"#34d399":"#fca5a5"}}>{r}</span>)}</div>}
        {on&&<div style={{marginTop:6}}>
          <div style={{padding:"7px 9px",background:T.noteBg,borderRadius:5,fontSize:11,color:T.abg,lineHeight:1.5,borderLeft:`3px solid ${c.bd}`,marginBottom:4}}><b style={{color:c.tx}}>APPROACH:</b> {h.notes}</div>
          {h.def&&<div style={{padding:"7px 9px",background:T.noteBg,borderRadius:5,fontSize:11,color:T.abg,lineHeight:1.5,borderLeft:"3px solid #3b82f6"}}><b style={{color:"#93c5fd"}}>DEFENSE:</b> {h.def}</div>}
          {h.sb>=7&&<div style={{marginTop:4,padding:"3px 7px",background:"#180505",borderRadius:3,color:"#fca5a5",fontSize:10}}>STEAL ALERT: {h.sb} SB</div>}</div>}
      </div>);})}
  </div>);

  // MANAGE TAB
  const MT=()=>{
    
    if(mV==="edit")return(<div><button style={{...S.b("#3a5a70",true),marginBottom:8}} onClick={()=>sMV("list")}>Back</button>
      <div style={S.c}><div style={S.lb}>Edit Team</div><input style={{...S.i,marginBottom:8}} value={eN} onChange={e=>sEN(e.target.value)} placeholder="Team name"/>
        {eP.map((p,i)=>(<div key={i} style={{padding:"6px 0",borderBottom:"1px solid #1c3050",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><span style={{fontSize:12,fontWeight:700,color:"#d0d8e4"}}>{p.name}</span><span style={{fontSize:10,color:"#3a5a70",marginLeft:4}}>#{p.number} {p.pos}</span></div>
          <div style={{display:"flex",gap:4}}><select style={{...S.se,width:70,fontSize:10,padding:3}} value={p.threat} onChange={e=>{const u=[...eP];u[i]={...u[i],threat:e.target.value};sEP(u);}}><option value="elite">Elite</option><option value="high">High</option><option value="medium">Med</option><option value="low">Low</option></select><button style={S.b("#ef4444",true)} onClick={()=>sEP(x=>x.filter((_,j)=>j!==i))}>X</button></div></div>))}
        <div style={{marginTop:10,padding:8,background:T.input,borderRadius:5}}><div style={{...S.lb,fontSize:9}}>Add Player</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 50px 50px",gap:4,marginBottom:4}}><input style={S.i} placeholder="Name" value={nf.name} onChange={e=>sNf(p=>({...p,name:e.target.value}))}/><input style={S.i} placeholder="#" value={nf.number} onChange={e=>sNf(p=>({...p,number:e.target.value}))}/><input style={S.i} placeholder="Pos" value={nf.pos} onChange={e=>sNf(p=>({...p,pos:e.target.value}))}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4,marginBottom:4}}><input style={S.i} placeholder="AVG" value={nf.avg} onChange={e=>sNf(p=>({...p,avg:e.target.value}))}/><input style={S.i} placeholder="OBP" value={nf.obp} onChange={e=>sNf(p=>({...p,obp:e.target.value}))}/><input style={S.i} placeholder="SO" value={nf.so} onChange={e=>sNf(p=>({...p,so:e.target.value}))}/><input style={S.i} placeholder="SB" value={nf.sb} onChange={e=>sNf(p=>({...p,sb:e.target.value}))}/></div>
          <input style={{...S.i,marginBottom:4}} placeholder="Notes" value={nf.notes} onChange={e=>sNf(p=>({...p,notes:e.target.value}))}/>
          <input style={{...S.i,marginBottom:4}} placeholder="Defensive alignment notes" value={nf.def} onChange={e=>sNf(p=>({...p,def:e.target.value}))}/>
          <button style={{...S.b("#34d399",true),width:"100%"}} onClick={()=>{if(!nf.name)return;sEP(p=>[...p,{name:nf.name,number:nf.number,pos:nf.pos,avg:parseFloat(nf.avg)||0,obp:parseFloat(nf.obp)||0,so:parseInt(nf.so)||0,sb:parseInt(nf.sb)||0,xbh:0,threat:nf.avg&&parseFloat(nf.avg)>=.4?"high":"medium",notes:nf.notes||"",def:nf.def||""}]);sNf({name:"",number:"",pos:"",avg:"",obp:"",so:"",sb:"",notes:"",def:""});}}>Add</button></div>
        <button style={{...S.bs("#34d399"),marginTop:10,width:"100%"}} onClick={()=>{svTm(eN,eP);sMV("list");}}>Save Team</button></div></div>);
    return(<div><div style={S.c}><div style={S.lb}>Scouted Teams</div>
      {Object.entries(aT).map(([n,pl])=>(<div key={n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #1c3050"}}><div><div style={{fontSize:13,fontWeight:700,color:"#d0d8e4"}}>{n}</div><div style={{fontSize:10,color:"#3a5a70"}}>{pl.length}p</div></div>
        <div style={{display:"flex",gap:4}}><button style={S.b("#34d399",true)} onClick={()=>{sEN(n);sEP([...pl]);sMV("edit");}}>Edit</button><button style={S.b("#ef4444",true)} onClick={()=>{if(Object.keys(aT).length>1)dTm(n);}}>Del</button></div></div>))}</div>
      <button style={{...S.bs("#34d399"),width:"100%"}} onClick={()=>{sEN("New Team");sEP([]);sMV("edit");}}>+ Add Team Manually</button></div>);};

  // SESSION EXPORT
  const exportSession=()=>{
    const now=new Date();const dt=now.toLocaleDateString();const tm=now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    let txt=`DUGOUT INTEL — Game Report\n${dt} ${tm}\n${"=".repeat(40)}\n\n`;
    txt+=`SCORE: Armadillos ${myS} - ${opS} Opponent\n\n`;
    // Our pitchers used
    const usedP=Object.entries(pAv).filter(([,v])=>v.dt===now.toISOString().split('T')[0]);
    if(usedP.length>0){txt+=`OUR PITCHERS:\n`;usedP.forEach(([n,v])=>{const r=gR(v.pc);txt+=`  ${n}: ${v.pc}p — ${r.l}\n`;});txt+=`\n`;}
    // Our at-bats
    const abEntries=Object.entries(ourAB).filter(([,v])=>v.length>0);
    if(abEntries.length>0){txt+=`OUR AT-BATS:\n`;abEntries.forEach(([n,res])=>{const h=res.filter(r=>["1B","2B","3B","HR"].includes(r)).length;const ab=res.filter(r=>!["BB","HBP"].includes(r)).length;const avg=ab>0?(h/ab).toFixed(3):".000";txt+=`  ${n}: ${res.join(", ")} (${h}-${ab}, ${avg})\n`;});txt+=`\n`;}
    // Opponent pitcher
    if(opPC>0){const opSP=opStr+opBall>0?((opStr/(opStr+opBall))*100).toFixed(0):"--";txt+=`THEIR PITCHER: ${opN||"Unknown"} — ${opPC}p, ${opSP}% strikes, ${gR(opPC).l}\n\n`;}
    // Coach messages
    if(cM.length>0){txt+=`COACH MESSAGES:\n`;cM.slice().reverse().forEach(m=>{txt+=`  [${m.time}] ${m.msg}\n`;});txt+=`\n`;}
    // Alerts
    if(al.length>0){txt+=`ALERTS:\n`;al.slice().reverse().forEach(a=>{txt+=`  [${a.type.toUpperCase()}] ${a.msg}\n`;});}
    return txt;
  };
  const downloadSession=()=>{const txt=exportSession();const blob=new Blob([txt],{type:"text/plain"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`DugoutIntel_${new Date().toISOString().split('T')[0]}_${myS}-${opS}.txt`;a.click();URL.revokeObjectURL(url);addA("Downloaded!","info");};
  const copySession=()=>{const txt=exportSession();navigator.clipboard?.writeText(txt);addA("Full report copied!","info");};

  // COACH TAB
  const CT=()=>(<div><div style={S.c}><div style={S.lb}>Coach Messages</div><div style={{fontSize:10,color:"#3a5a70",marginBottom:6}}>Tap to copy.</div>
    {cM.length===0&&<div style={{fontSize:11,color:"#3a5a70",fontStyle:"italic"}}>Auto-generates as you log pitches.</div>}
    {cM.map((m,i)=>(<div key={i} style={{padding:"8px 10px",background:"#060c16",borderRadius:5,marginBottom:4,cursor:"pointer",border:"1px solid #1c3050"}} onClick={()=>{navigator.clipboard?.writeText(m.msg);addA("Copied!","info");}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:8,color:"#3a5a70"}}>{m.time}</span><span style={{fontSize:8,color:"#34d399"}}>COPY</span></div><div style={{fontSize:11,color:"#d0d8e4"}}>{m.msg}</div></div>))}</div>
    <div style={S.c}><div style={S.lb}>Quick Alerts</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{["Move up in box","Slide step!","Mound visit","Be patient","Steal next pitch","Warm someone up","Infield in"].map((m,i)=><button key={i} style={S.b("#34d399",true)} onClick={()=>addC(m)}>{m}</button>)}</div></div>
    <div style={S.c}><div style={S.lb}>Export Game Session</div><div style={{fontSize:10,color:T.sub,marginBottom:6}}>Save the full game report with all pitcher data, at-bats, messages, and alerts.</div>
      <div style={S.g2}><button style={S.bs("#34d399")} onClick={copySession}>Copy to Clipboard</button><button style={S.bs("#3b82f6")} onClick={downloadSession}>Download .txt File</button></div></div></div>);

  // FEED TAB
  const FT=()=>(<div><div style={S.c}><div style={S.lb}>Live Feed</div>{al.length===0&&<div style={{fontSize:11,color:"#3a5a70",fontStyle:"italic"}}>Alerts appear as you log pitches.</div>}{al.map(a=><div key={a.id} style={S.ax(a.type)}>{a.msg}</div>)}</div></div>);

  // INTEL TAB — Opponent Weekend Pitch Budgets
  const PG_EVENT_MAX = 100;
  const IT=()=>{
    const teams=Object.keys(oppBudget);const curBudget=oppBudget[budgetTeam]||{};
    const addPitcher=()=>{if(!budgetAdd.name||!budgetAdd.pitches)return;const p=parseInt(budgetAdd.pitches)||0;
      sOppBudget(prev=>({...prev,[budgetTeam]:{...(prev[budgetTeam]||{}),
        [budgetAdd.name]:{sat:p,notes:`${p}p Saturday`}}}));
      sBudgetAdd({name:"",pitches:""});};
    const removePitcher=(name)=>{sOppBudget(prev=>{const t={...(prev[budgetTeam]||{})};delete t[name];return{...prev,[budgetTeam]:t};});};
    const addNewTeam=()=>{if(!budgetTeam.trim())return;if(!oppBudget[budgetTeam])sOppBudget(prev=>({...prev,[budgetTeam]:{}}));};
    return(<div>
      <div style={S.c}><div style={S.lb}>Opponent Pitch Budget</div>
        <p style={{fontSize:10,color:"#3a5a70",marginBottom:8}}>Track opponent pitchers from Saturday to know who is available/limited on Sunday. PG weekend max: {PG_EVENT_MAX}p.</p>
        <div style={{display:"flex",gap:6,marginBottom:6}}><input style={{...S.i,flex:1}} value={budgetTeam} onChange={e=>sBudgetTeam(e.target.value)} placeholder="Opponent team name"/>
          <button style={S.b("#34d399",true)} onClick={addNewTeam}>+</button></div>
        {teams.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{teams.map(t=><button key={t} style={S.b(t===budgetTeam?"#34d399":"#3a5a70",true)} onClick={()=>sBudgetTeam(t)}>{t}</button>)}</div>}
      </div>

      <div style={{...S.c,display:budgetTeam?"block":"none"}}><div style={S.lb}>{budgetTeam||"Select team"} — Sunday Availability</div>
        {Object.keys(curBudget).length===0&&<div style={{fontSize:11,color:"#3a5a70",fontStyle:"italic",marginBottom:8}}>Add pitchers and their Saturday pitch counts below.</div>}
        {Object.entries(curBudget).map(([name,data])=>{const remaining=PG_EVENT_MAX-data.sat;const restDay=gR(data.sat);const canPitch=restDay.d===0;const dailyMax=Math.min(remaining,PG_MAX);
          const barPct=data.sat/PG_EVENT_MAX*100;const rc=remaining<=0?"#ef4444":remaining<=20?"#ea580c":remaining<=35?"#eab308":"#34d399";
          return(<div key={name} style={{padding:"8px 0",borderBottom:"1px solid #1c305040"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:700,fontSize:12,color:"#d0d8e4"}}>{name}</span>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <span style={{fontSize:10,fontWeight:700,color:canPitch?rc:"#ef4444"}}>{canPitch?`${dailyMax}p avail`:"RESTING"}</span>
                <button style={{...S.b("#ef4444",true),padding:"2px 5px",fontSize:8}} onClick={()=>removePitcher(name)}>X</button>
              </div></div>
            <div style={{display:"flex",gap:8,marginTop:3,fontSize:9,color:"#3a5a70"}}>
              <span>Sat: <b style={{color:"#d0d8e4"}}>{data.sat}p</b></span>
              <span>Remaining: <b style={{color:rc}}>{Math.max(remaining,0)}p</b></span>
              <span>Rest: <b style={{color:canPitch?"#34d399":"#ef4444"}}>{restDay.l}</b></span>
              {canPitch&&<span>Sun max: <b style={{color:rc}}>{dailyMax}p</b></span>}
            </div>
            <div style={{height:8,background:"#060c16",borderRadius:4,marginTop:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${barPct}%`,background:remaining<=0?"#ef4444":remaining<=20?"#ea580c":"#eab308",borderRadius:4,transition:"width 0.3s"}}/></div>
            {!canPitch&&<div style={{marginTop:3,padding:"2px 6px",background:"#180808",borderRadius:3,color:"#fca5a5",fontSize:9}}>Threw {data.sat}p Sat = {restDay.l} rest. CANNOT PITCH SUNDAY.</div>}
            {canPitch&&remaining<=20&&<div style={{marginTop:3,padding:"2px 6px",background:"#181408",borderRadius:3,color:"#fde047",fontSize:9}}>LIMITED: Only {remaining}p left for the weekend.</div>}
          </div>);})}

        <div style={{marginTop:10,padding:8,background:"#060c16",borderRadius:5}}>
          <div style={{...S.lb,fontSize:9}}>Add Saturday Pitcher</div>
          <div style={{display:"flex",gap:4}}>
            <input style={{...S.i,flex:2}} value={budgetAdd.name} onChange={e=>{const v=e.target.value;sBudgetAdd(p=>({...p,name:v}))}} placeholder="Pitcher name"/>
            <input style={{...S.i,flex:1}} value={budgetAdd.pitches} onChange={e=>{const v=e.target.value;sBudgetAdd(p=>({...p,pitches:v}))}} placeholder="Sat P" type="number"/>
            <button style={S.b("#34d399",true)} onClick={addPitcher}>Add</button>
          </div></div>

        {Object.keys(curBudget).length>0&&<button style={{...S.b("#3a5a70",true),width:"100%",marginTop:8}} onClick={()=>{
          const lines=Object.entries(curBudget).map(([n,d])=>{const rem=PG_EVENT_MAX-d.sat;const r=gR(d.sat);return r.d===0?`${n}: ${d.sat}p Sat, ${Math.min(rem,PG_MAX)}p avail Sun`:`${n}: ${d.sat}p Sat, RESTING (${r.l})`;});
          const txt=`${budgetTeam} Sunday Availability:\n`+lines.join("\n");
          navigator.clipboard?.writeText(txt);addA("Copied!","info");
        }}>Copy Full Report</button>}
      </div>
    </div>);};

    const tabs=[{id:"pitching",l:"Pitch"},{id:"lineup",l:"Lineup"},{id:"scouting",l:"Scout"},{id:"intel",l:"Intel"},{id:"manage",l:"Teams"},{id:"coach",l:"Coach",b:cM.length},{id:"feed",l:"Feed"}];

  return(<div style={{...bf,background:T.bg,color:T.fg,minHeight:"100vh",maxWidth:480,margin:"0 auto"}}>
    <div style={{background:T.hdr,padding:"14px 16px 10px",borderBottom:`1px solid ${T.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><h1 style={{fontSize:17,fontWeight:800,color:T.accent,margin:0,letterSpacing:-0.5}}>DUGOUT INTEL</h1><div style={{fontSize:9,color:T.sub,letterSpacing:2,textTransform:"uppercase",marginTop:1}}>Real-Time Coaching Intelligence</div></div><button style={{...bf,background:"none",border:`1px solid ${T.bdr}`,borderRadius:5,padding:"4px 8px",fontSize:9,color:T.sub,cursor:"pointer"}} onClick={()=>sDark(p=>!p)}>{D?"LIGHT":"DARK"}</button></div>
    <div style={{display:"flex",background:T.tabBg,borderBottom:`1px solid ${T.bdr}`,overflow:"auto"}}>{tabs.map(t=>(<button key={t.id} style={S.tn(tab===t.id)} onClick={()=>sTab(t.id)}>{t.l}{t.b>0&&<span style={{display:"inline-block",width:14,height:14,borderRadius:"50%",background:"#ef4444",color:"#fff",fontSize:8,lineHeight:"14px",textAlign:"center",marginLeft:3,fontWeight:800}}>{t.b}</span>}</button>))}</div>
    <div style={{padding:10,paddingBottom:50}}>{tab==="pitching"&&PT()}{tab==="lineup"&&LT()}{tab==="scouting"&&ScT()}{tab==="intel"&&IT()}{tab==="manage"&&MT()}{tab==="coach"&&CT()}{tab==="feed"&&FT()}</div></div>);
}
