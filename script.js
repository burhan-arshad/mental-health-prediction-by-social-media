'use strict';

/* ---------- Configuration ---------- */
const API_BASE = 'https://mental-health-prediction-by-social-media.onrender.com/';
const PREDICT_URL = `${API_BASE}/predict`;
const REQUEST_TIMEOUT_MS = 15000;
const HEALTH_INTERVAL_MS = 15000;

const PLATFORMS = ['Facebook', 'LinkedIn', 'Instagram', 'Snapchat', 'Twitter', 'YouTube', 'TikTok', 'LINE', 'KakaoTalk', 'VKontakte', 'WhatsApp', 'WeChat'];
// Names the backend groups explicitly come first; any other name is grouped as "Other" by the API.
const COUNTRIES = ['India', 'USA', 'Canada', 'Australia', 'UK', 'Germany', 'Mexico', 'Turkey', 'France',
  'Argentina', 'Bangladesh', 'Brazil', 'China', 'Egypt', 'Indonesia', 'Iran', 'Ireland', 'Italy', 'Japan', 'Kenya',
  'Malaysia', 'Nepal', 'Netherlands', 'New Zealand', 'Nigeria', 'Pakistan', 'Philippines', 'Poland', 'Russia',
  'Saudi Arabia', 'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland',
  'Thailand', 'UAE', 'Ukraine', 'Vietnam'];

// Field definitions: names match the FastAPI StudentData schema exactly.
const FIELDS = [
  { name: 'age', label: 'Age', type: 'int', min: 10, max: 100 },
  { name: 'gender', label: 'Gender', type: 'str' },
  { name: 'country', label: 'Country', type: 'str' },
  { name: 'academic_level', label: 'Academic level', type: 'str' },
  { name: 'most_used_platform', label: 'Most used platform', type: 'str' },
  { name: 'purpose_of_use', label: 'Purpose of use', type: 'str' },
  { name: 'avg_daily_usage_hours', label: 'Average daily usage', type: 'float', min: 0, max: 24, unit: 'hrs' },
  { name: 'daily_unlocks', label: 'Daily unlocks', type: 'int', min: 0, unit: 'times' },
  { name: 'study_hours', label: 'Study hours', type: 'float', min: 0, max: 24, unit: 'hrs' },
  { name: 'physical_activity_hours', label: 'Physical activity', type: 'float', min: 0, max: 24, unit: 'hrs' },
  { name: 'sleep_hours_per_night', label: 'Sleep per night', type: 'float', min: 0, max: 24, unit: 'hrs' },
  { name: 'stress_level', label: 'Stress level', type: 'str' }
];

/* ---------- Element references ---------- */
const $ = (id) => document.getElementById(id);
const form = $('assessmentForm');
const submitBtn = $('submitBtn');
const submitLabel = $('submitLabel');
const spinner = submitBtn.querySelector('.spinner');
const formError = $('formError');
const resultsSection = $('results');
const statusEl = $('connectionStatus');
const statusText = $('connectionText');
const navToggle = $('navToggle');
const navMenu = $('navMenu');
const gaugeFill = $('gaugeFill');
const GAUGE_LEN = 2 * Math.PI * 68;

let isSubmitting = false;
let lastScore = null;

/* ---------- Setup ---------- */
function populateOptions() {
  const platformSelect = $('most_used_platform');
  PLATFORMS.forEach((p) => platformSelect.append(new Option(p, p)));
  const list = $('countryList');
  COUNTRIES.forEach((c) => list.append(new Option(c, c)));
}

/* ---------- Connection status ---------- */
function setStatus(state, text) {
  statusEl.classList.remove('status--ok', 'status--bad', 'status--checking');
  statusEl.classList.add(`status--${state}`);
  statusText.textContent = text;
}

