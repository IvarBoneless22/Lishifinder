(()=>{
  "use strict";
  const catalog=(window.LISHI_DATA&&Array.isArray(window.LISHI_DATA.cars))?window.LISHI_DATA.cars:[];
  const $=id=>document.getElementById(id);
  const elements={query:$("q"),brand:$("brand"),brandPicker:$("brandPicker"),brandButton:$("brandButton"),brandButtonIcon:$("brandButtonIcon"),brandButtonText:$("brandButtonText"),brandMenu:$("brandMenu"),market:$("market"),ignition:$("ignition"),year:$("year"),tool:$("tool"),results:$("results"),stats:$("stats"),chips:$("brandChips"),modeHelp:$("modeHelp"),showAll:$("showAll"),clear:$("clr"),reset:$("resetApp"),updateStatus:$("updateStatus"),photoDialog:$("photoDialog"),photoTitle:$("photoTitle"),photoClose:$("photoClose"),photoLoading:$("photoLoading"),photoImage:$("photoImage"),photoMessage:$("photoMessage"),photoCredit:$("photoCredit"),photoCreditText:$("photoCreditText"),photoSource:$("photoSource")};
  const state={mode:"auto",showAll:false,photoRequest:0};
  const photoCache=new Map();let photoController=null;
  const brandIcons={
    Audi:'<svg viewBox="0 0 48 48" focusable="false"><g fill="none" stroke="currentColor" stroke-width="3.2"><circle cx="9" cy="24" r="7.5"/><circle cx="19" cy="24" r="7.5"/><circle cx="29" cy="24" r="7.5"/><circle cx="39" cy="24" r="7.5"/></g></svg>',
    BMW:'<svg viewBox="0 0 48 48" focusable="false"><circle cx="24" cy="24" r="20" fill="#111827"/><circle cx="24" cy="24" r="15" fill="#fff"/><path d="M24 24V9a15 15 0 0 1 15 15Z" fill="#1d8bd1"/><path d="M24 24v15A15 15 0 0 1 9 24Z" fill="#1d8bd1"/><circle cx="24" cy="24" r="15" fill="none" stroke="#111827" stroke-width="2"/></svg>',
    Citroen:'<svg viewBox="0 0 48 48" focusable="false"><g fill="none" stroke="#d71920" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="m10 25 14-10 14 10"/><path d="m10 36 14-10 14 10"/></g></svg>',
    Dacia:'<svg viewBox="0 0 48 48" focusable="false"><path d="M7 11h34v14c0 9-7 15-17 18C14 40 7 34 7 25Z" fill="#0f6fae"/><path d="M16 18h9c7 0 11 3 11 8s-4 8-11 8h-9Zm7 5v6h3c3 0 4-1 4-3s-1-3-4-3Z" fill="#fff"/></svg>',
    'Mercedes-Benz':'<svg viewBox="0 0 48 48" focusable="false"><circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M24 7 28 27 24 24 20 27Zm4 20 12 9-16-12Zm-8 0L8 36l16-12Z" fill="currentColor"/></svg>',
    Renault:'<svg viewBox="0 0 48 48" focusable="false"><path d="M24 4 41 24 24 44 7 24Zm0 8L14 24l10 12 10-12Z" fill="#f4c300" stroke="#212121" stroke-width="2" fill-rule="evenodd"/></svg>',
    Toyota:'<svg viewBox="0 0 48 48" focusable="false"><g fill="none" stroke="#d71920" stroke-width="2.8"><ellipse cx="24" cy="24" rx="20" ry="13"/><ellipse cx="24" cy="24" rx="8" ry="13"/><ellipse cx="24" cy="18" rx="15" ry="6"/></g></svg>',
    Volkswagen:'<svg viewBox="0 0 48 48" focusable="false"><circle cx="24" cy="24" r="20" fill="#0b5a9c"/><circle cx="24" cy="24" r="16" fill="none" stroke="#fff" stroke-width="2"/><path d="m14 13 7 17 3-8 3 8 7-17M12 25l8 12 4-10 4 10 8-12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  const marketNames={AU:"Австралія",US:"США",EU:"Європа",JP:"Японія",ASIA:"Азія",GLOBAL:"Глобальний",UNSPECIFIED:"Не вказано"};
  const ignitionNames={key:"Механічний ключ",smart:"Смарт-ключ / слот",prox:"Безключовий доступ",unknown:"Не вказано"};
  const normalize=value=>String(value||"").toLocaleLowerCase("uk").trim();
  const uniqueSorted=items=>[...new Set(items.filter(Boolean))].sort((a,b)=>a.localeCompare(b,"uk"));
  const isVerified=record=>record.status==="verified"&&Boolean(record.lishi);
  function addOptions(select,items,label){uniqueSorted(items).forEach(value=>select.add(new Option(label?label(value):value,value)));}
  function plainMetadata(value){return new DOMParser().parseFromString(String(value||""),"text/html").body.textContent.replace(/\s+/g," ").trim();}
  function photoModelName(model){return String(model||"").split(/\s+\/\s+/)[0].replace(/\s+/g," ").trim();}
  function buildCommonsUrl(query){
    const params=new URLSearchParams({action:"query",generator:"search",gsrsearch:query,gsrnamespace:"6",gsrlimit:"3",prop:"imageinfo",iiprop:"url|mime|extmetadata",iiurlwidth:"1200",iiextmetadatalanguage:"uk",iiextmetadatafilter:"LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription|ObjectName",format:"json",formatversion:"2",origin:"*"});
    return "https://commons.wikimedia.org/w/api.php?"+params.toString();
  }
  async function findCommonsPhoto(record,signal){
    const model=photoModelName(record.model);const simplified=model.replace(/\s*\([^)]*\)/g,"").trim();
    const queries=[record.brand+" "+model+" automobile",record.brand+" "+simplified].filter((value,index,array)=>value.trim()&&array.indexOf(value)===index);
    for(const query of queries){
      const response=await fetch(buildCommonsUrl(query),{signal,mode:"cors",credentials:"omit"});if(!response.ok)throw new Error("commons");const data=await response.json();
      const pages=(data.query&&Array.isArray(data.query.pages)?data.query.pages:[]).sort((left,right)=>(left.index||999)-(right.index||999));
      for(const page of pages){const info=page.imageinfo&&page.imageinfo[0];if(!info||!info.thumburl||!String(info.mime||"").startsWith("image/"))continue;const metadata=info.extmetadata||{};return{src:info.thumburl,source:info.descriptionurl||"https://commons.wikimedia.org/",title:plainMetadata(metadata.ObjectName&&metadata.ObjectName.value)||String(page.title||"").replace(/^File:/,""),artist:plainMetadata(metadata.Artist&&metadata.Artist.value),license:plainMetadata(metadata.LicenseShortName&&metadata.LicenseShortName.value)||"Wikimedia Commons"};}
    }return null;
  }
  function showPhotoMessage(message){elements.photoLoading.hidden=true;elements.photoImage.hidden=true;elements.photoCredit.hidden=true;elements.photoMessage.textContent=message;elements.photoMessage.hidden=false;}
  function resetPhotoDialog(record){
    elements.photoTitle.textContent=record.brand+" "+record.model;elements.photoLoading.hidden=false;elements.photoLoading.textContent="Шукаю відповідне фото…";elements.photoImage.hidden=true;elements.photoImage.removeAttribute("src");elements.photoImage.alt="";elements.photoMessage.hidden=true;elements.photoMessage.textContent="";elements.photoCredit.hidden=true;elements.photoCreditText.textContent="";elements.photoSource.href="https://commons.wikimedia.org/";
  }
  async function showPhoto(record){
    state.photoRequest+=1;const requestId=state.photoRequest;if(photoController)photoController.abort();photoController=new AbortController();resetPhotoDialog(record);
    if(!elements.photoDialog.open){if(typeof elements.photoDialog.showModal==="function")elements.photoDialog.showModal();else elements.photoDialog.setAttribute("open","");}
    if(!navigator.onLine){showPhotoMessage("Фото доступне лише за наявності інтернету.");return;}
    const cacheKey=record.brand+"|"+photoModelName(record.model);
    try{
      let photo=photoCache.get(cacheKey);if(!photoCache.has(cacheKey)){photo=await findCommonsPhoto(record,photoController.signal);photoCache.set(cacheKey,photo);}
      if(requestId!==state.photoRequest)return;if(!photo){showPhotoMessage("Не вдалося знайти надійне фото цієї моделі у Wikimedia Commons.");return;}
      await new Promise((resolve,reject)=>{elements.photoImage.onload=resolve;elements.photoImage.onerror=reject;elements.photoImage.src=photo.src;});if(requestId!==state.photoRequest)return;
      elements.photoImage.alt="Фото "+record.brand+" "+record.model;elements.photoImage.hidden=false;elements.photoLoading.hidden=true;elements.photoMessage.hidden=true;elements.photoCreditText.textContent=[photo.title,photo.artist&&"Автор: "+photo.artist,"Ліцензія: "+photo.license].filter(Boolean).join(" • ");elements.photoSource.href=photo.source;elements.photoCredit.hidden=false;
    }catch(error){if(error&&error.name==="AbortError")return;if(requestId===state.photoRequest)showPhotoMessage("Фото не завантажилося. Перевірте інтернет і спробуйте ще раз.");}
  }
  function closePhotoDialog(){state.photoRequest+=1;if(photoController)photoController.abort();elements.photoImage.removeAttribute("src");if(typeof elements.photoDialog.close==="function"&&elements.photoDialog.open)elements.photoDialog.close();else elements.photoDialog.removeAttribute("open");}
  function makeBrandMark(brand){
    const mark=document.createElement("span");mark.className="brandMark";mark.setAttribute("aria-hidden","true");
    if(brandIcons[brand])mark.innerHTML=brandIcons[brand];else{mark.classList.add("brandMarkFallback");mark.textContent=brand?brand.charAt(0):"🚘";}return mark;
  }
  function closeBrandMenu({focusButton=false}={}){elements.brandMenu.hidden=true;elements.brandButton.setAttribute("aria-expanded","false");if(focusButton)elements.brandButton.focus();}
  function openBrandMenu(preferred="selected"){
    elements.brandMenu.hidden=false;elements.brandButton.setAttribute("aria-expanded","true");
    const options=[...elements.brandMenu.querySelectorAll(".brandOption")];const target=preferred==="last"?options.at(-1):(preferred==="first"?options[0]:options.find(option=>option.getAttribute("aria-selected")==="true")||options[0]);
    window.requestAnimationFrame(()=>target&&target.focus());
  }
  function selectBrand(brand,{showResults=true,focusButton=false}={}){
    elements.brand.value=brand;elements.brandButtonText.textContent=brand||"Усі марки";elements.brandButtonIcon.replaceWith(makeBrandMark(brand));elements.brandButtonIcon=elements.brandButton.querySelector(".brandMark");
    elements.brandMenu.querySelectorAll(".brandOption").forEach(option=>{const selected=option.dataset.brand===brand;option.classList.toggle("selected",selected);option.setAttribute("aria-selected",String(selected));});
    if(showResults)state.showAll=true;closeBrandMenu({focusButton});render();
  }
  function prepareBrandPicker(brands){
    ["",...brands].forEach(brand=>{const option=document.createElement("button");option.type="button";option.className="brandOption";option.setAttribute("role","option");option.dataset.brand=brand;option.setAttribute("aria-selected",String(!brand));option.append(makeBrandMark(brand),document.createTextNode(brand||"Усі марки"));option.addEventListener("click",()=>selectBrand(brand,{focusButton:true}));elements.brandMenu.append(option);});
    elements.brandButton.addEventListener("click",()=>elements.brandMenu.hidden?openBrandMenu():closeBrandMenu());
    elements.brandButton.addEventListener("keydown",event=>{if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();openBrandMenu(event.key==="ArrowUp"?"last":"selected");}});
    elements.brandMenu.addEventListener("keydown",event=>{const options=[...elements.brandMenu.querySelectorAll(".brandOption")];const index=options.indexOf(document.activeElement);if(event.key==="Escape"){event.preventDefault();closeBrandMenu({focusButton:true});return;}if((event.key==="Enter"||event.key===" ")&&index>=0){event.preventDefault();options[index].click();return;}if(!["ArrowDown","ArrowUp","Home","End"].includes(event.key))return;event.preventDefault();let next=index;if(event.key==="Home")next=0;else if(event.key==="End")next=options.length-1;else next=(index+(event.key==="ArrowDown"?1:-1)+options.length)%options.length;options[next].focus();});
    document.addEventListener("pointerdown",event=>{if(!elements.brandPicker.contains(event.target))closeBrandMenu();});
  }
  function prepareFilters(){
    const brands=uniqueSorted(catalog.map(record=>record.brand));prepareBrandPicker(brands);
    addOptions(elements.market,catalog.flatMap(record=>record.markets||[]),value=>marketNames[value]||value);
    addOptions(elements.tool,catalog.filter(isVerified).map(record=>record.lishi));
    brands.forEach(brand=>{
      const button=document.createElement("button");button.type="button";button.className="brandChip";button.append(makeBrandMark(brand),document.createTextNode(brand));button.dataset.brand=brand;
      button.addEventListener("click",()=>selectBrand(elements.brand.value===brand?"":brand));elements.chips.append(button);
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
    const brand=document.createElement("div");brand.className="brand brandWithMark";brand.append(makeBrandMark(record.brand),document.createTextNode(record.brand));const model=document.createElement("button");model.type="button";model.className="model modelPhotoButton";model.title="Показати фото";model.setAttribute("aria-label","Показати фото "+record.brand+" "+record.model);model.append(document.createTextNode(record.model),Object.assign(document.createElement("span"),{className:"modelPhotoIcon",textContent:"📷"}));model.addEventListener("click",()=>showPhoto(record));
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
  [elements.market,elements.ignition,elements.tool].forEach(element=>element.addEventListener("change",()=>{state.showAll=true;render();}));
  elements.clear.addEventListener("click",()=>{elements.query.value="";elements.query.focus();state.showAll=false;render();});elements.showAll.addEventListener("click",()=>{state.showAll=true;render();});elements.reset.addEventListener("click",refreshOfflineVersion);
  elements.photoClose.addEventListener("click",closePhotoDialog);elements.photoDialog.addEventListener("click",event=>{if(event.target===elements.photoDialog)closePhotoDialog();});elements.photoDialog.addEventListener("close",()=>{state.photoRequest+=1;if(photoController)photoController.abort();elements.photoImage.removeAttribute("src");});
  prepareFilters();render();registerServiceWorker();
})();
