/* ============================================================
   星詠み日記 - app.js
   ============================================================ */

const { Origin, Horoscope } = window.AstroLib;

/* ---------- 定数 ---------- */

const SIGNS = [
  { key:"aries",       ja:"牡羊座", glyph:"♈", color:"#e2585f" },
  { key:"taurus",      ja:"牡牛座", glyph:"♉", color:"#f0a04b" },
  { key:"gemini",      ja:"双子座", glyph:"♊", color:"#4caf82" },
  { key:"cancer",      ja:"蟹座",   glyph:"♋", color:"#4a90d9" },
  { key:"leo",         ja:"獅子座", glyph:"♌", color:"#e2585f" },
  { key:"virgo",       ja:"乙女座", glyph:"♍", color:"#f0a04b" },
  { key:"libra",       ja:"天秤座", glyph:"♎", color:"#4caf82" },
  { key:"scorpio",     ja:"蠍座",   glyph:"♏", color:"#4a90d9" },
  { key:"sagittarius", ja:"射手座", glyph:"♐", color:"#e2585f" },
  { key:"capricorn",   ja:"山羊座", glyph:"♑", color:"#f0a04b" },
  { key:"aquarius",    ja:"水瓶座", glyph:"♒", color:"#4caf82" },
  { key:"pisces",      ja:"魚座",   glyph:"♓", color:"#4a90d9" },
];

// メジャーアスペクトの定義 (角度, 許容オーブ, グリフ, 色)
const ASPECTS = [
  { name:"conjunction", angle:0,   orb:8, glyph:"☌", color:"#9b9186" },
  { name:"sextile",     angle:60,  orb:6, glyph:"⚹", color:"#4a90d9" },
  { name:"square",      angle:90,  orb:7, glyph:"□", color:"#d1486a" },
  { name:"trine",       angle:120, orb:8, glyph:"△", color:"#4a90d9" },
  { name:"opposition",  angle:180, orb:8, glyph:"☍", color:"#d1486a" },
];

function findAspect(lon1, lon2){
  let diff = Math.abs(norm360(lon1) - norm360(lon2));
  if(diff>180) diff = 360-diff;
  let best=null;
  ASPECTS.forEach(a=>{
    const delta = Math.abs(diff - a.angle);
    if(delta<=a.orb){
      if(!best || delta<best.delta) best={...a, delta};
    }
  });
  return best;
}

// 描画・表に使う天体一覧 (キー, 日本語, グリフ)
const BODIES = [
  { key:"sun",     ja:"太陽",   glyph:"☉" },
  { key:"moon",    ja:"月",     glyph:"☽" },
  { key:"mercury", ja:"水星",   glyph:"☿" },
  { key:"venus",   ja:"金星",   glyph:"♀" },
  { key:"mars",    ja:"火星",   glyph:"♂" },
  { key:"jupiter", ja:"木星",   glyph:"♃" },
  { key:"saturn",  ja:"土星",   glyph:"♄" },
  { key:"uranus",  ja:"天王星", glyph:"♅" },
  { key:"neptune", ja:"海王星", glyph:"♆" },
  { key:"pluto",   ja:"冥王星", glyph:"♇" },
  { key:"chiron",  ja:"キロン", glyph:"⚷" },
];
const NODE_BODY = { key:"northnode", ja:"ノード", glyph:"☊" };

const HOUSE_LABELS_JA = ["1","2","3","4","5","6","7","8","9","10","11","12"];

// 出生地候補
const CITIES = [
  { name:"札幌",       lat:43.0618, lon:141.3545 },
  { name:"仙台",       lat:38.2682, lon:140.8694 },
  { name:"東京",       lat:35.6895, lon:139.6917 },
  { name:"横浜",       lat:35.4437, lon:139.6380 },
  { name:"名古屋",     lat:35.1815, lon:136.9066 },
  { name:"大阪",       lat:34.6937, lon:135.5023 },
  { name:"京都",       lat:35.0116, lon:135.7681 },
  { name:"神戸",       lat:34.6901, lon:135.1955 },
  { name:"広島",       lat:34.3853, lon:132.4553 },
  { name:"福岡",       lat:33.5904, lon:130.4017 },
  { name:"那覇",       lat:26.2124, lon:127.6809 },
  { name:"ロンドン",   lat:51.5072, lon:-0.1276 },
  { name:"パリ",       lat:48.8566, lon:2.3522 },
  { name:"ニューヨーク", lat:40.7128, lon:-74.0060 },
  { name:"ロサンゼルス", lat:34.0522, lon:-118.2437 },
  { name:"その他(緯度経度を直接入力)", lat:null, lon:null },
];

