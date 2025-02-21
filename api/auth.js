const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cors = require('cors');
const winston = require('winston');
const { Pool } = require('pg');

const app = express();

// Настройка Winston для логирования в файл (или консоль)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'auth.log' }),
    new winston.transports.Console()
  ]
});

// Настройка CORS
const corsOptions = {
    origin: '*', // Разрешить все источники
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

const SECRET_KEY = process.env.SECRET_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ALLOWED_DOMAINS = process.env.ALLOWED_DOMAINS?.split(',') || [];

// Создание пула подключений к Postgres
const pool = new Pool({
  host: process.env.PG_HOST || '193.228.139.199',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER,       // задайте в переменных окружения или напрямую
  password: process.env.PG_PASSWORD, // задайте в переменных окружения или напрямую
  database: process.env.PG_DATABASE  // задайте в переменных окружения или напрямую
});

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
      return res.redirect('https://richmom.vercel.app/denied.html?reason=invalid_source');
    }

    /*
    // 2. Проверка домена
    const decodedSource = decodeURIComponent(source);
    const targetDomain = new URL(decodedSource).hostname;
    if (!ALLOWED_DOMAINS.includes(targetDomain)) {
      return res.redirect('https://richmom.vercel.app/denied.html?reason=unauthorized_domain');
    }
    */

    // 3. Проверка подписи Telegram
    const dataCheckArr = [];
    for (const key in authData) {
      if (key !== 'hash' && authData[key] !== '') {
        dataCheckArr.push(`${key}=${authData[key]}`);
      }
    }
    dataCheckArr.sort();
    
    console.log(`dataTG: ${dataCheckArr}`);

    // Логирование начала попытки верификации
    logger.info('Попытка верификации', {
      time: currentDate.toISOString(),
      dataTG: dataCheckArr
    });

    const secretKey = crypto.createHash('sha256')
      .update(BOT_TOKEN)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckArr.join('\n'))
      .digest('hex');

    if (computedHash !== authData.hash) {
      return res.redirect('https://richmom.vercel.app/denied.html?reason=invalid_hash');
    }

    // 4. Проверка пользователя через базу данных Postgres
    const userId = authData.id?.toString();
    if (!userId) {
      console.log('User ID отсутствует');
      return res.redirect('https://richmom.vercel.app/denied.html?reason=unauthorized_user');
    }

    let user;
    try {
      // Ищем пользователя в таблице users
      const result = await pool.query('SELECT id, role FROM users WHERE id = $1', [userId]);
      if (result.rows.length === 0) {
        // Если пользователь отсутствует, добавляем его с ролью guest
        const insertResult = await pool.query(
          'INSERT INTO users (id, role) VALUES ($1, $2) RETURNING id, role',
          [userId, 'guest']
        );
        user = insertResult.rows[0];
      } else {
        user = result.rows[0];
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.redirect('https://richmom.vercel.app/denied.html?reason=server_error');
    }

    // 5. Генерация JWT с ролью из базы
    const token = jwt.sign(
      {
        id: userId,
        role: user.role,
        username: authData.username,
        first_name: authData.first_name,
        photo_url: authData.photo_url || generateDefaultAvatar(authData.id),
      },
      SECRET_KEY,
      { expiresIn: '10y' }
    );

    // Вспомогательная функция для генерации аватара
    function generateDefaultAvatar(userId) {
      return `https://ui-avatars.com/api/?name=${userId}&background=random&size=128`;
    }

    // 6. Перенаправление с добавлением токена в query-параметры
    const redirectUrl = new URL(decodedSource);
    redirectUrl.searchParams.set('token', token);
    res.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('Auth error:', error);
    res.redirect('https://richmom.vercel.app/denied.html?reason=server_error');
  }
});

module.exports = app;