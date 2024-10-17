// Configuration
const CONFIG = {
    SUPPORTED_SITES: [
        { regex: /^https:\/\/minaexplorer\.com\/wallet\/[a-zA-Z0-9]{55}$/ },
        { regex: /^https:\/\/minascan\.io\/mainnet\/account\/[a-zA-Z0-9]{55}$/ }
    ],
    MAX_TX_LIMIT: 2500,
    MAX_NODES: 28,
    BUTTON_TEXT: 'Fund Flow',
    BUTTON_STYLE: {
        backgroundColor: '#7191FC'
    },
    CHART_CONTAINER_ID: 'flow-chart-container'
};

// Main function
window.onload = function () {
    if (isSupportedSite(window.location.href)) {
        const accountOverviewElement = document.querySelector('h5.card-title') || document.querySelector('.TabSwitcher_tabSwitcher__PGC63');
        if (accountOverviewElement) {
            setupAccountOverview(accountOverviewElement);
        }
    }
};

// Utility functions
const isSupportedSite = (url) => CONFIG.SUPPORTED_SITES.some(site => site.regex.test(url));

const getAccountId = (url) => url.split('/').pop();

const formatAmount = (amount) => (amount / 1e9).toFixed(9);

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
        time: 5000,
    });

    try {
        const accountUrl = window.location.href;
        const allData = await fetchTransactionData(accountUrl);
        generateFlowChart(allData);
    } finally {
        layer.closeAll("loading");
    }
}

// Data fetching and processing
async function fetchTransactionData(accountUrl) {
    if (!accountUrl.startsWith('https://minaexplorer.com/wallet/')) {
        throw new Error('unsupported site');
    }

    const apiUrl = `https://minaexplorer.com/all-transactions/${getAccountId(accountUrl)}`;
    const txNums = await fetchTxNums(apiUrl);
    const fullData = await fetchAllTx(apiUrl, txNums);
    return processTransactionData(fullData);
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

function processTransactionData(data) {
    const accountId = getAccountId(window.location.href);
    const flowData = { incoming: new Map(), outgoing: new Map() };

    data.data.forEach(tx => {
        if (tx.kind === 'PAYMENT' && tx.amount !== 0 && tx.from !== tx.to) {
            processTransaction(tx, accountId, flowData);
        }
    });

    return flowData;
}

function processTransaction(tx, accountId, flowData) {
    const { amount, from, to, fromUserName, toUserName, memo } = tx;
    const isOutgoing = from === accountId;
    const targetMap = isOutgoing ? flowData.outgoing : flowData.incoming;
    const targetAddress = isOutgoing ? to : from;
    const userName = isOutgoing ? toUserName : fromUserName;

    updateFlowData(targetMap, targetAddress, amount, userName, memo);
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
    const accountId = getAccountId(window.location.href);
    const nodes = [{ id: accountId, group: 1, userName: '' }];
    const links = [];
    const addedNodes = new Set([accountId]);

    processFlowDataMap(flowData.incoming, nodes, links, addedNodes, accountId, 2, "incoming");
    processFlowDataMap(flowData.outgoing, nodes, links, addedNodes, accountId, 3, "outgoing");

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
    noDataMessage.textContent = 'No available transaction data';
    container.appendChild(noDataMessage);
}

// D3.js chart creation (unchanged)
function createChart(container, data) {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 50, right: 120, bottom: 100, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(container)
        .append("svg")
        .attr("width", "100%") // Change to percentage
        .attr("height", "100%") // Change to percentage
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Define arrow
    svg.append("defs").selectAll("marker")
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

    // Separate incoming and outgoing nodes, and handle cases with both incoming and outgoing
    const incomingNodes = new Set(data.links.filter(l => l.type === "incoming").map(l => l.source));
    const outgoingNodes = new Set(data.links.filter(l => l.type === "outgoing").map(l => l.target));

    // Create a set to store addresses that are both incoming and outgoing  
    const bothInAndOut = new Set(
        [...incomingNodes].filter(node => outgoingNodes.has(node))
    );

    const centerNode = data.nodes.find(n => n.group === 1);

    const nodeHeight = 30;
    const rectWidth = 160;

    // Get the maximum and minimum number of nodes
    const maxNodes = Math.max(incomingNodes.size, outgoingNodes.size);
    const minNodes = Math.min(incomingNodes.size, outgoingNodes.size);

    // Calculate scale
    const yScaleMax = d3.scaleLinear()
        .domain([0, maxNodes - 1])
        .range([nodeHeight, innerHeight - nodeHeight]);

    const yScaleMin = d3.scaleLinear()
        .domain([0, minNodes - 1])
        .range([yScaleMax(0), yScaleMax(maxNodes - 1)]);

    // Map node ID to object
    const nodeMap = new Map();

    // Process incoming nodes
    [...incomingNodes].forEach((id, i) => {
        const yPosition = (incomingNodes.size === maxNodes) ? yScaleMax(i) : yScaleMin(i);
        const nodeData = data.nodes.find(n => n.id === id) || {};
        nodeMap.set(id + "_in", { id: id, x: 100, y: yPosition, group: 2, userName: nodeData.userName || "" });
    });

    // Process outgoing nodes
    [...outgoingNodes].forEach((id, i) => {
        const yPosition = (outgoingNodes.size === maxNodes) ? yScaleMax(i) : yScaleMin(i);
        const nodeData = data.nodes.find(n => n.id === id) || {};
        nodeMap.set(id + "_out", { id: id, x: innerWidth - 100, y: yPosition, group: 3, userName: nodeData.userName || "" });
    });

    // Center node position
    centerNode.x = innerWidth / 2;
    centerNode.y = innerHeight / 2;
    nodeMap.set(centerNode.id, centerNode);

    // Modify node drawing part
    const node = svg.selectAll(".node")
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
        .attr("rx", 3)
        .attr("ry", 3)
        .style("cursor", "pointer")
        .on("click", function (event, d) {
            window.open(`https://minaexplorer.com/wallet/${d.id}`, '_blank', 'noopener', 'noreferrer');
        });

    node.append("text")
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .attr("x", d => d.group === 2 ? -rectWidth / 2 : (d.group === 3 ? rectWidth / 2 : 0))
        .text(d => {
            const displayName = d.userName ? ` ${d.userName}` : '';
            return `${displayName} (${d.id.slice(-4)})`;
        })
        .attr("fill", d => {
            if (d.group !== 1 && bothInAndOut.has(d.id)) {
                return "black";
            }
            return "#fff";
        })
        .attr("font-size", "12px");

    // Modify path drawing part
    const link = svg.selectAll(".link")
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

    // Modify transaction info label
    link.append("text")
        .attr("class", "transaction-info")
        .attr("dy", -5)
        .attr("text-anchor", "middle")
        .attr("font-size", 10)
        .attr("fill", "#333")
        .attr("transform", d => {
            const sourceNode = d.type === "incoming" ? nodeMap.get(d.source + "_in") : centerNode;
            const targetNode = d.type === "incoming" ? centerNode : nodeMap.get(d.target + "_out");
            const midX = (sourceNode.x + targetNode.x) / 2;
            const x = d.type === "incoming" ? (sourceNode.x + midX - 10) / 2 : (midX + 10 + targetNode.x) / 2;
            const y = d.type === "incoming" ? sourceNode.y : targetNode.y;
            return `translate(${x}, ${y})`;
        })
        .text(d => `${(d.value / 1e9).toFixed(4)} MINA`);

    // Add an invisible path for each link, used for text positioning
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
