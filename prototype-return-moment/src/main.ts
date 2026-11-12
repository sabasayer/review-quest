import './style.css'

type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary'
type Gun = { name: string; rarity: Rarity; damage: number }
type Chest = { gun: Gun; milestone: boolean; bornAt: number; shakeAt: number }
type Mr = { id: number; title: string; ageH: number; lines: number; comments: number }
type Egg = { id: number; title: string; pet: string | null }
type Monster = {
  id: number
  emoji: string
  size: number
  x: number
  hp: number
  maxHp: number
  hitFlash: number
  mode: 'queue' | 'popping' | 'fleeing'
  t: number
}
type Projectile = { x: number; y: number; target: Monster; onHit: () => void }
type Floater = {
  x: number
  y: number
  text: string
  color: string
  size: number
  t: number
  life: number
  tx?: number
  ty?: number
  onEnd?: () => void
}
type Particle = { x: number; y: number; vx: number; vy: number; t: number; life: number; text: string; size: number }
type ReviewEvent = {
  mrId: number
  emoji: string
  size: number
  kind: 'comment' | 'approve'
  damage: number
  xp: number
  levelAfter: number
}
type Since = {
  reviews: number
  approves: number
  xp: number
  levelFrom: number
  chests: number
  eggs: number
  milestone: boolean
  events: ReviewEvent[]
}
type Replay = {
  events: ReviewEvent[]
  index: number
  clock: number
  nextAt: number
  step: number
  monster: Monster | null
  bag: number
  onDone: () => void
}
type Variant = 'a' | 'b' | 'c'

const RARITY_COLOR: Record<Rarity, string> = {
  Common: '#9aa0a6',
  Rare: '#3b82f6',
  Epic: '#a855f7',
  Legendary: '#f59e0b',
}
const PREFIX: Record<Rarity, string> = {
  Common: 'Rusty',
  Rare: 'Shiny',
  Epic: 'Overclocked',
  Legendary: 'Legendary',
}
const DAMAGE_RANGE: Record<Rarity, [number, number]> = {
  Common: [4, 8],
  Rare: [9, 16],
  Epic: [17, 28],
  Legendary: [30, 45],
}
const GUN_NAMES = [
  'LGTM Cannon',
  'Nitpick Sniper',
  'Rebase Launcher',
  'Bubble Blaster',
  'Squash Hammer-Gun',
  'Force-Push Bazooka',
]
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
const EGG_TITLES = [
  'Add dark mode to the toaster',
  'Make the logo 3% bigger',
  'Teach the app to say hello',
  'Speed up the slow thing',
  'Fix the bug that was a feature',
]
const BUGS = ['🐛', '🐞', '🪲', '🦟']
const PETS = ['🐣', '🐲', '🦄', '🐙', '🐢', '🦊']

const HERO_X = 260
const GROUND_Y = 122
const CHEST_X0 = 24
const CHEST_STEP = 26
const CHEST_SHOWN_MAX = 7

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const canvas = $<HTMLCanvasElement>('canvas')
const ctx = canvas.getContext('2d')!
const curtain = $('curtain')
const popup = $('popup')
const overlay = $('overlay')

const state = {
  level: 1,
  xpInLevel: 0,
  gun: { name: 'Plain Water Pistol', rarity: 'Common', damage: 5 } as Gun,
  chests: [] as Chest[],
  pets: [] as string[],
  approvals: 0,
  distance: 0,
  mrs: [] as Mr[],
  eggs: [] as Egg[],
  nextId: 1,
}

const freshSince = (): Since => ({
  reviews: 0,
  approves: 0,
  xp: 0,
  levelFrom: state.level,
  chests: 0,
  eggs: 0,
  milestone: false,
  events: [],
})

let since = freshSince()
let lastLookText = 'No look yet.'
let phase: 'idle' | 'focus' | 'return' = 'idle'
let shownLevel = 1
let chestsHidden = false
let glowUntil = 0
let heroFlashUntil = 0
let plusBanner: { text: string; until: number } | null = null
let gunBanner: { text: string; until: number } | null = null
let popupGun: Chest | null = null
let opening = false
let replay: Replay | null = null
let now = 0
let roadOffset = 0
let idleShotTimer = 2

const monsters = new Map<number, Monster>()
const dying: Monster[] = []
const projectiles: Projectile[] = []
const floaters: Floater[] = []
const particles: Particle[] = []

const initialVariant = new URLSearchParams(location.search).get('v')
let variant: Variant = initialVariant === 'b' || initialVariant === 'c' ? initialVariant : 'a'

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1))
const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)]
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const xpNeeded = (level: number) => 30 + 10 * level

