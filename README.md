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
Before run these test files, you have to make sure the signer has enough ether.

* Check signer's balance (Run the command in geth console)

    ```
    eth.getBalance('Your signer address')
    ```

* Send ether to signer's address from account that exist in the geth node (Run the command in geth console)

    ```
    // unlock account
    personal.unlockAccount('Your account in geth node')
    
    eth.sendTransaction({
      from: 'Your account in geth node',
      to: 'Your signer address',
      value: 'Value in wei'
    })
    ```
    
* Sign a transaction to send ether to signer's address from account that doesn't exist in the geth node (Run the command in node console)

    ```js
    const Tx = require('ethereumjs-tx')
    const privateKey = Buffer.from('Your signer key', 'hex')
    let tx = new Tx({
      nonce: 'Nonce of your signer address',
      to: 'Your signer address',
      value: 'Value in wei',
      gas: 'gas',
      gasPrice: 'gasPrice'
    })
    
    // Sign a transaction
    tx.sign(privateKey)
    
    let signedTx = tx.serialize().toString('hex')
    
    console.log(signedTx)
    ```
    Then run the command in geth console
    ``` 
    eth.sendRawTransaction('Signed transaction')
    ```

### 1. Start `testProposeDeposit.js`
```
$ node testProposeDeposit.js

proposeDeposit
Deposit:
{ address: '0x7f6cdd9de52496f5113ad889436b93a89e1d47be',
  blockNumber: 209337,
  transactionHash: '0x6826b3431aacc62838e8d26883fad8394eb5db7a367648dd799e541b829ac6bc',
  transactionIndex: 0,
  blockHash: '0xe6d9f1aaaedf7c0b6843a899f9fcbc3ecb2aa15090408b4953362dce2e13bef5',
  logIndex: 0,
  removed: false,
  event: 'VerifyReceipt',
  args: 
   { _type: BigNumber { s: 1, e: 0, c: [Array] },
     _gsn: '0x0000000000000000000000000000000000000000000000000000000000000001',
     _lightTxHash: '0x89aec462e359e4cdc62c8075add460a903b1c85139246b6678198968afcc9766',
     _fromBalance: '0x0000000000000000000000000000000000000000000000000000000000000000',
     _toBalance: '0x00000000000000000000000000000000000000000000021e19e0c9bab2400000',
     _sigLightTx: 
      [ '0x000000000000000000000000000000000000000000000000000000000000001c',
        '0x9258ff6210ffe839d63d2114efb5c22085f00f6bb2d91c2565497dc89d326ec1',
        '0x56687f645919a82cd9ad05fba05a6f6afc8ff9db0e9ad95949dc68481261f3ad' ],
     _sigReceipt: 
      [ '0x000000000000000000000000000000000000000000000000000000000000001c',
        '0x0d8bdb7df3dbfedbf1919e3c8110aafb1a0b02bd2f65da9c9e1faf8cf01f1991',
        '0x407afd1dd548375879948ce575b8eb5167a114b812b28b57c57b7d18d321e888' ] } }
```
This will start to send deposit light transaction to server synchronously.

After run this file, you can check your balance on sidechain.

```
$ curl -G http://localhost:3003/balance/'your signer address without 0x prefixed'
```

### 2. Start testRemittance.js`
```
$ node testRemittance.js

Spent 35654 milliseconds for 1500 transactions
```
This will start to send lots of remittance light transaction to server sequentially.
> Note: You need to run testProposeDeposit.js first.

