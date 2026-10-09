import * as Game from './game.js';
import { drawOceanChart } from './chart-art.js';

const { createGame, updateGame, act, getObjectives, getContext, serializeGame, deserializeGame,
  RECIPES, ISLANDS, SALVAGE_NODES, tideHeight } = Game;
const SAVE_KEY = 'tidekin.save.v2';
const SETTINGS_KEY = 'tidekin.settings.v1';
const HOME = Game.HOME ?? { x: 0, z: 0 };
const $ = id => document.getElementById(id);
const menu = $('main-menu');
const gameView = $('game-view');
const canvas = $('game-canvas');
const panelDialog = $('panel-dialog');
const modalDialog = $('modal-dialog');
const mapCanvas = $('navigation-map');
const mapContext = mapCanvas.getContext('2d');
function art(name, className = '') { return `<span class="game-art art-${name}${className ? ' '+className : ''}" aria-hidden="true"></span>`; }
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const positionOf = object => object.position ?? object;
const resourceNames = { wood: 'Wood', scrap: 'Scrap', pearls: 'Pearls' };
const regionNames = { home: 'Home Waters', ...Object.fromEntries(ISLANDS.map(i => [i.id, i.name])) };
const destinations = [{ id: 'home', name: 'Home anchorage', position: HOME,
  description: 'The sheltered waters where your voyage began.' }, ...ISLANDS];
let state = null;
let scene = null;
let scenePromise = null;
let loading = false;
let fatalError = false;
let modalKind = null;
let activePanel = null;
let settingsOrigin = 'menu';
let returnFocus = null;
let savedCandidate = null;
let hasStoredSave = false;
let saveWarningShown = false;
let lastTimestamp = null;
let lastHudUpdate = -Infinity;
let rafIntervals = [];
let renderedFrames = 0;
let trackedTarget = null;
let divePointer = {targetId:null,held:false};
let waterAudio = null;
let lastEventKey = null;
let toastTimer;
let saveBannerTimer;
let audioContext = null;
const keys = new Set();
const touchKeys = new Set();
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let settings = readSettings();

function readSettings() {
  const defaults = { quality: 'high', sound: true, reducedMotion: reducedMotionQuery.matches, largeText: false };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return defaults;
    return {
      quality: ['low', 'medium', 'high'].includes(saved.quality) ? saved.quality : defaults.quality,
      sound: typeof saved.sound === 'boolean' ? saved.sound : defaults.sound,
      largeText: typeof saved.largeText === 'boolean' ? saved.largeText : false,
      reducedMotion: typeof saved.reducedMotion === 'boolean' ? saved.reducedMotion : defaults.reducedMotion };
  } catch { return defaults; }
}

function applySettings() {
  document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
  document.documentElement.classList.toggle('large-text', settings.largeText);
  scene?.setQuality?.(settings.quality);
  scene?.setReducedMotion?.(settings.reducedMotion);
  if (!settings.sound && audioContext?.state === 'running') audioContext.suspend().catch(() => {});
}

function storeSettings() {
  applySettings();
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  catch { showToast('Settings apply now, but this browser could not save them.', true); }
}

function inspectSave() {
  savedCandidate = null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    hasStoredSave = Boolean(raw);
    if (raw) savedCandidate = deserializeGame(raw);
    $('menu-notice').textContent = '';
  } catch (error) {
    $('menu-notice').textContent = error?.code === 'INVALID_SAVE' || error?.message?.match(/save/i)
      ? 'The saved voyage could not be read. You can start fresh; it stays untouched until you confirm.'
      : 'This browser cannot access local saves. You can still set sail for this session.';
  }
  $('continue-voyage').hidden = !savedCandidate;
  $('continue-voyage').classList.toggle('button-primary', Boolean(savedCandidate));
  return savedCandidate;
}

function saveGame({ announce = false } = {}) {
  if (!state || loading || fatalError) return false;
  try {
    const text = serializeGame(state);
    localStorage.setItem(SAVE_KEY, text);
    savedCandidate = deserializeGame(text);
    const recovered = saveWarningShown;
    saveWarningShown = false;
    if (announce || recovered) savedBanner();
    return true;
  } catch {
    clearTimeout(saveBannerTimer);
    $('save-banner').classList.add('save-error');
    $('save-banner').setAttribute('role', 'alert');
    $('save-banner').firstElementChild.textContent = '!';
    $('save-banner-text').textContent = 'Not saved — retry Save in the pause menu';
    $('save-banner').hidden = false;
    if (!saveWarningShown) {
      showToast('Your voyage is running, but saving failed. Free browser storage, then try Save again in the pause menu.', true, 7000);
      saveWarningShown = true;
    }
    return false;
  }
}

function savedBanner() {
  clearTimeout(saveBannerTimer);
  $('save-banner').classList.remove('save-error');
  $('save-banner').setAttribute('role', 'status');
  $('save-banner').firstElementChild.textContent = '✓';
  $('save-banner-text').textContent = 'Voyage saved';
  $('save-banner').hidden = false;
  saveBannerTimer = setTimeout(() => { $('save-banner').hidden = true; }, 2200);
}

function showToast(message, error = false, duration = 3400) {
  clearTimeout(toastTimer);
  $('toast-text').textContent = message;
  $('toast').classList.toggle('error', error);
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, duration);
}

// Audio starts only in a real user gesture. Nothing is fetched from the network.
function unlockAudio(event) {
  if (!event.isTrusted || !settings.sound) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audioContext ||= new Audio();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    if(!waterAudio){
      const buffer=audioContext.createBuffer(1,audioContext.sampleRate*2,audioContext.sampleRate),data=buffer.getChannelData(0);
      let previous=0;for(let i=0;i<data.length;i++){previous=(previous+(Math.random()*2-1)*.025)/1.025;data[i]=previous;}
      const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
      source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=420;gain.gain.value=0;
      source.connect(filter);filter.connect(gain);gain.connect(audioContext.destination);source.start();waterAudio={source,filter,gain};
    }
  } catch { /* Sound is optional; gameplay remains available. */ }
}