let audio: AudioContext | null = null
let muted = false
function beep(freq: number, dur = 0.08, type: OscillatorType = 'sine', vol = 0.07, delay = 0) {
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
const sfxShot = () => beep(900, 0.05, 'square', 0.03)
const sfxHit = () => beep(480, 0.07, 'triangle', 0.08)
const sfxPop = () => {
  beep(600, 0.08, 'sine')
  beep(900, 0.1, 'sine', 0.07, 0.07)
}
const sfxLevel = () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.12, 'triangle', 0.08, i * 0.09))
const sfxTick = () => beep(1100, 0.05, 'square', 0.04)
const sfxShake = () => {
  beep(160, 0.1, 'square', 0.05)
  beep(190, 0.1, 'square', 0.05, 0.12)
  beep(160, 0.1, 'square', 0.05, 0.24)
}
const sfxReveal = (rarity: Rarity) => {
  const notes = { Common: 1, Rare: 2, Epic: 3, Legendary: 5 }[rarity]
  for (let i = 0; i < notes; i++) beep(440 * Math.pow(1.25, i), 0.15, 'triangle', 0.08, i * 0.08)
}
const sfxEquip = () => [392, 523, 659].forEach((f, i) => beep(f, 0.1, 'square', 0.05, i * 0.07))

function rollChest(milestone: boolean): Chest {
  const r = Math.random() * 100
  const rarity: Rarity = milestone
    ? r < 65
      ? 'Rare'
      : r < 92
        ? 'Epic'
        : 'Legendary'
    : r < 55
      ? 'Common'
      : r < 85
        ? 'Rare'
        : r < 97
          ? 'Epic'
          : 'Legendary'
  const [lo, hi] = DAMAGE_RANGE[rarity]
  const gun: Gun = {
    name: `${PREFIX[rarity]} ${pick(GUN_NAMES)}`,
    rarity,
    damage: randInt(lo, hi) + state.level,
  }
  return { gun, milestone, bornAt: now, shakeAt: -10 }
}

function makeMr(fresh: boolean): Mr {
  return {
    id: state.nextId++,
    title: pick(MR_TITLES),
    ageH: fresh ? randInt(1, 4) : randInt(1, 48),
    lines: randInt(10, 600),
    comments: 0,
  }
}

function makeEgg(): Egg {
  return { id: state.nextId++, title: pick(EGG_TITLES), pet: null }
}

function monsterFor(mr: Mr): Monster {
  const maxHp = Math.round(20 + mr.lines * 0.5)
  return {
    id: mr.id,
    emoji: BUGS[mr.id % BUGS.length],
    size: clamp(30 + mr.ageH * 1.3, 30, 80),
    x: canvas.width + 60,
    hp: maxHp,
    maxHp,
    hitFlash: 0,
    mode: 'queue',
    t: 0,
  }
}

function gainXp(amount: number) {
  state.xpInLevel += amount
  since.xp += amount
  let gained = 0
  while (state.xpInLevel >= xpNeeded(state.level)) {
    state.xpInLevel -= xpNeeded(state.level)
    state.level++
    gained++
  }
  return gained
}

function afterLevelChange(gained: number) {
  if (gained > 0 && phase === 'idle') {
    shownLevel = state.level
    glowUntil = now + 2.5
    addFloater(HERO_X + 40, 30, `Level up! Lv ${state.level}`, '#f59e0b', 20, 1.6)
    sfxLevel()
  } else if (phase === 'idle') {
    shownLevel = state.level
  }
}

function addFloater(
  x: number,
  y: number,
  text: string,
  color: string,
  size: number,
  life: number,
  extra: Partial<Floater> = {},
) {
  floaters.push({ x, y, text, color, size, t: 0, life, ...extra })
}

function addBurst(x: number, y: number, text: string, count: number) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2)
    const s = rand(40, 140)
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: 0, life: rand(0.5, 0.9), text, size: rand(12, 20) })
  }
}

function fireShot(target: Monster, onHit: () => void) {
  projectiles.push({ x: HERO_X + 50, y: 100, target, onHit })
  sfxShot()
}

function damageFloater(m: Monster, dmg: number) {
  addFloater(m.x, GROUND_Y - m.size - 14, `-${dmg}`, '#f97316', 14 + Math.min(dmg, 60) * 0.4, 0.8)
}

function hitMonster(m: Monster, dmg: number) {
  m.hp = Math.max(1, m.hp - dmg)
  m.hitFlash = 1
  damageFloater(m, dmg)
  sfxHit()
}

