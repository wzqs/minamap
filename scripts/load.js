// 页面加载时执行的函数
window.onload = function () {
    // 检查当前URL是否匹配支持的网站
    if (isSupportedSite(window.location.href)) {
        // 查找 'Account Overview' 的元素位置
        const accountOverviewElement = document.querySelector('h5.card-title');
        if (accountOverviewElement) {
            // 创建并插入按钮
            const button = createButton();
            accountOverviewElement.appendChild(button);

            // 为按钮添加点击事件监听
            button.addEventListener('click', async function () {
                const accountUrl = window.location.href;
                const allData = await fetchTransactionData(accountUrl);

                // 生成并显示流向图
                generateFlowChart(allData);
            });
        }
    }
};

// 检查当前页面URL是否匹配支持的网站
function isSupportedSite(url) {
    const supportedSites = [
        'https://minaexplorer.com/wallet/',
        'https://minascan.io/mainnet/account/'
    ];
    return supportedSites.some(site => url.startsWith(site));
}

// 创建按钮元素
function createButton() {
    const button = document.createElement('button');
    button.innerText = 'fund flow';
    button.style.marginLeft = '3px'; // 可以调整样式
    return button;
}

// 发送API请求获取交易数据
async function fetchTransactionData(accountUrl) {
    // 根据不同的网站构造请求的API URL
    let apiUrl;
    if (accountUrl.startsWith('https://minaexplorer.com/wallet/')) {
        apiUrl = `https://minaexplorer.com/all-transactions/${getAccountId(accountUrl)}`;

        // 第一次请求，获取交易记录数量
        const fetchTxNums = `${apiUrl}?length=1`;
        const response = await fetch(fetchTxNums);
        const jsonData = await response.json();

        // 从第一次请求的响应中提取交易记录数量
        const txNums = jsonData.recordsTotal;

        // 第二次请求，根据交易记录数量获取所有记录
        const fetchAllTx = `${apiUrl}?length=${txNums}`;
        const fullResponse = await fetch(fetchAllTx);

        if (!fullResponse.ok) {
            throw new Error('network response not ok');
        }

        const fullData = await fullResponse.json();

        // 提取转入转出地址和金额和地址标签
        const flowData = processTransactionData(fullData);
        return flowData;
    }
    throw new Error('unsupported site');

}

// 处理交易数据，提取转入转出地址及金额，去重并汇总
function processTransactionData(data) {
    const accountId = getAccountId(window.location.href);
    const flowData = {
        incoming: new Map(),  // 用于存储转入的地址金额
        outgoing: new Map()   // 用于存储转出的地址金额
    };

    data.data.forEach(tx => {
        if (tx.kind === 'PAYMENT') {
            const { amount, from, to, fromUserName, toUserName, memo } = tx;

            // 过滤掉 amount 为 0 的交易
            if (amount === 0) return;

            // 处理转出交易（当前账户为转出方）
            if (from === accountId) {
                if (flowData.outgoing.has(to)) {
                    const existing = flowData.outgoing.get(to);
                    flowData.outgoing.set(to, {
                        amount: existing.amount + amount,
                        userName: toUserName || "Unknown",
                        memo: existing.memo || memo || ""  // 保持已有 memo 或更新 memo
                    });
                } else {
                    flowData.outgoing.set(to, {
                        amount: amount,
                        userName: toUserName || "Unknown",
                        memo: memo || ""  // 设置 memo
                    });
                }
            }

            // 处理转入交易（当前账户为转入方）
            if (to === accountId) {
                if (flowData.incoming.has(from)) {
                    const existing = flowData.incoming.get(from);
                    flowData.incoming.set(from, {
                        amount: existing.amount + amount,
                        userName: fromUserName || "Unknown",
                        memo: existing.memo || memo || ""  // 保持已有 memo 或更新 memo
                    });
                } else {
                    flowData.incoming.set(from, {
                        amount: amount,
                        userName: fromUserName || "Unknown",
                        memo: memo || ""  // 设置 memo
                    });
                }
            }
        }
    });

    // 打印汇总结果：格式化金额并打印去重后的地址、用户名及 memo
    // console.log('转入地址、金额和 memo:');
    // flowData.incoming.forEach((value, address) => {
    //     console.log(`地址: ${address}, 用户名: ${value.userName}, 金额: ${formatAmount(value.amount)}, memo: ${value.memo}`);
    // });

    // console.log('转出地址、金额和 memo:');
    // flowData.outgoing.forEach((value, address) => {
    //     console.log(`地址: ${address}, 用户名: ${value.userName}, 金额: ${formatAmount(value.amount)}, memo: ${value.memo}`);
    // });

    return flowData;
}


