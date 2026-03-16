import express from "express";
import cors from "cors";
import Database from "better-sqlite3";

const db = new Database("vehicles.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    year INTEGER NOT NULL,
    km INTEGER NOT NULL,
    price REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ARS',
    fuel TEXT,
    color TEXT,
    desc TEXT,
    offer INTEGER NOT NULL DEFAULT 0,
    offerTag TEXT,
    photos TEXT,        -- JSON string con array de data URIs o URLs
    specs TEXT          -- JSON string opcional
  );
`);

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // permite fotos en base64 razonables

const mapRow = (row) => {
  if (!row) return null;
  return {
    ...row,
    offer: !!row.offer,
    photos: row.photos ? JSON.parse(row.photos) : [],
    specs: row.specs ? JSON.parse(row.specs) : {}
  };
};

app.get("/api/vehicles", (req, res) => {
  const rows = db.prepare("SELECT * FROM vehicles ORDER BY id DESC").all();
  res.json(rows.map(mapRow));
});

app.post("/api/vehicles", (req, res) => {
  const v = req.body;
  const stmt = db.prepare(`
    INSERT INTO vehicles
      (name,type,year,km,price,currency,fuel,color,desc,offer,offerTag,photos,specs)
    VALUES
      (@name,@type,@year,@km,@price,@currency,@fuel,@color,@desc,@offer,@offerTag,@photos,@specs)
  `);
  const info = stmt.run({
    name: v.name,
    type: v.type,
    year: v.year,
    km: v.km,
    price: v.price,
    currency: v.currency || "ARS",
    fuel: v.fuel || null,
    color: v.color || null,
    desc: v.desc || null,
    offer: v.offer ? 1 : 0,
    offerTag: v.offerTag || null,
    photos: JSON.stringify(v.photos || []),
    specs: JSON.stringify(v.specs || {})
  });
  const created = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(info.lastInsertRowid);
  res.json(mapRow(created));
});

app.put("/api/vehicles/:id", (req, res) => {
  const id = Number(req.params.id);
  const v = req.body;
  db.prepare(`
    UPDATE vehicles SET
      name=@name,
      type=@type,
      year=@year,
      km=@km,
      price=@price,
      currency=@currency,
      fuel=@fuel,
      color=@color,
      desc=@desc,
      offer=@offer,
      offerTag=@offerTag,
      photos=@photos,
      specs=@specs
    WHERE id=@id
  `).run({
    id,
    name: v.name,
    type: v.type,
    year: v.year,
    km: v.km,
    price: v.price,
    currency: v.currency || "ARS",
    fuel: v.fuel || null,
    color: v.color || null,
    desc: v.desc || null,
    offer: v.offer ? 1 : 0,
    offerTag: v.offerTag || null,
    photos: JSON.stringify(v.photos || []),
    specs: JSON.stringify(v.specs || {})
  });
  const updated = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id);
  res.json(mapRow(updated));
});

app.delete("/api/vehicles/:id", (req, res) => {
  const id = Number(req.params.id);
  db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API SQLite escuchando en http://localhost:${PORT}`);
});