// リングの色
const RING_COLORS = {
  natal:    "#1d3461",
  transit:  "#3ec9b8",
  progress: "#b89cf0",
};
const RING_LABELS = {
  natal:    "ネイタル",
  transit:  "トランジット",
  progress: "プログレス",
};

const STORAGE_KEY = "starDiary_profiles_v1";
const ACTIVE_KEY  = "starDiary_active_v1";

/* ---------- ストレージ ---------- */

function loadProfiles(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return [];
}
function saveProfiles(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function getActiveId(){
  return localStorage.getItem(ACTIVE_KEY);
}
function setActiveId(id){
  localStorage.setItem(ACTIVE_KEY, id);
}

function newProfile(){
  const id = "p_" + Date.now();
  return {
    id,
    name: "新しいプロフィール",
    date: "",          // YYYY-MM-DD
    time: "12:00",
    timeUnknown: false,
    lat: null,
    lon: null,
    placeName: "",
    houseSystem: "placidus",
  };
}

/* ---------- 状態 ---------- */

let profiles = loadProfiles();
let activeId = getActiveId();
let currentMode = "natal"; // natal | double | triple | progress

if(profiles.length === 0){
  const p = newProfile();
  p.name = "わたし";
  profiles.push(p);
  saveProfiles(profiles);
  activeId = p.id;
  setActiveId(activeId);
}
if(!activeId || !profiles.find(p=>p.id===activeId)){
  activeId = profiles[0].id;
  setActiveId(activeId);
}

function getActive(){
  return profiles.find(p=>p.id===activeId);
}

/* ---------- DOM参照 ---------- */

const el = (id)=>document.getElementById(id);
const profileSelect = el("profileSelect");
const citySelect = el("f_citySelect");

/* ---------- 初期化 ---------- */

function init(){
  // 出生地候補
  CITIES.forEach((c,i)=>{
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = c.name;
    citySelect.appendChild(opt);
  });

  refreshProfileSelect();
  loadProfileToForm(getActive());

  // デフォルトの対象日時 = 現在
  setTargetDateToNow();

  // イベント
  profileSelect.addEventListener("change", ()=>{
    activeId = profileSelect.value;
    setActiveId(activeId);
    loadProfileToForm(getActive());
    renderAll();
  });

  el("newProfileBtn").addEventListener("click", ()=>{
    const p = newProfile();
    p.name = "新しいプロフィール" + (profiles.length+1);
    profiles.push(p);
    saveProfiles(profiles);
    activeId = p.id;
    setActiveId(activeId);
    refreshProfileSelect();
    loadProfileToForm(p);
    renderAll();
  });

  el("deleteProfileBtn").addEventListener("click", ()=>{
    if(profiles.length<=1){
      alert("最後の1件は削除できません。");
      return;
    }
    if(!confirm("このプロフィールを削除しますか？")) return;
    profiles = profiles.filter(p=>p.id!==activeId);
    saveProfiles(profiles);
    activeId = profiles[0].id;
    setActiveId(activeId);
    refreshProfileSelect();
    loadProfileToForm(getActive());
    renderAll();
  });

  el("saveProfileBtn").addEventListener("click", ()=>{
    saveFormToProfile();
    refreshProfileSelect();
    renderAll();
  });

  el("f_timeUnknown").addEventListener("change", (e)=>{
    el("timeRow").classList.toggle("hidden", e.target.checked);
  });

  citySelect.addEventListener("change", ()=>{
    const c = CITIES[citySelect.value];
    if(c.lat!==null){
      el("f_lat").value = c.lat;
      el("f_lon").value = c.lon;
    }
  });

  // チャートタブ
  document.querySelectorAll(".chart-tabs .tab").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".chart-tabs .tab").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      currentMode = btn.dataset.mode;
      updateTargetDateRow();
      renderAll();
    });
  });

  el("nowBtn").addEventListener("click", ()=>{
    setTargetDateToNow();
    renderAll();
  });
  el("f_targetDate").addEventListener("change", renderAll);

  el("moonCalcBtn").addEventListener("click", ()=>{
    const p = getActive();
    if(!profileIsComplete(p)) return;
    const natal = natalHoroscope(p);
    renderMoonTable(p, natal);
  });
  el("f_moonFromYear").value = new Date().getFullYear();

  updateTargetDateRow();
  renderAll();
}

