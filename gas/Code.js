// ============================================================
// Multi-App Cloud Backend (Google Apps Script) - High Reliability
// Supports both Bosu Hub and Mizuiku (Water & Nature) Hub
// Automatically creates folder 'Bosu' and spreadsheet 'Bosu_Database'
// with separate sheets: 'Apps' for Bosu, 'Mizuiku_Apps' for Mizuiku
// ============================================================

const DEFAULT_BOSU_APPS = [
  {
    id: 'wntk-library-system',
    name: 'WNTK Library System',
    url: 'https://bosu-nsoq.github.io/wntk-library-system/',
    icon: 'https://i.postimg.cc/D0Dw84J1/WNTK.png',
    active: true
  },
  {
    id: 'financial',
    name: 'Financial',
    url: 'https://bosu-nsoq.github.io/financial/',
    icon: 'https://i.postimg.cc/T2Cngdnd/Financial.png',
    active: true
  },
  {
    id: 'lunar',
    name: 'Lunar',
    url: 'https://bosu-nsoq.github.io/lunar/',
    icon: 'https://i.postimg.cc/xC1sKNwZ/Lunar.png',
    active: true
  }
];

// 1. Get or Create 'Bosu' Folder in Google Drive
function getOrCreateBosuFolder() {
  const folders = DriveApp.getFoldersByName("Bosu");
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder("Bosu");
}

// 2. Get or Create Spreadsheet inside 'Bosu' Folder
function getOrCreateDatabaseSpreadsheet() {
  const folder = getOrCreateBosuFolder();
  const files = folder.getFilesByName("Bosu_Database");
  let ss;
  
  if (files.hasNext()) {
    ss = SpreadsheetApp.open(files.next());
  } else {
    ss = SpreadsheetApp.create("Bosu_Database");
    const file = DriveApp.getFileById(ss.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
  }

  // Ensure default Bosu Apps sheet exists
  let sheet = ss.getSheetByName("Apps");
  if (!sheet) {
    sheet = ss.getActiveSheet();
    sheet.setName("Apps");
    sheet.clear();
    
    const initialRows = [
      ["id", "name", "url", "icon", "active", "order", "updated_at"],
      ...DEFAULT_BOSU_APPS.map((app, idx) => [
        app.id,
        app.name,
        app.url,
        app.icon,
        app.active,
        idx + 1,
        new Date().toISOString()
      ])
    ];
    sheet.getRange(1, 1, initialRows.length, 7).setValues(initialRows);
  }

  return ss;
}

// Helper: Get or Create Sheet for target app ('bosu' | 'mizuiku')
function getTargetSheet(ss, appName) {
  const isMizuiku = (appName || '').toLowerCase() === 'mizuiku';
  const targetSheetName = isMizuiku ? "Mizuiku_Apps" : "Apps";
  
  let sheet = ss.getSheetByName(targetSheetName);
  if (!sheet) {
    sheet = ss.insertSheet(targetSheetName);
    const headers = [["id", "name", "url", "icon", "category", "active", "order", "updated_at"]];
    sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
    sheet.getRange(1, 1, 1, headers[0].length).setFontWeight("bold").setBackground(isMizuiku ? "#BAE6FD" : "#E2E8F0");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// 3. Read All Apps from Sheet (Fast, Read-Only, No deadlocks)
function getAppsFromSheet(appName) {
  const isMizuiku = (appName || '').toLowerCase() === 'mizuiku';
  const defaultApps = isMizuiku ? [] : DEFAULT_BOSU_APPS;
  
  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    // Wait up to 5 seconds for any ongoing write to finish
    hasLock = lock.tryLock(5000);
    const ss = getOrCreateDatabaseSpreadsheet();
    const sheet = getTargetSheet(ss, appName);

    const data = sheet.getDataRange().getValues();
    if (!data || data.length <= 1) {
      return defaultApps;
    }

    const headers = data[0].map(h => String(h).toLowerCase().trim());
    const idIdx = headers.indexOf("id");
    const nameIdx = headers.indexOf("name");
    const urlIdx = headers.indexOf("url");
    const iconIdx = headers.indexOf("icon");
    const catIdx = headers.indexOf("category");
    const activeIdx = headers.indexOf("active");
    const orderIdx = headers.indexOf("order");

    const apps = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || (!row[idIdx] && !row[urlIdx])) continue;
      
      const appUrl = String(row[urlIdx] || '');
      let rawIcon = String(row[iconIdx] || '');
      if (!rawIcon) {
        rawIcon = 'https://i.postimg.cc/d01s2X3T/MIzuiku.png';
      }

      apps.push({
        id: String(row[idIdx] || ('app-' + i)),
        name: String(row[nameIdx] || ''),
        url: appUrl,
        icon: rawIcon,
        category: catIdx !== -1 ? String(row[catIdx] || 'ทั่วไป') : 'ทั่วไป',
        active: row[activeIdx] === true || String(row[activeIdx]).toLowerCase() === 'true',
        order: Number(row[orderIdx]) || i
      });
    }

    apps.sort((a, b) => a.order - b.order);
    return apps;
  } catch (err) {
    Logger.log("getAppsFromSheet error: " + err);
    // Return null on lock/read error so doGet knows it failed and doesn't wipe client cache!
    return null;
  } finally {
    if (hasLock) {
      try { lock.releaseLock(); } catch (e) {}
    }
  }
}

