var level = require('level');
var db = level('./db');
var IFCBuilder = require('infinitechain_nodejs');
var axios = require('axios');
let env = require('./env');

var ifc = new IFCBuilder().setNodeUrl(env.nodeUrl).
                           setWeb3Url(env.web3Url).
                           setSignerKey(env.signerKey).
                           setCipherKey(env.cipherKey).
                           setStorage('memory').
                           setClientAddress('0x49aabbbe9141fe7a80804bdf01473e250a3414cb').
                           setServerAddress('0x5b9688b5719f608f1cb20fdc59626e717fbeaa9a').
                           build();

var pkClient = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApFTF001PG7etLof0Oi8L\nYll3NApmlEw3Zz9zaitDbSAOcDv6L0yfpK4Kgg7Be/llQeaHAWifNnrewFhzKeid\nUZ9rZVZwZoOmbo7OaGdq+z+7VJxmkiJtZ6mD9BWxtjEVFQ3VByqmUc5v/8o7BaKh\nFGaxGMgmH8mwlPFJTXsVRRMb7Mdxp7PC4vkdUH2jorqmOreWEOMIbhVjHQAcVXIs\nseO1r1c2/4ZQIU3ofZMl8o6t4ldJRb9Y7y1xB7J4Egd4ClKCFoM9nQD7oCCN2ADW\nqkTDO91W0jVvx8OfUTEJlM+JiHODIYV8Oq+6sQJUe7rr/t9W7mp0I5UnaOo9HzoO\ncQIDAQAB\n-----END PUBLIC KEY-----';
var pkStakeholder = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApFTF001PG7etLof0Oi8L\nYll3NApmlEw3Zz9zaitDbSAOcDv6L0yfpK4Kgg7Be/llQeaHAWifNnrewFhzKeid\nUZ9rZVZwZoOmbo7OaGdq+z+7VJxmkiJtZ6mD9BWxtjEVFQ3VByqmUc5v/8o7BaKh\nFGaxGMgmH8mwlPFJTXsVRRMb7Mdxp7PC4vkdUH2jorqmOreWEOMIbhVjHQAcVXIs\nseO1r1c2/4ZQIU3ofZMl8o6t4ldJRb9Y7y1xB7J4Egd4ClKCFoM9nQD7oCCN2ADW\nqkTDO91W0jVvx8OfUTEJlM+JiHODIYV8Oq+6sQJUe7rr/t9W7mp0I5UnaOo9HzoO\ncQIDAQAB\n-----END PUBLIC KEY-----';
var quotes = [{ company: "Analog Devices, Inc." , value: "91.88"}, 
              { company: "Altair Engineering Inc." , value: "26.60"}, 
              { company: "Applied Materials, Inc.", value:  "53.63"}];

let count = 0
let intervalID = setInterval(async () => {
    count++;
    var ran = Math.random();
    var min = 1, max = 999;
    var _value = Math.floor(ran * (max - min + 1) + min) % 3;
    var rawPayment = ifc.client.makeRawPayment(quotes[_value].value, count, { pkClient: pkClient, pkStakeholder: pkStakeholder });
    await ifc.client.saveRawPayment(rawPayment);
    let res = await axios.post('http://localhost:3001/send', { rawPayment: rawPayment });

    if (res.data.ok) {
        let payment = res.data.payment;
        let result = await ifc.client.verifyPayment(payment);
        if (result) {
            ifc.client.savePayment(payment);
        }
    } else {
        console.log(res.data.message);
    }
}, 2000);

let watchBlockchainEvent = () => {
    if (ifc.sidechain.getIFCContract()) {
        ifc.event.watchAddNewStage(async (err, result) => {
            if (err) {
                console.log(err);
            } else {
                try {
                    console.log("Add new stage event")

                    let stageHash = result.args._stageHash;
                    let rootHash = result.args._rootHash;
                    console.log('stageHash: ' + stageHash);
                    console.log('rootHash: ' + rootHash);

                    // Audit
                    stageHash = stageHash.substring(2);
                    let paymentHashes = await ifc.client.getAllPaymentHashes(stageHash);
                    paymentHashes.forEach(async (hash) => {
                        let res = await ifc.client.audit(hash);
                        console.log('Audit result: ' + hash + ', ' + res);
                    });
                } catch (e) {
                    console.log(e);
                }
            }
        });

        ifc.event.watchFinalize((err, result) => {
            if (err) {
                console.log(err);
            } else {
                console.log("Finalize event")
            }
        });
    } else {
        setTimeout(watchBlockchainEvent, 1000);
    }
}

watchBlockchainEvent();
