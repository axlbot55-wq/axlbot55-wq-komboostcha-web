function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Orders') || ss.insertSheet('Orders');
    if (sh.getLastRow() === 0) sh.appendRow(['Timestamp','Source','Order ID','Name','WhatsApp','Area','Window','Items','Kombucha Qty','Yoghurt Qty','Total','Batch ID','Notes','Raw JSON']);
    var payload = JSON.parse(e.postData.contents || '{}');
    var order = payload.order || {};
    sh.appendRow([
      new Date(), payload.source || '', order.id || '', order.name || '', order.wa || '', order.area || '', order.slot || '',
      (order.items || []).join(', '), order.qty && order.qty.kombucha || 0, order.qty && order.qty.yoghurt || 0,
      order.total || 0, order.batchId || '', order.notes || '', JSON.stringify(payload)
    ]);
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}
