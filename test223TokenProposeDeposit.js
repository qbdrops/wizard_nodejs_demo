let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('./env');
let axios = require('axios');
let Web3 = require('web3');
let util = require('ethereumjs-util');

let db = level('./db', { valueEncoding: 'json' });
let InfinitechainBuilder = wizard.InfinitechainBuilder;
let Receipt = wizard.Receipt;
let url = 'http://127.0.0.1:3001/pay';
let web3 = new Web3(env.web3Url);
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
let fromAddress = util.publicToAddress(util.privateToPublic(Buffer.from(env.signerKey, 'hex'))).toString('hex');
let infinitechain = new InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('level', db)
  .build();
infinitechain.initialize().then(async () => {
  let from = '0x' + infinitechain.signer.getAddress();
  let assetList = await infinitechain.gringotts.getAssetList();
  let assetName = assetList[1].asset_name;
  let assetAddress = assetList[1].asset_address;
  console.log(assetName + ' token proposeDeposit, you should transfer token to boostar');
  let boosterAddress = infinitechain.contract.booster().options.address;
  let token = new web3.eth.Contract(abi, assetAddress);
  let tXMethodData = await token.methods.transfer(boosterAddress, web3.utils.toWei('10000')).encodeABI();
  let serializedTx = await infinitechain.contract._signRawTransaction(tXMethodData, from, assetAddress, '0x00', null);
  infinitechain.contract._sendRawTransaction(serializedTx).then(console.log);

  // onDeposit
  infinitechain.event.onDeposit((err, result) => {
    console.log('Deposit:');
    console.log(result);
  });

  // proposeDeposit
  let depositLightTx = await infinitechain.client.makeProposeDeposit();

  let response = await axios.post(url, depositLightTx.toJson());
  let depositReceiptJson = response.data;

  let depositReceipt = new Receipt(depositReceiptJson);
  await infinitechain.client.saveReceipt(depositReceipt);
}).catch((err) => {
  console.log(err);
});