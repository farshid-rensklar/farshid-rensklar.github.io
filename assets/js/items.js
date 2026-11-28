/* JustDry – ret stykkerne på en ordre (chauffør ved døren og kontoret).
   Prisen regnes altid af databasen (staff_set_items / price_quote) ud fra prislisten – aldrig her.
   Brug: JDItems.html(order, services) giver en <section>; JDItems.attach(root, db, onSaved, toast) gør den levende. */
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const kr = v => new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 }).format(v || 0) + '\u00a0kr.';
  const state = new Map(); // order id -> { lines: Map(serviceId -> qty), services, dirty }

  function linesOf(o) {
    const m = new Map();
    (Array.isArray(o.items) ? o.items : []).forEach(x => { const id = Number(x.id); if (id && x.qty > 0) m.set(id, (m.get(id) || 0) + Number(x.qty)); });
    return m;
  }

  function body(id) {
    const st = state.get(id), sv = st.services;
    const rows = [...st.lines].map(([sid, q]) => {
      const s = sv.find(x => Number(x.id) === sid) || { name: 'Ukendt', price: 0 };
      return `<li data-sid="${sid}"><span class="n">${esc(s.name)}<small> · ${kr(s.price)}</small></span>
        <span class="qty"><button type="button" data-d="-1" aria-label="Færre ${esc(s.name)}">−</button><b>${q}</b><button type="button" data-d="1" aria-label="Flere ${esc(s.name)}">＋</button></span></li>`;
    }).join('');
    const cats = [...new Set(sv.map(s => s.category))];
    const opts = cats.map(c => `<optgroup label="${esc(c)}">${sv.filter(s => s.category === c).map(s => `<option value="${Number(s.id)}" ${Number(s.id) === st.pick ? 'selected' : ''}>${esc(s.name)} – ${kr(s.price)}</option>`).join('')}</optgroup>`).join('');
    return `<ul class="it-list">${rows || '<li class="empty">Ingen stykker endnu</li>'}</ul>
      <div class="it-add"><select aria-label="Vælg stykke">${opts}</select><button type="button" class="it-plus">＋ Tilføj</button></div>
      <p class="it-sum" aria-live="polite"></p>
      <button type="button" class="it-save" ${st.dirty ? '' : 'disabled'}>Gem ændringer</button>`;
  }

  function html(o, services) {
    const id = Number(o.id);
    const prev = state.get(id);
    state.set(id, { lines: prev && prev.dirty ? prev.lines : linesOf(o), services: services || [], dirty: prev ? prev.dirty : false, pick: prev ? prev.pick : null });
    return `<section class="items-ed" data-items="${id}"><h3>Stykker & pris</h3>
      <p class="hint">Lægger kunden mere i posen, så tilføj det her. Prisen regnes automatisk efter prislisten, og kunden kan se den nye liste på sin ordreside.</p>
      <div class="it-body">${body(id)}</div></section>`;
  }

  async function quote(db, sec, id) {
    const st = state.get(id), p = sec.querySelector('.it-sum');
    const items = [...st.lines].map(([sid, qty]) => ({ id: sid, qty }));
    if (!items.length) { p.textContent = 'Tilføj mindst ét stykke.'; return; }
    const { data, error } = await db.rpc('price_quote', { p_items: items, p_code: null });
    if (error || !data) { p.textContent = ''; return; }
    p.innerHTML = `${data.count} stk. · ${kr(data.subtotal)}${data.delivery_fee ? ` + levering ${kr(data.delivery_fee)}` : ''} = <b>${kr(data.total)}</b>${st.dirty ? ' <small>(ikke gemt)</small>' : ''}<br><small>En eventuel rabatkode trækkes fra, når der gemmes.</small>`;
  }

  function redraw(db, sec, id) { sec.querySelector('.it-body').innerHTML = body(id); quote(db, sec, id); }

  function attach(root, db, onSaved, toast) {
    root.querySelectorAll('[data-items]').forEach(sec => quote(db, sec, Number(sec.dataset.items)));
    if (root.__jdItems) return; root.__jdItems = true;
    root.addEventListener('click', async e => {
      const sec = e.target.closest('[data-items]'); if (!sec) return;
      const id = Number(sec.dataset.items), st = state.get(id); if (!st) return;
      const d = e.target.closest('button[data-d]');
      if (d) {
        const sid = Number(d.closest('li').dataset.sid), q = (st.lines.get(sid) || 0) + Number(d.dataset.d);
        if (q <= 0) st.lines.delete(sid); else st.lines.set(sid, Math.min(q, 50));
        st.dirty = true; redraw(db, sec, id); return;
      }
      if (e.target.closest('.it-plus')) {
        const sid = Number(sec.querySelector('.it-add select').value); if (!sid) return;
        st.pick = sid;
        st.lines.set(sid, Math.min((st.lines.get(sid) || 0) + 1, 50)); st.dirty = true; redraw(db, sec, id); return;
      }
      const save = e.target.closest('.it-save');
      if (save) {
        const items = [...st.lines].map(([sid, qty]) => ({ id: sid, qty }));
        if (!items.length) { toast && toast('Der skal være mindst ét stykke.', true); return; }
        save.disabled = true; save.textContent = 'Gemmer …';
        const { data, error } = await db.rpc('staff_set_items', { p_id: id, p_items: items });
        if (error) {
          save.disabled = false; save.textContent = 'Gem ændringer';
          const m = /JD:(\w+)/.exec(error.message || '') || [];
          toast && toast(m[1] === 'paid' ? 'Ordren er betalt – kan ikke ændres.' : m[1] === 'state' ? 'Ordren kan ikke ændres i denne status.' : m[1] === 'forbidden' ? 'Du har ikke adgang til denne ordre.' : 'Kunne ikke gemme: ' + (error.message || 'fejl'), true);
          return;
        }
        st.dirty = false; toast && toast(`Gemt ✓ Ny pris: ${kr(data.total)}`);
        onSaved && onSaved(id, data);
      }
    });
  }

  window.JDItems = { html, attach, reset: id => state.delete(Number(id)) };
})();
