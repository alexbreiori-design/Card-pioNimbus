import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const htmlPath =
  "H:/Sistema/Nimbus-Cardapio-Digital/EXEMPLOS/cardapio_digital_acai (2).html";
const html = fs.readFileSync(htmlPath, "utf8");
const style = html.match(/<style>([\s\S]*?)<\/style>/)[1].trim();
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const products = script.match(/const PRODUCTS = (\[[\s\S]*?\]);/)[1];
const also = script.match(/const ALSO_ITEMS = (\[[\s\S]*?\]);/)[1];

fs.mkdirSync(path.join(root, "styles"), { recursive: true });
fs.mkdirSync(path.join(root, "lib/data"), { recursive: true });
fs.writeFileSync(path.join(root, "styles/cardapio.css"), style);
fs.writeFileSync(
  path.join(root, "lib/data/products.js"),
  `export const PRODUCTS = ${products};\n\nexport const ALSO_ITEMS = ${also};\n\nexport const CATEGORIES = [\n  "Todos",\n  "Combos com Promoção!",\n  "Açaí no Copo",\n  "Açaí no Pote",\n  "Bebidas",\n  "Adicionais",\n];\n`
);
console.log("extracted", style.length);
