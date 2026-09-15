/**
 * MASS BUNKING CALCULATOR — CLIENT SCRIPT
 * High-interactivity frontend for calculating safe absenteeism.
 */

// --- DOM ELEMENTS ---
const inputAttended = document.getElementById('input-attended');
const inputTotal = document.getElementById('input-total');
const inputTarget = document.getElementById('input-target');
const inputTargetSlider = document.getElementById('input-target-slider');
const targetValBadge = document.getElementById('target-val-badge');
const presetPills = document.querySelectorAll('.preset-pill');

const resultCard = document.getElementById('result-card');
const bunkCountEl = document.getElementById('bunk-count');
const statusPillEl = document.getElementById('status-pill');
const percentageBadgeEl = document.getElementById('percentage-badge');
const punchlineTextEl = document.getElementById('punchline-text');
const reactionStampEl = document.getElementById('reaction-stamp');
const reactionEmojiEl = document.getElementById('reaction-emoji');
const reactionTitleEl = document.getElementById('reaction-title');

const meterFillEl = document.getElementById('meter-fill');
const meterTargetLineEl = document.getElementById('meter-target-line');
const meterRatioEl = document.getElementById('meter-ratio');

const errorBanner = document.getElementById('error-banner');
const errorMessage = document.getElementById('error-message');
const apiStatusText = document.getElementById('api-status-text');
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const randomTipText = document.getElementById('random-tip-text');
const hodQuoteText = document.getElementById('hod-quote');

const simBunkNextBtn = document.getElementById('sim-bunk-next');
const simAttendNextBtn = document.getElementById('sim-attend-next');
const simResetBtn = document.getElementById('sim-reset');

// Canvas Confetti
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');

// --- STATE ---
let debounceTimer = null;
let currentStatus = 'yellow';
let soundEnabled = true;
let isFirstCalculation = true;
let audioCtx = null;

// Baseline for reset
const BASELINE_STATE = { attended: 40, total: 50, target: 75 };

// --- HUMOROUS MICROCOPY REPOSITORY ---
const FUNNY_PUNCHLINES = {
  green: [
    "King behavior. You could literally sleep until next Tuesday and still make the cutoff.",
    "Academic immunity unlocked. Go binge that 3-season anime guilt-free.",
    "Safe as houses. Your attendance is healthier than your sleep schedule.",
    "Go grab that shawarma and chill. The professor won't even notice you're gone.",
    "Attendance so clean, the HOD might suspect you're secretly a faculty member."
  ],
  yellow: [
    "Walking on a razor blade. You're in the safe pocket, but one fever could ruin you.",
    "Calculated danger. You can bunk, but keep your excuses written and ready.",
    "Live by the bunk, die by the debar list. Proceed with extreme tactical caution.",
    "You have a tiny safety cushion. Treat it like gold — don't waste it on an 8 AM lab.",
    "Dangerously close to the debarred zone. Don't push your luck, soldier."
  ],
  red: [
    "PACK YOUR BAGS. You can't even blink during roll call without risking debarment!",
    "Debarred territory! Set 14 alarms tomorrow morning and sit in the front row.",
    "You are currently in attendance debt. The university is considering an audit.",
    "Emergency protocol: Beg your CR for proxy or start praying for extra credit.",
    "Attending class is no longer optional for you — it's community service."
  ]
};

const RANDOM_TIPS = [
  "\"Sleeping in the 4th row with a pencil in your hand is an art form.\"",
  "\"A fake cough before entering class establishes plausible deniability.\"",
  "\"Always sit behind the tallest student in your branch.\"",
  "\"If you never look the professor in the eye, you don't exist.\"",
  "\"The difference between a 74.9% and 75.0% is a box of donuts for the lab attendant.\"",
  "\"A mass bunk is only a mass bunk if everyone actually leaves. Don't be the traitor who stays.\""
];

