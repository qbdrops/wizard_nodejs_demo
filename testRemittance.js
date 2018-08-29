let wizard = require('wizard_nodejs');
let env = require('./env');
let axios = require('axios');
let Web3 = require('web3');
let web3 = new Web3(env.web3Url);
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

let getRandomPair = async (chains, addressPool) => {
  let from = random(chains);
  let to = random(addressPool);
  if (from.signer.getAddress() == to) {
    return await getRandomPair(chains, addressPool);
  } else {
    return [from, to];
  }
};

infinitechain.initialize().then(async () => {
  // Remittance
  for (let i = 0; i < 5; i++) {
    try{
      await remittance(infinitechain, addressPool[i], 0.01);
    } catch (e) {
      console.log(e);
    }
  }

  for (let i = 0; i < txNumber; i++) {
    try{
      let [from, to] = await getRandomPair(chains, addressPool);
      console.log(await remittance(from, to, 0.01 / txNumber));
    } catch (e) {
      console.log(e);
    }
  }
  console.log('Produce ' + txNumber + ' transactions.');
});

let remittance = async (chain, to, value) => {
  let remittanceData = {
    from: chain.signer.getAddress(),
    to: to,
    assetID: '0',
    value: value,
    fee: 0.002
  };
  let metadata = {
    client:'11111'
  };
  try {
    let lightTx = await chain.client.makeLightTx(Types.remittance, remittanceData, metadata);
    await axios.post(url, lightTx.toJson());
    return lightTx.lightTxHash;
  } catch(e) {
    console.log(e);
  }
};
// console.log(addressPool);
