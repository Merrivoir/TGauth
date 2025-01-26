const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

let points = [
  { id: 1, name: 'Точка 1', lat: 55.751244, lng: 37.618423, visited: false },
  { id: 2, name: 'Точка 2', lat: 55.752220, lng: 37.615560, visited: false }
];

// Возвращаем список точек
app.get('/api/points', (req, res) => {
  res.json(points);
});

// Отмечаем точку как посещенную
app.post('/api/points/:id/visit', (req, res) => {
  const point = points.find(p => p.id === parseInt(req.params.id));
  if (point) {
    point.visited = true;
    res.status(200).json({ message: 'Точка отмечена как посещенная.' });
  } else {
    res.status(404).json({ message: 'Точка не найдена.' });
  }
});

module.exports = app;