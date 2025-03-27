const express = require('express');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const { Pool } = require('pg');

const app = express();

// Настройка Winston для логирования в файл (или консоль)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'verification.log' }),
    new winston.transports.Console()
  ]
});

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Или укажите конкретный домен
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Создание пула подключений к Postgres
const pool = new Pool({
  host: process.env.PG_HOST || '193.228.139.199',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER,         // задайте в переменных окружения
  password: process.env.PG_PASSWORD, // задайте в переменных окружения
  database: process.env.PG_DATABASE  // задайте в переменных окружения
});

// Функция для проверки пользователя через базу данных
const checkUserInDatabase = async (id) => {
  try {
    const result = await pool.query(`
      SELECT u.role as role, t.team as team, t.id as trainer
      FROM users u
      LEFT JOIN trainers t ON u.id = t.tg_id
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length > 0) {
      return {
        exists: true,
        role: result.rows[0].role,
        team: result.rows[0].team,
        trainer: result.rows[0].trainer
      };
    }
    return { exists: false };
  } catch (error) {
    throw new Error(`Ошибка БД: ${error.message}`);
  }
};

app.options('*', (req, res) => {
  res.sendStatus(200);
});

// Сделаем обработчик асинхронным для использования await
app.post('/verify', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const clientIp = req.ip || req.connection.remoteAddress;
  const currentDate = new Date();

  // Логирование начала попытки верификации
  logger.info('Попытка верификации', {
    time: currentDate.toISOString(),
    ip: clientIp
  });

  if (!token) {
    logger.warn('Токен в запросе не найден', {
      time: currentDate.toISOString(),
      ip: clientIp
    });
    return res.status(401).json({ valid: false });
  }

  try {
    // Декодирование JWT
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    logger.info('JWT успешно декодирован', {
      userId: decoded.id,
      time: currentDate.toISOString(),
      ip: clientIp
    });

    // Получаем информацию о пользователе из базы данных
    const userData = await checkUserInDatabase(decoded.id);
    if (!userData.exists) {
      logger.warn('Пользователь не найден', {
        userId: decoded.id,
        time: currentDate.toISOString(),
        ip: clientIp
      });
      return res.status(500).json({ valid: false, error: 'User not found' });
    }

    logger.info('Пользователь успешно верифицирован', {
      userId: decoded.id,
      time: currentDate.toISOString(),
      team: userData.team,
      role: userData.role,
      trainer: userData.trainer
    });

    // Отдаем информацию, беря роль из базы данных
    res.json({
      valid: true,
      user: {
        id: decoded.id,
        role: userData.role,
        team: userData.team,
        trainer: userData.trainer,
        first_name: decoded.first_name,
        photo_url: decoded.photo_url,
        username: decoded.username
      }
    });
  } catch (error) {
    logger.error('Ошибка в процессе верификации', {
      error: error.message,
      time: currentDate.toISOString(),
      ip: clientIp
    });
    res.status(401).json({ 
      valid: false,
      error: error.message 
    });
  }
});

app.use((req, res) => {
  res.status(404).send('Страница не найдена');
});

module.exports = app;