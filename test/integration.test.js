const wizard = require('wizard_nodejs');
const level = require('level');
const env = require('../env');
const axios = require('axios');
const Web3 = require('web3');
const util = require('ethereumjs-util');

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
const deposit = async () => {
  const depositLightTx = await infinitechain.client.makeProposeDeposit();
  const response = await axios.post(url, depositLightTx.toJson());
  const depositReceiptJson = response.data;
  const depositReceipt = new Receipt(depositReceiptJson);
  await infinitechain.client.saveReceipt(depositReceipt);
  return depositReceipt;
};
const deploytoken = async () => {
  const assetAddress = await getGringottsAssetAddress(1);
  const boosterAddress = infinitechain.contract.booster().options.address;
  const token = new web3.eth.Contract(abi, assetAddress);
  return { assetAddress, boosterAddress, token };
};
const withdraw = async (index, amount) => {
  const assetAddress = await getGringottsAssetAddress(index);
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
const remittance = async (chain, to, amount, assetID) => {
  const remittanceData = {
    from: chain.signer.getAddress(),
    to: to,
    assetID: assetID,
    value: amount,
    fee: 0.001
  };
  const metadata = {
    client: '11111',
    server: '22222'
  };
  const lightTx = await chain.client.makeLightTx(Types.remittance, remittanceData, metadata);
  const res = await axios.post(url, lightTx.toJson());
  return res.data;
};
const getGringottsAssetAddress = async index => {
  const assetList = await infinitechain.gringotts.getAssetList();
  const assetAddress = assetList[index].asset_address;
  return assetAddress;
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
      let eventLightTxHash;
      infinitechain.event.onDeposit((err, result) => {
        eventLightTxHash = result.returnValues._lightTxHash;
      });
      const depositReceipt = await deposit();
      const receiptLightTxHash = depositReceipt.lightTxHash;
      expect(eventLightTxHash).toMatch('0x' + receiptLightTxHash);
      done();
    }, 20000);
  });
  describe('test erc20 propose deposit', () => {
    test('should propose deposit', async done => { 
      const { assetAddress, boosterAddress, token } = await deploytoken();
      token.once('Approval', {
        filter: { _owner: '0x' + fromAddress },
        toBlock: 'latest'
      }, async (err, result) => {
        expect(result.transactionHash).toBeDefined();
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
        const depositReceipt = await deposit();
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
  describe('test erc223 propose deposit', () => {
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
      const depositReceipt = await deposit();
      const receiptLightTxHash = depositReceipt.lightTxHash;
      expect(eventLightTxHash).toMatch('0x' + receiptLightTxHash);
      done();
    }, 20000);
  }); 
  describe('test get propose deposit', () => {
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
  describe('test instant withdraw', () => {
    test('should instant withdraw', async (done) => {
      let eventLightTxHash;
      infinitechain.event.onInstantWithdraw((err, result) => {
        eventLightTxHash = result.returnValues._lightTxHash;
      });
      const withdrawalReceipt = await withdraw(0, 0.0000000001);
      const receiptLightTxHash = withdrawalReceipt.lightTxHash;
      expect(eventLightTxHash).toMatch('0x' + receiptLightTxHash);
      done();
    }, 20000);
  });
  describe('test token instant withdraw', () => {
    test('should instant withdraw token', async (done) => {
      let eventLightTxHash;
      infinitechain.event.onInstantWithdraw((err, result) => {
        eventLightTxHash = result.returnValues._lightTxHash;
      });
      const withdrawalReceipt = await withdraw(1, 1);
      const receiptLightTxHash = withdrawalReceipt.lightTxHash;
      expect(eventLightTxHash).toMatch('0x' + receiptLightTxHash);
      done();
    }, 30000);
  });
  describe('test remittance', () => {
    test('should remittance', async () => {
      const toAddress = new Array(39).fill(0).join('') + '1';   
      const gringottsUrl = `http://127.0.0.1:3000/balance/${toAddress}`;
      const assetAddress = await getGringottsAssetAddress(0);

      let response = await axios.get(gringottsUrl, { params: { assetID: assetAddress.substring(2) } });
      const beforeBalance = response.data.balance;

      const receipt = await remittance(infinitechain, toAddress, 0.01, 0);
      const receiptBalance = parseInt(receipt.receiptData.toBalance, 16);

      response = await axios.get(gringottsUrl, { params: { assetID: assetAddress.substring(2) } });
      const afterBalance = response.data.balance;

      expect(afterBalance - beforeBalance).toBe(0.01*10**18);
      expect(receiptBalance).toBe(parseInt(afterBalance));
    }, 30000);
  });
  describe('test token remittance', () => {
    test('should remittance token', async () => {
      const toAddress = new Array(39).fill(0).join('') + '1';   
      const gringottsUrl = `http://127.0.0.1:3000/balance/${toAddress}`;
      const assetAddress = await getGringottsAssetAddress(1);
      
      let response = await axios.get(gringottsUrl, { params: { assetID: assetAddress.substring(2) } });
      const beforeBalance = response.data.balance;

      const receipt = await remittance(infinitechain, toAddress, 0.01, assetAddress);
      const receiptBalance = parseInt(receipt.receiptData.toBalance, 16);

      response = await axios.get(gringottsUrl, { params: { assetID: assetAddress.substring(2) } });
      const afterBalance = response.data.balance;

      expect(afterBalance - beforeBalance).toBe(0.01*10**18);
      expect(receiptBalance).toBe(parseInt(afterBalance));
    }, 30000);
  });
  describe('test propose withdraw', () => {
    test('should propose withdraw', async (done) => {
      let eventLightTxHash;
      infinitechain.event.onProposeWithdrawal((err, result) => {
        eventLightTxHash = result.returnValues._lightTxHash;
      });
      const withdrawalReceipt = await withdraw(0, 20);
      const receiptLightTxHash = withdrawalReceipt.lightTxHash;
      expect(eventLightTxHash).toMatch('0x' + receiptLightTxHash);
      done();
    }, 30000);
  });
  describe('test token propose withdraw', () => {
    test('should propose withdraw token', async (done) => {
      let eventLightTxHash;
      infinitechain.event.onProposeWithdrawal((err, result) => {
        eventLightTxHash = result.returnValues._lightTxHash;
      });
      const withdrawalReceipt = await withdraw(1, 20);
      const receiptLightTxHash = withdrawalReceipt.lightTxHash;
      expect(eventLightTxHash).toMatch('0x' + receiptLightTxHash);
      done();
    }, 30000);
  });
});