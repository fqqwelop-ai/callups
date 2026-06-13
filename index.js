require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const dashboardRoutes = require('./dashboard/routes');
const adminRoutes = require('./admin/routes');
const { startAllBots } = require('./bot/botManager');

const app = express();
const PORT = process.env.PORT || 8080;

app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));

// ===== Session (قبل كل شي) =====
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }
}));

// ===== API Routes (قبل الـ static files) =====
app.use('/api', dashboardRoutes);
app.use('/admin/api', adminRoutes);

// ===== Static Files =====
app.use(express.static(path.join(__dirname, 'public')));

// ===== Frontend Pages =====
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== Connect MongoDB & Start =====
async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    await startAllBots();
    app.listen(PORT, () => {
      console.log(`🌐 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Startup error:', err);
    process.exit(1);
  }
}

main();
