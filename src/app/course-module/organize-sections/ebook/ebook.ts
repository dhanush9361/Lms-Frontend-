import {

  ChangeDetectionStrategy,

  Component,

  AfterViewInit,

  OnDestroy,

  computed,

  input,

  output,

  signal,

} from '@angular/core';



type Preset = 'Blank Ebook' | 'Welcome' | 'Course Overview' | 'Summary';

type Category =

  | 'Ebook Covers'

  | 'Media & Text'

  | 'Counters'

  | 'Download File'

  | 'External Content'

  | 'Team & Authors'

  | 'Own Layout';

type ElementKind =

  'text' | 'cover' | 'media' | 'counter' | 'download' | 'external' | 'team' | 'layout' | 'divider';

type TextType =

  'Ebook Heading 1' | 'Ebook Heading 2' | 'Ebook Heading 3' | 'Ebook Heading 4' | 'Ebook Main Text';

type Alignment = 'Left' | 'Center' | 'Right';

type TextColorChannel = 'red' | 'green' | 'blue';

type HeightOption = 'Extra Small' | 'Small' | 'Normal' | 'Large' | 'Extra Large';

type WidthOption = 'Full' | 'Wide' | 'Normal' | 'Narrow';

type BorderStyle = 'No Border' | 'Solid' | 'Dashed' | 'Dotted';

type ShadowPosition = 'None' | 'Left' | 'Right' | 'Bottom' | 'Round';

type BackgroundType = 'Color' | 'Image' | 'Video' | 'Embed' | 'SVG';
type ScrollEffect =
  'None' | 'Zoom in' | 'Zoom out' | 'Parallax' | 'Close up' | 'Push Away' | 'Fixed';
type DividerPosition = 'Top' | 'Bottom';
type DividerStyle = 'None' | 'Waves' | 'Triangle' | 'Mountain' | 'Curtain';



interface EbookElement {

  id: number;

  category: Category;

  kind: ElementKind;

  title: string;

  content: string;

  textType: TextType;

  fontFamily: 'Work Sans' | 'Nunito Sans' | 'Source Sans Pro';

  opacity: number;

  textColor: string;

  shadowPosition: ShadowPosition;

  shadowHorizontal: number;

  shadowVertical: number;

  shadowColor: string;

  shadowBlur: number;

  bold: boolean;

  italic: boolean;

  underline: boolean;

  strike: boolean;

  alignment: Alignment;

  height: HeightOption;

  width: WidthOption;

  boxColor: string;

  borderTop: number;

  borderRight: number;

  borderBottom: number;

  borderLeft: number;

  borderStyle: BorderStyle;

  borderColor: string;

  borderRadius: number;

  paddingTop: number;

  paddingRight: number;

  paddingBottom: number;

  paddingLeft: number;

  marginTop: number;

  marginRight: number;

  marginBottom: number;

  marginLeft: number;

  columns: 'One column' | 'Two columns' | 'Three columns';

  backgroundType: BackgroundType;

  backgroundColor: string;

  backgroundAsset: string;

  backgroundEmbed: string;

  scrollEffect: ScrollEffect;

  applyOverlay: boolean;

  overlayColor: string;

  overlayOpacity: number;

  dividerPosition: DividerPosition;
  dividerStyle: DividerStyle;
  dividerFill: string;

  dividerWidth: number;

  dividerHeight: number;

  dividerStacking: 'Back' | 'Front';

  dividerFlip: 'No' | 'Yes';

  fileName: string;

  fileUrl: string;

}



interface TemplatePreview {

  title: string;

  description: string;

  kind: ElementKind;

  content: string;

  color: string;

  foreground: string;

  previewType?: 'media' | 'counter' | 'download' | 'external' | 'team' | 'layout';

  previewVariant?: number;

  layoutWidths?: number[];

}



const CATEGORIES: Category[] = [

  'Ebook Covers',

  'Media & Text',

  'Counters',

  'Download File',

  'External Content',

  'Team & Authors',

  'Own Layout',

];



const NUMERIC_FIELDS = new Set<keyof EbookElement>([

  'opacity',

  'shadowHorizontal',

  'shadowVertical',

  'shadowBlur',

  'borderTop',

  'borderRight',

  'borderBottom',

  'borderLeft',

  'borderRadius',

  'paddingTop',

  'paddingRight',

  'paddingBottom',

  'paddingLeft',

  'marginTop',

  'marginRight',

  'marginBottom',

  'marginLeft',

  'overlayOpacity',

  'dividerWidth',

  'dividerHeight',

]);



@Component({

  selector: 'app-ebook',

  imports: [],

  templateUrl: './ebook.html',

  styleUrl: './ebook.css',

  changeDetection: ChangeDetectionStrategy.OnPush,

  host: {

    '(window:beforeunload)': 'handleBeforeUnload($event)',

    '(document:keydown.escape)': 'handleEscape()',

  },

})

export class Ebook implements AfterViewInit, OnDestroy {

  readonly courseName = input('');

  readonly sectionId = input<number | null>(null);

  readonly closed = output<void>();



