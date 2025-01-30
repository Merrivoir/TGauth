const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();

app.get('/auth', async (req, res) => {
    try {
        const authData = req.query;

        // 1. Проверка подписи Telegram
        const dataCheckArr = [];
        for (const key in authData) {
            if (key !== 'hash' && authData[key] !== '') {
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
            return res.redirect('/denied?reason=invalid_hash');
        }

        // 2. Проверка белого списка ID
        const userId = parseInt(authData.id);
        const allowedIds = process.env.ALLOWED_IDS.split(',')
            .map(id => parseInt(id.trim()))
            .filter(id => !isNaN(id));

        if (!allowedIds.includes(userId)) {
            return res.redirect('/denied?reason=not_allowed');
        }

        // 3. Генерация JWT
        const token = jwt.sign(
            { 
                id: userId,
                username: authData.username 
            },
            process.env.SECRET_KEY,
            { expiresIn: '1h' }
        );

        // 4. Перенаправление с токеном
        res.redirect(`/dashboard?token=${token}`);

    } catch (error) {
        console.error('Auth error:', error);
        res.redirect('/denied?reason=server_error');
    }
});

module.exports = app;