function popMonster(m: Monster, xp: number) {
  m.mode = m.id % 2 === 0 ? 'popping' : 'fleeing'
  m.t = 0
  if (m.mode === 'popping') addBurst(m.x, GROUND_Y - m.size / 2, '✨', 8)
  else addFloater(m.x, GROUND_Y - m.size - 14, 'bye!', '#6366f1', 14, 0.8)
  addFloater(m.x, GROUND_Y - m.size / 2, `+${xp} XP`, '#f59e0b', 18, 0.9, { tx: HERO_X, ty: 36 })
  sfxPop()
}

function recordEvent(mr: Mr, kind: 'comment' | 'approve', xp: number, damage: number) {
  since.reviews++
  since.events.push({
    mrId: mr.id,
    emoji: BUGS[mr.id % BUGS.length],
    size: clamp(30 + mr.ageH * 1.3, 30, 80),
    kind,
    damage,
    xp,
    levelAfter: state.level,
  })
}

function commentOn(id: number) {
  const mr = state.mrs.find((m) => m.id === id)
  const monster = monsters.get(id)
  if (!mr || !monster) return
  const xp = 5
  const damage = state.gun.damage
  mr.comments++
  afterLevelChange(gainXp(xp))
  recordEvent(mr, 'comment', xp, damage)
  fireShot(monster, () => hitMonster(monster, damage))
  render()
}

function approve(id: number) {
  const mr = state.mrs.find((m) => m.id === id)
  const monster = monsters.get(id)
  if (!mr || !monster) return
  const xp = 20 + Math.round(mr.lines / 20)
  const damage = state.gun.damage
  state.mrs = state.mrs.filter((m) => m.id !== id)
  monsters.delete(id)
  dying.push(monster)
  state.approvals++
  const milestone = state.approvals % 5 === 0
  state.chests.push(rollChest(milestone))
  since.chests++
  since.approves++
  if (milestone) since.milestone = true
  afterLevelChange(gainXp(xp))
  recordEvent(mr, 'approve', xp, damage)
  fireShot(monster, () => popMonster(monster, xp))
  render()
}

function hatch(id: number) {
  const egg = state.eggs.find((e) => e.id === id)
  if (!egg || egg.pet) return
  egg.pet = pick(PETS)
  state.pets.push(egg.pet)
  since.eggs++
  if (phase === 'idle') addFloater(HERO_X - 60, 140, `${egg.pet} hatched!`, '#16a34a', 16, 1.4)
  beep(700, 0.08, 'triangle')
  beep(1000, 0.1, 'triangle', 0.07, 0.08)
  render()
}

function startFocus() {
  since = freshSince()
  phase = 'focus'
  curtain.classList.remove('up')
  render()
}

function equip(gun: Gun) {
  state.gun = gun
  heroFlashUntil = now + 2.5
  gunBanner = { text: `New gun: ${gun.name}`, until: now + 4 }
  sfxEquip()
}

function finishReturn() {
  overlay.hidden = true
  overlay.innerHTML = ''
  chestsHidden = false
  shownLevel = state.level
  curtain.classList.add('up')
  phase = 'idle'
  render()
}

function gunCardHtml(chest: Chest) {
  const color = RARITY_COLOR[chest.gun.rarity]
  return `<div class="rarity" style="color:${color};font-weight:bold">${chest.gun.rarity}${chest.milestone ? ' · MILESTONE' : ''}</div><div class="gunname">${chest.gun.name}</div><div>${chest.gun.damage} dmg</div>`
}

function burstInto(host: HTMLElement, text: string) {
  for (let i = 0; i < 10; i++) {
    const span = document.createElement('span')
    span.className = 'burst'
    span.textContent = text
    const a = rand(0, Math.PI * 2)
    const d = rand(40, 90)
    span.style.setProperty('--dx', `${Math.cos(a) * d}px`)
    span.style.setProperty('--dy', `${Math.sin(a) * d}px`)
    host.appendChild(span)
    setTimeout(() => span.remove(), 900)
  }
}

