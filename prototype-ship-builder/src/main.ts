import './style.css'

type Family = 'income' | 'gun'
type Kind = {
  id: string
  name: string
  emoji: string
  color: string
  family: Family
  tier: number
  baseCost: number
  value: number
}
type Mod = { kind: Kind; level: number; born: number; upgradedAt: number }
type Mr = { id: number; title: string; ageH: number; lines: number; commented: boolean }
type OwnMr = { id: number; title: string; pet: string | null; hatchedAt: number; x: number }
type Floater = { x: number; y: number; text: string; color: string; size: number; t: number; life: number }
type Particle = { x: number; y: number; vx: number; vy: number; t: number; life: number; text: string; size: number }
type Beam = { x1: number; y1: number; x2: number; y2: number; t: number; life: number; color: string }
type Dying = { x: number; y: number; r: number; seed: number; t: number; burst: boolean }
type Since = { fakeSec: number; idleGold: number; reviewGold: number; rp: number; reviews: number; hatched: number }

const KINDS: Kind[] = [
  { id: 'solar', name: 'Solar Sail', emoji: '☀️', color: '#fde047', family: 'income', tier: 0, baseCost: 2000, value: 0.3 },
  { id: 'green', name: 'Greenhouse', emoji: '🌱', color: '#86efac', family: 'income', tier: 0, baseCost: 2400, value: 0.4 },
  { id: 'cargo', name: 'Cargo Bay', emoji: '📦', color: '#d6a066', family: 'income', tier: 1, baseCost: 5000, value: 1.2 },
  { id: 'coffee', name: 'Coffee Reactor', emoji: '☕', color: '#b45309', family: 'income', tier: 2, baseCost: 16000, value: 3.5 },
  { id: 'disco', name: 'Disco Lounge', emoji: '🪩', color: '#e879f9', family: 'income', tier: 3, baseCost: 50000, value: 10 },
  { id: 'bubble', name: 'Bubble Turret', emoji: '🫧', color: '#7dd3fc', family: 'gun', tier: 0, baseCost: 1600, value: 0.25 },
  { id: 'lgtm', name: 'LGTM Cannon', emoji: '👍', color: '#fda4af', family: 'gun', tier: 0, baseCost: 2600, value: 0.4 },
  { id: 'nitpick', name: 'Nitpick Laser', emoji: '🔬', color: '#f87171', family: 'gun', tier: 1, baseCost: 6000, value: 0.9 },
  { id: 'rebase', name: 'Rebase Thruster-Gun', emoji: '🚀', color: '#fb923c', family: 'gun', tier: 2, baseCost: 18000, value: 1.8 },
  { id: 'bazooka', name: 'Force-Push Bazooka', emoji: '💥', color: '#a78bfa', family: 'gun', tier: 3, baseCost: 55000, value: 3.6 },
]

const LEVEL_MULT = [1, 2, 3.5]
const LEVEL_COST_MULT = [0, 2, 5]
const COST_GROWTH = 1.15
const BASE_INCOME = 0.5
const PET_BONUS = 0.1
const RESEARCH_COST = [20, 30, 40]
const REROLL_COST = 300
const APPROVE_MIN_GOLD = 1500
const APPROVE_INCOME_SECONDS = 2700
const COMMENT_MIN_GOLD = 250
const COMMENT_INCOME_SECONDS = 600

