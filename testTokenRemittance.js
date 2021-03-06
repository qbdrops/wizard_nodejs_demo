let wizard = require('wizard_nodejs');
let level = require('level');
let env = require('./env');
let axios = require('axios');

let db = level('./db', { valueEncoding: 'json' });
let InfinitechainBuilder = wizard.InfinitechainBuilder;
let Receipt = wizard.Receipt;
let Types = wizard.Types;
let url = 'http://127.0.0.1:3001/pay';
let infinitechain = new InfinitechainBuilder()
  .setNodeUrl(env.nodeUrl)
  .setWeb3Url(env.web3Url)
  .setSignerKey(env.signerKey)
  .setStorage('memory')
  .build();

let txNumber = 100;
let keys = ['41b1a0649752af1b28b3dc29a1556eee781e4a4c3a1f7f53f90fa834de098c41', '41b1a0649752af1b28b3dc29a1556eee781e4a4c3a1f7f53f90fa834de098c42', '41b1a0649752af1b28b3dc29a1556eee781e4a4c3a1f7f53f90fa834de098c43', '41b1a0649752af1b28b3dc29a1556eee781e4a4c3a1f7f53f90fa834de098c44', '41b1a0649752af1b28b3dc29a1556eee781e4a4c3a1f7f53f90fa834de098c45'];
let chains = keys.map(key => {
  return new InfinitechainBuilder()
    .setNodeUrl(env.nodeUrl)
    .setWeb3Url(env.web3Url)
    .setSignerKey(key)
    .setStorage('level', db)
    .build();
});
chains.forEach(chain => {
  chain.initialize();
});
let addressPool = chains.map(chain => chain.signer.getAddress());
function random (pool) {
  let i = parseInt(Math.random() * 10000 % 5);
  return pool[i];
}

let getRandomPair = async (chains, addressPool) => {
  let from = random(chains);
  let to = random(addressPool);
  if (from.signer.getAddress() == to) {
    return await getRandomPair(chains, addressPool);
  } else {
    return [from, to];
  }
};
let assetList = [];
infinitechain.initialize().then(async () => {
  assetList = await infinitechain.gringotts.getAssetList();
  if (assetList.length > 1) {
    console.time('Produce ' + txNumber + ' transactions.');
    let val = txNumber * 2;
    // Remittance
    for (let i = 0; i < 5; i++) {
      try {
        await remittance(infinitechain, addressPool[i], val.toString());
      } catch (e) {
        console.log(e);
      }
    }

    for (let i = 0; i < txNumber; i++) {
      try {
        let [from, to] = await getRandomPair(chains, addressPool);
        console.log(await remittance(from, to, '1'));
      } catch (e) {
        console.log(e);
      }
    }
    console.timeEnd('Produce ' + txNumber + ' transactions.');
  } else {
    console.log('This booster do not support any token.');
  }
});

let remittance = async (chain, to, value) => {
  let assetAddress = assetList[1].asset_address;
  let asset = assetAddress;
  let remittanceData = {
    from: chain.signer.getAddress(),
    to: to,
    assetID: asset,
    value: value,
    fee: '1'
  };
  try {
    let lightTx = await chain.client.makeLightTx(Types.remittance, remittanceData);
    let res = await axios.post(url, lightTx.toJson());
    let receipt = new Receipt(res.data);
    await infinitechain.client.saveReceipt(receipt);
    return receipt.lightTxHash;
  } catch(e) {
    console.log(e);
  }
};