const HOD_QUOTES = [
  "\"Attendance isn't just a number... wait, actually it is just a number.\"",
  "\"I can smell proxies from three lecture halls away.\"",
  "\"Your medical certificate looks like it was drawn in MS Paint.\"",
  "\"You missed 12 classes to 'find yourself'? Find yourself in the supplementary exam.\"",
  "\"Back in my day, we attended 100% of classes in 45°C weather without AC!\""
];

// --- AUDIO SYNTHESIZER (WEB AUDIO API) ---
function playTone(freq, type = 'sine', duration = 0.08) {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Silently handle autoplay / permissions policy
  }
}

function playSuccessChime() {
  if (!soundEnabled) return;
  playTone(523.25, 'triangle', 0.1); // C5
  setTimeout(() => playTone(659.25, 'triangle', 0.1), 80); // E5
  setTimeout(() => playTone(783.99, 'triangle', 0.18), 160); // G5
}

function playWarningThud() {
  if (!soundEnabled) return;
  playTone(220, 'sawtooth', 0.15);
  setTimeout(() => playTone(180, 'sawtooth', 0.2), 100);
}

// --- CONFETTI PARTICLE SYSTEM ---
let confettiParticles = [];
let animationFrameId = null;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class ConfettiPiece {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = -20 - Math.random() * 40;
    this.size = 8 + Math.random() * 8;
    this.speedX = (Math.random() - 0.5) * 6;
    this.speedY = 3 + Math.random() * 5;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 8;
    const colors = ['#FFE14D', '#FF5E36', '#22C55E', '#38BDF8', '#F472B6', '#18181B'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.isCircle = Math.random() > 0.6;
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.rotation += this.rotationSpeed;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 1.5;

    if (this.isCircle) {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.7);
      ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.7);
    }
    ctx.restore();
  }
}

function launchConfettiBurst(count = 70) {
  for (let i = 0; i < count; i++) {
    confettiParticles.push(new ConfettiPiece());
  }
  if (!animationFrameId) {
    animateConfetti();
  }
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  confettiParticles.forEach(p => {
    p.update();
    p.draw();
  });
  // Filter out off-screen particles
  confettiParticles = confettiParticles.filter(p => p.y < canvas.height + 40);

  if (confettiParticles.length > 0) {
    animationFrameId = requestAnimationFrame(animateConfetti);
  } else {
    animationFrameId = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// --- RANDOM QUOTE HELPERS ---
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rotateTips() {
  if (randomTipText) randomTipText.textContent = pickRandom(RANDOM_TIPS);
  if (hodQuoteText) hodQuoteText.textContent = pickRandom(HOD_QUOTES);
}

// --- CLIENT-SIDE CALCULATION FALLBACK ---
function localCalculate(attended, total, target) {
  if (total <= 0 || target <= 0) return { can_bunk: 0, status: 'red' };
  
  const exact_n = (attended / (target / 100)) - total;
  const can_bunk = Math.max(Math.floor(exact_n), 0);
  
  const current_percent = (attended / total) * 100;
  let status = 'green';
  if (current_percent < target) {
    status = 'red';
  } else if (current_percent < target + 10) {
    status = 'yellow';
  } else {
    status = 'green';
  }
  return { can_bunk, status };
}

// --- CORE CALCULATION DISPATCHER ---
async function fetchCalculation(attended, total, target) {
  apiStatusText.textContent = 'Calling backend...';
  
  // Choose endpoint: relative '/calculate' if served from same origin, or fallback to full localhost URL
  const endpoint = window.location.origin.includes('127.0.0.1:5000') || window.location.origin.includes('localhost:5000')
    ? '/calculate'
    : 'http://127.0.0.1:5000/calculate';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attended, total, target }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    apiStatusText.textContent = '● Backend synced';
    return data;
  } catch (err) {
    // Graceful offline fallback
    console.warn('[Mass Bunking] Backend request failed or timed out, using client-side fallback:', err.message);
    apiStatusText.textContent = '● Client-side math active';
    return localCalculate(attended, total, target);
  }
}

