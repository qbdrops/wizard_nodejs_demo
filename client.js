var level = require('level');
var db = level('./db');
var IFCBuilder = require('infinitechain_nodejs');
var axios = require('axios');

var ifc = new IFCBuilder().setNodeUrl("http://dev.infinitechain.io:3000").
                           setWeb3Url("http://dev.infinitechain.io:8545").
                           setDB(db).
                           setClientAddress('0x49aabbbe9141fe7a80804bdf01473e250a3414cb').
                           setServerAddress('0x5b9688b5719f608f1cb20fdc59626e717fbeaa9a').
                           build();

var pkClient = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApFTF001PG7etLof0Oi8L\nYll3NApmlEw3Zz9zaitDbSAOcDv6L0yfpK4Kgg7Be/llQeaHAWifNnrewFhzKeid\nUZ9rZVZwZoOmbo7OaGdq+z+7VJxmkiJtZ6mD9BWxtjEVFQ3VByqmUc5v/8o7BaKh\nFGaxGMgmH8mwlPFJTXsVRRMb7Mdxp7PC4vkdUH2jorqmOreWEOMIbhVjHQAcVXIs\nseO1r1c2/4ZQIU3ofZMl8o6t4ldJRb9Y7y1xB7J4Egd4ClKCFoM9nQD7oCCN2ADW\nqkTDO91W0jVvx8OfUTEJlM+JiHODIYV8Oq+6sQJUe7rr/t9W7mp0I5UnaOo9HzoO\ncQIDAQAB\n-----END PUBLIC KEY-----';
var pkStakeholder = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApFTF001PG7etLof0Oi8L\nYll3NApmlEw3Zz9zaitDbSAOcDv6L0yfpK4Kgg7Be/llQeaHAWifNnrewFhzKeid\nUZ9rZVZwZoOmbo7OaGdq+z+7VJxmkiJtZ6mD9BWxtjEVFQ3VByqmUc5v/8o7BaKh\nFGaxGMgmH8mwlPFJTXsVRRMb7Mdxp7PC4vkdUH2jorqmOreWEOMIbhVjHQAcVXIs\nseO1r1c2/4ZQIU3ofZMl8o6t4ldJRb9Y7y1xB7J4Egd4ClKCFoM9nQD7oCCN2ADW\nqkTDO91W0jVvx8OfUTEJlM+JiHODIYV8Oq+6sQJUe7rr/t9W7mp0I5UnaOo9HzoO\ncQIDAQAB\n-----END PUBLIC KEY-----';
var quotes = [{ company: "Analog Devices, Inc." , value: "91.88"}, 
              { company: "Altair Engineering Inc." , value: "26.60"}, 
              { company: "Applied Materials, Inc.", value:  "53.63"}];

setInterval(function () {
    var ran = Math.random();
    var min = 1, max = 999;
    var _value = Math.floor(ran * (max - min + 1) + min) % 3;
    var rawPayment = ifc.client.makeRawPayment(quotes[_value].value, { pkClient: pkClient, pkStakeholder: pkStakeholder });
    axios.post('http://localhost:3001/send', { rawPayment: rawPayment }).then(function (res) {
        let payment = res.data.payment
        ifc.client.savePayment(payment).then(function () {
            var paymentHash = payment.paymentHash;
            ifc.client.getPayment(paymentHash).then(console.log);
        });
    });
}, 1000);

console.log(ifc.sidechain.getIFCContract());

var watchBlockchainEvent = function () {
    if (ifc.sidechain.getIFCContract()) {
        ifc.event.watchAddNewStage((err, result) => {
            if (err) {
                console.log(err);
            } else {
                console.log("Add new stage event")
                let stageHash = result.args._stageHash;
                let rootHash = result.args._rootHash;
                console.log(stageHash, rootHash);
            }
        });
    } else {
        setTimeout(watchBlockchainEvent, 1000);
    }
}

watchBlockchainEvent();
