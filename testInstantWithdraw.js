let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('./env');
let axios = require('axios');

let db = level('./db', { valueEncoding: 'json' });
let InfinitechainBuilder = wizard.InfinitechainBuilder;
let Receipt = wizard.Receipt;
let url = 'http://localhost:3001/pay';

let infinitechain = new InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('level', db)
  .build();

infinitechain.initialize().then(async () => {
  // onInstantWithdrawal
  infinitechain.event.onInstantWithdraw((err, result) => {
    console.log('instantWithdraw:');
    console.log(result);
  });

  // instantWithdraw
  let withdrawalLightTx = await infinitechain.client.makeProposeWithdrawal({
    assetID: '0',
    value: 0.0000000001
  });

  let response = await axios.post(url, withdrawalLightTx.toJson());
  let withdrawalReceiptJson = response.data;

  let withdrawalReceipt = new Receipt(withdrawalReceiptJson);
  await infinitechain.client.saveReceipt(withdrawalReceipt);
  console.log(withdrawalReceipt);
});