// --- UI UPDATE CONTROLLER ---
async function triggerCalculation() {
  const attended = parseInt(inputAttended.value, 10);
  const total = parseInt(inputTotal.value, 10);
  const target = parseInt(inputTarget.value, 10);

  // Validate inputs
  if (isNaN(attended) || isNaN(total) || isNaN(target)) {
    return;
  }

  // Sanity check: Attended > Total
  if (attended > total) {
    errorBanner.classList.remove('hidden');
    errorMessage.textContent = `Bro attended ${attended} out of ${total} classes? Multiverse physics detected! (Attended cannot exceed Total)`;
    resultCard.classList.remove('status-green', 'status-yellow');
    resultCard.classList.add('status-red');
    bunkCountEl.textContent = '0';
    statusPillEl.textContent = '❌ INVALID INPUT';
    percentageBadgeEl.textContent = `Error!`;
    punchlineTextEl.textContent = 'Fix your numbers above before your professor finds out you can break the spacetime continuum.';
    reactionEmojiEl.textContent = '🛸';
    reactionTitleEl.textContent = 'TIME TRAVEL';
    return;
  }

  // Sanity check: Total === 0
  if (total === 0) {
    errorBanner.classList.remove('hidden');
    errorMessage.textContent = "Total classes is 0! Semester hasn't started yet. Go back to sleep 💤";
    return;
  }

  // Clear errors
  errorBanner.classList.add('hidden');

  // Calculate current percentage
  const currentPct = ((attended / total) * 100);
  percentageBadgeEl.textContent = `Current: ${currentPct.toFixed(1)}%`;
  meterRatioEl.textContent = `${attended} / ${total} attended`;

  // Update visual progress meter
  const meterWidth = Math.min(Math.max(currentPct, 0), 100);
  meterFillEl.style.width = `${meterWidth}%`;
  meterTargetLineEl.style.left = `${Math.min(Math.max(target, 0), 100)}%`;

  // Fetch / Calculate results
  const result = await fetchCalculation(attended, total, target);
  const canBunk = result.can_bunk;
  const newStatus = result.status;

  // Update big number
  bunkCountEl.textContent = canBunk;

  // Update reaction stamp and status pill
  if (newStatus === 'green') {
    statusPillEl.textContent = '🟢 SAFE HAVEN (BUNKER PRO)';
    reactionEmojiEl.textContent = '🏖️';
    reactionTitleEl.textContent = 'CHILL ZONE';
    
    // Confetti on green (or if transitioning into green)
    if (currentStatus !== 'green' && !isFirstCalculation) {
      launchConfettiBurst(80);
      playSuccessChime();
    }
  } else if (newStatus === 'yellow') {
    statusPillEl.textContent = '🟡 WALKING THE TIGHTROPE';
    reactionEmojiEl.textContent = '🎲';
    reactionTitleEl.textContent = 'RISK TAKER';
  } else if (newStatus === 'red') {
    statusPillEl.textContent = '🔴 ACADEMIC EMERGENCY';
    reactionEmojiEl.textContent = '🚨';
    reactionTitleEl.textContent = 'DEBARRED';

    // Calculate how many consecutive classes needed to climb back to target
    // target/100 = (attended + x) / (total + x) => x = ceil((target*total - 100*attended)/(100 - target))
    if (target < 100) {
      const classesNeeded = Math.ceil(((target / 100) * total - attended) / (1 - (target / 100)));
      if (classesNeeded > 0) {
        reactionTitleEl.textContent = `ATTEND +${classesNeeded}`;
      }
    }

    // Retrigger shake animation
    if (currentStatus !== 'red' && !isFirstCalculation) {
      resultCard.classList.remove('status-red');
      void resultCard.offsetWidth; // force reflow
      playWarningThud();
    }
  }

  // Update punchline text
  punchlineTextEl.textContent = pickRandom(FUNNY_PUNCHLINES[newStatus]);

  // Update card color classes
  resultCard.classList.remove('status-green', 'status-yellow', 'status-red');
  resultCard.classList.add(`status-${newStatus}`);

  currentStatus = newStatus;
  isFirstCalculation = false;
}

