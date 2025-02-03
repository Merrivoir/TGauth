const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Или укажите конкретный домен
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });

const checkUserInDatabase = (id) => {
    return new Promise((resolve, reject) => {
        // Получаем ALLOWED_IDS из переменных окружения
        const allowedIds = process.env.ALLOWED_IDS || '';
        
        // Преобразуем строку в объект
        const users = allowedIds.split(',').reduce((acc, user) => {
            const [userId, role] = user.split(':');
            acc[userId] = role;
            return acc;
        }, {});

        // Проверяем, существует ли пользователь с заданным ID
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
    
    if (!token) {
        console.log(`Токен в запросе не найден`)
        return res.status(401).json({ valid: false });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        console.log(`decode: ${JSON.stringify(decoded, null, 2)}`);
        
        // Дополнительная проверка в базе данных
        checkUserInDatabase(decoded.id).then(({ exists, role }) => {
            if (!exists) {
                throw new Error('User not found');
            }
            
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
            res.status(500).json({ 
                valid: false,
                error: error.message 
            });
        });

    } catch (error) {
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