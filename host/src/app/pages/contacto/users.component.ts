import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe, JsonPipe } from '@angular/common';

interface UserDetail {
  clienteId: number;
  nombre: string;
  documento: string;
  deuda: number;
  origen: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CurrencyPipe, JsonPipe],
  template: `
    @if (user) {
      <div class="mv-container p-t-48">
        <h1 class="sum-h2">Detalle de usuario</h1>
        <div class="user-detail mv-grid mv-gap-16 m-t-24">
          <div class="mv-col-6"><strong>ID:</strong> {{ user.clienteId }}</div>
          <div class="mv-col-6"><strong>Nombre:</strong> {{ user.nombre }}</div>
          <div class="mv-col-6"><strong>Documento:</strong> {{ user.documento }}</div>
          <div class="mv-col-6"><strong>Deuda:</strong> {{ user.deuda | currency:'EUR' }}</div>
          <div class="mv-col-12"><strong>Origen:</strong> {{ user.origen }}</div>
        </div>
        <pre class="m-t-24">{{ user | json }}</pre>
      </div>
    } @else {
      <div class="mv-container p-t-48">
        <h1 class="sum-h2">Usuarios</h1>
        <p class="sum-body m-t-16">Selecciona un usuario desde la app legacy para ver su detalle.</p>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent {
  readonly user: UserDetail | null;

  constructor() {
    const state = inject(Router).getCurrentNavigation()?.extras.state;
    this.user = state && 'clienteId' in state ? (state as UserDetail) : null;
  }
}