function chime(kind = 'gather') {
  if (!settings.sound || audioContext?.state !== 'running') return;
  try {
    const tones = kind === 'build' || kind === 'claim' || kind === 'claim-expedition' ? [392, 523.25, 659.25] : kind === 'travel' ? [329.63, 493.88] : [523.25, 659.25];
    tones.forEach((frequency, i) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + i * .09;
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.028, start + .01);
      gain.gain.exponentialRampToValueAtTime(.0001, start + .38);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start); oscillator.stop(start + .4);
    });
  } catch { /* Optional sound never interrupts an action. */ }
}

function resetInput() { keys.clear(); touchKeys.clear(); drag = null; divePointer = {targetId:null,held:false}; lastTimestamp = null; }
function isPlaying() { return Boolean(state && scene && !loading && !fatalError && !gameView.hidden); }
function isPaused() { return !isPlaying() || panelDialog.open || modalDialog.open || document.hidden; }

function showModal(kind, content) {
  resetInput();
  if (!modalDialog.open) returnFocus = document.activeElement;
  modalKind = kind;
  $('modal-body').innerHTML = content;
  if (!modalDialog.open) modalDialog.showModal();
  const focusTarget = modalDialog.querySelector('[autofocus]') || modalDialog.querySelector('button, select, input');
  focusTarget?.focus({ preventScroll: true });
}

function closeModal({ focus = true } = {}) {
  modalKind = null;
  modalDialog.close();
  resetInput();
  if (focus) (isPlaying() ? canvas : returnFocus?.isConnected ? returnFocus : $('new-voyage')).focus({ preventScroll: true });
}

function closePanel({ focus = true } = {}) {
  $('navigation-card').hidden = true;
  $('hud').append($('navigation-card'));
  activePanel = null; delete panelDialog.dataset.panel;
  scene?.setView('follow');
  panelDialog.close();
  resetInput();
  if (focus && isPlaying()) canvas.focus({ preventScroll: true });
}

function modalTemplate(eyebrow, title, description, actions, ornament = '✦') {
  return `<div class="modal-content"><div class="modal-ornament" aria-hidden="true">${ornament}</div><p class="eyebrow">${eyebrow}</p><h2 id="modal-title">${title}</h2><p class="modal-description">${description}</p><div class="modal-actions">${actions}</div></div>`;
}

function requestNewVoyage() {
  if (loading) return;
  if (state || savedCandidate || hasStoredSave) {
    showModal('confirm-new', modalTemplate('A FRESH PAGE IN YOUR JOURNAL', 'A new beginning?',
      'Starting a new voyage will replace your saved progress, including upgrades, discoveries, and journal rewards. Your existing voyage stays safe until you choose to begin.',
      '<button class="button button-primary" data-modal-action="confirm-new" type="button">Begin a new voyage</button><button class="button button-secondary" data-modal-action="cancel-new" type="button" autofocus>Keep my voyage</button>'));
  } else { startGame(false); }
}

async function startGame(continueSave) {
  if (loading) return;
  let nextState;
  try {
    nextState = continueSave ? deserializeGame(localStorage.getItem(SAVE_KEY)) : createGame();
  } catch {
    inspectSave();
    showModal('invalid-save', modalTemplate('A NOTE FROM THE HARBOUR', 'That voyage needs a hand.',
      'This save could not be safely loaded. It has been kept in your browser. You can return to the menu or choose a new voyage.',
      '<button class="button button-primary" data-modal-action="menu" type="button">Back to the menu</button>'));
    return;
  }
  loading = true;
  resetInput();
  if (panelDialog.open) closePanel({ focus: false });
  showModal('loading', `<div class="modal-content"><div class="loading-wheel" aria-hidden="true"></div><p class="eyebrow">PACKING YOUR LITTLE WORKSHOP</p><h2 id="modal-title">The ocean is calling.</h2><p class="modal-description">Loading the workshop and islands. Your voyage will begin when everything is ready.</p><p class="loading-text" role="status">Preparing the 3D world…</p></div>`);
  try {
    // Keep one renderer for the whole app. createScene resolves after all GLBs load;
    // no update/render is called, and no save is replaced, before that promise resolves.
    scenePromise ||= import('./scene.js').then(module => module.createScene(canvas, {
      onReady: () => { const label = modalDialog.querySelector('.loading-text'); if (label) label.textContent = 'All aboard. Your workshop is ready.'; },
    }));
    scene = await scenePromise;
    state = nextState;
    lastCleanupStatus = null;
    fatalError = false;
    lastEventKey = state.lastEvent ? `${state.lastEvent.code}:${state.lastEvent.at}:${state.lastEvent.message}` : null;
    trackedTarget = null;
    rafIntervals = [];
    renderedFrames = 0;
    menu.hidden = true;
    gameView.hidden = false;
    loading = false;
    applySettings();
    scene.resize();
    scene.update(state, 0, { x: 0, z: 0 });
    closeModal({ focus: false });
    refreshHud(true);
    canvas.focus({ preventScroll: true });
    saveGame({ announce: false });
    scene.setView('follow');
  } catch (error) {
    loading = false;
    scenePromise = null;
    console.error('Tidekin world loading failed:', error);
    showModal('load-error', `<div class="modal-content"><div class="modal-ornament" aria-hidden="true">☸</div><p class="eyebrow">A NOTE FROM THE HARBOUR</p><h2 id="modal-title">The ocean couldn’t open.</h2><p class="modal-description">Tidekin needs WebGL and its workshop and island models. Check that hardware acceleration is enabled and the game assets have finished loading, then reload. Your previous save is still safe.</p><p class="error-detail">${escapeHTML(error?.message || 'The 3D world is unavailable.')}</p><div class="modal-actions"><button class="button button-primary" data-modal-action="reload" type="button">Reload Tidekin</button><button class="button button-secondary" data-modal-action="menu" type="button">Back to the menu</button></div></div>`);
  }
}

function showTutorial() {
  closeModal();
  state.guidance = {stage:0, skipped:false};
  refreshHud(true); saveGame();
}

