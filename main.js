const main = document.getElementById('taxySlider');
const echo = document.getElementById('echoSlider');
const incomeValueEl = document.getElementById('incomeValue');
const taxOwedFill = document.getElementById('taxOwedFill');
const taxOwedIndicator = document.getElementById('taxOwedIndicator');
const taxOwedValue = document.getElementById('taxOwedValue');
const echoTicksContainer = document.querySelector('.echo-ticks');
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// Data-driven tax systems and palette
const baseColors = ['#2e7d32', '#1e88e5', '#ff9800', '#7b1fa2', '#fdd835', '#B54312', '#ff66b2', '#4caf50'];

const taxSystems = {
  Westopia: {
    displayName: 'Westopia',
    breaks: [0, 20000, 50000, 90000, 160000, 240000], // lower bounds
    rates: [0, 18, 28, 30, 36, 38], // one per bracket
    max: 300000
  },
  Australia: {
    displayName: 'Australia',
    breaks: [0, 18200, 45000, 135000, 190000],
    rates: [0, 16, 30, 37, 45],
    max: 300000
  }
  ,
  USA: {
    displayName: 'USA',
    breaks: [0, 11925, 48475, 103350, 197300, 250525, 626350],
    rates: [10, 12, 22, 24, 32, 35, 37],
    max: 700000
  }
};

let currentSystemKey = 'Westopia';
main.max = taxSystems[currentSystemKey].max;

// Main bar fill (bright blue, no dragger)
function updateMainBarFill() {
  const min = Number(main.min) || 0;
  const max = Number(main.max) || 1;
  const val = Math.min(Number(main.value), max);
  const pct = (val - min) / (max - min) * 100;
  let fill = main.parentElement.querySelector('.main-bar-fill');
  if (!fill) {
    fill = document.createElement('div');
    fill.className = 'main-bar-fill';
    Object.assign(fill.style, {
      position: 'absolute',
      left: '0',
      bottom: '0',
      width: '100%',
      borderRadius: '10px 10px 0 0',
      pointerEvents: 'none',
      zIndex: '1',
      background: 'linear-gradient(180deg, #1e90ff, #1e90ff)'
    });
    main.parentElement.style.position = 'relative';
    main.parentElement.appendChild(fill);
  }
  const wrapHeight = main.parentElement.getBoundingClientRect().height || 420;
  fill.style.height = `${Math.max((pct / 100) * wrapHeight, 1)}px`;
  fill.style.display = 'block';

  // Show "Click/Drag" text if less than 10% filled
  let dragText = main.parentElement.querySelector('.main-bar-drag-text');
  if (!dragText) {
    dragText = document.createElement('div');
    dragText.className = 'main-bar-drag-text';
    Object.assign(dragText.style, {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      color: 'rgba(180,180,180,0.5)',
      fontSize: '0.85em',
      fontStyle: 'italic',
      pointerEvents: 'none',
      zIndex: '2',
      fontWeight: '400',
      letterSpacing: '0.5px',
      whiteSpace: 'nowrap'
    });
    dragText.textContent = 'Click/Drag';
    main.parentElement.appendChild(dragText);
  }
  dragText.style.display = pct < 10 ? 'block' : 'none';
}

// Echo bar: colored segments and ticks/labels
function updateEchoBar() {
  const system = taxSystems[currentSystemKey];
  const min = Number(main.min) || 0;
  const max = Number(system.max) || Number(main.max) || 1;
  const val = Math.min(Number(main.value), max);
  const pctVal = (val - min) / (max - min) * 100;

  // choose a slice of baseColors that preserves ordering
  const colors = baseColors.slice(0, Math.max(1, system.breaks.length));

  // build gradient stops using breaks (open final bracket up to system.max)
  const stops = [];
  for (let i = 0; i < system.breaks.length; i++) {
    const startVal = system.breaks[i];
    const endVal = (i + 1 < system.breaks.length) ? system.breaks[i + 1] : max;
    const startPct = ((startVal - min) / (max - min)) * 100;
    const endPct = ((endVal - min) / (max - min)) * 100;
    const color = colors[i % colors.length];
    const unfilled = hexToRgba(color, 0.22);
    if (pctVal <= startPct) {
      stops.push(`${unfilled} ${startPct}%`, `${unfilled} ${endPct}%`);
    } else if (pctVal >= endPct) {
      stops.push(`${color} ${startPct}%`, `${color} ${endPct}%`);
    } else {
      stops.push(`${color} ${startPct}%`, `${color} ${pctVal}%`, `${unfilled} ${pctVal}%`, `${unfilled} ${endPct}%`);
    }
  }
  echo.style.background = `linear-gradient(to right, ${stops.join(', ')})`;
  echo.style.backgroundRepeat = 'no-repeat';
  echo.style.backgroundSize = '100% 100%';

  // ticks/labels: show each interior break (skip 0)
  echoTicksContainer.innerHTML = '';
  for (let i = 1; i < system.breaks.length; i++) {
    const value = system.breaks[i];
    const pct = ((value - min) / (max - min));
    const topPct = (1 - pct) * 100;
    const tickItem = document.createElement('div');
    tickItem.className = 'tick-item';
    tickItem.style.position = 'absolute';
    tickItem.style.right = '0';
    tickItem.style.top = `${topPct}%`;
    tickItem.style.display = 'flex';
    tickItem.style.alignItems = 'center';
    tickItem.style.gap = '12px';
    tickItem.innerHTML = `<div class="tick-label">${currency.format(value)}</div><div class="tick"></div>`;
    echoTicksContainer.appendChild(tickItem);
  }
}

