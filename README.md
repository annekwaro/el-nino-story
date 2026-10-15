# ElNinoStory

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.27.

# El Niño: The Ocean That Rewrites Weather

A scrollytelling data story about ENSO and global water availability.
Data from NOAA ERSST v5 (1854–present). Built with Angular 19, D3, and
Scrollama-free IntersectionObserver scroll detection.

**Live:** [https://el-nino-story.vercel.app/]

## What it does
- Hero: 75-year Niño 3.4 index drawn in on load
- Chapter 2: Interactive explorer — scrub through 10 significant ENSO events
- Chapter 3: Timeline of the events that shaped climate memory
- (Chapters 4–6: in progress)

## Data pipeline
NOAA ERSST v5 → Python preprocessing (`scripts/preprocess.py`) → JSON → Angular

## Stack
Angular 19 · Signals · OnPush · D3 (math only) · Self-hosted fonts · Deployed on Vercel

