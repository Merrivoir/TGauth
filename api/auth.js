const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();

app.get('/auth', async (req, res) => {
    try {
        const { source } = req.query;
        const authData = req.query;

        // Проверка подписи Telegram
        const dataCheckArr = [];
        for (const key in authData) {
            if (key !== 'hash' && key !== 'source') {
                dataCheckArr.push(`${key}=${authData[key]}`);
            }
        }
        dataCheckArr.sort();

        const secretKey = crypto.createHash('sha256')
            .update(process.env.BOT_TOKEN)
            .digest();

        const computedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckArr.join('\n'))
            .digest('hex');

        if (computedHash !== authData.hash) {
            return res.redirect(`https://richmom.vercel.app/denied?reason=invalid_hash&source=${source}`);
        }

        // Получаем права пользователя
        const allowedUsers = process.env.ALLOWED_IDS.split(',')
            .reduce((acc, pair) => {
                if (!pair.includes(':')) {
                    console.error(`Invalid pair: ${pair}`);
                    return acc; // Пропускаем некорректные записи
                }
        
                const [idPart, rolePart] = pair.split(':');
                const id = idPart.trim();
                const role = rolePart?.trim() || 'guest'; // Значение по умолчанию
        
                acc[id] = role;
                return acc;
            }, {});

        const userRole = allowedUsers[authData.id] || 'guest';
        
        // Генерируем токен
        const token = jwt.sign(
            { 
                id: authData.id,
                role: userRole,
                username: authData.username 
            },
            process.env.SECRET_KEY,
            { expiresIn: '12h' }
        );

        // Перенаправляем обратно на исходный сайт
        res.redirect(`${decodeURIComponent(source)}?token=${token}`);

    } catch (error) {
        console.error('Auth error:', error);
        res.redirect(`https://richmom.vercel.app/denied?reason=server_error`);
    }
});

module.exports = app;