async function checkConnection() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${API_BASE}/`, { method: 'GET', signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setStatus('ok', 'Connected');
    return true;
  } catch (err) {
    setStatus('bad', 'Disconnected');
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- Validation ---------- */
function setFieldError(name, message) {
  const input = $(name);
  const errEl = $(`err-${name}`);
  const wrapper = input.closest('.field');
  if (errEl) errEl.textContent = message || '';
  wrapper.classList.toggle('field--invalid', Boolean(message));
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (errEl) input.setAttribute('aria-describedby', errEl.id);
}

function validateField(field) {
  const raw = $(field.name).value.trim();
  if (raw === '') return { error: `${field.label} is required.` };

  if (field.type === 'str') {
    if (field.name === 'country' && raw.toLowerCase() === 'other') {
      return { error: 'Type the name of your country instead of “Other”.' };
    }
    return { value: raw };
  }

  const num = Number(raw);
  if (!Number.isFinite(num)) return { error: `${field.label} must be a number.` };
  if (field.type === 'int' && !Number.isInteger(num)) return { error: `${field.label} must be a whole number.` };
  if (field.min !== undefined && num < field.min) return { error: `${field.label} must be at least ${field.min}.` };
  if (field.max !== undefined && num > field.max) return { error: `${field.label} must be ${field.max} or less.` };
  return { value: num };
}

function validateForm() {
  const payload = {};
  let firstInvalid = null;
  FIELDS.forEach((field) => {
    const { value, error } = validateField(field);
    setFieldError(field.name, error);
    if (error && !firstInvalid) firstInvalid = field.name;
    if (!error) payload[field.name] = value;
  });
  if (firstInvalid) {
    $(firstInvalid).focus();
    return null;
  }
  return payload;
}

/* ---------- Error display ---------- */
function showFormError(title, details = []) {
  formError.replaceChildren();
  const strong = document.createElement('strong');
  strong.textContent = title;
  formError.append(strong);
  if (details.length) {
    const ul = document.createElement('ul');
    details.forEach((d) => {
      const li = document.createElement('li');
      li.textContent = d;
      ul.append(li);
    });
    formError.append(ul);
  }
  formError.hidden = false;
  formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearFormError() {
  formError.hidden = true;
  formError.replaceChildren();
}

function parseValidationDetail(detail) {
  // FastAPI 422: detail is an array of { loc: ['body', field], msg, type }
  if (!Array.isArray(detail)) return [typeof detail === 'string' ? detail : 'The server rejected the submitted data.'];
  return detail.map((d) => {
    const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : 'input';
    const def = FIELDS.find((f) => f.name === field);
    if (def) setFieldError(field, d.msg);
    return `${def ? def.label : field}: ${d.msg}`;
  });
}

/* ---------- Loading state ---------- */
function setLoading(loading) {
  isSubmitting = loading;
  submitBtn.disabled = loading;
  $('resetBtn').disabled = loading;
  submitBtn.setAttribute('aria-busy', String(loading));
  spinner.hidden = !loading;
  submitLabel.textContent = loading ? 'Analyzing…' : 'Analyze My Wellness';
}

/* ---------- API call ---------- */
async function requestPrediction(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(PREDICT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    let body = null;
    try { body = await res.json(); } catch (_) { /* non-JSON body */ }

    if (res.status === 422) {
      const err = new Error('The server could not accept some values.');
      err.details = parseValidationDetail(body && body.detail);
      throw err;
    }
    if (!res.ok) {
      const err = new Error(`The server returned an error (HTTP ${res.status}).`);
      err.details = body && body.detail && typeof body.detail === 'string' ? [body.detail] : [];
      throw err;
    }

    const score = body ? body.predicted_mental_health : undefined;
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      const err = new Error('The server returned an unexpected response.');
      err.details = ['Expected a numeric “predicted_mental_health” value.'];
      throw err;
    }
    return score;
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('The request timed out.');
      e.details = ['The backend took too long to respond. Check that it is running and try again.'];
      throw e;
    }
    if (err instanceof TypeError) { // fetch network failure or CORS block
      const e = new Error('Could not reach the prediction API.');
      e.details = [
        `Make sure FastAPI is running at ${API_BASE}.`,
        'Open this page through a local server (http://localhost:5500), not by double-clicking the file.',
        'If the browser console mentions CORS, allow this page’s origin in the FastAPI CORS settings.'
      ];
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- Results ---------- */
function updateGauge() {
  const ref = parseFloat($('refMax').value);
  let fraction = 1; // no known scale: neutral full ring (not a percentage)
  if (Number.isFinite(ref) && ref > 0 && lastScore !== null) {
    fraction = Math.min(Math.max(lastScore / ref, 0), 1);
  }
  gaugeFill.style.strokeDasharray = GAUGE_LEN;
  gaugeFill.style.strokeDashoffset = GAUGE_LEN * (1 - fraction);
}

function renderResults(score, payload) {
  lastScore = score;
  const formatted = score.toFixed(2);
  $('scoreValue').textContent = formatted;
  $('scoreInline').textContent = formatted;
  $('resultAnnounce').textContent = `Assessment complete. The model returned ${formatted}.`;

  gaugeFill.style.strokeDasharray = GAUGE_LEN;
  gaugeFill.style.strokeDashoffset = GAUGE_LEN;
  requestAnimationFrame(() => requestAnimationFrame(updateGauge));

  const list = $('summaryList');
  list.replaceChildren();
  FIELDS.forEach((f) => {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = f.label;
    dd.textContent = f.unit ? `${payload[f.name]} ${f.unit}` : String(payload[f.name]);
    wrap.append(dt, dd);
    list.append(wrap);
  });

  resultsSection.hidden = false;
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  resultsSection.focus({ preventScroll: true });
}

/* ---------- Event handlers ---------- */
async function handleSubmit(event) {
  event.preventDefault();
  if (isSubmitting) return;
  clearFormError();

  const payload = validateForm();
  if (!payload) return;

  setLoading(true);
  try {
    const score = await requestPrediction(payload);
    setStatus('ok', 'Connected');
    renderResults(score, payload);
  } catch (err) {
    showFormError(err.message, err.details || []);
    checkConnection();
  } finally {
    setLoading(false);
  }
}

function resetAll() {
  form.reset();
  FIELDS.forEach((f) => setFieldError(f.name, ''));
  clearFormError();
}

function handleRetake() {
  resetAll();
  resultsSection.hidden = true;
  $('refMax').value = '';
  lastScore = null;
  $('assessment').scrollIntoView({ behavior: 'smooth' });
  $('age').focus({ preventScroll: true });
}

function closeNav() {
  navMenu.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
}

function init() {
  populateOptions();
  setStatus('checking', 'Checking…');
  checkConnection();
  setInterval(checkConnection, HEALTH_INTERVAL_MS);

  form.addEventListener('submit', handleSubmit);
  $('resetBtn').addEventListener('click', resetAll);
  $('retakeBtn').addEventListener('click', handleRetake);
  $('printBtn').addEventListener('click', () => window.print());
  $('refMax').addEventListener('input', updateGauge);

  // Clear a field's error as soon as the user edits it
  FIELDS.forEach((f) => {
    const el = $(f.name);
    el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') setFieldError(f.name, ''); });
    el.addEventListener('blur', () => { if (el.value.trim() !== '') setFieldError(f.name, validateField(f).error || ''); });
  });

  navToggle.addEventListener('click', () => {
    const open = navMenu.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  navMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeNav));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });

  // Smooth scrolling for in-page links (CSS scroll-behavior covers the rest)
  document.querySelectorAll('[data-scroll]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
