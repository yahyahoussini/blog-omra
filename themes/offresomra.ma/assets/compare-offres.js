// Comparateur d'offres Omra (offresomra.ma, DECISIONS D-B). Runs only in the browser: nothing is sent or stored
// (no network call, no cookie, no localStorage). It shows the reader's own figures side by side and lists what
// each offer does not say. It contains no fact, price or rule of its own.
(function () {
  'use strict';
  var root = document.querySelector('.tool[data-tool="compare-offres"]');
  if (!root) return;

  var FIELDS = [
    { id: 'label', label: 'Nom de l\'offre (pour vous repérer)', type: 'text' },
    { id: 'price', label: 'Prix total par personne (MAD)', type: 'number' },
    { id: 'room', label: 'Personnes par chambre', type: 'number' },
    { id: 'nightsMakkah', label: 'Nuits à La Mecque', type: 'number' },
    { id: 'nightsMadinah', label: 'Nuits à Médine', type: 'number' },
    { id: 'distance', label: 'Distance de l\'hôtel au Haram de La Mecque (mètres, selon l\'offre)', type: 'number' },
  ];
  var INCLUDED = [
    { id: 'flight', label: 'Vols aller-retour' },
    { id: 'direct', label: 'Vol direct (sans escale)' },
    { id: 'visa', label: 'Visa et frais de dossier' },
    { id: 'transfers', label: 'Transferts aéroport et entre les villes' },
    { id: 'meals', label: 'Repas précisés (lesquels, où)' },
    { id: 'guide', label: 'Accompagnateur nommé' },
    { id: 'insurance', label: 'Assurance voyage' },
    { id: 'cancel', label: 'Conditions d\'annulation écrites' },
  ];
  var OFFERS = 3;

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }
  function num(v) { var n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isFinite(n) && n >= 0 ? n : null; }
  function fmt(n) { return Math.round(n).toLocaleString('fr-FR'); }

  root.textContent = '';
  var form = el('form', { class: 'compare', novalidate: '' });
  var grid = el('div', { class: 'compare__grid' });
  for (var o = 0; o < OFFERS; o++) {
    var box = el('fieldset', { class: 'compare__offer' });
    box.appendChild(el('legend', null, 'Offre ' + String.fromCharCode(65 + o)));
    FIELDS.forEach(function (f) {
      var id = 'o' + o + '-' + f.id;
      var row = el('p', { class: 'compare__row' });
      row.appendChild(el('label', { for: id }, f.label));
      row.appendChild(el('input', { id: id, name: id, type: f.type, inputmode: f.type === 'number' ? 'decimal' : 'text', min: '0', autocomplete: 'off' }));
      box.appendChild(row);
    });
    INCLUDED.forEach(function (f) {
      var id = 'o' + o + '-' + f.id;
      var row = el('p', { class: 'compare__check' });
      var input = el('input', { id: id, name: id, type: 'checkbox' });
      row.appendChild(input);
      row.appendChild(el('label', { for: id }, f.label + ' : écrit dans l\'offre'));
      box.appendChild(row);
    });
    grid.appendChild(box);
  }
  form.appendChild(grid);
  form.appendChild(el('button', { type: 'submit', class: 'compare__button' }, 'Comparer'));
  var out = el('div', { class: 'compare__result', 'aria-live': 'polite' });
  root.appendChild(form);
  root.appendChild(out);

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    out.textContent = '';
    var table = el('table', { class: 'compare__table' });
    var head = el('tr');
    head.appendChild(el('th', { scope: 'col' }, ''));
    var rows = { nights: [], perNight: [], missing: [] };
    var any = false;
    for (var o = 0; o < OFFERS; o++) {
      var v = function (id) { return form.elements['o' + o + '-' + id]; };
      var label = v('label').value.trim() || 'Offre ' + String.fromCharCode(65 + o);
      var price = num(v('price').value), nm = num(v('nightsMakkah').value), nd = num(v('nightsMadinah').value);
      if (price == null && nm == null && nd == null) continue;
      any = true;
      head.appendChild(el('th', { scope: 'col' }, label));
      var nights = (nm || 0) + (nd || 0);
      rows.nights.push(nights ? fmt(nights) : 'non précisé');
      rows.perNight.push(price != null && nights ? fmt(price / nights) + ' MAD' : 'incalculable');
      var missing = INCLUDED.filter(function (f) { return !v(f.id).checked; }).map(function (f) { return f.label; });
      if (num(v('distance').value) == null) missing.push('Distance de l\'hôtel');
      if (num(v('room').value) == null) missing.push('Nombre de personnes par chambre');
      rows.missing.push(missing.length ? missing.join(', ') : 'rien de ce que vérifie cet outil');
    }
    if (!any) { out.appendChild(el('p', null, 'Saisissez au moins le prix ou les nuits d\'une offre.')); return; }
    table.appendChild(head);
    [['Nuits au total', rows.nights], ['Prix par nuit (votre calcul)', rows.perNight], ['À demander par écrit', rows.missing]].forEach(function (r) {
      var tr = el('tr');
      tr.appendChild(el('th', { scope: 'row' }, r[0]));
      r[1].forEach(function (c) { tr.appendChild(el('td', null, c)); });
      table.appendChild(tr);
    });
    out.appendChild(table);
    out.appendChild(el('p', { class: 'compare__note' }, 'Ces chiffres sont les vôtres : l\'outil ne connaît aucun prix et ne garde rien. Une ligne « à demander » est une question à poser à l\'agence avant de payer.'));
  });
})();