function setTargetDateToNow(){
  const now = new Date();
  const pad = (n)=>String(n).padStart(2,"0");
  const str = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  el("f_targetDate").value = str;
}

function updateTargetDateRow(){
  const row = el("targetDateRow");
  const label = el("targetDateLabel");
  const progressControls = el("progressControls");
  const chartArea = el("chartArea");
  const legend = el("legend");

  if(currentMode==="natal"){
    row.classList.add("hidden");
    progressControls.classList.add("hidden");
    chartArea.classList.remove("hidden");
    legend.classList.remove("hidden");
  }else if(currentMode==="progress"){
    row.classList.add("hidden");
    progressControls.classList.remove("hidden");
    chartArea.classList.add("hidden");
    legend.classList.add("hidden");
  }else{
    row.classList.remove("hidden");
    label.firstChild.textContent = "対象日時(トランジット)";
    progressControls.classList.add("hidden");
    chartArea.classList.remove("hidden");
    legend.classList.remove("hidden");
  }
}

function refreshProfileSelect(){
  profileSelect.innerHTML = "";
  profiles.forEach(p=>{
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name || "(無名)";
    if(p.id===activeId) opt.selected = true;
    profileSelect.appendChild(opt);
  });
}

function loadProfileToForm(p){
  el("f_name").value = p.name || "";
  el("f_date").value = p.date || "";
  el("f_time").value = p.time || "12:00";
  el("f_timeUnknown").checked = !!p.timeUnknown;
  el("timeRow").classList.toggle("hidden", !!p.timeUnknown);
  el("f_lat").value = p.lat ?? "";
  el("f_lon").value = p.lon ?? "";
  el("f_houseSystem").value = p.houseSystem || "placidus";
  citySelect.value = CITIES.findIndex(c=>c.name===p.placeName);
  if(citySelect.value === "-1") citySelect.value = CITIES.length-1;
}

function saveFormToProfile(){
  const p = getActive();
  p.name = el("f_name").value.trim() || "(無名)";
  p.date = el("f_date").value;
  p.time = el("f_time").value || "12:00";
  p.timeUnknown = el("f_timeUnknown").checked;
  p.lat = parseFloat(el("f_lat").value);
  p.lon = parseFloat(el("f_lon").value);
  p.houseSystem = el("f_houseSystem").value;
  const cIdx = citySelect.value;
  p.placeName = (cIdx!=="" && CITIES[cIdx] && CITIES[cIdx].lat!==null) ? CITIES[cIdx].name : "";
  saveProfiles(profiles);
}

/* ---------- ホロスコープ計算 ---------- */

function profileIsComplete(p){
  return p.date && !isNaN(p.lat) && !isNaN(p.lon) && p.lat!==null && p.lon!==null;
}

function dateTimeFromProfile(p){
  const [y,m,d] = p.date.split("-").map(Number);
  let hh=12, mm=0;
  if(!p.timeUnknown){
    const [h,mi] = (p.time||"12:00").split(":").map(Number);
    hh=h; mm=mi;
  }
  return { year:y, month:m-1, date:d, hour:hh, minute:mm };
}

function buildHoroscope(year,month,date,hour,minute,lat,lon,houseSystem){
  const origin = new Origin({ year, month, date, hour, minute, latitude:lat, longitude:lon });
  return new Horoscope({
    origin,
    houseSystem,
    zodiac:"tropical",
    aspectPoints:["bodies"],
    aspectWithPoints:["bodies"],
    aspectTypes:["major"],
    language:"en",
  });
}

