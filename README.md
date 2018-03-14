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
    cipherKey: 'YOUR_RSA_PRIVATE_KEY'
};
```

### 3. Start `server.js`
```
$ npm start
```
After the server is up, there are 2 APIs that can be used to interact with the sidechain:

#### `POST /commit`
- Parameters: `data`
- Commit a stage of payments.

#### `POST /finalize`
- Parameters: `stageHeight`
- Finalize a stage.

### 4. Start `client.js`
```
$ node client.js
```
This will start to send payments to Infinitechain Node every 2 seconds.
