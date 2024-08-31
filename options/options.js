document.getElementById('supportedWebsites').addEventListener('click', function () {
    document.getElementById('overlay').style.display = 'flex';
});

document.getElementById('closeOverlay').addEventListener('click', function () {
    document.getElementById('overlay').style.display = 'none';
});

document.querySelector('.search').addEventListener('keydown', function(event) {
    const query = this.value.trim();
    const dropdown = document.getElementById('dropdown');
    
    if (event.key === 'Enter') {
        dropdown.innerHTML = '';

        if (query) {
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

            dropdown.style.display = 'block';
        } else {
            dropdown.style.display = 'none';
        }
    }
});


document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('dropdown');
    const searchInput = document.querySelector('.search');

    if (!searchInput.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.style.display = 'none';
    }
});