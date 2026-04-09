const express = require("express");
const app = express();

app.use(express.json());

const FAIL_MODE = process.env.INVENTORY_FAIL_MODE || "never";

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/inventory/reserve", (req, res) => {
  const { correlationId } = req.body;

  if (FAIL_MODE === "always") {
    return res.json({
      status: "unavailable",
      correlationId
    });
  }

  res.json({
    status: "reserved",
    reservationId: "RES-" + Date.now(),
    correlationId
  });
});

app.post("/inventory/release", (req, res) => {
  res.json({
    status: "released",
    correlationId: req.body.correlationId
  });
});

app.listen(3003, () => console.log("Inventory Service running"));