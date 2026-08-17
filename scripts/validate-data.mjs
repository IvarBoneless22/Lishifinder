import { readFile } from "node:fs/promises";

const source=await readFile(new URL("../data.js",import.meta.url),"utf8");
const json=source.trim().replace(/^window\.LISHI_DATA\s*=\s*/,"").replace(/;$/,"");
const catalog=JSON.parse(json);
const errors=[];
const allowedStatuses=new Set(["verified","needs_review","not_available"]);
const allowedMarkets=new Set(["AU","US","EU","JP","ASIA","GLOBAL","UNSPECIFIED"]);
const seen=new Set();
const problem=(index,message)=>errors.push("Запис "+(index+1)+": "+message);

if(!catalog.version)errors.push("Відсутня версія каталогу.");
if(!Array.isArray(catalog.cars)||catalog.cars.length===0)errors.push("Каталог не містить записів.");
for(const [index,record] of (catalog.cars||[]).entries()){
  for(const field of ["brand","model","years","ignition","status"]){
    if(typeof record[field]!=="string"||!record[field].trim())problem(index,"відсутнє поле "+field);
    if(typeof record[field]==="string"&&record[field]!==record[field].trim())problem(index,"поле "+field+" має зайві пробіли");
  }
  if(!allowedStatuses.has(record.status))problem(index,"невідомий статус "+record.status);
  if(!Array.isArray(record.markets)||record.markets.length===0)problem(index,"markets має бути непорожнім масивом");
  for(const market of record.markets||[])if(!allowedMarkets.has(market))problem(index,"ненормалізований ринок "+market);
  if(record.yearFrom!==null&&(!Number.isInteger(record.yearFrom)||record.yearFrom<1900||record.yearFrom>2100))problem(index,"некоректний yearFrom");
  if(record.yearTo!==null&&(!Number.isInteger(record.yearTo)||record.yearTo<1900||record.yearTo>2100))problem(index,"некоректний yearTo");
  if(record.yearFrom&&record.yearTo&&record.yearTo<record.yearFrom)problem(index,"yearTo менший за yearFrom");
  if(record.status==="verified"&&(!record.lishi||!String(record.lishi).trim()))problem(index,"перевірений запис не має коду Lishi");
  if(record.status!=="verified"&&(!record.note||!record.note.trim()))problem(index,"неперевірений запис не має пояснення");
  if(record.lishi!==null&&record.lishi!==undefined&&!/^[A-Za-z0-9-]+$/.test(record.lishi))problem(index,"некоректний код Lishi");
  if(record.alternativeLishi!==null&&record.alternativeLishi!==undefined&&!/^[A-Za-z0-9-]+$/.test(record.alternativeLishi))problem(index,"некоректний альтернативний код Lishi");
  if(record.alternativeLishi&&(!record.alternativeSource||!String(record.alternativeSource).trim()))problem(index,"альтернативний код не має джерела");
  if(record.alternativeLishi&&(!record.note||!String(record.note).trim()))problem(index,"альтернативний код не має примітки");
  if(record.chip!==null&&record.chip!==undefined&&!/^[A-Za-z0-9-]+$/.test(record.chip))problem(index,"некоректний код чипа");
  const key=[record.brand,record.model,record.years,(record.markets||[]).join(","),record.ignition].join("|");
  if(seen.has(key))problem(index,"дубльований запис автомобіля");
  seen.add(key);
}
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log("Каталог перевірено: "+catalog.cars.length+" записів, версія "+catalog.version+".");

