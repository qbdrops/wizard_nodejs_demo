let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('./env');

let db = level('./db', { valueEncoding: 'json' });
let InfinitechainBuilder = wizard.InfinitechainBuilder;

let infinitechain = new InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('level', db)
  .build();

infinitechain.initialize().then(async () => {
  console.log('Wait attach......');
  infinitechain.event.onAttach(async (err, result) => {
    console.log('Attach:');
    console.log(result);
    console.log('Start audit.');
    let stageHeight = await infinitechain.contract.booster().methods.stageHeight().call();
    // auidt all my receipts as a Client
    let receiptHashArray = await infinitechain.client.getAllReceiptHashes(stageHeight); // get all receipt hashes in this stageHeight
    for (let i = 0; i < receiptHashArray.length; i++) {
      let res = await infinitechain.client.getSlice(stageHeight, receiptHashArray[i]); // get receipt slice
      let auditRes = await infinitechain.client.auidtReceiptSlice(stageHeight, receiptHashArray[i], res.data.slice); // auidt receipt slice
      console.log(receiptHashArray[i], auditRes);
    }

    // auidt all receipts as a Auditor
    infinitechain.auditor.audit(stageHeight).then(console.log);
  });
});