function natalHoroscope(p){
  const dt = dateTimeFromProfile(p);
  return buildHoroscope(dt.year,dt.month,dt.date,dt.hour,dt.minute,p.lat,p.lon,p.houseSystem);
}

function transitHoroscope(p, targetDate){
  return buildHoroscope(
    targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(),
    targetDate.getHours(), targetDate.getMinutes(),
    p.lat, p.lon, p.houseSystem
  );
}

// 一日一年法（セカンダリ・プログレッション）
function progressedHoroscope(p, targetDate){
  const dt = dateTimeFromProfile(p);
  const birth = new Date(dt.year, dt.month, dt.date, dt.hour, dt.minute);
  const ageMs = targetDate.getTime() - birth.getTime();
  const ageDays = ageMs / 86400000;
  const progressDays = ageDays / 365.25;
  const prog = new Date(birth.getTime() + progressDays*86400000);
  return buildHoroscope(
    prog.getFullYear(), prog.getMonth(), prog.getDate(),
    prog.getHours(), prog.getMinutes(),
    p.lat, p.lon, p.houseSystem
  );
}

/* ---------- 角度ヘルパー ---------- */

function norm360(deg){
  let d = deg % 360;
  if(d<0) d+=360;
  return d;
}

function bodyLon(horoscope, key){
  if(key==="northnode"){
    const np = horoscope.CelestialPoints.northnode;
    return np.ChartPosition.Ecliptic.DecimalDegrees;
  }
  return horoscope.CelestialBodies[key].ChartPosition.Ecliptic.DecimalDegrees;
}
function bodyRetro(horoscope, key){
  if(key==="northnode") return false;
  return !!horoscope.CelestialBodies[key].isRetrograde;
}
function bodyHouse(horoscope, key){
  if(key==="northnode"){
    return horoscope.CelestialPoints.northnode.House ? horoscope.CelestialPoints.northnode.House.id : null;
  }
  return horoscope.CelestialBodies[key].House.id;
}
function signOfLon(lon){
  const idx = Math.floor(norm360(lon)/30);
  return SIGNS[idx];
}
function degInSign(lon){
  return norm360(lon) % 30;
}
function formatDeg(lon){
  const d = degInSign(lon);
  const deg = Math.floor(d);
  const min = Math.floor((d-deg)*60);
  return `${deg}°${String(min).padStart(2,"0")}'`;
}

/* ---------- SVG描画 ---------- */

const CX=300, CY=300;
const ZODIAC_OUTER=290, ZODIAC_INNER=255;

function polar(lonDeg, ascDeg, radius){
  const angle = (180 + (lonDeg - ascDeg)) * Math.PI/180;
  return { x: CX + radius*Math.cos(angle), y: CY - radius*Math.sin(angle) };
}

function svgEl(name, attrs, parent){
  const e = document.createElementNS("http://www.w3.org/2000/svg", name);
  for(const k in attrs) e.setAttribute(k, attrs[k]);
  if(parent) parent.appendChild(e);
  return e;
}