  readonly categories = CATEGORIES;
  readonly backgroundTypes: BackgroundType[] = ['Color', 'Image', 'Video', 'Embed', 'SVG'];
  readonly dividerStyles: DividerStyle[] = ['None', 'Waves', 'Triangle', 'Mountain', 'Curtain'];
  readonly dividerPositions: DividerPosition[] = ['Top', 'Bottom'];
  readonly layoutAlignments: Alignment[] = ['Left', 'Center', 'Right'];
  readonly layoutHeights: Array<'Small' | 'Normal' | 'Large'> = ['Small', 'Normal', 'Large'];
  readonly layoutWidths: Array<'Small' | 'Normal' | 'Large'> = ['Small', 'Normal', 'Large'];
  readonly presets: Preset[] = ['Blank Ebook', 'Welcome', 'Course Overview', 'Summary'];

  readonly mode = signal<'chooser' | 'name' | 'editor'>('chooser');

  readonly preset = signal<Preset>('Blank Ebook');

  readonly activityName = signal('');

  readonly activityNameError = signal('');

  readonly elements = signal<EbookElement[]>([]);
  readonly sidebarElements = computed(() =>
    this.elements().filter(
      (element) => element.title !== 'Text block' && element.title !== 'Cover — Charcoal',
    ),
  );

  readonly editorHtml = signal('');

  readonly previewElements = computed(() =>

    this.elements().filter((element) => element.kind !== 'text' || element.content.trim()),

  );

  readonly hasPreviewContent = computed(() => this.previewElements().length > 0);

  readonly selectedElementId = signal<number | null>(null);

  readonly selectedElement = computed(

    () => this.elements().find((element) => element.id === this.selectedElementId()) ?? null,

  );

  readonly textColorRgb = computed(() =>
    this.colorToRgb(this.selectedElement()?.textColor ?? '#484150'),
  );
  readonly shadowColorRgb = computed(() =>
    this.colorToRgb(this.selectedElement()?.shadowColor ?? '#000000'),
  );
  readonly borderColorRgb = computed(() =>
    this.colorToRgb(this.selectedElement()?.borderColor ?? '#d1d5db'),
  );

  readonly editorTab = signal<'text' | 'layout' | 'section'>('text');
  readonly settingsPage = signal<'main' | 'shadow'>('main');
  readonly settingsStep = signal<0 | 1>(0);
  readonly sectionLayoutFlow = signal(false);
  readonly awaitingSectionLayout = signal(false);
  readonly boxModelTab = signal<'border' | 'padding' | 'margin'>('border');

  readonly activeCategory = signal<Category>('Ebook Covers');

  readonly contentDialogOpen = signal(false);

  readonly previewMode = signal(false);

  readonly importPanelOpen = signal(false);

  readonly errorMessage = signal('');

  readonly hasUnsavedChanges = signal(false);

  readonly nextElementId = signal(1);

  readonly selectedFileName = signal('');

  readonly uploadMessage = signal('');



  private uploadedObjectUrl: string | null = null;



  ngAfterViewInit(): void {

    setTimeout(() => document.getElementById('ebook-picker-close')?.focus());

  }



  choosePreset(preset: Preset): void {

    this.preset.set(preset);

    this.activityNameError.set('');

    this.activityName.set('');

    this.mode.set('name');

    setTimeout(() => document.getElementById('ebook-activity-name')?.focus());

  }



  saveActivityName(): void {

    const name = this.activityName().trim();

    if (!name) {

      this.activityNameError.set('Activity Name is required.');

      return;

    }

    if (name.length > 100) {

      this.activityNameError.set('Activity Name must not exceed 100 characters.');

      return;

    }



    this.activityName.set(name);

    this.activityNameError.set('');

    this.elements.set(this.initialElements(this.preset()));
    this.sectionLayoutFlow.set(false);
    this.awaitingSectionLayout.set(false);
    this.settingsStep.set(0);
    const selectedElement =

      this.elements().find((element) => element.kind === 'text') ?? this.elements()[0] ?? null;

    this.selectedElementId.set(selectedElement?.id ?? null);

    this.syncEditorHtml(selectedElement);

    this.mode.set('editor');

    this.editorTab.set(this.selectedElement()?.kind === 'text' ? 'text' : 'section');

    this.hasUnsavedChanges.set(true);

    this.openContentDialog();

  }



  private initialElements(preset: Preset): EbookElement[] {

    if (preset === 'Blank Ebook') {

      return [this.createElement('Media & Text', 'text', 'Text block', '')];

    }

    const heading =

      preset === 'Welcome'

        ? 'Welcome'

        : preset === 'Course Overview'

          ? 'Course Overview'

          : 'Summary';

    const copy =

      preset === 'Welcome'

        ? 'Add a welcome message for learners.'

        : preset === 'Course Overview'

          ? 'Add an overview of this course for learners.'

          : 'Add a summary of the key learning points.';

    return [

      this.createElement('Ebook Covers', 'cover', `${heading} cover`, heading),

      this.createElement('Media & Text', 'text', heading, copy),

    ];

  }



