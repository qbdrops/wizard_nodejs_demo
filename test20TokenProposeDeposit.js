let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('./env');
let axios = require('axios');
let Web3 = require('web3');
let util = require('ethereumjs-util');

let db = level('./db', { valueEncoding: 'json' });
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
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_spender",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "approve",
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
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "_owner",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "_spender",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
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
  console.log('token proposeDeposit, you should transfer token to booster.');
  let boosterAddress = infinitechain.contract.booster().address;
  let token = web3.eth.contract(abi).at('0x' + assetAddress);

  onApproval(async (err, result) => {
    console.log('Approval:');
    console.log(result);
    // proposeDeposit
    let proposeData = {
      depositAddress: fromAddress,
      depositValue: web3.toWei(10000),
      depositAssetAddress: assetAddress
    };
    // call booster contract to call transferFrom to get token. If success, write depositLog.
    console.log(infinitechain.client.proposeTokenDeposit(proposeData));
    let depositLightTx = await infinitechain.client.makeProposeDeposit();
  
    let response = await axios.post(url, depositLightTx.toJson());
    let depositReceiptJson = response.data;
  
    let depositReceipt = new Receipt(depositReceiptJson);
    await infinitechain.client.saveReceipt(depositReceipt);
  });
  // approve booster to get token
  console.log(await token.approve(boosterAddress, web3.toWei(10000), { from: '0x' + fromAddress, gas: 4000000, gasPrice: 100000000000 }));

  // onDeposit
  infinitechain.event.onDeposit((err, result) => {
    console.log('Deposit:');
    console.log(result);
  });
}).catch((err) => {
  console.log(err);
});

let onApproval = (cb) => {
  let token = web3.eth.contract(abi).at('0x' + assetAddress);
  token.Approval({ toBlock: 'latest' }).watch((err, result) => {
    if (err) { console.trace; }
    cb(err, result);
  });
};
