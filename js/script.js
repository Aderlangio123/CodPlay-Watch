const RAW = [
  {id_entrega:301,transportadora:'RotaMax', regiao:'Sudeste',    prazo_dias:3, dias_reais:7},
  {id_entrega:302,transportadora:'ViaCargo',regiao:'Sul',        prazo_dias:5, dias_reais:5},
  {id_entrega:303,transportadora:'FlashLog',regiao:'Nordeste',   prazo_dias:4, dias_reais:9},
  {id_entrega:304,transportadora:'RotaMax', regiao:'Norte',      prazo_dias:6, dias_reais:4},
  {id_entrega:305,transportadora:'ViaCargo',regiao:'Centro-Oeste',prazo_dias:2,dias_reais:6},
  {id_entrega:306,transportadora:'FlashLog',regiao:'Sul',        prazo_dias:5, dias_reais:12},
  {id_entrega:307,transportadora:'RotaMax', regiao:'Sul',        prazo_dias:6, dias_reais:9},
  {id_entrega:308,transportadora:'ViaCargo',regiao:'Sudeste',    prazo_dias:3, dias_reais:4},
  {id_entrega:309,transportadora:'FlashLog',regiao:'Norte',      prazo_dias:5, dias_reais:5},
  {id_entrega:310,transportadora:'ViaCargo',regiao:'Nordeste',   prazo_dias:4, dias_reais:8},
];

// Enrich data
const data = RAW.map(d => ({
  ...d,
  delta: d.dias_reais - d.prazo_dias,
  atrasado: d.dias_reais > d.prazo_dias,
}));

// State
let statusFilter = 'todos';
let sortCol = 'delta';
let sortDir = 'desc';

function getFiltered(){
  const t = document.getElementById('f-transportadora').value;
  const r = document.getElementById('f-regiao').value;
  return data.filter(d => {
    if(t && d.transportadora !== t) return false;
    if(r && d.regiao !== r) return false;
    if(statusFilter === 'atrasado' && !d.atrasado) return false;
    if(statusFilter === 'ok' && d.atrasado) return false;
    return true;
  });
}

