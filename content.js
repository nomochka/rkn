(async function() {
  const hostname = window.location.hostname.replace(/^www\./, '');
  
  let ip = 'определяется...';
  try {
    const resp = await fetch(`https://dns.google/resolve?name=${hostname}&type=A`);
    const data = await resp.json();
    if (data.Answer?.[0]) ip = data.Answer[0].data;
  } catch(e) {}
  
  const indicator = document.createElement('div');
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(8px);
    color: white;
    padding: 10px 16px;
    border-radius: 40px;
    font-size: 12px;
    font-family: monospace;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
  `;
  indicator.innerHTML = `🔍 Проверка ${hostname} (${ip})...`;
  document.body.appendChild(indicator);
  
  chrome.runtime.sendMessage({ action: 'check', site: hostname }, (res) => {
    if (res?.banned) {
      indicator.style.background = '#c62828';
      indicator.innerHTML = `🚫 ${hostname} (${ip}) - В РЕЕСТРЕ РКН`;
    } else {
      indicator.style.background = '#2e7d32';
      indicator.innerHTML = `✅ ${hostname} (${ip}) - не заблокирован`;
      setTimeout(() => {
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 1000);
      }, 4000);
    }
  });
})();