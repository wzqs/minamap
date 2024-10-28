# MinaMap

## Project Overview

MinaMap is a browser extension that enhances the functionality of blockchain explorers for the Mina protocol. This extension primarily targets supported websites such as minaexplorer.com and minascan.io, providing users with additional account analysis tools.

<img width="2093" alt="image" src="https://github.com/user-attachments/assets/45a67f30-ae45-40db-8504-e54490caac60">

## Core Features

1. **Fund Flow Visualization**
   - Adds a "Fund Flow" button to supported blockchain explorer pages
   - Generates fund flow charts upon button click
   - Supports analysis of up to 2500 transactions
   - Displays up to 35 related nodes

2. **Transaction Data Analysis**
   - Automatically fetches and processes account transaction history
   - Distinguishes between incoming and outgoing transactions
   - Supports parallel processing of large transaction datasets
   - Automatically merges multiple transactions from the same address

3. **Interactive Chart**
   - Creates visualizations using D3.js
   - Supports zoom and drag operations
   - Displays transaction amounts and address information
   - Clickable nodes that redirect to corresponding address pages
   - Uses different colors to distinguish incoming/outgoing relationships

4. **Multi-Platform Support**
   - Supports MinaExplorer API
   - Supports Minascan API (API key configuration)


## Installation and Usage

1. Download the project code
2. Open the extension management page in Chrome (chrome://extensions/)
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project folder
5. For Minascan API access:
   - Register at https://api.blockberry.one
   - Create your API key after login
   - You can request unlimited API access by submitting feedback
   - Configure the API key in the extension settings
   - Save and Refresh the current page after API key configuration
6. Visit supported blockchain explorer websites to use the new features

## Supported Websites

- minaexplorer.com
- minascan.io

## Contribution

We welcome contributions through:
- Submitting issues for bug reports
- Creating pull requests for code contributions
- Improving documentation


## Contact

For any questions or suggestions, please contact us through GitHub Issues.


## Future Plans

1. **Phishing Address Warning**: Add suspicious address warning functionality
2. **Phishing Website Warning**: Add suspicious website warning functionality
3. **Enhanced Data Analysis**: Add more data analysis dimensions
