// Function executed when the page loads
window.onload = function () {
    if (isSupportedSite(window.location.href)) {
        const accountOverviewElement = document.querySelector('h5.card-title') || document.querySelector('.TabSwitcher_tabSwitcher__PGC63');
        if (accountOverviewElement) {
            setupAccountOverview(accountOverviewElement);
        }
    }
};

// Check if the current URL is a supported site
function isSupportedSite(url) {
    const supportedSites = [
        { regex: /^https:\/\/minaexplorer\.com\/wallet\/[a-zA-Z0-9]{55}$/ },
        { regex: /^https:\/\/minascan\.io\/mainnet\/account\/[a-zA-Z0-9]{55}$/ }
    ];
    return supportedSites.some(site => site.regex.test(url));
}

// Set up the account overview section
function setupAccountOverview(accountOverviewElement) {
    const container = createContainer(accountOverviewElement);
    const button = createButton();
    container.appendChild(button);

    button.addEventListener('click', handleButtonClick);

    adjustContainerWidth();
}

// Create a container for the account overview
function createContainer(accountOverviewElement) {
    const container = document.createElement('div');
    container.classList.add('account-overview-container');
    accountOverviewElement.parentNode.insertBefore(container, accountOverviewElement);
    container.appendChild(accountOverviewElement);
    return container;
}

// Create the "Fund Flow" button
function createButton() {
    const button = document.createElement('button');
    button.innerText = 'Fund Flow';
    button.classList.add('fund-flow-button', 'layui-btn', 'layui-btn-sm', 'layui-btn-normal', 'layui-anim');
    button.style.backgroundColor = '#7191FC';
    return button;
}

// Handle the button click event
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

// Adjust the container width based on the table
function adjustContainerWidth() {
    $(document).ready(function() {
        $('.table-responsive .table-striped tbody tr').each(function() {
            $(this).find('th').each(function() {
                var width = $(this).width();
                $('.account-overview-container h5').css('width', width + 40 + 'px');
            });
        });
    });
}

// Fetch transaction data for the account
async function fetchTransactionData(accountUrl) {
    if (!accountUrl.startsWith('https://minaexplorer.com/wallet/')) {
        throw new Error('unsupported site');
    }

    const apiUrl = `https://minaexplorer.com/all-transactions/${getAccountId(accountUrl)}`;
    const txNums = await fetchTxNums(apiUrl);
    const fullData = await fetchAllTx(apiUrl, txNums);
    return processTransactionData(fullData);
}

// Fetch the number of transactions
async function fetchTxNums(apiUrl) {
    const response = await fetch(`${apiUrl}?length=1`);
    const jsonData = await response.json();
    const totalTxs = jsonData.recordsTotal;

    // Limit the number of transactions to 100
    const MAX_TX_LIMIT = 2500;

    return Math.min(totalTxs, MAX_TX_LIMIT);
}

// Fetch all transactions
async function fetchAllTx(apiUrl, txNums) {
    const response = await fetch(`${apiUrl}?length=${txNums}`);
    if (!response.ok) {
        throw new Error('network response not ok');
    }
    return response.json();
}

// Process the fetched transaction data
function processTransactionData(data) {
    const accountId = getAccountId(window.location.href);
    const flowData = { incoming: new Map(), outgoing: new Map() };

    data.data.forEach(tx => {
        // Process the transaction if it's a valid payment
        // Conditions:
        // 1. Transaction type is 'PAYMENT'
        // 2. Amount is not zero
        // 3. Sender and receiver are different
        if (tx.kind === 'PAYMENT' && tx.amount !== 0 && tx.from !== tx.to) {
            processTransaction(tx, accountId, flowData);
        }
    });

    return flowData;
}

// Process a single transaction
function processTransaction(tx, accountId, flowData) {
    const { amount, from, to, fromUserName, toUserName, memo } = tx;
    const isOutgoing = from === accountId;
    const targetMap = isOutgoing ? flowData.outgoing : flowData.incoming;
    const targetAddress = isOutgoing ? to : from;
    const userName = isOutgoing ? toUserName : fromUserName;
    
    updateFlowData(targetMap, targetAddress, amount, userName, memo);
}

// Update the flow data with transaction information
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

