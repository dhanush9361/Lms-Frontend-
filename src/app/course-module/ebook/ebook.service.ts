import { Injectable, signal } from '@angular/core';

export type EbookTemplate = 'blank' | 'welcome' | 'course-overview' | 'summary';
export type EbookElementKind =
  | 'Ebook Covers'
  | 'Media & Text'
  | 'Counters'
  | 'Download File'
  | 'External Content'
  | 'Team & Authors'
  | 'Own Layout'
  | 'Ebook Text';
export type EbookTextType =
  | 'Ebook Heading 1'
  | 'Ebook Heading 2'
  | 'Ebook Heading 3'
  | 'Ebook Heading 4'
  | 'Ebook Main Text';

export interface EbookElementSettings {
  textType: EbookTextType;
  fontFamily: 'Work Sans' | 'Nunito Sans' | 'Source Sans Pro';
  opacity: number;
  textColor: string;
  textShadowPosition: 'None' | 'Left' | 'Right' | 'Bottom' | 'Round';
  shadowHorizontalOffset: number;
  shadowVerticalOffset: number;
  shadowColor: string;
  shadowBlur: number;
  alignment: 'Left' | 'Center' | 'Right';
  height: 'Extra Small' | 'Small' | 'Normal' | 'Large' | 'Extra Large';
  width: 'Full' | 'Wide' | 'Normal' | 'Narrow';
  boxColor: string;
  borderTop: number;
  borderRight: number;
  borderBottom: number;
  borderLeft: number;
  borderStyle: 'No Border' | 'Solid' | 'Dashed' | 'Dotted';
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
  columns: 1 | 2 | 3 | 4;
  backgroundType: 'Color' | 'Image' | 'Video' | 'Embed' | 'SVG';
  backgroundColor: string;
  backgroundUrl: string;
  scrollEffect: 'None' | 'Zoom in' | 'Zoom out' | 'Parallax' | 'Close up' | 'Push Away' | 'Fixed';
  overlayEnabled: boolean;
  overlayColor: string;
  overlayOpacity: number;
  topDivider: boolean;
  bottomDivider: boolean;
  dividerFill: string;
  dividerWidth: number;
  dividerHeight: number;
  dividerStackingOrder: boolean;
  dividerHorizontalFlip: boolean;
}

export interface EbookElement {
  id: number;
  kind: EbookElementKind;
  design: number;
  title: string;
  content: string;
  settings: EbookElementSettings;
  attachment?: { name: string; type: string; dataUrl: string };
}

export interface EbookActivity {
  id: number;
  courseId: number;
  sectionId: number;
  name: string;
  template: EbookTemplate;
  elements: EbookElement[];
  createdAt: string;
  updatedAt: string;
  uploadedFile?: { name: string; type: string; dataUrl: string };
}

const STORAGE_KEY = 'lms.ebooks.v1';

function isEbookActivity(value: unknown): value is EbookActivity {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record['id'] === 'number' &&
    typeof record['courseId'] === 'number' &&
    typeof record['sectionId'] === 'number' &&
    typeof record['name'] === 'string' &&
    Array.isArray(record['elements']);
}

export function createEbookSettings(): EbookElementSettings {
  return {
    textType: 'Ebook Heading 1',
    fontFamily: 'Work Sans',
    opacity: 100,
    textColor: '#484266',
    textShadowPosition: 'None',
    shadowHorizontalOffset: 0,
    shadowVerticalOffset: 0,
    shadowColor: '#000000',
    shadowBlur: 0,
    alignment: 'Left',
    height: 'Normal',
    width: 'Full',
    boxColor: '#ffffff',
    borderTop: 0,
    borderRight: 0,
    borderBottom: 0,
    borderLeft: 0,
    borderStyle: 'Solid',
    borderColor: '#d8d8d8',
    borderRadius: 0,
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 16,
    marginLeft: 0,
    columns: 1,
    backgroundType: 'Color',
    backgroundColor: '#ffffff',
    backgroundUrl: '',
    scrollEffect: 'None',
    overlayEnabled: false,
    overlayColor: '#000000',
    overlayOpacity: 30,
    topDivider: false,
    bottomDivider: false,
    dividerFill: '#63bac6',
    dividerWidth: 100,
    dividerHeight: 8,
    dividerStackingOrder: false,
    dividerHorizontalFlip: false,
  };
}

@Injectable({ providedIn: 'root' })
export class EbookService {
  readonly ebooks = signal<EbookActivity[]>(this.readStorage());

  all(): EbookActivity[] {
    return this.ebooks();
  }

  forSection(courseId: number, sectionId: number): EbookActivity[] {
    return this.ebooks()
      .filter(ebook => ebook.courseId === courseId && ebook.sectionId === sectionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  get(id: number): EbookActivity | null {
    return this.ebooks().find(ebook => ebook.id === id) ?? null;
  }

  save(activity: EbookActivity): EbookActivity {
    const current = this.ebooks();
    const now = new Date().toISOString();
    const id = activity.id || Math.max(Date.now(), ...current.map(ebook => ebook.id + 1));
    const existing = current.find(ebook => ebook.id === id);
    const saved: EbookActivity = {
      ...activity,
      id,
      createdAt: existing?.createdAt ?? activity.createdAt ?? now,
      updatedAt: now,
    };
    const next = existing
      ? current.map(ebook => (ebook.id === id ? saved : ebook))
      : [...current, saved];
    this.writeStorage(next);
    this.ebooks.set(next);
    return saved;
  }

  remove(id: number): void {
    const next = this.ebooks().filter(ebook => ebook.id !== id);
    this.writeStorage(next);
    this.ebooks.set(next);
  }

  copy(id: number): EbookActivity | null {
    const source = this.get(id);
    if (!source) return null;
    const now = new Date().toISOString();
    let nextElementId = Date.now();
    return this.save({
      ...source,
      id: 0,
      name: `${source.name} (Copy)`.slice(0, 100),
      elements: source.elements.map(element => ({ ...element, id: nextElementId++, settings: { ...element.settings } })),
      createdAt: now,
      updatedAt: now,
    });
  }

  private readStorage(): EbookActivity[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      if (!Array.isArray(value)) return [];
      return value.filter(isEbookActivity);
    } catch {
      return [];
    }
  }

  private writeStorage(ebooks: EbookActivity[]): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ebooks));
  }
}
