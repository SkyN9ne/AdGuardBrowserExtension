import { SETTINGS_V_1_0 } from './settingsSchemaV1';

// Remove obsoleted properties
const { whitelist, ...restFiltersOptions } = SETTINGS_V_1_0['filters'];

// Removes renamed property from stealth
const OLD_STEALTH_KEY = 'stealth_disable_stealth_mode';
const { [OLD_STEALTH_KEY]: disableStealthMode, ...restStealthOptions } = SETTINGS_V_1_0['stealth'];
// Removes escaped quotes
const FIRST_PARTY_COOKIES_TIME = 'stealth-block-first-party-cookies-time';
restStealthOptions[FIRST_PARTY_COOKIES_TIME] = JSON.parse(SETTINGS_V_1_0['stealth'][FIRST_PARTY_COOKIES_TIME]);

// Removes escaped quotes
const APPEARANCE_THEME_KEY = 'appearance-theme';
const { ...copyGeneralOptions } = SETTINGS_V_1_0['general-settings'];
copyGeneralOptions[APPEARANCE_THEME_KEY] = copyGeneralOptions[APPEARANCE_THEME_KEY].replaceAll('\"', '');

export const SETTINGS_V_2_0 = {
    'protocol-version': '2.0',
    'general-settings': { ...copyGeneralOptions },
    'extension-specific-settings': SETTINGS_V_1_0['extension-specific-settings'],
    'filters': {
        ...restFiltersOptions,
        'allowlist': whitelist,
    },
    'stealth': {
        ...restStealthOptions,
        'stealth-disable-stealth-mode': disableStealthMode,
    },
};

export const EXPORTED_SETTINGS_V_2_0 = {
    'protocol-version': '2.0',
    'general-settings': {
        'allow-acceptable-ads': false,
        'show-blocked-ads-count': true,
        'autodetect-filters': true,
        'safebrowsing-enabled': true,
        'filters-update-period': 86400000,
        'appearance-theme': 'dark',
    },
    'extension-specific-settings': {
        'use-optimized-filters': true,
        'collect-hits-count': false,
        'show-context-menu': true,
        'show-info-about-adguard': false,
        'show-app-updated-info': true,
        'hide-rate-adguard': true,
        'user-rules-editor-wrap': false,
    },
    'filters': {
        'enabled-filters': [1, 2, 3, 4, 6, 11, 14, 16, 17, 224, 1001, 1002],
        'enabled-groups': [0, 1, 2, 3, 4, 5, 6, 7,
        ],
        'custom-filters': [
            {
                'customUrl': 'https://testcases.agrd.dev/Filters/css-rules/css-rules.txt',
                'title': 'Rules for CSS tests',
                'trusted': false,
                'enabled': false,
            },
            {
                'customUrl': 'https://testcases.agrd.dev/Filters/element-hiding-rules/test-element-hiding-rules.txt',
                'title': 'Rules for element hiding rules test',
                'trusted': false,
                'enabled': true,
            },
            {
                'customUrl': 'https://testcases.agrd.dev/Filters/generichide-rules/generichide-rules.txt',
                'title': 'Rules for generic hide tests',
                'trusted': true,
                'enabled': true,
            },
        ],
        'user-filter': {
            'enabled': true,
            'rules': '||example.com^$document\nexample.org###h1',
            'disabled-rules': '',
        },
        'allowlist': {
            'enabled': true,
            'inverted': true,
            'domains': [
                'domain1.com',
                'domain2.com',
            ],
            'inverted-domains': [
                'domain3.com',
                'domain4.com',
            ],
        },
    },
    'stealth': {
        'stealth-disable-stealth-mode': false,
        'stealth-hide-referrer': true,
        'stealth-hide-search-queries': true,
        'stealth-send-do-not-track': true,
        'stealth-block-webrtc': true,
        'stealth-remove-x-client': true,
        'stealth-block-third-party-cookies': true,
        'stealth-block-third-party-cookies-time': 1080,
        'stealth-block-first-party-cookies': true,
        'stealth-block-first-party-cookies-time': 4444,
        'block-known-trackers': true,
        'strip-tracking-parameters': true,
    },
};
