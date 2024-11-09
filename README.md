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


## Installation 

### Option 1: Install from Source Code
1. Download the source code from https://github.com/wzqs/minamap/
2. Open the extension management page in Chrome (chrome://extensions/)
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project folder

### Option 2: Install from Chrome Web Store
1. Visit the Chrome Web Store:
   - Direct link: https://chromewebstore.google.com/detail/minamap/dfecmhopombamncacibeiidjcbbegnbo
   - Or search for "MinaMap" in the Chrome Web Store
2. Click "Add to Chrome" to complete installation

The extension supports two blockchain explorers:
- minaexplorer.com (works out of the box)
- minascan.io (requires API key setup)

### Setting up Minascan API Access
While the extension works immediately with minaexplorer.com, using it with minascan.io requires API configuration:

1. Create a Blockberry Account
   - Navigate to https://api.blockberry.one
   - Complete the registration process

2. Obtain API Credentials
   - Sign in to your Blockberry account
   - Generate a new API key
   - Note: For unlimited API access, contact Blockberry support

3. Configure MinaMap
   - Click the MinaMap extension icon
   - Navigate to Settings
   - Input your API key
   - Save changes
   - Refresh any open minascan.io tabs

## User Guide

### Basic Usage

![MinaMap Demo](path/to/demo.gif)
*A quick demonstration showing how to generate and interact with fund flow visualizations using MinaMap*

1. **Quick Address Search**
   - Click the MinaMap extension icon in your browser
   - Enter the Mina address you want to analyze in the search box
   - Press Enter to see available blockchain explorer options
   - Choose your preferred explorer (minaexplorer.com or minascan.io)

2. **Fund Flow Analysis**
   - After the explorer page loads, locate the blue "Fund Flow" button
   - Click the button to generate the visualization
   - Wait for the chart to render (processing time depends on transaction volume)

3. **Interactive Features**
   - Click on any address node to navigate to its explorer page
   - Use mouse wheel to zoom in/out

### Tips
- The visualization supports up to 2500 transactions
- Different colors indicate transaction directions:
  - Green: Incoming transactions
  - Red: Outgoing transactions
  - Black: Addresses with both incoming and outgoing transactions (self-interactions)
- For optimal performance, ensure your API key is properly configured when using minascan.io
- The Fund Flow feature works seamlessly regardless of how you access an address:
  - Through the MinaMap extension
  - Direct URL input
  - Search function on blockchain explorers


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

## Acknowledgements

We would like to express our sincere gratitude to:

- **Mina Foundation** - For their support and development of the Mina Protocol
- **MinaScan** - For providing comprehensive blockchain explorer services and API support
- **MinaExplorer** - For their excellent blockchain explorer platform and API services

These organizations have made significant contributions to the Mina ecosystem and made this project possible.
