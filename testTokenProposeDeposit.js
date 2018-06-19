let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('./env');
let axios = require('axios');
let Web3 = require('web3');

let db = level('./db');
let InfinitechainBuilder = wizard.InfinitechainBuilder;
let Receipt = wizard.Receipt;
// let Types = wizard.Types;
let url = 'http://127.0.0.1:3001/pay';
let assetAddress = 'dee3a5a5603023db237ecc837d15803a5a62b088';

let infinitechain = new InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('level', db)
  .build();

infinitechain.initialize().then(async () => {
  console.log('token proposeDeposit, you should transfer token to sidechain');

  // onDeposit
  infinitechain.event.onDeposit((err, result) => {
    console.log('Deposit:');
    console.log(result);
  });

  infinitechain.event.onProposeDeposit(async (err, result) => {
    if (!err) {
        let logID = result.args._dsn;
        let nonce = infinitechain.client._getNonce();
        let value = result.args._value;
        let lightTxData = {
            assetID: '0x' + assetAddress.padStart(64, '0'),
            value: value,
            fee: 0.01,
            nonce: nonce,
            logID: logID
        };

        let depositLightTx = await infinitechain.client.makeLightTx(0, lightTxData);
        let response = await axios.post(url, depositLightTx.toJson());
        let depositReceiptJson = response.data;

        let depositReceipt = new Receipt(depositReceiptJson);
        await infinitechain.client.saveReceipt(depositReceipt);
    }
  })
});
