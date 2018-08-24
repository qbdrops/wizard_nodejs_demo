let wizard = require('wizard_nodejs');
let env = require('./env');
let axios = require('axios');

let InfinitechainBuilder = wizard.InfinitechainBuilder;
let Receipt = wizard.Receipt;
let url = 'http://127.0.0.1:3001/pay';


let infinitechain = new InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('memory')
  .build();

infinitechain.initialize().then(async () => {
  try {
    let depositLightTxs = await infinitechain.client.getProposeDeposit();
    console.log('Still has ' + depositLightTxs.length + ' transaction no sent.')
    for (let i = 0; i < depositLightTxs.length; i++) {
      let response = await axios.post(url, depositLightTxs[i].toJson());
      let depositReceiptJson = response.data;

      let depositReceipt = new Receipt(depositReceiptJson);
      await infinitechain.client.saveReceipt(depositReceipt);
    }
    console.log('Resend success.');
  } catch (err) {
    console.log(err);
  }
});
