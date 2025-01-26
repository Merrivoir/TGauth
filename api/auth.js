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

export default app;