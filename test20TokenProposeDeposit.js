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
  let fromAddress = '0x' + infinitechain.signer.getAddress();
  let assetList = await infinitechain.gringotts.getAssetList();
  if (assetList.length > 1) {
    let assetName = assetList[1].asset_name;
    let assetAddress = assetList[1].asset_address;
    console.log(assetName + ' token proposeDeposit, you should transfer token to booster.');
    let web3 = infinitechain.contract.web3();
    let boosterAddress = infinitechain.contract.booster().options.address;
    let token = infinitechain.contract.erc20(assetAddress);

    token.once('Approval', {
      filter: { _owner: fromAddress },
      toBlock: 'latest'
    }, async (err, result) => {
      console.log('Approval:');
      console.log(result);
      // proposeDeposit
      let proposeData = {
        depositAddress: fromAddress,
        depositValue: '10000',
        depositAssetAddress: assetAddress
      };
      // call booster contract to call transferFrom to get token. If success, write depositLog.
      infinitechain.client.proposeTokenDeposit(proposeData).then(console.log);
      let depositLightTx = await infinitechain.client.makeProposeDeposit();
    
      let response = await axios.post(url, depositLightTx.toJson());
      let depositReceiptJson = response.data;
    
      let depositReceipt = new Receipt(depositReceiptJson);
      await infinitechain.client.saveReceipt(depositReceipt);
      console.log(depositReceipt);
    });
    // approve booster to get token
    let tXMethodData = await token.methods.approve(boosterAddress, web3.utils.toWei('10000')).encodeABI();
    let serializedTx = await infinitechain.contract._signRawTransaction(tXMethodData, fromAddress, assetAddress, '0x00', null);
    infinitechain.contract._sendRawTransaction(serializedTx);

    // onDeposit
    infinitechain.event.onDeposit((err, result) => {
      console.log('Deposit:');
      console.log(result);
    });
  } else {
    console.log('This booster do not support any token.');
  }
}).catch((err) => {
  console.log(err);
});