// Helper for RGBA color
function hexToRgba(hex, alpha) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

// Tax table: only text colored, not background
function updateTaxTable() {
  const system = taxSystems[currentSystemKey];
  const income = Math.min(Number(main.value), Number(system.max));
  const tbody = document.getElementById('taxTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  let totalTax = 0;
  const colors = baseColors.slice(0, Math.max(1, system.breaks.length));
  // iterate each bracket (lower bound), final bracket upper = system.max
  for (let i = 0; i < system.breaks.length; i++) {
    const lower = system.breaks[i];
    const upper = (i + 1 < system.breaks.length) ? system.breaks[i + 1] : system.max;
    const rate = system.rates[i] ?? 0;
    const color = colors[i % colors.length];
    const taxableIncome = Math.max(0, Math.min(income, upper) - lower);
    const tax = Math.round(taxableIncome * (rate / 100));
    totalTax += tax;
    const tr = document.createElement('tr');
    const tdRate = document.createElement('td');
    tdRate.textContent = `${rate}%`;
    tdRate.style.color = color;
    const tdAmount = document.createElement('td');
    tdAmount.textContent = currency.format(tax);
    tdAmount.style.color = color;
    tr.appendChild(tdRate);
    tr.appendChild(tdAmount);
    tbody.appendChild(tr);
  }
  updateTaxOwedVisual(totalTax);
}

// Tax owed bar: label/value always visible, fill is instant
function updateTaxOwedVisual(totalTax) {
  const maxIncome = Math.max(1, Number(main.max));
  const pct = Math.max(0, Math.min(100, (totalTax / maxIncome) * 100));
  const wrapHeight = taxOwedFill.parentElement.getBoundingClientRect().height || 420;
  const fillHeightPx = Math.max((pct / 100) * wrapHeight, 1);
  taxOwedFill.style.height = `${fillHeightPx}px`;
  taxOwedFill.style.display = 'block';
  taxOwedFill.style.transition = 'none'; // Remove delay effect
  taxOwedIndicator.style.display = 'flex'; // Always visible
  taxOwedValue.textContent = currency.format(totalTax);
  taxOwedIndicator.style.position = 'absolute';
  taxOwedIndicator.style.left = '50%';
  taxOwedIndicator.style.transform = 'translateX(-50%)';
  taxOwedIndicator.style.bottom = `${fillHeightPx + 12}px`;
}

function synchronize() {
  incomeValueEl.textContent = currency.format(Number(main.value));
  incomeValueEl.style.color = '#2e7d32'; // Turn Total Income value green
  updateMainBarFill();
  updateEchoBar();
  updateTaxTable();
}

main.addEventListener('input', synchronize);

// Render radios and system switching
function renderSystemRadios() {
  const container = document.getElementById('systemSwitch');
  if (!container) return;
  container.innerHTML = '';
  Object.keys(taxSystems).forEach(key => {
    const id = `sys-${key}`;
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'taxSystem';
    input.value = key;
    input.id = id;
    input.checked = (key === currentSystemKey);
    input.addEventListener('change', () => applySystem(key));
    const text = document.createElement('span');
    text.textContent = taxSystems[key].displayName || key;
    label.appendChild(input);
    label.appendChild(text);
    container.appendChild(label);
  });
}

function applySystem(key) {
  if (!taxSystems[key]) return;
  currentSystemKey = key;
  const system = taxSystems[key];
  main.max = system.max;
  echo.max = system.max;
  // clamp current value
  if (Number(main.value) > system.max) main.value = system.max;
  // re-render everything
  synchronize();
}

// Initial setup
renderSystemRadios();
applySystem(currentSystemKey);