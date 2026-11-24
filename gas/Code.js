// ============================================================
// Mizuiku Web App - Cloud Backend (Google Apps Script)
// ระบบ Cloud Sync สำหรับ Mizuiku (สายน้ำและธรรมชาติ Hub)
// บันทึกและดึงข้อมูลรายชื่อเว็บแอปผ่าน Google Drive และ Google Sheets อัตโนมัติ
// ============================================================

const FOLDER_NAME = "Mizuiku";
const SPREADSHEET_NAME = "Mizuiku_Database";
const SHEET_NAME = "Apps";

// แอปเริ่มต้น: เริ่มต้นเป็นลิสต์ว่างเพื่อให้แอดมินเพิ่มเองตามต้องการ
const INITIAL_APPS = [];

// 1. Get or Create 'Mizuiku' Folder in Google Drive
function getOrCreateMizuikuFolder() {
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(FOLDER_NAME);
}

// 2. Get or Create Spreadsheet inside 'Mizuiku' Folder
function getOrCreateDatabaseSpreadsheet() {
  const folder = getOrCreateMizuikuFolder();
  const files = folder.getFilesByName(SPREADSHEET_NAME);
  let ss;
  
  if (files.hasNext()) {
    ss = SpreadsheetApp.open(files.next());
  } else {
    // สร้างสเปรดชีตใหม่และย้ายเข้าโฟลเดอร์ Mizuiku โดยตรง
    ss = SpreadsheetApp.create(SPREADSHEET_NAME);
    const file = DriveApp.getFileById(ss.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
  }

  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.getActiveSheet();
    sheet.setName(SHEET_NAME);
    sheet.clear();
    
    // Header columns
    const headers = [["id", "name", "url", "icon", "category", "active", "order", "updated_at"]];
    sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
    sheet.getRange(1, 1, 1, headers[0].length).setFontWeight("bold").setBackground("#D1FAE5");
    sheet.setFrozenRows(1);
  }

  return ss;
}

// One-time Setup & Authorization Helper (คลิกเลือกฟังก์ชันนี้แล้วกด "เรียกใช้" เพื่ออนุมัติสิทธิ์ครั้งแรก)
function initMizuikuDatabase() {
  const folder = getOrCreateMizuikuFolder();
  const ss = getOrCreateDatabaseSpreadsheet();
  const apps = getAppsFromSheet();
  Logger.log("✅ ตรวจสอบ/สร้างโฟลเดอร์ '" + FOLDER_NAME + "' ใน Google Drive สำเร็จ: " + folder.getUrl());
  Logger.log("✅ ตรวจสอบ/สร้างสเปรดชีต '" + SPREADSHEET_NAME + "' สำเร็จ: " + ss.getUrl());
  Logger.log("✅ ความพร้อมของฐานข้อมูล: มีเว็บแอปในระบบทั้งหมด " + apps.length + " แอป");
  return {
    folderUrl: folder.getUrl(),
    sheetUrl: ss.getUrl(),
    appsCount: apps.length
  };
}

// 3. Read All Apps from Sheet (Lock protected)
function getAppsFromSheet() {
  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    hasLock = lock.tryLock(10000);
    const ss = getOrCreateDatabaseSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (!data || data.length <= 1) {
      return [];
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
      
      apps.push({
        id: String(row[idIdx] || ('app-' + i)),
        name: String(row[nameIdx] || ''),
        url: String(row[urlIdx] || ''),
        icon: String(row[iconIdx] || ''),
        category: catIdx !== -1 ? String(row[catIdx] || 'ทั่วไป') : 'ทั่วไป',
        active: row[activeIdx] === true || String(row[activeIdx]).toLowerCase() === 'true',
        order: Number(row[orderIdx]) || i
      });
    }

    apps.sort((a, b) => a.order - b.order);
    return apps;
  } catch (err) {
    Logger.log("getAppsFromSheet error: " + err);
    return [];
  } finally {
    if (hasLock) {
      try { lock.releaseLock(); } catch (e) {}
    }
  }
}

// 4. Save/Sync Apps to Sheet (Atomic & Lock protected)
function saveAppsToSheet(apps) {
  if (!Array.isArray(apps)) {
    return { success: false, error: "Invalid apps list format" };
  }
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = getOrCreateDatabaseSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
    
    const existingLastRow = sheet.getLastRow();

    // Prepare full matrix with header
    const rows = [
      ["id", "name", "url", "icon", "category", "active", "order", "updated_at"],
      ...apps.map((app, idx) => [
        app.id || ('app-' + (idx + 1)),
        app.name || '',
        app.url || '',
        app.icon || '',
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
    return { success: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// 5. HTTP GET Handler (Read apps or JSONP)
function doGet(e) {
  const apps = getAppsFromSheet();
  const callback = e && e.parameter && e.parameter.callback;
  
  const responseData = {
    status: "success",
    data: apps,
    count: apps.length,
    timestamp: Date.now()
  };

  if (callback) {
    return ContentService.createTextOutput(callback + "(" + JSON.stringify(responseData) + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

// 6. HTTP POST Handler (Sync/Update apps)
function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    const action = body.action || (e && e.parameter && e.parameter.action);

    if (action === "saveApps") {
      const result = saveAppsToSheet(body.apps || []);
      if (!result.success) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: result.error || "Save failed"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const updatedApps = getAppsFromSheet();
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Saved successfully",
        data: updatedApps,
        count: updatedApps.length,
        timestamp: Date.now()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Default action: getApps
    const apps = getAppsFromSheet();
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
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
