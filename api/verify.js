const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();

app.post('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        console.log(`Токен в запросе не найден`)
        return res.status(401).json({ valid: false });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        console.log(`decode: ${decoded}`)
        
        // Дополнительная проверка в базе данных
        checkUserInDatabase(decoded.id).then(exists => {
            if (!exists) throw new Error('User not found');
            
            res.json({
                valid: true,
                user: {
                    id: decoded.id,
                    role: decoded.role,
                    username: decoded.username
                }
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