const MR_TITLES = [
  'Fix typo in the typo fixer',
  'Add more TODO comments',
  'Rename variable x to y',
  'Refactor the refactor',
  'Update README, again',
  'Move button 2px to the left',
  'Add a feature flag for the feature flag',
  'Delete unused code (it was used)',
  'Bump one dependency by one patch',
  'Make tests green by making them shorter',
  'Add a loading spinner to the loading spinner',
  'Use tabs instead of spaces, or reverse',
  'Extract a helper for a one-line helper',
  'Change a colour that nobody asked about',
]
const OWN_TITLES = [
  'Add dark mode to the toaster',
  'Make the logo 3% bigger',
  'Teach the app to say hello',
  'Speed up the slow thing',
  'Fix the bug that was a feature',
  'Add a button for the button',
]
const PETS = ['🐙', '🦄', '🐲', '🐢', '🦊', '👽', '🐸', '🦑']

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const canvas = $<HTMLCanvasElement>('canvas')
const ctx = canvas.getContext('2d')!
const curtain = $('curtain')
const overlay = $('overlay')
const shipyardEl = $('shipyard')

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1))
const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)]
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
const fmtRate = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtSmall = (n: number) => (n >= 10 ? fmt(n) : n.toFixed(1))
function fmtDur(sec: number) {
  const s = Math.floor(sec)
  if (s < 60) return `${s} s`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min ${String(s % 60).padStart(2, '0')} s`
}

const state = {
  gold: 0,
  rp: 0,
  time: 0,
  factory: 0,
  arsenal: 0,
  modules: [] as Mod[],
  mrs: [] as Mr[],
  own: [] as OwnMr[],
  offers: [] as Kind[],
  nextId: 1,
}
const freshSince = (): Since => ({ fakeSec: 0, idleGold: 0, reviewGold: 0, rp: 0, reviews: 0, hatched: 0 })
let since = freshSince()
let phase: 'idle' | 'focus' | 'card' = 'idle'
let now = 0
let shownGold = 0
let incomeTimer = 0
let shakeUntil = 0
let shipScale = 1
let hitRects: { x: number; y: number; w: number; h: number; idx: number }[] = []

const floaters: Floater[] = []
const particles: Particle[] = []
const beams: Beam[] = []
const dying: Dying[] = []
const stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), z: rand(0.2, 1) }))

let audio: AudioContext | null = null
let muted = false
function beep(freq: number, dur = 0.08, type: OscillatorType = 'sine', vol = 0.06, delay = 0) {
  if (muted) return
  audio ??= new AudioContext()
  if (audio.state === 'suspended') void audio.resume()
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  const t0 = audio.currentTime + delay
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(vol, t0)
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
  osc.connect(gain).connect(audio.destination)
  osc.start(t0)
  osc.stop(t0 + dur)
}
const sfxLaser = () => beep(1200, 0.12, 'sawtooth', 0.03)
const sfxCrack = () => {
  beep(180, 0.12, 'square', 0.06)
  beep(700, 0.1, 'triangle', 0.06, 0.08)
  beep(1000, 0.14, 'triangle', 0.06, 0.16)
}
const sfxAttach = () => {
  beep(140, 0.12, 'square', 0.08)
  beep(330, 0.08, 'triangle', 0.07, 0.1)
  beep(660, 0.1, 'triangle', 0.07, 0.18)
}
const sfxUpgrade = () => [440, 554, 659, 880].forEach((f, i) => beep(f, 0.1, 'triangle', 0.07, i * 0.07))
const sfxResearch = () => [523, 659, 784, 1047, 1319].forEach((f, i) => beep(f, 0.14, 'sine', 0.07, i * 0.09))
const sfxNo = () => beep(120, 0.12, 'square', 0.05)
const sfxHatch = () => {
  beep(700, 0.08, 'triangle')
  beep(1000, 0.1, 'triangle', 0.07, 0.08)
}
const sfxCoin = () => beep(1500, 0.05, 'square', 0.03)

const moduleValue = (m: Mod) => m.kind.value * LEVEL_MULT[m.level - 1]
const petCount = () => state.own.filter((e) => e.pet).length
const modulesOf = (family: Family) => state.modules.filter((m) => m.kind.family === family)
const baseIncome = () => BASE_INCOME + modulesOf('income').reduce((s, m) => s + moduleValue(m), 0)
const income = () => baseIncome() * (1 + PET_BONUS * petCount())
const gunBonus = () => 1 + modulesOf('gun').reduce((s, m) => s + moduleValue(m), 0)
const moduleCost = (k: Kind) => Math.round(k.baseCost * Math.pow(COST_GROWTH, state.modules.length))
const upgradeCost = (m: Mod) => m.kind.baseCost * LEVEL_COST_MULT[m.level]
const diffFactor = (lines: number) => 0.6 + lines / 600
const approveGold = (mr: Mr) =>
  Math.round(Math.max(APPROVE_MIN_GOLD, income() * APPROVE_INCOME_SECONDS) * diffFactor(mr.lines) * gunBonus())
const commentGold = (mr: Mr) =>
  Math.round(Math.max(COMMENT_MIN_GOLD, income() * COMMENT_INCOME_SECONDS) * diffFactor(mr.lines) * gunBonus())
const approveRp = (mr: Mr) => Math.min(6, 3 + Math.floor(mr.lines / 150))
const isUnlocked = (k: Kind) => (k.family === 'income' ? state.factory : state.arsenal) >= k.tier
const branchName = (k: Kind) => (k.family === 'income' ? 'Factory' : 'Arsenal')

function rollOffer(exclude: Kind[]): Kind {
  const pool = KINDS.filter(isUnlocked)
  const fresh = pool.filter((k) => !exclude.includes(k))
  return pick(fresh.length ? fresh : pool)
}
function rollAllOffers() {
  const next: Kind[] = []
  for (let i = 0; i < 3; i++) next.push(rollOffer(next))
  state.offers = next
}

function makeMr(fresh: boolean): Mr {
  return {
    id: state.nextId++,
    title: pick(MR_TITLES),
    ageH: fresh ? randInt(1, 6) : randInt(1, 48),
    lines: randInt(10, 600),
    commented: false,
  }
}
function makeOwn(): OwnMr {
  return { id: state.nextId++, title: pick(OWN_TITLES), pet: null, hatchedAt: -10, x: 0 }
}

function addFloater(x: number, y: number, text: string, color: string, size: number, life = 1.2) {
  floaters.push({ x, y, text, color, size, t: 0, life })
}
function addBurst(x: number, y: number, texts: string[], count: number) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2)
    const s = rand(40, 150)
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, t: 0, life: rand(0.5, 1), text: pick(texts), size: rand(10, 18) })
  }
}

type Layout = { scale: number; x0: number; step: number; segW: number; segH: number; cy: number; count: number }
function layout(): Layout {
  const count = state.modules.length + 2
  const segW = 64
  const step = 68
  return { scale: shipScale, x0: 30, step, segW, segH: 48, cy: 106, count }
}
function targetScale() {
  const count = state.modules.length + 2
  return Math.min(1, (canvas.width - 70) / (count * 68))
}
const segCenterX = (l: Layout, i: number) => l.x0 + (i * l.step + l.segW / 2) * l.scale

function asteroidPos(i: number, n: number) {
  const slot = canvas.width / Math.max(n, 1)
  const x = (i + 0.5) * slot + Math.sin(now * 0.35 + i * 1.7) * 14
  const y = (i % 2 === 0 ? 42 : 172) + Math.sin(now * 0.9 + i) * 4
  return { x, y }
}
const asteroidRadius = (mr: Mr) => 12 + Math.min(mr.ageH, 48) * 0.38

function fireLaser(x: number, y: number, color: string) {
  const l = layout()
  const idx = clamp(Math.round((x - l.x0) / (l.step * l.scale)), 0, l.count - 1)
  const ox = segCenterX(l, idx)
  const top = y < l.cy
  const oy = top ? l.cy - (l.segH / 2) * l.scale : l.cy + (l.segH / 2) * l.scale + 8
  beams.push({ x1: ox, y1: oy, x2: x, y2: y, t: 0, life: 0.35, color })
  sfxLaser()
}

function commentOn(id: number) {
  const mr = state.mrs.find((m) => m.id === id)
  if (!mr || mr.commented) return
  mr.commented = true
  const gold = commentGold(mr)
  const rp = 1
  state.gold += gold
  state.rp += rp
  since.reviewGold += gold
  since.rp += rp
  since.reviews++
  const i = state.mrs.indexOf(mr)
  const p = asteroidPos(i, state.mrs.length)
  fireLaser(p.x, p.y, '#67e8f9')
  addBurst(p.x, p.y, ['✨', '•'], 6)
  addFloater(p.x, p.y - 20, `+${fmt(gold)} 🪙`, '#fbbf24', 17, 1.4)
  addFloater(p.x + 30, p.y - 4, `+${rp} 🔬`, '#67e8f9', 13, 1.4)
  renderAll()
}

function approve(id: number) {
  const mr = state.mrs.find((m) => m.id === id)
  if (!mr) return
  const gold = approveGold(mr)
  const rp = approveRp(mr)
  const i = state.mrs.indexOf(mr)
  const p = asteroidPos(i, state.mrs.length)
  state.mrs = state.mrs.filter((m) => m.id !== id)
  state.gold += gold
  state.rp += rp
  since.reviewGold += gold
  since.rp += rp
  since.reviews++
  dying.push({ x: p.x, y: p.y, r: asteroidRadius(mr), seed: mr.id, t: 0, burst: false })
  fireLaser(p.x, p.y, '#fde047')
  sfxCrack()
  addFloater(p.x, p.y - 26, `+${fmt(gold)} 🪙`, '#f59e0b', 24, 1.8)
  addFloater(p.x + 40, p.y - 6, `+${rp} 🔬`, '#22d3ee', 16, 1.8)
  renderAll()
}

function hatch(id: number) {
  const egg = state.own.find((e) => e.id === id)
  if (!egg || egg.pet) return
  egg.pet = pick(PETS)
  egg.hatchedAt = now
  since.hatched++
  sfxHatch()
  const l = layout()
  const idx = state.own.indexOf(egg) % l.count
  addBurst(segCenterX(l, idx), l.cy - 40, ['✨', '💫', '⭐'], 10)
  renderAll()
}

function addIncome(sec: number, withFloaters: boolean) {
  const mult = 1 + PET_BONUS * petCount()
  const gain = baseIncome() * mult * sec
  state.gold += gain
  state.time += sec
  since.idleGold += gain
  since.fakeSec += sec
  if (!withFloaters) return
  const l = layout()
  const spawn = (idx: number, amount: number) => {
    addFloater(segCenterX(l, idx), l.cy - 30 * l.scale - 16, `+${fmtSmall(amount)}`, '#fde047', 12, 1.6)
  }
  spawn(l.count - 1, BASE_INCOME * mult * sec)
  state.modules.forEach((m, j) => {
    if (m.kind.family === 'income') spawn(j + 1, moduleValue(m) * mult * sec)
  })
}

function skip(sec: number) {
  addIncome(sec, true)
  sfxCoin()
  renderPanels()
}

function buyModule(slot: number) {
  const kind = state.offers[slot]
  const cost = moduleCost(kind)
  if (state.gold < cost) return sfxNo()
  state.gold -= cost
  state.modules.push({ kind, level: 1, born: now, upgradedAt: -10 })
  const next = state.offers.filter((_, i) => i !== slot)
  state.offers[slot] = rollOffer(next)
  shakeUntil = now + 0.4
  sfxAttach()
  renderAll()
}

function upgradeModule(idx: number) {
  const m = state.modules[idx]
  if (!m || m.level >= 3) return
  const cost = upgradeCost(m)
  if (state.gold < cost) {
    sfxNo()
    return
  }
  state.gold -= cost
  m.level++
  m.upgradedAt = now
  sfxUpgrade()
  renderAll()
}

function rerollOffers() {
  if (state.gold < REROLL_COST) return sfxNo()
  state.gold -= REROLL_COST
  rollAllOffers()
  sfxCoin()
  renderAll()
}

function buyResearch(branch: 'factory' | 'arsenal') {
  const tier = state[branch]
  if (tier >= 3) return
  const cost = RESEARCH_COST[tier]
  if (state.rp < cost) return sfxNo()
  state.rp -= cost
  state[branch]++
  const family: Family = branch === 'factory' ? 'income' : 'gun'
  const unlocked = KINDS.find((k) => k.family === family && k.tier === state[branch])
  if (unlocked) {
    const slot = randInt(0, 2)
    state.offers[slot] = unlocked
  }
  sfxResearch()
  renderAll()
}

function startFocus() {
  phase = 'focus'
  curtain.classList.remove('up')
  shipyardEl.classList.add('locked')
  renderFocusControls()
}

function lookAtShip() {
  curtain.classList.add('up')
  phase = 'card'
  renderFocusControls()
  showCard()
}

function countUp(el: HTMLElement, target: number, prefix: string, delayMs: number) {
  const start = performance.now() + delayMs
  const step = () => {
    const p = clamp((performance.now() - start) / 1200, 0, 1)
    const eased = 1 - Math.pow(1 - p, 3)
    el.textContent = prefix + fmt(target * eased)
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

function showCard() {
  const s = since
  overlay.hidden = false
  overlay.innerHTML = `
    <div class="card">
      <h2>While you were away</h2>
      <div class="away">${fmtDur(s.fakeSec)}</div>
      <div class="line idle"><span>Idle gold</span><b data-n="${s.idleGold}" data-p="+">+0</b></div>
      <div class="line review"><span>${s.reviews === 1 ? '1 review' : `${s.reviews} reviews`} gave gold</span><b data-n="${s.reviewGold}" data-p="+">+0</b></div>
      <div class="line rp"><span>Research</span><b data-n="${s.rp}" data-p="+">+0</b></div>
      <div class="line"><span>${s.hatched === 1 ? '1 egg hatched' : `${s.hatched} eggs hatched`}</span><b>${s.hatched}</b></div>
      <button class="big" id="closeCard" disabled>Open the Shipyard</button>
    </div>`
  const lines = overlay.querySelectorAll<HTMLElement>('.line')
  lines.forEach((line, i) => {
    setTimeout(() => {
      line.classList.add('show')
      const b = line.querySelector<HTMLElement>('b[data-n]')
      if (b) countUp(b, Number(b.dataset.n), b.dataset.p ?? '', 0)
      beep(500 + i * 120, 0.08, 'triangle', 0.05)
    }, i * 500)
  })
  setTimeout(() => {
    const btn = $<HTMLButtonElement>('closeCard')
    btn.disabled = false
  }, lines.length * 500 + 300)
}

function closeCard() {
  overlay.hidden = true
  overlay.innerHTML = ''
  phase = 'idle'
  since = freshSince()
  shipyardEl.classList.remove('locked')
  renderFocusControls()
  renderAll()
}

function renderFocusControls() {
  $('focusControls').innerHTML =
    phase === 'idle'
      ? '<button class="big" data-a="start-focus">Start reviewing</button>'
      : phase === 'focus'
        ? '<button class="big" data-a="look">Look at the ship</button>'
        : ''
}

function renderPanels() {
  $('mrList').innerHTML = state.mrs
    .map(
      (mr) => `
    <div class="row">
      <div>${mr.title}<small>${mr.ageH} h old · ${mr.lines} lines · ${mr.commented ? 'commented' : 'no comment yet'}</small></div>
      <div class="btns">
        <button data-a="comment" data-id="${mr.id}" ${mr.commented ? 'disabled' : ''}>Comment</button>
        <button data-a="approve" data-id="${mr.id}">Approve</button>
      </div>
    </div>`,
    )
    .join('') || '<div class="row"><small>Nothing waits. Press "New MR arrives".</small></div>'
  $('ownList').innerHTML = state.own
    .map(
      (e) => `
    <div class="row">
      <div>${e.title}<small>${e.pet ? `${e.pet} hatched: +10% idle income` : '🥚 waits for a colleague'}</small></div>
      <div class="btns"><button data-a="hatch" data-id="${e.id}" ${e.pet ? 'disabled' : ''}>A colleague reviews it</button></div>
    </div>`,
    )
    .join('')
  $('clock').textContent = `Fake time passed: ${fmtDur(state.time)}`
}

function renderShipyard() {
  const offers = state.offers
    .map((k, i) => {
      const cost = moduleCost(k)
      const effect =
        k.family === 'income'
          ? `+${k.value} gold per second`
          : `+${k.value} to the review burst multiplier`
      return `
      <div class="offer" style="border-color:${k.color}">
        <div class="ico" style="background:${k.color}">${k.emoji}</div>
        <div class="grow"><b>${k.name}</b><small>${k.family === 'income' ? 'Income' : 'Gun'}: ${effect}</small></div>
        <button data-a="buy" data-slot="${i}" data-cost="${cost}">Buy ${fmt(cost)} 🪙</button>
      </div>`
    })
    .join('')
  const locked = KINDS.filter((k) => !isUnlocked(k))
    .map(
      (k) => `
      <div class="offer locked">
        <div class="ico">${k.emoji}</div>
        <div class="grow"><b>${k.name}</b><small>needs ${branchName(k)} tier ${k.tier}</small></div>
      </div>`,
    )
    .join('')
  const mods = state.modules
    .map((m, i) => {
      const next = m.level < 3 ? upgradeCost(m) : 0
      const gain =
        m.kind.value * (LEVEL_MULT[m.level] - LEVEL_MULT[m.level - 1]) * (m.level < 3 ? 1 : 0)
      return `
      <div class="tier">
        <span>${m.kind.emoji} ${m.kind.name} · Lv ${m.level}${m.level < 3 ? ` (+${fmtSmall(gain)} ${m.kind.family === 'income' ? '/s' : 'burst'})` : ' (max)'}</span>
        ${
          m.level < 3
            ? `<button data-a="upgrade" data-idx="${i}" data-cost="${next}">Upgrade ${fmt(next)} 🪙</button>`
            : ''
        }
      </div>`
    })
    .join('') || '<small>No modules yet. Buy one on the left.</small>'
  const branch = (b: 'factory' | 'arsenal', label: string, family: Family) =>
    [1, 2, 3]
      .map((t) => {
        const kind = KINDS.find((k) => k.family === family && k.tier === t)!
        const done = state[b] >= t
        const isNext = state[b] === t - 1
        const cost = RESEARCH_COST[t - 1]
        return `
        <div class="tier ${done ? 'done' : ''}">
          <span>${label} tier ${t}: unlocks ${kind.emoji} ${kind.name}</span>
          ${done ? '<span>done</span>' : `<button data-a="research" data-branch="${b}" data-cost="${cost}" data-rp="1" ${isNext ? '' : 'disabled'}>${cost} 🔬</button>`}
        </div>`
      })
      .join('')
  $('shipyardBody').innerHTML = `
    <div>
      <div class="colhead"><h2>Shipyard: modules (gold)</h2>
        <button data-a="reroll" data-cost="${REROLL_COST}">New offers ${REROLL_COST} 🪙</button></div>
      ${offers}
      <h3>Locked modules</h3>
      ${locked || '<small>Everything is unlocked.</small>'}
    </div>
    <div>
      <h2>Upgrades (click a module on the ship too)</h2>
      ${mods}
      <h3>Research (research points)</h3>
      <b style="font-size:12px">Factory: better income modules</b>
      ${branch('factory', 'Factory', 'income')}
      <b style="font-size:12px">Arsenal: better gun modules</b>
      ${branch('arsenal', 'Arsenal', 'gun')}
    </div>`
  refreshAffordable()
}

function refreshAffordable() {
  document.querySelectorAll<HTMLButtonElement>('#shipyardBody button[data-cost]').forEach((b) => {
    const cost = Number(b.dataset.cost)
    const budget = b.dataset.rp ? state.rp : state.gold
    const gated = b.dataset.a === 'research' && b.dataset.branch && state[b.dataset.branch as 'factory' | 'arsenal'] >= 3
    const orderOk =
      b.dataset.a !== 'research' ||
      (() => {
        const branch = b.dataset.branch as 'factory' | 'arsenal'
        return RESEARCH_COST[state[branch]] === cost
      })()
    b.disabled = budget < cost || !orderOk || !!gated
  })
}

function renderReadout() {
  const pets = petCount()
  $('readout').innerHTML = `
    <div><span class="k">Gold</span><b>🪙 ${fmt(state.gold)}</b></div>
    <div><span class="k">Gold per second</span>${fmtRate(income())}${pets ? ` (pets +${pets * 10}%)` : ''}</div>
    <div><span class="k">Review burst multiplier</span>×${gunBonus().toFixed(2)}</div>
    <div><span class="k">Research points</span>🔬 ${state.rp}</div>
    <div><span class="k">Research tiers</span>Factory ${state.factory}/3 · Arsenal ${state.arsenal}/3</div>
    <div><span class="k">Modules</span>${state.modules.length}</div>
    <div><span class="k">Pets</span>${pets} of ${state.own.length} eggs</div>
    <div><span class="k">Fake time</span>${fmtDur(state.time)}</div>
    <div class="wide">Since the last look: ${fmtDur(since.fakeSec)} · idle gold +${fmt(since.idleGold)} · ${since.reviews} reviews gave gold +${fmt(since.reviewGold)} · research +${since.rp} · ${since.hatched === 1 ? '1 egg' : `${since.hatched} eggs`} hatched</div>`
  $('clock').textContent = `Fake time passed: ${fmtDur(state.time)}`
}

function renderAll() {
  renderPanels()
  renderShipyard()
  renderReadout()
}

document.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-a], #closeCard, #muteBtn')
  if (!t) return
  if (t.id === 'closeCard') return closeCard()
  if (t.id === 'muteBtn') {
    muted = !muted
    t.textContent = muted ? 'Sound: off' : 'Sound: on'
    return
  }
  const id = Number(t.dataset.id)
  switch (t.dataset.a) {
    case 'new-mr':
      state.mrs.push(makeMr(true))
      return renderAll()
    case 'new-own':
      state.own.push(makeOwn())
      return renderAll()
    case 'comment':
      return commentOn(id)
    case 'approve':
      return approve(id)
    case 'hatch':
      return hatch(id)
    case 'skip':
      return skip(Number(t.dataset.sec))
    case 'start-focus':
      return startFocus()
    case 'look':
      return lookAtShip()
    case 'buy':
      return buyModule(Number(t.dataset.slot))
    case 'upgrade':
      return upgradeModule(Number(t.dataset.idx))
    case 'reroll':
      return rerollOffers()
    case 'research':
      return buyResearch(t.dataset.branch as 'factory' | 'arsenal')
  }
})

canvas.addEventListener('click', (e) => {
  if (phase !== 'idle') return
  const r = canvas.getBoundingClientRect()
  const x = ((e.clientX - r.left) / r.width) * canvas.width
  const y = ((e.clientY - r.top) / r.height) * canvas.height
  const hit = hitRects.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h)
  if (hit) upgradeModule(hit.idx)
})

function resize() {
  canvas.width = canvas.clientWidth
  canvas.height = 210
}
window.addEventListener('resize', resize)

function roundRect(x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function drawSegment(l: Layout, i: number) {
  const n = l.count
  const isEngine = i === 0
  const isCockpit = i === n - 1
  const mod = !isEngine && !isCockpit ? state.modules[i - 1] : null
  const level = mod ? mod.level : 1
  const grow = [1, 1.18, 1.36][level - 1]
  const sc = l.scale
  const w = l.segW * sc
  const h = l.segH * sc * grow
  const cx = segCenterX(l, i)
  let cy = l.cy + Math.sin(now * 2 + i * 0.6) * 2 * sc
  if (now < shakeUntil) cy += Math.sin(now * 60) * 2
  let alpha = 1
  let scalePop = 1
  if (mod) {
    const a = (now - mod.born) / 0.7
    if (a < 1) {
      const e = 1 - Math.pow(1 - clamp(a, 0, 1), 3)
      cy -= (1 - e) * 110
      alpha = 0.3 + 0.7 * e
      scalePop = 0.6 + 0.4 * e
    }
    const u = (now - mod.upgradedAt) / 0.6
    if (u >= 0 && u < 1) scalePop *= 1 + 0.25 * Math.sin(u * Math.PI)
  }
  const color = isEngine ? '#94a3b8' : isCockpit ? '#60a5fa' : mod!.kind.color
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(cx, cy)
  ctx.scale(scalePop, scalePop)
  if (isEngine) {
    ctx.fillStyle = '#fb923c'
    const flame = 14 + Math.sin(now * 30) * 5
    ctx.beginPath()
    ctx.moveTo(-w / 2, -h / 4)
    ctx.lineTo(-w / 2 - flame * sc, 0)
    ctx.lineTo(-w / 2, h / 4)
    ctx.fill()
  }
  if (level >= 2) {
    ctx.shadowColor = level === 3 ? '#fbbf24' : '#ffffff'
    ctx.shadowBlur = level === 3 ? 26 : 12
  }
  ctx.fillStyle = color
  roundRect(-w / 2, -h / 2, w, h, 10 * sc)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.lineWidth = level === 3 ? 3 : 2
  ctx.strokeStyle = level === 3 ? '#f59e0b' : '#1e293b'
  ctx.stroke()
  if (isCockpit) {
    ctx.fillStyle = '#60a5fa'
    ctx.beginPath()
    ctx.moveTo(w / 2 - 2, -h / 2)
    ctx.lineTo(w / 2 + 22 * sc, 0)
    ctx.lineTo(w / 2 - 2, h / 2)
    ctx.fill()
    ctx.stroke()
  }
  if (mod && mod.kind.family === 'gun') {
    ctx.fillStyle = '#334155'
    ctx.fillRect(-4 * sc, h / 2, 8 * sc, 10 * sc)
    ctx.beginPath()
    ctx.arc(0, h / 2 + 12 * sc, 6 * sc, 0, Math.PI * 2)
    ctx.fill()
  }
  const emoji = isEngine ? '🔥' : isCockpit ? '🧑‍🚀' : mod!.kind.emoji
  ctx.font = `${Math.max(10, h * 0.55)}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, 0, 1)
  ctx.restore()
  if (mod) {
    const a = (now - mod.born) / 0.7
    if (a >= 1 && a < 1.6) {
      ctx.strokeStyle = `rgba(255,255,255,${1.6 - a})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(cx, cy, (a - 1) * 90 + 20, 0, Math.PI * 2)
      ctx.stroke()
    }
    hitRects.push({ x: cx - w / 2, y: cy - h / 2, w, h, idx: i - 1 })
  }
}

function drawAsteroid(x: number, y: number, r: number, seed: number, lines: number, commented: boolean) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = '#78716c'
  ctx.strokeStyle = '#44403c'
  ctx.lineWidth = 2
  ctx.beginPath()
  const pts = 10
  for (let k = 0; k < pts; k++) {
    const a = (k / pts) * Math.PI * 2
    const rr = r * (0.82 + 0.18 * Math.abs(Math.sin(seed * 7.3 + k * 2.1)))
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#57534e'
  ctx.beginPath()
  ctx.arc(-r * 0.3, -r * 0.2, r * 0.18, 0, Math.PI * 2)
  ctx.arc(r * 0.25, r * 0.3, r * 0.13, 0, Math.PI * 2)
  ctx.fill()
  const ore = clamp(Math.round(lines / 60), 1, 10)
  for (let k = 0; k < ore; k++) {
    const a = seed * 3.1 + k * 2.4
    const d = r * 0.6 * ((k % 3) / 3 + 0.25)
    ctx.fillStyle = k % 2 === 0 ? '#fde047' : '#67e8f9'
    ctx.beginPath()
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
  if (commented) {
    ctx.strokeStyle = '#fef08a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-r * 0.5, -r * 0.6)
    ctx.lineTo(0, 0)
    ctx.lineTo(r * 0.3, r * 0.6)
    ctx.stroke()
  }
  ctx.restore()
}

function drawPets(l: Layout) {
  state.own.forEach((e, i) => {
    const idx = i % l.count
    const stack = Math.floor(i / l.count)
    const cx = segCenterX(l, idx) + stack * 10
    const baseY = l.cy - (l.segH / 2) * l.scale - 14 - stack * 6
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (!e.pet) {
      const wob = Math.sin(now * 5 + i) * 0.15
      ctx.save()
      ctx.translate(cx, baseY)
      ctx.rotate(wob)
      ctx.font = '22px serif'
      ctx.fillText('🥚', 0, 0)
      ctx.restore()
    } else {
      const a = clamp((now - e.hatchedAt) / 0.8, 0, 1)
      const pop = a < 1 ? 1 + Math.sin(a * Math.PI) * 0.8 : 1
      const hop = Math.abs(Math.sin(now * 3 + i * 2)) * 5
      ctx.font = `${26 * pop}px serif`
      ctx.fillText(e.pet, cx, baseY - hop)
    }
  })
}

function draw(dt: number) {
  const W = canvas.width
  const H = canvas.height
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#0f0c29')
  grad.addColorStop(1, '#1e1b4b')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)
  for (const s of stars) {
    s.x -= (dt * 0.04 * s.z) / 1
    if (s.x < 0) s.x += 1
    ctx.fillStyle = `rgba(255,255,255,${0.3 + s.z * 0.6})`
    ctx.fillRect(s.x * W, s.y * H, s.z * 2.2, s.z * 2.2)
  }

  state.mrs.forEach((mr, i) => {
    const p = asteroidPos(i, state.mrs.length)
    const r = asteroidRadius(mr)
    drawAsteroid(p.x, p.y, r, mr.id, mr.lines, mr.commented)
    ctx.fillStyle = '#cbd5e1'
    ctx.font = '10px system-ui'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${mr.ageH}h · ${mr.lines}L`, p.x + r + 4, p.y)
  })

  for (let i = dying.length - 1; i >= 0; i--) {
    const d = dying[i]
    d.t += dt
    if (d.t > 0.3 && !d.burst) {
      d.burst = true
      addBurst(d.x, d.y, ['💎', '✨', '🪙', '⭐'], 16)
    }
    if (d.t > 0.7) {
      dying.splice(i, 1)
      continue
    }
    if (d.t <= 0.3) {
      drawAsteroid(d.x + Math.sin(d.t * 90) * 3, d.y, d.r, d.seed, 600, true)
    } else {
      const k = (d.t - 0.3) / 0.4
      ctx.globalAlpha = 1 - k
      drawAsteroid(d.x - k * 30, d.y - k * 8, d.r * 0.6, d.seed, 100, true)
      drawAsteroid(d.x + k * 30, d.y + k * 8, d.r * 0.6, d.seed + 1, 100, true)
      ctx.globalAlpha = 1
    }
  }

  shipScale += (targetScale() - shipScale) * Math.min(1, dt * 6)
  const l = layout()
  hitRects = []
  for (let i = 0; i < l.count; i++) drawSegment(l, i)
  drawPets(l)

  for (let i = beams.length - 1; i >= 0; i--) {
    const b = beams[i]
    b.t += dt
    if (b.t > b.life) {
      beams.splice(i, 1)
      continue
    }
    ctx.strokeStyle = b.color
    ctx.globalAlpha = 1 - b.t / b.life
    ctx.lineWidth = 4
    ctx.shadowColor = b.color
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.moveTo(b.x1, b.y1)
    ctx.lineTo(b.x2, b.y2)
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.t += dt
    if (p.t > p.life) {
      particles.splice(i, 1)
      continue
    }
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 180 * dt
    ctx.globalAlpha = 1 - p.t / p.life
    ctx.font = `${p.size}px serif`
    ctx.textAlign = 'center'
    ctx.fillStyle = '#fff'
    ctx.fillText(p.text, p.x, p.y)
    ctx.globalAlpha = 1
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]
    f.t += dt
    if (f.t > f.life) {
      floaters.splice(i, 1)
      continue
    }
    ctx.globalAlpha = 1 - Math.pow(f.t / f.life, 2)
    ctx.font = `bold ${f.size}px system-ui`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    const y = f.y - f.t * 28
    ctx.strokeText(f.text, f.x, y)
    ctx.fillStyle = f.color
    ctx.fillText(f.text, f.x, y)
    ctx.globalAlpha = 1
  }

  shownGold += (state.gold - shownGold) * Math.min(1, dt * 8)
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  roundRect(W - 250, 8, 242, 28, 14)
  ctx.fill()
  ctx.fillStyle = '#fde047'
  ctx.font = 'bold 15px system-ui'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText(`🪙 ${fmt(shownGold)}  (+${fmtRate(income())}/s)`, W - 18, 23)
}

