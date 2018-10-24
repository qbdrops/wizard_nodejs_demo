const wizard = require('wizard_nodejs');
const level = require('level');
const env = require('../env');
const axios = require('axios');
const Web3 = require('web3');
const util = require('ethereumjs-util');
// const { proposeDeposit, deploytoken,  } = require('./utils/IFCHealper');

const db = level('./db', { valueEncoding: 'json' });
const Receipt = wizard.Receipt;

const Types = wizard.Types;
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

// IFCHelper
const proposeDeposit = async () => {
  const depositLightTx = await infinitechain.client.makeProposeDeposit();
  const response = await axios.post(url, depositLightTx.toJson());
  const depositReceiptJson = response.data;
  const depositReceipt = new Receipt(depositReceiptJson);
  await infinitechain.client.saveReceipt(depositReceipt);
  return depositReceipt;
};
const deploytoken = async () => {
  const assetList = await infinitechain.gringotts.getAssetList();
  const assetAddress = assetList[1].asset_address;
  const boosterAddress = infinitechain.contract.booster().options.address;
  const token = new web3.eth.Contract(abi, assetAddress);
  return { assetAddress, boosterAddress, token };
};
const instantWithdraw = async (index, amount) => {
  const assetList = await infinitechain.gringotts.getAssetList();
  const assetAddress = assetList[index].asset_address;
  const withdrawalLightTx = await infinitechain.client.makeProposeWithdrawal({
    assetID: assetAddress,
    value: amount
  });
  const response = await axios.post(url, withdrawalLightTx.toJson());
  const withdrawalReceiptJson = response.data;
  const withdrawalReceipt = new Receipt(withdrawalReceiptJson);
  await infinitechain.client.saveReceipt(withdrawalReceipt);
  return withdrawalReceipt;
};

beforeAll(async () => {
  await infinitechain.initialize();
});