function refreshGuide() {
  const g=state.guidance ?? (state.guidance={stage:0,skipped:true});
  const a=state.cleanup.attempt;
  const done=Object.keys(RECIPES).every(id=>state.upgrades[id]);
  $('voyage-guide').hidden=g.skipped || done;
  const context=getContext(state);
  const next=context.recipes.find(r=>!r.built&&(!r.requires||state.upgrades[r.requires]));
  const canBuild=Boolean(next?.available);
  let title='Sail toward floating supplies',cue='W/S · Sail   A/D · Turn';
  if(context.gatherTarget){title='Gather nearby supplies';cue='E · Gather';g.stage=Math.max(g.stage,1);}
  else if(state.collected.length&&!state.upgrades.waterwheel){title='Explore a reef';cue='W/S · Sail   Space · Dive';g.stage=Math.max(g.stage,2);}
  else if(state.upgrades.waterwheel){title='Explore beyond the shelter';cue='W/S · Sail   A/D · Turn   M · Map';}
  if(canBuild){title=`Make a ${next.name.toLowerCase()}`;cue='B · Open workshop';g.stage=Math.max(g.stage,3);}
  if(a){
    title=a.status==='complete'?'Reef restored':a.air<7?'Catch a breath':'Pull it free';
    cue=a.status==='complete'?'Space · Return to raft':a.air<7?'W · Rise to breathe':'WASD · Swim   Hold object to pull';
  }
  $('guide-icon').innerHTML=art(a?'reef':canBuild?next.id:'compass');
  setText('guide-title',title);setText('guide-text',cue);
  $('guide-action').hidden=Boolean(a)||(!canBuild&&!state.upgrades.waterwheel);
  setText('guide-action',canBuild?'Build · B':'Map · M');
  $('guide-action').dataset.guide=canBuild?'workshop':'chart';
}

function showPause() {
  if (!isPlaying() || loading || modalDialog.open) return;
  if (panelDialog.open) closePanel({focus:false});
  saveGame();
  showModal('pause', `<div class="modal-content">${art('settings')}<h2 id="modal-title">Paused</h2><div class="modal-actions"><button class="button button-primary" data-modal-action="play" autofocus>Resume</button><button class="button" data-modal-action="save">Save</button><button class="button" data-modal-action="settings">Settings</button><button class="button" data-modal-action="tutorial">Controls</button><button class="button" data-modal-action="menu">Save & quit</button></div></div>`);
}

function showSettings(origin = 'menu') {
  settingsOrigin=origin;
  showModal('settings', `<div class="modal-content">${art('settings')}<h2 id="modal-title">Settings</h2><div class="setting-row"><label for="quality-setting">Detail</label><select id="quality-setting"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>${[['sound','Sound'],['motion','Reduced motion'],['large-text','Larger text']].map(([id,label])=>`<div class="setting-row"><label for="${id}-setting">${label}</label><input id="${id}-setting" type="checkbox" role="switch"></div>`).join('')}<div class="modal-actions"><button class="button button-primary" data-modal-action="settings-done">Done</button></div></div>`);
  $('quality-setting').value=settings.quality;$('sound-setting').checked=settings.sound;
  $('motion-setting').checked=settings.reducedMotion;$('large-text-setting').checked=settings.largeText;
}

function returnToMenu() {
  if (isPlaying() && !saveGame({ announce: true })) {
    showModal('save-exit', modalTemplate('YOUR VOYAGE MATTERS', 'The save didn’t reach shore.',
      'Your progress is still here in this session, but the browser could not store it. You can keep playing and try saving again, or return to the title with this voyage kept in memory.',
      '<button class="button button-primary" data-modal-action="play" type="button" autofocus>Keep playing</button><button class="button button-secondary" data-modal-action="menu-anyway" type="button">Return to title</button>'));
    return;
  }
  enterMenu();
}

function enterMenu() {
  resetInput();
  if (panelDialog.open) closePanel({ focus: false });
  if (modalDialog.open) closeModal({ focus: false });
  gameView.hidden = true;
  menu.hidden = false;
  inspectSave();
  // If storage failed, the live voyage remains resumable without reloading.
  if (state && scene && !fatalError) {
    $('continue-voyage').hidden = false;
  }
  $('toast').hidden = true;
  $('continue-voyage').hidden ? $('new-voyage').focus() : $('continue-voyage').focus();
}

function resumeFromTitle() {
  if (state && scene && !fatalError) {
    menu.hidden = true; gameView.hidden = false; scene.resize(); resetInput(); refreshHud(true); canvas.focus();
  } else startGame(true);
}

function nearestNode({ availableOnly = false } = {}) {
  const candidates = SALVAGE_NODES.filter(node => !state.collected.includes(node.id)
    && (node.region === 'home' || state.upgrades[ISLANDS.find(i => i.id === node.region)?.requires])
    && (!availableOnly || !nodeBlock(node)));
  return candidates.sort((a, b) => distance(state.position, positionOf(a)) - distance(state.position, positionOf(b)))[0] ?? null;
}

function nodeBlock(node) { return !node || !getContext(state).nodes.find(n=>n.id===node.id)?.available; }

function contextNode(context) {
  // The domain owns permission; local navigation can still show a distant target.
  return context.gatherTarget ?? context.nearest ?? nearestNode();
}

function performAction(action, payload = {}) {
  if (!isPlaying()) return { ok: false, code: 'not_playing', message: 'Start or continue a voyage first.' };
  if(scene.getBuildPresentation?.().active)return {ok:false,code:'building',message:'Building'};
  const previous = structuredClone(state);
  let result;
  try { result = act(state, action, payload); }
  catch (error) { showToast('That action could not be completed. Your voyage is still here.', true); console.error(error); return { ok: false, code: 'action_error', message: error.message }; }
  scene.onAction?.(action, result, previous);
  if (result.ok) {
    if (['enter-cleanup', 'dive', 'leave-cleanup', 'retry-cleanup'].includes(action)) { resetInput(); scene.setView('follow'); }
    lastEventKey = state.lastEvent ? `${state.lastEvent.code}:${state.lastEvent.at}:${state.lastEvent.message}` : null;
    if(['enter-cleanup','dive','retry-cleanup','leave-cleanup'].includes(action)){$('toast').hidden=true;clearTimeout(toastTimer);}
    chime(action);
    if (action === 'start-expedition') {
      trackedTarget = 'expedition';
      if (panelDialog.open) closePanel();
    }
    if (action === 'abandon-expedition' || action === 'claim-expedition') {
      trackedTarget = null;
    }
    if (action === 'travel') {
      trackedTarget = action === 'travel' && state.region === 'home' ? null : trackedTarget;
      if (panelDialog.open) closePanel();
    }
    saveGame();
  }
  if(result.ok && action==='build') {
    if(panelDialog.open)closePanel();
    resetInput();
    showBuildPresentation();
    if(!scene.getBuildPresentation?.().active)showToast(`${RECIPES[payload.upgrade]?.name ?? 'Built'} · Ready`);
  } else if(!result.ok)showToast(result.message || 'Unavailable',true,2200);
  checkCleanupOutcome();
  refreshHud(true);
  if (activePanel) refreshPanel();
  return result;
}

