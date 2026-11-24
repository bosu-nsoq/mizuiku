# Mizuiku (みずいく) - สายน้ำและธรรมชาติ Hub

เว็บแอปพลิเคชัน Hub สไตล์**สายน้ำและธรรมชาติ (Water & Nature Theme)** สำหรับรวบรวมและเปิดใช้งานเว็บแอปพลิเคชันต่างๆ แบบเต็มจอโดยไม่มีแถบ URL ของเบราว์เซอร์ พร้อมระบบ Cloud Sync ผ่าน Google Sheets และรองรับ PWA (Progressive Web App) สำหรับติดตั้งลงบน iOS, Android และ Desktop

---

## 🌿 จุดเด่นและฟังก์ชันการทำงาน

1. **สไตล์ดีไซน์สายน้ำและธรรมชาติ (Water & Nature Theme):**
   - โทนสีเขียวมรกต เขียวน้ำทะเล และฟ้าธาราใส (`#051813`, `#0D3B2E`, `#2DD4BF`, `#34D399`)
   - ละอองแสงและคลื่นน้ำเคลื่อนไหวอ่อนโยน สบายตา
   - ฟอนต์ **'Mali'** อ่านง่าย เป็นกันเอง เหมาะสำหรับแอปพลิเคชันและการศึกษา
2. **In-App Fullscreen Web App Viewer:**
   - เมื่อคลิกเปิดแอป จะแสดงผลแบบเต็มจอทันทีโดย**ไม่มีแถบ URL ของเบราว์เซอร์**
   - มี Floating Island Bar ด้านบน พร้อมปุ่มกลับหน้าหลัก Mizuiku, ปุ่มรีเฟรช, ปุ่มเต็มจอ และปุ่มเปิดในแท็บใหม่
3. **เริ่มต้นด้วยหน้าตัวอย่างว่าง (Nature Empty State):**
   - เริ่มต้นพร้อมต้อนรับผู้ใช้งานด้วยการ์ดธรรมชาติสวยงาม พร้อมปุ่ม **"🌿 เพิ่มเว็บแอปแรกของคุณ"** ให้แอดมินเริ่มเพิ่มแอปได้ทันที
4. **ระบบจัดการแอป (Admin Mode):**
   - ล็อกด้วยรหัส PIN (รหัสเริ่มต้น: `8055`)
   - เพิ่ม, แก้ไข, ลบ และสลับสถานะเปิดใช้งาน/ปิดปรับปรุงของแอปได้อิสระ
   - มีไอคอนอิโมจิธรรมชาติสำเร็จรูปให้เลือก หรือใส่ลิงก์รูปภาพไอคอนภายนอก
5. **Cloud Sync (Google Sheets & Google Apps Script):**
   - มีโฟลเดอร์แบ็กเอนด์ `gas/` ที่สร้างโฟลเดอร์ `Mizuiku` และสเปรดชีต `Mizuiku_Database` ใน Google Drive อัตโนมัติ
   - ซิงค์ข้อมูลสดทุกเครื่องแบบเรียลไทม์ พร้อมระบบบันทึกในเครื่อง (LocalStorage) เป็นตัวสำรอง
6. **มาตรฐานวันที่ไทย พ.ศ. (dd/mm/yyyy):**
   - แสดงวันที่ตามปฏิทินไทย พ.ศ. ถูกต้องตามมาตรฐาน
7. **Responsive Header:**
   - แถบหัวข้อบนมือถือแนวตั้งล็อกไว้บรรทัดเดียว (`white-space: nowrap`) ไม่ตัดบรรทัดตกหล่น
8. **PWA (Progressive Web App):**
   - มีไฟล์ `manifest.json`, `sw.js` และ Apple Mobile Web App tags พร้อมติดตั้งลงหน้าจอโฮมเป็นแอปเต็มจอได้ทันที

---

## 📁 โครงสร้างโปรเจกต์

```
mizuiku/
├── index.html        # โค้ดเว็บแอปหลัก หน้าจอ UI ธีมสายน้ำและธรรมชาติ
├── manifest.json     # การตั้งค่า PWA และไอคอนแอป
├── sw.js             # Service Worker สำหรับ Caching และ Offline support
├── README.md         # เอกสารคู่มือการใช้งาน
└── gas/
    ├── Code.js       # โค้ด Google Apps Script Cloud Backend API
    ├── appsscript.json # การตั้งค่า Apps Script Web App
    └── README.md     # คู่มือการติดตั้ง Google Apps Script แบบละเอียด
```

---

## 🚀 วิธีการนำขึ้น GitHub Pages (เช่น `https://bosu-nsoq.github.io/mizuiku/`)

1. สร้าง Repository ใหม่บน GitHub ชื่อ `mizuiku`
2. อัปโหลดไฟล์ในโฟลเดอร์นี้ (`index.html`, `manifest.json`, `sw.js`, `README.md`) ไปยัง Repository
3. ไปที่แท็บ **Settings** > **Pages** บน GitHub
4. ในส่วน **Build and deployment** ให้เลือก Branch เป็น `main` แล้วกด **Save**
5. รอประมาณ 1-2 นาที คุณจะได้ลิงก์ `https://bosu-nsoq.github.io/mizuiku/` สำหรับเข้าใช้งานได้ทันที!

---

## ☁️ การเชื่อมต่อ Cloud Backend (Google Apps Script)

1. เข้าไปที่ [Google Apps Script](https://script.google.com/home/start) แล้วสร้างโปรเจกต์ใหม่ชื่อ `Mizuiku_Backend`
2. นำโค้ดในไฟล์ `gas/Code.js` ไปวางแล้วกดบันทึก
3. เลือกฟังก์ชัน **`initMizuikuDatabase`** แล้วกด **"เรียกใช้" (Run)** เพื่อให้ระบบสร้างโฟลเดอร์ `Mizuiku` และไฟล์ชีต `Mizuiku_Database` ใน Google Drive
4. กด **Deploy** > **New deployment** > เลือกประเภท **Web app** > ตั้งค่า Who has access เป็น **Anyone**
5. คัดลอก **Web App URL** มาใส่ในปุ่ม **"ตั้งค่า Cloud"** บนหน้าเว็บแอป Mizuiku ข้อมูลจะซิงค์กันสดๆ ทันทีครับ!
