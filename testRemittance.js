let wizard = require('wizard_nodejs');
let env = require('./env');
let axios = require('axios');
let BalanceMap = require('./balance-set');
let InfinitechainBuilder = wizard.InfinitechainBuilder;
let BigNumber = require('bignumber.js');
let Types = wizard.Types;
let url = 'http://0.0.0.0:3001/pay';
let lightTxJsonArray = [];
let balanceMap = new BalanceMap();
let infinitechain = new InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('memory')
  .build();

let addresses = [];
let txNumber = 1500;

infinitechain.initialize().then(async () => {
  // Deposit
  let lightTxData = {
    value: 10000,
    LSN: Math.random()*1e18,
    fee: '0.01'
  };

  let lightTx = await infinitechain.client.makeLightTx(Types.deposit, lightTxData);
  let txHash = await infinitechain.client.proposeDeposit(lightTx);
  console.log('proposeDeposit:');
  console.log('lightTxHash: ' + lightTx.lightTxHash);
  console.log('txHash: ' + txHash);

  setTimeout(async () => {
    balanceMap.setBalance(infinitechain.signer.getAddress(), new BigNumber(2000 *1e18).toString(16).padStart(64, '0'));
    // Remittance
    addresses.push(infinitechain.signer.getAddress());

    lightTxJsonArray = [];
    for (let i = 0; i < txNumber; i++) {
      await remittance();
    }
    console.log(balanceMap);
    let size = lightTxJsonArray.length;

    for (let i = 0; i < size; i++) {
      let lightTxJson = lightTxJsonArray[i];
      try {
        await axios.post(url, lightTxJson);
      } catch (e) {
        console.error(e);
      }
    }

    lightTxJsonArray = [];

    for (let i = 0 ; i < txNumber; i++) {
      let fromRandom = Math.floor(Math.random() * txNumber);
      let from = addresses[fromRandom];

      let toRandom = Math.floor(Math.random() * txNumber);
      let to = addresses[toRandom];
      await remittance(from, to, 0.001);
    }

    console.log(lightTxJsonArray.length);

    for (let i = 0; i < lightTxJsonArray.length; i++) {
      let lightTxJson = lightTxJsonArray[i];
      axios.post(url, lightTxJson).catch(console.log);
    }
  }, 5000);
});

let remittance = async (from, to, value) => {
  if (!from) {
    from = infinitechain.signer.getAddress();
  }

  if (!to) {
    to = randomHash();
  }

  if (!value) {
    value = 1;
  }
  let remittanceData = {
    from: from,
    to: to,
    value: value,
    LSN: Math.random()*1e18,
    fee: 0.002
  };

  addresses.push(to);
  try {
    let lightTx = await infinitechain.client.makeLightTx(Types.remittance, remittanceData);
    lightTxJsonArray.push(lightTx.toJson());
    let value = new BigNumber('0x' + lightTx.lightTxData.value);
    let fromBalance = balanceMap.getBalance(infinitechain.signer.getAddress());
    let toBalance = balanceMap.getBalance(to);
    fromBalance = new BigNumber('0x' + fromBalance);
    toBalance = new BigNumber('0x' + toBalance);
    if (fromBalance.isGreaterThanOrEqualTo(value)) {
      fromBalance = fromBalance.minus(value);
      toBalance = toBalance.plus(value);

      fromBalance = fromBalance.toString(16).padStart(64, '0');
      toBalance = toBalance.toString(16).padStart(64, '0');

      balanceMap.setBalance(infinitechain.signer.getAddress(), fromBalance);
      balanceMap.setBalance(to, toBalance);
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