function chestRow(host: HTMLElement, batch: Chest[], autoOpen: boolean, done: () => void) {
  host.innerHTML = `<div class="chestrow">${batch
    .map(
      (c, i) =>
        `<button class="chestbtn" data-i="${i}"><span class="ico">🎁</span>${c.milestone ? '<span class="star">⭐ Milestone reward</span>' : ''}<span class="slot"></span></button>`,
    )
    .join('')}</div>`
  const buttons = [...host.querySelectorAll<HTMLButtonElement>('.chestbtn')]
  let left = batch.length
  const open = (i: number) => {
    const button = buttons[i]
    if (button.dataset.busy) return
    button.dataset.busy = '1'
    button.classList.add('shake')
    sfxShake()
    setTimeout(() => {
      const chest = batch[i]
      button.classList.remove('shake')
      button.classList.add('opened')
      button.style.borderColor = RARITY_COLOR[chest.gun.rarity]
      button.querySelector('.ico')!.textContent = '🎁✨'
      button.querySelector('.slot')!.innerHTML = gunCardHtml(chest)
      burstInto(button, chest.gun.rarity === 'Legendary' ? '⭐' : '✨')
      sfxReveal(chest.gun.rarity)
      left--
      if (left === 0) setTimeout(done, 800)
    }, 450)
  }
  buttons.forEach((b, i) => b.addEventListener('click', () => open(i)))
  if (autoOpen) buttons.forEach((_, i) => setTimeout(() => open(i), 300 + i * 130))
  if (batch.length === 0) done()
}

function choice(host: HTMLElement, guns: Chest[], done: () => void) {
  if (guns.length === 0) {
    done()
    return
  }
  const old = state.gun
  host.innerHTML = `<h2>Pick your gun</h2>
    <div>Your gun now: <b style="color:${RARITY_COLOR[old.rarity]}">${old.name}</b> · ${old.damage} dmg</div>
    <div class="choice">${guns
      .map((c, i) => {
        const diff = c.gun.damage - old.damage
        const diffHtml =
          diff >= 0
            ? `<span class="up-good">${old.damage} → ${c.gun.damage} dmg (+${diff})</span>`
            : `<span class="up-bad">${old.damage} → ${c.gun.damage} dmg (${diff})</span>`
        return `<div class="opt" style="border-color:${RARITY_COLOR[c.gun.rarity]}">${gunCardHtml(c)}${diffHtml}<button class="primary" data-i="${i}">Equip</button></div>`
      })
      .join('')}</div>
    <button data-keep="1">Keep my old gun</button>`
  host.querySelectorAll<HTMLButtonElement>('button[data-i]').forEach((b) =>
    b.addEventListener('click', () => {
      equip(guns[Number(b.dataset.i)].gun)
      done()
    }),
  )
  host.querySelector('[data-keep]')!.addEventListener('click', () => {
    sfxTick()
    done()
  })
}

function reportLine(report: Since) {
  const levels = report.levelFrom === state.level ? `Level ${state.level}` : `Level ${report.levelFrom} → ${state.level}`
  const chests = `${report.chests} chest${report.chests === 1 ? '' : 's'}`
  const eggs = `${report.eggs} egg${report.eggs === 1 ? '' : 's'} hatched`
  return `${report.reviews} reviews · ${levels} · ${chests} · ${eggs}`
}

function runVariantA(report: Since) {
  overlay.hidden = false
  const hasLevels = state.level > report.levelFrom
  overlay.innerHTML = `<div class="card">
    <h2>While you reviewed</h2>
    <div class="summary">${report.reviews} reviews · Level <b id="lvFrom">${report.levelFrom}</b> → <b id="lvTo">${report.levelFrom}</b> · ${report.chests} chest${report.chests === 1 ? '' : 's'} · ${report.eggs} egg${report.eggs === 1 ? '' : 's'} hatched</div>
    <div>+${report.xp} XP</div>
    ${report.milestone ? '<div class="milestone">Milestone reached: a rare chest is waiting!</div>' : ''}
    <div id="cardBody"></div></div>`
  const lvTo = $('lvTo')
  const body = $('cardBody')
  const proceed = () => {
    const batch = state.chests.splice(0)
    if (batch.length === 0) {
      body.innerHTML = '<p>No chests this time.</p><button class="big" id="closeCard">Back to the game</button>'
      $('closeCard').addEventListener('click', finishReturn)
      return
    }
    body.innerHTML = '<p>Click each chest to open it.</p><div id="chestHost"></div>'
    chestRow($('chestHost'), batch, false, () => choice(body, batch, finishReturn))
    render()
  }
  if (!hasLevels) {
    setTimeout(proceed, 900)
    return
  }
  let value = report.levelFrom
  const tick = () => {
    value++
    lvTo.textContent = String(value)
    sfxTick()
    if (value < state.level) setTimeout(tick, 450)
    else {
      sfxLevel()
      setTimeout(proceed, 900)
    }
  }
  setTimeout(tick, 700)
}

