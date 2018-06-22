let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('./env');
let axios = require('axios');
let Web3 = require('web3');

let db = level('./db');
let InfinitechainBuilder = wizard.InfinitechainBuilder;
let Receipt = wizard.Receipt;
// let Types = wizard.Types;
let url = 'http://127.0.0.1:3001/pay';
let web3 = new Web3(new Web3.providers.HttpProvider(env.web3Url));
let assetAddress = env.assetAddress;
let abi = [
  {
    "constant": false,
    "inputs": [
      {
        "name": "_to",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "name": "success",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "name": "balance",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
];

let infinitechain = new InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('level', db)
  .build();

infinitechain.initialize().then(async () => {
  console.log('token proposeDeposit, you should transfer token to sidechain');
  let sidechainAddress = infinitechain.contract._sidechainAddress;
  let token = web3.eth.contract(abi).at('0x' + assetAddress);

  console.log(await token.transfer(sidechainAddress, 10000000, { from: '0x30b82c8694b59695d78f33a7ba1c2a55dfa618d5', gas: 4000000, gasPrice: 100000000000 }));

  // onDeposit
  infinitechain.event.onDeposit((err, result) => {
    console.log('Deposit:');
    console.log(result);
  });

  infinitechain.event.onProposeDeposit(async (err, result) => {
    console.log('proposedeposit');
    console.log(result);
    if (!err) {
        let logID = result.args._dsn;
        let nonce = infinitechain.client._getNonce();
        let value = result.args._value;
        let lightTxData = {
            assetID: '0x' + assetAddress.padStart(64, '0'),
            value: value,
            fee: 0.01,
            nonce: nonce,
            logID: logID
        };

        let depositLightTx = await infinitechain.client.makeLightTx(0, lightTxData);
        let response = await axios.post(url, depositLightTx.toJson());
        let depositReceiptJson = response.data;

        let depositReceipt = new Receipt(depositReceiptJson);
        await infinitechain.client.saveReceipt(depositReceipt);
    }
  })
})
.catch((err) => {
  console.log(err);
});
