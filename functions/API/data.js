const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSEIhSXJGhIrmUPcj2vWWnZHagsQnkm9-BBBr1tdmmWiCKB0OvYqkBCiRIpHO_f_tpJfTW8YjCtu4vt/pub?gid=470675989&single=true&output=csv";

const KELAS = ["SD", "SMP", "SMA", "Gabungan"];

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field.trim());
        field = "";
      } else if (c === "\n") {
        row.push(field.trim());
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // skip
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }
  return rows.filter((r) => r.length > 0 && !r.every((f) => f === ""));
}

function rowToObject(header, row) {
  const obj = {};
  header.forEach((h, i) => {
    obj[h] = row[i] !== undefined ? row[i] : "";
  });
  return obj;
}

export async function onRequest(context) {
  try {
    const res = await fetch(SHEET_URL);
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch sheet: ${res.status}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
    const csv = await res.text();
    const rows = parseCSV(csv);
    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: "No data rows found" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const header = rows[0];
    const records = rows.slice(1).map((r) => rowToObject(header, r));

    const pending = records.filter(
      (r) =>
        r["Pemenang"] === "" &&
        r["Tim-1"] !== "" &&
        r["Tim-2"] !== ""
    );

    const totalLomba = records.filter(
      (r) =>
        r["Tanggal"] !== "" &&
        r["Pemenang"] !== "" &&
        r["Internal"].toUpperCase() === "TRUE"
    );

    const totalCount = {};
    const winners = {};
    KELAS.forEach((k) => {
      totalCount[k] = 0;
      winners[k] = 0;
    });

    records.forEach((r) => {
      if (r["Tanggal"] !== "" && KELAS.includes(r["Kelas"])) {
        totalCount[r["Kelas"]]++;
      }
      if (r["Pemenang"] !== "" && KELAS.includes(r["Kelas"])) {
        winners[r["Kelas"]]++;
      }
    });

    const report = {
      generatedAt: new Date().toISOString(),
      pendingCount: pending.length,
      totalLomba: totalLomba.length,
      totalCount,
      winners,
    };

    return new Response(JSON.stringify(report), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
