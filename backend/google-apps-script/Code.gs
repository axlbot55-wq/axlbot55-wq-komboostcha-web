var CONTENT_KEYS = [
  'heroTitle','heroSubtitle','kombuchaPrice','kombuchaDescription','yoghurtPrice','yoghurtDescription',
  'batchTotal','batchRemaining','batchCutoffText','deliveryZones','aboutIntro','faq1q','faq1a','faq2q','faq2a','whatsAppNumber'
];

function jsonOut(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0 && headers && headers.length) sh.appendRow(headers);
  return sh;
}

function getSettingsMap_(ss) {
  var sh = getOrCreateSheet_(ss, 'Settings', ['Key','Value']);
  var rows = sh.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < rows.length; i++) {
    var key = rows[i][0];
    if (!key) continue;
    map[String(key)] = rows[i][1];
  }
  return map;
}

function upsertSettings_(ss, payload) {
  var sh = getOrCreateSheet_(ss, 'Settings', ['Key','Value']);
  var rows = sh.getDataRange().getValues();
  var rowByKey = {};
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0]) rowByKey[String(rows[i][0])] = i + 1;
  }
  Object.keys(payload || {}).forEach(function(key) {
    var value = payload[key];
    if (rowByKey[key]) sh.getRange(rowByKey[key], 2).setValue(value);
    else sh.appendRow([key, value]);
  });
}

function defaultContent_() {
  return {
    heroTitle: 'Handcrafted cultures for the good fridge.',
    heroSubtitle: 'Quietly premium kombucha and thick cultured yoghurt — brewed in small runs, delivered fresh, and meant to feel like something worth reserving.',
    kombuchaPrice: '350',
    kombuchaDescription: 'Light fizz, gentle acidity, clean finish. Brewed for people who want something fresher and less sugary than the usual shelf stuff.',
    yoghurtPrice: '350',
    yoghurtDescription: 'Full-fat milk cultured and strained into a thick, creamy yoghurt with no thickeners, stabilizers, or fake texture tricks.',
    batchTotal: '18',
    batchRemaining: '14',
    batchCutoffText: 'Order by Friday midnight for Sunday delivery',
    deliveryZones: 'General QC, Ortigas',
    aboutIntro: 'Komboostcha is a small fermentation project built around fresh batches, honest ingredients, and a more personal delivery rhythm than standard food ordering.',
    faq1q: 'How does ordering work?',
    faq1a: 'Reserve through the Order tab, then we confirm details on WhatsApp before delivery.',
    faq2q: 'When do you deliver?',
    faq2a: 'Usually Sunday delivery, with the batch cutoff shown live on the order page.',
    whatsAppNumber: '639209106731'
  };
}

function getContent_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettingsMap_(ss);
  var out = defaultContent_();
  CONTENT_KEYS.forEach(function(key) {
    if (settings[key] !== undefined && settings[key] !== '') out[key] = String(settings[key]);
  });
  return out;
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'content';
    if (action === 'content') return jsonOut({ ok: true, content: getContent_() });
    return jsonOut({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = payload.action || 'order';

    if (action === 'saveContent') {
      var settings = getSettingsMap_(ss);
      var expectedPin = String(settings.ownerPin || settings.sellerPin || '2025');
      if (String(payload.token || '') !== expectedPin) return jsonOut({ ok: false, error: 'Unauthorized' });
      var incoming = payload.content || {};
      var clean = {};
      CONTENT_KEYS.forEach(function(key) {
        if (incoming[key] !== undefined) clean[key] = String(incoming[key]);
      });
      upsertSettings_(ss, clean);
      return jsonOut({ ok: true, content: getContent_() });
    }

    var sh = getOrCreateSheet_(ss, 'Orders', ['Timestamp','Source','Order ID','Name','WhatsApp','Area','Window','Items','Kombucha Qty','Yoghurt Qty','Total','Batch ID','Notes','Raw JSON']);
    var order = payload.order || {};
    sh.appendRow([
      new Date(), payload.source || '', order.id || '', order.name || '', order.wa || '', order.area || '', order.slot || '',
      (order.items || []).join(', '), order.qty && order.qty.kombucha || 0, order.qty && order.qty.yoghurt || 0,
      order.total || 0, order.batchId || '', order.notes || '', JSON.stringify(payload)
    ]);
    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}