function gatherNearest() {
  if (!isPlaying() || isPaused()) return;
  if (state.cleanup.attempt) return;
  const target = contextNode(getContext(state));
  performAction('gather', target ? { nodeId: target.id } : {});
}

function contextualDiveChoice(context = getContext(state), cleanup = Game.getCleanupContext(state)) {
  if (state.cleanup.attempt) return {action:'leave-cleanup', label:'Return to raft', disabled:!cleanup.atSurface && state.cleanup.attempt.status==='active'};
  const target=contextNode(context);
  const resourceDive=target?.inReach && ['dive_required','high_tide'].includes(target.reason);
  if (!resourceDive && cleanup.canEnter) return {action:'enter-cleanup', payload:{siteId:cleanup.site.id}, label:cleanup.completed?'Visit reef':'Dive · '+cleanup.site.name,disabled:false};
  return {action:'dive',label:context.diveSite?'Dive · '+context.diveSite.name:'Find a dive site',disabled:!context.canDive};
}

function toggleDive() {
  if (isPaused()) return;
  const choice = contextualDiveChoice();
  if (!choice.disabled) performAction(choice.action, choice.payload ?? {});
}
let lastCleanupStatus = null;
function checkCleanupOutcome() {
  const status = state.cleanup.attempt?.status ?? null;
  if (status === lastCleanupStatus) return;
  lastCleanupStatus = status;
  if (status === 'failed') {
    resetInput(); saveGame();
    // The modal pauses frames; publish the reset before HUD throttling can defer it.
    refreshHud(true);
    showModal('cleanup-failed', modalTemplate('', 'Out of breath.', 'This cleanup starts over. All trash has reset.', '<button class="button button-primary" data-modal-action="retry-cleanup">Retry cleanup</button><button class="button button-secondary" data-modal-action="leave-cleanup">Return to raft</button>', ''));
  }
}


function refreshHud(force = false) {
  if(!state)return;
  const now=performance.now();if(!force&&now-lastHudUpdate<200)return;lastHudUpdate=now;
  const context=getContext(state),cleanup=Game.getCleanupContext(state),a=state.cleanup.attempt;
  setText('region-name',a?cleanup.site.name:regionNames[state.region]??'Ocean');
  setText('day-label',`Day ${state.day}`);setText('tide-label',tideHeight(state)<=.35?'Low tide':'High tide');
  for(const id of ['tide-arrow','tide-forecast','context-title','context-hint','objective-description','oxygen-hint'])setText(id,'');
  for(const type of Object.keys(resourceNames))setText(`${type}-count`,Math.floor(state.inventory[type]).toLocaleString());
  setText('energy-label',Math.floor(state.energy));
  const q=getObjectives(state).find(q=>!q.claimed);
  setText('objective-name',q?.name??q?.title??'');
  $('objective-progress').max=Math.max(1,q?.target??1);$('objective-progress').value=q?.progress??0;
  setText('objective-fraction',q?`${Math.min(q.progress??0,q.target??1)}/${q.target??1}`:'');
  const available=a?cleanup.canCollect:context.nodes.find(n=>n.id===context.gatherTarget?.id)?.available;
  $('gather-button').hidden=!available || Boolean(a&&a.status!=='active');
  $('gather-button').disabled=!available;
  $('gather-button').title=a?'Hold to pull (E)':'Gather (E)';setText('gather-label',a?'Hold · Pull':'Gather');
  const choice=contextualDiveChoice(context,cleanup);$('dive-button').disabled=choice.disabled;
  setText('dive-label',a?'Return':'Dive');$('dive-button').title=a?'Return to raft':'Dive';
  gameView.classList.toggle('cleanup-mode',Boolean(a));
  document.querySelectorAll('.game-nav [data-panel]').forEach(b=>{b.disabled=Boolean(a);});
  document.querySelector('.touch-movement').hidden=false;
  $('dive-overlay').hidden=!a;
  $('dive-overlay').classList.toggle('low-oxygen',Boolean(a&&a.air<7));
  $('oxygen-progress').max=Game.CLEANUP_AIR;$('oxygen-progress').value=a?.air??Game.CLEANUP_AIR;
  setText('oxygen-label',a?`${cleanup.count}/${cleanup.total}`:'Air');
  setText('oxygen-seconds',`${Math.ceil(a?.air??Game.CLEANUP_AIR)}s`);
  updateNavigation();refreshGuide();
}

function setText(id, value) { if ($(id).textContent !== String(value)) $(id).textContent = value; }

function resourceTarget(type) {
  return SALVAGE_NODES.filter(node => node.type === type && !state.collected.includes(node.id)
    && (node.region === 'home' || state.upgrades[ISLANDS.find(i => i.id === node.region)?.requires]))
    .sort((a,b) => distance(state.position,a.position)-distance(state.position,b.position))[0];
}

function navigationTarget() {
  if (!trackedTarget) return null;
  if (trackedTarget.startsWith('cleanup:')) return {...Game.CLEANUP_SITES.find(s=>s.id===trackedTarget.slice(8)),kind:'cleanup'};
  const active = state.expeditions?.active;
  const expedition = Game.EXPEDITIONS?.find(r => r.id === active?.id);
  if (trackedTarget === 'expedition' && expedition) {
    if (active.ready) return { ...destinations[0], kind: 'home', name: 'Claim at home' };
    return { ...expedition.waypoints[active.index], id: `${active.id}:${active.index}`, kind: 'expedition', name: `${expedition.name} · ${active.index + 1}/${expedition.waypoints.length}`, underwater: expedition.kind === 'diving' };
  }
  if (trackedTarget?.startsWith('resource:')) {
    const node = resourceTarget(trackedTarget.slice(9));
    if (node) return { ...node, kind: 'salvage' };
  }
  if (trackedTarget === 'home') return { ...destinations[0], kind: 'home' };
  if (trackedTarget?.startsWith('region:')) return { ...destinations.find(i => i.id === trackedTarget.slice(7)), kind: 'destination' };
  const node = nearestNode();
  return node ? { ...node, kind: 'salvage' } : { ...destinations[0], kind: 'home' };
}