describe('Bolt integration test', () => {
  describe('test propose deposit', () => {
    test('should send transaction', async () => {
      const from = '0x' + infinitechain.signer.getAddress(); //client address
      const to = infinitechain.contract.booster().options.address; // contract address
      const value = web3.utils.toHex(web3.utils.toWei('10000', 'ether'));
      const serializedTx = await infinitechain.contract._signRawTransaction(null, from, to, value, null);
      infinitechain.contract._sendRawTransaction(serializedTx);
    }, 20000);

    test('should propose deposit', async (done) => {    
      let eventLightTxHash = null;
      infinitechain.event.onDeposit((err, result) => {
        eventLightTxHash = result.returnValues._lightTxHash;
      });
      const depositReceipt = await proposeDeposit();
      const receiptLightTxHash = depositReceipt.lightTxHash;
      expect(eventLightTxHash).toMatch('0x' + receiptLightTxHash);
      done();
    }, 20000);
  });
  describe('test erc20 propose deposit', async () => {
    test('should propose deposit', async done => { 
      const { assetAddress, boosterAddress, token } = await deploytoken();
      token.once('Approval', {
        filter: { _owner: '0x' + fromAddress },
        toBlock: 'latest'
      }, async (err, result) => {
        expect(result.transactionHash).toBeDefined();
        // proposeDeposit
        const proposeData = {
          depositAddress: fromAddress,
          depositValue: web3.utils.toWei('10000'),
          depositAssetAddress: assetAddress.substring(2)
        };
        // call booster contract to call transferFrom to get token. If success, write depositLog.
        infinitechain.client.proposeTokenDeposit(proposeData);
  
        let eventLightTxHash = null;
        infinitechain.event.onDeposit((err, result) => {
          eventLightTxHash = result.returnValues._lightTxHash;
        });
        const depositReceipt = await proposeDeposit();
        const receiptLightTxHash = depositReceipt.lightTxHash;
        expect(eventLightTxHash).toMatch('0x' + receiptLightTxHash);
        done();
      });
      // approve booster to get token
      const tXMethodData = await token.methods.approve(boosterAddress, web3.utils.toWei('10000')).encodeABI();
      const serializedTx = await infinitechain.contract._signRawTransaction(tXMethodData, '0x' + fromAddress, assetAddress, '0x00', null);
      infinitechain.contract._sendRawTransaction(serializedTx);
    }, 30000);
  });
  describe('test erc223 propose deposit', async() => {
    test('should send transaction', async () => {
      const from = '0x' + infinitechain.signer.getAddress();
      const { assetAddress, boosterAddress, token } = await deploytoken();
      
      const tXMethodData = await token.methods.transfer(boosterAddress, web3.utils.toWei('10000')).encodeABI();
      const serializedTx = await infinitechain.contract._signRawTransaction(tXMethodData, from, assetAddress, '0x00', null);
      infinitechain.contract._sendRawTransaction(serializedTx);
    }, 20000);
      
    test('should propose deposit', async (done) => {
      let eventLightTxHash = null;
      infinitechain.event.onDeposit((err, result) => {
        eventLightTxHash = result.returnValues._lightTxHash;
      });
      const depositReceipt = await proposeDeposit();
      const receiptLightTxHash = depositReceipt.lightTxHash;
      expect(eventLightTxHash).toMatch('0x' + receiptLightTxHash);
      done();
    }, 20000);
  }); 
  describe('test get propose deposit', async() => {
    test('should check propose deposit status', async () => {
      const depositLightTxs = await infinitechain.client.getProposeDeposit();
      let counter = 0;
      for (let i = 0; i < depositLightTxs.length; i++) {
        let response = await axios.post(url, depositLightTxs[i].toJson());
        let depositReceiptJson = response.data;
        counter+=1;
        let depositReceipt = new Receipt(depositReceiptJson);
        await infinitechain.client.saveReceipt(depositReceipt);
      }
      expect(depositLightTxs).toHaveLength(counter);
    }, 20000);
  });
  describe('test instant withdraw', async () => {
    test('should instant withdraw', async (done) => {
      let eventLightTxHash;
      infinitechain.event.onInstantWithdraw((err, result) => {
        eventLightTxHash = result.returnValues._lightTxHash;
      });
      const withdrawalReceipt = await instantWithdraw(0, 0.0000000001);
      const receiptLightTxHash = withdrawalReceipt.lightTxHash;
      expect(eventLightTxHash).toMatch('0x' + receiptLightTxHash);
      done();
    }, 20000);
  });
  describe('test token instant withdraw', async () => {
    test('should instant withdraw token', async (done) => {
      let eventLightTxHash;
      infinitechain.event.onInstantWithdraw((err, result) => {
        eventLightTxHash = result.returnValues._lightTxHash;
      });
      const withdrawalReceipt = await instantWithdraw(1, 1);
      const receiptLightTxHash = withdrawalReceipt.lightTxHash;
      expect(eventLightTxHash).toMatch('0x' + receiptLightTxHash);
      done();
    }, 30000);
  });
  describe.only('test remittance', async () => {
    test('should instant withdraw token', async () => {
    // get balance:
      const toAddress = new Array(39).fill(0).join('') + '1';   
      const gringottsUrl = `http://127.0.0.1:3000/balance/${toAddress}`;
      let remittance = async (chain, to, value) => {
        let remittanceData = {
          from: chain.signer.getAddress(),
          to: to,
          assetID: '0',
          value: value,
          fee: 0.002
        };
        let metadata = {
          client: '11111',
          server: '22222'
        };
        try {
          let lightTx = await chain.client.makeLightTx(Types.remittance, remittanceData, metadata);
          await axios.post(url, lightTx.toJson());
          return lightTx.lightTxHash;
        } catch(e) {
          console.log(e);
        }
      };
      await remittance(infinitechain, toAddress, 0.01);
      const response = await axios.get(gringottsUrl);
      console.log(response.data);
    }, 30000);
  });
});