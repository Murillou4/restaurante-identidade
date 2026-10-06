import { defaultFields as budgetFields } from './budgetCatalog.js';
import { defaultChannelFields } from './salesChannels.js';

// A stable object keeps the shared-budget hook independent of render cycles.
export const defaultFields = { ...budgetFields, ...defaultChannelFields };
