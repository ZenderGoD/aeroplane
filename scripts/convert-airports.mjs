import https from "https";
import fs from "fs";

const url = "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat";

https.get(url, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    const lines = data.split("\n").filter((l) => l.trim());
    const airports = [];

    for (const line of lines) {
      const fields = [];
      let current = "";
      let inQuote = false;
      for (const char of line) {
        if (char === '"') {
          inQuote = !inQuote;
          continue;
        }
        if (char === "," && !inQuote) {
          fields.push(current);
          current = "";
          continue;
        }
        current += char;
      }
      fields.push(current);

      const [id, name, city, country, iata, icao, lat, lon, alt, , , tz, type] = fields;

      // Only keep airports with valid ICAO codes
      if (!icao || icao === "\\N" || icao === "" || icao.length !== 4) continue;
      if (type && type !== "airport") continue;

      airports.push({
        id: parseInt(id),
        name,
        city,
        country,
        iata: iata && iata !== "\\N" && iata.length === 3 ? iata : null,
        icao,
        lat: Math.round(parseFloat(lat) * 10000) / 10000,
        lon: Math.round(parseFloat(lon) * 10000) / 10000,
        alt: parseInt(alt) || 0,
        tz: tz || "",
      });
    }

    fs.writeFileSync("src/data/airports.json", JSON.stringify(airports));
    console.log("Airports:", airports.length);
    const size = fs.statSync("src/data/airports.json").size;
    console.log("File size:", (size / 1024).toFixed(0), "KB");
    console.log("Sample:", JSON.stringify(airports[0]));
  });
}).on("error", (e) => console.error(e));
