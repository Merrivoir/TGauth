const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();

app.post('/verify', (req, res) => {
    const token = req.headers['authorization'];
    
    if (!token) {
        return res.status(401).json({ valid: false });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        res.json({
            valid: true,
            role: decoded.role,
            user: decoded
        });
    } catch (error) {
        res.status(401).json({ valid: false });
    }
});

module.exports = app;