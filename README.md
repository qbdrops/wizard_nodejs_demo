# Wizard Nodejs Demo
## How to Use
### Requirements

1. geth
2. nodejs & npm
3. gringotts & gringotts contracts

### 1. Install geth
You can check go ethereum installation instructions: https://github.com/ethereum/go-ethereum/wiki/Building-Ethereum.

### 2. Install nodejs & npm
Download latest version of nodejs & npm from the [official website](https://nodejs.org/en/download/)

### 3. Install gringotts & gringotts contracts
* gringotts
You can check gringotts installation instructions: https://github.com/BOLT-Protocol/gringotts

* gringotts contracts
You can check gringotts contracts installation instructions: https://github.com/BOLT-Protocol/contracts

### 4. Deploy sidechain and get sidechain address
1.
```
truffle console
```

2.
```
InfinitechainManager.at(InfinitechainManager.address).deploySidechain('your address', 'asset address', 1234567890987654321234567890)

InfinitechainManager.at(InfinitechainManager.address).sidechainAddress(sidechain index)
```

### 5. Install dependencies
```
$ npm install
```

### 6. Config env
```
let env = {
    sidechainAddress: 'SIDECHAIN_ADDRESS',
    nodeUrl: 'YOUR_NODE_DOMAIN',
    web3Url: 'YOUR_WEB3_DOMAIN',
    signerKey: 'YOUR_ECC_PRIVATE_KEY',
};
```

### 7. Start `server.js`
```
$ npm start
```

## API List
#### `POST /pay`
- Parameter: `lightTx`

This API is used to send light transactions.
There are four types for light transactions:
1. deposit
2. withdraw
3. remittance
4. instantWithdraw

## Run test files
### 1. Start `client.js`
```
$ node client.js
```
This will start to send four types of light transaction to server.
* deposit
* withdrawal
* remittance
* instantWithdrawal

### 2. Start `testRemittance.js`
```
$ node testRemittance.js
```
This will start to send lots of remittance light transaction to server synchronously.

### 3. Start `testProposeDeposit.js`
```
$ node testProposeDeposit.js
```
This will start to send deposit light transaction to server synchronously.

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

### 6. Start `testAuditorjs`
```
$ node testAuditorjs.js
```