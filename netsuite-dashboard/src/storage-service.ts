// Storage utility service for user preferences and data persistence
import { config } from './config';
import { ProjectRecord } from './types/dashboard';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  autoRefresh: boolean;
  refreshInterval: number;
  defaultView: 'grid' | 'list';
  showNotifications: boolean;
  compactMode: boolean;
  favoriteCategories: string[];
  recentSearches: string[];
  lastCustomerId?: number | null;
  lastAccountId?: string | null;
}

export interface DemoNote {
  id: string;
  customerId: number;
  content: string;
  timestamp: Date;
  tags: string[];
}

export interface RecentItem {
  id: string;
  type: 'scenario' | 'customer' | 'search';
  data: any;
  timestamp: Date;
}

class StorageService {
  private static instance: StorageService;
  
  private constructor() {}
  
  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // Generic storage methods
  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return defaultValue;
    }
  }

  private removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  }

  // User Preferences
  getPreferences(): UserPreferences {
    return this.getItem(config.storage.preferences, {
      theme: 'auto',
      autoRefresh: true,
      refreshInterval: config.app.refreshInterval,
      defaultView: 'grid',
      showNotifications: true,
      compactMode: false,
      favoriteCategories: [],
      recentSearches: [],
      lastCustomerId: null,
      lastAccountId: 'services'
    });
  }

  setPreferences(preferences: Partial<UserPreferences>): void {
    const current = this.getPreferences();
    this.setItem(config.storage.preferences, { ...current, ...preferences });
  }

  // Note drafts (quick notes)
  getNoteDrafts(): Record<number, string> {
    return this.getItem(config.storage.noteDrafts, {});
  }

  saveNoteDraft(customerId: number, content: string): void {
    const drafts = this.getNoteDrafts();
    if (!content.trim()) {
      if (drafts[customerId]) {
        delete drafts[customerId];
        this.setItem(config.storage.noteDrafts, drafts);
      }
      return;
    }
    drafts[customerId] = content;
    this.setItem(config.storage.noteDrafts, drafts);
  }

  clearNoteDrafts(): void {
    this.removeItem(config.storage.noteDrafts);
  }

  // Favorites Management
  getFavorites(): string[] {
    return this.getItem(config.storage.favorites, []);
  }

  addFavorite(item: string): void {
    const favorites = this.getFavorites();
    if (!favorites.includes(item)) {
      favorites.push(item);
      this.setItem(config.storage.favorites, favorites);
    }
  }

  removeFavorite(item: string): void {
    const favorites = this.getFavorites();
    const filtered = favorites.filter(fav => fav !== item);
    this.setItem(config.storage.favorites, filtered);
  }

  isFavorite(item: string): boolean {
    return this.getFavorites().includes(item);
  }

  // Demo Notes Management
  getDemoNotes(): { [key: number]: DemoNote[] } {
    return this.getItem(config.storage.demoNotes, {});
  }

  addDemoNote(customerId: number, content: string, tags: string[] = []): void {
    const notes = this.getDemoNotes();
    const note: DemoNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customerId,
      content,
      timestamp: new Date(),
      tags
    };

    if (!notes[customerId]) {
      notes[customerId] = [];
    }
    notes[customerId].push(note);
    this.setItem(config.storage.demoNotes, notes);
  }

  updateDemoNote(noteId: string, content: string, tags: string[] = []): void {
    const notes = this.getDemoNotes();
    for (const customerId in notes) {
      const noteIndex = notes[customerId].findIndex(note => note.id === noteId);
      if (noteIndex !== -1) {
        notes[customerId][noteIndex] = {
          ...notes[customerId][noteIndex],
          content,
          tags,
          timestamp: new Date()
        };
        this.setItem(config.storage.demoNotes, notes);
        break;
      }
    }
  }

  deleteDemoNote(noteId: string): void {
    const notes = this.getDemoNotes();
    for (const customerId in notes) {
      notes[customerId] = notes[customerId].filter(note => note.id !== noteId);
      if (notes[customerId].length === 0) {
        delete notes[customerId];
      }
    }
    this.setItem(config.storage.demoNotes, notes);
  }

  // Prospect persistence
  getProspects(): any[] {
    return this.getItem(config.storage.prospects, []);
  }

  saveProspects(prospects: any[]): void {
    this.setItem(config.storage.prospects, prospects);
  }

  // Applied prompts per prospect
  getAppliedPrompts(): Record<number, string[]> {
    return this.getItem(config.storage.appliedPrompts, {});
  }

  saveAppliedPrompts(promptsMap: Record<number, string[]>): void {
    this.setItem(config.storage.appliedPrompts, promptsMap);
  }

  // Project sync records
  getProjectSyncs(): Record<number, ProjectRecord> {
    return this.getItem(config.storage.projectSyncs, {} as Record<number, ProjectRecord>);
  }

  saveProjectSyncs(syncs: Record<number, ProjectRecord>): void {
    this.setItem(config.storage.projectSyncs, syncs);
  }

  // Recent Items Management
  getRecentItems(): RecentItem[] {
    return this.getItem(config.storage.recentItems, []);
  }

  addRecentItem(type: 'scenario' | 'customer' | 'search', data: any): void {
    const recent = this.getRecentItems();
    const item: RecentItem = {
      id: `recent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date()
    };

    // Remove existing item if duplicate
    const filtered = recent.filter(r => 
      !(r.type === type && JSON.stringify(r.data) === JSON.stringify(data))
    );

    // Add to beginning and limit to maxRecentItems
    filtered.unshift(item);
    const limited = filtered.slice(0, config.app.maxRecentItems);
    
    this.setItem(config.storage.recentItems, limited);
  }

  clearRecentItems(): void {
    this.removeItem(config.storage.recentItems);
  }

  // Search History
  addRecentSearch(query: string): void {
    if (!query.trim()) return;
    
    const preferences = this.getPreferences();
    const searches = preferences.recentSearches || [];
    
    // Remove existing and add to front
    const filtered = searches.filter(s => s !== query);
    filtered.unshift(query);
    
    // Limit to 10 recent searches
    const limited = filtered.slice(0, 10);
    
    this.setPreferences({ recentSearches: limited });
  }

  getRecentSearches(): string[] {
    return this.getPreferences().recentSearches || [];
  }

  clearRecentSearches(): void {
    this.setPreferences({ recentSearches: [] });
  }

  // Export all data
  exportAllData(): string {
    const data = {
      preferences: this.getPreferences(),
      favorites: this.getFavorites(),
      demoNotes: this.getDemoNotes(),
      recentItems: this.getRecentItems(),
      exportedAt: new Date().toISOString(),
      version: config.app.version
    };
    return JSON.stringify(data, null, 2);
  }

  // Import data
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.preferences) this.setItem(config.storage.preferences, data.preferences);
      if (data.favorites) this.setItem(config.storage.favorites, data.favorites);
      if (data.demoNotes) this.setItem(config.storage.demoNotes, data.demoNotes);
      if (data.recentItems) this.setItem(config.storage.recentItems, data.recentItems);
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // Clear all data
  clearAllData(): void {
    this.removeItem(config.storage.preferences);
    this.removeItem(config.storage.favorites);
    this.removeItem(config.storage.demoNotes);
    this.removeItem(config.storage.recentItems);
    this.removeItem(config.storage.noteDrafts);
  }
}

// Export singleton instance
export default StorageService.getInstance();
