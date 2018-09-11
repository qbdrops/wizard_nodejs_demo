let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('./env');
let axios = require('axios');
let Web3 = require('web3');

let db = level('./db', { valueEncoding: 'json' });
let Receipt = wizard.Receipt;

let url = 'http://127.0.0.1:3001/pay';
let web3 = new Web3(env.web3Url);

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
  let from = '0x' + infinitechain.signer.getAddress();
  let to = infinitechain.contract.booster().options.address;
  let value = web3.utils.toHex(web3.utils.toWei('10000', 'ether'));
  // Simulate proposeDeposit
  let serializedTx = await infinitechain.contract._signRawTransaction(null, from, to, value, null);
  infinitechain.contract._sendRawTransaction(serializedTx).then(console.log);

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
  // get receipt in level
  // let getReceipt = await infinitechain.client.getReceipt(depositReceipt.lightTxHash);
  // console.log(getReceipt);
  // sync receipt to google drive
  // await infinitechain.client.syncReceipts();


  // Demo for audit slice
  infinitechain.event.onAttach(async (err, result) => {
    console.log('Attach:');
    console.log(result);
    console.log('Start audit my receipt.');
    let stageHeight = await infinitechain.contract.booster().methods.stageHeight().call();
    let receiptHashArray = await infinitechain.client.getAllReceiptHashes(stageHeight);
    let res = await infinitechain.client.getProof(stageHeight, receiptHashArray[0]);
    let proof = res.data.proof;
    let auditRes = await infinitechain.client.auidtReceiptProof(stageHeight, receiptHashArray[0], proof);
    console.log(auditRes);
  });
});
