import forge from 'node-forge';
import JSZip from 'jszip';
import {DOMParser} from '@xmldom/xmldom';
import {Buffer} from 'buffer';

export interface TizenPackageMeta {
  appId: string;
  packageId: string;
  appName: string;
  version: string;
}

export interface CertPair {
  authorCertPem: string;
  authorKeyPem: string;
  distributorCertPem: string;
  distributorKeyPem: string;
}

export function generateRsaKeyPair(): {publicKey: string; privateKey: string} {
  const keypair = forge.pki.rsa.generateKeyPair({bits: 2048, workers: -1});
  return {
    publicKey: forge.pki.publicKeyToPem(keypair.publicKey),
    privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
  };
}

export function createAuthorCertificate(keys: {publicKey: string; privateKey: string}): string {
  const pki = forge.pki;
  const cert = pki.createCertificate();
  cert.publicKey = pki.publicKeyFromPem(keys.publicKey);
  cert.serialNumber = '01' + Math.floor(Math.random() * 1e16).toString(16);

  const notBefore = new Date();
  const notAfter = new Date();
  notAfter.setFullYear(notBefore.getFullYear() + 10);
  cert.validity.notBefore = notBefore;
  cert.validity.notAfter = notAfter;

  const attrs = [
    {name: 'commonName', value: 'SmartTV Developer'},
    {name: 'countryName', value: 'IN'},
    {name: 'organizationName', value: 'SmartTV Sideload Installer'},
    {shortName: 'OU', value: 'Developer Team'},
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  cert.sign(pki.privateKeyFromPem(keys.privateKey), forge.md.sha256.create());
  return pki.certificateToPem(cert);
}

export function createDistributorCertificate(
  keys: {publicKey: string; privateKey: string},
  duid: string
): string {
  const pki = forge.pki;
  const cert = pki.createCertificate();
  cert.publicKey = pki.publicKeyFromPem(keys.publicKey);
  cert.serialNumber = '02' + Math.floor(Math.random() * 1e16).toString(16);

  const notBefore = new Date();
  const notAfter = new Date();
  notAfter.setFullYear(notBefore.getFullYear() + 10);
  cert.validity.notBefore = notBefore;
  cert.validity.notAfter = notAfter;

  const attrs = [
    {name: 'commonName', value: `Samsung-Distributor-${duid.substring(0, 8)}`},
    {name: 'countryName', value: 'KR'},
    {name: 'organizationName', value: 'Samsung Electronics'},
    {shortName: 'OU', value: duid},
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  cert.sign(pki.privateKeyFromPem(keys.privateKey), forge.md.sha256.create());
  return pki.certificateToPem(cert);
}

export async function inspectTizenWgt(wgtBuffer: ArrayBuffer): Promise<TizenPackageMeta> {
  const zip = await JSZip.loadAsync(wgtBuffer);
  const configFile = zip.file('config.xml');

  if (!configFile) {
    throw new Error('Invalid Tizen package: config.xml was not found in .wgt root.');
  }

  const xmlStr = await configFile.async('string');
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
  const appEl = doc.getElementsByTagName('tizen:application')[0]
    || doc.getElementsByTagNameNS('http://tizen.org/ns/widgets', 'application')[0];

  const nameEl = doc.getElementsByTagName('name')[0];

  return {
    appName: (nameEl ? nameEl.textContent : '') || appEl?.getAttribute('package') || 'Tizen App',
    packageId: appEl?.getAttribute('package') || 'package',
    appId: appEl?.getAttribute('id') || appEl?.getAttribute('package') || 'app',
    version: appEl?.getAttribute('required_version') || '1.0.0',
  };
}

export async function resignTizenPackage(
  wgtBuffer: ArrayBuffer,
  tvDuid: string,
  onProgress?: (msg: string) => void
): Promise<{signedWgt: ArrayBuffer; meta: TizenPackageMeta}> {
  onProgress?.('Extracting package manifest...');
  const meta = await inspectTizenWgt(wgtBuffer);

  onProgress?.('Generating cryptographic RSA keypairs and X.509 certs...');
  const authorKeys = generateRsaKeyPair();
  const authorCert = createAuthorCertificate(authorKeys);

  const distributorKeys = generateRsaKeyPair();
  const distributorCert = createDistributorCertificate(distributorKeys, tvDuid);

  onProgress?.(`Building W3C XML-DSig signature for TV DUID: ${tvDuid}...`);
  const zip = await JSZip.loadAsync(wgtBuffer);

  const fileDigests: Array<{path: string; digest: string}> = [];
  for (const [filename, fileEntry] of Object.entries(zip.files)) {
    if (!filename.endsWith('signature.xml') && !fileEntry.dir) {
      const content = await fileEntry.async('uint8array');
      const md = forge.md.sha256.create();
      md.update(Buffer.from(content).toString('binary'));
      fileDigests.push({
        path: filename,
        digest: forge.util.encode64(md.digest().getBytes()),
      });
    }
  }

  const signatureXml = `<?xml version="1.0" encoding="UTF-8"?>
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#" Id="DistributorSignature">
  <SignedInfo>
    <CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
    <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
    ${fileDigests.map(f => `<Reference URI="${f.path}"><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>${f.digest}</DigestValue></Reference>`).join('\n    ')}
  </SignedInfo>
  <KeyInfo>
    <X509Data>
      <X509Certificate>${distributorCert.replace(/-----[^\n]+-----/g, '').replace(/\s+/g, '')}</X509Certificate>
    </X509Data>
  </KeyInfo>
  <Object Id="prop"><SignatureProperties xmlns:dsp="http://www.samsung.com/support/xml/signature/profile"><SignatureProperty Target="#DistributorSignature"><dsp:profile name="samsung"/></SignatureProperty></SignatureProperties></Object>
</Signature>`;

  zip.file('signature1.xml', signatureXml);
  zip.file('author-signature.xml', signatureXml.replace('DistributorSignature', 'AuthorSignature'));

  onProgress?.('Repacking signed .wgt binary...');
  const signedWgt = await zip.generateAsync({type: 'arraybuffer', compression: 'DEFLATE'});

  return {signedWgt, meta};
}