function runVariantB(report: Since) {
  const events = report.events
  const batchStart = () => {
    replay = null
    const batch = state.chests.splice(0)
    overlay.hidden = false
    overlay.innerHTML = '<div class="card"><h2>Your chests</h2><div id="cardBody"></div></div>'
    const body = $('cardBody')
    if (batch.length === 0) {
      body.innerHTML = '<p>No chests this time.</p><button class="big" id="closeCard">Back to the game</button>'
      $('closeCard').addEventListener('click', finishReturn)
      return
    }
    body.innerHTML = '<div id="chestHost"></div>'
    chestRow($('chestHost'), batch, true, () => choice(body, batch, finishReturn))
    render()
  }
  shownLevel = report.levelFrom
  const step = events.length ? clamp(5 / events.length, 0.15, 0.8) : 0
  setTimeout(() => {
    replay = { events, index: 0, clock: 0, nextAt: 0, step, monster: null, bag: 0, onDone: batchStart }
    if (events.length === 0) batchStart()
  }, 700)
}

function runVariantC(report: Since) {
  shownLevel = report.levelFrom
  setTimeout(() => {
    shownLevel = state.level
    const gained = state.level - report.levelFrom
    glowUntil = now + 5
    if (gained > 0) {
      plusBanner = { text: `+${gained}`, until: now + 5 }
      sfxLevel()
    }
    chestsHidden = false
    phase = 'idle'
    render()
  }, 800)
}

function lookAtGame() {
  const report = since
  lastLookText = reportLine(report) + (report.milestone ? ' · milestone hit' : '') + ` · +${report.xp} XP`
  since = freshSince()
  chestsHidden = true
  if (variant === 'a') {
    phase = 'return'
    runVariantA(report)
  } else if (variant === 'b') {
    phase = 'return'
    curtain.classList.add('up')
    runVariantB(report)
  } else {
    curtain.classList.add('up')
    runVariantC(report)
    phase = 'return'
  }
  render()
}

function openChestInPlace(index: number) {
  if (popupGun || opening || phase === 'focus' || phase === 'return' || chestsHidden) return
  const chest = state.chests[index]
  if (!chest) return
  opening = true
  chest.shakeAt = now
  sfxShake()
  setTimeout(() => {
    const x = CHEST_X0 + index * CHEST_STEP
    state.chests.splice(state.chests.indexOf(chest), 1)
    addBurst(x, 104, chest.gun.rarity === 'Legendary' ? '⭐' : '✨', 12)
    sfxReveal(chest.gun.rarity)
    popupGun = chest
    const old = state.gun
    popup.innerHTML = `${gunCardHtml(chest)}<div>Your gun: ${old.damage} dmg</div><div class="btns"><button class="primary" data-a="popup-equip">Equip</button><button data-a="popup-keep">Leave it</button></div>`
    popup.style.left = `${clamp(x - 90, 4, canvas.clientWidth - 220)}px`
    popup.style.borderColor = RARITY_COLOR[chest.gun.rarity]
    popup.hidden = false
    opening = false
    render()
  }, 450)
}

function closePopup(equipIt: boolean) {
  if (popupGun && equipIt) equip(popupGun.gun)
  popupGun = null
  popup.hidden = true
  render()
}

const mrList = $('mrList')
const eggList = $('eggList')
const readout = $('readout')
const focusControls = $('focusControls')
const bar = $('bar')

function renderPanel() {
  mrList.innerHTML = state.mrs
    .map(
      (mr) => `<div class="row"><div><b>${mr.title}</b><small>${mr.ageH}h old · ${mr.lines} lines${mr.comments ? ` · ${mr.comments} comment${mr.comments > 1 ? 's' : ''} from you` : ''}</small></div>
      <div class="btns"><button data-a="comment" data-id="${mr.id}">Comment</button><button class="primary" data-a="approve" data-id="${mr.id}">Approve</button></div></div>`,
    )
    .join('')
  eggList.innerHTML = state.eggs
    .map(
      (egg) => `<div class="row"><div><b>${egg.pet ?? '🥚'} ${egg.title}</b><small>${egg.pet ? 'A colleague reviewed it. A pet hatched.' : 'Waiting for a colleague'}</small></div>
      <div class="btns">${egg.pet ? '' : `<button data-a="hatch" data-id="${egg.id}">A colleague reviews it</button>`}</div></div>`,
    )
    .join('')
  focusControls.innerHTML =
    phase === 'idle'
      ? '<button class="big" data-a="start-focus">Start reviewing</button>'
      : phase === 'focus'
        ? '<button class="big" data-a="look">Look at the game</button>'
        : '<button class="big" disabled>Looking…</button>'
}