// --- DEBOUNCED INPUT HANDLER ---
function scheduleCalculation() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    triggerCalculation();
  }, 300);
}

// --- STEPPER BUTTONS & CHIPS ---
function bindControls() {
  // Stepper Plus & Minus Buttons
  document.querySelectorAll('.stepper-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = btn.getAttribute('data-target');
      const step = parseInt(btn.getAttribute('data-step'), 10);
      const input = document.getElementById(targetId);
      if (!input) return;

      const min = parseInt(input.min, 10) || 0;
      const max = parseInt(input.max, 10) || 500;
      let val = (parseInt(input.value, 10) || 0) + step;
      val = Math.max(min, Math.min(max, val));

      input.value = val;
      playTone(step > 0 ? 440 : 330, 'sine', 0.05);
      scheduleCalculation();
    });
  });

  // Quick Chips (+1, +5, +10)
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const targetId = chip.getAttribute('data-target');
      const add = parseInt(chip.getAttribute('data-add'), 10);
      const input = document.getElementById(targetId);
      if (!input) return;

      let val = (parseInt(input.value, 10) || 0) + add;
      input.value = val;
      playTone(500, 'sine', 0.04);
      scheduleCalculation();
    });
  });

  // Target Slider & Presets
  inputTargetSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    inputTarget.value = val;
    targetValBadge.textContent = `${val}%`;

    // Highlight matching preset if any
    presetPills.forEach(pill => {
      if (parseInt(pill.getAttribute('data-target-val'), 10) === val) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    scheduleCalculation();
  });

  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      presetPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const val = parseInt(pill.getAttribute('data-target-val'), 10);
      inputTarget.value = val;
      inputTargetSlider.value = val;
      targetValBadge.textContent = `${val}%`;
      playTone(587.33, 'triangle', 0.06);
      scheduleCalculation();
    });
  });

  // Live typing on inputs
  [inputAttended, inputTotal].forEach(input => {
    input.addEventListener('input', scheduleCalculation);
    input.addEventListener('change', triggerCalculation);
  });

  // Sound Toggle
  soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    const label = soundToggleBtn.querySelector('.sound-label');
    const icon = soundToggleBtn.querySelector('.sound-icon');
    if (soundEnabled) {
      label.textContent = 'Bleeps: ON';
      icon.textContent = '🔊';
      playTone(600, 'sine', 0.08);
    } else {
      label.textContent = 'Bleeps: MUTED';
      icon.textContent = '🔇';
    }
  });

  // Scenario Simulator Buttons
  simBunkNextBtn.addEventListener('click', () => {
    // Total + 1, Attended same
    inputTotal.value = (parseInt(inputTotal.value, 10) || 0) + 1;
    playTone(293.66, 'sawtooth', 0.08);
    triggerCalculation();
  });

  simAttendNextBtn.addEventListener('click', () => {
    // Total + 1, Attended + 1
    inputTotal.value = (parseInt(inputTotal.value, 10) || 0) + 1;
    inputAttended.value = (parseInt(inputAttended.value, 10) || 0) + 1;
    playTone(659.25, 'triangle', 0.08);
    triggerCalculation();
  });

  simResetBtn.addEventListener('click', () => {
    inputAttended.value = BASELINE_STATE.attended;
    inputTotal.value = BASELINE_STATE.total;
    inputTarget.value = BASELINE_STATE.target;
    inputTargetSlider.value = BASELINE_STATE.target;
    targetValBadge.textContent = `${BASELINE_STATE.target}%`;
    presetPills.forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-target-val') === '75');
    });
    playTone(440, 'sine', 0.06);
    rotateTips();
    triggerCalculation();
  });

  // Rotate tips periodically
  setInterval(rotateTips, 12000);
}

// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', () => {
  bindControls();
  rotateTips();
  triggerCalculation();
});
