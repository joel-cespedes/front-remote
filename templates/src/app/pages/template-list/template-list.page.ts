import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';
import { Tag } from 'primeng/tag';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SumBtnComponent, SumSelectComponent } from 'ux';
import { Api } from '../../../../api/api';
import { getTemplates, deleteTemplate } from '../../../../api/functions';
import { TEMPLATE_CATEGORY } from '../../../../api/models/template-category-array';
import { DOCUMENT_TYPE } from '../../../../api/models/document-type-array';
import type { Template } from '../../../../api/models/template';
import type { TemplateCategory } from '../../../../api/models/template-category';
import type { DocumentType } from '../../../../api/models/document-type';
import type { TemplateStatus } from '../../../../api/models/template-status';

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [
    DatePipe,
    TableModule,
    ConfirmDialog,
    Toast,
    Tag,
    SumBtnComponent,
    SumSelectComponent
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './template-list.page.html',
  styleUrl: './template-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TemplateListPage {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly templates = signal<Template[]>([]);
  readonly loading = signal(false);

  readonly categoryFilter = signal<TemplateCategory | null>(null);
  readonly documentTypeFilter = signal<DocumentType | null>(null);

  readonly categoryOptions = TEMPLATE_CATEGORY.map(v => ({ label: v, value: v }));
  readonly documentTypeOptions = DOCUMENT_TYPE.map(v => ({
    label: v.replace(/_/g, ' '),
    value: v
  }));

  readonly filteredTemplates = signal<Template[]>([]);

  constructor() {
    this.loadTemplates();
  }

  async loadTemplates() {
    this.loading.set(true);
    try {
      const response = await this.api.invoke(getTemplates, { tenantId: 'default' });
      this.templates.set(response.data ?? []);
      this.applyFilters();
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar las plantillas'
      });
    } finally {
      this.loading.set(false);
    }
  }

  applyFilters() {
    let result = this.templates();
    const category = this.categoryFilter();
    const docType = this.documentTypeFilter();

    if (category) {
      result = result.filter(t => t.category === category);
    }
    if (docType) {
      result = result.filter(t => t.documentType === docType);
    }
    this.filteredTemplates.set(result);
  }

  onCategoryChange(value: unknown) {
    this.categoryFilter.set(value as TemplateCategory | null);
    this.applyFilters();
  }

  onDocumentTypeChange(value: unknown) {
    this.documentTypeFilter.set(value as DocumentType | null);
    this.applyFilters();
  }

  statusSeverity(status: TemplateStatus): 'success' | 'warn' | 'danger' {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'warn';
      case 'ARCHIVED': return 'danger';
    }
  }

  onCreate() {
    this.router.navigate(['create'], { relativeTo: this.route });
  }

  onView(template: Template) {
    this.router.navigate(['edit', template.templateId], { relativeTo: this.route });
  }

  onEdit(template: Template) {
    this.router.navigate(['edit', template.templateId], { relativeTo: this.route });
  }

  onDelete(template: Template) {
    this.confirmationService.confirm({
      message: `¿Quieres eliminar la plantilla ${template.name}?`,
      header: 'Confirmar eliminacion',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        try {
          await this.api.invoke(deleteTemplate, { id: template.templateId });
          this.messageService.add({
            severity: 'success',
            summary: 'Eliminada',
            detail: `La plantilla ${template.name} ha sido eliminada`
          });
          this.loadTemplates();
        } catch {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo eliminar la plantilla'
          });
        }
      }
    });
  }
}