function renderReadout() {
  const color = RARITY_COLOR[state.gun.rarity]
  const toMilestone = 5 - (state.approvals % 5)
  const gained = state.level - since.levelFrom
  readout.innerHTML = `
    <div><span class="k">Level</span><b>${state.level}</b> <small>(${state.xpInLevel}/${xpNeeded(state.level)} XP)</small><div class="xpbar"><i style="width:${(state.xpInLevel / xpNeeded(state.level)) * 100}%"></i></div></div>
    <div><span class="k">Equipped gun</span><b style="color:${color}">${state.gun.name}</b> · ${state.gun.damage} dmg</div>
    <div><span class="k">Chests unopened</span><b>${state.chests.length}</b></div>
    <div><span class="k">Pets</span>${state.pets.length ? state.pets.join(' ') : 'none yet'}</div>
    <div><span class="k">Approvals</span><b>${state.approvals}</b> <small>(${toMilestone} to the next milestone)</small></div>
    <div><span class="k">Distance walked</span>${Math.floor(state.distance)} m</div>
    <div class="wide"><span class="k">Since last look</span>${since.reviews} reviews · ${since.approves} approves · +${since.xp} XP · levels +${gained} · ${since.chests} chests · ${since.eggs} eggs hatched${since.milestone ? ' · <b class="milestone">milestone hit</b>' : ''}</div>
    <div class="wide"><span class="k">Last look</span>${lastLookText}</div>`
}

function renderBar() {
  const names: Record<Variant, string> = { a: 'A Chest pile', b: 'B Fast replay', c: 'C Quiet strip' }
  bar.innerHTML =
    '<span>Return moment:</span>' +
    (['a', 'b', 'c'] as Variant[])
      .map((v) => `<button data-a="variant" data-v="${v}" class="${v === variant ? 'on' : ''}">${names[v]}</button>`)
      .join('') +
    `<button data-a="mute">${muted ? 'Sound off' : 'Sound on'}</button>`
}

function render() {
  renderPanel()
  renderReadout()
  renderBar()
}

document.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')
  if (!target) return
  const id = Number(target.dataset.id)
  switch (target.dataset.a) {
    case 'comment':
      return commentOn(id)
    case 'approve':
      return approve(id)
    case 'hatch':
      return hatch(id)
    case 'new-mr':
      state.mrs.push(makeMr(true))
      return render()
    case 'new-egg':
      state.eggs.push(makeEgg())
      return render()
    case 'start-focus':
      return startFocus()
    case 'look':
      return lookAtGame()
    case 'popup-equip':
      return closePopup(true)
    case 'popup-keep':
      return closePopup(false)
    case 'mute':
      muted = !muted
      return renderBar()
    case 'variant': {
      variant = target.dataset.v as Variant
      const url = new URL(location.href)
      url.searchParams.set('v', variant)
      history.replaceState(null, '', url)
      return renderBar()
    }
  }
})

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect()
  const mx = ((e.clientX - rect.left) / rect.width) * canvas.width
  const my = ((e.clientY - rect.top) / rect.height) * canvas.height
  const shown = Math.min(state.chests.length, CHEST_SHOWN_MAX)
  if (my < 80 || my > 130 || shown === 0) return
  const index = Math.floor((mx - (CHEST_X0 - 13)) / CHEST_STEP)
  if (index >= 0 && index < shown) openChestInPlace(index)
})

function resize() {
  canvas.width = $('strip').clientWidth
}
window.addEventListener('resize', resize)

function slotUpdate(dt: number) {
  const order = state.mrs
    .map((mr) => monsters.get(mr.id))
    .filter((m): m is Monster => !!m)
    .sort((a, b) => b.size - a.size)
  let slotX = HERO_X + 190
  for (const m of order) {
    const target = slotX + m.size / 2
    const dist = target - m.x
    m.x += Math.sign(dist) * Math.min(Math.abs(dist), 110 * dt)
    slotX += m.size * 0.85 + 10
  }
}

function playReplayEvent(r: Replay, e: ReviewEvent) {
  if (!r.monster || r.monster.id !== e.mrId) {
    r.monster = {
      id: e.mrId,
      emoji: e.emoji,
      size: e.size,
      x: HERO_X + 120,
      hp: 100,
      maxHp: 100,
      hitFlash: 0,
      mode: 'queue',
      t: 0,
    }
  }
  const m = r.monster
  fireShot(m, () => {
    if (e.kind === 'comment') {
      m.hp = Math.max(20, m.hp - 25)
      m.hitFlash = 1
      damageFloater(m, e.damage)
      sfxHit()
      return
    }
    dying.push(m)
    popMonster(m, e.xp)
    r.monster = null
    if (e.levelAfter > shownLevel) {
      shownLevel = e.levelAfter
      glowUntil = now + 1
      sfxLevel()
    }
    addFloater(m.x, GROUND_Y - 30, '🎁', '#000', 24, 0.7, {
      tx: 30,
      ty: 100,
      onEnd: () => {
        r.bag++
        sfxTick()
      },
    })
  })
}

