import { HttpContextToken } from '@angular/common/http';

/* HTTP context token to bypass all interceptors when set to true */
export const BYPASS_INTERCEPTORS = new HttpContextToken<boolean>(() => false);
