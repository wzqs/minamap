// Configuration
const CONFIG = {
    SUPPORTED_SITES: [
        { regex: /^https:\/\/minaexplorer\.com\/wallet\/[a-zA-Z0-9]{55}$/ },
        { regex: /^https:\/\/minascan\.io\/mainnet\/account/ }
    ],
    MAX_TX_LIMIT: 2500,
    MAX_NODES: 35,
    BUTTON_TEXT: 'Fund Flow',
    BUTTON_STYLE: {
        backgroundColor: '#7191FC'
    },
    CHART_CONTAINER_ID: 'flow-chart-container',
    MINAEXPLORER_API: 'https://api.minaexplorer.com',
    MINASCAN_API: 'https://api.blockberry.one/mina-mainnet',
};

// Main function
function initialize() {
    const currentUrl = window.location.href;
    if (!isSupportedSite(currentUrl)) return;

    // check if the button already exists
    if (document.querySelector('.fund-flow-button')) {
        return;
    }

    const selectors = ['h5.card-title', '.TabSwitcher_tabSwitcher__PGC63'];
    const accountOverviewElement = selectors.reduce((element, selector) =>
        element || document.querySelector(selector), null);

    if (accountOverviewElement) {
        setupAccountOverview(accountOverviewElement);
    }
}

// dom ready and url change observer
window.onload = initialize;

let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl && isSupportedSite(currentUrl)) {
        lastUrl = currentUrl;
        initialize();
    }
});

urlObserver.observe(document, {
    subtree: true,
    childList: true
});

// Utility functions
const isSupportedSite = (url) => CONFIG.SUPPORTED_SITES.some(site => site.regex.test(url));

// get api key from storage
async function getApiKeyFromStorage() {
    try {
        if (!chrome.runtime || !chrome.runtime.id) {
            console.warn('Chrome extension context invalid - please refresh the page');
            return '';
        }

        return new Promise((resolve) => {
            chrome.storage.local.get(['apiKey'], function (result) {
                if (chrome.runtime.lastError) {
                    console.warn('Failed to get API key:', chrome.runtime.lastError);
                    resolve('');
                } else {
                    resolve(result.apiKey || '');
                }
            });
        });
    } catch (error) {
        console.warn('Error getting API key:', error);
        return '';
    }
}

const getAccountId = (url) => {
    const accountRegex = /(?:account|wallet)\/([A-Za-z0-9]{55})/;
    const match = url.match(accountRegex);
    return match?.[1];
};


// DOM manipulation functions
function setupAccountOverview(accountOverviewElement) {
    const container = createContainer(accountOverviewElement);
    const button = createButton();
    container.appendChild(button);

    button.addEventListener('click', handleButtonClick);

    adjustContainerWidth();
}

function createContainer(accountOverviewElement) {
    const container = document.createElement('div');
    container.classList.add('account-overview-container');
    accountOverviewElement.parentNode.insertBefore(container, accountOverviewElement);
    container.appendChild(accountOverviewElement);
    return container;
}

function createButton() {
    const button = document.createElement('button');
    button.innerText = CONFIG.BUTTON_TEXT;
    button.classList.add('fund-flow-button', 'layui-btn', 'layui-btn-sm', 'layui-btn-normal', 'layui-anim');
    Object.assign(button.style, CONFIG.BUTTON_STYLE);
    return button;
}

function adjustContainerWidth() {
    $(document).ready(function () {
        $('.table-responsive .table-striped tbody tr').each(function () {
            $(this).find('th').each(function () {
                var width = $(this).width();
                $('.account-overview-container h5').css('width', width + 40 + 'px');
            });
        });
    });
}

// Event handlers
async function handleButtonClick() {
    const loadingIndex = layer.load(2, {
        shade: [0.5, '#000'],
        content: 'loading...',
        time: 15000,
    });

    try {
        const accountUrl = window.location.href;
        const allData = await fetchTransactionData(accountUrl);
        generateFlowChart(allData);
    } finally {
        layer.closeAll("loading");
    }
}

async function getAddressLabel(address) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['addressLabels'], function(result) {
            const labels = result.addressLabels || {};
            resolve(labels[address] || null);
        });
    });
}

