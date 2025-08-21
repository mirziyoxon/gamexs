/* Smart 20 Questions (static, offline)
   - Info-gain style question selection (heuristic)
   - Bayesian-like weighting per answer
   - “Not sure / Skip”
   - Only counts real questions (no intro)
   - Guesses when confident; won’t give up early
*/

// ---------- Config ----------
const LIMIT = 20;              // max question count
const GUESS_THRESHOLD = 0.86;  // confidence to guess
const PRUNE_EPS = 1e-6;        // drop tiny-weight candidates

// ---------- DOM ----------
const qEl = document.getElementById('question');
const usedEl = document.getElementById('used');
const candsEl = document.getElementById('cands');
const logEl = document.getElementById('log');
const promptEl = document.getElementById('prompt');
const controls = document.getElementById('controls');
const btnReset = document.getElementById('btnReset');
const btnStart = document.getElementById('btnStart');

// ---------- Attributes (each becomes a Yes/No/Skip question) ----------
const ATTRS = [
  { key:'alive',            q:'Is it alive?' },
  { key:'person',           q:'Is it a person?' },
  { key:'animal',           q:'Is it an animal?' },
  { key:'mammal',           q:'Is it a mammal?' },
  { key:'pet',              q:'Is it commonly kept as a pet?' },
  { key:'bird',             q:'Is it a bird?' },
  { key:'fish',             q:'Is it a fish?' },
  { key:'can_fly',          q:'Can it fly?' },
  { key:'plant',            q:'Is it a plant?' },
  { key:'electronic',       q:'Is it electronic?' },
  { key:'uses_electricity', q:'Does it use electricity?' },
  { key:'has_screen',       q:'Does it have a screen?' },
  { key:'phone',            q:'Is it a phone?' },
  { key:'computer',         q:'Is it a computer or laptop?' },
  { key:'vehicle',          q:'Is it a vehicle?' },
  { key:'two_wheels',       q:'Does it have two wheels?' },
  { key:'kitchen',          q:'Is it used in the kitchen?' },
  { key:'metal',            q:'Is it mostly made of metal?' },
  { key:'food',             q:'Is it food?' },
  { key:'fruit',            q:'Is it a fruit?' },
  { key:'drink',            q:'Is it a drink?' },
  { key:'sports',           q:'Is it related to sports?' },
  { key:'outdoors',         q:'Is it usually found outdoors?' },
  { key:'handheld',         q:'Can you hold it in one hand?' },
  { key:'bigger_than_dog',  q:'Is it bigger than a typical dog?' },
  { key:'domesticated',     q:'Is it domesticated by humans?' },
  { key:'furniture',        q:'Is it furniture?' },
  { key:'has_pages',        q:'Does it have pages?' },
  { key:'writing_tool',     q:'Is it used for writing?' },
  { key:'country',          q:'Is it a country?' },
  { key:'athlete',          q:'Is it an athlete?' },
  { key:'entertainer',      q:'Is it an entertainer?' },
  { key:'politician',       q:'Is it a politician?' },
];

