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
  .setStorage('level', db)
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
  console.time('Produce ' + txNumber + ' transactions.');
  // Remittance
  for (let i = 0; i < 5; i++) {
    try {
      await remittance(infinitechain, addressPool[i], '0.01');
    } catch (e) {
      console.log(e);
    }
  }

  for (let i = 0; i < txNumber; i++) {
    let value = 0.009 / txNumber;
    try {
      let [from, to] = await getRandomPair(chains, addressPool);
      console.log(await remittance(from, to, value.toString()));
    } catch (e) {
      console.log(e);
    }
  }
  console.timeEnd('Produce ' + txNumber + ' transactions.');
});

let remittance = async (chain, to, value) => {
  if (value.toString().length > 20) {
    value = value.toString().slice(0, 20);
  }
  let fee = 0.001 / txNumber;
  if (fee.toString().length > 20) {
    fee = fee.toString().slice(0, 20);
  }
  let remittanceData = {
    from: chain.signer.getAddress(),
    to: to,
    assetID: '0',
    value: value,
    fee: fee.toString()
  };
  let metadata = {
    client: '11111',
    server: '22222'
  };
  try {
    let lightTx = await chain.client.makeLightTx(Types.remittance, remittanceData, metadata);
    let res = await axios.post(url, lightTx.toJson());
    let receipt = new Receipt(res.data);
    await infinitechain.client.saveReceipt(receipt);
    return receipt.lightTxHash;
  } catch(e) {
    console.log(e);
  }
};