let last = performance.now()
function frame(ts: number) {
  const dt = Math.min((ts - last) / 1000, 3600)
  last = ts
  now = ts / 1000
  addIncome(dt, false)
  incomeTimer += dt
  if (incomeTimer >= 2) {
    const mult = 1 + PET_BONUS * petCount()
    const l = layout()
    state.modules.forEach((m, j) => {
      if (m.kind.family === 'income') {
        addFloater(segCenterX(l, j + 1), l.cy - 30 * l.scale - 16, `+${fmtSmall(moduleValue(m) * mult * incomeTimer)}`, '#fde047', 12, 1.6)
      }
    })
    addFloater(segCenterX(l, l.count - 1), l.cy - 30 * l.scale - 16, `+${fmtSmall(BASE_INCOME * mult * incomeTimer)}`, '#fde047', 12, 1.6)
    incomeTimer = 0
  }
  draw(dt)
  requestAnimationFrame(frame)
}

for (let i = 0; i < 5; i++) state.mrs.push(makeMr(false))
state.own.push(makeOwn(), makeOwn())
rollAllOffers()
resize()
shipScale = targetScale()
renderFocusControls()
renderAll()
setInterval(() => {
  renderReadout()
  refreshAffordable()
}, 250)
requestAnimationFrame(frame)
