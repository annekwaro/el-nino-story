#!/usr/bin/env python3
"""
Build the El Niño story's data files from NOAA ERSST v5.

Outputs (default: src/assets/data/), matching src/app/core/data/climate-data.ts:

  nino34-index.json          Nino34IndexFile: monthly Niño 3.4 anomaly, 1950-01 to OBSERVED_THROUGH
  sst-anomaly-YYYYMM.json    SstAnomalyFile: Pacific SST anomaly grid for one month

Both are anomalies against the 1991–2020 monthly climatology.

Input is either one multi-year NetCDF file (NOAA PSL's sst.mnmean.nc, or an
ersst.v5.YYYYMM-YYYYMM.nc) or a directory of NCEI monthly files (ersst.v5.YYYYMM.nc).

    python scripts/preprocess.py --download     # fetch sst.mnmean.nc into scripts/data/ first
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

# NOAA PSL's single-file copy of ERSST v5 (1854–present, updated monthly).
DOWNLOAD_URL = "https://downloads.psl.noaa.gov/Datasets/noaa.ersst.v5/sst.mnmean.nc"
DOWNLOAD_NAME = "sst.mnmean.nc"

SOURCE = "NOAA ERSST v5"
BASELINE = (1991, 2020)
INDEX_START = "1950-01"
# Last month written to the index. Later months in the input are ignored.
OBSERVED_THROUGH = "2025-09"

# Niño 3.4: 5°N–5°S, 170°W–120°W (190°E–240°E).
NINO34 = {"south": -5.0, "north": 5.0, "west": 190.0, "east": 240.0}

# Map window for the grid files: tropical Pacific, Indonesia to South America.
MAP = {"south": -30.0, "north": 30.0, "west": 120.0, "east": 290.0}

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
    target = data_dir / DOWNLOAD_NAME
    if target.exists():
        print(f"Already present: {target.relative_to(REPO_ROOT)}")
        return

    import requests

    data_dir.mkdir(parents=True, exist_ok=True)
    partial = target.with_suffix(".nc.part")
    print(f"Downloading {DOWNLOAD_URL}")
    try:
        with requests.get(DOWNLOAD_URL, stream=True, timeout=60) as response:
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
            f"Download it manually from:\n  {DOWNLOAD_URL}\n"
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
        single = sorted(path.glob(DOWNLOAD_NAME)) + sorted(path.glob("ersst.v5.??????-??????.nc"))
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
                f"Run with --download, or put {DOWNLOAD_NAME} (or ersst.v5.YYYYMM.nc monthly files) there."
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

    sst = sst.assign_coords(lon=(sst["lon"] % 360)).sortby("lon").sortby("lat")
    return sst.load(), described


def month_keys(sst: xr.DataArray) -> np.ndarray:
    """'YYYY-MM' for every time step. Matches on calendar month, whatever day the timestamp uses."""
    years = sst["time"].dt.year.values
    months = sst["time"].dt.month.values
    keys = np.array([f"{y:04d}-{m:02d}" for y, m in zip(years, months)])
    if len(set(keys)) != len(keys):
        raise PreprocessError("Input has more than one time step for the same month.")
    return keys


def monthly_climatology(series: xr.DataArray, keys: np.ndarray) -> xr.DataArray:
    """Mean for each calendar month over the baseline years, indexed by month (1–12)."""
    start, end = BASELINE
    years = np.array([int(k[:4]) for k in keys])
    in_baseline = (years >= start) & (years <= end)
    expected = (end - start + 1) * 12
    if in_baseline.sum() != expected:
        raise PreprocessError(
            f"Baseline {start}–{end} needs {expected} months; input has {in_baseline.sum()}."
        )
    return series.isel(time=in_baseline).groupby("time.month").mean("time")


# ---------------------------------------------------------------------------
# Niño 3.4 index
# ---------------------------------------------------------------------------


def nino34_index(sst: xr.DataArray, keys: np.ndarray) -> list[dict]:
    box = sst.sel(
        lat=slice(NINO34["south"], NINO34["north"]),
        lon=slice(NINO34["west"], NINO34["east"]),
    )
    if box.sizes["lat"] == 0 or box.sizes["lon"] == 0:
        raise PreprocessError("Niño 3.4 region selects no grid cells. Check the input's lat/lon.")

    # Area-weighted mean: cells shrink with cos(latitude).
    weights = np.cos(np.deg2rad(box["lat"]))
    regional = box.weighted(weights).mean(dim=("lat", "lon"), skipna=True)

    climatology = monthly_climatology(regional, keys)
    anomaly = regional.groupby("time.month") - climatology

    months = []
    for key, value in zip(keys, anomaly.values):
        if key < INDEX_START or key > OBSERVED_THROUGH:
            continue
        if not math.isfinite(value):
            raise PreprocessError(f"Niño 3.4 anomaly is missing for {key}.")
        months.append({"month": key, "anomaly": clean(value)})

    check_contiguous([m["month"] for m in months])
    return months


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
    frame = frame.sel(lat=slice(MAP["south"], MAP["north"]), lon=slice(MAP["west"], MAP["east"]))

    return {
        "month": key,
        "source": SOURCE,
        "baseline": f"{BASELINE[0]}–{BASELINE[1]}",
        "lats": [round(float(v), 2) for v in frame["lat"].values],
        "lons": [round(float(v), 2) for v in frame["lon"].values],
        # Land (NaN) stays in the grid as null so every row has one value per longitude.
        "values": [[clean(v) for v in row] for row in frame.transpose("lat", "lon").values],
    }


def clean(value: float) -> float | None:
    """NaN → None; otherwise 3 decimals, and never '-0.0'."""
    if not math.isfinite(value):
        return None
    return round(float(value), 3) + 0.0


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------


def write_json(path: Path, payload: dict) -> int:
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    path.write_text(text + "\n", encoding="utf-8")
    return path.stat().st_size


def human_size(size: int) -> str:
    return f"{size / 1024:.1f} KB" if size < 1 << 20 else f"{size / (1 << 20):.2f} MB"


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Niño 3.4 and SST anomaly JSON from ERSST v5.")
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
        help=f"fetch {DOWNLOAD_NAME} from NOAA PSL into scripts/data/ if missing",
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

        months = nino34_index(sst, keys)
        index = {
            "source": f"{SOURCE}, Niño 3.4 region (5°N–5°S, 170°W–120°W), area-weighted",
            "baseline": f"{BASELINE[0]}–{BASELINE[1]}",
            "months": months,
        }
        path = args.output / "nino34-index.json"
        written.append((path.name, write_json(path, index)))

        climatology = monthly_climatology(sst, keys)
        for key in GRID_MONTHS:
            path = args.output / f"sst-anomaly-{key.replace('-', '')}.json"
            written.append((path.name, write_json(path, anomaly_grid(sst, keys, climatology, key))))
    except PreprocessError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    print()
    print(f"Niño 3.4 index: {len(months)} months ({months[0]['month']} to {months[-1]['month']})")
    print(f"Grid files: {len(GRID_MONTHS)}")
    print(f"Written to {args.output}:")
    for name, size in written:
        print(f"  {name:<28} {human_size(size):>10}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
