const siteInput = document.getElementById('siteInput');
const checkBtn = document.getElementById('checkBtn');
const resultDiv = document.getElementById('result');
const statsSpan = document.getElementById('stats');

function normalize(site) {
  return site.trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}

function showResult(site, banned, loading = false) {
  resultDiv.style.display = 'block';
  
  if (loading) {
    resultDiv.className = 'result';
    resultDiv.innerHTML = `<div class="result-icon">⏳</div><div class="result-text">Проверка ${site}...</div>`;
    return;
  }
  
  if (banned) {
    resultDiv.className = 'result banned';
    resultDiv.innerHTML = `
      <div class="result-icon">🚫</div>
      <div class="result-text">${site} — ЗАБЛОКИРОВАН</div>
      <div class="result-sub">IP или домен в реестре РКН</div>
    `;
  } else {
    resultDiv.className = 'result clean';
    resultDiv.innerHTML = `
      <div class="result-icon">✅</div>
      <div class="result-text">${site} — НЕ ЗАБЛОКИРОВАН</div>
      <div class="result-sub">в реестре РКН не найден</div>
    `;
  }
}

checkBtn.addEventListener('click', () => {
  const site = normalize(siteInput.value);
  if (!site) {
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="result-text">⚠️ Введите адрес сайта</div>';
    return;
  }
  
  showResult(site, false, true);
  
  chrome.runtime.sendMessage({ action: 'check', site: site }, (res) => {
    if (res && typeof res.banned !== 'undefined') {
      showResult(site, res.banned);
    } else {
      resultDiv.innerHTML = '<div class="result-text">❌ Ошибка связи</div>';
    }
  });
});

document.getElementById('ex1').onclick = () => {
  siteInput.value = 'krakenfiles.com';
  checkBtn.click();
};
document.getElementById('ex2').onclick = () => {
  siteInput.value = 'rutracker.org';
  checkBtn.click();
};
document.getElementById('ex3').onclick = () => {
  siteInput.value = 'google.com';
  checkBtn.click();
};

function updateStats() {
  chrome.runtime.sendMessage({ action: 'getStats' }, (res) => {
    if (res && !res.loading) {
      statsSpan.textContent = `📋 IP: ${res.ips.toLocaleString()} | Доменов: ${res.domains.toLocaleString()}`;
    } else {
      statsSpan.textContent = '⏳ Загрузка списков...';
    }
  });
}

updateStats();
setInterval(updateStats, 3000);