let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('./env');
let axios = require('axios');

let db = level('./db');
let InfinitechainBuilder = wizard.InfinitechainBuilder;
let Receipt = wizard.Receipt;
let Types = wizard.Types;

let infinitechain = new InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('level', db)
  .build();

infinitechain.initialize().then(async () => {
  let lightTxData = {
    value: 10,
    LSN: 1,
    fee: '0.01'
  };

  let lightTx = await infinitechain.client.makeLightTx(Types.deposit, lightTxData);
  await infinitechain.client.saveLightTx(lightTx);
  let txHash = await infinitechain.client.proposeDeposit(lightTx);
  console.log(txHash);

  infinitechain.event.onDeposit(async (err, result) => {
    console.log('deposit: ');
    let targetLightTxHash = result.args._lightTxHash.substring(2);
    let lightTx = await infinitechain.client.getLightTx(targetLightTxHash);
    let clientLightTxSig = lightTx.sig.clientLightTx;
    let serverLightTxSig = {
      v: result.args._sig_lightTx[0],
      r: result.args._sig_lightTx[1],
      s: result.args._sig_lightTx[2],
    };
    let serverReceiptSig = {
      v: result.args._sig_receipt[0],
      r: result.args._sig_receipt[1],
      s: result.args._sig_receipt[2],
    };

    let receiptJson = {
      lightTxHash: lightTx.lightTxHash,
      lightTxData: lightTx.lightTxData,
      sig: {
        clientLightTx: clientLightTxSig,
        serverLightTx: serverLightTxSig,
        serverReceipt: serverReceiptSig,
      },
      receiptData: {
        GSN: result.args._gsn,
        lightTxHash: result.args._lightTxHash.substring(2),
        fromBalance: result.args._fromBalance,
        toBalance: result.args._toBalance
      }
    };

    let receipt = new Receipt(receiptJson);
    await infinitechain.client.saveReceipt(receipt);
    let receiptFromDB = await infinitechain.client.getReceipt(receipt.receiptHash);

    console.log(receiptFromDB);

    let remittanceData = {
      from: '49aabbbe9141fe7a80804bdf01473e250a3414cb',
      to: '50aabbbe9141fe7a80804bdf01473e250a3414cb',
      value: 1,
      LSN: 1,
      fee: 0.002
    };

    let remittanceLightTx = await infinitechain.client.makeLightTx(Types.remittance, remittanceData);
    let url = 'http://localhost:3001/pay';
    let response = await axios.post(url, remittanceLightTx.toJson());
    let remittanceReceiptJson = response.data;

    let remittanceReceipt = new Receipt(remittanceReceiptJson);
    await infinitechain.client.saveReceipt(remittanceReceipt);
    let remittanceReceiptFromDB = await infinitechain.client.getReceipt(remittanceReceipt.receiptHash);
    remittanceReceiptFromDB = new Receipt(remittanceReceiptFromDB);
    console.log(remittanceReceiptFromDB.toJson());
  });
});
