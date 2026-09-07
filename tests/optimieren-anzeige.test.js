// Test: Nach "Diese Phase optimieren" muessen Kopfzeile, Panel "Abgleich mit der
// Phase" UND die Mischungstabelle denselben, aktuellen Stand zeigen. Bug war:
// optimierePhase() rief nach dem Rechnen nur zeichneRation() auf, nie
// zeichnePanel()/zeichneKennzahlen() - Kopfzeile und Panel blieben auf 0,00/"-"
// stehen, obwohl S.anteile (und damit die Tabelle) schon korrekt war.
//
// Laedt index.html unveraendert (kein Build-Schritt) in einen vm-Kontext mit
// minimalen DOM-Stubs, simuliert echte Knopf-Klicks ("Anteile leeren", dann
// "Diese Phase optimieren") und vergleicht Kopfzeile/Panel gegen die Werte,
// die aus S.anteile/S.futter direkt berechnet werden (die "tatsaechliche
// Mischung aus der Tabelle").
//
// Aufruf: node tests/optimieren-anzeige.test.js

const vm = require("vm");
const fs = require("fs");
const path = require("path");

class FakeEl {
  constructor(tag){
    this.tag=tag; this.children=[]; this.attrs={}; this._innerHTML=""; this.style={}; this.dataset={};
    this.classList = { add(){}, remove(){}, contains(){return false;}, toggle(){} };
    this._listeners={};
  }
  addEventListener(type,fn){ (this._listeners[type]=this._listeners[type]||[]).push(fn); }
  dispatch(type, evt){ (this._listeners[type]||[]).slice().forEach(fn=>fn(evt||{target:this})); }
  click(){ this.dispatch("click", {target:this}); }
  appendChild(c){ this.children.push(c); return c; }
  append(...cs){ cs.forEach(c=>this.children.push(c)); }
  setAttribute(k,v){ this.attrs[k]=v; }
  getAttribute(k){ return this.attrs[k]; }
  get innerHTML(){ return this._innerHTML; }
  set innerHTML(v){ this._innerHTML=v; this.children=[]; this._listeners={}; }
  get textContent(){ return this._text===undefined ? "" : this._text; }
  set textContent(v){ this._text=v; }
  querySelector(){ return new FakeEl("div"); }
  querySelectorAll(){ return []; }
  get options(){ return this.children.filter(c=>c.tag==="option"); }
  set value(v){ this._value=v; }
  get value(){ return this._value; }
}

const elements = {};
function ensure(id){ if(!elements[id]) elements[id]=new FakeEl("div"); return elements[id]; }

const sandbox = {
  document: {
    getElementById: (id)=>ensure(id),
    querySelector: ()=> new FakeEl("tbody"),
    querySelectorAll: ()=> [],
    createElement: (tag)=> new FakeEl(tag),
    addEventListener: ()=>{},
  },
  window: { print(){} },
  localStorage: {
    getItem:()=>null, setItem:()=>{}, removeItem:()=>{},
  },
  location: { origin:"https://example.invalid", pathname:"/", search:"", hash:"" },
  history: { replaceState(){} },
  performance: { now:()=>Date.now() },
  confirm: ()=>true,
  alert: ()=>{},
  navigator: { clipboard: { writeText: async ()=>{ throw new Error("kein Clipboard im Test"); } } },
  TextEncoder: require("util").TextEncoder,
  TextDecoder: require("util").TextDecoder,
  btoa: (s)=> Buffer.from(s,"binary").toString("base64"),
  atob: (s)=> Buffer.from(s,"base64").toString("binary"),
  URL: { createObjectURL:()=>"blob:fake", revokeObjectURL:()=>{} },
  Blob: class { constructor(parts){ this.parts=parts; } },
  console,
};

const context = vm.createContext(sandbox);
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
if(!scriptMatch) throw new Error("Konnte <script>-Block in index.html nicht finden");
vm.runInContext(scriptMatch[1], context, {filename:"index.html"});

