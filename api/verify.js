const express = require('express');
const jwt = require('jsonwebtoken');
const winston = require('winston');

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

const checkUserInDatabase = (id) => {
  return new Promise((resolve, reject) => {
    const allowedIds = process.env.ALLOWED_IDS || '';
    const users = allowedIds.split(',').reduce((acc, user) => {
      const [userId, role] = user.split(':');
      acc[userId] = role;
      return acc;
    }, {});

    if (users.hasOwnProperty(id)) {
      resolve({ exists: true, role: users[id] });
    } else {
      resolve({ exists: false });
    }
  });
};

app.options('*', (req, res) => {
  res.sendStatus(200);
});

app.post('/verify', (req, res) => {
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

    // Проверка пользователя в базе данных
    checkUserInDatabase(decoded.id).then(({ exists, role }) => {
      if (!exists) {
        logger.warn('Пользователь не найден', {
          userId: decoded.id,
          time: currentDate.toISOString(),
          ip: clientIp
        });
        throw new Error('User not found');
      }
      
      logger.info('Пользователь успешно верифицирован', {
        userId: decoded.id,
        time: currentDate.toISOString(),
        ip: clientIp
      });
      
      res.json({
        valid: true,
        user: {
          id: decoded.id,
          role: decoded.role,
          first_name: decoded.first_name,
          photo_url: decoded.photo_url,
          username: decoded.username
        }
      });
    }).catch(error => {
      logger.error('Ошибка при проверке пользователя в базе данных', {
        error: error.message,
        userId: decoded?.id,
        time: currentDate.toISOString(),
        ip: clientIp
      });
      res.status(500).json({ 
        valid: false,
        error: error.message 
      });
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