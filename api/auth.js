export default function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json({ message: "Telegram Auth работает!" });
  } else {
    res.status(405).json({ error: "Метод не поддерживается" });
  }
}