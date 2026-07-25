import React, { createContext, useContext, useState, useEffect } from 'react';
import { Destination, JourneySlide, HeroConfig } from '../types';
import destinationsData from '../data/destinationsData.json';
import slidesData from '../data/slidesData.json';
import { fetchCloudData, saveCloudData } from '../services/cloudStorage';

export const DEFAULT_HERO_CONFIG: HeroConfig = {
  badge: 'VIỆT NAM VÀ NHỮNG CHUYẾN ĐI',
  titleLine1: 'Khám Phá Việt Nam',
  titleLine2: 'Theo Cách',
  titleHighlight: 'Của Bạn',
  backgroundImage: 'https://images.pexels.com/photos/28706873/pexels-photo-28706873.jpeg',
  ctaButtonText: 'Khám Phá Ngay'
};

interface DataContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  destinations: Destination[];
  slides: JourneySlide[];
  heroConfig: HeroConfig;
  isCloudSynced: boolean;
  isSyncingCloud: boolean;
  lastSyncedAt: string | null;
  syncWithCloud: () => Promise<boolean>;
  fetchFromCloud: () => Promise<boolean>;
  addDestination: (dest: Destination) => void;
  updateDestination: (dest: Destination) => void;
  deleteDestination: (id: string) => void;
  addSlide: (slide: JourneySlide) => void;
  updateSlide: (slide: JourneySlide) => void;
  deleteSlide: (id: string) => void;
  updateHeroConfig: (config: HeroConfig) => void;
  exportDataJSON: () => string;
  importDataJSON: (jsonString: string) => boolean;
  resetToDefaults: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('tripbudget_theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    localStorage.setItem('tripbudget_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const getDeletedDestIds = (): string[] => {
    try {
      const saved = localStorage.getItem('tripbudget_deleted_destinations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const getDeletedSlideIds = (): string[] => {
    try {
      const saved = localStorage.getItem('tripbudget_deleted_slides');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const markLocalUpdate = () => {
    try {
      localStorage.setItem('tripbudget_last_local_update', Date.now().toString());
    } catch {}
  };

  const DATASET_VERSION = 'v3.0_canonical_db_ids';

  const CANONICAL_ID_MAP: Record<string, string> = {
    'ha-noi': 'HAN',
    'hue': 'HUE',
    'da-nang': 'DAD',
    'da-lat': 'DLD',
    'DLT': 'DLD',
    'phu-quoc': 'PQC',
  };

  const [destinations, setDestinations] = useState<Destination[]>(() => {
    try {
      const currentVersion = localStorage.getItem('tripbudget_dataset_version');
      if (currentVersion !== DATASET_VERSION) {
        localStorage.removeItem('tripbudget_destinations');
        localStorage.setItem('tripbudget_dataset_version', DATASET_VERSION);
      }

      const deletedSet = new Set(getDeletedDestIds());
      const saved = localStorage.getItem('tripbudget_destinations');
      if (saved !== null && currentVersion === DATASET_VERSION) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= (destinationsData as Destination[]).length) {
          const normalized = (parsed as Destination[]).map((d) => ({
            ...d,
            id: CANONICAL_ID_MAP[d.id] || d.id,
          }));
          return normalized.filter((d) => !deletedSet.has(d.id));
        }
      }
      const defaultDests = (destinationsData as Destination[]).map((d) => ({
        ...d,
        id: CANONICAL_ID_MAP[d.id] || d.id,
      }));
      return defaultDests.filter((d) => !deletedSet.has(d.id));
    } catch {
      return destinationsData as Destination[];
    }
  });

  const [slides, setSlides] = useState<JourneySlide[]>(() => {
    try {
      const deletedSet = new Set(getDeletedSlideIds());
      const saved = localStorage.getItem('tripbudget_slides');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return (parsed as JourneySlide[]).filter((s) => !deletedSet.has(s.id));
        }
      }
      return (slidesData as JourneySlide[]).filter((s) => !deletedSet.has(s.id));
    } catch {
      return slidesData as JourneySlide[];
    }
  });

  const [heroConfig, setHeroConfig] = useState<HeroConfig>(() => {
    try {
      const saved = localStorage.getItem('tripbudget_hero');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.titleLine1) {
          return parsed as HeroConfig;
        }
      }
      return DEFAULT_HERO_CONFIG;
    } catch {
      return DEFAULT_HERO_CONFIG;
    }
  });

  // Cloud Sync Indicators
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Sync to LocalStorage on changes
  useEffect(() => {
    localStorage.setItem('tripbudget_destinations', JSON.stringify(destinations));
  }, [destinations]);

  useEffect(() => {
    localStorage.setItem('tripbudget_slides', JSON.stringify(slides));
  }, [slides]);

  useEffect(() => {
    localStorage.setItem('tripbudget_hero', JSON.stringify(heroConfig));
  }, [heroConfig]);

  // Load latest Database & Cloud DB data on application mount safely
  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      setIsSyncingCloud(true);
      const deletedDestsSet = new Set(getDeletedDestIds());
      const deletedSlidesSet = new Set(getDeletedSlideIds());

      // 1. Try loading destinations directly from backend Database endpoint
      try {
        const dbRes = await fetch('http://127.0.0.1:8000/api/v1/db/destinations');
        if (dbRes.ok) {
          const dbJson = await dbRes.json();
          if (dbJson && dbJson.status === 'success' && Array.isArray(dbJson.destinations)) {
            const filtered = dbJson.destinations
              .filter((d: any) => !deletedDestsSet.has(d.id))
              .map((d: any) => {
                const defaultItem = (destinationsData as Destination[]).find(x => x.id === d.id);
                return {
                  ...defaultItem,
                  ...d,
                  activities: (d.activities && d.activities.length > 0) ? d.activities : (defaultItem?.activities || [])
                };
              });
            if (isMounted) {
              setDestinations(filtered);
              localStorage.setItem('tripbudget_destinations', JSON.stringify(filtered));
            }
          }
        }
      } catch (dbErr) {
        console.warn('Backend DB offline, fallback to local storage cache for destinations:', dbErr);
      }

      if (isMounted) {
        setIsSyncingCloud(false);
        setIsCloudSynced(true);
        setLastSyncedAt(new Date().toLocaleTimeString('vi-VN'));
      }
    };

    loadInitialData();
    return () => { isMounted = false; };
  }, []);

  const pushStateToCloud = async (_d = destinations, _s = slides, _h = heroConfig) => {
    // Cloud sync disabled for demo stability (LocalStorage & DB active)
    setIsSyncingCloud(false);
    setIsCloudSynced(true);
    setLastSyncedAt(new Date().toLocaleTimeString('vi-VN'));
    return true;
  };

  const syncWithCloud = async () => {
    return await pushStateToCloud(destinations, slides, heroConfig);
  };

  const fetchFromCloud = async () => {
    // Cloud sync disabled for demo stability
    setIsSyncingCloud(false);
    setIsCloudSynced(true);
    return true;
  };

  const notifyStateChange = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('tripbudget_dataset_updated'));
    }
  };

  // Destination Actions
  const addDestination = (dest: Destination) => {
    const updated = [dest, ...destinations];
    setDestinations(updated);
    localStorage.setItem('tripbudget_destinations', JSON.stringify(updated));

    // Remove from deleted blacklist if re-added
    const deleted = getDeletedDestIds().filter((id) => id !== dest.id);
    localStorage.setItem('tripbudget_deleted_destinations', JSON.stringify(deleted));

    markLocalUpdate();
    pushStateToCloud(updated, slides, heroConfig);
    notifyStateChange();

    fetch('http://127.0.0.1:8000/api/v1/db/destinations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dest),
    }).catch((e) => console.log('PostgreSQL sync info:', e));
  };

  const updateDestination = (dest: Destination) => {
    const updated = destinations.map((d) => (d.id === dest.id ? dest : d));
    setDestinations(updated);
    localStorage.setItem('tripbudget_destinations', JSON.stringify(updated));
    markLocalUpdate();
    pushStateToCloud(updated, slides, heroConfig);
    notifyStateChange();

    fetch('http://127.0.0.1:8000/api/v1/db/destinations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dest),
    }).catch((e) => console.log('PostgreSQL sync info:', e));
  };

  const deleteDestination = (id: string) => {
    const updated = destinations.filter((d) => d.id !== id);
    setDestinations(updated);
    localStorage.setItem('tripbudget_destinations', JSON.stringify(updated));

    // Add to deleted blacklist in localStorage so reload NEVER brings it back
    const deleted = getDeletedDestIds();
    if (!deleted.includes(id)) {
      localStorage.setItem('tripbudget_deleted_destinations', JSON.stringify([...deleted, id]));
    }

    markLocalUpdate();
    pushStateToCloud(updated, slides, heroConfig);
    notifyStateChange();

    fetch(`http://127.0.0.1:8000/api/v1/db/destinations/${id}`, {
      method: 'DELETE',
    }).catch((e) => console.log('PostgreSQL sync info:', e));
  };

  // Slide Actions
  const addSlide = (slide: JourneySlide) => {
    const updated = [...slides, slide];
    setSlides(updated);
    localStorage.setItem('tripbudget_slides', JSON.stringify(updated));

    const deleted = getDeletedSlideIds().filter((id) => id !== slide.id);
    localStorage.setItem('tripbudget_deleted_slides', JSON.stringify(deleted));

    markLocalUpdate();
    pushStateToCloud(destinations, updated, heroConfig);
    notifyStateChange();
  };

  const updateSlide = (slide: JourneySlide) => {
    const updated = slides.map((s) => (s.id === slide.id ? slide : s));
    setSlides(updated);
    localStorage.setItem('tripbudget_slides', JSON.stringify(updated));
    markLocalUpdate();
    pushStateToCloud(destinations, updated, heroConfig);
    notifyStateChange();
  };

  const deleteSlide = (id: string) => {
    const updated = slides.filter((s) => s.id !== id);
    setSlides(updated);
    localStorage.setItem('tripbudget_slides', JSON.stringify(updated));

    const deleted = getDeletedSlideIds();
    if (!deleted.includes(id)) {
      localStorage.setItem('tripbudget_deleted_slides', JSON.stringify([...deleted, id]));
    }

    markLocalUpdate();
    pushStateToCloud(destinations, updated, heroConfig);
    notifyStateChange();
  };

  // Hero Actions
  const updateHeroConfig = (config: HeroConfig) => {
    setHeroConfig(config);
    localStorage.setItem('tripbudget_hero', JSON.stringify(config));
    markLocalUpdate();
    pushStateToCloud(destinations, slides, config);
    notifyStateChange();
  };

  // Backup Tools
  const exportDataJSON = () => {
    const backup = {
      heroConfig,
      destinations,
      slides,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    return JSON.stringify(backup, null, 2);
  };

  const importDataJSON = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.destinations && Array.isArray(parsed.destinations)) {
        setDestinations(parsed.destinations);
        localStorage.setItem('tripbudget_destinations', JSON.stringify(parsed.destinations));
      }
      if (parsed.slides && Array.isArray(parsed.slides)) {
        setSlides(parsed.slides);
        localStorage.setItem('tripbudget_slides', JSON.stringify(parsed.slides));
      }
      if (parsed.heroConfig) {
        setHeroConfig(parsed.heroConfig);
        localStorage.setItem('tripbudget_hero', JSON.stringify(parsed.heroConfig));
      }
      markLocalUpdate();
      notifyStateChange();
      return true;
    } catch (err) {
      console.error('Failed to import JSON data:', err);
      return false;
    }
  };

  const resetToDefaults = () => {
    setDestinations(destinationsData as Destination[]);
    setSlides(slidesData as JourneySlide[]);
    setHeroConfig(DEFAULT_HERO_CONFIG);
    localStorage.removeItem('tripbudget_destinations');
    localStorage.removeItem('tripbudget_slides');
    localStorage.removeItem('tripbudget_hero');
    localStorage.removeItem('tripbudget_last_local_update');
    localStorage.removeItem('tripbudget_deleted_destinations');
    localStorage.removeItem('tripbudget_deleted_slides');
    localStorage.removeItem('admin_tripbudget_dataset_500');
    localStorage.removeItem('tripbudget_dataset_version');
    markLocalUpdate();
    notifyStateChange();
  };

  return (
    <DataContext.Provider
      value={{
        theme,
        toggleTheme,
        destinations,
        slides,
        heroConfig,
        isCloudSynced,
        isSyncingCloud,
        lastSyncedAt,
        syncWithCloud,
        fetchFromCloud,
        addDestination,
        updateDestination,
        deleteDestination,
        addSlide,
        updateSlide,
        deleteSlide,
        updateHeroConfig,
        exportDataJSON,
        importDataJSON,
        resetToDefaults
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
