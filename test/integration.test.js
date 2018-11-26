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
  const { assetAddress } = await getGringottsAssetAddress(1);
  const boosterAddress = infinitechain.contract.booster().options.address;
  const token = infinitechain.contract.erc20(assetAddress);
  return { assetAddress, boosterAddress, token };
};
const withdraw = async (index, amount) => {
  const { assetAddress } = await getGringottsAssetAddress(index);
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
    fee: '0.001'
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
  const assetDecimals = assetList[index].asset_decimals;
  return { assetAddress, assetDecimals };
};
let withdrawalReceipts = [];
let attachedStages = [];

beforeAll(async () => {
  await infinitechain.initialize();
});

describe('Bolt integration test', () => {
  describe('test propose deposit', () => {
    test('should send transaction', async () => {
      const from = '0x' + infinitechain.signer.getAddress(); //client address
      const to = infinitechain.contract.booster().options.address; // contract address
      const value = web3.utils.toHex(web3.utils.toWei('15', 'ether'));
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
    }, 60000);
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
          depositValue: '10000',
          depositAssetAddress: assetAddress
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
      infinitechain.contract._sendRawTransaction(serializedTx).then(async txHash => {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        expect(receipt.status).toMatch('0x1');
      });
    }, 120000);
  });
  describe('test erc223 propose deposit', () => {
    test('should send transaction', async () => {
      const from = '0x' + infinitechain.signer.getAddress();
      const { assetAddress, boosterAddress, token } = await deploytoken();

      const tXMethodData = await token.methods.transfer(boosterAddress, web3.utils.toWei('10000')).encodeABI();
      const serializedTx = await infinitechain.contract._signRawTransaction(tXMethodData, from, assetAddress, '0x00', null);
      infinitechain.contract._sendRawTransaction(serializedTx).then(async txHash => {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        expect(receipt.status).toMatch('0x1');
      });
      let eventLightTxHash = null;
      infinitechain.event.onDeposit((err, result) => {
        eventLightTxHash = result.returnValues._lightTxHash;
      });
      const depositReceipt = await deposit();
      const receiptLightTxHash = depositReceipt.lightTxHash;
      expect(eventLightTxHash).toMatch('0x' + receiptLightTxHash);
    }, 60000);
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
    }, 30000);
  });
  describe('test instant withdraw', () => {
    test('should instant withdraw', async (done) => {
      let eventLightTxHash;
      infinitechain.event.onInstantWithdraw((err, result) => {
        eventLightTxHash = result.returnValues._lightTxHash;
      });
      const withdrawalReceipt = await withdraw(0, '0.1');
      const receiptLightTxHash = withdrawalReceipt.lightTxHash;
      expect(eventLightTxHash).toMatch('0x' + receiptLightTxHash);
      done();
    }, 30000);
  });
  describe('test token instant withdraw', () => {
    test('should instant withdraw token', async (done) => {
      let eventLightTxHash;
      infinitechain.event.onInstantWithdraw((err, result) => {
        eventLightTxHash = result.returnValues._lightTxHash;
      });
      const withdrawalReceipt = await withdraw(1, '1');
      const receiptLightTxHash = withdrawalReceipt.lightTxHash;
      expect(eventLightTxHash).toMatch('0x' + receiptLightTxHash);
      done();
    }, 30000);
  });
  describe('test remittance', () => {
    test('should remittance', async () => {
      const toAddress = new Array(39).fill(0).join('') + '1';   
      const gringottsUrl = `http://127.0.0.1:3000/balance/${toAddress}`;
      const { assetAddress, assetDecimals } = await getGringottsAssetAddress(0);

      let response = await axios.get(gringottsUrl, { params: { assetID: assetAddress.substring(2) } });
      const beforeBalance = response.data.balance;

      const receipt = await remittance(infinitechain, toAddress, '0.01', 0);
      const receiptBalance = parseInt(receipt.receiptData.toBalance, 16);

      response = await axios.get(gringottsUrl, { params: { assetID: assetAddress.substring(2) } });
      const afterBalance = response.data.balance;

      expect(afterBalance - beforeBalance).toBe(0.01*10**assetDecimals);
      expect(receiptBalance).toBe(parseInt(afterBalance));
    }, 30000);
  });
  describe('test token remittance', () => {
    test('should remittance token', async () => {
      const toAddress = new Array(39).fill(0).join('') + '1';   
      const gringottsUrl = `http://127.0.0.1:3000/balance/${toAddress}`;
      const { assetAddress, assetDecimals } = await getGringottsAssetAddress(1);
      
      let response = await axios.get(gringottsUrl, { params: { assetID: assetAddress.substring(2) } });
      const beforeBalance = response.data.balance;

      const receipt = await remittance(infinitechain, toAddress, '0.01', assetAddress);
      const receiptBalance = parseInt(receipt.receiptData.toBalance, 16);

      response = await axios.get(gringottsUrl, { params: { assetID: assetAddress.substring(2) } });
      const afterBalance = response.data.balance;

      expect(afterBalance - beforeBalance).toBe(0.01*10**assetDecimals);
      expect(receiptBalance).toBe(parseInt(afterBalance));
    }, 30000);
  });
  describe('test propose withdraw', () => {
    test('should propose withdraw', async (done) => {
      let eventLightTxHash;
      infinitechain.event.onProposeWithdrawal((err, result) => {
        eventLightTxHash = result.returnValues._lightTxHash;
      });
      const withdrawalReceipt = await withdraw(0, '11');
      const receiptLightTxHash = withdrawalReceipt.lightTxHash;
      expect(eventLightTxHash).toMatch('0x' + receiptLightTxHash);
      withdrawalReceipts.push(withdrawalReceipt);
      done();
    }, 30000);
  });
  describe('test token propose withdraw', () => {
    test('should propose withdraw token', async (done) => {
      let eventLightTxHash;
      infinitechain.event.onProposeWithdrawal((err, result) => {
        eventLightTxHash = result.returnValues._lightTxHash;
      });
      const withdrawalReceipt = await withdraw(1, '20');
      const receiptLightTxHash = withdrawalReceipt.lightTxHash;
      expect(eventLightTxHash).toMatch('0x' + receiptLightTxHash);
      withdrawalReceipts.push(withdrawalReceipt);
      done();
    }, 30000);
  });
  describe('test attach, audit and finalize', () => {
    test('should attach receipts created in previous test', async (done) => {
      infinitechain.event.onAttach(async (err, result) => {
        stageHeight = parseInt(stageHeight) + 1;
        if (attachedStages.indexOf(stageHeight) < 0) {
          attachedStages.push(stageHeight);
        }
        stageHeight = '0x' + stageHeight.toString(16).padStart(64, '0');
        expect(result.returnValues._stageHeight).toBe(stageHeight);
        done();
      });
      let stageHeight = await infinitechain.contract._booster.methods.stageHeight().call();
      let res = await axios.post(`${env.nodeUrl}/attach`);
      expect(res.data.ok).toBe(true);
    }, 30000);

    test('should return empty array when no one is bad guy', async (done) => {
      let allowedKeys = [
        'receiptsWithRepeatedGSN', 'receiptsWithWrongBalance', 'receiptsWithSkippedGSN', 'receiptWithoutIntegrity'
      ];
      let stageHeight = await infinitechain.contract.booster().methods.stageHeight().call();

      // auidt all receipts as a Auditor
      infinitechain.auditor.audit(stageHeight).then((data) => {
        let keys = Object.keys(data);
        for (let i=0; i<keys.length; i++) {
          expect(allowedKeys.indexOf(keys[i]) >= 0).toBe(true);
          expect(data[keys[i]].length).toBe(0);
        }
        done();
      });
    }, 30000);

    test('should finalize the stage', async (done) => {
      infinitechain.event.onFinalize((err, result) => {
        stageHeight = '0x' + parseInt(stageHeight).toString(16).padStart(64, '0');
        done();
      });
      let stageHeight = await infinitechain.contract._booster.methods.stageHeight().call();
      let res = await axios.post(`${env.nodeUrl}/finalize`);
      expect(res.data.ok).toBe(true);
    }, 30000);

    test('should attach when there is not any receipt in database', async (done) => {
      infinitechain.event.onAttach(async (err, result) => {
        stageHeight = parseInt(stageHeight) + 1;
        if (attachedStages.indexOf(stageHeight) < 0) {
          attachedStages.push(stageHeight);
        }
        stageHeight = '0x' + stageHeight.toString(16).padStart(64, '0');
        expect(result.returnValues._stageHeight).toBe(stageHeight);
        // finalize, remove this future
        let finalizeRes = await axios.post(`${env.nodeUrl}/finalize`);
        done();
      });
      let stageHeight = await infinitechain.contract._booster.methods.stageHeight().call();
      let res = await axios.post(`${env.nodeUrl}/attach`);
      expect(res.data.ok).toBe(true);
    }, 60000);
  });

  describe('test withdraw after attach and finalize', () => {
    test('should withdraw all receipts', async (done) => {
      infinitechain.event.onWithdraw(async (err, result) => {
        console.log('Withdraw: ', result);
      });
      for (let i=0; i<withdrawalReceipts.length; i++) {
        try {
          let txHash = await infinitechain.contract.withdraw(withdrawalReceipts[i]);
          let isTxFinished = await infinitechain.contract.isTxFinished(txHash);
          expect(isTxFinished).toBe(true);
        } catch (e) {
          console.log(`Withdrawal error: ${e.message}`)
        }
      }
      done();
    }, 90000);
  });

  describe('test get fee', () => {
    test('should get fee after attach', async (done) => {
      // the user of private must be goblin
      let from = infinitechain.signer.getAddress();
      let boosterAddress = infinitechain.contract.booster().options.address;
      for (let i=0; i<attachedStages.length; i++) {
        let stageHeight = attachedStages[i];
        let balanceBefore = new util.BN(await web3.eth.getBalance(from));
        let contractBalanceBefore = new util.BN(await web3.eth.getBalance(boosterAddress));
        let txMethodData = infinitechain.contract.booster().methods.getFeeWithStageHeight(stageHeight).encodeABI();
        let signedTx = await infinitechain.contract._signRawTransaction(txMethodData, from, boosterAddress, '0x0', env.signerKey);
        let receipt = await web3.eth.sendSignedTransaction(signedTx);
        let isTxFinished = await infinitechain.contract.isTxFinished(receipt.transactionHash);
        expect(isTxFinished).toBe(true);
        let balanceAfter = new util.BN(await web3.eth.getBalance(from));
        let contractBalanceAfter = new util.BN(await web3.eth.getBalance(boosterAddress));
        let balanceDiff = balanceAfter.sub(balanceBefore);
        let contractBalanceDiff = contractBalanceAfter.sub(contractBalanceBefore);
        expect(contractBalanceDiff.neg().eq(balanceDiff)).toBe(true);
      }
      done();
    }, 120000);
  });
});