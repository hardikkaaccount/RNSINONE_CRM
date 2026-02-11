// ============================================================
// GOOGLE APPS SCRIPT — Paste this into script.google.com
// ============================================================
// STEPS:
// 1. Go to https://script.google.com
// 2. Click "New Project"
// 3. Delete all default code
// 4. Paste this ENTIRE file
// 5. Click "Deploy" → "New Deployment"
// 6. Type = "Web App"
// 7. Execute as = "Me"
// 8. Who has access = "Anyone"
// 9. Click "Deploy" → Copy the URL
// 10. Paste the URL in your .env file as GOOGLE_SHEET_URL
// ============================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // If sheet is empty, add headers first
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp',
        'Name', 
        'Phone',
        'Business',
        'Service',
        'Timeline',
        'Priority',
        'Tags',
        'Notes'
      ]);
    }
    
    sheet.appendRow([
      new Date().toISOString(),
      data.name || '',
      data.phone || '',
      data.business || '',
      data.service || '',
      data.timeline || '',
      data.priority || '',
      data.tags || '',
      data.notes || ''
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function — run this manually to verify sheet access
function testAppend() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([
    new Date().toISOString(),
    'Test User',
    '+911234567890',
    'Test Business',
    'Website Design',
    'Urgent',
    'HIGH',
    'test',
    'This is a test entry'
  ]);
}
