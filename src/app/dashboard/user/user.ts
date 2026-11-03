import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BulkUser } from './bulk-user/bulk-user';

@Component({
  selector: 'app-user',
  imports: [BulkUser],
  templateUrl: './user.html',
  styleUrl: './user.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class User {}
