# Mizuiku Cloud Backend (Google Apps Script)

ระบบ Cloud Sync สำหรับเว็บแอป **Mizuiku** (สายน้ำและธรรมชาติ Hub) เชื่อมโยงข้อมูลเว็บแอปข้ามทุกอุปกรณ์อัตโนมัติ โดยบันทึกลงใน Google Drive และ Google Sheets

---

## 🌊 สรุปโครงสร้างระบบ:
1. **Google Drive:** สร้างโฟลเดอร์ชื่อ `Mizuiku` ให้อัตโนมัติ
2. **Google Sheets:** สร้างสเปรดชีตชื่อ `Mizuiku_Database` เก็บไว้ในโฟลเดอร์ `Mizuiku`
3. **Google Apps Script:** เชื่อมต่อเป็น Web App API คอยรับคำขอ Read (GET) และ Sync/Save (POST) ป้องกันข้อมูลชนกันด้วย ScriptLock

---

## 🚀 ขั้นตอนการติดตั้งและเริ่มใช้งาน (One-time Setup):

1. ไปที่ [Google Apps Script](https://script.google.com/home/start) แล้วคลิก **"โปรเจกต์ใหม่" (New Project)**
2. ตั้งชื่อโปรเจกต์ที่มุมซ้ายบนว่า **`Mizuiku_Backend`**
3. คัดลอกโค้ดจากไฟล์ `Code.js` ในโฟลเดอร์นี้ ไปวางทับโค้ดในโปรเจกต์ Apps Script ทั้งหมด แล้วกดบันทึก (Ctrl + S)
4. ด้านบนตรงช่องเลือกฟังก์ชัน ให้เลือก **`initMizuikuDatabase`**
5. กดปุ่ม **"เรียกใช้" (Run)**
6. Google จะแสดงหน้าต่างแจ้งขอสิทธิ์การเข้าถึง (Google Drive & Google Sheets):
   - คลิก **ตรวจสอบสิทธิ์ (Review Permissions)**
   - เลือกบัญชี Google ของท่าน
   - คลิก **ขั้นสูง (Advanced)** ➔ คลิก **ไปยัง Mizuiku_Backend (ไม่ปลอดภัย) / Go to Mizuiku_Backend (unsafe)**
   - คลิก **อนุญาต (Allow)**
7. เมื่อรันเสร็จ ใน Execution Log ด้านล่างจะแสดงลิงก์โฟลเดอร์ `Mizuiku` และสเปรดชีต `Mizuiku_Database` ทันที!
8. **การเผยแพร่เป็น Web App (Deploy):**
   - คลิกปุ่มสีน้ำเงิน **"ทำให้ใช้งานได้" (Deploy)** > **"การทำให้ใช้งานได้รายการใหม่" (New deployment)**
   - ตรงไอคอนฟันเฟือง เลือกประเภทเป็น **"เว็บแอป" (Web app)**
   - คำอธิบาย: `v1.0.0`
   - เรียกใช้ในฐานะ (Execute as): **ฉัน (บัญชีของคุณเอง)**
   - ผู้ที่มีสิทธิ์เข้าถึง (Who has access): **ทุกคน (Anyone)** *(สำคัญมาก เพื่อให้เว็บแอปเรียกดูข้อมูลได้)*
   - กด **"ทำให้ใช้งานได้" (Deploy)**
9. คัดลอก **URL เว็บแอป (Web App URL)** ที่ได้ นำไปใส่ในช่องตั้งค่า Cloud ของแอป Mizuiku เพื่อให้ซิงค์ข้อมูลสดทันทีครับ!
