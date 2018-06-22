let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('./env');
let axios = require('axios');

let db = level('./db');
let InfinitechainBuilder = wizard.InfinitechainBuilder;
let Receipt = wizard.Receipt;
// let Types = wizard.Types;
let url = 'http://localhost:3001/pay';
let assetAddress = env.assetAddress;

let infinitechain = new InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('level', db)
  .build();

infinitechain.initialize().then(async () => {
  // onInstantWithdrawa
  infinitechain.event.onInstantWithdraw((err, result) => {
    console.log('instantWithdraw:');
    console.log(result);
  });

  // instantWithdraw
  let nonce = infinitechain.client._getNonce();
  let clientAddress = infinitechain.signer.getAddress();
  let normalizedClientAddress = clientAddress.slice(-40).padStart(64, '0').slice(-64);
  let logID = infinitechain.client._sha3(normalizedClientAddress + nonce);
  let lightTxData = {
    assetID: '0x' + assetAddress.padStart(64, '0'),
    value: 0.00000000000001,
    fee: 0.01,
    nonce: nonce,
    logID: logID
  };
  let withdrawalLightTx = await infinitechain.client.makeLightTx(2, lightTxData);
  let response = await axios.post(url, withdrawalLightTx.toJson());
  let withdrawalReceiptJson = response.data;

  let withdrawalReceipt = new Receipt(withdrawalReceiptJson);
  await infinitechain.client.saveReceipt(withdrawalReceipt);
  console.log(withdrawalReceipt);
});