  private createElement(

    category: Category,

    kind: ElementKind,

    title: string,

    content: string,

  ): EbookElement {

    const id = this.nextElementId();

    this.nextElementId.update((value) => value + 1);

    return {

      id,

      category,

      kind,

      title,

      content,

      textType: kind === 'text' ? 'Ebook Heading 1' : 'Ebook Main Text',

      fontFamily: 'Work Sans',

      opacity: 100,

      textColor: '#484150',

      shadowPosition: 'None',

      shadowHorizontal: 0,

      shadowVertical: 0,

      shadowColor: '#000000',

      shadowBlur: 0,

      bold: false,

      italic: false,

      underline: false,

      strike: false,

      alignment: 'Left',

      height: 'Normal',

      width: 'Full',

      boxColor: '#ffffff',

      borderTop: 0,

      borderRight: 0,

      borderBottom: 0,

      borderLeft: 0,

      borderStyle: 'No Border',

      borderColor: '#d1d5db',

      borderRadius: 0,

      paddingTop: 16,

      paddingRight: 16,

      paddingBottom: 16,

      paddingLeft: 16,

      marginTop: 0,

      marginRight: 0,

      marginBottom: 16,

      marginLeft: 0,

      columns: 'One column',

      backgroundType: 'Color',

      backgroundColor: '#ffffff',

      backgroundAsset: '',

      backgroundEmbed: '',

      scrollEffect: 'None',

      applyOverlay: false,

      overlayColor: '#000000',

      overlayOpacity: 20,

      dividerPosition: 'Bottom',
      dividerStyle: 'None',
      dividerFill: '#61b7c5',

      dividerWidth: 100,

      dividerHeight: 8,

      dividerStacking: 'Front',

      dividerFlip: 'No',

      fileName: '',

      fileUrl: '',

    };

  }



  templatesForCategory(category: Category): TemplatePreview[] {

    const text = (

      title: string,

      content: string,

      color: string,

      foreground = '#ffffff',

    ): TemplatePreview => ({

      title,

      description: 'Text layout',

      kind: 'text',

      content,

      color,

      foreground,

    });

    const section = (

      title: string,

      description: string,

      kind: ElementKind,

      content: string,

      color: string,

      foreground = '#ffffff',

    ): TemplatePreview => ({ title, description, kind, content, color, foreground });

    const preview = (

      template: TemplatePreview,

      previewType: NonNullable<TemplatePreview['previewType']>,

      previewVariant: number,

      layoutWidths?: number[],

    ): TemplatePreview => ({ ...template, previewType, previewVariant, layoutWidths });



    switch (category) {

      case 'Ebook Covers':

        return [

          text('Cover — Charcoal', 'Ebook heading 1', '#292c30'),

          text('Cover — Charcoal split', 'Ebook heading 1', '#292c30'),

          text('Cover — Amber', 'Ebook heading 1', '#f7ac3f'),

          text('Cover — Amber split', 'Ebook heading 1', '#f7ac3f'),

          text('Cover — Gradient', 'Ebook heading 1', '#c5c6e7', '#292c30'),

        ];

      case 'Media & Text':

        return [

          preview(text('Text introduction', 'Add supporting text', '#ffffff', '#292c30'), 'media', 0),

          preview(text('Heading and text', 'Add a heading and supporting text', '#ffffff', '#292c30'), 'media', 1),

          preview(text('Text section', 'Add a heading and supporting text', '#ffffff', '#292c30'), 'media', 2),

          preview(text('Text with subheadings', 'Add text with subheadings', '#ffffff', '#292c30'), 'media', 3),

          preview(text('Learning outcomes', 'Add learning outcomes', '#ffffff', '#292c30'), 'media', 4),

          preview(text('Course comparison', 'Add course details', '#ffffff', '#292c30'), 'media', 5),

          preview(section('Image and text', 'Add an image and text', 'media', 'Add an image', '#ffffff', '#292c30'), 'media', 6),

          preview(text('Text beside image', 'Add your text and image', '#ffffff', '#292c30'), 'media', 7),

        ];

      case 'Counters':

        return [

          preview(section('Number counters', 'Statistics with labels', 'counter', '15 years | 1,500+ | 90 | 90+', '#ffffff', '#292c30'), 'counter', 0),

          preview(section('Progress counters', 'Circular progress statistics', 'counter', '70% | 80% | 90% | 100%', '#ffffff', '#292c30'), 'counter', 1),

        ];

      case 'Download File':

        return [

          preview(section('Three download cards', 'Three downloadable resources', 'download', 'Download resources', '#ffffff', '#292c30'), 'download', 0),

          preview(section('Featured resources', 'Two downloadable resources', 'download', 'Download resources', '#ffffff', '#292c30'), 'download', 1),

        ];

      case 'External Content':

        return [

          preview(section('External content', 'Add a link or embed reference', 'external', 'Embed content', '#ffffff', '#292c30'), 'external', 0),

        ];

      case 'Team & Authors':

        return [

          preview(section('Author biography', 'Author profile and social links', 'team', 'Author profile', '#ffffff', '#292c30'), 'team', 0),

          preview(section('Team statistics', 'Team highlights and statistics', 'team', 'Team statistics', '#ffffff', '#292c30'), 'team', 1),

          preview(section('Core team', 'Grid of team members', 'team', 'Core team', '#ffffff', '#292c30'), 'team', 2),

          preview(section('Team introduction', 'Introduce your team members', 'team', 'Team introduction', '#ffffff', '#292c30'), 'team', 3),

        ];

      case 'Own Layout':

        return [

          preview(section('Full width', 'One full-width column', 'layout', '100%', '#ffffff', '#292c30'), 'layout', 0, [100]),

          preview(section('Equal columns', 'Two equal columns', 'layout', '50% | 50%', '#ffffff', '#292c30'), 'layout', 1, [50, 50]),

          preview(section('Two-thirds and one-third', '66% and 33% columns', 'layout', '66% | 33%', '#ffffff', '#292c30'), 'layout', 2, [66, 33]),

          preview(section('One-quarter and three-quarters', '25% and 75% columns', 'layout', '25% | 75%', '#ffffff', '#292c30'), 'layout', 3, [25, 75]),

          preview(section('Three equal columns', 'Three equal columns', 'layout', '33% | 33% | 33%', '#ffffff', '#292c30'), 'layout', 4, [33, 33, 33]),

          preview(section('Four equal columns', 'Four equal columns', 'layout', '25% | 25% | 25% | 25%', '#ffffff', '#292c30'), 'layout', 5, [25, 25, 25, 25]),

          preview(section('Half and quarter columns', '50%, 25%, and 25% columns', 'layout', '50% | 25% | 25%', '#ffffff', '#292c30'), 'layout', 6, [50, 25, 25]),

          preview(section('Quarter, half, quarter columns', '25%, 50%, and 25% columns', 'layout', '25% | 50% | 25%', '#ffffff', '#292c30'), 'layout', 7, [25, 50, 25]),

        ];

    }

  }