// ---------- Knowledge base (extensible) ----------
const KB = [
  // Animals & living things
  E('Dog',   {alive:1, animal:1, mammal:1, pet:1, can_fly:0, bird:0, fish:0, plant:0, handheld:0, bigger_than_dog:0, domesticated:1, outdoors:1}),
  E('Cat',   {alive:1, animal:1, mammal:1, pet:1, can_fly:0, bird:0, fish:0, plant:0, handheld:0, bigger_than_dog:0, domesticated:1, outdoors:1}),
  E('Lion',  {alive:1, animal:1, mammal:1, pet:0, can_fly:0, bird:0, fish:0, plant:0, handheld:0, bigger_than_dog:1, domesticated:0, outdoors:1}),
  E('Eagle', {alive:1, animal:1, bird:1,  can_fly:1, mammal:0, fish:0, plant:0, handheld:0, outdoors:1}),
  E('Parrot',{alive:1, animal:1, bird:1,  can_fly:1, pet:1, handheld:0, outdoors:1}),
  E('Shark', {alive:1, animal:1, fish:1,  can_fly:0, pet:0, handheld:0, bigger_than_dog:1, outdoors:1}),
  E('Goldfish',{alive:1, animal:1, fish:1, pet:1, handheld:0, outdoors:0}),
  E('Oak tree',{alive:1, plant:1, outdoors:1, handheld:0}),
  E('Rose',  {alive:1, plant:1, outdoors:1, handheld:1}),

  // People
  E('A singer',     {alive:1, person:1, entertainer:1}),
  E('A politician', {alive:1, person:1, politician:1}),
  E('A footballer', {alive:1, person:1, athlete:1}),

  // Tech & electronics
  E('Phone',     {alive:0, electronic:1, uses_electricity:1, has_screen:1, phone:1, handheld:1, kitchen:0}),
  E('Laptop',    {alive:0, electronic:1, uses_electricity:1, has_screen:1, computer:1, handheld:0}),
  E('TV',        {alive:0, electronic:1, uses_electricity:1, has_screen:1, handheld:0}),
  E('Refrigerator',{alive:0, electronic:1, uses_electricity:1, kitchen:1, metal:1, handheld:0, bigger_than_dog:1}),
  E('Microwave', {alive:0, electronic:1, uses_electricity:1, kitchen:1, metal:1, handheld:0}),
  E('Car',       {alive:0, vehicle:1, two_wheels:0, handheld:0, bigger_than_dog:1, outdoors:1}),
  E('Bicycle',   {alive:0, vehicle:1, two_wheels:1, handheld:0, outdoors:1}),

  // Household / tools
  E('Spoon',     {alive:0, kitchen:1, metal:1, handheld:1}),
  E('Knife',     {alive:0, kitchen:1, metal:1, handheld:1}),
  E('Chair',     {alive:0, furniture:1, handheld:0, bigger_than_dog:1}),
  E('Book',      {alive:0, has_pages:1, handheld:1}),
  E('Pen',       {alive:0, writing_tool:1, handheld:1}),

  // Food & drink
  E('Apple',     {alive:0, food:1, fruit:1, handheld:1}),
  E('Pizza',     {alive:0, food:1, handheld:1}),
  E('Water bottle',{alive:0, drink:1, handheld:1}),

  // Misc / places / nature
  E('Ball',      {alive:0, sports:1, handheld:1}),
  E('Mountain',  {alive:0, outdoors:1, handheld:0, bigger_than_dog:1}),
  E('United States (country)', {alive:0, country:1})
];

// Helper: define entity with attributes
function E(name, attrs){ return { name, attrs }; }

// ---------- State ----------
let asked = new Set();            // attribute keys already asked
let weights = [];                 // per-candidate weights
let questionsUsed = 0;            // real questions only
let answeringAttr = null;         // which attr we’re currently asking
let inGuess = false;              // are we asking "Am I right?"

reset();

// ---------- UI wiring ----------
btnStart.addEventListener('click', startGame);
btnReset.addEventListener('click', reset);

function startGame(){
  // Don’t count “Ready to start?” as a question
  promptEl.style.display = 'none';
  controls.innerHTML = [
    `<button class="btn" id="btnYes">Yes</button>`,
    `<button class="btn" id="btnNo">No</button>`,
    `<button class="btn" id="btnSkip">Not sure / Skip</button>`
  ].join('');
  document.getElementById('btnYes').addEventListener('click', ()=> onAnswer('yes'));
  document.getElementById('btnNo').addEventListener('click',  ()=> onAnswer('no'));
  document.getElementById('btnSkip').addEventListener('click',()=> onAnswer('skip'));
  askNext();
}

function reset(){
  asked.clear();
  weights = new Array(KB.length).fill(1);
  questionsUsed = 0;
  answeringAttr = null;
  inGuess = false;
  qEl.textContent = 'Ready to start?';
  usedEl.textContent = `Questions used: 0 / ${LIMIT}`;
  candsEl.textContent = 'Candidates: —';
  controls.innerHTML = '';
  promptEl.style.display = '';
  logEl.innerHTML = '';
  controls.appendChild(btnStart);
}

// ---------- Core loop ----------
function onAnswer(ans){
  if(inGuess){
    // handle guess confirmation
    const best = bestCandidate();
    if(ans === 'yes'){
      log(`? Correct: ${best.name}`);
      finish(true, `Yay! I guessed it: ${best.name} ??`);
      return;
    }else if(ans === 'no'){
      // Penalize that candidate and continue if we still have questions
      const idx = best.index;
      weights[idx] *= 0.01;
      normalizeWeights();
      inGuess = false;
      log(`? Not ${best.name}. I’ll keep narrowing it down.`);
      if(questionsUsed >= LIMIT){
        finish(false, `I’m out of questions. You win! ??`);
        return;
      }
      askNext(); // continue questioning
      return;
    }else{
      // "Not sure" during guess > ask another question
      inGuess = false;
      askNext();
      return;
    }
  }

  // Normal question answered
  applyAnswer(answeringAttr, ans);
  questionsUsed++;
  usedEl.textContent = `Questions used: ${questionsUsed} / ${LIMIT}`;

  // Stop condition: no useful attributes left
  if(questionsUsed >= LIMIT || asked.size >= ATTRS.length){
    // Final guess if any confidence, else give up
    const {name, prob} = bestCandidate();
    if(prob > 0.15){
      askGuess();
    }else{
      finish(false, `I’m out of questions. You win! ??`);
    }
    return;
  }

  // Decide: guess or keep asking?
  const {prob} = bestCandidate();
  if(prob >= GUESS_THRESHOLD || questionsUsed >= (LIMIT - 2)){
    askGuess();
  }else{
    askNext();
  }
}

