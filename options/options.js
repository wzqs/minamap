document.getElementById('supportedWebsites').addEventListener('click', function () {
    // document.getElementById('overlay').style.display = 'flex';
    let dom = document.getElementById('overlay');
    dom.classList.add('show');
});

document.getElementById('closeOverlay').addEventListener('click', function () {
    let dom = document.getElementById('overlay');
    dom.classList.remove('show');
});

document.getElementById('configureApiKey').addEventListener('click', function () {
    let dom = document.getElementById('overlayApiKey');
    dom.classList.add('show');
    // fetch api key from chrome.storage
    chrome.storage.sync.get(['apiKey'], function (result) {
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
    // save api key to chrome.storage
    chrome.storage.sync.set({ apiKey: apiKey }, function () {
        console.log('API Key is saved');
        // close overlay
        document.getElementById('overlayApiKey').classList.remove('show');
    });
});

// input search
const searchInput = document.querySelector('.search');
const dropdown = document.getElementById('dropdown');

searchInput.addEventListener('keydown', function (event) {
    const query = this.value.trim();
    // Validate: contains only letters and numbers and is exactly 55 characters long
    const isValid = /^[a-zA-Z0-9]{55}$/.test(query);

    if (event.key === 'Enter') {
        dropdown.innerHTML = ''; // clear dropdown
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

            // show dropdown
            dropdown.classList.add('show');
        } else {
            dropdown.classList.remove('show'); // hide dropdown if input is invalid
        }
    }
});

// listen to blur event
searchInput.addEventListener('blur', function () {
    setTimeout(() => {
        dropdown.classList.remove('show'); // hide dropdown when losing focus
    }, 100); // set delay, so user can click dropdown items
});

// click event handler
document.addEventListener('click', function (event) {
    if (!searchInput.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

// add easter egg
let clickCount = 0;
let lastClickTime = 0;
const versionElement = document.querySelector('.version');

versionElement.addEventListener('click', function (event) {
    const currentTime = new Date().getTime();
    if (currentTime - lastClickTime > 1000) {
        // if two clicks are more than 1 second apart, reset count
        clickCount = 0;
    }
    clickCount++;
    lastClickTime = currentTime;

    if (clickCount === 6) {
        // open a new window after 6 consecutive clicks
        window.open('https://minascan.io/mainnet/validator/B62qn7KLcjFRqNhnUngn2iky62Lq4E8G2t66KdFKTdeJUzwoEkPsSmJ/delegations', '_blank,noopener,noreferrer');
        clickCount = 0; // reset count
    }
});

document.getElementById('addressLabelManager').addEventListener('click', function () {
    let dom = document.getElementById('overlayAddressLabel');
    dom.classList.add('show');
    initializeLabelManager();
});

document.getElementById('closeOverlayAddressLabel').addEventListener('click', function () {
    let dom = document.getElementById('overlayAddressLabel');
    dom.classList.remove('show');
});

document.getElementById('saveLabel').addEventListener('click', function() {
    const address = document.getElementById('addressInput').value;
    const label = document.getElementById('labelInput').value;
    
    if (address && label) {
        saveAddressLabel(address, label);
        initializeLabelManager();
        
        document.getElementById('addressInput').value = '';
        document.getElementById('labelInput').value = '';
    }
});

function saveAddressLabel(address, label) {
    const labels = JSON.parse(localStorage.getItem('addressLabels')) || {};
    labels[address] = label;
    localStorage.setItem('addressLabels', JSON.stringify(labels));
}

function initializeLabelManager() {
    const labels = JSON.parse(localStorage.getItem('addressLabels')) || {};
    const labelList = document.getElementById('labelList');
    labelList.innerHTML = '';
    
    const labelsContainer = document.createElement('div');
    labelsContainer.className = 'labels-container hidden';
    
    Object.entries(labels).forEach(([address, label]) => {
        const li = document.createElement('li');
        
        const labelInfo = document.createElement('div');
        labelInfo.className = 'label-info';
        
        const labelName = document.createElement('div');
        labelName.className = 'label-name';
        labelName.textContent = label;
        
        const labelAddress = document.createElement('div');
        labelAddress.className = 'label-address';
        labelAddress.textContent = address;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'delete';
        deleteBtn.onclick = () => deleteLabel(address);
        
        labelInfo.appendChild(labelName);
        labelInfo.appendChild(labelAddress);
        li.appendChild(labelInfo);
        li.appendChild(deleteBtn);
        labelsContainer.appendChild(li);
    });
    
    labelList.appendChild(labelsContainer);
    
    document.getElementById('toggleHistoryBtn').onclick = function() {
        if (labelsContainer.classList.contains('hidden')) {
            labelsContainer.classList.remove('hidden');
            this.textContent = 'Hide History Labels';
        } else {
            labelsContainer.classList.add('hidden');
            this.textContent = 'Show History Labels';
        }
    };
}

function deleteLabel(address) {
    const labels = JSON.parse(localStorage.getItem('addressLabels')) || {};
    delete labels[address];
    localStorage.setItem('addressLabels', JSON.stringify(labels));
    initializeLabelManager();
}