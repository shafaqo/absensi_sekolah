/**
 * Copyright (c) shafaqo
 * SISTEM ABSENSI SD TAFDHIL AL QUR'AN - BACKEND ULTIMATE (V6 - TENDIK, IZIN ADVANCED & AUDIO NOTIF)
 * File ini mengatur komunikasi database antara frontend (HTML) dan Google Spreadsheet.
 */

// Fungsi untuk membuat dan memastikan semua tabel yang dibutuhkan ada di Spreadsheet
function setupSheets() {
  // Mengambil akses ke file Spreadsheet yang aktif saat ini
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Mendefinisikan kerangka tabel (Nama Sheet beserta kolom headernya)
  const tables = {
    // Tabel pengguna kini mendukung role 'tendik' selain 'guru' dan 'admin'
    'Users': ['id', 'name', 'username', 'password', 'role', 'subjects'],
    // Tabel Kelas dan Mapel mendukung pembagian Shift Pagi/Sore
    'Classes': ['id', 'name', 'shift'], 
    'Subjects': ['id', 'name', 'shift'], 
    // Tabel jadwal pelajaran
    'Schedules': ['id', 'classId', 'teacherId', 'subjectId', 'day', 'startTime', 'endTime', 'type', 'desc'],
    // Tabel penugasan piket guru
    'Pickets': ['id', 'userId', 'day', 'shift'], 
    // Tabel rekapan absensi harian (shift bisa berisi 'Pagi', 'Sore', atau 'Tendik')
    'Attendance': ['id', 'userId', 'date', 'shift', 'timeIn', 'timeOut', 'location', 'status', 'disiplin'], 
    // PERUBAHAN V6: Tabel Izin diperbarui untuk mendukung rentang waktu (tanggal dan jam)
    'Izin': ['id', 'userId', 'type', 'startDate', 'endDate', 'startTime', 'endTime', 'reason', 'status', 'substituteId'],
    // Tabel pengaturan aplikasi
    'Settings': ['key', 'value']
  };

  // Melakukan perulangan untuk mengecek setiap nama sheet di dalam array tables
  for (const sheetName in tables) {
    // Cek apakah sheet sudah ada di file Spreadsheet
    let sheet = ss.getSheetByName(sheetName);
    // Jika sheet belum ada, maka buat sheet baru
    if (!sheet) {
      sheet = ss.insertSheet(sheetName); // Membuat sheet
      sheet.appendRow(tables[sheetName]); // Menambahkan baris pertama sebagai Header

      // Membuat data bawaan (dummy) agar aplikasi tidak error saat pertama kali dijalankan
      if (sheetName === 'Users') sheet.appendRow(['u_admin', 'Administrator', 'admin', 'admin123', 'admin', 'ALL']);
      if (sheetName === 'Classes') sheet.appendRow(['c_1', 'Kelas 1A', 'Pagi']);
      if (sheetName === 'Subjects') sheet.appendRow(['s_1', 'Tematik', 'Pagi']);
      
      // Mengisi nilai default (bawaan) untuk tabel Settings
      if (sheetName === 'Settings') {
        sheet.appendRow(['lat', '']); // Latitude GPS sekolah
        sheet.appendRow(['lng', '']); // Longitude GPS sekolah
        sheet.appendRow(['radius', '100']); // Radius toleransi jarak absen dalam meter
        
        // PERUBAHAN V6: Menambahkan jam masuk/pulang khusus untuk Tendik (Staff)
        const dailyTimes = {
          'Senin': { pagiIn: '07:30', pagiOut: '12:00', soreIn: '14:00', soreOut: '17:30', tendikIn: '07:30', tendikOut: '16:00' },
          'Selasa': { pagiIn: '07:30', pagiOut: '12:00', soreIn: '14:00', soreOut: '17:30', tendikIn: '07:30', tendikOut: '16:00' },
          'Rabu': { pagiIn: '07:30', pagiOut: '12:00', soreIn: '14:00', soreOut: '17:30', tendikIn: '07:30', tendikOut: '16:00' },
          'Kamis': { pagiIn: '07:30', pagiOut: '12:00', soreIn: '14:00', soreOut: '17:30', tendikIn: '07:30', tendikOut: '16:00' },
          'Jumat': { pagiIn: '07:30', pagiOut: '11:00', soreIn: '14:00', soreOut: '17:30', tendikIn: '07:30', tendikOut: '11:30' },
          'Sabtu': { pagiIn: '07:30', pagiOut: '12:00', soreIn: '', soreOut: '', tendikIn: '07:30', tendikOut: '13:00' },
          'Minggu': { pagiIn: '', pagiOut: '', soreIn: '', soreOut: '', tendikIn: '', tendikOut: '' }
        };
        sheet.appendRow(['daily_times', JSON.stringify(dailyTimes)]); // Simpan sebagai format JSON
        sheet.appendRow(['piket_early', '15']); // Durasi kewajiban datang lebih awal bagi yang piket (menit)
        sheet.appendRow(['piket_late', '15']); // Durasi kewajiban pulang terlambat bagi yang piket (menit)

        // Konfigurasi AI Penyusun Jadwal dipisah antara Pagi dan Sore
        const rosterCfg = {
          'Pagi': { slotDuration: 40, days: {'Senin': {start: '08:00', end: '12:00'}, 'Selasa': {start: '08:00', end: '12:00'}}, breaks: [{start: '10:00', end: '10:30'}] },
          'Sore': { slotDuration: 40, days: {'Senin': {start: '14:30', end: '17:30'}, 'Selasa': {start: '14:30', end: '17:30'}}, breaks: [{start: '16:00', end: '16:15'}] }
        };
        sheet.appendRow(['roster_config', JSON.stringify(rosterCfg)]); // Simpan sebagai format JSON
      }
    }
  }
  // Mengembalikan objek spreadsheet yang telah dipersiapkan
  return ss;
}

