#!/usr/bin/env python3
"""
Build the El Niño story's data files from NOAA ERSST v5 (sea surface temperature)
and NOAA GPCP v2.3 (precipitation).

Outputs (default: src/assets/data/), matching src/app/core/data/climate-data.ts:

  nino34-index.json          MonthlyIndexFile: Niño 3.4 anomaly, 1950-01 to OBSERVED_THROUGH
  nino12-index.json          MonthlyIndexFile: Niño 1+2 (coastal Peru) anomaly, same span
  sst-anomaly-YYYYMM.json    SstAnomalyFile: Pacific SST anomaly grid for one month
  enso-episodes.json         EnsoEpisodesFile: every El Niño / La Niña since 1950, with
                             per-event fingerprints and months-per-phase by decade
  global-sst.json            GlobalSstFile: annual 60°S–60°N ocean temperature anomaly
  rainfall-winters.json      RainfallFile: Dec–Feb rainfall anomaly by region, every winter
                             since 1979–80 (needs GPCP; skipped with a warning if absent)

Baselines
  The two index files, the grids and global-sst.json use a fixed 1991–2020 climatology,
  so long-term warming stays visible.
  Episode detection uses NOAA CPC's Oceanic Niño Index method: a 3-month running mean
  against a 30-year base period re-centred every 5 years. A fixed baseline would turn the
  warming trend into fake La Niñas early in the record and fake El Niños late in it.

Input is either one multi-year ERSST NetCDF file (NOAA PSL's sst.mnmean.nc, or an
ersst.v5.YYYYMM-YYYYMM.nc) or a directory of NCEI monthly files (ersst.v5.YYYYMM.nc).
GPCP is read from scripts/data/precip.mon.mean.nc.

    python scripts/preprocess.py --download     # fetch both datasets into scripts/data/ first
    python scripts/preprocess.py                # use what's already in scripts/data/
    python scripts/preprocess.py --input path/to/file-or-dir --output some/dir
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np
import xarray as xr

SCRIPTS_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPTS_DIR.parent
DEFAULT_DATA_DIR = SCRIPTS_DIR / "data"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "src" / "assets" / "data"

# NOAA PSL single-file copies, updated monthly.
DOWNLOADS = {
    # ERSST v5, 1854–present.
    "sst.mnmean.nc": "https://downloads.psl.noaa.gov/Datasets/noaa.ersst.v5/sst.mnmean.nc",
    # GPCP v2.3 monthly precipitation, 1979–present.
    "precip.mon.mean.nc": "https://downloads.psl.noaa.gov/Datasets/gpcp/precip.mon.mean.nc",
}
SST_NAME = "sst.mnmean.nc"
PRECIP_NAME = "precip.mon.mean.nc"

SOURCE = "NOAA ERSST v5"
PRECIP_SOURCE = "NOAA GPCP v2.3"
BASELINE = (1991, 2020)
INDEX_START = "1950-01"
# Last month used anywhere. Later months in the input are ignored.
OBSERVED_THROUGH = "2025-09"

# ONI-style episode rule (NOAA CPC).
ONI_THRESHOLD = 0.5
ONI_MIN_MONTHS = 5

EARTH_RADIUS_KM = 6371.0

# Regions. Longitudes are °E on 0–360.
NINO34 = {"south": -5.0, "north": 5.0, "west": 190.0, "east": 240.0}
NINO12 = {"south": -10.0, "north": 0.0, "west": 270.0, "east": 280.0}
NINO4 = {"south": -5.0, "north": 5.0, "west": 160.0, "east": 210.0}
TROPICAL_PACIFIC = {"south": -20.0, "north": 20.0, "west": 120.0, "east": 280.0}
TROPICAL_INDIAN = {"south": -20.0, "north": 20.0, "west": 40.0, "east": 100.0}
NEAR_GLOBAL = {"south": -60.0, "north": 60.0, "west": 0.0, "east": 360.0}

# Map window for the grid files: tropical Pacific, Indonesia to South America.
MAP = {"south": -30.0, "north": 30.0, "west": 120.0, "east": 290.0}

# Rainfall regions, matching chapter 4's map (ids are shared with the app).
RAIN_REGIONS = [
    ("southern-africa", "Southern Africa", {"south": -30.0, "north": -15.0, "west": 20.0, "east": 35.0}),
    ("east-africa", "Equatorial East Africa", {"south": -10.0, "north": 5.0, "west": 30.0, "east": 42.0}),
    ("maritime", "Indonesia and northern Australia", {"south": -15.0, "north": 8.0, "west": 95.0, "east": 145.0}),
    ("central-pacific", "Central equatorial Pacific", {"south": -5.0, "north": 5.0, "west": 170.0, "east": 210.0}),
    ("pacific-northwest", "Pacific Northwest", {"south": 42.0, "north": 50.0, "west": 235.0, "east": 245.0}),
    ("southern-us", "Southern US and northern Mexico", {"south": 25.0, "north": 35.0, "west": 255.0, "east": 280.0}),
    ("ecuador-peru", "Coastal Ecuador and northern Peru", {"south": -10.0, "north": 0.0, "west": 275.0, "east": 282.0}),
    ("northern-south-america", "Northern South America", {"south": 0.0, "north": 12.0, "west": 285.0, "east": 305.0}),
    ("southeast-south-america", "Southeast South America", {"south": -35.0, "north": -22.0, "west": 300.0, "east": 310.0}),
]

# Chapter 2 events, plus the chapter 1 hero frames.
EVENT_MONTHS = [
    "1982-12", "1983-12", "1988-12", "1997-12", "1998-12",
    "2010-12", "2015-12", "2016-12", "2020-12", "2023-12",
]
HERO_MONTHS = ["1997-12", "2010-12", "2005-12"]
GRID_MONTHS = sorted(set(EVENT_MONTHS) | set(HERO_MONTHS))


class PreprocessError(Exception):
    """A problem with the input that the user needs to fix. Printed without a traceback."""


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------


def download(data_dir: Path) -> None:
    import requests

    data_dir.mkdir(parents=True, exist_ok=True)
    for name, url in DOWNLOADS.items():
        target = data_dir / name
        if target.exists():
            print(f"Already present: {target.relative_to(REPO_ROOT)}")
            continue

        partial = target.with_suffix(".nc.part")
        print(f"Downloading {url}")
        try:
            with requests.get(url, stream=True, timeout=60) as response:
                response.raise_for_status()
                total = int(response.headers.get("content-length", 0))
                done = 0
                with partial.open("wb") as out:
                    for chunk in response.iter_content(chunk_size=1 << 20):
                        out.write(chunk)
                        done += len(chunk)
                        if total:
                            print(f"\r  {done / 1e6:6.1f} / {total / 1e6:.1f} MB", end="", flush=True)
            print()
        except requests.RequestException as error:
            partial.unlink(missing_ok=True)
            raise PreprocessError(
                f"Download failed: {error}\n"
                f"Download it manually from:\n  {url}\n"
                f"and save it as:\n  {target}"
            ) from error
        partial.rename(target)
        print(f"Saved {target.relative_to(REPO_ROOT)}")


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------


def open_sst(path: Path) -> tuple[xr.DataArray, str]:
    """Returns SST as (time, lat, lon) with lon on 0–360, plus a description of the input."""
    if path.is_file():
        ds = xr.open_dataset(path)
        described = path.name
    elif path.is_dir():
        single = sorted(path.glob(SST_NAME)) + sorted(path.glob("ersst.v5.??????-??????.nc"))
        monthly = sorted(path.glob("ersst.v5.??????.nc"))
        if single:
            ds = xr.open_dataset(single[0])
            described = single[0].name
        elif monthly:
            # Needs dask, which open_mfdataset uses under the hood.
            ds = xr.open_mfdataset(monthly, combine="by_coords")
            described = f"{len(monthly)} monthly files ({monthly[0].name} … {monthly[-1].name})"
        else:
            raise PreprocessError(
                f"No ERSST v5 NetCDF found in {path}.\n"
                f"Run with --download, or put {SST_NAME} (or ersst.v5.YYYYMM.nc monthly files) there."
            )
    else:
        raise PreprocessError(f"Input not found: {path}")

    if "sst" not in ds:
        raise PreprocessError(f"{described}: no 'sst' variable (found: {', '.join(ds.data_vars)})")

    sst = ds["sst"]
    # NCEI monthly files carry a length-1 depth axis.
    for depth in ("lev", "zlev", "depth"):
        if depth in sst.dims:
            sst = sst.isel({depth: 0}, drop=True)

    return normalise(sst).load(), described


def open_precip(path: Path) -> xr.DataArray | None:
    if not path.exists():
        return None
    # time_bnds holds fill values that xarray can't decode as dates; it isn't needed.
    ds = xr.open_dataset(path, drop_variables=["time_bnds"])
    if "precip" not in ds:
        raise PreprocessError(f"{path.name}: no 'precip' variable")
    return normalise(ds["precip"]).load()


def normalise(field: xr.DataArray) -> xr.DataArray:
    """lon on 0–360 ascending, lat ascending, nothing after OBSERVED_THROUGH."""
    field = field.assign_coords(lon=(field["lon"] % 360)).sortby("lon").sortby("lat")
    keep = month_keys(field) <= OBSERVED_THROUGH
    return field.isel(time=np.flatnonzero(keep))


def month_keys(field: xr.DataArray) -> np.ndarray:
    """'YYYY-MM' for every time step. Matches on calendar month, whatever day the timestamp uses."""
    years = field["time"].dt.year.values
    months = field["time"].dt.month.values
    keys = np.array([f"{y:04d}-{m:02d}" for y, m in zip(years, months)])
    if len(set(keys)) != len(keys):
        raise PreprocessError("Input has more than one time step for the same month.")
    return keys


def select(field: xr.DataArray, box: dict) -> xr.DataArray:
    selected = field.sel(lat=slice(box["south"], box["north"]), lon=slice(box["west"], box["east"]))
    if selected.sizes["lat"] == 0 or selected.sizes["lon"] == 0:
        raise PreprocessError(f"Region {box} selects no grid cells. Check the input's lat/lon.")
    return selected


def regional_mean(field: xr.DataArray, box: dict) -> xr.DataArray:
    """Area-weighted mean over a lat/lon box: cells shrink with cos(latitude)."""
    selected = select(field, box)
    weights = np.cos(np.deg2rad(selected["lat"]))
    return selected.weighted(weights).mean(dim=("lat", "lon"), skipna=True)


# ---------------------------------------------------------------------------
# Climatologies
# ---------------------------------------------------------------------------


def years_of(keys: np.ndarray) -> np.ndarray:
    return np.array([int(k[:4]) for k in keys])


def monthly_climatology(field: xr.DataArray, keys: np.ndarray, base: tuple[int, int] = BASELINE) -> xr.DataArray:
    """Mean for each calendar month over the base years, indexed by month (1–12)."""
    start, end = base
    years = years_of(keys)
    in_base = (years >= start) & (years <= end)
    expected = (end - start + 1) * 12
    if in_base.sum() != expected:
        raise PreprocessError(f"Baseline {start}–{end} needs {expected} months; input has {in_base.sum()}.")
    return field.isel(time=np.flatnonzero(in_base)).groupby("time.month").mean("time")


def fixed_anomaly(field: xr.DataArray, keys: np.ndarray) -> xr.DataArray:
    return field.groupby("time.month") - monthly_climatology(field, keys)


def sliding_anomaly(field: xr.DataArray, keys: np.ndarray) -> xr.DataArray:
    """
    NOAA CPC's ONI baseline: each 5-year block (1951–55, 1956–60, …) is measured against the
    30 years centred on it (1936–65, 1941–70, …). Earlier years join the first block, and
    blocks whose centred period isn't complete yet use 1991–2020, as CPC does.
    """
    years = years_of(keys)
    pieces = []
    for block_start in range(1951, int(years.max()) + 1, 5):
        block = (years >= block_start) & (years <= block_start + 4)
        if block_start == 1951:
            block |= years < 1951
        if not block.any():
            continue
        base_start = min(block_start - 15, BASELINE[0])
        climatology = monthly_climatology(field, keys, (base_start, base_start + 29))
        part = field.isel(time=np.flatnonzero(block))
        pieces.append(part.groupby("time.month") - climatology)
    return xr.concat(pieces, dim="time").sortby("time")


def running_mean(series: xr.DataArray) -> xr.DataArray:
    """Centred 3-month mean, as in the ONI."""
    return series.rolling(time=3, center=True).mean()


# ---------------------------------------------------------------------------
# Monthly index files
# ---------------------------------------------------------------------------


def index_file(sst: xr.DataArray, keys: np.ndarray, box: dict, label: str) -> dict:
    anomaly = fixed_anomaly(regional_mean(sst, box), keys)
    months = []
    for key, value in zip(keys, anomaly.values):
        if key < INDEX_START:
            continue
        if not math.isfinite(value):
            raise PreprocessError(f"{label} anomaly is missing for {key}.")
        months.append({"month": key, "anomaly": clean(value)})
    check_contiguous([m["month"] for m in months])
    return {
        "source": f"{SOURCE}, {label}, area-weighted",
        "baseline": f"{BASELINE[0]}–{BASELINE[1]}",
        "months": months,
    }


def check_contiguous(keys: list[str]) -> None:
    for previous, current in zip(keys, keys[1:]):
        if current != next_month(previous):
            raise PreprocessError(f"Gap in input: {previous} is followed by {current}.")


def next_month(key: str) -> str:
    year, month = int(key[:4]), int(key[5:])
    return f"{year + 1}-01" if month == 12 else f"{year}-{month + 1:02d}"


# ---------------------------------------------------------------------------
# Anomaly grids
# ---------------------------------------------------------------------------


def anomaly_grid(sst: xr.DataArray, keys: np.ndarray, climatology: xr.DataArray, key: str) -> dict:
    matches = np.flatnonzero(keys == key)
    if matches.size == 0:
        raise PreprocessError(f"{key} is not in the input (it covers {keys[0]} to {keys[-1]}).")

    frame = sst.isel(time=int(matches[0])) - climatology.sel(month=int(key[5:]))
    frame = select(frame, MAP)

    return {
        "month": key,
        "source": SOURCE,
        "baseline": f"{BASELINE[0]}–{BASELINE[1]}",
        "lats": [round(float(v), 2) for v in frame["lat"].values],
        "lons": [round(float(v), 2) for v in frame["lon"].values],
        # Land (NaN) stays in the grid as null so every row has one value per longitude.
        "values": [[clean(v) for v in row] for row in frame.transpose("lat", "lon").values],
    }


# ---------------------------------------------------------------------------
# ENSO episodes
# ---------------------------------------------------------------------------


def oni_series(sst: xr.DataArray, keys: np.ndarray) -> np.ndarray:
    return running_mean(sliding_anomaly(regional_mean(sst, NINO34), keys)).values


def find_episodes(oni: np.ndarray, keys: np.ndarray) -> list[tuple[str, int, int]]:
    """(phase, first index, last index) for every qualifying run from INDEX_START on."""
    episodes = []
    start = int(np.searchsorted(keys, INDEX_START))
    for phase, hit in (("el-nino", oni >= ONI_THRESHOLD), ("la-nina", oni <= -ONI_THRESHOLD)):
        i = start
        while i < len(keys):
            if not hit[i]:
                i += 1
                continue
            j = i
            while j + 1 < len(keys) and hit[j + 1]:
                j += 1
            if j - i + 1 >= ONI_MIN_MONTHS:
                episodes.append((phase, i, j))
            i = j + 1
    return sorted(episodes, key=lambda e: e[1])


def cell_areas(field: xr.DataArray) -> np.ndarray:
    """Area of each grid cell in million km², shaped (lat, lon)."""
    lats = np.deg2rad(field["lat"].values)
    dlat = abs(float(np.diff(field["lat"].values).mean()))
    dlon = abs(float(np.diff(field["lon"].values).mean()))
    band = EARTH_RADIUS_KM**2 * np.deg2rad(dlon) * np.deg2rad(dlat) * np.cos(lats) / 1e6
    return np.repeat(band[:, None], field.sizes["lon"], axis=1)


def episode_label(keys: np.ndarray, first: int, last: int) -> str:
    start, end = keys[first][:4], keys[last][:4]
    return start if start == end else f"{start}–{end[2:]}"


def enso_episodes(sst: xr.DataArray, keys: np.ndarray) -> dict:
    oni = oni_series(sst, keys)
    nino12 = running_mean(sliding_anomaly(regional_mean(sst, NINO12), keys)).values
    nino4 = running_mean(sliding_anomaly(regional_mean(sst, NINO4), keys)).values
    indian = running_mean(sliding_anomaly(regional_mean(sst, TROPICAL_INDIAN), keys)).values

    pacific = sliding_anomaly(select(sst, TROPICAL_PACIFIC), keys)
    areas = cell_areas(pacific)
    pacific_values = pacific.transpose("time", "lat", "lon").values

    episodes = []
    for phase, first, last in find_episodes(oni, keys):
        sign = 1.0 if phase == "el-nino" else -1.0
        span = slice(first, last + 1)
        peak_at = first + int(np.nanargmax(sign * oni[span]))
        # The Indian Ocean answers a few months late, so look past the episode's end.
        lagged = slice(first, min(last + 7, len(keys)))

        anomalous_area = [
            float(np.nansum(np.where(sign * pacific_values[t] >= 1.0, areas, 0.0)))
            for t in range(first, last + 1)
        ]
        episodes.append(
            {
                "id": episode_label(keys, first, last),
                "phase": phase,
                "start": keys[first],
                "end": keys[last],
                "peakMonth": keys[peak_at],
                "peak": clean(sign * oni[peak_at]),
                "months": last - first + 1,
                "nino12": clean(np.nanmax(sign * nino12[span])),
                "nino4": clean(np.nanmax(sign * nino4[span])),
                "area": clean(max(anomalous_area)),
                "indianOcean": clean(np.nanmax(sign * indian[lagged])),
            }
        )

    return {
        "source": SOURCE,
        "definition": (
            f"3-month running mean of Niño 3.4 at or beyond ±{ONI_THRESHOLD} °C for at least "
            f"{ONI_MIN_MONTHS} consecutive months, against 30-year base periods re-centred every "
            "5 years (NOAA CPC Oceanic Niño Index method)"
        ),
        "episodes": episodes,
        "decades": decade_counts(episodes, keys),
    }


def decade_counts(episodes: list[dict], keys: np.ndarray) -> list[dict]:
    phase_of = {}
    for episode in episodes:
        key = episode["start"]
        while key <= episode["end"]:
            phase_of[key] = episode["phase"]
            key = next_month(key)

    decades: dict[int, dict] = {}
    for key in keys:
        if key < INDEX_START:
            continue
        decade = int(key[:4]) // 10 * 10
        counts = decades.setdefault(decade, {"decade": decade, "elNino": 0, "laNina": 0, "neutral": 0})
        phase = phase_of.get(key)
        counts["elNino" if phase == "el-nino" else "laNina" if phase == "la-nina" else "neutral"] += 1
    return [decades[d] for d in sorted(decades)]


# ---------------------------------------------------------------------------
# Global ocean temperature
# ---------------------------------------------------------------------------


def global_sst(sst: xr.DataArray, keys: np.ndarray) -> dict:
    anomaly = fixed_anomaly(regional_mean(sst, NEAR_GLOBAL), keys).values
    oni = oni_series(sst, keys)
    years = []
    first_year = int(INDEX_START[:4])
    last_year = int(OBSERVED_THROUGH[:4]) - (0 if OBSERVED_THROUGH.endswith("-12") else 1)
    for year in range(first_year, last_year + 1):
        in_year = np.flatnonzero(years_of(keys) == year)
        if in_year.size != 12:
            continue
        # The winter that opens the year sets its phase: Dec–Feb, centred on January.
        winter = oni[in_year[0]]
        phase = "el-nino" if winter >= ONI_THRESHOLD else "la-nina" if winter <= -ONI_THRESHOLD else "neutral"
        years.append({"year": year, "anomaly": clean(np.nanmean(anomaly[in_year])), "phase": phase})
    return {
        "source": f"{SOURCE}, 60°S–60°N, area-weighted annual mean",
        "baseline": f"{BASELINE[0]}–{BASELINE[1]}",
        "years": years,
    }


# ---------------------------------------------------------------------------
# Rainfall
# ---------------------------------------------------------------------------


def rainfall_winters(precip: xr.DataArray, sst: xr.DataArray, sst_keys: np.ndarray) -> dict:
    keys = month_keys(precip)
    oni = dict(zip(sst_keys, oni_series(sst, sst_keys)))

    series = {rid: regional_mean(precip, box).values for rid, _, box in RAIN_REGIONS}
    climatology = {
        rid: monthly_climatology(regional_mean(precip, box), keys).values for rid, _, box in RAIN_REGIONS
    }
    djf_normal = {rid: float(np.mean(climatology[rid][[11, 0, 1]])) for rid in climatology}

    index_of = {key: i for i, key in enumerate(keys)}
    winters = []
    for year in range(int(keys[0][:4]), int(keys[-1][:4])):
        months = [f"{year}-12", f"{year + 1}-01", f"{year + 1}-02"]
        if not all(m in index_of for m in months):
            continue
        rows = [index_of[m] for m in months]
        centre = oni.get(f"{year + 1}-01", float("nan"))
        phase = "el-nino" if centre >= ONI_THRESHOLD else "la-nina" if centre <= -ONI_THRESHOLD else "neutral"
        winters.append(
            {
                "id": f"{year}–{str(year + 1)[2:]}",
                "phase": phase,
                "oni": clean(centre),
                "anomalies": {
                    rid: clean(100.0 * (float(np.mean(series[rid][rows])) - djf_normal[rid]) / djf_normal[rid], 1)
                    for rid in series
                },
            }
        )
    return {
        "source": f"{PRECIP_SOURCE}; ENSO phase from {SOURCE} Niño 3.4 (ONI method)",
        "baseline": f"{BASELINE[0]}–{BASELINE[1]}",
        "season": "DJF",
        "regions": [{"id": rid, "name": name} for rid, name, _ in RAIN_REGIONS],
        "winters": winters,
    }


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------


def clean(value: float, digits: int = 3) -> float | None:
    """NaN → None; otherwise rounded, and never '-0.0'."""
    if not math.isfinite(value):
        return None
    return round(float(value), digits) + 0.0


def write_json(path: Path, payload: dict) -> int:
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    path.write_text(text + "\n", encoding="utf-8")
    return path.stat().st_size


def human_size(size: int) -> str:
    return f"{size / 1024:.1f} KB" if size < 1 << 20 else f"{size / (1 << 20):.2f} MB"


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the story's JSON from ERSST v5 and GPCP.")
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_DATA_DIR,
        help="ERSST v5 NetCDF file, or a directory of them (default: scripts/data/)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="where to write JSON (default: src/assets/data/)",
    )
    parser.add_argument(
        "--download",
        action="store_true",
        help="fetch ERSST v5 and GPCP from NOAA PSL into scripts/data/ if missing",
    )
    args = parser.parse_args()

    try:
        if args.download:
            download(DEFAULT_DATA_DIR)

        sst, described = open_sst(args.input)
        keys = month_keys(sst)
        print(f"Input: {described}, {keys[0]} to {keys[-1]}")

        args.output.mkdir(parents=True, exist_ok=True)
        written: list[tuple[str, int]] = []

        def emit(name: str, payload: dict) -> None:
            written.append((name, write_json(args.output / name, payload)))

        nino34 = index_file(sst, keys, NINO34, "Niño 3.4 region (5°N–5°S, 170°W–120°W)")
        emit("nino34-index.json", nino34)
        emit("nino12-index.json", index_file(sst, keys, NINO12, "Niño 1+2 region (0–10°S, 90°W–80°W)"))

        climatology = monthly_climatology(sst, keys)
        for key in GRID_MONTHS:
            emit(f"sst-anomaly-{key.replace('-', '')}.json", anomaly_grid(sst, keys, climatology, key))

        episodes = enso_episodes(sst, keys)
        emit("enso-episodes.json", episodes)
        emit("global-sst.json", global_sst(sst, keys))

        precip = open_precip(DEFAULT_DATA_DIR / PRECIP_NAME)
        if precip is None:
            print(f"warning: {PRECIP_NAME} not found in scripts/data/; skipping rainfall-winters.json")
        else:
            emit("rainfall-winters.json", rainfall_winters(precip, sst, keys))
    except PreprocessError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    counts = {p: sum(e["phase"] == p for e in episodes["episodes"]) for p in ("el-nino", "la-nina")}
    print()
    months = nino34["months"]
    print(f"Niño 3.4 index: {len(months)} months ({months[0]['month']} to {months[-1]['month']})")
    print(f"ENSO episodes: {counts['el-nino']} El Niño, {counts['la-nina']} La Niña")
    print(f"Grid files: {len(GRID_MONTHS)}")
    print(f"Written to {args.output}:")
    for name, size in written:
        print(f"  {name:<28} {human_size(size):>10}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