// Data fetching and processing
async function fetchTransactionData(accountUrl) {
    if (accountUrl.startsWith('https://minaexplorer.com/wallet/')) {
        return fetchMinaExplorerData(accountUrl);
    } else if (accountUrl.startsWith('https://minascan.io/mainnet/account/')) {
        return fetchMinascanData(accountUrl);
    } else {
        throw new Error('Unsupported site');
    }
}

// minascan
async function fetchMinascanData(accountUrl) {
    const accountId = getAccountId(accountUrl);
    const accountInfoUrl = `${CONFIG.MINAEXPLORER_API}/accounts/${accountId}`;
    const accountInfo = await fetchAccountInfo(accountInfoUrl);
    const apiUrl = CONFIG.MINASCAN_API + `/v1/accounts/${accountId}`;
    const txNums = await fetchTxNumsV1(apiUrl);
    const fullData = await fetchAllTxV1(apiUrl, txNums);
    return processMinascanTransactionData(fullData, accountId, accountInfo);
}

async function fetchTxNumsV1(apiUrl) {
    const apiKey = await getApiKeyFromStorage();
    const response = await fetch(`${apiUrl}/txs?page=0&size=1&orderBy=DESC&sortBy=AGE&direction=ALL`, {
        headers: {
            'X-API-KEY': apiKey
        }
    });
    const data = await response.json();
    const totalTxs = data.totalElements;
    return totalTxs;
}

async function fetchAllTxV1(apiUrl, txNums) {
    const apiKey = await getApiKeyFromStorage();
    const maxSize = 50;
    const pages = Math.min(Math.ceil(txNums / maxSize), Math.ceil(CONFIG.MAX_TX_LIMIT / maxSize));

    // create parallel requests
    const requests = Array.from({ length: pages }, (_, page) =>
        fetch(`${apiUrl}/txs?page=${page}&size=${maxSize}&orderBy=DESC&sortBy=AGE&direction=ALL`, {
            headers: { 'X-API-KEY': apiKey }
        }).then(response => {
            if (response.status !== 200) {
                throw new Error('Response error');
            }
            return response.json();
        })
    );

    try {
        // execute all requests in parallel
        const results = await Promise.all(requests);
        const allTransactions = results.flatMap(result => result.data);

        // ensure not exceed the max tx limit
        return allTransactions.slice(0, CONFIG.MAX_TX_LIMIT);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        throw error;
    }
}

async function processMinascanTransactionData(data, accountId, accountInfo) {
    const flowData = {
        incoming: new Map(),
        outgoing: new Map(),
        centerNodeInfo: {
            id: accountId,
            userName: accountInfo.account.username || '',
            isCoinbaseReceiver: accountInfo.account.totalBlocks > 0
        }
    };

    // Process all transactions using Promise.all
    await Promise.all(data.map(async tx => {
        if (tx.type === 'payment' && tx.amount !== 0 && tx.senderAddress !== tx.receiverAddress) {
            await processMinascanTransaction(tx, accountId, flowData);
        }
    }));

    return flowData;
}

async function processMinascanTransaction(tx, accountId, flowData) {
    const { amount, senderAddress, receiverAddress, senderName, receiverName, memo } = tx;
    const isOutgoing = senderAddress === accountId;
    const targetMap = isOutgoing ? flowData.outgoing : flowData.incoming;
    const targetAddress = isOutgoing ? receiverAddress : senderAddress;
    
    // Prioritize locally saved label
    const savedLabel = await getAddressLabel(targetAddress);
    const userName = savedLabel || (isOutgoing ? receiverName : senderName) || "Unknown";

    updateFlowData(targetMap, targetAddress, amount, userName, memo);
}

// minaexplorer 
async function fetchMinaExplorerData(accountUrl) {
    const accountId = getAccountId(accountUrl);
    const apiUrl = `${CONFIG.MINAEXPLORER_API}/accounts/${accountId}`;
    const accountInfo = await fetchAccountInfo(apiUrl);
    const txApiUrl = `https://minaexplorer.com/all-transactions/${accountId}`;
    const txNums = await fetchTxNums(txApiUrl);
    const fullData = await fetchAllTx(txApiUrl, txNums);
    return processTransactionData(fullData, accountInfo);
}