function askNext(){
  answeringAttr = chooseBestAttr();
  if(!answeringAttr){
    // No attribute left > guess
    askGuess();
    return;
  }
  asked.add(answeringAttr.key);
  qEl.textContent = answeringAttr.q;
  updateMeta();
}

function askGuess(){
  const {name, prob} = bestCandidate();
  if(!name){
    finish(false, `I can’t narrow it down enough. You win! ??`);
    return;
  }
  inGuess = true;
  qEl.textContent = `I think it’s **${name}**. Am I right? (${(prob*100).toFixed(1)}% sure)`;
  controls.innerHTML = [
    `<button class="btn" id="gYes">Yes</button>`,
    `<button class="btn" id="gNo">No</button>`,
    `<button class="btn" id="gAsk">Ask another question</button>`
  ].join('');
  document.getElementById('gYes').addEventListener('click', ()=> onAnswer('yes'));
  document.getElementById('gNo').addEventListener('click',  ()=> onAnswer('no'));
  document.getElementById('gAsk').addEventListener('click', ()=> onAnswer('skip'));
}

function finish(won, msg){
  qEl.textContent = msg;
  controls.innerHTML = `<button class="btn primary" id="playAgain">Play again</button>`;
  document.getElementById('playAgain').addEventListener('click', reset);
}

// ---------- Reasoning engine ----------
function applyAnswer(attr, ans){
  if(!attr) return;
  const k = attr.key;
  // Likelihoods: strong but not absolute
  const L = {
    yes: { true:0.9, false:0.1, undefined:0.5 },
    no:  { true:0.1, false:0.9, undefined:0.5 },
    skip:{ true:0.6, false:0.6, undefined:0.6 }
  }[ans];

  for(let i=0;i<KB.length;i++){
    const v = KB[i].attrs[k];
    const bucket = (v===1)?'true':(v===0)?'false':'undefined';
    weights[i] *= L[bucket];
  }
  normalizeWeights();
  pruneTiny();
  log(`Q${questionsUsed+1}: ${attr.q} > ${ans.toUpperCase()}`);
}

function normalizeWeights(){
  let s = weights.reduce((a,b)=>a+b,0);
  if(s<=0){ weights = new Array(KB.length).fill(1/KB.length); return; }
  for(let i=0;i<weights.length;i++) weights[i] /= s;
}

function pruneTiny(){
  for(let i=0;i<weights.length;i++){
    if(weights[i] < PRUNE_EPS) weights[i] = 0;
  }
  normalizeWeights();
}

function bestCandidate(){
  let bestI = -1, bestW = -1;
  for(let i=0;i<weights.length;i++){
    if(weights[i]>bestW){ bestW = weights[i]; bestI = i; }
  }
  return bestI>=0 ? { index:bestI, name:KB[bestI].name, prob:bestW } : { index:-1, name:null, prob:0 };
}

function chooseBestAttr(){
  // Heuristic info-gain: prefer attributes that split remaining mass close to 50/50
  let best = null, bestScore = -1;

  const totalMass = weights.reduce((a,b)=>a+b,0) || 1;

  for(const a of ATTRS){
    if(asked.has(a.key)) continue;

    let t=0,f=0,u=0;
    for(let i=0;i<KB.length;i++){
      const v = KB[i].attrs[a.key];
      if(v===1) t += weights[i];
      else if(v===0) f += weights[i];
      else u += weights[i];
    }
    const cover = (t+f) / totalMass;         // how many candidates this actually describes
    if(cover < 0.05) continue;               // skip useless (almost all unknown)

    const p = t / (t+f || 1);                // yes-prob among defined
    const balance = 1 - Math.abs(p - 0.5)*2; // 1 at 0.5, 0 at 0/1
    const score = cover * (0.7*balance) + 0.3*(1-u/totalMass);
    if(score > bestScore){ bestScore = score; best = a; }
  }
  return best;
}

function updateMeta(){
  const n = weights.filter(w=>w>PRUNE_EPS).length;
  candsEl.textContent = `Candidates: ${n}`;
}

function log(text){
  const pill = document.createElement('div');
  pill.className = 'pill';
  pill.textContent = text;
  logEl.prepend(pill);
}
