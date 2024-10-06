// Function executed when the page loads
window.onload = function () {
    if (isSupportedSite(window.location.href)) {
        const accountOverviewElement = document.querySelector('h5.card-title') || document.querySelector('.TabSwitcher_tabSwitcher__PGC63');
        if (accountOverviewElement) {
            setupAccountOverview(accountOverviewElement);
        }
    }
};

function isSupportedSite(url) {
    const supportedSites = [
        { regex: /^https:\/\/minaexplorer\.com\/wallet\/[a-zA-Z0-9]{55}$/ },
        { regex: /^https:\/\/minascan\.io\/mainnet\/account\/[a-zA-Z0-9]{55}$/ }
    ];
    return supportedSites.some(site => site.regex.test(url));
}

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
    button.innerText = 'Fund Flow';
    button.classList.add('fund-flow-button', 'layui-btn', 'layui-btn-sm', 'layui-btn-normal', 'layui-anim');
    button.style.backgroundColor = '#7191FC';
    return button;
}

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
    return jsonData.recordsTotal;
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
        if (tx.kind === 'PAYMENT' && tx.amount !== 0) {
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

function generateFlowChart(flowData) {
    // 创建一个新的 div 元素来容纳图表
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

    console.log("Initial flowData:", flowData);

    if (flowData && typeof flowData === 'object') {
        if (flowData.incoming && flowData.incoming instanceof Map) {
            flowData.incoming.forEach((value, address) => {
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
            flowData.outgoing.forEach((value, address) => {
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

function createChart(container, data) {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = {top: 50, right: 50, bottom: 50, left: 50};
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

    // 创建一个集合来存储同时作为转入和转出的地址
    const bothInAndOut = new Set(
        [...incomingNodes].filter(node => outgoingNodes.has(node))
    );

    const centerNode = data.nodes.find(n => n.group === 1);

    // Get the maximum and minimum number of nodes
    const nodeHeight = 30;
    const maxNodes = Math.max(incomingNodes.size, outgoingNodes.size);
    const minNodes = Math.min(incomingNodes.size, outgoingNodes.size);

    // Calculate scale
    const yScaleMax = d3.scaleLinear()
        .domain([0, maxNodes - 1])
        .range([nodeHeight, innerHeight - nodeHeight]);

    const yScaleMin = d3.scaleLinear()
        .domain([0, minNodes - 1])
        .range([yScaleMax(0), yScaleMax(maxNodes - 1)]);  // Evenly distribute between the start and end of the larger side

    // Map node ID to object
    const nodeMap = new Map();

    // 处理转入节点
    [...incomingNodes].forEach((id, i) => {
        const yPosition = (incomingNodes.size === maxNodes) ? yScaleMax(i) : yScaleMin(i);
        const nodeData = data.nodes.find(n => n.id === id) || {};
        nodeMap.set(id + "_in", {id: id, x: 100, y: yPosition, group: 2, userName: nodeData.userName || ""});
    });

    // 处理转出节点
    [...outgoingNodes].forEach((id, i) => {
        const yPosition = (outgoingNodes.size === maxNodes) ? yScaleMax(i) : yScaleMin(i);
        const nodeData = data.nodes.find(n => n.id === id) || {};
        nodeMap.set(id + "_out", {id: id, x: innerWidth - 100, y: yPosition, group: 3, userName: nodeData.userName || ""});
    });

    // 中心节点位置
    centerNode.x = innerWidth / 2;
    centerNode.y = innerHeight / 2;
    nodeMap.set(centerNode.id, centerNode);

    // 修改节点绘制部分
    const node = svg.selectAll(".node")
        .data([...nodeMap.values()])
        .enter().append("g")
        .attr("class", d => `node ${d.group === 1 ? 'center' : ''}`)
        .attr("transform", d => `translate(${d.x},${d.y})`);

    node.append("rect")
        .attr("width", 120)
        .attr("height", 30)
        .attr("x", d => d.group === 1 ? -60 : (d.group === 2 ? -120 : 0))
        .attr("y", -15)
        .attr("fill", d => d.group === 1 ? "#FFB800" : (d.group === 2 ? "#5FB878" : "#1E9FFF"))  // 设置背景颜色与边框一致
        .attr("stroke", d => d.group === 1 ? "#FFB800" : (d.group === 2 ? "#5FB878" : "#1E9FFF"))  // 保持边框颜色不变
        .attr("stroke-width", 1)
        .attr("rx", 4)
        .attr("ry", 4);

    node.append("text")
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .attr("x", d => d.group === 2 ? -60 : (d.group === 3 ? 60 : 0))
        .text(d => {
            const displayName = d.userName ? ` (${d.userName})` : '';
            return `${d.id.slice(-10)}${displayName}`;
        })
        .attr("fill", d => {
            if (d.group !== 1 && bothInAndOut.has(d.id)) {
                return "black";
            }
            return "#fff";
        });

    // 修改路径绘制和交易信息标签
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
                        L${midX - 10},${sourceNode.y}
                        Q${(midX + targetNode.x) / 2},${sourceNode.y} ${targetNode.x - 60},${targetNode.y}`;
            } else {
                return `M${sourceNode.x + 60},${sourceNode.y}
                        Q${(sourceNode.x + midX) / 2},${targetNode.y} ${midX + 10},${targetNode.y}
                        L${targetNode.x},${targetNode.y}`;
            }
        })
        .attr("fill", "none")
        .attr("stroke", d => d.type === "incoming" ? "#4CAF50" : "#2196F3")
        .attr("stroke-width", 2)
        .attr("marker-end", d => `url(#arrow-${d.type})`);

    // 添加交易信息标签
    link.append("text")
        .attr("class", "transaction-info")
        .attr("dy", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", 10)
        .attr("fill", "#666")
        .attr("transform", d => {
            const sourceNode = d.type === "incoming" ? nodeMap.get(d.source + "_in") : centerNode;
            const targetNode = d.type === "incoming" ? centerNode : nodeMap.get(d.target + "_out");
            const midX = (sourceNode.x + targetNode.x) / 2;
            const x = d.type === "incoming" ? (sourceNode.x + midX - 10) / 2 : (midX + 10 + targetNode.x) / 2;
            const y = d.type === "incoming" ? sourceNode.y : targetNode.y;
            return `translate(${x}, ${y})`;
        })
        .text(d => `${(d.value / 1e9).toFixed(4)} MINA`);

    // 为每条路径添加一个不可见的路径，用于文本定位
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
    return (amount / 1e9).toFixed(9);  // Process as a decimal number with 9 decimal places
}