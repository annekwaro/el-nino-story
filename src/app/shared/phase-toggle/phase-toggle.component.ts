import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { EnsoPhase } from '../../core/data/climate-data';

/** El Niño / La Niña segmented switch. Two-way bind with [(phase)]. */
@Component({
  selector: 'el-phase-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toggle" role="group" [attr.aria-label]="label()">
      @for (option of options; track option.value) {
        <button
          type="button"
          class="toggle__option"
          [class.toggle__option--warm]="option.value === 'el-nino'"
          [class.toggle__option--cool]="option.value === 'la-nina'"
          [attr.aria-pressed]="phase() === option.value"
          (click)="phase.set(option.value)"
        >
          {{ option.name }}
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: inline-block;
    }
    .toggle {
      display: inline-flex;
      padding: 3px;
      border: 1px solid var(--el-rule);
      border-radius: 999px;
    }
    .toggle__option {
      padding: var(--el-space-1) var(--el-space-4);
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: var(--el-ink-muted);
      font: inherit;
      font-size: var(--el-text-sm);
      font-weight: 500;
      cursor: pointer;
      transition:
        background-color var(--el-duration-fast) var(--el-ease-out),
        color var(--el-duration-fast) var(--el-ease-out);
    }
    .toggle__option:hover {
      color: var(--el-ink);
    }
    .toggle__option[aria-pressed='true'] {
      color: var(--el-bg);
    }
    .toggle__option--warm[aria-pressed='true'] {
      background: var(--el-accent-warm);
    }
    .toggle__option--cool[aria-pressed='true'] {
      background: var(--el-accent-cool);
    }
    @media (prefers-reduced-motion: reduce) {
      .toggle__option {
        transition: none;
      }
    }
  `,
})
export class PhaseToggleComponent {
  readonly phase = model.required<EnsoPhase>();
  readonly label = input('Show');

  protected readonly options: readonly { value: EnsoPhase; name: string }[] = [
    { value: 'el-nino', name: 'El Niño' },
    { value: 'la-nina', name: 'La Niña' },
  ];
}
