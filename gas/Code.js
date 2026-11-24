// ============================================================
// Multi-App Cloud Backend (Google Apps Script)
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

// Helper: Automatic Favicon Detection from URL HTML
function detectFaviconFromUrl(targetUrl) {
  if (!targetUrl) return '';
  let url = targetUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  try {
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    const html = resp.getContentText();
    
    const linkMatch = html.match(/<link[^>]+rel=["'](?:shortcut\s+)?(?:apple-touch-)?icon["'][^>]*>/i)
                   || html.match(/<link[^>]+(?:shortcut\s+)?(?:apple-touch-)?icon[^>]+rel=["'][^"']*["'][^>]*>/i);
    
    if (linkMatch) {
      const hrefMatch = linkMatch[0].match(/href=["']([^"']+)["']/i);
      if (hrefMatch && hrefMatch[1]) {
        let href = hrefMatch[1].trim();
        if (href.startsWith('//')) return 'https:' + href;
        if (href.startsWith('http')) return href;
        
        // Handle relative URL
        const base = url.split('?')[0].split('#')[0];
        if (href.startsWith('/')) {
          const originMatch = base.match(/^https?:\/\/[^\/]+/i);
          return (originMatch ? originMatch[0] : '') + href;
        }
        const lastSlash = base.lastIndexOf('/');
        const dir = lastSlash !== -1 ? base.substring(0, lastSlash + 1) : (base + '/');
        return dir + href.replace(/^\.\//, '');
      }
    }

    // Fallback: Check if targetUrl/favicon.ico exists
    const originMatch = url.match(/^https?:\/\/[^\/]+/i);
    if (originMatch) {
      const fallbackIco = originMatch[0] + '/favicon.ico';
      try {
        const icoResp = UrlFetchApp.fetch(fallbackIco, { muteHttpExceptions: true });
        if (icoResp.getResponseCode() === 200) {
          return fallbackIco;
        }
      } catch (err) {}
    }
  } catch (e) {
    Logger.log("detectFaviconFromUrl error for " + url + ": " + e);
  }
  return 'https://i.postimg.cc/d01s2X3T/MIzuiku.png';
}

// 3. Read All Apps from Sheet (Lock protected)
function getAppsFromSheet(appName) {
  const isMizuiku = (appName || '').toLowerCase() === 'mizuiku';
  const defaultApps = isMizuiku ? [] : DEFAULT_BOSU_APPS;
  
  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    hasLock = lock.tryLock(10000);
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
    let needsResave = false;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || (!row[idIdx] && !row[urlIdx])) continue;
      
      let rawIcon = String(row[iconIdx] || '');
      const appUrl = String(row[urlIdx] || '');

      // Auto-repair bad google s2 favicons
      if ((!rawIcon || rawIcon.includes('google.com/s2')) && appUrl) {
        const detected = detectFaviconFromUrl(appUrl);
        if (detected) {
          rawIcon = detected;
          needsResave = true;
        }
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

    if (needsResave && apps.length > 0) {
      try { saveAppsToSheet(apps, appName); } catch (e) {}
    }

    return apps.length > 0 ? apps : defaultApps;
  } catch (err) {
    Logger.log("getAppsFromSheet error: " + err);
    return defaultApps;
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

    // Ensure all icons are populated
    apps.forEach(app => {
      if ((!app.icon || app.icon.includes('google.com/s2')) && app.url) {
        app.icon = detectFaviconFromUrl(app.url);
      }
    });

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

// 5. HTTP GET Handler
function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  const callback = e && e.parameter && e.parameter.callback;

  // Favicon detection helper endpoint
  if (action === "detectFavicon") {
    const url = e.parameter.url;
    const favicon = detectFaviconFromUrl(url);
    const out = { status: "success", favicon: favicon };
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + JSON.stringify(out) + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(JSON.stringify(out))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const app = (e && e.parameter && e.parameter.app) || 'bosu';
  const apps = getAppsFromSheet(app);
  
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

      const updatedApps = getAppsFromSheet(app);
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
    const apps = getAppsFromSheet(app);
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