function updateNavigation() {
  const tracked = navigationTarget();
  const target = tracked ?? {...destinations[0],kind:'home'};
  const targetPosition = positionOf(target);
  const showBearing=Boolean(tracked && target.kind!=='salvage' && !state.cleanup.attempt);
  $('bearing').hidden=!showBearing;
  if(showBearing){
    const delta=Math.atan2(targetPosition.x-state.position.x,targetPosition.z-state.position.z)-state.heading;
    $('bearing-arrow').style.transform=`rotate(${-delta*180/Math.PI}deg)`;
    setText('bearing-label',target.name);
  }
  for(const id of ['navigation-name','navigation-distance','navigation-bearing','route-summary'])setText(id,'');
  $('route-options').hidden=true;
  $('track-expedition').hidden=!state.expeditions?.active;
  const guide=targetPosition;
  mapCanvas.setAttribute('aria-label','Ocean map: open shores, supplies and your raft');
  if (!mapContext || activePanel!=='chart') return;
  drawOceanChart(mapContext,state,{
    destinations,sites:Game.CLEANUP_SITES,nodes:SALVAGE_NODES,shoals:Game.SHOALS,
    target:tracked?targetPosition:null,
    expedition:Game.EXPEDITIONS.find(r=>r.id===state.expeditions?.active?.id),
  });
}


function openPanel(name) {
  if (!isPlaying() || loading || modalDialog.open) return;
  if (activePanel === name) { closePanel(); return; }
  if (state.cleanup.attempt || scene.getBuildPresentation?.().active) return;
  scene.setView(['cabin','workshop'].includes(name) ? name : 'inspect');
  scene.update(state, 0, {x:0,z:0});
  resetInput(); activePanel = name; panelDialog.dataset.panel=name;
  refreshPanel();
  if (!panelDialog.open) panelDialog.showModal();
  $('close-panel').focus({ preventScroll: true });
}

function refreshPanel() {
  if (!activePanel || !state) return;
  const body = $('panel-body');
  $('hud').append($('navigation-card')); $('navigation-card').hidden = true;
  const focusedId = body.contains(document.activeElement) ? document.activeElement.id : null;
  const scroll = body.scrollTop;
  const detailStates = new Map([...body.querySelectorAll('details[id]')].map(detail => [detail.id, detail.open]));
  const context = getContext(state);
  if (activePanel === 'cabin') {
    setText('panel-title', 'Cabin'); setText('panel-eyebrow', ''); body.innerHTML = renderCabin();
  } else if (activePanel === 'inspect') {
    setText('panel-title', 'Look around'); setText('panel-eyebrow', ''); body.innerHTML = renderInspection();
  } else if (activePanel === 'workshop') {
    setText('panel-title', 'The workshop'); setText('panel-eyebrow', '');
    body.innerHTML = renderWorkshop(context);
  } else if (activePanel === 'journal') {
    setText('panel-title', 'Your tide journal'); setText('panel-eyebrow', '');
    body.innerHTML = renderJournal();
  } else {
    setText('panel-title', 'The ocean chart'); setText('panel-eyebrow', '');
    body.innerHTML = renderChart(context);
  }
  if (activePanel === 'chart') { body.prepend($('navigation-card')); $('navigation-card').hidden = false; updateNavigation(); }
  for (const detail of body.querySelectorAll('details[id]')) {
    if (detailStates.has(detail.id)) detail.open = detailStates.get(detail.id);
  }
  body.scrollTop = scroll;
  if (focusedId) {
    const previous = $(focusedId);
    (previous && !previous.disabled ? previous : $('close-panel')).focus({ preventScroll: true });
  }
}

