const wizard = require('wizard_nodejs');
const level = require('level');
const env = require('../env');
const axios = require('axios');
const Web3 = require('web3');
const util = require('ethereumjs-util');

const db = level('./db', { valueEncoding: 'json' });
const Receipt = wizard.Receipt;

const url = 'http://127.0.0.1:3001/pay';
const web3 = new Web3(env.web3Url);
const abi = [
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

const fromAddress = util.publicToAddress(util.privateToPublic(Buffer.from(env.signerKey, 'hex'))).toString('hex');
const infinitechain = new wizard.InfinitechainBuilder() 
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
    const from = '0x' + infinitechain.signer.getAddress();
    const to = infinitechain.contract.booster().options.address;
    const value = web3.utils.toHex(web3.utils.toWei('10000', 'ether'));
    // Simulate proposeDeposit
    const serializedTx = await infinitechain.contract._signRawTransaction(null, from, to, value, null);
    infinitechain.contract._sendRawTransaction(serializedTx);

    const depositLightTx = await infinitechain.client.makeProposeDeposit();
    const response = await axios.post(url, depositLightTx.toJson());
    const depositReceiptJson = response.data;
    const depositReceipt = new Receipt(depositReceiptJson);
    await infinitechain.client.saveReceipt(depositReceipt);
    expect(depositReceipt).toBeDefined();
  }, 30000);
  test('test erc20 propose deposit', async done => {
    const assetList = await infinitechain.gringotts.getAssetList();
    const assetAddress = assetList[1].asset_address;
    const boosterAddress = infinitechain.contract.booster().options.address;
    const token = new web3.eth.Contract(abi, assetAddress);
    token.once('Approval', {
      filter: { _owner: '0x' + fromAddress },
      toBlock: 'latest'
    }, async (err, result) => {
      expect(result).toBeDefined();
      // proposeDeposit
      const proposeData = {
        depositAddress: fromAddress,
        depositValue: web3.utils.toWei('10000'),
        depositAssetAddress: assetAddress.substring(2)
      };
      // call booster contract to call transferFrom to get token. If success, write depositLog.
      infinitechain.client.proposeTokenDeposit(proposeData);
      const depositLightTx = await infinitechain.client.makeProposeDeposit();
      
      const response = await axios.post(url, depositLightTx.toJson());
      const depositReceiptJson = response.data;
      const depositReceipt = new Receipt(depositReceiptJson);
      await infinitechain.client.saveReceipt(depositReceipt);
      expect(depositReceipt).toBeDefined();
      done();
    });
    // approve booster to get token
    const tXMethodData = await token.methods.approve(boosterAddress, web3.utils.toWei('10000')).encodeABI();
    const serializedTx = await infinitechain.contract._signRawTransaction(tXMethodData, '0x' + fromAddress, assetAddress, '0x00', null);
    infinitechain.contract._sendRawTransaction(serializedTx);

    // onDeposit
    infinitechain.event.onDeposit((err, result) => {
      expect(result).toBeDefined();
    });
  
  }, 30000);
});