// Fungsi bawaan Google untuk menangani request metode GET (Menarik Data)
function doGet(e) {
  // Panggil fungsi penyiapan untuk memastikan struktur tabel aman
  const ss = setupSheets();
  
  // Jika frontend mengirim parameter action='get_data', kita kirim seluruh database
  if (e.parameter.action === 'get_data') {
    const responseData = {
      users: getSheetData(ss, 'Users'),
      classes: getSheetData(ss, 'Classes'),
      subjects: getSheetData(ss, 'Subjects'),
      schedules: getSheetData(ss, 'Schedules'),
      pickets: getSheetData(ss, 'Pickets'),
      attendance: getSheetData(ss, 'Attendance'),
      izin: getSheetData(ss, 'Izin'),
      settings: getSettingsData(ss)
    };
    // Mengembalikan data dalam format JSON Text agar mudah dibaca Javascript Frontend
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: responseData })).setMimeType(ContentService.MimeType.JSON);
  }
  // Pesan default jika API dibuka langsung di browser
  return ContentService.createTextOutput("API V6 (Tendik & Izin Advanced) Running by shafaqo.");
}

// Fungsi bawaan Google untuk menangani request metode POST (Menyimpan/Mengubah Data)
function doPost(e) {
  try {
    const ss = setupSheets(); // Ambil Spreadsheet
    const payload = JSON.parse(e.postData.contents); // Terjemahkan paket data yang dikirim frontend
    const action = payload.action; // Identifikasi jenis perintah
    const data = payload.data; // Isi data aktualnya

    // Logika pengalihan (Routing) berdasarkan action yang diminta
    if (action === 'save_user') saveOrUpdateRow(ss, 'Users', data); // Menyimpan Akun (Guru/Tendik)
    else if (action === 'delete_user') {
      deleteRowById(ss, 'Users', data.id); // Hapus akun
      deleteRowsByColumn(ss, 'Schedules', 2, data.id); // Hapus jadwal mengajar miliknya
      deleteRowsByColumn(ss, 'Pickets', 1, data.id); // Hapus jadwal piket miliknya
    }

    else if (action === 'save_class') saveOrUpdateRow(ss, 'Classes', data); // Simpan kelas
    else if (action === 'delete_class') {
      deleteRowById(ss, 'Classes', data.id); // Hapus kelas
      deleteRowsByColumn(ss, 'Schedules', 1, data.id); // Hapus jadwal di kelas tersebut
    }

    else if (action === 'save_subject') saveOrUpdateRow(ss, 'Subjects', data); // Simpan Mapel
    else if (action === 'delete_subject') {
      deleteRowById(ss, 'Subjects', data.id); // Hapus Mapel
      deleteRowsByColumn(ss, 'Schedules', 3, data.id); // Hapus pelajaran ini dari jadwal manapun
    }

    else if (action === 'save_jadwal') saveOrUpdateRow(ss, 'Schedules', data); // Simpan 1 slot jadwal
    else if (action === 'delete_jadwal') deleteRowById(ss, 'Schedules', data.id); // Hapus 1 slot jadwal
    else if (action === 'bulk_save_jadwal') data.forEach(item => { saveOrUpdateRow(ss, 'Schedules', item); }); // Simpan jadwal hasil generate AI sekaligus
    
    else if (action === 'save_piket') saveOrUpdateRow(ss, 'Pickets', data); // Simpan 1 penugasan piket
    else if (action === 'delete_piket') deleteRowById(ss, 'Pickets', data.id); // Hapus piket
    else if (action === 'bulk_save_piket') data.forEach(item => { saveOrUpdateRow(ss, 'Pickets', item); }); // Simpan piket otomatis

    else if (action === 'save_absen') saveOrUpdateRow(ss, 'Attendance', data); // Catat absensi masuk/keluar
    else if (action === 'save_izin') saveOrUpdateRow(ss, 'Izin', data); // Catat permohonan/keputusan izin
    else if (action === 'delete_izin') deleteRowById(ss, 'Izin', data.id); // Hapus permohonan izin
    else if (action === 'save_settings') saveSettingsData(ss, data); // Simpan konfigurasi jam dan GPS

    // Kirim konfirmasi berhasil ke aplikasi frontend
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    // Tangkap error jika ada kesalahan script
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ======================== FUNGSI-FUNGSI UTILITAS BANTUAN ========================

// Mengambil seluruh data dari sebuah Sheet menjadi bentuk Array of Objects
function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getDisplayValues(); // getDisplayValues mencegah format jam/tanggal menjadi kacau
  if (data.length <= 1) return []; // Jika hanya ada header, kembalikan array kosong
  const headers = data[0]; 
  const result = [];
  // Mulai baca dari baris kedua (index 1)
  for (let i = 1; i < data.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = String(data[i][j]); // Pasangkan Header dengan nilainya
    result.push(obj); 
  }
  return result; 
}

// Khusus membaca tabel Setting yang berbentuk Vertikal (Key - Value)
function getSettingsData(ss) {
  const sheet = ss.getSheetByName('Settings');
  const data = sheet.getDataRange().getDisplayValues(); 
  const obj = {};
  for (let i = 1; i < data.length; i++) obj[data[i][0]] = String(data[i][1]); // Kolom 1 jadi Kunci, Kolom 2 jadi Nilai
  return obj;
}

// Khusus menyimpan tabel Setting (Mencocokkan Key dan menimpa Valuenya)
function saveSettingsData(ss, objData) {
  const sheet = ss.getSheetByName('Settings');
  const data = sheet.getDataRange().getValues(); 
  for (let i = 1; i < data.length; i++) {
    let key = data[i][0];
    if (objData[key] !== undefined) sheet.getRange(i + 1, 2).setValue(objData[key]); // Timpa kolom kedua
  }
}

// Fungsi pintar: Mencari data berdasarkan ID. Jika ketemu di-Update, jika tidak ketemu di-Tambah Baru (Append)
function saveOrUpdateRow(ss, sheetName, objData) {
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0]; 
  // Susun data array sesuai urutan header tabel
  const rowData = headers.map(h => objData[h] !== undefined ? objData[h] : "");
  let rowIndex = -1; 
  // Cari baris yang punya ID yang sama
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == objData.id) { rowIndex = i + 1; break; }
  }
  // Eksekusi Update atau Insert
  if (rowIndex > -1) sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowData]);
  else sheet.appendRow(rowData);
}

// Menghapus 1 baris tepat berdasarkan kolom ID (Kolom ke-1)
function deleteRowById(ss, sheetName, id) {
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) { if (data[i][0] == id) { sheet.deleteRow(i + 1); break; } }
}

// Menghapus banyak baris yang cocok dengan kriteria (Contoh: Hapus semua mapel Matematika di jadwal)
function deleteRowsByColumn(ss, sheetName, colIndex, value) {
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  // Loop dari bawah ke atas agar nomor index baris tidak bergeser saat ada yang dihapus
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][colIndex] == value) sheet.deleteRow(i + 1);
  }
}
