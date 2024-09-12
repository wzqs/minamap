// 页面加载时执行的函数
window.onload = function () {
    // 检查当前URL是否匹配支持的网站
    if (isSupportedSite(window.location.href)) {
        // 查找 'Account Overview' 的元素位置
        const accountOverviewElement = document.querySelector('h5.card-title');
        if (accountOverviewElement) {
            // 创建一个容器来包裹标题和按钮
            const container = document.createElement('div');
            container.classList.add('account-overview-container');
            
            // 将原有的标题移动到新容器中
            accountOverviewElement.parentNode.insertBefore(container, accountOverviewElement);
            container.appendChild(accountOverviewElement);
            
            // 创建并插入按钮
            const button = createButton();
            container.appendChild(button);

            // 为按钮添加点击事件监听
            button.addEventListener('click', async function () {
                var loadingIndex = layer.load(2, {
                    shade: [0.5, '#000'],
                    content: '加载中...',
                    time: 5000,

                });
           
                const accountUrl = window.location.href;
                const allData = await fetchTransactionData(accountUrl);
                layer.closeAll("loading");
                // 生成并显示流向图
                generateFlowChart(allData);

            });

            $(document).ready(function() {
                // 选择 .table-responsive 下的 .table-striped
                $('.table-responsive .table-striped tbody tr').each(function() {
                    // 遍历每个 <tr> 中的 <th>
                    $(this).find('th').each(function() {
                        // 获取 <th> 的宽度
                        var width = $(this).width();
                        console.log('Width of <th>:', width);
                        $('.account-overview-container h5').css('width', width+40 + 'px');
                    });
                });
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
    button.innerText = 'Fund Flow';
    button.classList.add('fund-flow-button');
    button.classList.add('layui-btn');
    button.classList.add('layui-btn-sm');
    button.classList.add('layui-btn-normal');
    button.classList.add('layui-anim');
    button.style.backgroundColor = '#4caf50'
    console.log(1111111111,$)
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
    var button = $('<button>', {
        type: 'button',
        class: 'layui-btn  layui-btn-sm',
        style: 'float: right;background-color: rgb(76, 175, 80)',
        text: 'Close'
    });
    // 为按钮添加点击事件监听
    button.on('click', function() {
        document.body.removeChild(chartContainer);
    });
    $('#flow-chart-container').append(button);

    // 准备图表数据
    const accountId = getAccountId(window.location.href);
    const nodes = [{ id: accountId, group: 1 }];
    const links = [];
    const addedNodes = new Set([accountId]);

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
                    nodes.push({ id: address, group: 3 });
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
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = {top: 50, right: 220, bottom: 50, left: 220};
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 定义箭头
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

    // 分离入账和出账节点，同时处理既有入账又有出账的情况
    const incomingNodes = new Set(data.links.filter(l => l.type === "incoming").map(l => l.source));
    const outgoingNodes = new Set(data.links.filter(l => l.type === "outgoing").map(l => l.target));
    const bothDirectionNodes = new Set([...incomingNodes].filter(x => outgoingNodes.has(x)));

    const centerNode = data.nodes.find(n => n.group === 1);

    // // 计算节点位置
    // const nodeHeight = 30;
    // const maxNodes = Math.max(incomingNodes.length, outgoingNodes.length);
    // const yScale = d3.scaleLinear()
    //     .domain([0, maxNodes - 1])
    //     .range([nodeHeight, innerHeight - nodeHeight]);

    // incomingNodes.forEach((node, i) => {
    //     node.x = 0;
    //     node.y = yScale(i);
    // });

    // outgoingNodes.forEach((node, i) => {
    //     node.x = innerWidth;
    //     node.y = yScale(i);
    // });

    // centerNode.x = innerWidth / 2;
    // centerNode.y = innerHeight / 2;

    // // 创建节点 ID 到节点对象的映射
    // const nodeMap = new Map(data.nodes.map(node => [node.id, node]));

    // // 绘制连线
    // svg.selectAll(".link")
    //     .data(data.links)
    //     .enter().append("line")
    //     .attr("class", "link")
    //     .attr("x1", d => d.type === "incoming" ? nodeMap.get(d.source).x : centerNode.x)
    //     .attr("y1", d => d.type === "incoming" ? nodeMap.get(d.source).y : centerNode.y)
    //     .attr("x2", d => d.type === "incoming" ? centerNode.x : nodeMap.get(d.target).x)
    //     .attr("y2", d => d.type === "incoming" ? centerNode.y : nodeMap.get(d.target).y)
    //     .attr("stroke", d => d.type === "incoming" ? "#4CAF50" : "#2196F3")
    //     .attr("stroke-width", 2)
    //     .attr("marker-end", d => `url(#arrow-${d.type})`);

    // // 绘制节点
    // const node = svg.selectAll(".node")
    //     .data(data.nodes)
    //     .enter().append("g")
    //     .attr("class", "node")
    //     .attr("transform", d => `translate(${d.x},${d.y})`);

    // node.append("circle")
    //     .attr("r", d => d.group === 1 ? 20 : 6)
    //     .attr("fill", d => d.group === 1 ? "#FFC107" : (d.group === 2 ? "#4CAF50" : "#2196F3"));

    // // 添加地址标签
    // node.append("text")
    //     .attr("dy", d => d.group === 1 ? 35 : 3)
    //     .attr("dx", d => d.group === 1 ? 0 : (d.group === 2 ? 15 : -15))
    //     .attr("text-anchor", d => d.group === 1 ? "middle" : (d.group === 2 ? "start" : "end"))
    //     .text(d => d.id.substring(0, 10) + "...")
    //     .attr("font-size", 12)
    //     .attr("fill", "#333");

    // // 添加交易信息标签
    // svg.selectAll(".transaction-info")
    //     .data(data.links)
    //     .enter().append("text")
    //     .attr("class", "transaction-info")
    //     .attr("x", d => d.type === "incoming" ? (nodeMap.get(d.source).x + centerNode.x) / 2 : (centerNode.x + nodeMap.get(d.target).x) / 2)
    //     .attr("y", d => d.type === "incoming" ? (nodeMap.get(d.source).y + centerNode.y) / 2 : (centerNode.y + nodeMap.get(d.target).y) / 2)
    //     .attr("text-anchor", "middle")
    //     .attr("dy", -10)
    //     .text(d => `${(d.value / 1e9).toFixed(4)} MINA`)
    //     .attr("font-size", 10)
    //     .attr("fill", "#666");

    // 计算节点位置
    const nodeHeight = 30;
    const maxNodes = Math.max(incomingNodes.size, outgoingNodes.size);
    const yScale = d3.scaleLinear()
        .domain([0, maxNodes - 1])
        .range([nodeHeight, innerHeight - nodeHeight]);

    // 创建节点 ID 到节点对象的映射
    const nodeMap = new Map();

    // 处理入账节点
    [...incomingNodes].forEach((id, i) => {
        nodeMap.set(id + "_in", {id: id, x: 0, y: yScale(i), group: 2});
    });

    // 处理出账节点
    [...outgoingNodes].forEach((id, i) => {
        nodeMap.set(id + "_out", {id: id, x: innerWidth, y: yScale(i), group: 3});
    });

    // 设置中心节点
    centerNode.x = innerWidth / 2;
    centerNode.y = innerHeight / 2;
    nodeMap.set(centerNode.id, centerNode);

    // 绘制连线
    svg.selectAll(".link")
        .data(data.links)
        .enter().append("line")
        .attr("class", "link")
        .attr("x1", d => d.type === "incoming" ? nodeMap.get(d.source + "_in").x : centerNode.x)
        .attr("y1", d => d.type === "incoming" ? nodeMap.get(d.source + "_in").y : centerNode.y)
        .attr("x2", d => d.type === "incoming" ? centerNode.x : nodeMap.get(d.target + "_out").x)
        .attr("y2", d => d.type === "incoming" ? centerNode.y : nodeMap.get(d.target + "_out").y)
        .attr("stroke", d => d.type === "incoming" ? "#4CAF50" : "#2196F3")
        .attr("stroke-width", 2)
        .attr("marker-end", d => `url(#arrow-${d.type})`);

    // 绘制节点
    const node = svg.selectAll(".node")
        .data([...nodeMap.values()])
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x},${d.y})`);

    node.append("circle")
        .attr("r", d => d.group === 1 ? 20 : 6)
        .attr("fill", d => d.group === 1 ? "#FFC107" : (d.group === 2 ? "#4CAF50" : "#2196F3"));

    // 添加地址标签
    node.append("text")
        .attr("dy", d => d.group === 1 ? 35 : 3)
        .attr("dx", d => d.group === 1 ? 0 : (d.group === 2 ? 15 : -15))
        .attr("text-anchor", d => d.group === 1 ? "middle" : (d.group === 2 ? "start" : "end"))
        .text(d => d.id.substring(0, 10) + "...")
        .attr("font-size", 12)
        .attr("fill", "#333");

    // 添加交易信息标签
    svg.selectAll(".transaction-info")
        .data(data.links)
        .enter().append("text")
        .attr("class", "transaction-info")
        .attr("x", d => {
            const sourceX = d.type === "incoming" ? nodeMap.get(d.source + "_in").x : centerNode.x;
            const targetX = d.type === "incoming" ? centerNode.x : nodeMap.get(d.target + "_out").x;
            return (sourceX + targetX) / 2;
        })
        .attr("y", d => {
            const sourceY = d.type === "incoming" ? nodeMap.get(d.source + "_in").y : centerNode.y;
            const targetY = d.type === "incoming" ? centerNode.y : nodeMap.get(d.target + "_out").y;
            return (sourceY + targetY) / 2;
        })
        .attr("text-anchor", "middle")
        .attr("dy", -10)
        .text(d => `${(d.value / 1e9).toFixed(4)} MINA`)
        .attr("font-size", 10)
        .attr("fill", "#666");

    // 添加缩放功能
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            svg.attr("transform", event.transform);
        });

    d3.select(container).select("svg").call(zoom);
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

