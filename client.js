let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('./env');
let axios = require('axios');

let db = level('./db');
let InfinitechainBuilder = wizard.InfinitechainBuilder;
let Receipt = wizard.Receipt;
let Types = wizard.Types;
let url = 'http://localhost:3001/pay';

let infinitechain = new InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('level', db)
  .build();

infinitechain.initialize().then(async () => {
  // Deposit
  let lightTxData = {
    value: 20,
    LSN: 1,
    fee: '0.01'
  };

  let lightTx = await infinitechain.client.makeLightTx(Types.deposit, lightTxData);
  await infinitechain.client.saveLightTx(lightTx);
  let txHash = await infinitechain.client.proposeDeposit(lightTx);
  console.log('proposeDeposit:');
  console.log('lightTxHash: ' + lightTx.lightTxHash);
  console.log('txHash: ' + txHash);

  infinitechain.event.onDeposit(async () => {
    // Remittance
    let remittanceData = {
      from: infinitechain.signer.getAddress(),
      to: '50aabbbe9141fe7a80804bdf01473e250a3414cb',
      value: 1,
      LSN: 1,
      fee: 0.002
    };

    let remittanceLightTx = await infinitechain.client.makeLightTx(Types.remittance, remittanceData);
    let response = await axios.post(url, remittanceLightTx.toJson());
    let remittanceReceiptJson = response.data;

    let remittanceReceipt = new Receipt(remittanceReceiptJson);
    await infinitechain.client.saveReceipt(remittanceReceipt);

    // Instant Withdraw
    let instantWithdrawalData = {
      from: infinitechain.signer.getAddress(),
      value: 1,
      LSN: 2,
      fee: 0.002
    };
    let instantWithdrawalLightTx = await infinitechain.client.makeLightTx(Types.instantWithdrawal, instantWithdrawalData);
    let instantWithdrawalResponse = await axios.post(url, instantWithdrawalLightTx.toJson());
    let instantWithdrawalReceiptJson = instantWithdrawalResponse.data;
    let instantWithdrawalReceipt = new Receipt(instantWithdrawalReceiptJson);
    await infinitechain.client.saveReceipt(instantWithdrawalReceipt);

    let txHash = await infinitechain.client.instantWithdraw(instantWithdrawalReceipt);
    console.log('instantWithdraw:');
    console.log('lightTxHash: ' + instantWithdrawalReceipt.lightTxHash);
    console.log('txHash: ' + txHash);
  });

  infinitechain.event.onInstantWithdraw(async () => {
    // Withdraw
    let lightTxData = {
      value: 18,
      LSN: 3,
      fee: '0.01'
    };

    let lightTx = await infinitechain.client.makeLightTx(Types.withdrawal, lightTxData);
    await infinitechain.client.saveLightTx(lightTx);
    let txHash = await infinitechain.client.proposeWithdrawal(lightTx);
    console.log('proposeWithdrawal:');
    console.log('lightTxHash: ' + lightTx.lightTxHash);
    console.log('txHash: ' + txHash);
  });

  infinitechain.event.onConfirmWithdrawal(async (err, receipt) => {
    let txHash = await infinitechain.client.withdraw(receipt);
    console.log('withdraw:');
    console.log('lightTxHash: ' + receipt.lightTxHash);
    console.log('txHash: ' + txHash);
  });
});
