let blockedIPs = new Set();
let isLoading = true;

// Резервные IP (Discord, Rutracker и другие)
const FALLBACK_IPS = [
  // Discord
  '162.159.137.232', '162.159.137.233', '162.159.138.232', '162.159.138.233',
  '162.159.128.232', '162.159.128.233', '162.159.129.232', '162.159.129.233',
  // Rutracker
  '195.82.146.214', '195.82.146.215', '195.82.146.216', '195.82.146.217',
  '195.82.146.218', '195.82.146.219', '195.82.146.220',
  // Krakenfiles
  '104.21.48.1', '104.21.48.2', '172.67.168.1',
  // Torproject
  '204.8.99.42', '204.8.99.43', '204.8.99.44',
  // Meduza
  '5.178.81.202', '5.178.81.203',
  // Другие популярные
  '5.255.255.50', '5.255.255.55', '5.255.255.60', '5.255.255.65',
  '5.255.255.70', '5.255.255.75', '5.255.255.80'
];

// Загрузка IP из GitHub
async function loadIPs() {
  isLoading = true;
  console.log('🔄 Загрузка IP из реестра РКН...');
  
  try {
    const response = await fetch('https://raw.githubusercontent.com/sanmai/blacklist/master/blacklist.txt');
    const text = await response.text();
    const lines = text.split('\n');
    const ips = new Set();
    
    for (let line of lines) {
      let ip = line.trim();
      if (ip && ip.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
        ips.add(ip);
      }
    }
    
    if (ips.size > 1000) {
      // Добавляем резервные IP
      for (let ip of FALLBACK_IPS) ips.add(ip);
      blockedIPs = ips;
      console.log(`✅ Загружено ${blockedIPs.size} IP (${FALLBACK_IPS.length} резервных)`);
      
      // Сохраняем в кэш
      await chrome.storage.local.set({ 
        blockedIPs: Array.from(blockedIPs),
        lastUpdate: Date.now()
      });
    } else {
      throw new Error('Мало IP');
    }
  } catch (e) {
    console.log('Ошибка загрузки, беру из кэша:', e);
    const cached = await chrome.storage.local.get(['blockedIPs']);
    if (cached.blockedIPs && cached.blockedIPs.length > 100) {
      blockedIPs = new Set(cached.blockedIPs);
      console.log(`📦 Из кэша: ${blockedIPs.size} IP`);
    } else {
      blockedIPs = new Set(FALLBACK_IPS);
      console.log(`⚠️ Резервный список: ${blockedIPs.size} IP`);
    }
  }
  
  isLoading = false;
  console.log(`🎯 ГОТОВО: ${blockedIPs.size} IP в списке блокировки`);
}

// Получение IP сайта
async function getIP(domain) {
  try {
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
    const data = await response.json();
    if (data.Answer && data.Answer.length > 0) {
      return data.Answer[0].data;
    }
  } catch (e) {}
  return null;
}

// Проверка сайта
async function isBanned(site) {
  const normalized = site.toLowerCase().replace(/^www\./, '').replace(/\/$/, '');
  const ip = await getIP(normalized);
  if (!ip) return false;
  
  const banned = blockedIPs.has(ip);
  console.log(`${banned ? '🚫' : '✅'} ${normalized} (${ip})`);
  return banned;
}

// Обновление иконки
async function updateIcon(tabId, url) {
  if (!url) return;
  try {
    const hostname = new URL(url).hostname;
    const banned = await isBanned(hostname);
    chrome.action.setBadgeText({ text: banned ? '🚫' : '✅', tabId });
    chrome.action.setBadgeBackgroundColor({ color: banned ? '#c62828' : '#2e7d32', tabId });
  } catch (e) {}
}

// Слушатели вкладок
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) updateIcon(tabId, tab.url);
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) updateIcon(activeInfo.tabId, tab.url);
  });
});

// Обработка сообщений
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'check') {
    isBanned(request.site).then(banned => sendResponse({ banned }));
    return true;
  }
  
  if (request.action === 'getStats') {
    sendResponse({ ips: blockedIPs.size });
  }
  
  if (request.action === 'getAllBanned') {
    sendResponse({ ips: Array.from(blockedIPs), count: blockedIPs.size });
  }
  
  return true;
});

// Запуск
loadIPs();
setInterval(loadIPs, 6 * 60 * 60 * 1000);