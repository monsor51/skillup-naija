const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const DB_PATH = path.join(__dirname, "data", "skillup.db");
const DATA_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref TEXT UNIQUE NOT NULL,
      surname TEXT,
      firstName TEXT,
      middleName TEXT,
      address TEXT,
      stateOfOrigin TEXT,
      nationality TEXT,
      religion TEXT,
      sex TEXT,
      phone TEXT,
      email TEXT,
      officerName TEXT,
      officerPhone TEXT,
      course TEXT,
      consent INTEGER DEFAULT 0,
      paid INTEGER DEFAULT 0,
      submittedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      password_hash TEXT NOT NULL
    );
  `);

  const row = db.prepare("SELECT * FROM admin WHERE id = 1").get();
  if (!row) {
    const adminPw = process.env.ADMIN_PASSWORD || "skillup2026";
    const hash = bcrypt.hashSync(adminPw, 10);
    db.prepare("INSERT INTO admin (id, password_hash) VALUES (1, ?)").run(hash);
    console.log("Admin password initialized in SQLite.");
  }
}
initDb();

function normalizeRegistration(data) {
  return {
    id: Number(data.id) || null,
    ref: String(data.ref || ("SU" + Date.now().toString(36).toUpperCase())),
    surname: String(data.surname || "").trim(),
    firstName: String(data.firstName || "").trim(),
    middleName: String(data.middleName || "").trim(),
    address: String(data.address || "").trim(),
    stateOfOrigin: String(data.stateOfOrigin || "").trim(),
    nationality: String(data.nationality || "").trim(),
    religion: String(data.religion || "").trim(),
    sex: String(data.sex || "").trim(),
    phone: String(data.phone || "").trim(),
    email: String(data.email || "").trim(),
    officerName: String(data.officerName || "").trim(),
    officerPhone: String(data.officerPhone || "").trim(),
    course: String(data.course || "").trim(),
    consent: !!data.consent,
    paid: !!data.paid,
    submittedAt: data.submittedAt || new Date().toISOString()
  };
}

function csvEscape(value) {
  const v = value == null ? "" : String(value);
  return `"${v.replace(/"/g, '""')}"`;
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ ok: false, message: "Unauthorized" });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    }
  })
);

// Email setup (optional)
const SEND_EMAILS = String(process.env.SEND_EMAILS || "false").toLowerCase() === "true";
let mailer = null;
if (SEND_EMAILS) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("SEND_EMAILS enabled but SMTP settings are incomplete. Emails will be disabled.");
  } else {
    mailer = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass }
    });
    mailer.verify().then(() => console.log("SMTP transporter ready")).catch(err => {
      console.warn("SMTP verify failed:", err && err.message ? err.message : err);
      mailer = null;
    });
  }
}

// Public: courses
app.get("/api/courses", (req, res) => {
  const courses = [
    { id: 1, title: "Crane Operation", category: "Technical", icon: "🏗️" },
    { id: 2, title: "Excavator Operation", category: "Technical", icon: "🚜" },
    { id: 3, title: "Forklift Operation", category: "Technical", icon: "🏭" },
    { id: 4, title: "Onshore/Offshore Rigging", category: "Technical", icon: "⚓" },
    { id: 5, title: "Electrical Installation", category: "Technical", icon: "⚡" },
    { id: 6, title: "HSE (1,2 & 3)", category: "Technical", icon: "🦺" },
    { id: 7, title: "Solar PV Installation", category: "Technical", icon: "☀️" },
    { id: 8, title: "Catering and Hospitality", category: "Vocational", icon: "🍽️" },
    { id: 9, title: "Fashion Design / Garment Making", category: "Vocational", icon: "✂️" },
    { id: 10, title: "Make Up / Gele Craft", category: "Vocational", icon: "💄" },
    { id: 11, title: "Hair Dressing / Hair Styling", category: "Vocational", icon: "💇" },
    { id: 12, title: "Computer Hardware / GSM Repairs", category: "Vocational", icon: "📱" },
    { id: 13, title: "Live Stock Farming", category: "Vocational", icon: "🐓" },
    { id: 14, title: "AI Application / Prompt Engineering", category: "Digital", icon: "🤖" },
    { id: 15, title: "AI Automation", category: "Digital", icon: "⚙️" },
    { id: 16, title: "Content Creation", category: "Digital", icon: "🎬" },
    { id: 17, title: "Web Development", category: "Digital", icon: "💻" },
    { id: 18, title: "Cyber Security", category: "Digital", icon: "🔐" },
    { id: 19, title: "Video Editing", category: "Digital", icon: "🎥" }
  ];
  res.json({ ok: true, courses });
});

