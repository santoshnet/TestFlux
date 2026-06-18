const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../../data/database.sqlite');
console.log('Database path:', dbPath);
const db = new sqlite3.Database(dbPath);

db.all("SELECT * FROM run WHERE id = '70287cbe-8386-4424-8a7e-268b4a8ef751'", [], (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(JSON.stringify(rows, null, 2));
});

db.close();