function run(expr){ return vm.runInContext(expr, context); }

let fehler = 0;
function pruefe(bezeichnung, ist, soll){
  if(ist === soll){
    console.log("  OK   " + bezeichnung + " = " + JSON.stringify(ist));
  } else {
    fehler++;
    console.log("  FEHL " + bezeichnung + ": erwartet " + JSON.stringify(soll) + ", erhalten " + JSON.stringify(ist));
  }
}

console.log("== Ablauf: Anteile leeren, dann Diese Phase optimieren ==");
run(`initZustand(); asModus="brutto";`);
run(`document.getElementById("btnLeeren").dispatch = document.getElementById("btnLeeren").dispatch;`); // no-op, nur zur Klarheit
// Handler wurden beim Laden des Skripts bereits an die (gestubbten) Elemente gebunden.
run(`document.getElementById("btnLeeren").click();`);
pruefe("Summe nach Leeren", run(`summeAnteile()`), 0);

run(`document.getElementById("btnOpt").click();`);

const meldung = run(`document.getElementById("optHinweis").textContent`);
if(!/Kostenoptimale Mischung/.test(meldung)){
  console.log("Die Optimierung ist nicht wie erwartet erfolgreich durchgelaufen:", meldung);
  process.exit(2);
}

// "Tatsaechliche Mischung aus der Tabelle": direkt aus S.anteile/S.futter berechnet,
// genau die Werte, die auch die Mischungstabelle (mSumme/mKosten) anzeigt.
const summeIst   = run(`summeAnteile()`);
const kostenIst   = run(`kostenT()`);
const summeSoll   = run(`z2(${summeIst},1)`);
const kostenSoll0 = run(`z2(${kostenIst},0)`);
const kostenSoll2 = run(`z2(${kostenIst},2)`);
const dtSoll      = run(`z2(${kostenIst}/10,2)`);
const meIst       = run(`gehalte().me`);
const meSoll      = run(`z2(${meIst},2)`);

console.log("\n== Kopfzeile (Kennzahlen oben) ==");
pruefe("kzSumme",  run(`document.getElementById("kzSumme").textContent`),  summeSoll);
pruefe("kzKosten", run(`document.getElementById("kzKosten").textContent`), kostenSoll0);
pruefe("kzStatus ist nicht mehr '-'", run(`document.getElementById("kzStatus").textContent`) !== "–", true);

console.log("\n== Panel 'Abgleich mit der Phase' ==");
pruefe("preisT (Mischfutter €/t)", run(`document.getElementById("preisT").textContent`), kostenSoll2);
pruefe("preisDt (Je dt €/dt)",     run(`document.getElementById("preisDt").textContent`), dtSoll);

const naehrPanel = run(`document.getElementById("naehrPanel")`);
const ersteZeile = naehrPanel.children[0];
const meZelle = ersteZeile ? ersteZeile.children[1] : null; // Reihenfolge: nm, iv, sv, bar, dv
pruefe("Panel-Zeile 'Energie ME' (Istwert)", meZelle ? meZelle.textContent : "(keine Zeile gefunden)", meSoll);

console.log("\n== Tabelle links (zur Gegenprobe) ==");
const summeSoll2 = run(`z2(${summeIst},2)`); // Tabellenfuss zeigt 2 Nachkommastellen, Kopfzeile nur 1
pruefe("mSumme (Tabellenfuss)",  run(`document.getElementById("mSumme").textContent`),  summeSoll2);
pruefe("mKosten (Tabellenfuss)", run(`document.getElementById("mKosten").textContent`), kostenSoll2);

if(fehler>0){
  console.log("\n" + fehler + " Pruefung(en) fehlgeschlagen: Kopfzeile/Panel zeigen nach dem Optimieren nicht den aktuellen Stand.");
  process.exit(1);
} else {
  console.log("\nAlle Pruefungen bestanden: Kopfzeile, Panel und Tabelle stimmen nach dem Optimieren ueberein.");
}
