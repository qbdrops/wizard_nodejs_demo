let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('./env');
let axios = require('axios');
let Web3 = require('web3');

let db = level('./db', { valueEncoding: 'json' });
let Receipt = wizard.Receipt;

let url = 'http://127.0.0.1:3001/pay';
let web3 = new Web3(new Web3.providers.HttpProvider(env.web3Url));

// let credentials = require('./credentials.json');
// let token = require('./token.json');

let infinitechain = new wizard.InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('level', db)
  // .setReceiptSyncer('googleDrive', credentials)
  // .setSyncerToken(token)
  .build();

infinitechain.initialize().then(async () => {
  // Simulate proposeDeposit
  web3.eth.sendTransaction({
    from: web3.eth.coinbase,
    to: infinitechain.contract.booster().address,
    value: web3.toWei(10000, 'ether'),
    gas: 150000
  });
  console.log('proposeDeposit');

  // proposeDeposit
  let depositLightTx = await infinitechain.client.makeProposeDeposit();
  let response = await axios.post(url, depositLightTx.toJson());
  let depositReceiptJson = response.data;
  let depositReceipt = new Receipt(depositReceiptJson);

  await infinitechain.client.saveReceipt(depositReceipt);
  let getReceipt = await infinitechain.client.getReceipt(depositReceipt.lightTxHash);
  // get receipt in level
  console.log(getReceipt);
  // sync receipt to google drive
  // await infinitechain.client.syncReceipts();
});
