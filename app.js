(()=>{
  "use strict";
  const catalog=(window.LISHI_DATA&&Array.isArray(window.LISHI_DATA.cars))?window.LISHI_DATA.cars:[];
  const $=id=>document.getElementById(id);
  const elements={query:$("q"),brand:$("brand"),market:$("market"),ignition:$("ignition"),year:$("year"),tool:$("tool"),results:$("results"),stats:$("stats"),chips:$("brandChips"),modeHelp:$("modeHelp"),showAll:$("showAll"),clear:$("clr"),reset:$("resetApp"),updateStatus:$("updateStatus")};
  const state={mode:"auto",showAll:false};
  const marketNames={AU:"Австралія",US:"США",EU:"Європа",JP:"Японія",ASIA:"Азія",GLOBAL:"Глобальний",UNSPECIFIED:"Не вказано"};
  const ignitionNames={key:"Механічний ключ",smart:"Смарт-ключ / слот",prox:"Безключовий доступ",unknown:"Не вказано"};
  const normalize=value=>String(value||"").toLocaleLowerCase("uk").trim();
  const uniqueSorted=items=>[...new Set(items.filter(Boolean))].sort((a,b)=>a.localeCompare(b,"uk"));
  const isVerified=record=>record.status==="verified"&&Boolean(record.lishi);
  function addOptions(select,items,label){uniqueSorted(items).forEach(value=>select.add(new Option(label?label(value):value,value)));}
  function prepareFilters(){
    addOptions(elements.brand,catalog.map(record=>record.brand));
    addOptions(elements.market,catalog.flatMap(record=>record.markets||[]),value=>marketNames[value]||value);
    addOptions(elements.tool,catalog.filter(isVerified).map(record=>record.lishi));
    uniqueSorted(catalog.map(record=>record.brand)).forEach(brand=>{
      const button=document.createElement("button");button.type="button";button.className="brandChip";button.textContent=brand;button.dataset.brand=brand;
      button.addEventListener("click",()=>{elements.brand.value=elements.brand.value===brand?"":brand;state.showAll=true;render();});elements.chips.append(button);
    });
  }
  function matchesQuery(record,query){
    if(!query)return true;
    const words=query.split(/\s+/).filter(Boolean);
    const searchable=state.mode==="auto"?[record.brand,record.model,record.years,...(record.markets||[]),ignitionNames[record.ignition]]:[record.lishi];
    return words.every(word=>searchable.some(value=>normalize(value).includes(word)));
  }
  function matchesYear(record,value){if(!value)return true;const year=Number(value);if(!Number.isInteger(year)||year<1900||year>2100)return false;if(!record.yearFrom)return false;return year>=record.yearFrom&&(!record.yearTo||year<=record.yearTo);}
  function activeCriteria(){return Boolean(elements.query.value.trim()||elements.brand.value||elements.market.value||elements.ignition.value||elements.year.value||elements.tool.value);}
  function filteredRecords(){
    const query=normalize(elements.query.value);
    return catalog.filter(record=>(!elements.brand.value||record.brand===elements.brand.value)&&(!elements.market.value||(record.markets||[]).includes(elements.market.value))&&(!elements.ignition.value||record.ignition===elements.ignition.value)&&(!elements.tool.value||record.lishi===elements.tool.value)&&matchesYear(record,elements.year.value)&&matchesQuery(record,query)).sort((left,right)=>(left.brand+" "+left.model+" "+left.years).localeCompare(right.brand+" "+right.model+" "+right.years,"uk"));
  }
  function makeCard(record){
    const card=document.createElement("article");card.className="card";const top=document.createElement("div");top.className="cardTop";const info=document.createElement("div");info.className="info";
    const brand=document.createElement("div");brand.className="brand";brand.textContent=record.brand;const model=document.createElement("div");model.className="model";model.textContent=record.model;
    const meta=document.createElement("div");meta.className="meta";const marketLabel=(record.markets||[]).map(value=>marketNames[value]||value).join(", ");meta.textContent=(record.years||"Рік не вказано")+" • "+(marketLabel||"Ринок не вказано")+" • "+(ignitionNames[record.ignition]||ignitionNames.unknown);
    info.append(brand,model,meta);const badge=document.createElement("div");badge.className="badge"+(isVerified(record)?"":" warning");badge.textContent=isVerified(record)?record.lishi:(record.status==="not_available"?"Немає даних":"Потрібна перевірка");top.append(info,badge);card.append(top);
    if(!isVerified(record)&&record.note){const note=document.createElement("p");note.className="recordNote";note.textContent=record.note;card.append(note);}return card;
  }
  function renderMode(){
    const auto=state.mode==="auto";elements.query.placeholder=auto?"Toyota RAV4, Volkswagen Golf…":"HU66, TOY43AT, HU127T…";
    elements.modeHelp.textContent=auto?"Введіть марку, модель, ринок або рік — каталог покаже відповідний код Lishi.":"Введіть код Lishi — каталог покаже автомобілі, для яких він зазначений.";
    document.querySelectorAll(".mode").forEach(button=>{const selected=button.dataset.mode===state.mode;button.classList.toggle("active",selected);button.setAttribute("aria-pressed",String(selected));});
  }
  function render(){
    renderMode();elements.chips.querySelectorAll(".brandChip").forEach(button=>button.classList.toggle("selected",button.dataset.brand===elements.brand.value));
    const criteria=activeCriteria();const records=filteredRecords();elements.results.replaceChildren();elements.showAll.hidden=criteria||state.showAll;
    if(!criteria&&!state.showAll){elements.stats.textContent="У каталозі "+catalog.length+" записів. Оберіть марку, скористайтеся пошуком або відкрийте весь каталог.";const empty=document.createElement("div");empty.className="empty";empty.textContent="Щоб зменшити навантаження на телефон, повний каталог не показується одразу.";elements.results.append(empty);return;}
    elements.stats.textContent="Знайдено: "+records.length;
    if(!records.length){const empty=document.createElement("div");empty.className="empty";empty.textContent=state.mode==="lishi"?"Код не знайдено серед перевірених записів.":"Нічого не знайдено. Перевірте марку, ринок, рік або тип ключа.";elements.results.append(empty);return;}
    const fragment=document.createDocumentFragment();records.forEach(record=>fragment.append(makeCard(record)));elements.results.append(fragment);
  }
  async function refreshOfflineVersion(){
    elements.reset.disabled=true;elements.updateStatus.textContent="Очищення кешу цього застосунку…";
    try{
      if("caches" in window){const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith("lishi-finder-")).map(key=>caches.delete(key)));}
      if("serviceWorker" in navigator){const registration=await navigator.serviceWorker.getRegistration();const appPath=new URL("./",location.href).pathname;if(registration&&new URL(registration.scope).pathname.startsWith(appPath))await registration.unregister();}
      elements.updateStatus.textContent="Офлайн-версію очищено. Завантажую актуальні дані…";window.setTimeout(()=>location.reload(),350);
    }catch(error){elements.reset.disabled=false;elements.updateStatus.textContent="Не вдалося оновити кеш. Спробуйте ще раз, коли буде інтернет.";}
  }
  function registerServiceWorker(){
    if(!("serviceWorker" in navigator))return;
    window.addEventListener("load",()=>{navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(registration=>{const hadActiveWorker=Boolean(registration.active);registration.update().catch(()=>{});registration.addEventListener("updatefound",()=>{if(hadActiveWorker)elements.updateStatus.textContent="Доступна нова офлайн-версія. Натисніть «Оновити офлайн-версію».";});if(!hadActiveWorker)elements.updateStatus.textContent="Офлайн-версію встановлено для наступного запуску.";}).catch(()=>{elements.updateStatus.textContent="Офлайн-режим недоступний у цьому переглядачі.";});});
  }
  document.querySelectorAll(".mode").forEach(button=>button.addEventListener("click",()=>{state.mode=button.dataset.mode;state.showAll=false;elements.query.value="";render();}));
  elements.query.addEventListener("input",()=>{state.showAll=true;render();});elements.year.addEventListener("input",()=>{state.showAll=true;render();});
  [elements.brand,elements.market,elements.ignition,elements.tool].forEach(element=>element.addEventListener("change",()=>{state.showAll=true;render();}));
  elements.clear.addEventListener("click",()=>{elements.query.value="";elements.query.focus();state.showAll=false;render();});elements.showAll.addEventListener("click",()=>{state.showAll=true;render();});elements.reset.addEventListener("click",refreshOfflineVersion);
  prepareFilters();render();registerServiceWorker();
})();
