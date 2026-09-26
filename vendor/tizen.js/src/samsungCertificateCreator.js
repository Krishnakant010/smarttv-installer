const forge = require('node-forge');
const fetch = require('node-fetch');
const { join, basename } = require('path');
const JSZip = require('jszip');
const FormData = require('form-data');
const { readFileSync, mkdirSync, writeFileSync, existsSync } = require('fs');
const { DOMParser } = require('@xmldom/xmldom');
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


/**
 * @typedef {Object} AccessInfo
 * @property {string} accessToken - The access token for the Samsung account
 * @property {string} userId - The user ID for the Samsung account
 */

class SamsungCertificateCreator {
    constructor() { }

    async _downloadVDCertificates() {
        if (existsSync(join(homedir(), 'share/.samsung-cert'))) return;

        let buffer;
        try {
            const extensionInfoReq = await fetch('https://download.tizen.org/sdk/tizenstudio/official/extension_info.xml');
            const extensionInfo = await extensionInfoReq.text();
            const parser = new DOMParser().parseFromString(extensionInfo, 'text/xml').firstChild;

            const extensions = parser.getElementsByTagName('extension');
            for (const extension of Array.from(extensions)) {
                const name = extension.getElementsByTagName('name')[0].textContent.trim();
                if (name === 'Samsung Certificate Extension') {
                    const repository = extension.getElementsByTagName('repository')[0].textContent.trim();
                    const response = await fetch(repository);
                    if (response.ok) {
                        buffer = await response.buffer();
                        break;
                    } else {
                        throw new Error('Failed to download Samsung Certificate Extension: ' + response.statusText);
                    }
                }
            }
        } catch (error) {
            console.error('Error downloading Samsung Certificate Extension:', error, 'Will try downloading manually');
        }

        if (!buffer) {
            const response = await fetch('https://download.tizen.org/sdk/extensions/tizen-certificate-extension_2.0.70.zip');
            if (response.ok) {
                buffer = await response.buffer();
            } else {
                throw new Error('Failed to download Samsung Certificate Extension: ' + response.statusText);
            }
        }

        const zip = await JSZip.loadAsync(buffer);

        const addonFileName = Object.keys(zip.files).find(name => name.endsWith('.zip'));
        const addonFileBuffer = await zip.files[addonFileName].async('nodebuffer');
        const addonFileZip = await JSZip.loadAsync(addonFileBuffer);

        const jarFileName = Object.keys(addonFileZip.files).find(name => name.endsWith('.jar'));
        const jarFileBuffer = await addonFileZip.files[jarFileName].async('nodebuffer');
        const jarZip = await JSZip.loadAsync(jarFileBuffer);

        mkdirSync(`${homedir()}/share/.samsung-cert`, { recursive: true });

        for (const fileName of Object.keys(jarZip.files)) {
            if (fileName.endsWith('.crt') || fileName.endsWith('.cer')) {
                const filePath = join(homedir(), 'share/.samsung-cert', basename(fileName));
                const content = await jarZip.files[fileName].async('nodebuffer');
                writeFileSync(filePath, content);
            }
        }
    }

    /**
     * Generates a certificate for the author.
     * @param {AuthorInfo} authorInfo 
     */

    _generateAuthorCert(authorInfo) {
        const key = forge.pki.rsa.generateKeyPair(2048);
        const csr = forge.pki.createCertificationRequest();
        csr.publicKey = key.publicKey;
        csr.setSubject([
            {
                name: 'commonName',
                value: authorInfo.name
            }
        ]);

        const privateKey = forge.pki.privateKeyToPem(key.privateKey);

        csr.sign(key.privateKey, forge.md.sha512.create());
        const csrPem = forge.pki.certificationRequestToPem(csr);

        return {
            csr: csrPem,
            privateKey: privateKey
        };
    }

    /**
     * Generates a distributor certificate.
     * @param {AuthorInfo} authorInfo 
     * @param {Array<string>} duidList 
     */

    _generateDistributorCert(authorInfo, duidList) {
        const key = forge.pki.rsa.generateKeyPair(2048);
        const csr = forge.pki.createCertificationRequest();
        csr.publicKey = key.publicKey;

        csr.setSubject([
            {
                name: 'commonName',
                value: 'TizenSDK'
            },
            {
                name: 'emailAddress',
                value: authorInfo.email
            }
        ]);

        const subjectAltNames = [];

        subjectAltNames.push({
            type: 6,
            value: 'URN:tizen:packageid='
        });

        for (const duid of duidList) {
            subjectAltNames.push({
                type: 6,
                value: `URN:tizen:deviceid=${duid}`
            });
        }

        csr.setAttributes([
            {
                name: 'extensionRequest',
                extensions: [{
                    name: 'subjectAltName',
                    altNames: subjectAltNames
                }]
            }
        ]);

        const privateKey = forge.pki.privateKeyToPem(key.privateKey);

        csr.sign(key.privateKey, forge.md.sha512.create());
        const csrPem = forge.pki.certificationRequestToPem(csr);

        return {
            csr: csrPem,
            privateKey: privateKey
        };
    }