async function fetchAccountInfo(apiUrl) {
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error('network response not ok');
    }
    const data = await response.json();
    return data;
}


async function fetchTxNums(apiUrl) {
    const response = await fetch(`${apiUrl}?length=1`);
    const jsonData = await response.json();
    const totalTxs = jsonData.recordsTotal;
    return Math.min(totalTxs, CONFIG.MAX_TX_LIMIT);
}

async function fetchAllTx(apiUrl, txNums) {
    const response = await fetch(`${apiUrl}?length=${txNums}`);
    if (!response.ok) {
        throw new Error('network response not ok');
    }
    return response.json();
}

async function processTransactionData(data, accountInfo) {
    const accountId = getAccountId(window.location.href);
    const flowData = {
        incoming: new Map(), 
        outgoing: new Map(), 
        centerNodeInfo: {
            id: accountId,
            userName: accountInfo.account.username || '',
            isCoinbaseReceiver: accountInfo.account.totalBlocks > 0
        }
    };

    // Process all transactions using Promise.all
    await Promise.all(data.data.map(async tx => {
        if (tx.kind === 'PAYMENT' && tx.amount !== 0 && tx.from !== tx.to) {
            await processTransaction(tx, accountId, flowData);
        }
    }));

    return flowData;
}

async function processTransaction(tx, accountId, flowData) {
    const { amount, from, to, fromUserName, toUserName, memo } = tx;
    const isOutgoing = from === accountId;
    const targetMap = isOutgoing ? flowData.outgoing : flowData.incoming;
    const targetAddress = isOutgoing ? to : from;
    
    // Prioritize locally saved label
    const savedLabel = await getAddressLabel(targetAddress);
    const userName = savedLabel || (isOutgoing ? toUserName : fromUserName) || "Unknown";

    updateFlowData(targetMap, targetAddress, amount / 1e9, userName, memo);
}

function updateFlowData(map, address, amount, userName, memo) {
    if (map.has(address)) {
        const existing = map.get(address);
        map.set(address, {
            amount: existing.amount + amount,
            userName: userName || "Unknown",
            memo: existing.memo || memo || ""
        });
    } else {
        map.set(address, {
            amount: amount,
            userName: userName || "Unknown",
            memo: memo || ""
        });
    }
}

// Chart generation
function generateFlowChart(flowData) {
    const chartContainer = createChartContainer();
    addCloseButton(chartContainer);

    const { nodes, links } = prepareChartData(flowData);

    if (nodes.length === 1 && links.length === 0) {
        displayNoDataMessage(chartContainer);
        return;
    }

    createChart(chartContainer, { nodes, links });
}

function createChartContainer() {
    const container = document.createElement('div');
    container.id = CONFIG.CHART_CONTAINER_ID;
    document.body.appendChild(container);
    return container;
}

function addCloseButton(container) {
    const button = $('<button>', {
        type: 'button',
        class: 'close-button',
        text: 'Close'
    });
    button.on('click', () => document.body.removeChild(container));
    $(container).append(button);
}

function prepareChartData(flowData) {
    const { centerNodeInfo } = flowData;
    const nodes = [{
        id: centerNodeInfo.id,
        group: 1,
        userName: centerNodeInfo.userName,
        isCoinbaseReceiver: centerNodeInfo.isCoinbaseReceiver
    }];


    const links = [];
    const addedNodes = new Set([centerNodeInfo.id]);

    processFlowDataMap(flowData.incoming, nodes, links, addedNodes, centerNodeInfo.id, 2, "incoming");
    processFlowDataMap(flowData.outgoing, nodes, links, addedNodes, centerNodeInfo.id, 3, "outgoing");

    return { nodes, links };
}

