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
            button.addEventListener('click', function () {
                const accountUrl = window.location.href;
                console.log('当前URL:', accountUrl);
                const allData = fetchTransactionData(accountUrl);
                console.log(allData);
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
        console.log(apiUrl);

        // 第一次请求，获取交易记录数量
        const fetchTxNums = `${apiUrl}?length=1`;
        const response = await fetch(fetchTxNums);
        const jsonData = await response.json();

        // 从第一次请求的响应中提取交易记录数量
        const txNums = jsonData.recordsTotal;
        console.log('交易记录数量:', txNums);

        // 第二次请求，根据交易记录数量获取所有记录
        const fetchAllTx = `${apiUrl}?length=${txNums}`;
        const fullResponse = await fetch(fetchAllTx);

        if (!fullResponse.ok) {
            throw new Error('network response not ok');
        }

        const fullData = await fullResponse.json();

        // 提取转入转出地址和金额
        const flowData = processTransactionData(fullData);
        return flowData;
    }
    throw new Error('unsupported site');

}

// 处理交易数据，提取转入转出地址及金额，去重并汇总
function processTransactionData(data) {
    const flowData = {
        incoming: new Map(),  // 用于存储转入的地址及金额
        outgoing: new Map()   // 用于存储转出的地址及金额
    };

    data.data.forEach(tx => {
        if (tx.kind === 'PAYMENT') {
            // 处理转出地址
            if (flowData.outgoing.has(tx.from)) {
                flowData.outgoing.set(tx.from, flowData.outgoing.get(tx.from) + tx.amount);
            } else {
                flowData.outgoing.set(tx.from, tx.amount);
            }

            // 处理转入地址
            if (flowData.incoming.has(tx.to)) {
                flowData.incoming.set(tx.to, flowData.incoming.get(tx.to) + tx.amount);
            } else {
                flowData.incoming.set(tx.to, tx.amount);
            }
        }
    });

    // 打印汇总结果
    console.log('转入地址和金额:', Array.from(flowData.incoming.entries()));
    console.log('转出地址和金额:', Array.from(flowData.outgoing.entries()));

    return flowData;
}



// 从 URL 中提取账户ID
function getAccountId(url) {
    const parts = url.split('/');
    return parts[parts.length - 1];
}

