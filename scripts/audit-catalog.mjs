import { readFile } from "node:fs/promises";

function readAssignment(source,prefix){
  return JSON.parse(source.trim().replace(new RegExp("^window\\."+prefix+"\\s*=\\s*"),"").replace(/;$/,"") );
}

const data=readAssignment(await readFile(new URL("../data.js",import.meta.url),"utf8"),"LISHI_DATA");
const profileData=readAssignment(await readFile(new URL("../profile-catalog.js",import.meta.url),"utf8"),"LISHI_PROFILES");
const records=data.cars||[];
const usedProfiles=new Set(records.map(record=>String(record.lishi||"").toUpperCase()).filter(Boolean));
const profileEntries=[...usedProfiles].map(code=>profileData.profiles[code]).filter(Boolean);
const counts={
  records:records.length,
  brands:new Set(records.map(record=>record.brand)).size,
  profiles:usedProfiles.size,
  confirmedProfiles:profileEntries.filter(profile=>profile.shape!=="unknown"&&profile.source!=="reference").length,
  referenceProfiles:profileEntries.filter(profile=>profile.shape!=="unknown"&&profile.source==="reference").length,
  unknownProfiles:profileEntries.filter(profile=>profile.shape==="unknown").length,
  missingLishi:records.filter(record=>!record.lishi).length,
  missingChip:records.filter(record=>!record.chip).length,
  unknownIgnition:records.filter(record=>record.ignition==="unknown").length,
  keyPhotos:records.filter(record=>record.keyPhoto).length
};

console.log(JSON.stringify({catalogVersion:data.version,profileVersion:profileData.version,...counts},null,2));
