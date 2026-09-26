#!/usr/bin/env node

const { Command } = require('commander');
const { Signature, SamsungCertificateCreator, TizenCertificateCreator } = require('./index.js');
const { writeFileSync, readFileSync, readdirSync, statSync, mkdirSync } = require('fs');
const forge = require('node-forge');
const JSZip = require('jszip');
const Package = require('./package.json');
const { join } = require('path');
const { homedir } = require('os');

const program = new Command();

program.name('tizen.js')
    .version(Package.version)
    .description(Package.description)

program.command('build <dir/pkg>')
    .description('Build a Tizen package')
    .requiredOption('-t, --type <type>', 'Type of the package, can be "tpk" or "wgt"')
    .requiredOption('-o, --output <file>', 'Output file path')
    .requiredOption('--author <path>', 'Path to the author certificate')
    .option('--distributor <path>', 'Path to the distributor certificate')
    .requiredOption('--authorPwd <password>', 'Password for the author certificate')
    .option('--distributorPwd <password>', 'Password for the distributor certificate')
    .option('-p, --privilege <privilege>', 'Privilege for the application, will be used if distributor certificate isn\'t provided.\nCan be "public" or "partner"')
    .option('--ignore [files]', 'Files to ignore during packaging, also supports RegEx. Seperate with a command\nExample: --ignore file,directory,/regex/')
    .action(async (dir, options) => {
        if (options.type !== 'tpk' && options.type !== 'wgt') {
            throw new Error(`Invalid package type: ${options.type}. Must be "tpk" or "wgt".`);
        }

        let distributorKey;

        if (options.distributor) {
            const file = readFileSync(options.distributor);
            const p12Distributor = forge.asn1.fromDer(forge.util.createBuffer(file));
            distributorKey = forge.pkcs12.pkcs12FromAsn1(p12Distributor, options.distributorPwd);
        } else {
            const tizen = new TizenCertificateCreator();
            await tizen._downloadTizenCertificates();
            if (options.privilege !== 'public' && options.privilege !== 'partner') throw new Error(`Invalid privilege: ${options.privilege}. Must be "public" or "partner".`);
            const der = forge.asn1.fromDer(forge.util.createBuffer(readFileSync(join(homedir(), `share/.tizen-cert/distributor/sdk-${options.privilege}/tizen-distributor-signer.p12`))));

            distributorKey = forge.pkcs12.pkcs12FromAsn1(der, false, 'tizenpkcs12passfordsigner');
        }

        const authorDer = forge.asn1.fromDer(forge.util.createBuffer(readFileSync(options.author)));
        const authorKey = forge.pkcs12.pkcs12FromAsn1(authorDer, false, options.authorPwd);

        const isPackage = dir.endsWith('.tpk') || dir.endsWith('.wgt');

        let files = [];
        const ignoredFilesAndFolders = options.ignore ? options.ignore.split(',').map(f => f.trim()) : [];
        const ignoredRegexes = ignoredFilesAndFolders
            .filter(pattern => pattern.startsWith('/') && pattern.endsWith('/'))
            .map(pattern => new RegExp(pattern.slice(1, -1)));
        const ignoredLiterals = ignoredFilesAndFolders.filter(pattern => !(pattern.startsWith('/') && pattern.endsWith('/')));
        if (isPackage) {
            const zip = await JSZip.loadAsync(readFileSync(dir));
            files = await Promise.all(
                Object.keys(zip.files).map(async (filename) => {
                    const file = zip.files[filename];
                    if (file.dir) return null;
                    if (file.name === 'author-signature.xml' || file.name === 'signature1.xml') return null;
                    const data = await file.async('nodebuffer');
                    return {
                        uri: encodeURIComponent(filename),
                        data
                    };
                })
            );

            files = files.filter(Boolean);
        } else {
            readdirSync('.').forEach(file => {
                const stat = statSync(file);
                if (
                    ignoredLiterals.includes(file) ||
                    ignoredRegexes.some(re => re.test(file))
                ) {
                    return;
                }
                if (stat.isFile()) {
                    const data = readFileSync(file);
                    files.push({ uri: encodeURIComponent(file), data });
                } else if (stat.isDirectory()) {
                    readFilesInDirectory(file);
                }
            });

            function readFilesInDirectory(directory) {
                readdirSync(directory).forEach(file => {
                    if (
                        ignoredLiterals.includes(file) ||
                        ignoredRegexes.some(re => re.test(file))
                    ) {
                        return;
                    }
                    const filePath = `${directory}/${file}`;
                    const stat = statSync(filePath);
                    if (stat.isFile()) {
                        const data = readFileSync(filePath);
                        files.push({ uri: encodeURIComponent(filePath), data });
                    } else if (stat.isDirectory()) {
                        readFilesInDirectory(filePath);
                    }
                });
            }
        }

        const AuthorSignature = new Signature('AuthorSignature', files);
        const authorFiles = await AuthorSignature.sign(authorKey);
        const DistributorSignature = new Signature('DistributorSignature', authorFiles);
        const distributorFiles = await DistributorSignature.sign(distributorKey);

        const newZip = new JSZip();

        distributorFiles.forEach(file => {
            newZip.file(decodeURIComponent(file.uri), file.data);
        });

        const zipData = await newZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        writeFileSync(options.output, zipData);

        console.log(`Tizen package created successfully: ${options.output}`);
    });