function renderWorkshop(context) {
  const id=Object.keys(RECIPES).find(id=>!state.upgrades[id]&&(!RECIPES[id].requires||state.upgrades[RECIPES[id].requires]));
  if(!id)return `<div class="workshop-plan">${art('beacon','plan-art')}<span class="badge">✓</span></div>`;
  const recipe=RECIPES[id],permission=context.recipes.find(r=>r.id===id);
  return `<article class="workshop-plan">${art(id,'plan-art')}<h3>${escapeHTML(recipe.name)}</h3><div class="cost-list">${Object.entries(recipe.cost).filter(([,n])=>n>0).map(([type,n])=>`<span class="material-cost ${state.inventory[type]<n?'missing':''}" aria-label="${n} ${resourceNames[type]}; ${state.inventory[type]} aboard">${art(type)}<span>${Math.floor(state.inventory[type])}/${n}</span></span>`).join('')}</div><button id="craft-${id}" class="button button-primary" data-game-action="build" data-id="${id}" ${permission?.available?'':'disabled'}>Build</button></article>`;
}
function renderInspection() {
  return `<div class="inspection-controls">${art('compass')}<button data-orbit="-80" aria-label="Rotate left">↶</button><button data-orbit="80" aria-label="Rotate right">↷</button><button data-zoom="-150" aria-label="Zoom in">+</button><button data-zoom="150" aria-label="Zoom out">−</button><button data-camera="follow">Follow</button></div>`;
}
function renderCabin() {
  return `<div class="cabin-scene">${art('cabin')}</div><div class="supply-row">${Object.entries(resourceNames).map(([id,name])=>`<span aria-label="${state.inventory[id]} ${name}">${art(id)}<strong>${state.inventory[id]}</strong></span>`).join('')}</div><div class="inspection-controls"><button data-open="chart" aria-label="Map">${art('map')}<span>Map</span></button><button data-open="journal" aria-label="Journal">${art('journal')}<span>Journal</span></button><button data-open="workshop" aria-label="Build">${art('waterwheel')}<span>Build</span></button></div>`;
}
function renderChart(context) {
  return `<div class="chart-destinations">${destinations.filter(d=>!d.requires||state.upgrades[d.requires]).map(d=>{
    const permission=context.destinations.find(item=>item.id===d.id);
    return `<article class="destination-card ${state.region===d.id?'current':''}">${art(d.id==='home'?'cabin':'reef')}<h3>${escapeHTML(d.name)}</h3><button id="track-${d.id}" data-track="${d.id}" class="button">Track</button>${permission?.available?`<button id="travel-${d.id}" data-game-action="travel" data-id="${d.id}" class="button">${d.id==='home'?'Return':'Travel'}</button>`:''}</article>`;
  }).join('')}</div>`;
}
function renderExpeditions() {
  if(!state.upgrades.waterwheel)return '';
  const c=Game.getExpeditionContext(state),active=c.active;
  const routes=active?c.routes.filter(r=>r.id===active.id):c.routes.filter(r=>r.available||state.expeditions.completed[r.id]);
  return routes.map(r=>`<article class="quest-card">${art(r.kind==='diving'?'reef':'compass')}<h3>${escapeHTML(r.name)}</h3><span class="badge">${state.expeditions.completed[r.id]}</span>${active?`<progress aria-label="${escapeHTML(r.name)} markers" max="${r.waypoints.length}" value="${active.index}"></progress>${active.ready?`<button class="button" data-game-action="claim-expedition" ${c.canClaim?'':'disabled'}>Claim</button>`:'<button class="button" data-follow-expedition>Track</button>'}<button class="button" data-game-action="abandon-expedition">Reset</button>`:r.available?`<button id="expedition-${r.id}" class="button" data-game-action="start-expedition" data-id="${r.id}">Start</button>`:''}</article>`).join('');
}
function renderJournal() {
  const all=getObjectives(state),current=all.find(q=>!q.claimed);
  const tasks={
    'first-salvage':['wood','Gather supplies'],
    'tide-power':['waterwheel','Build waterwheel'],
    'first-pearls':['pearls','Dive for pearls'],
    'salvage-workshop':['crane','Build crane'],
    'mangrove-visit':['map','Discover Mangrove'],
    'sea-garden':['greenhouse','Build greenhouse'],
    'set-sail':['sail','Build sail'],
    'charted-waters':['map','Discover all shores'],
    'guiding-light':['beacon','Build beacon'],
  };
  return `<div class="journal-stamps">${all.filter(q=>q.claimed||q===current||q.complete).map(q=>{
    const [illustration,name]=tasks[q.id]??['journal',q.title??q.name];
    const target=Math.max(1,q.target??1),progress=Math.min(q.progress??0,target);
    return `<article class="quest-card ${q.claimed?'claimed':''}">${art(illustration)}<h3>${escapeHTML(name)}</h3>${q.claimed?'<span class="badge" aria-label="Earned">✓</span>':`<progress max="${target}" value="${progress}" aria-label="${escapeHTML(name)} progress"></progress><span>${progress}/${target}</span>${q.complete?`<button id="claim-${q.id}" class="button" data-game-action="claim" data-id="${escapeHTML(q.id)}">Claim</button>`:''}`}</article>`;
  }).join('')}${state.cleanup.completed.map(id=>`<article class="quest-card claimed">${art('reef')}<h3>${escapeHTML(Game.CLEANUP_SITES.find(s=>s.id===id)?.name)}</h3><span class="badge" aria-label="Restored">✓</span></article>`).join('')}${renderExpeditions()}</div>`;
}
function showBuildPresentation() {
  let stamp=$('build-presentation');
  if(!stamp){stamp=document.createElement('div');stamp.id='build-presentation';stamp.setAttribute('role','status');stamp.setAttribute('aria-live','polite');gameView.append(stamp);}
  const presentation=scene?.getBuildPresentation?.();
  stamp.hidden=!presentation?.active;
  if(presentation?.active && stamp.dataset.build!==presentation.id){stamp.dataset.build=presentation.id;stamp.innerHTML=`${art(presentation.id??'waterwheel')}<span>${escapeHTML(RECIPES[presentation.id]?.name ?? 'Built')}</span>`;}
}

function movementInput() {
  let x = Number(keys.has('KeyD') || keys.has('ArrowRight') || touchKeys.has('right')) - Number(keys.has('KeyA') || keys.has('ArrowLeft') || touchKeys.has('left'));
  let z = Number(keys.has('KeyS') || keys.has('ArrowDown') || touchKeys.has('down')) - Number(keys.has('KeyW') || keys.has('ArrowUp') || touchKeys.has('up'));
  if(state.cleanup.attempt){
    const fallback=Game.getCleanupContext(state).target;
    return {x,z,interact:keys.has('KeyE')||(divePointer.held&&Boolean(divePointer.targetId)),targetId:keys.has('KeyE')?fallback?.id:divePointer.targetId};
  }
  return {x,z};
}

function frame(timestamp) {
  requestAnimationFrame(frame);
  if (!isPlaying()) { lastTimestamp = null; if(waterAudio&&audioContext?.state==='running')waterAudio.gain.gain.setTargetAtTime(0,audioContext.currentTime,.1); return; }
  const paused = isPaused();
  if(waterAudio && audioContext?.state==='running')waterAudio.gain.gain.setTargetAtTime(!paused&&state.cleanup.attempt&&settings.sound?.valueOf()? .18:0,audioContext.currentTime,.25);
  const interval = lastTimestamp === null ? null : timestamp - lastTimestamp;
  const visualDt=interval===null?0:Math.min(.05,Math.max(0,interval/1000));
  const dt=paused?0:visualDt;
  lastTimestamp=timestamp;
  try {
    if (!paused) {
      if (interval !== null && interval > 0) { rafIntervals.push(interval); if (rafIntervals.length > 600) rafIntervals.shift(); }
      // Simulation owns steering and discovery; the renderer only consumes state.
      const input = movementInput();
      const building=Boolean(scene.getBuildPresentation?.().active);
      if(!building){Game.steerGame(state,dt,input);updateGame(state,dt);}
      scene.update(state,dt,building?{x:0,z:0}:input);
      showBuildPresentation();
      renderedFrames++;
      const key = state.lastEvent ? `${state.lastEvent.code}:${state.lastEvent.at}:${state.lastEvent.message}` : null;
      if (key && key !== lastEventKey) {
        lastEventKey = key;
        if(['trash_collected','cleanup_complete'].includes(state.lastEvent.code))chime('gather');
        if (['rescued','cleanup_complete','salvage_complete','current_pushback','first_departure'].includes(state.lastEvent.code) || state.lastEvent.code.startsWith('expedition_')) { showToast(state.lastEvent.message, false, 6000); saveGame(); }
      }
      checkCleanupOutcome();
      refreshHud();
    }
    if(paused && scene.getBuildPresentation?.().active){scene.update(state,visualDt,{x:0,z:0});showBuildPresentation();}
  } catch (error) {
    fatalError = true;
    resetInput();
    console.error('Tidekin frame failed:', error);
    showModal('runtime-error', modalTemplate('A NOTE FROM THE HARBOUR', 'Let’s bring you safely home.',
      'The ocean stopped responding. Your last saved voyage is available after a reload.',
      '<button class="button button-primary" data-modal-action="reload" type="button">Reload Tidekin</button><button class="button button-secondary" data-modal-action="menu" type="button">Back to the menu</button>'));
  }
}

