const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization');
    next();
});

// Middleware для проверки токена
app.post('/verify', (req, res) => {
  try {
    // Получаем токен из заголовка Authorization
    console.log('Received token:', req.headers.authorization);
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Токен отсутствует' });
    }

    // Проверяем токен с помощью SECRET_KEY
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    // Если токен валиден, возвращаем данные пользователя
    res.json({
      user: {
        id: decoded.id,
        isValid: true
      }
    });

  } catch (error) {
    // Обработка ошибок
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Токен истек' });
    }
    res.status(403).json({ error: 'Недействительный токен' });
  }
});

module.exports = app;