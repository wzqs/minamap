# Mina Explorer Extension

## Project Overview

Mina Explorer Extension is a browser extension that enhances the functionality of blockchain explorers for the Mina protocol. This extension primarily targets supported websites such as minaexplorer.com and minascan.io, providing users with additional account analysis tools.

## Key Features

1. **Fund Flow Visualization**: Adds a "Fund Flow" button to supported blockchain explorer pages, which generates a fund flow chart for the account when clicked.

2. **Transaction Data Analysis**: Automatically retrieves and processes the account's transaction history, distinguishing between incoming and outgoing transactions.

3. **Interactive Chart**: Creates an interactive fund flow chart using D3.js, visually representing the transaction relationships between the account and other addresses.

4. **Account Search**: Provides an account address search function in the extension's options page, supporting result viewing across multiple blockchain explorers.


## Technical Highlights

- Developed using native JavaScript/html/css to ensure high performance and compatibility
- Utilizes the D3.js library to create complex data visualization charts
- Implements asynchronous data fetching and processing for improved user experience
- Adopts a modular design for easy maintenance and extensibility
- Integrates the layui framework for attractive UI components

## Installation and Usage

1. Download the project code
2. Open the extension management page in Chrome (chrome://extensions/)
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project folder
5. Visit supported blockchain explorer websites to use the new features

## Supported Websites

- minaexplorer.com
- minascan.io

## Contribution Guidelines

Suggestions and code contributions to the project are welcome. Please follow these steps:

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Create a Pull Request


## Contact

For any questions or suggestions, please contact us through GitHub Issues.


## todo

1. minaexplore
    1. limit txs
    2. Add date display
    3. Add transaction count

2. Support minascan
    1. Support user input of their own API key
    2. API key configuration in plugin interface, provide editing functionality, display with asterisks
    3. Interface consistent with minaexplore display

3. **Customizable Settings**: Allows users to customize the extension's functionality and appearance.

4. **Phishing Address Warning**: Adds a warning when users visit websites that may be phishing sites.

5. **Phishing Website Warning**: Adds a warning when users visit websites that may be phishing sites.


