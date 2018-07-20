let wizard = require('wizard_nodejs');
let env = require('./env');
let axios = require('axios');
let InfinitechainBuilder = wizard.InfinitechainBuilder;
let Types = wizard.Types;
let url = 'http://127.0.0.1:3001/pay';
let infinitechain = new InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('memory')
  .build();

infinitechain.initialize().then(async () => {
  console.log('Wait attach......');
  infinitechain.event.onAttach((err, result) => {
    console.log('Attach:');
    console.log(result);
    console.log('Start audit.');
    let stageHeight = infinitechain.contract.booster().stageHeight().toNumber();
    infinitechain.auditor.audit(stageHeight).then(a => console.log(a));
  });
});