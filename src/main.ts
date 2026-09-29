import { inject, provideAppInitializer } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/core/interceptors/auth-interceptor';
import { AuthService } from './app/core/services/auth.service';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    // HttpClient for talking to the Laravel API; every request passes through authInterceptor.
    provideHttpClient(withInterceptors([authInterceptor])),
    // Before the first route is chosen, restore a saved login (token → GET /auth/me), so the
    // guards already know whether someone is logged in. Closing and reopening the app keeps the login.
    provideAppInitializer(() => inject(AuthService).restoreSession()),
  ],
});
