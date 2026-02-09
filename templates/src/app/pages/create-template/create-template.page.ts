import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { form, required, FormField, submit, type FieldTree } from '@angular/forms/signals';
import {
  SumInputComponent,
  SumTextareaComponent,
  SumSelectComponent,
  SumAttachComponent,
  SumBtnComponent,
  SumDatepickerComponent
} from 'ux';
import { Api } from '../../../../api/api';
import { createTemplate, getTemplate, updateTemplate } from '../../../../api/functions';
import { TEMPLATE_CATEGORY } from '../../../../api/models/template-category-array';
import { DOCUMENT_TYPE } from '../../../../api/models/document-type-array';
import type { TemplateCategory } from '../../../../api/models/template-category';
import type { DocumentType } from '../../../../api/models/document-type';
import type { ErrorResponse } from '../../../../api/models/error-response';

interface TemplateFormModel {
  code: string;
  name: string;
  description: string;
  category: TemplateCategory | null;
  documentType: DocumentType | null;
  startDate: Date | null;
  endDate: Date | null;
  file: File[];
}

@Component({
  selector: 'app-create-template',
  standalone: true,
  imports: [
    FormField,
    SumInputComponent,
    SumTextareaComponent,
    SumSelectComponent,
    SumAttachComponent,
    SumBtnComponent,
    SumDatepickerComponent
  ],
  templateUrl: './create-template.page.html',
  styleUrl: './create-template.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateTemplatePage {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly editId = signal<string | null>(null);
  readonly isEditMode = signal(false);
  readonly loadingTemplate = signal(false);

  readonly model = signal<TemplateFormModel>({
    code: '',
    name: '',
    description: '',
    category: null,
    documentType: null,
    startDate: null,
    endDate: null,
    file: []
  });

  readonly templateForm = form(this.model, f => {
    required(f.code, { message: 'El codigo es obligatorio' });
    required(f.name, { message: 'El nombre es obligatorio' });
    required(f.file, { message: 'El archivo es obligatorio' });
  });

  readonly categoryOptions = TEMPLATE_CATEGORY.map(v => ({ label: v, value: v }));
  readonly documentTypeOptions = DOCUMENT_TYPE.map(v => ({
    label: v.replace(/_/g, ' '),
    value: v
  }));

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      this.isEditMode.set(true);
      this.loadTemplate(id);
    }
  }

  private async loadTemplate(id: string) {
    this.loadingTemplate.set(true);
    try {
      const template = await this.api.invoke(getTemplate, { id });
      this.model.set({
        code: template.code,
        name: template.name ?? '',
        description: template.description ?? '',
        category: template.category ?? null,
        documentType: template.documentType ?? null,
        startDate: template.startDate ? new Date(template.startDate) : null,
        endDate: template.endDate ? new Date(template.endDate) : null,
        file: []
      });
    } catch {
      // navigate back if template not found
      this.router.navigate(['..'], { relativeTo: this.route });
    } finally {
      this.loadingTemplate.set(false);
    }
  }

  onSubmit() {
    submit(this.templateForm, async f => {
      const value = this.model();
      try {
        if (this.isEditMode()) {
          await this.api.invoke(updateTemplate, {
            id: this.editId()!,
            body: {
              file: value.file[0] ?? undefined,
              name: value.name,
              description: value.description || undefined,
              category: value.category ?? undefined,
              documentType: value.documentType ?? undefined,
              startDate: value.startDate?.toISOString() ?? undefined,
              endDate: value.endDate?.toISOString() ?? undefined
            }
          });
        } else {
          await this.api.invoke(createTemplate, {
            body: {
              file: value.file[0],
              tenantId: 'default',
              code: value.code,
              name: value.name,
              description: value.description || undefined,
              category: value.category ?? undefined,
              documentType: value.documentType ?? undefined,
              startDate: value.startDate?.toISOString() ?? undefined,
              endDate: value.endDate?.toISOString() ?? undefined
            }
          });
        }
        this.router.navigate(['..'], { relativeTo: this.route });
        return null;
      } catch (error) {
        if (error instanceof HttpErrorResponse) {
          const errorResponse = error.error as ErrorResponse;
          if (errorResponse.errors?.length) {
            const fieldMap: Record<string, FieldTree<unknown>> = {
              code: f.code,
              name: f.name,
              description: f.description,
              category: f.category,
              documentType: f.documentType,
              startDate: f.startDate,
              endDate: f.endDate,
              file: f.file
            };
            return errorResponse.errors.map(e => ({
              kind: 'server' as const,
              message: e.message ?? 'Error de validacion',
              ...(e.field && fieldMap[e.field] ? { fieldTree: fieldMap[e.field] } : {})
            }));
          }
          return { kind: 'server', message: errorResponse.message ?? 'Error del servidor' };
        }
        return { kind: 'server', message: 'Error de conexion' };
      }
    });
  }

  onCancel() {
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}