// Public: register
app.post("/api/register", async (req, res) => {
  const payload = normalizeRegistration(req.body);
  const required = ["surname","firstName","address","stateOfOrigin","nationality","sex","phone","course"];
  const missing = required.find(k => !payload[k] || String(payload[k]).trim() === "");
  if (missing) return res.status(400).json({ ok: false, message: `Missing ${missing}` });
  if (!payload.consent) return res.status(400).json({ ok: false, message: "Consent required" });

  const duplicate = db.prepare(`SELECT id FROM registrations WHERE phone = ? AND course = ?`).get(payload.phone, payload.course);
  if (duplicate) return res.status(409).json({ ok: false, message: "Duplicate registration" });

  const stmt = db.prepare(`INSERT INTO registrations (
    ref, surname, firstName, middleName, address, stateOfOrigin, nationality, religion,
    sex, phone, email, officerName, officerPhone, course, consent, paid, submittedAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  stmt.run(
    payload.ref,
    payload.surname,
    payload.firstName,
    payload.middleName,
    payload.address,
    payload.stateOfOrigin,
    payload.nationality,
    payload.religion,
    payload.sex,
    payload.phone,
    payload.email,
    payload.officerName,
    payload.officerPhone,
    payload.course,
    payload.consent ? 1 : 0,
    payload.paid ? 1 : 0,
    payload.submittedAt
  );

  // fire-and-forget email notifications
  (async () => {
    if (!mailer) return;
    try {
      if (payload.email) {
        const userSubject = `SkillUp NAIJA — Registration Received (${payload.ref})`;
        const userText = `Hello ${payload.firstName} ${payload.surname},\n\nThank you for registering for "${payload.course}" at SkillUp NAIJA.\nReference: ${payload.ref}\n\nTraining details:\n- Dates: 14 July – 14 August 2026\n- Time: 2:30 PM – 5:00 PM Daily\n- Venue: State Primary School, inside St. Mary Catholic Church, by Lagos Bus Stop, Aggrey Rd., Port Harcourt\n\nPayment:\n- Registration fee: ₦4,500 (pay on first day)\n- Bank: UBA Bank — 1025204086\n- Account Name: SkillUp Naija\n\nIf you have any questions reply to this email or call 08072487234.\n\nRegards,\nSkillUp NAIJA\n`;

        await mailer.sendMail({
          from: process.env.EMAIL_FROM || '"SkillUp NAIJA" <no-reply@skillupnaija.org>',
          to: payload.email,
          subject: userSubject,
          text: userText
        });
        console.log(`Confirmation email sent to ${payload.email}`);
      }

      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
      if (adminEmail) {
        const adminSubject = `New registration: ${payload.course} — ${payload.surname} ${payload.firstName} (${payload.phone})`;
        const adminText = `New registration received:\n\nRef: ${payload.ref}\nName: ${payload.surname} ${payload.firstName}\nPhone: ${payload.phone}\nEmail: ${payload.email || '-'}\nSkill: ${payload.course}\nSubmitted: ${payload.submittedAt}\n\nView in admin dashboard to manage payment status.`;
        await mailer.sendMail({ from: process.env.EMAIL_FROM || '"SkillUp NAIJA" <no-reply@skillupnaija.org>', to: adminEmail, subject: adminSubject, text: adminText });
        console.log(`Admin notification sent to ${adminEmail}`);
      }
    } catch (err) {
      console.error("Error sending email(s):", err && err.message ? err.message : err);
    }
  })();

  res.status(201).json({ ok: true, message: "Registration successful", registration: payload });
});

// Admin: login
app.post("/api/admin/login", async (req, res) => {
  const password = String(req.body.password || "").trim();
  if (!password) return res.status(400).json({ ok: false, message: "Password required" });
  const row = db.prepare("SELECT password_hash FROM admin WHERE id = 1").get();
  const ok = row && await bcrypt.compare(password, row.password_hash);
  if (!ok) return res.status(401).json({ ok: false, message: "Invalid password" });
  req.session.isAdmin = true;
  res.json({ ok: true, message: "Login successful" });
});

// Admin session check
app.get("/api/admin/session", (req, res) => {
  res.json({ loggedIn: !!(req.session && req.session.isAdmin) });
});

// Admin logout
app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => res.json({ ok: true, message: "Logged out" }));
});

// Admin: list registrations
app.get("/api/admin/registrations", requireAdmin, (req, res) => {
  const search = (req.query.search || "").toLowerCase().trim();
  const course = (req.query.course || "").trim();
  const paid = (req.query.paid || "").trim();

  let sql = `SELECT * FROM registrations WHERE 1 = 1`;
  const params = [];
  if (search) {
    sql += ` AND (LOWER(COALESCE(surname, '')) || ' ' || LOWER(COALESCE(firstName, '')) || ' ' || LOWER(COALESCE(phone, '')) || ' ' || LOWER(COALESCE(course, ''))) LIKE ?`;
    params.push(`%${search}%`);
  }
  if (course) { sql += ` AND course = ?`; params.push(course); }
  if (paid === "paid") sql += ` AND paid = 1`;
  if (paid === "unpaid") sql += ` AND paid = 0`;
  sql += ` ORDER BY id DESC`;

  const rows = db.prepare(sql).all(...params);
  res.json({ ok: true, registrations: rows.map(r => ({ ...r, consent: !!r.consent, paid: !!r.paid })) });
});

// Admin: update paid status
app.patch("/api/admin/registrations/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { paid } = req.body;
  const info = db.prepare("UPDATE registrations SET paid = ? WHERE id = ?").run(paid ? 1 : 0, id);
  if (info.changes === 0) return res.status(404).json({ ok: false, message: "Registration not found" });
  const row = db.prepare("SELECT * FROM registrations WHERE id = ?").get(id);
  res.json({ ok: true, registration: row });
});

// Admin: delete registration
app.delete("/api/admin/registrations/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM registrations WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ ok: false, message: "Registration not found" });
  res.json({ ok: true, message: "Deleted" });
});

// Admin: export CSV
app.get("/api/admin/export.csv", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM registrations ORDER BY id DESC").all();
  const headers = ["Surname","First Name","Middle Name","Sex","Phone","Email","Address","State of Origin","Nationality","Religion","Officer Name","Officer Phone","Skill","Paid","Submitted At"];
  const csvRows = rows.map(r => [r.surname || "", r.firstName || "", r.middleName || "", r.sex || "", r.phone || "", r.email || "", r.address || "", r.stateOfOrigin || "", r.nationality || "", r.religion || "", r.officerName || "", r.officerPhone || "", r.course || "", r.paid ? "Yes" : "No", r.submittedAt || ""]);
  const csv = [headers, ...csvRows].map(row => row.map(csvEscape).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="skillup-registrations-${Date.now()}.csv"`);
  res.send(csv);
});

app.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));