  addTemplate(template: TemplatePreview): void {
    const category = this.activeCategory();
    const element = this.createElement(category, template.kind, template.title, template.content);
    this.awaitingSectionLayout.set(false);
    this.elements.update((elements) => [...elements, element]);

    this.selectedElementId.set(element.id);

    this.syncEditorHtml(element);

    this.editorTab.set(element.kind === 'text' ? 'text' : 'section');

    this.contentDialogOpen.set(false);

    this.hasUnsavedChanges.set(true);

  }



  selectElement(element: EbookElement): void {
    this.awaitingSectionLayout.set(false);
    this.selectedElementId.set(element.id);

    this.syncEditorHtml(element);

    this.editorTab.set(element.kind === 'text' ? 'text' : 'section');

  }



  private syncEditorHtml(element: EbookElement | null): void {

    this.editorHtml.set(element?.kind === 'text' ? element.content : '');

  }



  selectTab(tab: 'text' | 'layout' | 'section'): void {
    this.awaitingSectionLayout.set(false);
    this.editorTab.set(tab);
    this.settingsPage.set('main');
    this.settingsStep.set(0);
    this.boxModelTab.set('border');
  }

  revealSectionLayoutTabs(): void {
    if (this.sectionLayoutFlow()) {
      this.sectionLayoutFlow.set(false);
      this.awaitingSectionLayout.set(false);
      this.selectTab('text');
      return;
    }

    this.sectionLayoutFlow.set(true);
    this.awaitingSectionLayout.set(true);
    this.settingsStep.set(0);
  }

  setLayoutAlignment(alignment: Alignment): void {
    this.patchSelected('alignment', alignment);
  }

  setLayoutHeight(height: 'Small' | 'Normal' | 'Large'): void {
    this.patchSelected('height', height);
  }

  setLayoutWidth(width: 'Small' | 'Normal' | 'Large'): void {
    const mappedWidth: WidthOption =
      width === 'Small' ? 'Narrow' : width === 'Large' ? 'Full' : 'Normal';
    this.patchSelected('width', mappedWidth);
  }

  addColumn(): void {
    const columns = this.selectedElement()?.columns;
    const nextColumns =
      columns === 'One column'
        ? 'Two columns'
        : columns === 'Two columns'
          ? 'Three columns'
          : 'Three columns';
    this.patchSelected('columns', nextColumns);
  }

  setBackgroundType(type: BackgroundType): void {
    this.patchSelected('backgroundType', type);
  }

  setDividerStyle(style: DividerStyle): void {
    this.patchSelected('dividerStyle', style);
  }

  setDividerPosition(position: DividerPosition): void {
    this.patchSelected('dividerPosition', position);
  }

  dividerClipPath(style: DividerStyle): string {
    switch (style) {
      case 'Waves':
        return 'polygon(0 55%, 20% 65%, 40% 55%, 60% 65%, 80% 55%, 100% 65%, 100% 100%, 0 100%)';
      case 'Triangle':
        return 'polygon(0 45%, 50% 100%, 100% 45%, 100% 100%, 0 100%)';
      case 'Mountain':
        return 'polygon(0 70%, 25% 35%, 45% 70%, 70% 25%, 100% 70%, 100% 100%, 0 100%)';
      case 'Curtain':
        return 'polygon(0 35%, 25% 65%, 50% 35%, 75% 65%, 100% 35%, 100% 100%, 0 100%)';
      case 'None':
        return 'none';
    }
  }

  updateBoxModelAll(group: 'border' | 'padding' | 'margin', event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    const value = Number(target.value);
    if (!Number.isFinite(value) || value < 0) return;

    const fields = {
      border: ['borderTop', 'borderRight', 'borderBottom', 'borderLeft'],
      padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
      margin: ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'],
    } as const;

    const selectedId = this.selectedElementId();
    if (selectedId === null) return;

    const patch = Object.fromEntries(fields[group].map((field) => [field, value])) as Partial<EbookElement>;
    this.elements.update((elements) =>
      elements.map((element) =>
        element.id === selectedId ? Object.assign({}, element, patch) : element,
      ),
    );
    this.hasUnsavedChanges.set(true);
  }

