let wizard = require('wizard_nodejs');

let InfinitechainBuilder = wizard.InfinitechainBuilder;
let Receipt = wizard.Receipt;
let Types = wizard.Types;

let infinitechain = new wizard.InfinitechainBuilder()
  .setNodeUrl('http://0.0.0.0:3000')
  .setWeb3Url('http://0.0.0.0:8545')
  .setSignerKey('2058a2d1b99d534dc0ec3e71876e4bcb0843fd55637211627087d53985ab04aa')
  .setStorage('memory')
  .build();

infinitechain.initialize().then(async () => {
  let lightTxData = {
    from: '0x123',
    to: '0x456',
    value: 0.1,
    LSN: 1,
    fee: '0.01',
    stageHeight: 1
  };

  let lightTx = await infinitechain.client.makeLightTx(Types.deposit, lightTxData);
  await infinitechain.client.saveLightTx(lightTx);
  let txHash = await infinitechain.client.proposeDeposit(lightTx);
  console.log(txHash);

  infinitechain.event.onProposeDeposit((err, r) => {
    console.log('proposeDeposit: ');
    console.log(r);
  });

  infinitechain.event.onDeposit(async (err, r) => {
    console.log('deposit: ');
    let targetLightTxHash = r.args._lightTxHash.substring(2);
    let lightTx = await infinitechain.client.getLightTx(targetLightTxHash);
    let receiptJson = {
      lightTxHash: lightTx.lightTxHash,
      lightTxData: lightTx.lightTxData,
      sig: {
        clientLightTx: lightTx.sig.clientLightTx,
        serverLightTx: r.args._sig_lightTx,
        serverReceipt: r.args._sig_receipt,
      }
    };
  });

  infinitechain.event.onProposeWithdrawal((err, r) => {
    console.log('withdrawal: ');
    console.log(r);
  });
});
