import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Product } from '../../models/product.model';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      @for (product of products(); track product._id; let i = $index) {
        <li>
          <app-product-card
            [product]="product"
            [priority]="i < 4"
            [deleting]="deletingId() === product._id"
            (remove)="remove.emit($event)"
          />
        </li>
      }
    </ul>
  `,
})
export class ProductGridComponent {
  readonly products = input.required<Product[]>();
  readonly deletingId = input<string | null>(null);
  readonly remove = output<Product>();
}