  boxModelEqualValue(group: 'border' | 'padding' | 'margin'): number | null {
    const element = this.selectedElement();
    if (!element) return null;

    switch (group) {
      case 'border':
        return element.borderTop === element.borderRight &&
          element.borderRight === element.borderBottom &&
          element.borderBottom === element.borderLeft
          ? element.borderTop
          : null;
      case 'padding':
        return element.paddingTop === element.paddingRight &&
          element.paddingRight === element.paddingBottom &&
          element.paddingBottom === element.paddingLeft
          ? element.paddingTop
          : null;
      case 'margin':
        return element.marginTop === element.marginRight &&
          element.marginRight === element.marginBottom &&
          element.marginBottom === element.marginLeft
          ? element.marginTop
          : null;
    }
  }

  setShadowPosition(position: ShadowPosition): void {
    this.patchSelected('shadowPosition', position);
  }



  updateTextContent(event: Event): void {

    const target = event.target;

    if (!(target instanceof HTMLElement)) return;

    const text = target.textContent ?? '';

    if (text.length > 500) {

      target.textContent = text.slice(0, 500);

    }

    this.patchSelected('content', target.innerHTML);

  }



  formatText(

    command:

      | 'bold'

      | 'italic'

      | 'underline'

      | 'strikeThrough'

      | 'superscript'

      | 'subscript'

      | 'insertUnorderedList'

      | 'insertOrderedList'

      | 'removeFormat'

      | 'formatBlock',

  ): void {

    if (command === 'formatBlock') {

      document.execCommand(command, false, 'pre');

    } else {

      document.execCommand(command);

    }

    this.saveTextContent();

  }



  setTextAlignment(alignment: Alignment): void {

    this.patchSelected('alignment', alignment);

  }



  insertTextTable(): void {

    document.execCommand(

      'insertHTML',

      false,

      '<table><tbody><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table>',

    );

    this.saveTextContent();

  }



  insertTextLink(): void {

    const url = window.prompt('Enter a link URL');

    if (!url) return;

    const safeUrl = this.safeLinkUrl(url);

    if (!safeUrl) {

      this.errorMessage.set('Enter a valid HTTPS, HTTP, or email link.');

      return;

    }

    document.execCommand('createLink', false, safeUrl);

    this.saveTextContent();

  }



  highlightText(): void {

    document.execCommand('hiliteColor', false, '#fff59d');

    this.saveTextContent();

  }



  private saveTextContent(): void {

    const editor = document.getElementById('ebook-text-content');

    if (!(editor instanceof HTMLElement)) return;

    const text = editor.textContent ?? '';

    if (text.length > 500) editor.textContent = text.slice(0, 500);

    this.patchSelected('content', editor.innerHTML);

  }



  textContentLength(content: string): number {

    return new DOMParser().parseFromString(content, 'text/html').body.textContent?.length ?? 0;

  }



  updateActivityName(event: Event): void {

    const target = event.target;

    if (!(target instanceof HTMLInputElement)) return;

    this.activityName.set(target.value.slice(0, 100));

    if (this.activityNameError()) this.activityNameError.set('');

  }



  updateSelectedSetting(field: keyof EbookElement, event: Event): void {

    const target = event.target;

    if (!(

      target instanceof HTMLInputElement ||

      target instanceof HTMLSelectElement ||

      target instanceof HTMLTextAreaElement

    )) {

      return;

    }

    let value: string | number = target.value;

    if (NUMERIC_FIELDS.has(field)) {

      const numericValue = Number(target.value);

      if (!Number.isFinite(numericValue)) return;

      value =

        field === 'opacity' || field === 'overlayOpacity'

          ? Math.min(100, Math.max(0, numericValue))

          : field === 'dividerWidth'

            ? Math.min(400, Math.max(0, numericValue))

            : field === 'dividerHeight'

              ? Math.min(300, Math.max(0, numericValue))

              : numericValue;

    }

    this.patchSelected(field, value);

  }



  updateTextColorChannel(channel: TextColorChannel, event: Event): void {
    this.updateColorChannel('textColor', channel, event);
  }

  updateShadowColorChannel(channel: TextColorChannel, event: Event): void {
    this.updateColorChannel('shadowColor', channel, event);
  }

