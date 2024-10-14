document.getElementById('supportedWebsites').addEventListener('click', function () {
    // document.getElementById('overlay').style.display = 'flex';
    let dom = document.getElementById('overlay');
    dom.classList.add('show');
});

document.getElementById('closeOverlay').addEventListener('click', function () {
    let dom = document.getElementById('overlay');
    dom.classList.remove('show');
});

document.getElementById('customizeFeatures').addEventListener('click', function () {
    // document.getElementById('overlay').style.display = 'flex';
    let dom = document.getElementById('overlay2');
    dom.classList.add('show');
});

document.getElementById('closeOverlay2').addEventListener('click', function () {
    let dom = document.getElementById('overlay2');
    dom.classList.remove('show');
});

document.getElementById('configureApiKey').addEventListener('click', function () {
    let dom = document.getElementById('overlayApiKey');
    dom.classList.add('show');
    // 从 chrome.storage 中获取已保存的 API Key
    chrome.storage.sync.get(['apiKey'], function(result) {
        if (result.apiKey) {
            document.getElementById('apiKeyInput').value = result.apiKey;
        }
    });
});

document.getElementById('closeOverlayApiKey').addEventListener('click', function () {
    let dom = document.getElementById('overlayApiKey');
    dom.classList.remove('show');
});

document.getElementById('saveApiKey').addEventListener('click', function () {
    let apiKey = document.getElementById('apiKeyInput').value;
    // 保存 API Key 到 chrome.storage
    chrome.storage.sync.set({apiKey: apiKey}, function() {
        console.log('API Key is saved');
        // 关闭 overlay
        document.getElementById('overlayApiKey').classList.remove('show');
    });
});

// input 搜索
const searchInput = document.querySelector('.search');
const dropdown = document.getElementById('dropdown');

searchInput.addEventListener('keydown', function(event) {
    const query = this.value.trim();
    // Validate: contains only letters and numbers and is exactly 55 characters long
    const isValid = /^[a-zA-Z0-9]{55}$/.test(query);
    
    if (event.key === 'Enter') {
        dropdown.innerHTML = ''; // 清空下拉列表
        console.log(isValid);
        if (isValid) {
            const supportedWebsites = [
                { name: 'minaexplorer.com', url: `https://minaexplorer.com/wallet/${query}` },
                { name: 'minascan.io', url: `https://minascan.io/mainnet/account/${query}` }
            ];

            supportedWebsites.forEach(site => {
                const item = document.createElement('div');
                item.classList.add('dropdown-item');
                item.innerHTML = `
                    <div class="site-info">
                        <img src="/img/${site.name.split('.')[0]}-logo.png" class="site-logo">
                    </div>
                    <a href="${site.url}" target="_blank">${site.url}</a>
                `;
                dropdown.appendChild(item);
            });

            // 显示下拉列表
            dropdown.classList.add('show');
        } else {
            dropdown.classList.remove('show'); // 如果没有输入，隐藏下拉列表
        }
    }
});

// 监听失去焦点事件
searchInput.addEventListener('blur', function() {
    setTimeout(() => {
        dropdown.classList.remove('show'); // 失去焦点时隐藏下拉列表
    }, 100); // 设置延迟，以便用户可以点击下拉项
});

// 点击事件处理
document.addEventListener('click', function(event) {
    if (!searchInput.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});