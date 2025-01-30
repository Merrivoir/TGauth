const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const SECRET_KEY = process.env.SECRET_KEY; 
const BOT_TOKEN = process.env.BOT_TOKEN; 

// Обработка GET-запроса
app.get('/auth', async (req, res) => {
  try {
    const authData = req.query;

    // Проверка подписи Telegram
    const dataCheckArr = [];
    for (const key in authData) {
      if (key !== 'hash' && authData[key] !== '') {
        dataCheckArr.push(`${key}=${authData[key]}`);
      }
    }
    dataCheckArr.sort();

    const secretKey = crypto.createHash('sha256')
      .update(BOT_TOKEN)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckArr.join('\n'))
      .digest('hex');

    if (computedHash !== authData.hash) {
      return res.status(403).send('Invalid hash');
    }

    // Создание JWT
    const token = jwt.sign(
      { id: authData.id }, 
      SECRET_KEY, 
      { expiresIn: '1h' }
    );

    // Перенаправление с токеном
    res.redirect(`/dashboard?token=${token}`);

  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).send('Server error');
  }
});

module.exports = app;