  private updateColorChannel(
    field: 'textColor' | 'shadowColor',
    channel: TextColorChannel,
    event: Event,
  ): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) return;

    const value = Number(target.value);

    if (!Number.isFinite(value)) return;



    const color = field === 'textColor' ? this.textColorRgb() : this.shadowColorRgb();

    const nextColor = {

      red: channel === 'red' ? Math.min(255, Math.max(0, Math.round(value))) : color.red,

      green: channel === 'green' ? Math.min(255, Math.max(0, Math.round(value))) : color.green,

      blue: channel === 'blue' ? Math.min(255, Math.max(0, Math.round(value))) : color.blue,

    };

    const hex = `#${[nextColor.red, nextColor.green, nextColor.blue]

      .map((component) => component.toString(16).padStart(2, '0'))

      .join('')}`;

    this.patchSelected(field, hex);
  }



  private colorToRgb(hexColor: string): Record<TextColorChannel, number> {

    const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hexColor);

    if (!match) return { red: 72, green: 65, blue: 80 };

    return {

      red: Number.parseInt(match[1], 16),

      green: Number.parseInt(match[2], 16),

      blue: Number.parseInt(match[3], 16),

    };

  }



  private patchSelected(field: keyof EbookElement, value: string | number | boolean): void {

    const selectedId = this.selectedElementId();

    if (selectedId === null) return;

    this.elements.update((elements) =>

      elements.map((element) =>

        element.id === selectedId ? Object.assign({}, element, { [field]: value }) : element,

      ),

    );

    this.hasUnsavedChanges.set(true);

  }



  toggleSelectedSetting(field: 'bold' | 'italic' | 'underline' | 'strike'): void {

    const element = this.selectedElement();

    if (!element || element.kind !== 'text') return;

    this.patchSelected(field, !element[field]);

  }



  setOverlayEnabled(event: Event): void {

    const target = event.target;

    if (!(target instanceof HTMLInputElement)) return;

    this.patchSelected('applyOverlay', target.checked);

  }



  openFilePicker(fileInput: HTMLInputElement): void {

    fileInput.click();

  }



  onFileSelected(event: Event): void {

    const target = event.target;

    if (!(target instanceof HTMLInputElement)) return;

    const file = target.files?.[0];

    if (!file) return;

    if (!/\.(epub|pdf|html?|zip)$/i.test(file.name)) {

      this.errorMessage.set('Choose an Ebook file in EPUB, PDF, HTML, or ZIP format.');

      target.value = '';

      return;

    }

    if (this.uploadedObjectUrl) URL.revokeObjectURL(this.uploadedObjectUrl);

    this.uploadedObjectUrl = URL.createObjectURL(file);

    this.selectedFileName.set(file.name);

    this.uploadMessage.set(

      'File selected for this session only. It has not been uploaded or saved.',

    );

    const element = this.createElement('Download File', 'download', file.name, file.name);

    element.fileName = file.name;

    element.fileUrl = this.uploadedObjectUrl;

    this.elements.update((elements) => [...elements, element]);

    this.selectedElementId.set(element.id);

    this.syncEditorHtml(element);

    this.editorTab.set('section');

    this.hasUnsavedChanges.set(true);

    target.value = '';

  }



  openSaveNotice(): void {

    if (!this.hasPreviewContent()) {

      this.errorMessage.set('Add content before saving the Ebook.');

      return;

    }

    this.errorMessage.set(

      'Ebook saving is not available because no Ebook save API is configured. This draft has not been saved.',

    );

  }



  downloadEbook(): void {

    if (!this.hasPreviewContent()) {

      this.errorMessage.set('Add content before downloading the Ebook.');

      return;

    }

    const body = this.elements()

      .map((element) => {

        const content =

          element.kind === 'text'

            ? this.sanitizeRichContent(element.content)

            : this.escapeHtml(element.content || element.title);

        return element.kind === 'text'

          ? content

            ? `<section>${content}</section>`

            : ''

          : `<section><h2>${this.escapeHtml(element.title)}</h2><p>${content}</p></section>`;

      })

      .join('\n');

    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${this.escapeHtml(this.activityName())}</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:Arial,sans-serif;max-width:900px;margin:3rem auto;padding:0 1.5rem;color:#292c30}section{margin:2rem 0;padding:1rem;border-bottom:1px solid #ddd}</style></head><body><h1>${this.escapeHtml(this.activityName())}</h1>${body}</body></html>`;

    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));

    const anchor = document.createElement('a');

    anchor.href = url;

    anchor.download = `${this.fileSafeName(this.activityName())}.html`;

    anchor.click();

    URL.revokeObjectURL(url);

    this.errorMessage.set('');

  }



  togglePreview(): void {

    this.previewMode.update((value) => !value);

  }



  moveSelectedElement(direction: -1 | 1): void {

    const elements = this.elements();

    const index = elements.findIndex((element) => element.id === this.selectedElementId());

    if (index < 0) return;

    const nextIndex = Math.max(0, Math.min(elements.length - 1, index + direction));

    if (nextIndex !== index) this.selectElement(elements[nextIndex]);

  }

  isTextSettingsNavigation(): boolean {
    return this.editorTab() === 'text' && this.selectedElement()?.kind === 'text';
  }

  isSettingsStepNavigation(): boolean {
    return (
      this.sectionLayoutFlow() &&
      (this.editorTab() === 'section' || this.editorTab() === 'layout')
    );
  }

  handlePreviousControl(): void {
    if (this.isTextSettingsNavigation()) {
      this.settingsPage.set('main');
      return;
    }

    if (this.isSettingsStepNavigation()) {
      this.settingsStep.set(0);
      return;
    }

    this.moveSelectedElement(-1);
  }

  handleNextControl(): void {
    if (this.isTextSettingsNavigation()) {
      this.settingsPage.set('shadow');
      return;
    }

    if (this.isSettingsStepNavigation()) {
      this.settingsStep.set(1);
      return;
    }

    this.moveSelectedElement(1);
  }


  copySelectedElement(): void {

    const selected = this.selectedElement();

    if (!selected) return;

    const copy = { ...selected, id: this.nextElementId(), title: `${selected.title} copy` };

    this.nextElementId.update((value) => value + 1);

    this.elements.update((elements) => [...elements, copy]);

    this.selectedElementId.set(copy.id);

    this.syncEditorHtml(copy);

    this.hasUnsavedChanges.set(true);

  }



  deleteSelectedElement(): void {

    const id = this.selectedElementId();

    if (id === null) return;

    this.elements.update((elements) => elements.filter((element) => element.id !== id));

    const remaining = this.elements();

    const nextElement = remaining[0] ?? null;

    this.selectedElementId.set(nextElement?.id ?? null);

    this.syncEditorHtml(nextElement);

    this.editorTab.set(this.selectedElement()?.kind === 'text' ? 'text' : 'section');

    this.hasUnsavedChanges.set(true);

  }



  addDivider(): void {

    const divider = this.createElement('Own Layout', 'divider', 'Divider', '');

    this.elements.update((elements) => [...elements, divider]);

    this.selectedElementId.set(divider.id);

    this.syncEditorHtml(divider);

    this.editorTab.set('section');

    this.hasUnsavedChanges.set(true);

  }



  closeContentDialog(): void {

    this.contentDialogOpen.set(false);

    setTimeout(() => document.getElementById('ebook-add-content')?.focus());

  }



  openContentDialog(): void {

    this.contentDialogOpen.set(true);

    setTimeout(() => document.getElementById('ebook-category-ebook-covers')?.focus());

  }



  requestClose(): void {

    if (

      this.hasUnsavedChanges() &&

      !window.confirm('You have unsaved changes. Leave the Ebook Editor?')

    ) {

      return;

    }

    this.closed.emit();

  }



  handleBeforeUnload(event: BeforeUnloadEvent): void {

    if (!this.hasUnsavedChanges()) return;

    event.preventDefault();

    event.returnValue = '';

  }



  handleEscape(): void {

    if (this.contentDialogOpen()) {

      this.closeContentDialog();

      return;

    }

    this.requestClose();

  }



  previewStyle(element: EbookElement): string {

    const widths: Record<WidthOption, string> = {

      Full: '100%',

      Wide: '90%',

      Normal: '70%',

      Narrow: '50%',

    };

    const heights: Record<HeightOption, string> = {

      'Extra Small': '64px',

      Small: '100px',

      Normal: 'auto',

      Large: '220px',

      'Extra Large': '320px',

    };

    const textShadow = this.textShadow(element);

    const background =

      element.kind === 'text'

        ? element.boxColor

        : element.backgroundType === 'Color'

          ? element.backgroundColor

          : element.boxColor;

    const borderWidth = `${element.borderTop}px ${element.borderRight}px ${element.borderBottom}px ${element.borderLeft}px`;

    const borderStyle =

      element.borderStyle === 'No Border' ? 'none' : element.borderStyle.toLowerCase();

    const overlay =

      element.applyOverlay && element.kind !== 'text'

        ? `linear-gradient(${element.overlayColor}${Math.round((element.overlayOpacity / 100) * 255)

            .toString(16)

            .padStart(2, '0')},${element.overlayColor}${Math.round(

            (element.overlayOpacity / 100) * 255,

          )

            .toString(16)

            .padStart(2, '0')}),`

        : '';

    const imageUrl = this.safeImageUrl(element.backgroundAsset);

    const backgroundImage =

      element.backgroundType === 'Image' && imageUrl

        ? `background-image:${overlay}url("${imageUrl}");background-size:cover;background-position:center;`

        : '';

    const backgroundEffect =

      element.scrollEffect === 'Zoom in'

        ? 'transform:scale(1.02);'

        : element.scrollEffect === 'Zoom out'

          ? 'transform:scale(.98);'

          : element.scrollEffect === 'Parallax'

            ? 'transform:translateY(-3px);'

            : element.scrollEffect === 'Close up'

              ? 'filter:contrast(1.1);'

              : element.scrollEffect === 'Push Away'

                ? 'transform:scale(.96);'

                : element.scrollEffect === 'Fixed'

                  ? 'background-attachment:fixed;'

                  : '';

    const columnCount =

      element.columns === 'Three columns' ? 3 : element.columns === 'Two columns' ? 2 : 1;

    const dividerFlip = element.dividerFlip === 'Yes' ? 'transform:scaleX(-1);' : '';

    return [

      `width:${widths[element.width]}`,

      `min-height:${heights[element.height]}`,

      `text-align:${element.alignment.toLowerCase()}`,

      `font-family:${element.fontFamily},sans-serif`,

      `font-size:${this.textSize(element.textType)}`,

      `font-weight:${element.bold || element.textType === 'Ebook Heading 1' ? '700' : '400'}`,

      `font-style:${element.italic ? 'italic' : 'normal'}`,

      `text-decoration:${element.underline ? 'underline' : element.strike ? 'line-through' : 'none'}`,

      `color:${element.textColor}`,

      `opacity:${element.opacity / 100}`,

      `text-shadow:${textShadow}`,

      `background:${overlay}${background}`,

      `border-width:${borderWidth}`,

      `border-style:${borderStyle}`,

      `border-color:${element.borderColor}`,

      `border-radius:${element.borderRadius}px`,

      `padding:${element.paddingTop}px ${element.paddingRight}px ${element.paddingBottom}px ${element.paddingLeft}px`,

      `margin:${element.marginTop}px ${element.marginRight}px ${element.marginBottom}px ${element.marginLeft}px`,

      `column-count:${columnCount}`,

      element.kind === 'divider'

        ? `display:flex;align-items:${element.dividerPosition === 'Top' ? 'flex-start' : 'flex-end'};min-height:80px;position:relative;z-index:${element.dividerStacking === 'Front' ? 1 : 0}`

        : '',

      element.kind === 'divider' ? `justify-content:${element.alignment.toLowerCase()}` : '',

      backgroundImage,

      backgroundEffect,

      dividerFlip,

    ].filter(Boolean).join(';');

  }



  backgroundSummary(element: EbookElement): string | null {

    if (element.backgroundType === 'Color') return null;

    const source =

      element.backgroundType === 'Image' || element.backgroundType === 'Video'

        ? element.backgroundAsset.trim()

        : element.backgroundEmbed.trim();

    return source

      ? `${element.backgroundType} background: ${source.slice(0, 100)}`

      : `${element.backgroundType} background selected`;

  }



  private safeImageUrl(value: string): string {

    if (!value.trim()) return '';

    try {

      const url = new URL(value, window.location.origin);

      return ['https:', 'http:', 'blob:'].includes(url.protocol) ? url.href : '';

    } catch {

      return '';

    }

  }



  private textShadow(element: EbookElement): string {

    const horizontal = Math.abs(element.shadowHorizontal);

    const vertical = Math.abs(element.shadowVertical);

    switch (element.shadowPosition) {

      case 'None':

        return 'none';

      case 'Left':

        return `-${horizontal}px ${element.shadowVertical}px ${element.shadowBlur}px ${element.shadowColor}`;

      case 'Right':

        return `${horizontal}px ${element.shadowVertical}px ${element.shadowBlur}px ${element.shadowColor}`;

      case 'Bottom':

        return `${element.shadowHorizontal}px ${vertical}px ${element.shadowBlur}px ${element.shadowColor}`;

      case 'Round':

        return `0 0 ${element.shadowBlur}px ${element.shadowColor}`;

    }

  }



  private textSize(type: TextType): string {

    switch (type) {

      case 'Ebook Heading 1':

        return '30px';

      case 'Ebook Heading 2':

        return '24px';

      case 'Ebook Heading 3':

        return '20px';

      case 'Ebook Heading 4':

        return '16px';

      case 'Ebook Main Text':

        return '14px';

    }

  }



  private escapeHtml(value: string): string {

    return value.replace(/[&<>"']/g, (character) => {

      switch (character) {

        case '&':

          return '&amp;';

        case '<':

          return '&lt;';

        case '>':

          return '&gt;';

        case '"':

          return '&quot;';

        case "'":

          return '&#39;';

        default:

          return character;

      }

    });

  }



  private safeLinkUrl(value: string): string | null {

    try {

      const url = new URL(value.trim());

      return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : null;

    } catch {

      return null;

    }

  }



  private sanitizeRichContent(value: string): string {

    const parsedContent = new DOMParser().parseFromString(value, 'text/html');

    const allowedTags = new Set([

      'a',

      'b',

      'blockquote',

      'br',

      'code',

      'del',

      'div',

      'em',

      'h1',

      'h2',

      'h3',

      'h4',

      'h5',

      'h6',

      'i',

      'li',

      'mark',

      'ol',

      'p',

      'pre',

      's',

      'strike',

      'strong',

      'sub',

      'sup',

      'table',

      'tbody',

      'td',

      'th',

      'thead',

      'tr',

      'u',

      'ul',

    ]);



    const serialize = (node: Node): string => {

      if (node.nodeType === Node.TEXT_NODE) return this.escapeHtml(node.textContent ?? '');

      if (!(node instanceof Element)) return '';

      const tag = node.tagName.toLowerCase();

      const children = Array.from(node.childNodes, serialize).join('');

      if (!allowedTags.has(tag)) {

        return ['iframe', 'object', 'script', 'style', 'svg'].includes(tag) ? '' : children;

      }

      const href = tag === 'a' ? this.safeLinkUrl(node.getAttribute('href') ?? '') : null;

      const attributes = href ? ` href="${this.escapeHtml(href)}" rel="noopener noreferrer"` : '';

      return `<${tag}${attributes}>${children}</${tag}>`;

    };



    return Array.from(parsedContent.body.childNodes, serialize).join('');

  }



  private fileSafeName(value: string): string {

    return (

      value

        .trim()

        .replace(/[^a-z0-9-\_]+/gi, '-')

        .replace(/^-+|-+$/g, '') || 'ebook'

    );

  }



  private closeUploadUrl(): void {

    if (!this.uploadedObjectUrl) return;

    URL.revokeObjectURL(this.uploadedObjectUrl);

    this.uploadedObjectUrl = null;

  }



  ngOnDestroy(): void {

    this.closeUploadUrl();

  }

}
