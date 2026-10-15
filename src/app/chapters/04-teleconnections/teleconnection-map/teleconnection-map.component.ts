import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { geoArea, geoEqualEarth, geoPath } from 'd3';
import type { Feature, Polygon, Position } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import landTopology from 'world-atlas/land-110m.json';
import { injectElementWidth } from '../../../core/dom/element-width';
import { Impact, REGIONS } from '../teleconnections';

const topology = landTopology as unknown as Topology<{ land: GeometryCollection }>;
const LAND = feature(topology, topology.objects.land);

/** Niño 3.4: 5°N–5°S, 170°W–120°W. */
const NINO34 = box(-170, -120, -5, 5);

/** Equal Earth, centred on the Pacific so the source region sits mid-frame. */
const CENTRE_LON = 160;
const ASPECT = 0.5;

/**
 * World map of typical ENSO impacts: regions as schematic ellipses, numbered to match
 * the list beside it. D3 projects and builds path strings; Angular renders them.
 */
@Component({
  selector: 'el-teleconnection-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './teleconnection-map.component.html',
  styleUrl: './teleconnection-map.component.scss',
})
export class TeleconnectionMapComponent {
  readonly impacts = input.required<readonly Impact[]>();
  readonly label = input.required<string>();

  protected readonly width = injectElementWidth();
  protected readonly height = computed(() => Math.round(this.width() * ASPECT));
  /** Smaller markers on phones, where full-size ones would hide the regions. */
  protected readonly compact = computed(() => this.width() < 560);

  private readonly projection = computed(() =>
    geoEqualEarth()
      .rotate([-CENTRE_LON, 0])
      .fitSize([this.width(), this.height()], { type: 'Sphere' }),
  );
  private readonly path = computed(() => geoPath(this.projection()));

  protected readonly sphere = computed(() => this.path()({ type: 'Sphere' }) ?? '');
  protected readonly land = computed(() => this.path()(LAND) ?? '');
  protected readonly box = computed(() => this.path()(NINO34) ?? '');
  protected readonly boxLabel = computed(() => this.projection()([-145, 7]) ?? [0, 0]);

  protected readonly regions = computed(() => {
    const path = this.path();
    const projection = this.projection();
    return this.impacts().map((impact, i) => {
      const { center, radii } = REGIONS[impact.region];
      const [x, y] = projection(center) ?? [0, 0];
      return {
        id: impact.region,
        effect: impact.effect,
        number: i + 1,
        d: path(ellipse(center, radii)) ?? '',
        x,
        y,
      };
    });
  });
}

/** Ellipse in lon/lat degrees, sampled as a polygon. */
function ellipse([cx, cy]: [number, number], [rx, ry]: [number, number]): Feature<Polygon> {
  const steps = 48;
  const ring: Position[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (-2 * Math.PI * i) / steps;
    ring.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
  }
  return polygon(ring);
}

/**
 * Lat/lon rectangle. Edges are sampled every degree so they follow the parallels;
 * d3-geo would otherwise join the corners with great-circle arcs.
 */
function box(west: number, east: number, south: number, north: number): Feature<Polygon> {
  const ring: Position[] = [];
  for (let lon = west; lon <= east; lon++) ring.push([lon, north]);
  for (let lon = east; lon >= west; lon--) ring.push([lon, south]);
  ring.push([west, north]);
  return polygon(ring);
}

/** d3-geo reads a ring's winding as which side is inside; flip any that would cover the globe. */
function polygon(ring: Position[]): Feature<Polygon> {
  const shape: Feature<Polygon> = {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
  if (geoArea(shape) > 2 * Math.PI) ring.reverse();
  return shape;
}
