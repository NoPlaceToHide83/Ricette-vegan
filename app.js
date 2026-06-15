
let recipes = [];
const $ = id => document.getElementById(id);

function norm(s){return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function uniq(arr){return [...new Set(arr.filter(Boolean))].sort();}

async function load(){
  recipes = await fetch('ricette_master.json').then(r=>r.json());
  fillSelect('portata', uniq(recipes.map(r=>r.portata || r.categoria)));
  fillSelect('metodo', uniq(recipes.map(r=>r.metodo_cottura)));
  fillSelect('stagione', uniq(recipes.map(r=>r.stagione)));
  bind();
  render();
}

function fillSelect(id, values){
  const el = $(id);
  values.forEach(v => {
    const o = document.createElement('option');
    o.value = v; o.textContent = v;
    el.appendChild(o);
  });
}

function bind(){
  ['q','portata','metodo','stagione','tempo','senzaGlutine','senzaSoia','senzaFruttaSecca','proteica','legumi','carbo'].forEach(id=>{
    $(id).addEventListener('input', render);
    $(id).addEventListener('change', render);
  });
  $('reset').onclick = () => {
    ['q','portata','metodo','stagione','tempo'].forEach(id=>$(id).value='');
    ['senzaGlutine','senzaSoia','senzaFruttaSecca','proteica','legumi','carbo'].forEach(id=>$(id).checked=false);
    render();
  };
  $('close').onclick = () => $('detail').close();
}

function matchQuery(r, q){
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if(!terms.length) return true;
  const hay = norm([r.titolo,r.ingredienti,r.categoria,r.portata,r.tag_ricerca,r.search_text].join(' '));
  return terms.every(t => hay.includes(t)); // AND
}

function filtered(){
  const q = $('q').value;
  const portata = $('portata').value;
  const metodo = $('metodo').value;
  const stagione = $('stagione').value;
  const tempo = $('tempo').value ? Number($('tempo').value) : null;

  return recipes.filter(r => {
    if(!matchQuery(r,q)) return false;
    if(portata && (r.portata || r.categoria) !== portata) return false;
    if(metodo && r.metodo_cottura !== metodo) return false;
    if(stagione && r.stagione !== stagione) return false;
    if(tempo && (!r.tempo_minuti || Number(r.tempo_minuti) > tempo)) return false;
    if($('senzaGlutine').checked && r.senza_glutine !== 'SI') return false;
    if($('senzaSoia').checked && r.soia !== 'NO') return false;
    if($('senzaFruttaSecca').checked && r.frutta_secca !== 'NO') return false;
    if($('proteica').checked && r.proteica !== 'SI') return false;
    if($('legumi').checked && r.legumi !== 'SI') return false;
    if($('carbo').checked && r.carboidrati !== 'SI') return false;
    return true;
  });
}

function render(){
  const list = filtered();
  $('count').textContent = `${list.length} ricette trovate`;
  const root = $('results');
  root.innerHTML = '';
  list.slice(0,300).forEach(r => {
    const card = document.createElement('article');
    card.className = 'card';
    const tags = (r.tag_ricerca||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,6);
    card.innerHTML = `
      <h3>${escapeHtml(r.titolo || 'Senza titolo')}</h3>
      <div class="meta">${escapeHtml(r.portata || r.categoria || '')} · ${escapeHtml(r.tempo_totale || '')} · pag. ${escapeHtml(r.pagina || '')}</div>
      <div class="ingredients">${escapeHtml(r.ingredienti || '')}</div>
      <div class="tags">${tags.map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
    `;
    card.onclick = () => openDetail(r);
    root.appendChild(card);
  });
}

function openDetail(r){
  $('detailBody').innerHTML = `
    <h2>${escapeHtml(r.titolo || 'Senza titolo')}</h2>
    <p class="source"><strong>Origine:</strong> ${escapeHtml(r.file_pdf || '')} · pagina ${escapeHtml(r.pagina || '')} · MAG ${escapeHtml(r.numero_mag || '')}</p>
    <p><strong>Categoria:</strong> ${escapeHtml(r.portata || r.categoria || '')} · <strong>Tempo:</strong> ${escapeHtml(r.tempo_totale || '')} · <strong>Difficoltà:</strong> ${escapeHtml(r.difficolta || '')}</p>
    <p><strong>Tag:</strong> ${escapeHtml(r.tag_ricerca || '')}</p>
    <div class="detail-grid">
      <div>
        <h3>Ingredienti</h3>
        <div class="box">${formatIngredients(r.ingredienti || '')}</div>
      </div>
      <div>
        <h3>Classificazione</h3>
        <div class="box">Senza glutine: ${escapeHtml(r.senza_glutine || '')}
Soia: ${escapeHtml(r.soia || '')}
Legumi: ${escapeHtml(r.legumi || '')}
Frutta secca: ${escapeHtml(r.frutta_secca || '')}
Carboidrati: ${escapeHtml(r.carboidrati || '')}
Proteica: ${escapeHtml(r.proteica || '')}
Metodo: ${escapeHtml(r.metodo_cottura || '')}
Stagione: ${escapeHtml(r.stagione || '')}
Ingrediente principale: ${escapeHtml(r.ingrediente_principale || '')}</div>
      </div>
    </div>
    <h3>Preparazione</h3>
<div class="box">${formatRecipeText(r.testo_pagina || '')}</div>
  `;
  $('detail').showModal();
}

function escapeHtml(s){
  return (s ?? '').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function formatIngredients(text) {
  if (!text) return "";

  let t = text.replace(/\s+/g, " ").trim();

  // protegge casi tipo "farina 0", "farina 00", "tipo 1", "tipo 2"
  t = t.replace(/farina\s+0/g, "farina_ZERO");
  t = t.replace(/farina\s+00/g, "farina_DOPPIOZERO");
  t = t.replace(/tipo\s+1/g, "tipo_UNO");
  t = t.replace(/tipo\s+2/g, "tipo_DUE");

  const startPattern = /(?=\s(?:\d+[.,]?\d*|½|⅓|⅔|¼|¾)\s+(?:g|kg|ml|l|cucchiaio|cucchiai|cucchiaino|cucchiaini|spicchio|spicchi|rametto|rametti|bustina|bustine|bicchiere|bicchieri|pizzico|pizzichi|manciata|manciate|seme|semi|noce|noci|foglia|foglie|pomodori|mele|pere|carote|cipolle|arance|limoni|lime|patate|zucchine|melanzane|peperoni|carciofi|cavolfiori|cavolini|cedro|zucca|scalogni|datteri))/gi;

  let items = t
    .replace(startPattern, "\n")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);

  // ripristina protezioni
  items = items.map(x => x
    .replace(/farina_ZERO/g, "farina 0")
    .replace(/farina_DOPPIOZERO/g, "farina 00")
    .replace(/tipo_UNO/g, "tipo 1")
    .replace(/tipo_DUE/g, "tipo 2")
  );

  return `
    <ul class="ingredient-list">
      ${items.map(x => `<li>${escapeHtml(x)}</li>`).join("")}
    </ul>
  `;
}
}function formatRecipeText(text) {
  if (!text) return "";

  let t = text
    .replace(/\s+/g, " ")
    .replace(/.*?Si cucina!\s*/i, "")
    .replace(/\s*Conservazione\s*/i, "\n\n<strong>Conservazione</strong>\n")
    .replace(/\s*Consiglio vegoloso\s*/i, "\n\n<strong>Consiglio vegoloso</strong>\n")
    .replace(/\s*(Prepariamo|Cuociamo|Inforniamo|Serviamo|Completiamo|Frulliamo|Condiamo|Rosoliamo|Saltiamo|Decoriamo|Impastiamo|Diamo forma)\s*/gi, "\n\n<strong>$1</strong>\n");

  return t
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean)
    .map(x => {
      if (x.startsWith("<strong>")) return x;
      return `<p>${escapeHtml(x)}</p>`;
    })
    .join("");
}
load();
