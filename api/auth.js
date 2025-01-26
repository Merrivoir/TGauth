import express from "express";

const app = express();

// Обработка корневого маршрута
app.get("/", (req, res) => {
  res.send("Hello, world! This is the main route!");
});

// Любой другой маршрут
app.get("/auth", (req, res) => {
  res.send("Auth route is working!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});