function setStatus(s, btn){
  statusFilter = s;
  document.querySelectorAll('.filter-bar button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

function resetFilters(){
  document.getElementById('f-transportadora').value = '';
  document.getElementById('f-regiao').value = '';
  statusFilter = 'todos';
  document.querySelectorAll('.filter-bar button').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-todos').classList.add('active');
  render();
}

function sortBy(col){
  if(sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  else { sortCol = col; sortDir = 'desc'; }
  render();
}

function pct(n,total){ return total ? Math.round(n/total*100) : 0; }

function render(){
  const fd = getFiltered();

  // --- KPIs ---
  const atrasadas = fd.filter(d => d.atrasado);
  const okItems   = fd.filter(d => !d.atrasado);
  const deltas    = atrasadas.map(d => d.delta);
  const mediaAtraso = deltas.length ? (deltas.reduce((a,b)=>a+b,0)/deltas.length).toFixed(1) : '—';
  const maxAtraso = deltas.length ? Math.max(...deltas) : null;
  const maxItem   = maxAtraso !== null ? atrasadas.find(d => d.delta === maxAtraso) : null;

  document.getElementById('k-total').textContent     = fd.length;
  document.getElementById('k-atrasadas').textContent = atrasadas.length;
  document.getElementById('k-atrasadas-pct').textContent = pct(atrasadas.length, fd.length) + '% do total';
  document.getElementById('k-ok').textContent        = okItems.length;
  document.getElementById('k-ok-pct').textContent    = pct(okItems.length, fd.length) + '% do total';
  document.getElementById('k-media').textContent     = mediaAtraso === '—' ? '—' : '+' + mediaAtraso + 'd';
  document.getElementById('k-max').textContent       = maxAtraso !== null ? '+' + maxAtraso + 'd' : '—';
  document.getElementById('k-max-sub').textContent   = maxItem ? 'entrega #' + maxItem.id_entrega : '—';

  // --- Chart: transportadoras ---
  const transportadoras = [...new Set(data.map(d=>d.transportadora))];
  const chartT = document.getElementById('chart-transp');
  chartT.innerHTML = '';
  const transpColors = ['#f97316','#ef4444','#a855f7'];
  transportadoras.forEach((t, i) => {
    const items  = fd.filter(d => d.transportadora === t);
    const late   = items.filter(d => d.atrasado).length;
    const taxPct = items.length ? Math.round(late/items.length*100) : 0;
    const col    = transpColors[i] || '#f97316';
    const row    = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <span class="label">${t}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${taxPct}%;--bar-col:${col}"></div></div>
      <span class="num">${taxPct}%</span>`;
    chartT.appendChild(row);
    
    if(items.length){
      const info = document.createElement('div');
      info.style.cssText='font-size:10px;color:var(--muted);margin-top:-6px;padding-left:120px;margin-bottom:2px;';
      info.textContent = `${late} de ${items.length} entrega${items.length>1?'s':''} atrasada${late!==1?'s':''}`;
      chartT.appendChild(info);
    }
  });
  if(!fd.length) chartT.innerHTML = '<div class="empty">Nenhum dado para exibir.</div>';

  // --- Chart: regiões ---
  const regioes = [...new Set(data.map(d=>d.regiao))];
  const chartR = document.getElementById('chart-regiao');
  chartR.innerHTML = '';
  regioes.forEach(reg => {
    const items = fd.filter(d => d.regiao === reg);
    const late  = items.filter(d => d.atrasado).length;
    const tax   = items.length ? Math.round(late/items.length*100) : 0;
    let cls = tax >= 80 ? 'danger' : tax >= 50 ? 'warn' : 'ok';
    const card = document.createElement('div');
    card.className = 'region-card';
    card.innerHTML = `
      <div class="rc-name">${reg}</div>
      <div class="rc-pct ${cls}">${items.length ? tax+'%' : '—'}</div>
      <div class="rc-sub">${late}/${items.length} atrasada${late!==1?'s':''}</div>`;
    chartR.appendChild(card);
  });

  // --- Weekly Volume Chart ---
  const weekly = document.getElementById('weekly-chart');
  const days = ['Seg','Ter','Qua','Qui','Sex','Sab','Dom'];
  const values = [4, 8, 5, 9, 12, 3, 2];
  weekly.innerHTML = days.map((d, i) => `
    <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:8px;">
        <div style="width:100%; background:var(--surface-alt); border-radius:4px; height:80px; display:flex; align-items:flex-end;">
            <div style="width:100%; height:${values[i]*6}%; background:var(--accent); border-radius:4px; opacity:0.8; transition: height 0.5s;"></div>
        </div>
        <span style="font-size:10px; color:var(--muted); font-family:var(--mono);">${d}</span>
    </div>
  `).join('');

  // --- Priority list ---
  const pl = document.getElementById('priority-list');
  pl.innerHTML = '';
  const atrasadasOrdered = [...fd].filter(d=>d.atrasado).sort((a,b)=>b.delta-a.delta);
  if(!atrasadasOrdered.length){
    pl.innerHTML = '<div class="empty">✓ Nenhuma entrega atrasada na seleção atual.</div>';
  } else {
    atrasadasOrdered.forEach((d, i) => {
      const cls = i===0 ? 'crit' : i===1 ? 'high' : 'med';
      const item = document.createElement('div');
      item.className = `priority-item ${cls}`;
      item.innerHTML = `
        <div class="priority-rank">${String(i+1).padStart(2,'0')}</div>
        <div class="priority-info">
          <strong>Entrega #${d.id_entrega} — ${d.transportadora}</strong>
          <small>${d.regiao} &nbsp;·&nbsp; prazo: ${d.prazo_dias}d &nbsp;·&nbsp; realizado: ${d.dias_reais}d</small>
        </div>
        <div class="priority-delta">+${d.delta}d</div>`;
      pl.appendChild(item);
    });
  }

  // --- Table ---
  const sorted = [...fd].sort((a,b) => {
    const va = a[sortCol], vb = b[sortCol];
    if(typeof va === 'string') return sortDir==='asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir==='asc' ? va-vb : vb-va;
  });

  const headers = ['id','transp','reg','prazo','real','delta'];
  const cols    = ['id_entrega','transportadora','regiao','prazo_dias','dias_reais','delta'];
  headers.forEach((h,i) => {
    const el = document.getElementById('th-'+h);
    if(el) {
      el.className = '';
      if(sortCol === cols[i]) el.className = sortDir==='asc'?'sort-asc':'sort-desc';
    }
  });

  document.getElementById('table-count').textContent = `(${sorted.length} registro${sorted.length!==1?'s':''})`;
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';
  if(!sorted.length){
    tbody.innerHTML = '<tr><td colspan="7" class="empty">Nenhuma entrega corresponde aos filtros.</td></tr>';
    return;
  }
  sorted.forEach(d => {
    const tr = document.createElement('tr');
    const deltaHtml = d.atrasado
      ? `<span class="delta-neg">+${d.delta}d</span>`
      : d.delta === 0
        ? `<span class="delta-ok">0d</span>`
        : `<span class="delta-ok">${d.delta}d</span>`;
    const badge = d.atrasado
      ? `<span class="badge atrasado">● Atrasado</span>`
      : `<span class="badge ok">✓ No prazo</span>`;
    tr.innerHTML = `
      <td style="font-family:var(--mono);color:var(--muted)">#${d.id_entrega}</td>
      <td style="font-weight:500">${d.transportadora}</td>
      <td>${d.regiao}</td>
      <td style="font-family:var(--mono)">${d.prazo_dias}d</td>
      <td style="font-family:var(--mono)">${d.dias_reais}d</td>
      <td>${deltaHtml}</td>
      <td>${badge}</td>`;
    tbody.appendChild(tr);
  });
}

// Theme functions
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
  const icon = document.getElementById('theme-icon');
  const btn = document.getElementById('theme-toggle');
  if (isDark) {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
    btn.setAttribute('aria-label', 'Ativar modo claro');
    btn.setAttribute('title', 'Ativar modo claro');
  } else {
    icon.innerHTML = '<path d="M12 7a5 5 0 100 10 5 5 0 000-10zM2 13h2a1 1 0 100-2H2a1 1 0 100 2zm18 0h2a1 1 0 100-2h2a1 1 0 100 2zM11 2v2a1 1 0 100 2V2a1 1 0 100-2zm0 18v2a1 1 0 100 2v-2a1 1 0 100-2zM5.99 4.58a1 1 0 111.41 1.41L5.99 4.58zm12.02 12.02a1 1 0 111.41 1.41l-1.41-1.41zM5.99 19.41a1 1 0 11-1.41-1.41l1.41 1.41zm12.02-14.83a1 1 0 11-1.41-1.41l1.41 1.41z"/>';
    btn.setAttribute('aria-label', 'Ativar modo escuro');
    btn.setAttribute('title', 'Ativar modo escuro');
  }
}

// Event listeners
document.getElementById('f-transportadora').addEventListener('change', render);
document.getElementById('f-regiao').addEventListener('change', render);
document.getElementById('last-update').textContent = new Date().toLocaleString('pt-BR',{timeStyle:'short',dateStyle:'short'});

// Theme initialization
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
  document.body.classList.add('dark-mode');
  updateThemeIcon(true);
}

// Initial render
render();