function getMetrics() {
  const sorted = [...rafIntervals].sort((a, b) => a - b);
  const percentile = p => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] : null;
  const median = percentile(.5), p95 = percentile(.95);
  return { ...scene?.getStats(), frameIntervalMsMedian: median, frameIntervalMsP95: p95,
    rafIntervalMsMedian: median, rafIntervalMsP95: p95, fpsFromMedianInterval: median ? 1000 / median : null,
    frameIntervalSamples: sorted.length, frameIntervalWindow: 600, activeRenderedFrames: renderedFrames,
    measurement: 'Actual requestAnimationFrame intervals during active play; renderer CPU timings are separate.',
    visibility: document.visibilityState, paused: isPaused(), quality: settings.quality,
    viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
  };
}

$('clear-track').addEventListener('click',()=>{trackedTarget=null;refreshHud(true);});
$('guide-skip').addEventListener('click',()=>{state.guidance.skipped=true;saveGame();refreshHud(true);});
$('guide-action').addEventListener('click',()=>{
  const action=$('guide-action').dataset.guide;
  if(action==='workshop'||action==='chart')openPanel(action);
  if(!panelDialog.open)canvas.focus();
});
$('new-voyage').addEventListener('click', requestNewVoyage);
$('continue-voyage').addEventListener('click', resumeFromTitle);
$('menu-settings').addEventListener('click', () => showSettings('menu'));
$('pause-button').addEventListener('click', () => showPause());
$('objective-journal').addEventListener('click', () => openPanel('journal'));
$('close-panel').addEventListener('click', () => closePanel());
$('gather-button').addEventListener('click', gatherNearest);
$('gather-button').addEventListener('pointerdown',e=>{if(state?.cleanup.attempt&&!isPaused()){keys.add('KeyE');e.currentTarget.setPointerCapture(e.pointerId);}});
for(const event of ['pointerup','pointercancel','lostpointercapture']) $('gather-button').addEventListener(event,()=>keys.delete('KeyE'));
$('dive-button').addEventListener('click', toggleDive);
$('track-nearest').addEventListener('click', () => { trackedTarget = 'nearest'; refreshHud(true); canvas.focus(); });
$('nav-track-home').addEventListener('click', () => { trackedTarget = 'home'; refreshHud(true); canvas.focus(); });
$('track-expedition').addEventListener('click', () => { trackedTarget = 'expedition'; refreshHud(true); canvas.focus(); });
document.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click', () => openPanel(button.dataset.panel)));

panelDialog.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.camera) {
    closePanel(); scene.setView('follow');
  }
  else if (button.dataset.zoom) { scene.zoom(Number(button.dataset.zoom)); scene.update(state,0,{x:0,z:0}); }
  else if (button.dataset.orbit) { scene.orbit(Number(button.dataset.orbit),0); scene.update(state,0,{x:0,z:0}); }
  else if (button.dataset.open) openPanel(button.dataset.open);
  else if (button.hasAttribute('data-follow-expedition')) {
    trackedTarget = 'expedition'; closePanel(); refreshHud(true);
  } else if (button.dataset.track) {
    trackedTarget = button.dataset.track === 'home' ? 'home' : `region:${button.dataset.track}`;
    closePanel(); refreshHud(true); showToast(`Following ${destinations.find(d => d.id === button.dataset.track)?.name}.`);
  } else if (button.dataset.gameAction) {
    const action = button.dataset.gameAction;
    performAction(action, { [action === 'build' ? 'upgrade' : action === 'travel' ? 'region' : 'id']: button.dataset.id });
  }
});
panelDialog.addEventListener('cancel', event => { event.preventDefault(); closePanel(); });
// Programmatic closes reset synchronously. Their queued close event must not
// erase a new movement key pressed immediately after the dialog disappears.
panelDialog.addEventListener('close', () => { if (!panelDialog.open && activePanel !== null) { activePanel = null; delete panelDialog.dataset.panel; resetInput(); } });

