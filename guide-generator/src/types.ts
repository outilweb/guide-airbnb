export type Rule = { id: string; text: string };
export type Link = { id: string; label: string; url: string };
export type PlaceCategory = 'Restaurant' | 'Activité' | 'Commerce essentiel' | 'Lieu' | 'Autre';
export type Place = { id: string; name: string; category: PlaceCategory; subtype?: string; description?: string; address?: string; mapsUrl?: string; siteUrl?: string };
export type Contact = { name?: string; phone?: string; email?: string };
export type Wifi = { ssid?: string; password?: string };
export type Stay = { checkIn?: { time?: string; instructions?: string; code?: string }; checkOut?: { time?: string; checklist?: string } };
export type Theme = { primary: string; accent: string; fontHeading: string; fontBody: string; logoDataUrl?: string; welcomeMessage?: string };
export type Guide = {
  guideId?: string; // défini à la publication
  title: string;
  address?: string;
  stay?: Stay;
  contact?: Contact;
  wifi?: Wifi;
  rules: Rule[];
  equipmentNotes?: string;
  places: Place[];
  map: { homeAddress?: string; points: { id: string; label: string; address?: string; mapsUrl?: string }[] };
  links: Link[];
  theme: Theme;
  createdAt: number;
  updatedAt: number;
  ownerId?: string;
  ownerEmail?: string;
};

export type PublishedGuide = Guide & { guideId: string };

export type Owner = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: number;
};

export const defaultTheme: Theme = {
  primary: '#2c3e50',
  accent: '#3498db',
  fontHeading: 'Inter',
  fontBody: 'Inter',
  welcomeMessage: 'Bienvenue chez vous',
};

export const emptyGuide = (): Guide => ({
  title: '',
  rules: [],
  places: [],
  map: { homeAddress: '', points: [] },
  links: [],
  theme: defaultTheme,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
