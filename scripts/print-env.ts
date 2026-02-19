import fs from "fs";
import dotenv from "dotenv";

console.log("cwd:", process.cwd());
console.log(".env.local exists:", fs.existsSync(".env.local"));

if (fs.existsSync(".env.local")) {
  const raw = fs.readFileSync(".env.local", "utf8");
  console.log(".env.local preview (first 300 chars):\n", raw.slice(0, 300));
}

// Load .env.local if present
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
} else {
  dotenv.config();
}

const val = process.env.UPSTASH_REDIS_REDIS_URL;
console.log(
  "process.env.UPSTASH_REDIS_REDIS_URL present:",
  typeof val !== "undefined",
);
if (val) {
  console.log(
    "value preview:",
    val.slice(0, 60) + (val.length > 60 ? "..." : ""),
  );
}
