let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('./env');
let axios = require('axios');

let db = level('./db', { valueEncoding: 'json' });
let InfinitechainBuilder = wizard.InfinitechainBuilder;
let Receipt = wizard.Receipt;

let url = 'http://127.0.0.1:3001/pay';

let infinitechain = new InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('level', db)
  .build();

infinitechain.initialize().then(async () => {
  let web3 = infinitechain.contract.web3();
  let from = '0x' + infinitechain.signer.getAddress();
  let to = infinitechain.contract.booster().options.address;
  let value = web3.utils.toHex(web3.utils.toWei('10000', 'ether'));
  // Simulate proposeDeposit
  let serializedTx = await infinitechain.contract._signRawTransaction(null, from, to, value, null);
  infinitechain.contract._sendRawTransaction(serializedTx).then(console.log);

  // onDeposit
  infinitechain.event.onDeposit((err, result) => {
    console.log('onDeposit:');
    console.log(result);
  });

  // proposeDeposit
  let depositLightTx = await infinitechain.client.makeProposeDeposit();
  let response = await axios.post(url, depositLightTx.toJson());
  let depositReceiptJson = response.data;
  let depositReceipt = new Receipt(depositReceiptJson);
  await infinitechain.client.saveReceipt(depositReceipt);
  console.log(depositReceipt);
});
