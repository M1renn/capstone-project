const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

const orders = new Map();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/orders", (req, res) => {
  const orderId = "ORD-" + Date.now();
  const correlationId = req.body.correlationId || uuidv4();

  const order = {
    orderId,
    correlationId,
    status: "received",
    payload: req.body
  };

  orders.set(orderId, order);

  res.json({
    orderId,
    correlationId,
    status: "received"
  });
});

app.get("/orders/:id", (req, res) => {
  const order = orders.get(req.params.id);

  if (!order) {
    return res.status(404).json({ error: "Not found" });
  }

  res.json(order);
});

app.listen(3001, () => console.log("Order Service running"));