import {
    action,
    computed,
    makeObservable,
    observable,
    runInAction,
} from 'mobx';

import { log } from '../../../background/utils/log';
import { createSavingService, EVENTS as SAVING_FSM_EVENTS } from '../components/Editor/savingFSM';
import { sleep } from '../../helpers';
import { messenger } from '../../services/messenger';

const savingUserRulesService = createSavingService({
    id: 'userRules',
    services: {
        saveData: (_, e) => messenger.saveUserRules(e.value),
    },
});

const savingAllowlistService = createSavingService({
    id: 'allowlist',
    services: {
        saveData: async (_, e) => {
            /**
             * If saveAllowlist executes faster than MIN_EXECUTION_TIME_REQUIRED_MS we increase
             * execution time for smoother user experience
             */
            const MIN_EXECUTION_TIME_REQUIRED_MS = 500;
            const start = Date.now();
            await messenger.saveAllowlist(e.value);
            const end = Date.now();
            const timePassed = end - start;
            if (timePassed < MIN_EXECUTION_TIME_REQUIRED_MS) {
                await sleep(MIN_EXECUTION_TIME_REQUIRED_MS - timePassed);
            }
        },
    },
});

class SettingsStore {
    @observable settings = null;

    @observable optionsReadyToRender = false;

    @observable version = null;

    @observable filters = {};

    @observable categories = {};

    @observable rulesCount = 0;

    @observable allowAcceptableAds = null;

    @observable userRules = '';

    @observable allowlist = '';

    @observable savingRulesState = savingUserRulesService.initialState.value;

    @observable savingAllowlistState = savingAllowlistService.initialState.value;

    @observable filtersUpdating = false;

    @observable selectedGroupId = null;

    constructor(rootStore) {
        makeObservable(this);
        this.rootStore = rootStore;

        savingUserRulesService.onTransition((state) => {
            runInAction(() => {
                this.savingRulesState = state.value;
            });
        });

        savingAllowlistService.onTransition((state) => {
            runInAction(() => {
                this.savingAllowlistState = state.value;
            });
        });
    }

    @action
    async requestOptionsData() {
        const data = await messenger.getOptionsData();
        runInAction(() => {
            this.settings = data.settings;
            this.filters = data.filtersMetadata.filters;
            this.categories = data.filtersMetadata.categories;
            this.rulesCount = data.filtersInfo.rulesCount;
            this.version = data.appVersion;
            this.constants = data.constants;
            this.optionsReadyToRender = true;
            this.setAllowAcceptableAds(data.filtersMetadata.filters);
        });
    }

    @action
    setSelectedGroupId(groupId) {
        runInAction(() => {
            this.selectedGroupId = groupId;
        });
    }

    @action
    async updateSetting(settingId, value) {
        await messenger.changeUserSetting(settingId, value);
        runInAction(() => {
            this.settings.values[settingId] = value;
        });
    }

    @action
    setAllowAcceptableAds(filters) {
        const { SEARCH_AND_SELF_PROMO_FILTER_ID } = this.constants.AntiBannerFiltersId;
        const allowAcceptableAdsFilter = filters
            .find((f) => f.filterId === SEARCH_AND_SELF_PROMO_FILTER_ID);
        this.allowAcceptableAds = !!(allowAcceptableAdsFilter.enabled);
    }

    @action
    async setAllowAcceptableAdsValue(value) {
        const { SEARCH_AND_SELF_PROMO_FILTER_ID } = this.constants.AntiBannerFiltersId;
        const prevValue = this.allowAcceptableAds;
        this.allowAcceptableAds = value;
        try {
            if (value) {
                await messenger.enableFilter(SEARCH_AND_SELF_PROMO_FILTER_ID);
            } else {
                await messenger.disableFilter(SEARCH_AND_SELF_PROMO_FILTER_ID);
            }
        } catch (e) {
            runInAction(() => {
                this.allowAcceptableAds = prevValue;
            });
        }
    }

    @computed
    get lastUpdateTime() {
        return Math.max(...this.filters.map((filter) => filter.lastCheckTime || 0));
    }

    @action
    async updateGroupSetting(id, enabled) {
        await messenger.updateGroupStatus(id, enabled);
        runInAction(() => {
            this.categories.forEach((group) => {
                if (group.groupId === id - 0) {
                    // eslint-disable-next-line no-unused-expressions, no-param-reassign
                    enabled ? group.enabled = true : delete group.enabled;
                }
            });
        });
    }

    @action
    refreshFilters(updatedFilters) {
        if (updatedFilters && updatedFilters.length) {
            updatedFilters.forEach((filter) => this.refreshFilter(filter));
        }
    }

    @action
    refreshFilter(filter) {
        const filterToUpdate = this.filters.find((f) => f.filterId === filter.filterId);
        const index = this.filters.indexOf(filterToUpdate);
        if (index !== -1) {
            this.filters[index] = filter;
        }
    }

    @action
    async updateFilterSetting(id, enabled) {
        await messenger.updateFilterStatus(id, enabled);
        runInAction(async () => {
            for (const filter of this.filters) {
                if (filter.filterId === parseInt(id, 10)) {
                    if (enabled) {
                        filter.enabled = true;
                        await this.updateFilters([filter]);
                    } else {
                        delete filter.enabled;
                    }
                }
            }
        });
    }

    @action
    setFiltersUpdating(value) {
        this.filtersUpdating = value;
    }

    @action
    async updateFilters(filters) {
        this.setFiltersUpdating(true);
        try {
            const filtersUpdates = await messenger.updateFilters(filters);
            this.refreshFilters(filtersUpdates);
            setTimeout(() => {
                this.setFiltersUpdating(false);
            }, 2000);
            return filtersUpdates;
        } catch (error) {
            this.setFiltersUpdating(false);
            throw error;
        }
    }

    @action
    async addCustomFilter(filter) {
        const newFilter = await messenger.addCustomFilter(filter);
        runInAction(() => {
            this.filters.push(newFilter);
        });
    }

    @action
    async removeCustomFilter(filterId) {
        await messenger.removeCustomFilter(filterId);
        runInAction(() => {
            this.filters = this.filters.filter((filter) => filter.filterId !== filterId);
        });
    }

    @action
    setUserRules = (userRules) => {
        this.userRules = userRules;
    }

    @action
    async getUserRules() {
        try {
            const { content } = await messenger.getUserRules();
            this.setUserRules(content);
        } catch (e) {
            log.debug(e);
        }
    }

    @action
    async saveUserRules(value) {
        this.userRules = value;
        savingUserRulesService.send(SAVING_FSM_EVENTS.SAVE, { value });
    }

    @action
    setAllowlist = (allowlist) => {
        this.allowlist = allowlist;
    }

    @action
    async getAllowlist() {
        try {
            const { content } = await messenger.getAllowlist();
            runInAction(() => {
                this.allowlist = content;
            });
        } catch (e) {
            log.debug(e);
        }
    }

    @action
    saveAllowlist = (allowlist) => {
        this.allowlist = allowlist;
        savingAllowlistService.send(SAVING_FSM_EVENTS.SAVE, { value: allowlist });
    }
}

export default SettingsStore;
