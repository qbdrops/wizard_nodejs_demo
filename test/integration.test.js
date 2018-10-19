let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('../env');
let axios = require('axios');
let Web3 = require('web3');
let util = require('ethereumjs-util');

let db = level('./db', { valueEncoding: 'json' });
let Receipt = wizard.Receipt;

let url = 'http://127.0.0.1:3001/pay';
let web3 = new Web3(env.web3Url);
let abi = [
  {
    'constant': false,
    'inputs': [
      {
        'name': '_to',
        'type': 'address'
      },
      {
        'name': '_value',
        'type': 'uint256'
      }
    ],
    'name': 'transfer',
    'outputs': [
      {
        'name': 'success',
        'type': 'bool'
      }
    ],
    'payable': false,
    'stateMutability': 'nonpayable',
    'type': 'function'
  },
  {
    'constant': true,
    'inputs': [
      {
        'name': '_owner',
        'type': 'address'
      }
    ],
    'name': 'balanceOf',
    'outputs': [
      {
        'name': 'balance',
        'type': 'uint256'
      }
    ],
    'payable': false,
    'stateMutability': 'view',
    'type': 'function'
  },
  {
    'constant': false,
    'inputs': [
      {
        'name': '_spender',
        'type': 'address'
      },
      {
        'name': '_value',
        'type': 'uint256'
      }
    ],
    'name': 'approve',
    'outputs': [
      {
        'name': 'success',
        'type': 'bool'
      }
    ],
    'payable': false,
    'stateMutability': 'nonpayable',
    'type': 'function'
  },
  {
    'anonymous': false,
    'inputs': [
      {
        'indexed': true,
        'name': '_owner',
        'type': 'address'
      },
      {
        'indexed': true,
        'name': '_spender',
        'type': 'address'
      },
      {
        'indexed': false,
        'name': '_value',
        'type': 'uint256'
      }
    ],
    'name': 'Approval',
    'type': 'event'
  }
];

let fromAddress = util.publicToAddress(util.privateToPublic(Buffer.from(env.signerKey, 'hex'))).toString('hex');
let infinitechain = new wizard.InfinitechainBuilder() 
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('level', db)
  .build(); 

beforeAll(async () => {
  await infinitechain.initialize();
});

describe('Bolt integration test', () => {
  test('test propose deposit', async () => {
    let from = '0x' + infinitechain.signer.getAddress();
    let to = infinitechain.contract.booster().options.address;
    let value = web3.utils.toHex(web3.utils.toWei('10000', 'ether'));
    // Simulate proposeDeposit
    let serializedTx = await infinitechain.contract._signRawTransaction(null, from, to, value, null);
    infinitechain.contract._sendRawTransaction(serializedTx);

    let depositLightTx = await infinitechain.client.makeProposeDeposit();
    let response = await axios.post(url, depositLightTx.toJson());
    let depositReceiptJson = response.data;
    let depositReceipt = new Receipt(depositReceiptJson);
    await infinitechain.client.saveReceipt(depositReceipt);
    expect(depositReceipt).toBeDefined();
  }, 20000);
  test.only('test erc20 propose deposit', async () => {
    let assetList = await infinitechain.gringotts.getAssetList();
    let assetName = assetList[1].asset_name;
    let assetAddress = assetList[1].asset_address;
    console.log(assetName + ' token proposeDeposit, you should transfer token to booster.');
    let boosterAddress = infinitechain.contract.booster().options.address;
    let token = new web3.eth.Contract(abi, assetAddress);
    
    token.once('Approval', {
      filter: { _owner: '0x' + fromAddress },
      toBlock: 'latest'
    }, async (err, result) => {
      console.log('Approval:');
      console.log(result);
      // proposeDeposit
      let proposeData = {
        depositAddress: fromAddress,
        depositValue: web3.utils.toWei('10000'),
        depositAssetAddress: assetAddress.substring(2)
      };
      // call booster contract to call transferFrom to get token. If success, write depositLog.
      infinitechain.client.proposeTokenDeposit(proposeData).then(console.log);
      let depositLightTx = await infinitechain.client.makeProposeDeposit();
    
      let response = await axios.post(url, depositLightTx.toJson());
      let depositReceiptJson = response.data;
      let depositReceipt = new Receipt(depositReceiptJson);
      await infinitechain.client.saveReceipt(depositReceipt);
    });
    // approve booster to get token
    let tXMethodData = await token.methods.approve(boosterAddress, web3.utils.toWei('10000')).encodeABI();
    let serializedTx = await infinitechain.contract._signRawTransaction(tXMethodData, '0x' + fromAddress, assetAddress, '0x00', null);
    infinitechain.contract._sendRawTransaction(serializedTx);
  
    // onDeposit
    infinitechain.event.onDeposit((err, result) => {
      console.log('Deposit:');
      console.log(result);
    });
  
  }, 20000);
});
