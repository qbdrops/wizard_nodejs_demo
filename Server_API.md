# Server API
Total api amount: 1

## Send light transaction
Send a signed light transaction and get a receipt.

**URL** : `/pay`

**Method** : `POST`

**Auth required** : NO

**Permissions required** : NO

**Data constraints** : Data type is required to be json format.

```json
lightTx = {
    lightTxHash: "lightTxHash",
    lightTxData: {
        from: "address",
        to: "address",
        assetID: "assetID",
        value: "value",
        fee: "fee",
        nonce: "random number",
        logID: "DSN / WSN / 0",
        ClientMetadataHash: "string"
    },
    sig: {
        clientLightTx: {
            v: "v",
            r: "r",
            s: "s"
        },
    },
    metadata: {
    	client:"string"
    }
}
```

**Data example** All fields must be sent.

```json
LightTransaction {
 lightTxData: 
  { from: '000000000000000000000000e422277c7333020f8dd254b7e8bdfb63c83465be',
   to: '00000000000000000000000073be87dbd6c7657781be880690d01180255b49d6',
   assetID: '0000000000000000000000000000000000000000000000000000000000000000',
   value: '000000000000000000000000000000000000000000000000000051dac2079fff',
   fee: '000000000000000000000000000000000000000000000000000009184e72a000',
   nonce: 'cd417c1efa288ab071d08afc53597f9c26b379d7cd9818fea04ca87a36b11813',
   logID: '0000000000000000000000000000000000000000000000000000000000000000',
   clientMetadataHash: '84d414da05f8d746a6f31c26d68329af947ae2e07ccfb8814ad5092cd739a71f' },
 sig: 
  { clientLightTx: 
   { r: '0x78e15931bd07b88e721d6614ed6db31dd0af8a05c8f1b4ab0092ee47180d0800',
    s: '0x62e06113c0896f1287f1297b6772e11f39fa2f248a86ab71bd37d4d813f60203',
    v: '0x000000000000000000000000000000000000000000000000000000000000001b' },
 lightTxHash: '41c7611d6a96b1fb519b8c7ada6a7e1d179fa8aca52a5a5ef6fdc24dbe9455da',
 metadata: { client: '1111'},
```

### Success Response

**Condition** : Everything is OK.

**Content example**

```json
{
    "result": true
}
```

### Error Responses

**Condition** : Other errors.

**Code** : `500`

**Content example**

```json
{
    errors: ""
}
```