// Generate the flow chart based on the processed data
function generateFlowChart(flowData) {
    // Create a new div element to contain the chart
    const chartContainer = document.createElement('div');
    chartContainer.id = 'flow-chart-container';
    document.body.appendChild(chartContainer);

    // Create close button
    var button = $('<button>', {
        type: 'button',
        class: 'layui-btn  layui-btn-sm',
        style: 'float: right;background-color: #7191FC',
        text: 'Close'
    });
    // Add click event listener to the button
    button.on('click', function() {
        document.body.removeChild(chartContainer);
    });
    $('#flow-chart-container').append(button);

    // Prepare chart data
    const accountId = getAccountId(window.location.href);
    const nodes = [{ id: accountId, group: 1, userName: '' }];
    const links = [];
    const addedNodes = new Set([accountId]);

    const MAX_NODES = 28;

    if (flowData && typeof flowData === 'object') {
        if (flowData.incoming && flowData.incoming instanceof Map) {
            // limit the number of incoming nodes
            const incomingEntries = Array.from(flowData.incoming.entries()).slice(0, MAX_NODES);
            incomingEntries.forEach(([address, value]) => {
                if (!addedNodes.has(address)) {
                    nodes.push({ id: address, group: 2, userName: value.userName });
                    addedNodes.add(address);
                }
                links.push({
                    source: address,
                    target: accountId,
                    value: value.amount,
                    userName: value.userName,
                    memo: value.memo,
                    date: "N/A",
                    type: "incoming"
                });
            });
        }

        if (flowData.outgoing && flowData.outgoing instanceof Map) {
            // limit the number of outgoing nodes
            const outgoingEntries = Array.from(flowData.outgoing.entries()).slice(0, MAX_NODES);
            outgoingEntries.forEach(([address, value]) => {
                if (!addedNodes.has(address)) {
                    nodes.push({ id: address, group: 3, userName: value.userName });
                    addedNodes.add(address);
                }
                links.push({
                    source: accountId,
                    target: address,
                    value: value.amount,
                    userName: value.userName,
                    memo: value.memo,
                    date: "N/A",
                    type: "outgoing"
                });
            });
        }
    }

    console.log("Processed Links:", links);

    // If there's no data, display a message
    if (nodes.length === 1 && links.length === 0) {
        const noDataMessage = document.createElement('p');
        noDataMessage.textContent = 'No available transaction data';
        chartContainer.appendChild(noDataMessage);
        return;
    }

    // Create chart
    createChart(chartContainer, { nodes, links });
}

// Create the flow chart using D3.js
function createChart(container, data) {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = {top: 50, right: 120, bottom: 100, left: 120};
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
        nodeMap.set(id + "_in", {id: id, x: 100, y: yPosition, group: 2, userName: nodeData.userName || ""});
    });

    // Process outgoing nodes
    [...outgoingNodes].forEach((id, i) => {
        const yPosition = (outgoingNodes.size === maxNodes) ? yScaleMax(i) : yScaleMin(i);
        const nodeData = data.nodes.find(n => n.id === id) || {};
        nodeMap.set(id + "_out", {id: id, x: innerWidth - 100, y: yPosition, group: 3, userName: nodeData.userName || ""});
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
        .attr("x", d => d.group === 1 ? -rectWidth/2 : (d.group === 2 ? -rectWidth : 0))
        .attr("y", -nodeHeight/2)
        .attr("fill", d => d.group === 1 ? "#FFB800" : (d.group === 2 ? "#5FB878" : "#1E9FFF"))
        .attr("stroke", d => d.group === 1 ? "#FFB800" : (d.group === 2 ? "#5FB878" : "#1E9FFF"))
        .attr("stroke-width", 1)
        .attr("rx", 3)
        .attr("ry", 3)
        .style("cursor", "pointer")
        .on("click", function(event, d) {
            window.open(`https://minaexplorer.com/wallet/${d.id}`, '_blank','noopener','noreferrer');
        });

    node.append("text")
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .attr("x", d => d.group === 2 ? -rectWidth/2 : (d.group === 3 ? rectWidth/2 : 0))
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
                        Q${(midX + targetNode.x) / 2},${sourceNode.y} ${targetNode.x - rectWidth/2},${targetNode.y}`;
            } else {
                return `M${sourceNode.x + rectWidth/2},${sourceNode.y}
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
        .attr("dy", -15) 
        .attr("text-anchor", "middle")
        .attr("font-size", 12) 
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

// Extract account ID from URL
function getAccountId(url) {
    const parts = url.split('/');
    return parts[parts.length - 1];
}

// Helper function: format amount as a decimal number with 9 decimal places
function formatAmount(amount) {
    return (amount / 1e9).toFixed(9);
}