function generateFlowChart(flowData) {
    // 创建一个新的div元素来容纳图表
    const chartContainer = document.createElement('div');
    chartContainer.id = 'flow-chart-container';
    chartContainer.style.cssText = 'position: fixed; top: 10%; left: 10%; width: 80%; height: 80%; background: white; border: 1px solid #ccc; z-index: 1000; overflow: auto;';
    document.body.appendChild(chartContainer);

    // 创建关闭按钮
    const closeButton = document.createElement('button');
    closeButton.innerText = '关闭';
    closeButton.style.cssText = 'position: absolute; top: 10px; right: 10px; z-index: 1001;';
    closeButton.onclick = () => document.body.removeChild(chartContainer);
    chartContainer.appendChild(closeButton);

    // 准备图表数据
    const nodes = [{ id: "My Account", group: 1 }];
    const links = [];
    const addedNodes = new Set(["My Account"]);

    console.log("原始 flowData:", flowData);

    if (flowData && typeof flowData === 'object') {
        if (flowData.incoming && flowData.incoming instanceof Map) {
            flowData.incoming.forEach((value, address) => {
                if (!addedNodes.has(address)) {
                    nodes.push({ id: address, group: 2 });
                    addedNodes.add(address);
                }
                links.push({
                    source: address,
                    target: "My Account",
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
                    nodes.push({ id: address, group: 2 });
                    addedNodes.add(address);
                }
                links.push({
                    source: "My Account",
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

    console.log("处理后的 Links:", links);

    // 如果没有数据,显示提示信息
    if (nodes.length === 1 && links.length === 0) {
        const noDataMessage = document.createElement('p');
        noDataMessage.textContent = 'No available transaction data';
        chartContainer.appendChild(noDataMessage);
        return;
    }

    // 创建图表
    createChart(chartContainer, { nodes, links });
}

function createChart(container, data) {
    // 设置图表尺寸和边距
    const width = container.clientWidth;
    const height = container.clientHeight;
    const radius = Math.min(width, height) / 2 - 100; // 减少100px以留出边距

    // 创建SVG元素
    const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    // 创建力导向模拟
    const simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d => d.id).distance(radius / 2))
        .force("charge", d3.forceManyBody().strength(-1000))
        .force("center", d3.forceCenter(0, 0))
        .force("radial", d3.forceRadial(d => d.id === "My Account" ? 0 : radius, 0, 0).strength(1));

    // 创建箭头标记
    svg.append("defs").selectAll("marker")
        .data(["incoming", "outgoing"])
        .enter().append("marker")
        .attr("id", d => `arrow-${d}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("fill", d => d === "incoming" ? "#4CAF50" : "#F44336")
        .attr("d", "M0,-5L10,0L0,5");

    // 绘制连线
    const link = svg.append("g")
        .selectAll("path")
        .data(data.links)
        .enter().append("path")
        .attr("stroke", d => d.type === "incoming" ? "#4CAF50" : "#F44336")
        .attr("stroke-width", d => Math.log(d.value) / 10)
        .attr("fill", "none")
        .attr("marker-end", d => `url(#arrow-${d.type})`);

    // 绘制节点
    const node = svg.append("g")
        .selectAll("circle")
        .data(data.nodes)
        .enter().append("circle")
        .attr("r", d => d.id === "My Account" ? 20 : 10)
        .attr("fill", d => d.id === "My Account" ? "#FFC107" : "#2196F3")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // 添加节点标签
    const label = svg.append("g")
        .selectAll("text")
        .data(data.nodes)
        .enter().append("text")
        .text(d => d.id)
        .attr("font-size", 12)
        .attr("text-anchor", "middle")
        .attr("dy", 20);

    // 添加交易信息标签
    const transactionInfo = svg.append("g")
        .selectAll("text")
        .data(data.links)
        .enter().append("text")
        .text(d => `${(d.value / 1e9).toFixed(4)} MINA`)
        .attr("font-size", 10)
        .attr("fill", "#666")
        .attr("text-anchor", "middle");

    // 更新力导向图布局
    simulation.on("tick", () => {
        link.attr("d", d => {
            const dx = d.target.x - d.source.x,
                  dy = d.target.y - d.source.y,
                  dr = Math.sqrt(dx * dx + dy * dy);
            return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
        });

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        label
            .attr("x", d => d.x)
            .attr("y", d => d.y);

        transactionInfo
            .attr("x", d => (d.source.x + d.target.x) / 2)
            .attr("y", d => (d.source.y + d.target.y) / 2);
    });

    // 拖拽函数
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    // 添加缩放功能
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            svg.attr("transform", event.transform);
        });

    svg.call(zoom);
}



// 从 URL 中提取账户ID
function getAccountId(url) {
    const parts = url.split('/');
    return parts[parts.length - 1];
}


// 帮助函数：将金额格式化为小数点后9位的数字
function formatAmount(amount) {
    return (amount / 1e9).toFixed(9);  // 处理为小数点后9位
}