function renderWheel(natal, rings, ascDeg){
  const svg = el("wheel");
  svg.innerHTML = "";

  // 外枠
  svgEl("circle",{cx:CX,cy:CY,r:ZODIAC_OUTER,class:"ring-circle"},svg);
  svgEl("circle",{cx:CX,cy:CY,r:ZODIAC_INNER,class:"ring-circle"},svg);

  // 黄道12星座
  for(let i=0;i<12;i++){
    const lonStart = i*30;
    const p1 = polar(lonStart, ascDeg, ZODIAC_INNER);
    const p2 = polar(lonStart, ascDeg, ZODIAC_OUTER);
    svgEl("line",{x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,class:"zodiac-seg"},svg);
    const mid = polar(lonStart+15, ascDeg, (ZODIAC_INNER+ZODIAC_OUTER)/2);
    svgEl("text",{x:mid.x,y:mid.y,class:"zodiac-glyph",style:`fill:${SIGNS[i].color}`},svg).textContent = SIGNS[i].glyph + "\uFE0E";
  }

  // ハウスカスプ
  const houses = natal.Houses.map(h=>norm360(h.ChartPosition.StartPosition.Ecliptic.DecimalDegrees));
  const mcDeg = norm360(natal.Midheaven.ChartPosition.Ecliptic.DecimalDegrees);
  const innerMostRadius = rings.length>0 ? (ZODIAC_INNER - rings.length*42 - 10) : ZODIAC_INNER-20;
  const houseLineInner = Math.max(innerMostRadius-15, 40);

  houses.forEach((cusp,i)=>{
    const isAngle = (i===0 || i===3 || i===6 || i===9); // ASC, IC, DSC, MC
    const center = {x:CX,y:CY};
    const p2 = polar(cusp, ascDeg, ZODIAC_INNER);
    svgEl("line",{x1:center.x,y1:center.y,x2:p2.x,y2:p2.y,class:"house-line"+(isAngle?" angle":"")},svg);

    const next = houses[(i+1)%12];
    let span = norm360(next-cusp);
    if(span===0) span=30;
    const midLon = cusp + span/2;
    const num = polar(midLon, ascDeg, houseLineInner+14);
    svgEl("text",{x:num.x,y:num.y,class:"house-num"},svg).textContent = HOUSE_LABELS_JA[i];
  });

  // ASC / MC ラベル
  const ascP = polar(ascDeg, ascDeg, ZODIAC_OUTER+12);
  svgEl("text",{x:ascP.x,y:ascP.y,class:"house-num",style:"fill:#c9a4ff;font-weight:bold;font-size:13px"},svg).textContent="ASC";
  const mcP = polar(mcDeg, ascDeg, ZODIAC_OUTER+12);
  svgEl("text",{x:mcP.x,y:mcP.y,class:"house-num",style:"fill:#c9a4ff;font-weight:bold;font-size:13px"},svg).textContent="MC";

  // ネイタルの主要アスペクト線(中心部)
  const aspectRadius = Math.max(innerMostRadius - 8, 30);
  svgEl("circle",{cx:CX,cy:CY,r:aspectRadius,class:"ring-circle"},svg);
  const aspectKeys = BODIES.map(b=>b.key);
  for(let i=0;i<aspectKeys.length;i++){
    for(let j=i+1;j<aspectKeys.length;j++){
      const lon1 = bodyLon(natal, aspectKeys[i]);
      const lon2 = bodyLon(natal, aspectKeys[j]);
      const asp = findAspect(lon1, lon2);
      if(!asp || asp.name==="conjunction") continue;
      const p1 = polar(lon1, ascDeg, aspectRadius);
      const p2 = polar(lon2, ascDeg, aspectRadius);
      svgEl("line",{x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,class:"aspect-line",stroke:asp.color},svg);
    }
  }

  // 各リングの天体
  const allBodyKeys = BODIES.map(b=>b.key).concat([NODE_BODY.key]);

  rings.forEach((ring, idx)=>{
    const radius = ZODIAC_INNER - 28 - idx*42;
    svgEl("circle",{cx:CX,cy:CY,r:radius+18,class:"ring-circle"},svg);

    // 配置位置の重なり回避
    const placements = allBodyKeys.map(key=>{
      const lon = norm360(bodyLon(ring.horoscope, key));
      return { key, lon };
    }).sort((a,b)=>a.lon-b.lon);

    const minGap = 7; // 度
    for(let i=1;i<placements.length;i++){
      const prev = placements[i-1];
      let diff = placements[i].lon - prev.lon;
      if(diff < minGap){
        placements[i].lon = prev.lon + minGap;
      }
    }
    // ラップアラウンドチェック
    if(placements.length>1){
      let diff = norm360(placements[0].lon - placements[placements.length-1].lon);
      // 簡易: 大きな問題は起きにくいので無視
    }

    placements.forEach(pl=>{
      const info = pl.key===NODE_BODY.key ? NODE_BODY : BODIES.find(b=>b.key===pl.key);
      const realLon = norm360(bodyLon(ring.horoscope, pl.key));
      // 目盛り線(実際の度数)
      const tickOuter = polar(realLon, ascDeg, ZODIAC_INNER);
      const tickInner = polar(realLon, ascDeg, radius+16);
      svgEl("line",{x1:tickOuter.x,y1:tickOuter.y,x2:tickInner.x,y2:tickInner.y,
        class:"planet-line",style:`stroke:${ring.color}`},svg);
      // グリフ(重なり回避済みの位置)
      const gp = polar(pl.lon, ascDeg, radius);
      const t = svgEl("text",{x:gp.x,y:gp.y,class:"planet-glyph",style:`fill:${ring.color}`},svg);
      t.textContent = info.glyph + "\uFE0E" + (bodyRetro(ring.horoscope,pl.key) ? "ᵒ" : "");
    });
  });
}

