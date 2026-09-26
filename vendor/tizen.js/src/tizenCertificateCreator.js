const forge = require('node-forge');
const fetch = require('node-fetch');
const { join } = require('path');
const JSZip = require('jszip');
const { readFileSync, mkdirSync, writeFileSync, existsSync } = require('fs');
const { homedir } = require('os');

/**
 * @typedef {Object} AuthorInfo
 * @property {string} name - The name of the author
 * @property {string} email - The email of the author
 * @property {string} password - The password of the author certificate
 * @property {string} country - The country of the author
 * @property {string} state - The state of the author
 * @property {string} city - The city of the author
 * @property {string} organization - The organization of the author
 * @property {string} department - The department of the author
 * @property {string} privilegeLevel - The privilege level of the distributor certificate
 */

class TizenCertificateCreator {
    constructor() { }

    async _downloadTizenCertificates() {
        if (existsSync(join(homedir(), 'share/.tizen-cert'))) return;

        let buffer;
        const response = await fetch('https://download.tizen.org/sdk/tizenstudio/official/binary/certificate-generator_0.1.4_ubuntu-64.zip');
        if (response.ok) {
            buffer = await response.buffer();
        } else {
            throw new Error('Failed to download Certificate Generator for certificates: ' + response.statusText);
        }


        const zip = await JSZip.loadAsync(buffer);

        mkdirSync(`${homedir()}/share/.tizen-cert`, { recursive: true });

        for (const fileName of Object.keys(zip.files)) {
            if (fileName.includes('data/tools/certificate-generator/certificates') && !fileName.endsWith('/')) {
                const filePath = join(homedir(), 'share/.tizen-cert', fileName.replace('data/tools/certificate-generator/certificates/', ''));
                mkdirSync(join(filePath, '..'), { recursive: true });
                const content = await zip.files[fileName].async('nodebuffer');
                writeFileSync(filePath, content);
            }
        }
    }

    /**
     * Generates a certificate for the author.
     * @param {AuthorInfo} authorInfo 
     */

    _generateAuthorCert(authorInfo) {
        const key = forge.pki.rsa.generateKeyPair(1024);
        const cert = forge.pki.createCertificate();

        cert.publicKey = key.publicKey;
        cert.serialNumber = '01';
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        const subject = [
            {
                name: 'commonName',
                value: authorInfo.name
            },
            authorInfo.country ? {
                name: 'countryName',
                value: authorInfo.country
            } : null,
            authorInfo.state ? {
                shortName: 'ST',
                value: authorInfo.state
            } : null,
            authorInfo.city ? {
                name: 'localityName',
                value: authorInfo.city
            } : null,
            authorInfo.organization ? {
                name: 'organizationName',
                value: authorInfo.organization
            } : null,
            authorInfo.department ? {
                shortName: 'OU',
                value: authorInfo.department
            } : null,
            authorInfo.email ? {
                name: 'emailAddress',
                value: authorInfo.email
            } : null
        ];

        cert.setSubject(subject.filter(Boolean));

        cert.setIssuer(
            [
                {
                    name: 'organizationName',
                    value: 'Tizen Association'
                },
                {
                    shortName: 'OU',
                    value: 'Tizen Association'
                },
                {
                    shortName: 'CN',
                    value: 'Tizen Developers CA'
                }
            ]
        );

        cert.setExtensions(
            [
                {
                    name: 'basicConstraints',
                    cA: true
                },
                {
                    name: 'keyUsage',
                    keyCertSign: true,
                    digitalSignature: true,
                    nonRepudiation: true,
                    keyEncipherment: true,
                    dataEncipherment: true
                },
                {
                    name: 'extKeyUsage',
                    codeSigning: true
                }
            ]
        );

        const developerPrivateKeyFile = readFileSync(join(homedir(), 'share/.tizen-cert/developer/tizen-developer-ca-privatekey.pem'), 'utf-8');
        const developerPrivateKey = forge.pki.decryptRsaPrivateKey(developerPrivateKeyFile, 'tizencertificatefordevelopercaroqkfwk');

        cert.sign(developerPrivateKey, forge.md.sha512.create());

        const certPem = forge.pki.certificateToPem(cert);
        const developerCa = readFileSync(join(homedir(), 'share/.tizen-cert/developer/tizen-developer-ca.cer'), 'utf-8');

        const pkcs12 = forge.pkcs12.toPkcs12Asn1(developerPrivateKey, [certPem, developerCa], authorInfo.password, {
            generateLocalKeyId: true,
            friendlyName: 'UserCertificate'
        });

        const pkcs12Der = forge.asn1.toDer(pkcs12).getBytes();

        return pkcs12Der;
    }

    /**
     * Creates a new Tizen certificate.
     * @param {AuthorInfo} authorInfo 
     * @returns {Promise<string>}
     */

    async createCertificate(authorInfo) {
        await this._downloadTizenCertificates();
        return this._generateAuthorCert(authorInfo);
    }
}

module.exports = TizenCertificateCreator;