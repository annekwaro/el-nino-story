import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { EnsoPhase } from '../../core/data/climate-data';
import { TeleconnectionMapComponent } from './teleconnection-map/teleconnection-map.component';
import { EFFECT_LABEL, IMPACTS, REGIONS } from './teleconnections';

const PHASE_NAME: Record<EnsoPhase, string> = { 'el-nino': 'El Niño', 'la-nina': 'La Niña' };

@Component({
  selector: 'el-teleconnections',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TeleconnectionMapComponent],
  templateUrl: './teleconnections.component.html',
  styleUrl: './teleconnections.component.scss',
})
export class TeleconnectionsComponent {
  protected readonly phases: readonly EnsoPhase[] = ['el-nino', 'la-nina'];
  protected readonly phaseName = PHASE_NAME;
  protected readonly effectLabel = EFFECT_LABEL;

  protected readonly phase = signal<EnsoPhase>('el-nino');

  protected readonly impacts = computed(() => IMPACTS[this.phase()]);

  protected readonly items = computed(() =>
    this.impacts().map((impact) => ({ ...impact, name: REGIONS[impact.region].name })),
  );

  protected readonly mapLabel = computed(
    () =>
      `World map of typical ${PHASE_NAME[this.phase()]} impacts, December to February. ` +
      this.items()
        .map((item, i) => `${i + 1}: ${item.name}, ${EFFECT_LABEL[item.effect].toLowerCase()}.`)
        .join(' '),
  );
}
