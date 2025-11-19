const main = document.getElementById('taxySlider');
const echo = document.getElementById('echoSlider');
const incomeValueEl = document.getElementById('incomeValue');
const taxOwedFill = document.getElementById('taxOwedFill');
const taxOwedIndicator = document.getElementById('taxOwedIndicator');
const taxOwedValue = document.getElementById('taxOwedValue');
const echoTicksContainer = document.querySelector('.echo-ticks');
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// Updated brackets and colors (including pink)
const brackets = [0, 20000, 50000, 90000, 160000, 240000, 300000];
const rates = [0, 18, 28, 30, 36, 38];
const colors = ['#2e7d32', '#B54312', '#ff9800', '#7b1fa2', '#fdd835', '#ff66b2'];

main.max = 300000;

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
  fill.style.display = pct > 0 ? 'block' : 'none';
}

// Echo bar: colored segments and ticks/labels
function updateEchoBar() {
  const min = Number(main.min) || 0;
  const max = Number(main.max) || 1;
  const val = Math.min(Number(main.value), max);
  const pctVal = (val - min) / (max - min) * 100;

  // Gradient for colored brackets
  const stops = [];
  for (let i = 0; i < brackets.length - 1; i++) {
    const startVal = brackets[i];
    const endVal = brackets[i + 1];
    const startPct = ((startVal - min) / (max - min)) * 100;
    const endPct = ((endVal - min) / (max - min)) * 100;
    const color = colors[i];
    const unfilled = hexToRgba(color, 0.2);
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

  // Dynamically create and position ticks/labels (no Infinity label)
  echoTicksContainer.innerHTML = '';
  for (let i = 1; i < brackets.length - 1; i++) { // skip 0, skip last (Infinity)
    const value = brackets[i];
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
  const income = Math.min(Number(main.value), Number(main.max));
  const tbody = document.getElementById('taxTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  let totalTax = 0;
  for (let i = 0; i < brackets.length - 1; i++) {
    const lower = brackets[i];
    const upper = brackets[i + 1];
    const rate = rates[i];
    const color = colors[i];
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

// Tax owed bar: label/value move above bar, spaced 12px from top
function updateTaxOwedVisual(totalTax) {
  const maxIncome = Math.max(1, Number(main.max));
  const pct = Math.max(0, Math.min(100, (totalTax / maxIncome) * 100));
  const wrapHeight = taxOwedFill.parentElement.getBoundingClientRect().height || 420;
  const fillHeightPx = Math.max((pct / 100) * wrapHeight, 1);
  taxOwedFill.style.height = `${fillHeightPx}px`;
  taxOwedFill.style.display = 'block';
  taxOwedValue.textContent = currency.format(totalTax);

  // Move indicator above the filled bar, spaced 12px from top
  taxOwedIndicator.style.display = totalTax > 0 ? 'flex' : 'none';
  taxOwedIndicator.style.position = 'absolute';
  taxOwedIndicator.style.left = '50%';
  taxOwedIndicator.style.transform = 'translateX(-50%)';
  taxOwedIndicator.style.bottom = `${fillHeightPx + 12}px`;
}

function synchronize() {
  incomeValueEl.textContent = currency.format(Number(main.value));
  updateMainBarFill();
  updateEchoBar();
  updateTaxTable();
}

main.addEventListener('input', synchronize);

// Initial render
synchronize();