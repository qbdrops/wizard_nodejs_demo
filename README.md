# Wizard Nodejs Demo

[Gringotts](https://github.com/BOLT-Protocol/gringotts) is BOLT crypto-payment booster. A contract published to the main chain (referred to as the booster contract) is used to control and record the cash flow exchange of participants in the booster. General cash flow does not need to pass through the main chain, which speeds up the cash flow. A cash flow network can be initiated by a convener who acts as the agent. Each contract corresponds to one booster. A crypto-payment booster can be initiated at any time as necessary. For example, participants can take part in different crypto-payment boosters for an online mall or high-speed cryptocurrency exchange, all based on their requirements.

Users can store their ERC20 tokens or ETH into a booster contract and withdraw them at any time. If ERC20 tokens or ETH stored in a booster contract enters a booster for trading, then it will be temporarily unavailable for withdrawal. It must be withdrawn from the booster to the booster contract before it can be transferred to another account on main chain.

In wizard nodejs demo, you will run a server that is acting as the agent. You can interact with [gringotts](https://github.com/BOLT-Protocol/gringotts). To store and withdraw your ERC20 tokens or ETH at any time, all you need to do is sending a light transaction to the server.

## Prerequisites
|               Prerequisite                       |                 Description              |
|--------------------------------------------------|------------------------------------------|
|[geth](https://github.com/ethereum/go-ethereum)   | Ethereum node                            |
|[nodejs & npm](https://nodejs.org/)               | Nodejs                                   |
|[gringotts contracts](https://github.com/BOLT-Protocol/contracts)| The contracts of gringotts node |
|[gringotts](https://github.com/BOLT-Protocol/gringotts)| Gringotts node                      |


## Quick Start
Getting started with wizard_nodejs_demo should be fast and easy once you have [gringotts](https://github.com/BOLT-Protocol/gringotts) running. Here are the steps:
* clone the repo
* cd to the project directory and install dependencies
* configure env.js

### 1. Clone the Repo
```
$ git clone https://github.com/BOLT-Protocol/wizard_nodejs_demo.git
```

### 2. Install dependencies
```
$ cd wizard_nodejs_demo && npm install
```

### 3. Configure `env.js`
Here are 3 informations you need to provide.

1. `nodeUrl`: Gringotts full node url, usually http://localhost:3000.
2. `web3Url`: Ethereum full node url, usually http://localhost:8545.
3. `signerKey`: Your address private key in your Ethereum full node.
```
let env = {
    nodeUrl: 'YOUR_NODE_DOMAIN',
    web3Url: 'YOUR_WEB3_DOMAIN',
    signerKey: 'YOUR_ECC_PRIVATE_KEY',
};
```

### 4. Start `server.js`
```
$ npm start
```

## Server API List
### `POST /pay`
Parameter: `lightTx`

This API is used to send light transactions.
There are four types for light transactions:
* deposit

  Deposit ERC20 tokens or ETH to gringotts contract.

* withdraw

  Withdraw ERC20 tokens or ETH from gringotts contract.

* remittance

  Transfer **off-chain** light transaction to another address.
  
* instantWithdraw

  Withdraw ERC20 tokens or ETH from gringotts contract instant, which means you don't need to wait a challenge period.

## Run test files
### 1. Start `client.js`
```
$ node client.js
```
This will start to send four types of light transaction sequentially to server.
1. deposit
2. remittance
3. instantWithdrawal
4. withdrawal

### 2. Start `testProposeDeposit.js`
```
$ node testProposeDeposit.js
```
This will start to send deposit light transaction to server synchronously.

### 3. Start testRemittance.js`
```
$ node testRemittance.js
```
This will start to send lots of remittance light transaction to server sequentially.
> Note: You need to run testProposeDeposit.js first.

### 4. Start `testProposeWithdrawal.js`
```
$ node testProposeWithdrawal.js
```
This will start to send withdrawal light transaction to server synchronously.

### 5. Start `testInstantWithdraw.js`
```
$ node testInstantWithdraw.js
```
This will start to send instantWithdraw light transaction to server synchronously.

### 6. Start `testAuditor.js`
```
$ node testAuditor.js
```
This will start to test distributed auditing, you can find the diagram in our [yellow paper](https://github.com/BOLT-Protocol/wiki/blob/master/yellow_paper_eng.md#%E5%88%86%E6%95%A3%E5%BC%8F%E7%A8%BD%E6%A0%B8-distributed-auditing).

## Reference
To learn more about BOLT protocol and how the server work, you can checkout BOLT white paper and yellow paper.

* [BOLT white paper](https://github.com/BOLT-Protocol/wiki/blob/master/white_paper_20180416.pdf)
* [BOLT yellow paper](https://github.com/BOLT-Protocol/wiki/blob/master/yellow_paper_eng.md)
* [BOLT wiki](https://github.com/BOLT-Protocol/wiki)