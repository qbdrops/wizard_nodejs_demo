let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('./env');
let axios = require('axios');

let db = level('./db', { valueEncoding: 'json' });
let Receipt = wizard.Receipt;

let url = 'http://127.0.0.1:3001/pay';

let credentials;
let token;

let infinitechain = new wizard.InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('level', db)
  .build();

infinitechain.initialize().then(async () => {
  // onProposeWithdrawal
  infinitechain.event.onProposeWithdrawal((err, result) => {
    console.log('proposeWithdrawal:');
    console.log(result);
  });
  // onWithdraw
  infinitechain.event.onWithdraw(async (err, result) => {
    console.log('Withdraw: ', result);
  });

  // proposeWithdrawal
  let withdrawalLightTx = await infinitechain.client.makeProposeWithdrawal({
    assetID: 0,
    value: 20
  });
  let response = await axios.post(url, withdrawalLightTx.toJson());
  let withdrawalReceiptJson = response.data;

  let withdrawalReceipt = new Receipt(withdrawalReceiptJson);
  await infinitechain.client.saveReceipt(withdrawalReceipt);
  console.log(withdrawalReceipt);

  // onAttach
  infinitechain.event.onAttach(async (err, result) => {
    console.log('Stage attach:', result);
    console.log('Start withdraw.');
    infinitechain.contract.withdraw(withdrawalReceipt).then(console.log);
  });
});