function update(dt: number) {
  state.distance += dt * 2.5
  roadOffset = (roadOffset + dt * 90) % 60

  for (const mr of state.mrs) if (!monsters.has(mr.id)) monsters.set(mr.id, monsterFor(mr))
  slotUpdate(dt)

  for (const m of monsters.values()) m.hitFlash = Math.max(0, m.hitFlash - dt * 3)
  for (let i = dying.length - 1; i >= 0; i--) {
    const m = dying[i]
    m.t += dt
    m.hitFlash = Math.max(0, m.hitFlash - dt * 3)
    if (m.mode === 'fleeing') m.x += 450 * dt
    if (m.t > (m.mode === 'fleeing' ? 0.8 : 0.45) && m.mode !== 'queue') dying.splice(i, 1)
  }

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]
    const tx = p.target.x
    const ty = GROUND_Y - p.target.size / 2
    const dx = tx - p.x
    const dy = ty - p.y
    const dist = Math.hypot(dx, dy)
    const move = 1000 * dt
    if (dist <= move + 6) {
      projectiles.splice(i, 1)
      p.onHit()
    } else {
      p.x += (dx / dist) * move
      p.y += (dy / dist) * move
    }
  }

  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]
    f.t += dt
    if (f.t >= f.life) {
      floaters.splice(i, 1)
      f.onEnd?.()
    }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.t += dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 200 * dt
    if (p.t >= p.life) particles.splice(i, 1)
  }

  if (phase === 'idle') {
    idleShotTimer -= dt
    const front = [...monsters.values()].sort((a, b) => a.x - b.x)[0]
    if (idleShotTimer <= 0 && front && front.x < HERO_X + 400) {
      idleShotTimer = 2.2
      const dmg = state.gun.damage
      fireShot(front, () => {
        front.hitFlash = 1
        damageFloater(front, dmg)
      })
    }
  }

  if (replay) {
    const r = replay
    r.clock += dt
    if (r.index < r.events.length && r.clock >= r.nextAt) {
      playReplayEvent(r, r.events[r.index])
      r.index++
      r.nextAt += r.step
    } else if (r.index >= r.events.length && r.clock >= r.nextAt + 1.2) {
      replay = null
      r.onDone()
    }
  }
}