// 4. Save/Sync Apps to Sheet (Atomic & Lock protected)
function saveAppsToSheet(apps, appName) {
  if (!Array.isArray(apps)) {
    return { success: false, error: "Invalid apps list format" };
  }
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = getOrCreateDatabaseSpreadsheet();
    const sheet = getTargetSheet(ss, appName);
    
    const existingLastRow = sheet.getLastRow();

    const rows = [
      ["id", "name", "url", "icon", "category", "active", "order", "updated_at"],
      ...apps.map((app, idx) => [
        app.id || ('app-' + (idx + 1)),
        app.name || '',
        app.url || '',
        app.icon || 'https://i.postimg.cc/d01s2X3T/MIzuiku.png',
        app.category || 'ทั่วไป',
        app.active !== false,
        idx + 1,
        new Date().toISOString()
      ])
    ];

    // ATOMIC WRITE
    sheet.getRange(1, 1, rows.length, 8).setValues(rows);

    // If previously there were more rows, clear excess rows below
    if (existingLastRow > rows.length) {
      sheet.getRange(rows.length + 1, 1, existingLastRow - rows.length, sheet.getLastColumn() || 8).clearContent();
    }

    SpreadsheetApp.flush();
    return { success: true, count: apps.length };
  } catch (e) {
    Logger.log("saveAppsToSheet error: " + e);
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// 5. HTTP GET Handler
function doGet(e) {
  const app = (e && e.parameter && e.parameter.app) || 'bosu';
  const callback = e && e.parameter && e.parameter.callback;
  const apps = getAppsFromSheet(app);
  
  // If transient lock error occurred, return error status so client safely keeps its local cache!
  if (apps === null) {
    const errRes = {
      status: "error",
      message: "Database busy, keep local cache",
      timestamp: Date.now()
    };
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + JSON.stringify(errRes) + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(JSON.stringify(errRes))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const res = {
    status: "success",
    app: app,
    data: apps,
    count: apps.length,
    timestamp: Date.now()
  };

  if (callback) {
    return ContentService.createTextOutput(callback + "(" + JSON.stringify(res) + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}

// 6. HTTP POST Handler
function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    const app = body.app || (e && e.parameter && e.parameter.app) || 'bosu';
    const action = body.action || (e && e.parameter && e.parameter.action);

    if (action === "saveApps") {
      const result = saveAppsToSheet(body.apps || [], app);
      if (!result.success) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: result.error || "Save failed"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const updatedApps = getAppsFromSheet(app) || body.apps || [];
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        app: app,
        message: "Saved successfully",
        data: updatedApps,
        count: updatedApps.length,
        timestamp: Date.now()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Default action: getApps
    const apps = getAppsFromSheet(app) || [];
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      app: app,
      data: apps,
      count: apps.length,
      timestamp: Date.now()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
