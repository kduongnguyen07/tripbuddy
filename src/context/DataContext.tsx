import React, { createContext, useContext, useState, useEffect } from 'react';
import { Destination, JourneySlide, HeroConfig } from '../types';
import destinationsData from '../data/destinationsData.json';
import slidesData from '../data/slidesData.json';
import { fetchCloudData, saveCloudData } from '../services/cloudStorage';
import {
  getDestinationsFromDb,
  addDestinationDb,
  updateDestinationDb as updateDestInDb,
  deleteDestinationDb as deleteDestInDb,
  getHeroConfigFromDb,
  updateHeroConfigDb,
  getSlidesFromDb,
  addSlideDb,
  updateSlideDb,
  deleteSlideDb as deleteSlideFromDb,
} from '../services/neonDb';



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
  destinationsError: string | null;
  slides: JourneySlide[];
  heroConfig: HeroConfig;
  isCloudSynced: boolean;
  isSyncingCloud: boolean;
  lastSyncedAt: string | null;
  syncWithCloud: () => Promise<boolean>;
  fetchFromCloud: () => Promise<boolean>;
  addDestination: (dest: Destination) => Promise<void>;
  updateDestination: (dest: Destination) => Promise<void>;
  deleteDestination: (id: string) => Promise<void>;
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
      const deletedSet = new Set(getDeletedDestIds());
      return (destinationsData as unknown as Destination[]).filter((d) => !deletedSet.has(d.id));
    } catch {
      return destinationsData as unknown as Destination[];
    }
  });
  const [destinationsError, setDestinationsError] = useState<string | null>(null);

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

  useEffect(() => {
    localStorage.setItem('tripbudget_slides', JSON.stringify(slides));
  }, [slides]);

  useEffect(() => {
    localStorage.setItem('tripbudget_hero', JSON.stringify(heroConfig));
  }, [heroConfig]);

  // Load all site data strictly from Neon Postgres Database
  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      setIsSyncingCloud(true);
      setDestinationsError(null);
      const deletedDestsSet = new Set(getDeletedDestIds());

      try {
        const [dests, hero, dbSlides] = await Promise.all([
          getDestinationsFromDb(),
          getHeroConfigFromDb(),
          getSlidesFromDb(),
        ]);

        const filtered = dests.filter((d) => !deletedDestsSet.has(d.id));
        if (isMounted) {
          setDestinations(filtered);
          if (hero) setHeroConfig(hero);
          if (dbSlides && dbSlides.length > 0) setSlides(dbSlides);
        }
      } catch (dbErr) {
        console.error('Lỗi kết nối Neon Postgres Database:', dbErr);
        if (isMounted) setDestinationsError('Không thể kết nối Neon Database. Vui lòng kiểm tra kết nối internet.');
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
    setIsSyncingCloud(false);
    setIsCloudSynced(true);
    setLastSyncedAt(new Date().toLocaleTimeString('vi-VN'));
    return true;
  };

  const syncWithCloud = async () => {
    return await pushStateToCloud(destinations, slides, heroConfig);
  };

  const fetchFromCloud = async () => {
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

  // Destination Actions - Directly modify Neon Postgres Database
  const addDestination = async (dest: Destination): Promise<void> => {
    const savedDest = await addDestinationDb(dest);
    setDestinations((prev) => {
      const updated = [savedDest, ...prev.filter((d) => d.id !== savedDest.id)];
      localStorage.setItem('tripbudget_destinations', JSON.stringify(updated));
      return updated;
    });
    notifyStateChange();
  };

  const updateDestination = async (dest: Destination): Promise<void> => {
    const savedDest = await updateDestInDb(dest);
    setDestinations((prev) => {
      const updated = prev.map((d) => (d.id === savedDest.id ? savedDest : d));
      localStorage.setItem('tripbudget_destinations', JSON.stringify(updated));
      return updated;
    });
    notifyStateChange();
  };

  const deleteDestination = async (id: string): Promise<void> => {
    await deleteDestInDb(id);
    setDestinations((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      localStorage.setItem('tripbudget_destinations', JSON.stringify(updated));
      return updated;
    });
    notifyStateChange();
  };

  // Slide Actions - Directly modify Neon Postgres Database
  const addSlide = async (slide: JourneySlide) => {
    const savedSlide = await addSlideDb(slide);
    setSlides((prev) => {
      const updated = [...prev.filter((s) => s.id !== savedSlide.id), savedSlide];
      localStorage.setItem('tripbudget_slides', JSON.stringify(updated));
      return updated;
    });
    notifyStateChange();
  };

  const updateSlide = async (slide: JourneySlide) => {
    const savedSlide = await updateSlideDb(slide);
    setSlides((prev) => {
      const updated = prev.map((s) => (s.id === savedSlide.id ? savedSlide : s));
      localStorage.setItem('tripbudget_slides', JSON.stringify(updated));
      return updated;
    });
    notifyStateChange();
  };

  const deleteSlide = async (id: string) => {
    await deleteSlideFromDb(id);
    setSlides((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      localStorage.setItem('tripbudget_slides', JSON.stringify(updated));
      return updated;
    });
    notifyStateChange();
  };

  // Hero Actions - Directly modify Neon Postgres Database
  const updateHeroConfig = async (config: HeroConfig) => {
    const savedHero = await updateHeroConfigDb(config);
    setHeroConfig(savedHero);
    localStorage.setItem('tripbudget_hero', JSON.stringify(savedHero));
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
    setDestinations(destinationsData as unknown as Destination[]);
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
        destinationsError,
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