program.command('create-tizen-cert')
    .description('Create a Tizen Certificate')
    .requiredOption('--name <name>', 'Name of the author')
    .option('--email [email]', 'Email of the author')
    .requiredOption('--password <password>', 'Password for the certificate')
    .option('--country [country]', 'Country of the author')
    .option('--state [state]', 'State of the author')
    .option('--city [city]', 'City of the author')
    .option('--organization [organization]', 'Organization of the author')
    .option('--department [department]', 'Department of the author')
    .option('--privilege [privilege]', 'Privilege level of the certificate')
    .requiredOption('--output <file>', 'Output file path')
    .action(async (options) => {
        const creator = new TizenCertificateCreator();
        const cert = await creator.createCertificate(options);
        writeFileSync(options.output, cert, { encoding: 'binary' });
        console.log(`Tizen Certificate created successfully: ${options.output}`);

    });

program.command('create-samsung-cert')
    .description('Create a Samsung Certificate')
    .requiredOption('--name <name>', 'Name of the author')
    .requiredOption('--password <password>', 'Password for the certificate')
    .requiredOption('--email <email>', 'Email of the author')
    .requiredOption('--duidList <duidList>', 'List of DUIDs for the certificate. Separated by commas')
    .requiredOption('--privilege <privilege>', 'Privilege level of the certificate. Can be "Partner" or "Public"')
    .requiredOption('--output <directory>', 'Output directory path')
    .action(async (options) => {
        if (options.privilege !== 'Public' && options.privilege !== 'Partner') {
            throw new Error('Invalid privilege level');
        }

        console.log('Please sign in at https://account.samsung.com/accounts/TDC/signInGate?clientId=v285zxnl3h&tokenType=TOKEN');
        console.log('After signing in, copy the JSON response and paste it below:');
        const response = await new Promise((resolve) => {
            const stdin = process.stdin;
            const stdout = process.stdout;
            stdin.resume();
            stdout.write('> ');
            stdin.on('data', (data) => {
                stdin.pause();
                resolve(data.toString().trim());
            });
        });

        let accessInfo;
        try {
            accessInfo = JSON.parse(response);
        } catch (error) {
            throw new Error('Invalid JSON response');
        }
        
        accessInfo = {
            accessToken: accessInfo.access_token,
            userId: accessInfo.userId
        }

        const authorInfo = {
            name: options.name,
            email: options.email,
            privilegeLevel: options.privilege,
            password: options.password
        };

        const duidList = options.duidList.split(',');

        const certCreator = new SamsungCertificateCreator();
        const info = await certCreator.createCertificate(authorInfo, accessInfo, duidList);

        mkdirSync(options.output, { recursive: true });

        writeFileSync(`${options.output}/author.p12`, info.authorCert, { encoding: 'binary' });
        writeFileSync(`${options.output}/distributor.p12`, info.distributorCert, { encoding: 'binary' });
        writeFileSync(`${options.output}/device-profile.xml`, info.distributorXML);

        console.log(`Samsung Certificate created successfully: ${options.output}`);
    });

program.parse();