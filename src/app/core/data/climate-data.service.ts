import { Injectable, resource } from '@angular/core';
import {
  ENSO_EPISODES_URL,
  GLOBAL_SST_URL,
  NINO12_INDEX_URL,
  RAINFALL_URL,
  fetchJson,
  parseEnsoEpisodes,
  parseGlobalSst,
  parseNino34Index,
  parseRainfall,
} from './climate-data';

/**
 * Data files shared by more than one chapter, each fetched and validated once for the app.
 * Read them with `.value()`; `.error()` holds the reason a file failed.
 */
@Injectable({ providedIn: 'root' })
export class ClimateDataService {
  readonly episodes = resource({
    loader: async ({ abortSignal }) =>
      parseEnsoEpisodes(await fetchJson(ENSO_EPISODES_URL, abortSignal), ENSO_EPISODES_URL),
  });

  readonly rainfall = resource({
    loader: async ({ abortSignal }) =>
      parseRainfall(await fetchJson(RAINFALL_URL, abortSignal), RAINFALL_URL),
  });

  readonly nino12 = resource({
    loader: async ({ abortSignal }) =>
      parseNino34Index(await fetchJson(NINO12_INDEX_URL, abortSignal), NINO12_INDEX_URL),
  });

  readonly globalSst = resource({
    loader: async ({ abortSignal }) =>
      parseGlobalSst(await fetchJson(GLOBAL_SST_URL, abortSignal), GLOBAL_SST_URL),
  });
}