modalDialog.addEventListener('click', event => {
  const button = event.target.closest('[data-modal-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.modalAction;
  if (action === 'retry-cleanup' || action === 'leave-cleanup') { closeModal(); performAction(action); }
  else if (action === 'confirm-new') startGame(false);
  else if (action === 'cancel-new') {
    closeModal();
    if (!gameView.hidden) showPause();
  } else if (action === 'play') closeModal();
  else if (action === 'settings') showSettings('pause');
  else if (action === 'tutorial') showTutorial();
  else if (action === 'settings-done') {
    closeModal({ focus: settingsOrigin !== 'pause' });
    if (settingsOrigin === 'pause') showPause();
  } else if (action === 'save') {
    if (saveGame({ announce: true })) { button.textContent = '✓ Voyage saved'; showToast('Your voyage is safely saved.'); }
    else button.textContent = 'Try saving again';
  } else if (action === 'menu-anyway') enterMenu();
  else if (action === 'menu') returnToMenu();
  else if (action === 'reload') location.reload();
});

modalDialog.addEventListener('change', event => {
  if (modalKind !== 'settings') return;
  if (event.target.id === 'quality-setting') settings.quality = event.target.value;
  if (event.target.id === 'sound-setting') { settings.sound = event.target.checked; if (settings.sound) unlockAudio(event); }
  if (event.target.id === 'motion-setting') settings.reducedMotion = event.target.checked;
  if (event.target.id === 'large-text-setting') settings.largeText = event.target.checked;
  storeSettings();
});
modalDialog.addEventListener('cancel', event => {
  event.preventDefault();
  if (modalKind === 'loading' || modalKind === 'cleanup-failed') return;
  if (modalKind === 'settings' && settingsOrigin === 'pause') { closeModal({ focus: false }); showPause(); }
  else if (modalKind === 'load-error' || modalKind === 'runtime-error' || modalKind === 'invalid-save') enterMenu();
  else closeModal();
});
modalDialog.addEventListener('close', () => { if (!modalDialog.open && modalKind !== null) { modalKind = null; resetInput(); } });

document.addEventListener('keydown', event => {
  const typing = event.target instanceof Element && event.target.closest('input, select, textarea, [contenteditable="true"]');
  if (typing) return;
  if (event.code === 'Escape') {
    if (!isPlaying() || modalDialog.open || panelDialog.open) return;
    event.preventDefault(); showPause(); return;
  }
  if (!isPlaying() || modalDialog.open) return;
  const panels = { KeyB: 'workshop', KeyJ: 'journal', KeyM: 'chart', KeyI: 'inspect', KeyC: 'cabin' };
  if (panels[event.code]) { event.preventDefault(); if (!event.repeat) openPanel(panels[event.code]); return; }
  if (panelDialog.open) return;
  if (['Equal','Minus','NumpadAdd','NumpadSubtract','KeyQ','KeyR'].includes(event.code)) { event.preventDefault(); if (!state.cleanup.attempt) { if (event.code === 'KeyQ' || event.code === 'KeyR') scene.orbit(event.code === 'KeyQ' ? -40 : 40,0); else scene.zoom(['Equal','NumpadAdd'].includes(event.code) ? -100 : 100); } return; }
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
    event.preventDefault(); keys.add(event.code); return;
  }
  if (event.code === 'KeyE') { event.preventDefault(); keys.add(event.code); if (!event.repeat && !state.cleanup.attempt) gatherNearest(); }
  if (event.code === 'Space' && !(event.target instanceof Element && event.target.closest('button'))) { event.preventDefault(); if (!event.repeat) toggleDive(); }
});
document.addEventListener('keyup', event => { keys.delete(event.code); });
document.addEventListener('pointerdown', unlockAudio, { capture: true });
document.addEventListener('keydown', unlockAudio, { capture: true });
let drag = null;
canvas.addEventListener('pointerdown', event => {
  if (isPaused() || event.button !== 0) return;
  canvas.focus({preventScroll:true});
  if(state.cleanup.attempt){
    const pick=scene.pickCleanup?.(event.clientX,event.clientY);
    divePointer={targetId:pick?.trashId??null,held:true};
    canvas.setPointerCapture(event.pointerId); return;
  }
  drag = {x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false}; canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (isPaused()) return;
  if(state.cleanup.attempt){
    const pick=scene.pickCleanup?.(event.clientX,event.clientY);
    divePointer.targetId=pick?.trashId??null;
    canvas.style.cursor=pick?.trashId?'pointer':'default'; return;
  }
  if (!drag) { const station = state.cleanup.attempt ? null : scene.pickInteraction(event.clientX,event.clientY); canvas.style.cursor = station ? 'pointer' : 'grab'; canvas.title = station ? ({cabin:'Open cabin · C', workshop:'Open workbench · B', cleanup:'Snorkel · Space'}[station]) : 'Drag to orbit · Scroll to zoom'; return; }
  if (Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>5) drag.moved=true;
  if (drag.moved && !state.cleanup.attempt) scene.orbit(event.clientX-drag.x,event.clientY-drag.y);
  drag.x=event.clientX; drag.y=event.clientY;
});
canvas.addEventListener('pointerup', event => {
  divePointer.held=false;
  const clicked=drag && !drag.moved; drag=null;
  if (!clicked || isPaused() || state.cleanup.attempt) return;
  const station=scene.pickInteraction(event.clientX,event.clientY);
  if(station==='cabin'||station==='workshop') openPanel(station);
  else if(station==='cleanup'||station?.startsWith('cleanup:')) performAction('enter-cleanup',{siteId:station==='cleanup'?Game.getCleanupContext(state).site.id:station.slice(8)});
});
canvas.addEventListener('pointercancel',()=>{drag=null;divePointer.held=false;});
canvas.addEventListener('lostpointercapture',()=>{drag=null;divePointer.held=false;});
canvas.addEventListener('wheel',event=>{if(isPaused()||state.cleanup.attempt)return;event.preventDefault();scene.zoom(event.deltaY);},{passive:false});

document.querySelectorAll('[data-move]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    if (isPaused()) return;
    event.preventDefault(); touchKeys.add(button.dataset.move); button.setPointerCapture(event.pointerId);
  });
  const stop = () => touchKeys.delete(button.dataset.move);
  button.addEventListener('pointerup', stop); button.addEventListener('pointercancel', stop); button.addEventListener('lostpointercapture', stop);
});

function pauseForFocusLoss() {
  resetInput();
  if (isPlaying()) {
    if (!modalDialog.open && !panelDialog.open) showPause('Your voyage paused while you were away. Your oxygen and the tide are safe.');
    saveGame();
  }
}
window.addEventListener('blur', pauseForFocusLoss);
document.addEventListener('visibilitychange', () => { resetInput(); if (document.hidden) pauseForFocusLoss(); });
window.addEventListener('resize', () => { if (scene && !gameView.hidden) scene.resize(); });
window.addEventListener('pagehide', () => { saveGame(); resetInput(); });
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  saveGame(); fatalError = true; resetInput();
  showModal('runtime-error', modalTemplate('A NOTE FROM THE HARBOUR', 'The ocean needs a refresh.',
    'The browser lost its connection to the graphics card. Reload to restore your saved voyage.',
    '<button class="button button-primary" data-modal-action="reload" type="button">Reload Tidekin</button>'));
});
setInterval(() => { if (isPlaying()) saveGame(); }, 10000);

if (new URLSearchParams(location.search).get('qa') === '1') {
  window.__tidekin = Object.freeze({ getState: () => state ? structuredClone(state) : null,
    getMetrics, setCamera: () => scene.setView('follow'), action: (...args) => performAction(...args) });
}

inspectSave();
applySettings();
requestAnimationFrame(frame);
