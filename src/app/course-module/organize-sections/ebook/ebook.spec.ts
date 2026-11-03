import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Ebook } from './ebook';

describe('Ebook', () => {
  let component: Ebook;
  let fixture: ComponentFixture<Ebook>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ebook],
    }).compileComponents();

    fixture = TestBed.createComponent(Ebook);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the four Ebook presets from the activity flow', () => {
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'section[role="dialog"] button',
    );
    const options = Array.from(buttons)
      .map((button) => button.textContent?.trim())
      .filter((text): text is string => Boolean(text) && text !== '×');

    expect(options).toEqual(['Blank Ebook', 'Welcome', 'Course Overview', 'Summary']);
  });

  it('opens Activity Name, then Add Section, before entering the editor for every preset', () => {
    for (const preset of ['Blank Ebook', 'Welcome', 'Course Overview', 'Summary'] as const) {
      component.mode.set('chooser');
      component.contentDialogOpen.set(false);
      component.choosePreset(preset);

      expect(component.mode()).toBe('name');
      expect(component.activityNameError()).toBe('');

      component.activityName.set(`${preset} Activity`);
      component.saveActivityName();

      expect(component.mode()).toBe('editor');
      expect(component.contentDialogOpen()).toBe(true);

      fixture.detectChanges();
      const dialog = (fixture.nativeElement as HTMLElement).querySelector(
        '[role="dialog"] #ebook-add-section-title',
      );
      expect(dialog?.textContent).toContain('Add section');
      component.closeContentDialog();
    }
  });

  it('starts a blank Ebook with an empty editable text block and adds selected templates', () => {
    component.choosePreset('Blank Ebook');
    component.activityName.set('Unit Ebook');
    component.saveActivityName();

    expect(component.mode()).toBe('editor');
    expect(component.contentDialogOpen()).toBe(true);
    component.closeContentDialog();
    expect(component.elements()).toHaveLength(1);
    expect(component.elements()[0].content).toBe('');
    expect(component.previewElements()).toHaveLength(0);

    component.activeCategory.set('Media & Text');
    component.addTemplate(component.templatesForCategory('Media & Text')[0]);

    expect(component.contentDialogOpen()).toBe(false);
    expect(component.elements()).toHaveLength(2);
    expect(component.selectedElement()?.kind).toBe('text');
  });

  it('opens the Add section popup from Add content and adds a selected section', () => {
    component.choosePreset('Blank Ebook');
    component.activityName.set('Unit Ebook');
    component.saveActivityName();
    fixture.detectChanges();
    component.closeContentDialog();
    fixture.detectChanges();
    component.closeContentDialog();
    fixture.detectChanges();

    expect(component.contentDialogOpen()).toBe(false);
    const addContentButton = (fixture.nativeElement as HTMLElement).querySelector(
      '#ebook-add-content',
    ) as HTMLButtonElement;
    addContentButton.click();
    fixture.detectChanges();

    expect(component.contentDialogOpen()).toBe(true);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"] #ebook-add-section-title')
        ?.textContent,
    ).toContain('Add section');

    const firstTemplate = (fixture.nativeElement as HTMLElement).querySelector(
      '[aria-label="Add Cover — Charcoal"]',
    ) as HTMLButtonElement;
    firstTemplate.click();
    fixture.detectChanges();

    expect(component.contentDialogOpen()).toBe(false);
    expect(component.elements()).toHaveLength(2);
    expect(component.selectedElement()?.title).toBe('Cover — Charcoal');
  });

  it('shows the blank-editor reference preview until text is entered', () => {
    component.choosePreset('Blank Ebook');
    component.activityName.set('Unit Ebook');
    component.saveActivityName();
    fixture.detectChanges();

    const preview = (fixture.nativeElement as HTMLElement).querySelector(
      '[aria-label="Ebook preview"]',
    ) as HTMLElement;
    expect(preview.textContent).toContain('Enter a heading');

    const editor = (fixture.nativeElement as HTMLElement).querySelector(
      '#ebook-text-content',
    ) as HTMLElement;
    editor.textContent = 'A new heading';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(component.elements()[0].content).toBe('A new heading');
    expect(component.previewElements()).toHaveLength(1);
    expect(editor.textContent).toBe('A new heading');
    expect(preview.textContent).toContain('A new heading');
    expect(preview.textContent).not.toContain('Enter a heading');
  });

  it('keeps text shadow settings available in the text toolbar', () => {
    component.choosePreset('Blank Ebook');
    component.activityName.set('Unit Ebook');
    component.saveActivityName();
    component.closeContentDialog();

    const position = document.createElement('select');
    position.innerHTML = '<option>None</option><option>Right</option>';
    position.value = 'Right';
    const positionEvent = new Event('change');
    position.dispatchEvent(positionEvent);
    component.updateSelectedSetting('shadowPosition', positionEvent);

    const blur = document.createElement('input');
    blur.value = '4';
    const blurEvent = new Event('input');
    blur.dispatchEvent(blurEvent);
    component.updateSelectedSetting('shadowBlur', blurEvent);

    expect(component.selectedElement()?.shadowPosition).toBe('Right');
    expect(component.selectedElement()?.shadowBlur).toBe(4);
    fixture.detectChanges();
    const toolbar = (fixture.nativeElement as HTMLElement).querySelector('[aria-label="Text formatting"]');
    expect(toolbar?.querySelector('[aria-label="Shadow position"]')).toBeTruthy();
    expect(toolbar?.querySelector('[aria-label="Shadow blur"]')).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelector('details')).toBeNull();
  });

  it('updates individual RGB channels in the Text Color section', () => {
    component.choosePreset('Blank Ebook');
    component.activityName.set('Unit Ebook');
    component.saveActivityName();
    component.closeContentDialog();

    const green = document.createElement('input');
    green.value = '90';
    const greenEvent = new Event('input');
    green.dispatchEvent(greenEvent);
    component.updateTextColorChannel('green', greenEvent);

    expect(component.selectedElement()?.textColor).toBe('#485a50');
    expect(component.textColorRgb()).toEqual({ red: 72, green: 90, blue: 80 });
  });

  it('rejects Activity Names longer than 100 characters', () => {
    component.choosePreset('Blank Ebook');
    component.activityName.set('A'.repeat(101));
    component.saveActivityName();

    expect(component.mode()).toBe('name');
    expect(component.activityNameError()).toBe('Activity Name must not exceed 100 characters.');
  });
});
