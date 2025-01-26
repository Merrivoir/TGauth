import express from "express";
import crypto from "crypto";

const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.tg_auth_token; // Замените на токен вашего бота

function checkTelegramAuth(data) {
  const { hash, ...rest } = data;
  const secretKey = crypto.createHash("sha256").update(BOT_TOKEN).digest();
  const checkString = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join("\n");
  const hmac = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex");
  return hmac === hash;
}

app.get("/api/auth", (req, res) => {
  const data = req.query;

  if (!checkTelegramAuth(data)) {
    return res.status(403).send("Неверные данные авторизации.");
  }

  // Успешная авторизация
  res.send(`Добро пожаловать, ${data.first_name}!`);
});

export default app;