/* ---------- データ表 ---------- */

function bodiesTable(title, horoscope, color){
  let html = `<table><caption style="color:${color}">${title}</caption>`;
  html += "<tr><th>天体</th><th>サイン</th><th>度数</th><th>ハウス</th><th></th></tr>";
  BODIES.concat([NODE_BODY]).forEach(b=>{
    const lon = bodyLon(horoscope, b.key);
    const sign = signOfLon(lon);
    const retro = bodyRetro(horoscope, b.key);
    const house = bodyHouse(horoscope, b.key);
    html += `<tr class="${retro?'retro':''}"><td>${b.glyph}\uFE0E ${b.ja}</td>`+
      `<td>${sign.glyph}\uFE0E ${sign.ja}</td>`+
      `<td>${formatDeg(lon)}</td>`+
      `<td>${house ?? "-"}</td>`+
      `<td>${retro?"℞":""}</td></tr>`;
  });
  html += "</table>";
  return html;
}

function housesTable(natal){
  let html = `<table><caption style="color:${RING_COLORS.natal}">ハウス・カスプ(${natal.houseSystem || ""})</caption>`;
  html += "<tr><th>ハウス</th><th>サイン</th><th>度数</th></tr>";
  natal.Houses.forEach((h,i)=>{
    const lon = norm360(h.ChartPosition.StartPosition.Ecliptic.DecimalDegrees);
    const sign = signOfLon(lon);
    html += `<tr><td>${HOUSE_LABELS_JA[i]}ハウス</td><td>${sign.glyph}\uFE0E ${sign.ja}</td><td>${formatDeg(lon)}</td></tr>`;
  });
  html += "</table>";
  return html;
}

function aspectGridTable(title, rowHoro, colHoro, color, skipSamePair){
  let html = `<table><caption style="color:${color}">${title}</caption><tr><th></th>`;
  BODIES.forEach(b=> html += `<th title="${b.ja}">${b.glyph}\uFE0E</th>`);
  html += "</tr>";
  BODIES.forEach((rb,ri)=>{
    html += `<tr><th>${rb.glyph}\uFE0E ${rb.ja}</th>`;
    BODIES.forEach((cb,ci)=>{
      if(skipSamePair && ri===ci){
        html += "<td>-</td>";
        return;
      }
      const lon1 = bodyLon(rowHoro, rb.key);
      const lon2 = bodyLon(colHoro, cb.key);
      const asp = findAspect(lon1, lon2);
      if(asp){
        html += `<td style="color:${asp.color};font-weight:bold;text-align:center" title="${asp.name}">${asp.glyph}\uFE0E</td>`;
      }else{
        html += `<td></td>`;
      }
    });
    html += "</tr>";
  });
  html += "</table>";
  return html;
}

/* ---------- メイン描画 ---------- */

function getTargetDate(){
  const v = el("f_targetDate").value;
  if(!v) return new Date();
  return new Date(v);
}

