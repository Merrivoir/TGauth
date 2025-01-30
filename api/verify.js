const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware для проверки токена
app.post('/verify', (req, res) => {
  try {
    // Получаем токен из заголовка Authorization
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