function processFlowDataMap(dataMap, nodes, links, addedNodes, accountId, group, type) {
    if (dataMap && dataMap instanceof Map) {
        const entries = Array.from(dataMap.entries()).slice(0, CONFIG.MAX_NODES);
        entries.forEach(([address, value]) => {
            if (!addedNodes.has(address)) {
                nodes.push({ id: address, group: group, userName: value.userName });
                addedNodes.add(address);
            }
            links.push({
                source: type === "incoming" ? address : accountId,
                target: type === "incoming" ? accountId : address,
                value: value.amount,
                userName: value.userName,
                memo: value.memo,
                date: "N/A",
                type: type
            });
        });
    }
}

function displayNoDataMessage(container) {
    const noDataMessage = document.createElement('p');
    noDataMessage.textContent = 'please check if the apikey is set and correct';
    container.appendChild(noDataMessage);
}

// D3.js chart creation (unchanged)
function createChart(container, data) {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 30, right: 100, bottom: 30, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%");

    // Add zoom functionality
    const zoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", zoomed);

    svg.call(zoom);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    function zoomed(event) {
        g.attr("transform", event.transform);
    }

    // Define arrows
    g.append("defs").selectAll("marker")
        .data(["incoming", "outgoing"])
        .enter().append("marker")
        .attr("id", d => `arrow-${d}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("fill", d => d === "incoming" ? "#4CAF50" : "#2196F3")
        .attr("d", "M0,-5L10,0L0,5");

    // Separate incoming and outgoing nodes, and handle nodes with both incoming and outgoing transactions
    const incomingNodes = new Set(data.links.filter(l => l.type === "incoming").map(l => l.source));
    const outgoingNodes = new Set(data.links.filter(l => l.type === "outgoing").map(l => l.target));

    // Create a set to store addresses with both incoming and outgoing transactions
    const bothInAndOut = new Set(
        [...incomingNodes].filter(node => outgoingNodes.has(node))
    );

    const centerNode = data.nodes.find(n => n.group === 1);

    const nodeHeight = 20;
    const rectWidth = 120;

    // Get maximum and minimum number of nodes
    const maxNodes = Math.max(incomingNodes.size, outgoingNodes.size);
    const minNodes = Math.min(incomingNodes.size, outgoingNodes.size);

    // Calculate scale
    const yScaleMax = d3.scaleLinear()
        .domain([0, maxNodes - 1])
        .range([nodeHeight / 2, innerHeight - nodeHeight / 2]);

    const yScaleMin = d3.scaleLinear()
        .domain([0, minNodes - 1])
        .range([yScaleMax(0), yScaleMax(maxNodes - 1)]);

    // Map node IDs to objects
    const nodeMap = new Map();

    const leftNodeX = margin.left;
    const rightNodeX = innerWidth - margin.right;
    const centerNodeX = innerWidth / 2;

    // Handle incoming nodes
    [...incomingNodes].forEach((id, i) => {
        const yPosition = (incomingNodes.size === maxNodes) ? yScaleMax(i) : yScaleMin(i);
        const nodeData = data.nodes.find(n => n.id === id) || {};
        nodeMap.set(id + "_in", { id: id, x: leftNodeX, y: yPosition, group: 2, userName: nodeData.userName || "" });
    });

    // Handle outgoing nodes
    [...outgoingNodes].forEach((id, i) => {
        const yPosition = (outgoingNodes.size === maxNodes) ? yScaleMax(i) : yScaleMin(i);
        const nodeData = data.nodes.find(n => n.id === id) || {};
        nodeMap.set(id + "_out", { id: id, x: rightNodeX, y: yPosition, group: 3, userName: nodeData.userName || "" });
    });

    // Center node position
    centerNode.x = centerNodeX;
    centerNode.y = innerHeight / 2;
    nodeMap.set(centerNode.id, centerNode);

    // Draw nodes
    const node = g.selectAll(".node")
        .data([...nodeMap.values()])
        .enter().append("g")
        .attr("class", d => `node ${d.group === 1 ? 'center' : ''}`)
        .attr("transform", d => `translate(${d.x},${d.y})`);

    node.append("rect")
        .attr("width", rectWidth)
        .attr("height", nodeHeight)
        .attr("x", d => d.group === 1 ? -rectWidth / 2 : (d.group === 2 ? -rectWidth : 0))
        .attr("y", -nodeHeight / 2)
        .attr("fill", d => d.group === 1 ? "#FFB800" : (d.group === 2 ? "#5FB878" : "#1E9FFF"))
        .attr("stroke", d => d.group === 1 ? "#FFB800" : (d.group === 2 ? "#5FB878" : "#1E9FFF"))
        .attr("stroke-width", 1)
        .attr("rx", 2)
        .attr("ry", 2)
        .style("cursor", "pointer")
        .on("click", function (event, d) {
            const currentHost = window.location.host;
            const redirectUrl = currentHost.includes('minascan') ? `https://minascan.io/mainnet/account/${d.id}` : `https://minaexplorer.com/wallet/${d.id}`;
            window.open(redirectUrl, '_blank', 'noopener', 'noreferrer');
        });

    node.append("text")
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .attr("x", d => d.group === 2 ? -rectWidth / 2 : (d.group === 3 ? rectWidth / 2 : 0))
        .text(d => {
            const displayName = d.userName ? ` ${d.userName}` : '';
            const coinbaseLabel = d.group === 1 && d.isCoinbaseReceiver ? '(coinbase_receiver)' : '';
            return d.group === 1
                ? `${displayName}${coinbaseLabel}`
                : `${displayName} (${d.id.slice(-4)})`;
        })
        .attr("fill", d => {
            if (d.group !== 1 && bothInAndOut.has(d.id)) {
                return "black";
            }
            return "#fff";
        })
        .attr("font-size", "10px");

    // Draw paths
    const link = g.selectAll(".link")
        .data(data.links)
        .enter().append("g")
        .attr("class", "link-group");

    link.append("path")
        .attr("class", "link")
        .attr("d", d => {
            const sourceNode = d.type === "incoming" ? nodeMap.get(d.source + "_in") : centerNode;
            const targetNode = d.type === "incoming" ? centerNode : nodeMap.get(d.target + "_out");

            const midX = (sourceNode.x + targetNode.x) / 2;

            if (d.type === "incoming") {
                return `M${sourceNode.x},${sourceNode.y}
                        L${midX - 20},${sourceNode.y}
                        Q${(midX + targetNode.x) / 2},${sourceNode.y} ${targetNode.x - rectWidth / 2},${targetNode.y}`;
            } else {
                return `M${sourceNode.x + rectWidth / 2},${sourceNode.y}
                        Q${(sourceNode.x + midX) / 2},${targetNode.y} ${midX + 20},${targetNode.y}
                        L${targetNode.x},${targetNode.y}`;
            }
        })
        .attr("fill", "none")
        .attr("stroke", d => d.type === "incoming" ? "#4CAF50" : "#2196F3")
        .attr("stroke-width", 1.8)
        .attr("marker-end", d => `url(#arrow-${d.type})`);

    // Modify transaction information labels
    link.append("text")
        .attr("class", "transaction-info")
        .attr("dy", -3)
        .attr("text-anchor", "middle")
        .attr("font-size", 8)
        .attr("fill", "#333")
        .attr("transform", d => {
            const sourceNode = d.type === "incoming" ? nodeMap.get(d.source + "_in") : centerNode;
            const targetNode = d.type === "incoming" ? centerNode : nodeMap.get(d.target + "_out");
            const midX = (sourceNode.x + targetNode.x) / 2;
            const x = d.type === "incoming" ? (sourceNode.x + midX - 10) / 2 : (midX + 10 + targetNode.x) / 2;
            const y = d.type === "incoming" ? sourceNode.y : targetNode.y;
            return `translate(${x}, ${y})`;
        })
        .text(d => `${Number(d.value).toFixed(8)} MINA`);

    // Add an invisible path for each link for text positioning
    link.append("path")
        .attr("id", (d, i) => `path-${i}`)
        .attr("d", d => {
            const sourceNode = d.type === "incoming" ? nodeMap.get(d.source + "_in") : centerNode;
            const targetNode = d.type === "incoming" ? centerNode : nodeMap.get(d.target + "_out");
            return `M${sourceNode.x},${sourceNode.y} L${targetNode.x},${targetNode.y}`;
        })
        .attr("fill", "none")
        .attr("stroke", "none");
}