### 3. Start `testProposeWithdrawal.js`
```
$ node testProposeWithdrawal.js

Receipt {
  _normalize: [Function],
  type: [Function],
  hasClientLightTxSig: [Function],
  hasServerLightTxSig: [Function],
  hasServerReceiptSig: [Function],
  toJson: [Function],
  lightTxHash: '182195f4cef492c19db058a12ec767c2f14baf13f1ae100216a245f22e983189',
  lightTxData: 
   { from: '00000000000000000000000030b82c8694b59695d78f33a7ba1c2a55dfa618d5',
     to: '0000000000000000000000000000000000000000000000000000000000000000',
     assetID: '0000000000000000000000000000000000000000000000000000000000000001',
     value: '000000000000000000000000000000000000000000000001158e460913d00000',
     fee: '000000000000000000000000000000000000000000000000002386f26fc10000',
     nonce: 'f5ac5f3947acc4c1b7735f2f05a56d395aa1e955b21ec82451f1d1fbf63a552f',
     logID: '4bcdc5f48bd13437ccc4840463e2c37d568dcb416d702852dc54cf151aa86db1',
     metadataHash: 'b48d38f93eaa084033fc5970bf96e559c33c4cdc07d889ab00b4d63f9590739d' },
  receiptData: 
   { stageHeight: '0000000000000000000000000000000000000000000000000000000000000001',
     GSN: '0000000000000000000000000000000000000000000000000000000000000bba',
     lightTxHash: '182195f4cef492c19db058a12ec767c2f14baf13f1ae100216a245f22e983189',
     fromBalance: '00000000000000000000000000000000000000000000017a62f57a6002900000',
     toBalance: '0000000000000000000000000000000000000000000000000000000000000000' },
  receiptHash: '6767a5351f3d5eb94b4e7d51dfb5eacf813de72057715f52ef38b33759ff2cdb',
  sig: 
   { clientLightTx: 
      { r: '0x72036a849c6b6e486d0c8a26190fc049daf27561ec1fc34cc5b904ea5ef7e91e',
        s: '0x1b2ca2ef2f9a2f839079f477ed12ab9ec4af0e0d0bf61c10b46cfc50fcf64ddb',
        v: '0x000000000000000000000000000000000000000000000000000000000000001b' },
     serverLightTx: 
      { r: '0x72036a849c6b6e486d0c8a26190fc049daf27561ec1fc34cc5b904ea5ef7e91e',
        s: '0x1b2ca2ef2f9a2f839079f477ed12ab9ec4af0e0d0bf61c10b46cfc50fcf64ddb',
        v: '0x000000000000000000000000000000000000000000000000000000000000001b' },
     serverReceipt: 
      { r: '0x732b7cb419f32a4478db2a31512819247e1b6bb39afa058e13bdccde042dcac2',
        s: '0x1f7435862d8014c9015ee94920b29daa869a9987f1124e62c692c18c30a8a501',
        v: '0x000000000000000000000000000000000000000000000000000000000000001b' } },
  metadata: {} }
proposeWithdrawal:
{ address: '0x7f6cdd9de52496f5113ad889436b93a89e1d47be',
  blockNumber: 209454,
  transactionHash: '0x039ef2d94a8332c0137a1b75220bb542efdfa11f92b1fc9d4f121ef2df1e44df',
  transactionIndex: 0,
  blockHash: '0x5a874da81fbbf5422125d97dda243fcebda4e88bfc29343d74e01355a3f0b565',
  logIndex: 0,
  removed: false,
  event: 'VerifyReceipt',
  args: 
   { _type: BigNumber { s: 1, e: 0, c: [Array] },
     _gsn: '0x0000000000000000000000000000000000000000000000000000000000000bba',
     _lightTxHash: '0x182195f4cef492c19db058a12ec767c2f14baf13f1ae100216a245f22e983189',
     _fromBalance: '0x00000000000000000000000000000000000000000000017a62f57a6002900000',
     _toBalance: '0x0000000000000000000000000000000000000000000000000000000000000000',
     _sigLightTx: 
      [ '0x000000000000000000000000000000000000000000000000000000000000001b',
        '0x72036a849c6b6e486d0c8a26190fc049daf27561ec1fc34cc5b904ea5ef7e91e',
        '0x1b2ca2ef2f9a2f839079f477ed12ab9ec4af0e0d0bf61c10b46cfc50fcf64ddb' ],
     _sigReceipt: 
      [ '0x000000000000000000000000000000000000000000000000000000000000001b',
        '0x732b7cb419f32a4478db2a31512819247e1b6bb39afa058e13bdccde042dcac2',
        '0x1f7435862d8014c9015ee94920b29daa869a9987f1124e62c692c18c30a8a501' ] } }
```
This will start to send withdrawal light transaction to server synchronously.

