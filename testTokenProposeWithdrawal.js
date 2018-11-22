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
  let assetList = await infinitechain.gringotts.getAssetList();
  if (assetList.length > 1) {
    let assetName = assetList[1].asset_name;
    let assetAddress = assetList[1].asset_address;
    console.log(assetName + ' proposeWithdrawal');

    // onProposeWithdrawal
    infinitechain.event.onProposeWithdrawal((err, result) => {
      console.log('proposeWithdrawal:');
      console.log(result);
    });

    // proposeWithdrawal
    let withdrawalLightTx = await infinitechain.client.makeProposeWithdrawal({
      assetID: assetAddress,
      value: '20'
    });

    let response = await axios.post(url, withdrawalLightTx.toJson());
    let withdrawalReceiptJson = response.data;

    let withdrawalReceipt = new Receipt(withdrawalReceiptJson);
    await infinitechain.client.saveReceipt(withdrawalReceipt);
    console.log(withdrawalReceipt);
  } else {
    console.log('This booster do not support any token.');
  }
});
