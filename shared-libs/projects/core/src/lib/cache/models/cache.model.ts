import { HttpResponse } from '@angular/common/http';

export interface CacheEntry {
  url: string;
  response: HttpResponse<unknown>;
  entryTime: number;
}