function renderAll(){
  const p = getActive();
  const note = el("note");
  const legend = el("legend");
  const dataTables = el("dataTables");

  if(!profileIsComplete(p)){
    el("wheel").innerHTML = "";
    legend.innerHTML = "";
    dataTables.innerHTML = "";
    note.textContent = "プロフィールの生年月日・出生地(緯度経度)を入力して「保存」を押してください。";
    return;
  }

  let natal;
  try{
    natal = natalHoroscope(p);
  }catch(e){
    note.textContent = "計算中にエラーが発生しました: " + e.message;
    return;
  }
  natal.houseSystem = el("f_houseSystem").value;

  if(currentMode==="progress"){
    el("wheel").innerHTML = "";
    legend.innerHTML = "";
    el("detailSection").classList.add("hidden");
    note.textContent = "「表示開始年」を入力して「計算する」を押すと、その時点でプログレス・ムーンが滞在しているハウスから1サイクル(約27年)分のイングレス日が一覧表示されます。";
    if(p.timeUnknown){
      note.textContent += " 出生時刻が未入力のため、正午で仮算出しています。";
    }
    if(!el("f_moonFromYear").value) el("f_moonFromYear").value = new Date().getFullYear();
    el("progressResult").innerHTML = "<p class='note'>「計算する」を押すと結果が表示されます。</p>";
    return;
  }
  el("detailSection").classList.remove("hidden");
  el("progressResult").innerHTML = "";

  const ascDeg = norm360(natal.Ascendant.ChartPosition.Ecliptic.DecimalDegrees);

  const rings = [];
  let notes = [];
  if(p.timeUnknown){
    notes.push("出生時刻が未入力のため、正午で仮算出しています。ハウス・アセンダント・月の正確な度数は目安としてご覧ください。");
  }

  if(currentMode==="natal"){
    rings.push({ key:"natal", color:RING_COLORS.natal, horoscope:natal });
  }else if(currentMode==="double"){
    const target = getTargetDate();
    const transit = transitHoroscope(p, target);
    rings.push({ key:"transit", color:RING_COLORS.transit, horoscope:transit });
    rings.push({ key:"natal", color:RING_COLORS.natal, horoscope:natal });
    notes.push("外側のリングがトランジット(対象日時の天体配置)です。ハウスはネイタルのものを使用しています。");
  }else if(currentMode==="triple"){
    const target = getTargetDate();
    const transit = transitHoroscope(p, target);
    const progressed = progressedHoroscope(p, target);
    rings.push({ key:"transit", color:RING_COLORS.transit, horoscope:transit });
    rings.push({ key:"progress", color:RING_COLORS.progress, horoscope:progressed });
    rings.push({ key:"natal", color:RING_COLORS.natal, horoscope:natal });
    notes.push("外側=トランジット、中央=プログレス、内側=ネイタル。ハウスはネイタルのものを使用しています。");
  }

  renderWheel(natal, rings, ascDeg);

  // 凡例
  legend.innerHTML = rings.map(r=>
    `<span><span class="dot" style="background:${r.color}"></span>${RING_LABELS[r.key]}</span>`
  ).join("");

  note.textContent = notes.join(" ");

  // データ表
  let html = "";
  rings.forEach(r=>{
    html += bodiesTable(RING_LABELS[r.key]+"の天体配置", r.horoscope, r.color);
  });
  html += housesTable(natal);

  if(currentMode==="natal"){
    html += aspectGridTable("アスペクト表(ネイタル × ネイタル)", natal, natal, RING_COLORS.natal, true);
  }else{
    const transitRing = rings.find(r=>r.key==="transit");
    if(transitRing){
      html += aspectGridTable("アスペクト表(横:ネイタル × 縦:トランジット)", transitRing.horoscope, natal, RING_COLORS.transit, false);
    }
  }

  dataTables.innerHTML = html;
}

function buildHoroscopeLight(year,month,date,hour,minute,lat,lon,houseSystem){
  const origin = new Origin({ year, month, date, hour, minute, latitude:lat, longitude:lon });
  return new Horoscope({
    origin, houseSystem, zodiac:"tropical",
    aspectPoints:[], aspectWithPoints:[], aspectTypes:[], language:"en",
  });
}

function progressedDateFromAge(birth, ageYears){
  return new Date(birth.getTime() + ageYears*86400000);
}
function displayDateFromAge(birth, ageYears){
  return new Date(birth.getTime() + ageYears*86400000*365.25);
}

function progressedMoonLonAtAge(p, birth, ageYears){
  const prog = progressedDateFromAge(birth, ageYears);
  const h = buildHoroscopeLight(prog.getFullYear(), prog.getMonth(), prog.getDate(), prog.getHours(), prog.getMinutes(), p.lat, p.lon, p.houseSystem);
  return bodyLon(h, "moon");
}

