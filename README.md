# Infinitechain Nodejs Demo
## How to Use
### 1. Install nodejs & npm
Download latest version of nodejs & npm from the [official website](https://nodejs.org/en/download/)

### 2. Install dependencies
```
$ npm install
```

### 3. Config env
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
After the server is up, there is 1 API that can be used to interact with the sidechain:

#### `POST /pay`
- Parameter: `lightTx`

This API is used to send light transactions.
There are four types for light transactions:
1. deposit
2. withdraw
3. remittance
4. instantWithdraw

### 4. Start `client.js`
```
$ node client.js
```
This will start to send four types of light transaction to server.

### 5. Start `testRemittance.js`
```
$ node testRemittance.js
```
This will start to send lots of remittance light transaction to server synchronously.