function emoji(text: string, x: number, y: number, size: number, alpha = 1) {
  ctx.globalAlpha = alpha
  ctx.font = `${size}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
  ctx.globalAlpha = 1
}

function label(text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'center') {
  ctx.font = `bold ${size}px system-ui, sans-serif`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

function drawMonster(m: Monster, withBar: boolean) {
  let scale = 1 + m.hitFlash * 0.2
  let alpha = 1
  if (m.mode === 'popping') {
    scale = 1 + m.t * 2.2
    alpha = Math.max(0, 1 - m.t / 0.45)
  } else if (m.mode === 'fleeing') {
    alpha = Math.max(0, 1 - m.t / 0.8)
  }
  const bob = Math.sin(now * 6 + m.id) * 2
  emoji(m.emoji, m.x, GROUND_Y - m.size / 2 + bob, m.size * scale, alpha)
  if (withBar && m.mode === 'queue') {
    const w = Math.max(30, m.size)
    const y = GROUND_Y - m.size - 12
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(m.x - w / 2, y, w, 5)
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(m.x - w / 2, y, (w * m.hp) / m.maxHp, 5)
  }
}

function draw() {
  const w = canvas.width
  const h = canvas.height
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
  sky.addColorStop(0, '#9edcff')
  sky.addColorStop(1, '#e6f6ff')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  emoji('☀️', w - 50, 30, 30)
  ctx.fillStyle = '#7bd88f'
  ctx.fillRect(0, GROUND_Y, w, 6)
  ctx.fillStyle = '#5b5f66'
  ctx.fillRect(0, GROUND_Y + 6, w, h - GROUND_Y - 6)
  ctx.fillStyle = '#e5e7eb'
  for (let x = -60 + roadOffset * -1 + 60; x < w; x += 60) ctx.fillRect(x, 160, 30, 4)

  const shownChests = Math.min(state.chests.length, CHEST_SHOWN_MAX)
  if (!chestsHidden && state.chests.length > 0) {
    for (let i = 0; i < shownChests; i++) {
      const c = state.chests[i]
      const age = now - c.bornAt
      const pop = clamp(age / 0.3, 0, 1)
      const shaking = now - c.shakeAt < 0.45
      const x = CHEST_X0 + i * CHEST_STEP + (shaking ? Math.sin(now * 60) * 3 : 0)
      emoji('🎁', x, GROUND_Y - 16, 28 * pop + (shaking ? 6 : 0))
      if (c.milestone) emoji('⭐', x + 8, GROUND_Y - 36, 14)
    }
    label(`Chests ×${state.chests.length}`, CHEST_X0 - 12, 62, 13, '#fff', 'left')
    if (phase !== 'focus' && phase !== 'return') label('click to open', CHEST_X0 - 12, 78, 10, '#fde68a', 'left')
  }
  if (replay) {
    emoji('🎒', 30, GROUND_Y - 22, 38)
    label(`×${replay.bag}`, 56, GROUND_Y - 4, 14, '#fff', 'left')
  }

  state.pets.forEach((pet, i) => {
    emoji(pet, HERO_X - 55 - i * 32 + Math.sin(now * 3 + i) * 3, 158 + Math.sin(now * 8 + i) * 3, 26)
  })

  const flash = now < heroFlashUntil
  if (flash) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 12)
    ctx.beginPath()
    ctx.arc(HERO_X + 10, GROUND_Y - 36, 50 + pulse * 8, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(250, 204, 21, ${0.25 + pulse * 0.2})`
    ctx.fill()
  }
  const heroSize = 52 + Math.min(state.level, 12) * 1.5
  const walkBob = Math.abs(Math.sin(now * 8)) * 4
  emoji('🧙', HERO_X, GROUND_Y - heroSize / 2 - walkBob, heroSize)
  const gunSize = 24 + Math.min(state.gun.damage, 50) * 0.3
  emoji('🔫', HERO_X + 36, GROUND_Y - 24 - walkBob, gunSize)
  label(`${state.gun.name} · ${state.gun.damage} dmg`, HERO_X, 142, 12, RARITY_COLOR[state.gun.rarity])

  const glowing = now < glowUntil
  const badgeY = 22
  ctx.save()
  if (glowing) {
    ctx.shadowColor = '#facc15'
    ctx.shadowBlur = 12 + 10 * Math.sin(now * 10)
  }
  ctx.fillStyle = glowing ? '#f59e0b' : '#4f46e5'
  ctx.beginPath()
  ctx.roundRect(HERO_X - 28, badgeY - 12, 56, 24, 12)
  ctx.fill()
  ctx.restore()
  label(`Lv ${shownLevel}`, HERO_X, badgeY, 14, '#fff')
  if (plusBanner) {
    if (now > plusBanner.until) plusBanner = null
    else label(plusBanner.text, HERO_X + 56, badgeY - 2 + Math.sin(now * 6) * 3, 26, '#fde047', 'left')
  }
  if (gunBanner) {
    if (now > gunBanner.until) gunBanner = null
    else label(gunBanner.text, HERO_X + 90, 60, 14, '#fde047', 'left')
  }

  for (const m of monsters.values()) drawMonster(m, true)
  for (const m of dying) drawMonster(m, false)
  if (replay?.monster) drawMonster(replay.monster, true)

  ctx.fillStyle = '#38bdf8'
  for (const p of projectiles) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
    ctx.fill()
  }
  for (const p of particles) emoji(p.text, p.x, p.y, p.size, 1 - p.t / p.life)
  for (const f of floaters) {
    const k = f.t / f.life
    const x = f.tx === undefined ? f.x : f.x + (f.tx - f.x) * k
    const y = f.ty === undefined ? f.y - 30 * k : f.y + (f.ty - f.y) * k
    ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1
    if (f.text === '🎁') emoji(f.text, x, y, f.size)
    else label(f.text, x, y, f.size, f.color)
    ctx.globalAlpha = 1
  }
}

let last = performance.now()
function frame(ts: number) {
  const dt = Math.min(0.05, (ts - last) / 1000)
  last = ts
  now = ts / 1000
  update(dt)
  draw()
  requestAnimationFrame(frame)
}

for (let i = 0; i < 5; i++) state.mrs.push(makeMr(false))
for (let i = 0; i < 2; i++) state.eggs.push(makeEgg())
resize()
render()
setInterval(() => {
  state.mrs.push(makeMr(true))
  renderPanel()
}, 20000)
setInterval(renderReadout, 400)
requestAnimationFrame(frame)
