const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

// Настройка CORS
const corsOptions = {
    origin: 'merrivoir.github.io/staff', // Разрешить все источники
    methods: ['POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

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
                    role: role,
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

module.exports = app;