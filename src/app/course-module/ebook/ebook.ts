import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  createEbookSettings,
  EbookActivity,
  EbookElement,
  EbookElementKind,
  EbookElementSettings,
  EbookService,
  EbookTemplate,
  EbookTextType,
} from './ebook.service';

type NumericSetting =
  | 'opacity' | 'shadowHorizontalOffset' | 'shadowVerticalOffset' | 'shadowBlur'
  | 'borderTop' | 'borderRight' | 'borderBottom' | 'borderLeft' | 'borderRadius'
  | 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft'
  | 'marginTop' | 'marginRight' | 'marginBottom' | 'marginLeft'
  | 'overlayOpacity' | 'dividerWidth' | 'dividerHeight';
type ColorSetting = 'textColor' | 'shadowColor' | 'boxColor' | 'borderColor' | 'backgroundColor' | 'overlayColor' | 'dividerFill';
type BooleanSetting = 'overlayEnabled' | 'topDivider' | 'bottomDivider' | 'dividerStackingOrder' | 'dividerHorizontalFlip';
type SelectSetting = 'textType' | 'fontFamily' | 'textShadowPosition' | 'alignment' | 'height' | 'width' | 'borderStyle' | 'columns' | 'backgroundType' | 'scrollEffect';

@Component({
  selector: 'app-ebook',
  imports: [],
  templateUrl: './ebook.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class Ebook implements OnInit {
  readonly courseId = input<number | null>(null);
  readonly sectionId = input<number | null>(null);
  readonly activityId = input<number | null>(null);
  readonly embedded = input(false);
  readonly previewOnly = input(false);
  readonly courseLabel = input<string | null>(null);
  readonly saved = output<EbookActivity>();
  readonly closed = output<void>();

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ebookService = inject(EbookService);
  private elementIdSeed = Date.now() * 100;

  readonly courseName = signal('Course List');
  readonly courseIdValue = signal(0);
  readonly sectionIdValue = signal(0);
  readonly activity = signal<EbookActivity>(this.emptyActivity());
  readonly selectedElementId = signal<number | null>(null);
  readonly previewMode = signal(false);
  readonly showTemplateDialog = signal(true);
  readonly showElementsDialog = signal(false);
  readonly showImportDialog = signal(false);
  readonly pickedTemplate = signal<EbookTemplate | null>(null);
  readonly pendingFile = signal<EbookActivity['uploadedFile'] | null>(null);
  readonly activityName = signal('');
  readonly activeCategory = signal<EbookElementKind>('Ebook Covers');
  readonly isSaving = signal(false);
  readonly isDirty = signal(false);
  readonly successMessage = signal('');
  readonly formError = signal('');
  readonly selectedElement = computed(() =>
    this.activity().elements.find(element => element.id === this.selectedElementId()) ?? null,
  );
  readonly readonlyMode = computed(() => this.previewOnly() || this.previewMode());
  readonly importedEbooks = computed(() =>
    this.ebookService.all().filter(item => item.id !== this.activity().id),
  );
  private readonly templateDialogRef = viewChild<ElementRef<HTMLDialogElement>>('templateDialog');
  private readonly elementsDialogRef = viewChild<ElementRef<HTMLDialogElement>>('elementsDialog');
  private readonly importDialogRef = viewChild<ElementRef<HTMLDialogElement>>('importDialog');

  readonly templateOptions: ReadonlyArray<{ value: EbookTemplate; label: string }> = [
    { value: 'blank', label: 'Blank Ebook' },
    { value: 'welcome', label: 'Welcome' },
    { value: 'course-overview', label: 'Course Overview' },
    { value: 'summary', label: 'Summary' },
  ];
  readonly elementCategories: EbookElementKind[] = [
    'Ebook Covers', 'Media & Text', 'Counters', 'Download File', 'External Content', 'Team & Authors', 'Own Layout',
  ];
  readonly designCards = [0, 1, 2, 3, 4];
  readonly textTypes: EbookTextType[] = [
    'Ebook Heading 1', 'Ebook Heading 2', 'Ebook Heading 3', 'Ebook Heading 4', 'Ebook Main Text',
  ];
  readonly fontFamilies: EbookElementSettings['fontFamily'][] = ['Work Sans', 'Nunito Sans', 'Source Sans Pro'];
  readonly textShadowPositions: EbookElementSettings['textShadowPosition'][] = ['None', 'Left', 'Right', 'Bottom', 'Round'];
  readonly alignments: EbookElementSettings['alignment'][] = ['Left', 'Center', 'Right'];
  readonly heights: EbookElementSettings['height'][] = ['Extra Small', 'Small', 'Normal', 'Large', 'Extra Large'];
  readonly widths: EbookElementSettings['width'][] = ['Full', 'Wide', 'Normal', 'Narrow'];
  readonly borderStyles: EbookElementSettings['borderStyle'][] = ['No Border', 'Solid', 'Dashed', 'Dotted'];
  readonly backgroundTypes: EbookElementSettings['backgroundType'][] = ['Color', 'Image', 'Video', 'Embed', 'SVG'];
  readonly scrollEffects: EbookElementSettings['scrollEffect'][] = ['None', 'Zoom in', 'Zoom out', 'Parallax', 'Close up', 'Push Away', 'Fixed'];

  constructor() {
    effect(() => this.syncDialog(this.templateDialogRef(), this.showTemplateDialog()));
    effect(() => this.syncDialog(this.elementsDialogRef(), this.showElementsDialog()));
    effect(() => this.syncDialog(this.importDialogRef(), this.showImportDialog()));
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.courseIdValue.set(this.courseId() ?? (Number(params.get('courseId')) || 0));
    this.sectionIdValue.set(this.sectionId() ?? (Number(params.get('sectionId')) || 0));
    this.courseName.set(this.courseLabel() || params.get('courseName') || 'Course List');
    const id = this.activityId() ?? (Number(params.get('ebookId')) || null);
    const current = id ? this.ebookService.get(id) : null;
    if (current) {
      this.activity.set(current);
      this.activityName.set(current.name);
      this.selectedElementId.set(current.elements[0]?.id ?? null);
      this.showTemplateDialog.set(false);
    }
  }

  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.isDirty()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  onTemplateCancel(event: Event): void {
    event.preventDefault();
    this.closeEditor();
  }

  onElementsCancel(event: Event): void {
    event.preventDefault();
    this.showElementsDialog.set(false);
  }

  onImportCancel(event: Event): void {
    event.preventDefault();
    this.showImportDialog.set(false);
  }

  chooseTemplate(template: EbookTemplate): void {
    this.pickedTemplate.set(template);
    this.formError.set('');
  }


  setActivityName(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.activityName.set(target.value.slice(0, 100));
    this.formError.set('');
    if (!this.showTemplateDialog()) {
      this.activity.update(current => ({ ...current, name: this.activityName() }));
      this.markDirty();
    }
  }

  openElementsDialog(): void {
    this.showElementsDialog.set(true);
  }

  togglePreview(): void {
    this.previewMode.update(value => !value);
  }

  textShadow(element: EbookElement): string {
    const settings = element.settings;
    if (settings.textShadowPosition === 'None') return 'none';
    let x = settings.shadowHorizontalOffset;
    let y = settings.shadowVerticalOffset;
    if (settings.textShadowPosition === 'Left') x = x || -2;
    if (settings.textShadowPosition === 'Right') x = x || 2;
    if (settings.textShadowPosition === 'Bottom') y = y || 2;
    if (settings.textShadowPosition === 'Round') {
      x = x || 1;
      y = y || 1;
    }
    return `${x}px ${y}px ${settings.shadowBlur}px ${settings.shadowColor}`;
  }

  overlayShadow(element: EbookElement): string {
    const settings = element.settings;
    if (!settings.overlayEnabled) return 'none';
    const alpha = Math.round(settings.overlayOpacity * 2.55).toString(16).padStart(2, '0');
    return `inset 0 0 0 999px ${settings.overlayColor}${alpha}`;
  }

  elementWidth(element: EbookElement): string {
    return {
      Full: '100%',
      Wide: '85%',
      Normal: '65%',
      Narrow: '45%',
    }[element.settings.width];
  }

  elementHeight(element: EbookElement): string {
    return {
      'Extra Small': '4rem',
      Small: '6rem',
      Normal: '9rem',
      Large: '13rem',
      'Extra Large': '18rem',
    }[element.settings.height];
  }

  textTypeSize(element: EbookElement): string {
    return {
      'Ebook Heading 1': '1.85rem',
      'Ebook Heading 2': '1.5rem',
      'Ebook Heading 3': '1.2rem',
      'Ebook Heading 4': '1rem',
      'Ebook Main Text': '0.9rem',
    }[element.settings.textType];
  }

  startEbook(): void {
    const name = this.activityName().trim();
    const template = this.pickedTemplate();
    if (!template) {
      this.formError.set('Choose an Ebook type to continue.');
      return;
    }
    if (!name) {
      this.formError.set('Activity Name is required.');
      return;
    }
    if (name.length > 100) {
      this.formError.set('Activity Name must not exceed 100 characters.');
      return;
    }
    const now = new Date().toISOString();
    const elements = this.defaultElements(template);
    if (this.pendingFile()) {
      const fileElement = this.createElement('Download File', 0, this.pendingFile()!.name);
      fileElement.content = this.pendingFile()!.name;
      fileElement.attachment = this.pendingFile()!;
      elements.push(fileElement);
    }
    const activity: EbookActivity = {
      id: 0,
      courseId: this.courseIdValue(),
      sectionId: this.sectionIdValue(),
      name,
      template,
      elements,
      createdAt: now,
      updatedAt: now,
      ...(this.pendingFile() ? { uploadedFile: this.pendingFile()! } : {}),
    };
    if (!this.persist(activity, false)) return;
    this.showTemplateDialog.set(false);
    this.showElementsDialog.set(template === 'blank');
  }

  openImport(): void {
    this.formError.set('');
    this.showImportDialog.set(true);
  }

  importExisting(source: EbookActivity): void {
    let copy: EbookActivity;
    let nextElementId = Date.now();
    try {
      copy = this.ebookService.save({
        ...source,
        id: 0,
        courseId: this.courseIdValue(),
        sectionId: this.sectionIdValue(),
        name: `${source.name} (Imported)`.slice(0, 100),
        elements: source.elements.map(element => ({ ...element, id: nextElementId++, settings: { ...element.settings } })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch {
      this.formError.set('Something went wrong. Please try again later.');
      return;
    }
    this.activity.set(copy);
    this.activityName.set(copy.name);
    this.showImportDialog.set(false);
    this.showTemplateDialog.set(false);
    this.selectedElementId.set(copy.elements[0]?.id ?? null);
    this.isDirty.set(false);
    this.saved.emit(copy);
  }

  onFileSelected(event: Event): void {
    const inputElement = event.target;
    if (!(inputElement instanceof HTMLInputElement)) return;
    const file = inputElement.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const name = this.activityName().trim() || file.name.replace(/\.[^.]+$/, '').slice(0, 100);
      this.pendingFile.set({ name: file.name, type: file.type || 'application/octet-stream', dataUrl: String(reader.result ?? '') });
      this.activityName.set(name);
      this.pickedTemplate.set('blank');
      this.formError.set('');
    };
    reader.onerror = () => this.formError.set('Unable to read the selected file. Please try again.');
    reader.readAsDataURL(file);
  }

  onElementFileSelected(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const file = target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.activity.update(current => ({
        ...current,
        uploadedFile: {
          name: file.name,
          type: file.type || 'application/octet-stream',
          dataUrl: String(reader.result ?? ''),
        },
      }));
      this.patchSelectedElement({
        title: file.name,
        content: file.name,
        attachment: {
          name: file.name,
          type: file.type || 'application/octet-stream',
          dataUrl: String(reader.result ?? ''),
        },
      });
    };
    reader.onerror = () => this.formError.set('Unable to read the selected file. Please try again.');
    reader.readAsDataURL(file);
  }

  addElement(kind: EbookElementKind, design: number): void {
    const element = this.createElement(kind, design);
    this.activity.update(current => ({ ...current, elements: [...current.elements, element] }));
    this.selectedElementId.set(element.id);
    this.showElementsDialog.set(false);
    this.markDirty();
  }

  addTextElement(): void {
    this.addElement('Ebook Text', 0);
  }

  removeElement(id: number): void {
    this.activity.update(current => ({ ...current, elements: current.elements.filter(element => element.id !== id) }));
    if (this.selectedElementId() === id) {
      this.selectedElementId.set(this.activity().elements[0]?.id ?? null);
    }
    this.markDirty();
  }

  duplicateElement(id: number): void {
    const source = this.activity().elements.find(element => element.id === id);
    if (!source) return;
    const clone = { ...source, id: this.newElementId(), settings: { ...source.settings } };
    const index = this.activity().elements.findIndex(element => element.id === id);
    this.activity.update(current => {
      const elements = [...current.elements];
      elements.splice(index + 1, 0, clone);
      return { ...current, elements };
    });
    this.selectedElementId.set(clone.id);
    this.markDirty();
  }

  moveElement(id: number, direction: -1 | 1): void {
    const index = this.activity().elements.findIndex(element => element.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= this.activity().elements.length) return;
    this.activity.update(current => {
      const elements = [...current.elements];
      [elements[index], elements[nextIndex]] = [elements[nextIndex], elements[index]];
      return { ...current, elements };
    });
    this.markDirty();
  }

  updateElementText(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) return;
    this.patchSelectedElement({ content: target.value.slice(0, 500) });
  }

  updateElementTitle(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.patchSelectedElement({ title: target.value.slice(0, 100) });
  }

  updateSetting(key: NumericSetting, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const value = Number(target.value);
    if (!Number.isFinite(value)) return;
    let normalized = value;
    if (key === 'opacity' || key === 'overlayOpacity') normalized = Math.min(100, Math.max(0, value));
    if (key === 'dividerWidth') normalized = Math.min(400, Math.max(0, value));
    if (key === 'dividerHeight') normalized = Math.min(300, Math.max(0, value));
    if (['shadowBlur', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderRadius', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].includes(key)) {
      normalized = Math.max(0, value);
    }
    this.patchSelectedSettings({ [key]: normalized } as Partial<EbookElementSettings>);
  }

  updateColor(key: ColorSetting, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.patchSelectedSettings({ [key]: target.value } as Partial<EbookElementSettings>);
  }

  updateSelect(key: SelectSetting, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    let value: string | number = target.value;
    if (key === 'columns') value = Number(value);
    this.patchSelectedSettings({ [key]: value } as Partial<EbookElementSettings>);
  }

  updateToggle(key: BooleanSetting, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.patchSelectedSettings({ [key]: target.checked } as Partial<EbookElementSettings>);
  }

  updateBackgroundUrl(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.patchSelectedSettings({ backgroundUrl: target.value } as Partial<EbookElementSettings>);
  }

  saveEbook(): void {
    if (this.isSaving()) return;
    this.formError.set('');
    if (!this.activity().name.trim()) {
      this.formError.set('Activity Name is required.');
      return;
    }
    if (!this.activity().elements.length) {
      this.formError.set('Add at least one content element before saving.');
      return;
    }
    this.isSaving.set(true);
    const saved = this.persist(this.activity(), true);
    this.isSaving.set(false);
    if (saved) {
      this.successMessage.set('Ebook saved successfully.');
      this.isDirty.set(false);
      this.saved.emit(saved);
    }
  }

  downloadEbook(): void {
    const ebook = this.activity();
    const sections = ebook.elements.map(element => {
      const text = this.escapeHtml(element.content);
      const title = this.escapeHtml(element.title);
      const settings = element.settings;
      const style = [
        `color:${settings.textColor}`,
        `font-family:${settings.fontFamily}`,
        `font-size:${this.textTypeSize(element)}`,
        `opacity:${settings.opacity / 100}`,
        `width:${this.elementWidth(element)}`,
        `min-height:${this.elementHeight(element)}`,
        `text-align:${settings.alignment.toLowerCase()}`,
        `background-color:${element.kind === 'Ebook Text' ? settings.boxColor : settings.backgroundColor}`,
        `padding:${settings.paddingTop}px ${settings.paddingRight}px ${settings.paddingBottom}px ${settings.paddingLeft}px`,
        `margin:${settings.marginTop}px ${settings.marginRight}px ${settings.marginBottom}px ${settings.marginLeft}px`,
        `border-top:${settings.borderTop}px ${settings.borderStyle === 'No Border' ? 'none' : settings.borderStyle.toLowerCase()} ${settings.borderColor}`,
        `border-right:${settings.borderRight}px ${settings.borderStyle === 'No Border' ? 'none' : settings.borderStyle.toLowerCase()} ${settings.borderColor}`,
        `border-bottom:${settings.borderBottom}px ${settings.borderStyle === 'No Border' ? 'none' : settings.borderStyle.toLowerCase()} ${settings.borderColor}`,
        `border-left:${settings.borderLeft}px ${settings.borderStyle === 'No Border' ? 'none' : settings.borderStyle.toLowerCase()} ${settings.borderColor}`,
        `border-radius:${settings.borderRadius}px`,
      ].join(';');
      const file = element.attachment
        ? `<p><a href="${element.attachment.dataUrl}" download="${this.escapeHtml(element.attachment.name)}">Download ${this.escapeHtml(element.attachment.name)}</a></p>`
        : '';
      return `<section style="${style}"><h2>${title}</h2><p>${text}</p>${file}</section>`;
    }).join('\n');
    const content = `<!doctype html><html><head><meta charset="utf-8"><title>${this.escapeHtml(ebook.name)}</title></head><body><main><h1>${this.escapeHtml(ebook.name)}</h1>${sections}</main></body></html>`;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/html;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${ebook.name.replace(/[^\w -]/g, '').trim() || 'ebook'}.html`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  downloadAttachment(element: EbookElement): void {
    const file = element.attachment ?? this.activity().uploadedFile;
    if (!file) return;
    const [metadata, encoded = ''] = file.dataUrl.split(',', 2);
    const mimeType = metadata.match(/^data:([^;]+)/)?.[1] ?? file.type;
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  deleteEbook(): void {
    if (!this.activity().id || !window.confirm(`Delete “${this.activity().name}”? This action cannot be undone.`)) return;
    try {
      this.ebookService.remove(this.activity().id);
      this.closeEditor(true);
    } catch {
      this.formError.set('Something went wrong. Please try again later.');
    }
  }

  closeEditor(force = false): void {
    if (!force && this.isDirty() && !window.confirm('You have unsaved changes. Are you sure you want to leave this Ebook?')) return;
    this.closed.emit();
    if (!this.embedded()) {
      if (this.courseIdValue() > 0) {
        void this.router.navigate(['/admin-dashboard/courses'], { queryParams: { organize: this.courseIdValue() } });
      } else {
        void this.router.navigateByUrl('/admin-dashboard/courses');
      }
    }
  }

  private persist(activity: EbookActivity, isUpdate: boolean): EbookActivity | null {
    try {
      this.activityName.set(activity.name);
      const saved = this.ebookService.save(activity);
      this.activity.set(saved);
      this.isDirty.set(false);
      if (isUpdate) this.successMessage.set('Ebook saved successfully.');
      this.saved.emit(saved);
      return saved;
    } catch {
      this.formError.set('Something went wrong. Please try again later.');
      return null;
    }
  }

  private patchSelectedElement(patch: Partial<EbookElement>): void {
    const id = this.selectedElementId();
    if (id === null) return;
    this.activity.update(current => ({
      ...current,
      elements: current.elements.map(element => element.id === id ? { ...element, ...patch } : element),
    }));
    this.markDirty();
  }

  private patchSelectedSettings(patch: Partial<EbookElementSettings>): void {
    const id = this.selectedElementId();
    if (id === null) return;
    this.activity.update(current => ({
      ...current,
      elements: current.elements.map(element => element.id === id
        ? { ...element, settings: { ...element.settings, ...patch } }
        : element),
    }));
    this.markDirty();
  }

  private createElement(kind: EbookElementKind, design: number, title?: string): EbookElement {
    const content: Partial<Record<EbookElementKind, string>> = {
      'Ebook Covers': 'A short introduction to your Ebook.',
      'Media & Text': 'Add supporting text to your media.',
      Counters: '01',
      'Download File': 'Download the course resource.',
      'External Content': 'https://example.com',
      'Team & Authors': 'Add author details.',
      'Own Layout': 'Customize this section layout.',
      'Ebook Text': 'Enter your text here.',
    };
    const settings = createEbookSettings();
    if (design === 0) {
      settings.backgroundColor = '#292d31';
      settings.textColor = '#ffffff';
    }
    if (design === 1) {
      settings.backgroundColor = '#f8ad3d';
      settings.textColor = '#ffffff';
    }
    if (design === 3) settings.backgroundColor = '#e9edf3';
    return {
      id: this.newElementId(),
      kind,
      design,
      title: title ?? (kind === 'Ebook Text' ? 'Enter a heading' : kind),
      content: content[kind] ?? '',
      settings,
    };
  }

  private defaultElements(template: EbookTemplate): EbookElement[] {
    if (template === 'blank') return [];
    const heading = this.createElement('Ebook Covers', 4, template === 'welcome' ? 'Welcome' : template === 'summary' ? 'Summary' : 'Course Overview');
    heading.content = template === 'welcome'
      ? 'Welcome to this course. We are glad you are here.'
      : template === 'summary'
        ? 'Review the key ideas and takeaways from this course.'
        : 'Explore the topics, goals, and structure of this course.';
    const body = this.createElement('Ebook Text', 0, 'Paragraph');
    body.settings.textType = 'Ebook Main Text';
    body.content = template === 'welcome'
      ? 'Use this space to introduce the course and help learners get started.'
      : template === 'summary'
        ? 'Use this section to summarize the main topics covered.'
        : 'Use this section to provide a general introduction to the course.';
    return [heading, body];
  }

  private emptyActivity(): EbookActivity {
    const now = new Date().toISOString();
    return {
      id: 0,
      courseId: 0,
      sectionId: 0,
      name: '',
      template: 'blank',
      elements: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  private syncDialog(reference: ElementRef<HTMLDialogElement> | undefined, shouldOpen: boolean): void {
    const dialog = reference?.nativeElement;
    if (!dialog) return;
    if (shouldOpen && !dialog.open) {
      queueMicrotask(() => {
        if (dialog.isConnected && !dialog.open) dialog.showModal();
      });
    } else if (!shouldOpen && dialog.open) {
      dialog.close();
    }
  }

  private newElementId(): number {
    this.elementIdSeed = Math.max(this.elementIdSeed + 1, ...this.activity().elements.map(element => element.id + 1));
    return this.elementIdSeed;
  }

  private markDirty(): void {
    this.isDirty.set(true);
    this.successMessage.set('');
    this.formError.set('');
    try {
      const draft = this.ebookService.save(this.activity());
      this.activity.set(draft);
    } catch {
      this.formError.set('Your changes could not be stored on this device. Please try again.');
    }
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
  }
}
