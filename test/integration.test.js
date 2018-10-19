let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('../env');
let axios = require('axios');
let Web3 = require('web3');

let db = level('./db', { valueEncoding: 'json' });
let Receipt = wizard.Receipt;

let url = 'http://127.0.0.1:3001/pay';
let web3 = new Web3(env.web3Url);
let infinitechain = new wizard.InfinitechainBuilder() 
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('level', db)
  .build(); 

beforeAll(async () => {
  // infinitechain
  //   .setNodeUrl(env.nodeUrl)
  //   .setWeb3Url(env.web3Url)
  //   .setSignerKey(env.signerKey)
  //   .setStorage('level', db)
  //   .build();
  
});

describe('Bolt integration test', () => {
  test('should propose deposit', async () => {
    await infinitechain.initialize();
    let from = '0x' + await infinitechain.signer.getAddress();
    let to = await infinitechain.contract.booster().options.address;
    let value = await web3.utils.toHex(web3.utils.toWei('10000', 'ether'));
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
    //test
    let depositReceiptJson = response.data;
    // expect to be true
    let depositReceipt = new Receipt(depositReceiptJson);

    await infinitechain.client.saveReceipt(depositReceipt);

  });
});
