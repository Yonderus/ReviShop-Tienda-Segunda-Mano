import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BlockingSpinnerComponent } from './shared/components/blocking-spinner/blocking-spinner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BlockingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<router-outlet /><app-blocking-spinner />',
})
export class AppComponent {}
