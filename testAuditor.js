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

let txNumber = 100;
let keys = ['41b1a0649752af1b28b3dc29a1556eee781e4a4c3a1f7f53f90fa834de098c41', '41b1a0649752af1b28b3dc29a1556eee781e4a4c3a1f7f53f90fa834de098c42', '41b1a0649752af1b28b3dc29a1556eee781e4a4c3a1f7f53f90fa834de098c43', '41b1a0649752af1b28b3dc29a1556eee781e4a4c3a1f7f53f90fa834de098c44', '41b1a0649752af1b28b3dc29a1556eee781e4a4c3a1f7f53f90fa834de098c45'];
let chains = keys.map(key => {
  return new InfinitechainBuilder()
    .setNodeUrl(env.nodeUrl)
    .setWeb3Url(env.web3Url)
    .setSignerKey(key)
    .setStorage('memory')
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

function getRandomPair (chains, addressPool) {
  let from = random(chains);
  let to = random(addressPool);
  if (from.signer.getAddress() == to) {
    return getRandomPair(chains, addressPool);
  } else {
    return [from, to];
  }
}

infinitechain.initialize().then(async () => {
  // Remittance
  for (let i = 0; i < 5; i++) {
    try{
      await remittance(infinitechain, addressPool[i], 100);
    } catch (e) {
      console.log(e);
    }
  }

  for (let i = 0; i < txNumber; i++) {
    try{
      let [from, to] = getRandomPair(chains, addressPool);
      await remittance(from, to, 1);
    } catch (e) {
      console.log(e);
    }
  }
});

let remittance = async (chain, to, value) => {
  let remittanceData = {
    from: chain.signer.getAddress(),
    to: to,
    assetID: 1,
    value: value,
    fee: 0.002
  };
  try {
    let lightTx = await chain.client.makeLightTx(Types.remittance, remittanceData);
    await axios.post(url, lightTx.toJson());
  } catch(e) {
    console.log(e);
  }
};
console.log(addressPool);
