/* eslint-disable no-console */
import { program } from 'commander';
import { downloadAndSave } from './locales/download-locales';
import { uploadLocales } from './locales/upload-locales';
import { renewLocales } from './locales/renew-locales';
import { checkTranslations, checkCriticals } from './locales/validate';
import { checkUnusedMessages } from './locales/unused';

import { cliLog } from './cli-log';

import {
    LANGUAGES,
    REQUIRED_LOCALES,
} from './locales/locales-constants';

const LOCALES = Object.keys(LANGUAGES);
// const NON_REQUIRED_LOCALES = LOCALES.filter((l) => !REQUIRED_LOCALES.includes(l));

const download = async (locales) => {
    try {
        await downloadAndSave(locales);
        cliLog.success('Download was successful');
        // check downloaded locales for critical errors
        await checkCriticals(locales);
    } catch (e) {
        cliLog.error(e.message);
        process.exit(1);
    }
};

const upload = async () => {
    try {
        // check for unused base-locale strings before uploading
        await checkUnusedMessages();
        const result = await uploadLocales();
        cliLog.success(`Upload was successful with response: ${JSON.stringify(result)}`);
    } catch (e) {
        cliLog.error(e.message);
        process.exit(1);
    }
};

const renew = async () => {
    try {
        await renewLocales();
    } catch (e) {
        cliLog.error(e.message);
        process.exit(1);
    }
};

const validate = async (locales) => {
    try {
        await checkTranslations(locales);
    } catch (e) {
        cliLog.error(e.message);
        process.exit(1);
    }
};

const summary = async (isInfo) => {
    try {
        await checkTranslations(LOCALES, isInfo);
    } catch (e) {
        cliLog.error(e.message);
        process.exit(1);
    }
};

const unused = async () => {
    try {
        await checkUnusedMessages();
    } catch (e) {
        cliLog.error(e.message);
        process.exit(1);
    }
};

program
    .command('download')
    .description('Downloads messages from localization service')
    .option('-l,--locales [list...]', 'specific list of space-separated locales')
    .action(async (opts) => {
        let localesToDownload;
        let localesToValidate;
        // if list_of_locales specified, use them for download and validation
        // otherwise (default) download all locales and validate our ones
        if (opts.locales && opts.locales.length > 0) {
            localesToDownload = opts.locales;
            localesToValidate = opts.locales;
        } else {
            localesToDownload = LOCALES;
            localesToValidate = REQUIRED_LOCALES;
        }
        // const locales = opts.locales && opts.locales.length > 0 ? opts.locales : LOCALES;
        await download(localesToDownload);
        await validate(localesToValidate);
    });

program
    .command('upload')
    .description('Uploads base messages to the localization service')
    .action(upload);

program
    .command('renew')
    .description('Removes old messages from locale messages')
    .action(renew);

program
    .command('validate')
    .description('Validates translations')
    .option('-R,--min', 'for only our required locales')
    .option('-l,--locales [list...]', 'for specific list of space-separated locales')
    .action((opts) => {
        let locales;
        if (opts.min) {
            locales = REQUIRED_LOCALES;
        } else if (opts.locales && opts.locales.length > 0) {
            locales = opts.locales;
        } else {
            // defaults to validate all locales
            locales = LOCALES;
        }
        validate(locales);
    });

program
    .command('info')
    .description('Shows locales info')
    .option('-s,--summary', 'for all locales translations readiness')
    .option('-N,--unused', 'for unused base-lang strings')
    .action((opts) => {
        const IS_INFO = true;
        if (opts.summary) {
            summary(IS_INFO);
        } else if (opts.unused) {
            unused();
        } else if (!opts.summary && !opts.unused) {
            summary(IS_INFO);
            unused();
        }
    });

program.parse(process.argv);
