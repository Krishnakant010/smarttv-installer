# tizen.js

Rebuild, resign, and package Tizen applications without Tizen Studio

## Installation

`npm i github:reisxd/tizen.js`

## CLI Usage

```sh
tizenjs help
```

## API Usage

### Creating a Tizen Certificate

```js
const { TizenCertificateCreator } = require('tizen');

const creator = new TizenCertificateCreator();

const authorInfo = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'securepassword',
    country: 'USA',
    state: 'California',
    city: 'Los Angeles',
    organization: 'Example Corp',
    department: 'Engineering',
    privilegeLevel: 'public' // can be 'public' or 'partner' or 'platform'
};

const cert = await creator.createCertificate(authorInfo);
// cert contains PKCS#12 binary data
```

### Creating a Samsung Certificate

```js
const { SamsungCertificateCreator } = require('tizen');

const creator = new SamsungCertificateCreator();

const authorInfo = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'securepassword',
    privilegeLevel: 'Public' // can be 'Public' or 'Partner'
};

// Fetch these from https://account.samsung.com/accounts/TDC/signInGate?clientId=v285zxnl3h&tokenType=TOKEN
const accessInfo = {
    accessToken: 'your_access_token',
    userId: 'your_user_id'
};

// You can get it from your TV by running `sdb shell 0 getduid`
const duidList = ['...'];

const cert = await creator.createCertificate(authorInfo, accessInfo, duidList);
/**
 * {
 *  authorCert: '...', // PKCS#12 binary data
 *  distributorCert: '...' // PKCS#12 binary data,
 *  distributorXML: '...' // device profile XML that must be pushed to /home/owner/share/tmp/sdk_tools/device-profile.xml
 * }
 */
```

### Resigning a project

```js
const { Signature } = require('tizen');
const JSZip = require('jszip');
const forge = require('node-forge');
/**
 * {
 *  uri: 'file_name_with_path', // URI encoded file name and path
 *  data: Buffer() // file data
 * }
 **/

const files = [{...}];

const authorCert = forge.pkcs12.pkcs12FromAsn1(der, false, password);
const distributorCert = forge.pkcs12.pkcs12FromAsn1(der, false, password);

const authorSignature = new Signature('AuthorSignature', files);
const authorFiles = await authorSignature.sign(authorCert);

const distributorSignature = new Signature('DistributorSignature', files);
const distributorFiles = await distributorSignature.sign(distributorCert);

const newZip = new JSZip();

distributorFiles.forEach(file => {
    newZip.file(decodeURIComponent(file.uri), file.data);
});

const zipData = await newZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

// You can save zipData to a file and use it
```