    /**
     * 
     * @param {AccessInfo} accessInfo 
     * @param {Object} authorCert 
     * @returns {Promise<string>}
     */

    async _fetchAuthorCert(accessInfo, authorCert) {
        const formData = new FormData();
        formData.append('access_token', accessInfo.accessToken);
        formData.append('user_id', accessInfo.userId);
        formData.append('platform', 'VD');
        formData.append('csr', authorCert.csr, {
            contentType: 'application/octet-stream',
            filename: 'author.csr'
        });
        const request = await fetch('https://svdca.samsungqbe.com/apis/v3/authors', {
            method: 'POST',
            headers: formData.getHeaders(),
            body: formData
        });

        if (request.ok) {
            const text = await request.text();
            return text;
        } else {
            throw new Error('Failed to fetch author certificate\n' + await request.text());
        }
    }

    /**
     * 
     * @param {AccessInfo} accessInfo 
     * @param {AuthorInfo} authorInfo
     * @param {Object} distributorCert 
     * @returns {Promise<string>}
     */

    async _fetchDistributorCert(accessInfo, authorInfo, distributorCert) {
        const formData = new FormData();
        formData.append('access_token', accessInfo.accessToken);
        formData.append('user_id', accessInfo.userId);
        formData.append('platform', 'VD');
        formData.append('privilege_level', authorInfo.privilegeLevel);
        formData.append('developer_type', 'Individual');
        formData.append('csr', distributorCert.csr, {
            contentType: 'application/octet-stream',
            filename: 'distributor.csr'
        });

        const request = await fetch('https://svdca.samsungqbe.com/apis/v3/distributors', {
            method: 'POST',
            headers: formData.getHeaders(),
            body: formData
        });

        if (request.ok) {
            const text = await request.text();
            return text;
        } else {
            throw new Error('Failed to fetch distributor certificate\n' + await request.text());
        }
    }

    _generateAuthorPKCS12(authorCert, vdAuthorCert, authorInfo) {
        const vdTizenAuthorCer = readFileSync(join(homedir(), 'share/.samsung-cert', 'vd_tizen_dev_author_ca.cer'), 'utf-8');
        const privateKey = forge.pki.privateKeyFromPem(authorCert.privateKey);

        const authorCertArray = [vdAuthorCert, vdTizenAuthorCer];

        const pkcs12Cert = forge.pkcs12.toPkcs12Asn1(privateKey, authorCertArray, authorInfo.password, {
            generateLocalKeyId: true,
            friendlyName: 'UserCertificate'
        })

        const pkcs12Der = forge.asn1.toDer(pkcs12Cert).getBytes();
        return pkcs12Der;
    }

    _generateDistributorPKCS12(distributorCert, vdDistributorCert, authorInfo) {
        const vdTizenPrivilegeCer = authorInfo.privilegeLevel === 'Public' ?
            readFileSync(join(homedir(), 'share/.samsung-cert', 'vd_tizen_dev_public2.crt'), 'utf-8') :
            readFileSync(join(homedir(), 'share/.samsung-cert', 'vd_tizen_dev_partner2.crt'), 'utf-8');

        const privateKey = forge.pki.privateKeyFromPem(distributorCert.privateKey);
        const distributorCertArray = [vdDistributorCert, vdTizenPrivilegeCer];

        const pkcs12Cert = forge.pkcs12.toPkcs12Asn1(privateKey, distributorCertArray, authorInfo.password, {
            generateLocalKeyId: true,
            friendlyName: 'UserCertificate'
        })

        const pkcs12Der = forge.asn1.toDer(pkcs12Cert).getBytes();
        return pkcs12Der;
    }

    /**
     * Creates a new Samsung certificate.
     * @param {AuthorInfo} authorInfo 
     * @param {AccessInfo} accessInfo 
     * @param {Array<string>} duidList 
     * @returns {Promise<Object>}
     */

    async createCertificate(authorInfo, accessInfo, duidList) {
        await this._downloadVDCertificates();
        const authorCert = this._generateAuthorCert(authorInfo);
        const distributorCert = this._generateDistributorCert(authorInfo, duidList);
        const authorCertVD = await this._fetchAuthorCert(accessInfo, authorCert);
        const distributorXMLVD = await this._fetchDistributorCert(accessInfo, authorInfo, distributorCert);
        const distributorCertVD = await this._fetchDistributorCert(accessInfo, authorInfo, distributorCert);
        const vdAuthorCert = await this._generateAuthorPKCS12(authorCert, authorCertVD, authorInfo);
        const vdDistributorCert = await this._generateDistributorPKCS12(distributorCert, distributorCertVD, authorInfo);

        return {
            authorCert: vdAuthorCert,
            distributorCert: vdDistributorCert,
            distributorXML: distributorXMLVD
        }
    }
}

module.exports = SamsungCertificateCreator;