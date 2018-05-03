let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('./env');
let axios = require('axios');
let BalanceMap = require('./balance-set');
let db = level('./db');
let InfinitechainBuilder = wizard.InfinitechainBuilder;
let BigNumber = require('bignumber.js');
// let Receipt = wizard.Receipt;
let Types = wizard.Types;
let url = 'http://localhost:3001/pay';
let lsn = 1;
let lightTxJsonArray = [];
let balanceMap = new BalanceMap();
let infinitechain = new InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('level', db)
  .build();

infinitechain.initialize().then(async () => {
  // Deposit
  let lightTxData = {
    value: 2000,
    LSN: 1,
    fee: '0.01'
  };

  let lightTx = await infinitechain.client.makeLightTx(Types.deposit, lightTxData);
  await infinitechain.client.saveLightTx(lightTx);
  let txHash = await infinitechain.client.proposeDeposit(lightTx);
  console.log('proposeDeposit:');
  console.log('lightTxHash: ' + lightTx.lightTxHash);
  console.log('txHash: ' + txHash);

  infinitechain.event.onDeposit(async () => {
    balanceMap.setBalance(infinitechain.signer.getAddress(), new BigNumber(2000 *1e18).toString(16).padStart(64, '0'));
    // Remittance

    for (let i = 0; i < 500; i++) {
      await remittance();  
    }
    console.log(balanceMap);
    lightTxJsonArray.forEach(lightTxJson => {
      try{
        axios.post(url, lightTxJson);
      } catch (e) {
        console.log(e);
      }
    });
  });
});

let remittance = async () => {
  let localLsn = lsn;
  let address = randomHash();
  let remittanceData = {
    from: infinitechain.signer.getAddress(),
    to: address,
    value: 1,
    LSN: localLsn,
    fee: 0.002
  };
  lsn++;
  let lightTx = await infinitechain.client.makeLightTx(Types.remittance, remittanceData);
  lightTxJsonArray.push(lightTx.toJson());
  try{
    let value = new BigNumber('0x' + lightTx.lightTxData.value);
    let fromBalance = balanceMap.getBalance(infinitechain.signer.getAddress());
    let toBalance = balanceMap.getBalance(address);
    fromBalance = new BigNumber('0x' + fromBalance);
    toBalance = new BigNumber('0x' + toBalance);
    if (fromBalance.isGreaterThanOrEqualTo(value)) {
      fromBalance = fromBalance.minus(value);
      toBalance = toBalance.plus(value);
  
      fromBalance = fromBalance.toString(16).padStart(64, '0');
      toBalance = toBalance.toString(16).padStart(64, '0');
  
      balanceMap.setBalance(infinitechain.signer.getAddress(), fromBalance);
      balanceMap.setBalance(address, toBalance);
    }
  } catch(e) {
    console.log(e);
  }
};

let randomHash = () => {
  let text = '';
  let possible = 'abcdef0123456789';

  for (let i = 0; i < 40; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};