const express = require("express");
const app = express();

app.use(express.json());

const FAIL_MODE = process.env.PAYMENT_FAIL_MODE || "never";

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/payment/authorize", (req, res) => {
  const { correlationId } = req.body;

  if (FAIL_MODE === "always") {
    return res.json({
      status: "rejected",
      correlationId
    });
  }

  res.json({
    status: "authorized",
    transactionId: "TX-" + Date.now(),
    correlationId
  });
});

app.post("/payment/refund", (req, res) => {
  res.json({
    status: "refunded",
    correlationId: req.body.correlationId
  });
});

app.listen(3002, () => console.log("Payment Service running"));