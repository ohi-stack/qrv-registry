import express from "express";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;
const app = express();

app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "registry" });
});

app.post("/registry/create", async (req, res) => {
  try {
    const { qrvid, issuer, owner, record_type } = req.body;

    const result = await pool.query(
      `INSERT INTO qr_certificates (qrvid, issuer, owner, record_type)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [qrvid, issuer, owner, record_type]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/registry/:qrvid", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM qr_certificates WHERE qrvid = $1`,
      [req.params.qrvid]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Registry running on port 3000");
});
