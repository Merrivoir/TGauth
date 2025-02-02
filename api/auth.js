const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cors = require('cors');

const app = express();

// Настройка CORS
const corsOptions = {
    origin: 'merrivoir.github.io/staff', // Разрешить все источники
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

const SECRET_KEY = process.env.SECRET_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ALLOWED_DOMAINS = process.env.ALLOWED_DOMAINS?.split(',') || [];
const ALLOWED_IDS = process.env.ALLOWED_IDS?.split(',')?.reduce((acc, pair) => {
  const [id, role] = pair.split(':').map(s => s.trim());
  if (id) acc[id] = role || 'user';
  return acc;
}, {}) || {};

const isValidHttpUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

app.get('/auth', async (req, res) => {
  try {
    const { source, ...authData } = req.query;

    // 1. Проверка source
    if (!source || !isValidHttpUrl(decodeURIComponent(source))) {
      return res.redirect('https://richmom.vercel.app/denied?reason=invalid_source');
    }

    // 2. Проверка домена
    const decodedSource = decodeURIComponent(source);
    const targetDomain = new URL(decodedSource).hostname;
    if (!ALLOWED_DOMAINS.includes(targetDomain)) {
      return res.redirect('https://richmom.vercel.app/denied?reason=unauthorized_domain');
    }

    // 3. Проверка подписи Telegram
    const dataCheckArr = [];
    for (const key in authData) {
      if (key !== 'hash' && authData[key] !== '') {
        dataCheckArr.push(`${key}=${authData[key]}`);
      }
    }
    dataCheckArr.sort();
    
    console.log(`dataTG: ${dataCheckArr}`)

    const secretKey = crypto.createHash('sha256')
      .update(BOT_TOKEN)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckArr.join('\n'))
      .digest('hex');

    if (computedHash !== authData.hash) {
      return res.redirect('https://richmom.vercel.app/denied?reason=invalid_hash');
    }

    // 4. Проверка ALLOWED_IDS
    const userId = authData.id?.toString();
    if (!userId || !ALLOWED_IDS[userId]) {
      console.log(`Access denied for ID: ${userId}`);
      return res.redirect('https://richmom.vercel.app/denied?reason=unauthorized_user');
    }

    // 5. Генерация JWT
    const token = jwt.sign(
      {
        id: userId,
        role: ALLOWED_IDS[userId] || "user",
        username: authData.username
      },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    // 6. Перенаправление
    const redirectUrl = new URL(decodedSource);
    redirectUrl.searchParams.set('token', token);
    res.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('Auth error:', error);
    res.redirect('https://richmom.vercel.app/denied?reason=server_error');
  }
});

module.exports = app;