### 4. Start `testInstantWithdraw.js`
```
$ node testInstantWithdraw.js

Receipt {
  _normalize: [Function],
  type: [Function],
  hasClientLightTxSig: [Function],
  hasServerLightTxSig: [Function],
  hasServerReceiptSig: [Function],
  toJson: [Function],
  lightTxHash: 'd30dd5eee5299088d7ee2c79148ef540403eab81d36e5253e9cd4cecc4758dbb',
  lightTxData: 
   { from: '00000000000000000000000030b82c8694b59695d78f33a7ba1c2a55dfa618d5',
     to: '0000000000000000000000000000000000000000000000000000000000000000',
     assetID: '0000000000000000000000000000000000000000000000000000000000000001',
     value: '0000000000000000000000000000000000000000000000000000000000002710',
     fee: '000000000000000000000000000000000000000000000000002386f26fc10000',
     nonce: 'c3da036e0d6dc0d62659a4a595f9a44708cb5610f2549f4cf7a650c21b50348c',
     logID: '3d54def58ee4a99f78f8da5cd5d41cb94835a3ea4c389c942ab897ce0896e621',
     metadataHash: 'b48d38f93eaa084033fc5970bf96e559c33c4cdc07d889ab00b4d63f9590739d' },
  receiptData: 
   { stageHeight: '0000000000000000000000000000000000000000000000000000000000000001',
     GSN: '0000000000000000000000000000000000000000000000000000000000000bc1',
     lightTxHash: 'd30dd5eee5299088d7ee2c79148ef540403eab81d36e5253e9cd4cecc4758dbb',
     fromBalance: '000000000000000000000000000000000000000000000178ec423484865ec8f0',
     toBalance: '0000000000000000000000000000000000000000000000000000000000000000' },
  receiptHash: '4c5c4885dfbd6b23e445694bd17f2e8c4cc2bb2477526bfe6c743d8b70b208c7',
  sig: 
   { clientLightTx: 
      { r: '0x1a03feca835cce95fc913148754e9496245a71cbf5e19ce75be6b8dd0a971f39',
        s: '0x2fbab81f6e6226cce88b957c4002be1038125c8b370c2bd8fe275b5c642de4dd',
        v: '0x000000000000000000000000000000000000000000000000000000000000001b' },
     serverLightTx: 
      { r: '0x1a03feca835cce95fc913148754e9496245a71cbf5e19ce75be6b8dd0a971f39',
        s: '0x2fbab81f6e6226cce88b957c4002be1038125c8b370c2bd8fe275b5c642de4dd',
        v: '0x000000000000000000000000000000000000000000000000000000000000001b' },
     serverReceipt: 
      { r: '0x9f3b6295c2427ba5fc207beadaa8fb7a148d4433e2ea68d7db84a1084bb6d68d',
        s: '0x09b31a7348bd5638cfdbe77d76863bf7c947e6b1ac1cf8cfc8301f36a0ab71d3',
        v: '0x000000000000000000000000000000000000000000000000000000000000001c' } },
  metadata: {} }
instantWithdraw:
{ address: '0x7f6cdd9de52496f5113ad889436b93a89e1d47be',
  blockNumber: 209661,
  transactionHash: '0x8006f4fd7b20aa758041f53daa38861f601a7c185279281559469762ecfef461',
  transactionIndex: 0,
  blockHash: '0xa4aa31597bf73e8082124738e1149ba0823b5da537fab145d8f64b72d5aa963d',
  logIndex: 0,
  removed: false,
  event: 'VerifyReceipt',
  args: 
   { _type: BigNumber { s: 1, e: 0, c: [Array] },
     _gsn: '0x0000000000000000000000000000000000000000000000000000000000000bc1',
     _lightTxHash: '0xd30dd5eee5299088d7ee2c79148ef540403eab81d36e5253e9cd4cecc4758dbb',
     _fromBalance: '0x000000000000000000000000000000000000000000000178ec423484865ec8f0',
     _toBalance: '0x0000000000000000000000000000000000000000000000000000000000000000',
     _sigLightTx: 
      [ '0x000000000000000000000000000000000000000000000000000000000000001b',
        '0x1a03feca835cce95fc913148754e9496245a71cbf5e19ce75be6b8dd0a971f39',
        '0x2fbab81f6e6226cce88b957c4002be1038125c8b370c2bd8fe275b5c642de4dd' ],
     _sigReceipt: 
      [ '0x000000000000000000000000000000000000000000000000000000000000001c',
        '0x9f3b6295c2427ba5fc207beadaa8fb7a148d4433e2ea68d7db84a1084bb6d68d',
        '0x09b31a7348bd5638cfdbe77d76863bf7c947e6b1ac1cf8cfc8301f36a0ab71d3' ] } }
```
This will start to send instantWithdraw light transaction to server synchronously.

> If you cannot run this file, please check the value of instantWithdrawMaximum in the sidechain.

### 5. Start `testAuditor.js`
```
$ node testAuditor.js

[ 'e422277c7333020f8dd254b7e8bdfb63c83465be',
  'ad2cc8dffc02b6689b02c034f9b7aa29ed9e4498',
  '4d8a4d6f40fe89843d60f0fe4d85defa900f720c',
  'd5c2c05281dca94184bdac2003dfccdb8d1307c7',
  '73be87dbd6c7657781be880690d01180255b49d6' ]
```
This will start to test distributed auditing, you can find the diagram in our [yellow paper](https://github.com/BOLT-Protocol/wiki/blob/master/yellow_paper_eng.md#%E5%88%86%E6%95%A3%E5%BC%8F%E7%A8%BD%E6%A0%B8-distributed-auditing).

## Reference
To learn more about BOLT protocol and how the server work, you can checkout BOLT white paper and yellow paper.

* [BOLT white paper](https://github.com/BOLT-Protocol/wiki/blob/master/white_paper_20180416.pdf)
* [BOLT yellow paper](https://github.com/BOLT-Protocol/wiki/blob/master/yellow_paper_eng.md)
* [BOLT wiki](https://github.com/BOLT-Protocol/wiki)