function unwrapAngle(prev, curr){
  const d = ((curr - prev) % 360 + 360) % 360;
  return prev + d;
}

// セカンダリープログレッション・ムーンが各ネイタルハウスに入る日付を計算
function computeProgressedMoonTable(p, natal, fromYear){
  const dt = dateTimeFromProfile(p);
  const birth = new Date(dt.year, dt.month, dt.date, dt.hour, dt.minute);
  const fromDate = new Date(fromYear, 0, 1);

  let ageAtFrom = (fromDate - birth)/86400000/365.25;
  if(ageAtFrom < 0) ageAtFrom = 0;
  const ageStart = Math.max(0, ageAtFrom - 3);
  const ageEnd = ageStart + 30;

  const samples = [];
  for(let a=ageStart; a<=ageEnd; a+=1){
    samples.push({ age:a, lon: progressedMoonLonAtAge(p, birth, a) });
  }
  const unwrapped = [samples[0].lon];
  for(let i=1;i<samples.length;i++){
    unwrapped.push(unwrapAngle(unwrapped[i-1], samples[i].lon));
  }

  const cusps = natal.Houses.map(h=>norm360(h.ChartPosition.StartPosition.Ecliptic.DecimalDegrees));

  const events = [];
  cusps.forEach((base, ci)=>{
    const kMin = Math.floor((unwrapped[0]-base)/360) - 1;
    const kMax = Math.ceil((unwrapped[unwrapped.length-1]-base)/360) + 1;
    for(let k=kMin; k<=kMax; k++){
      const target = base + 360*k;
      if(target < unwrapped[0] || target > unwrapped[unwrapped.length-1]) continue;
      let lo=-1;
      for(let i=0;i<samples.length-1;i++){
        if(unwrapped[i] <= target && target <= unwrapped[i+1]){ lo=i; break; }
      }
      if(lo===-1) continue;
      let a0=samples[lo].age, a1=samples[lo+1].age, l0=unwrapped[lo];
      for(let iter=0; iter<22; iter++){
        const am = (a0+a1)/2;
        const lm = unwrapAngle(l0, progressedMoonLonAtAge(p, birth, am));
        if(lm < target){ a0=am; l0=lm; } else { a1=am; }
      }
      events.push({ date: displayDateFromAge(birth,(a0+a1)/2), houseIndex: ci, lon: base });
    }
  });

  events.sort((a,b)=>a.date-b.date);

  let startIdx=0;
  for(let i=0;i<events.length;i++){
    if(events[i].date <= fromDate) startIdx=i; else break;
  }
  const rows = events.slice(startIdx, startIdx+13);

  return rows.slice(0,12).map((ev,i)=>({
    start: ev.date,
    end: rows[i+1] ? rows[i+1].date : null,
    house: ev.houseIndex+1,
    sign: signOfLon(ev.lon),
    deg: formatDeg(ev.lon),
  }));
}

function formatJpDate(d){
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
}

function renderMoonTable(p, natal){
  const area = el("progressResult");
  const fromYear = parseInt(el("f_moonFromYear").value) || new Date().getFullYear();
  area.innerHTML = "<p class='note'>計算中…</p>";
  setTimeout(()=>{
    const rows = computeProgressedMoonTable(p, natal, fromYear);
    let html = `<table><caption style="color:${RING_COLORS.progress}">The Progressed Moon Calendar</caption>`+
      `<tr><th>No</th><th>サイン/度数</th><th>開始日</th><th>ハウス</th><th>終了日</th></tr>`;
    rows.forEach((r,i)=>{
      html += `<tr><td>${i+1}</td>`+
        `<td>${r.sign.glyph}\uFE0E ${r.sign.ja} ${r.deg}</td>`+
        `<td>${formatJpDate(r.start)}</td>`+
        `<td>${r.house}ハウス</td>`+
        `<td>${r.end?formatJpDate(r.end):"-"}</td></tr>`;
    });
    html += "</table>";
    area.innerHTML = html;
  }, 10);
}

init();
