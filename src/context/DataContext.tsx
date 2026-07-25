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

  const [destinations, setDestinations] = useState<Destination[]>(() => {
    try {
      const saved = localStorage.getItem('tripbudget_destinations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].hero_image && parsed[0].satisfaction_scores) {
          return parsed as Destination[];
        }
      }
      return destinationsData as Destination[];
    } catch {
      return destinationsData as Destination[];
    }
  });

  const [slides, setSlides] = useState<JourneySlide[]>(() => {
    try {
      const saved = localStorage.getItem('tripbudget_slides');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title) {
          return parsed as JourneySlide[];
        }
      }
      return slidesData as JourneySlide[];
    } catch {
      return slidesData as JourneySlide[];
    }
  });

  const [heroConfig, setHeroConfig] = useState<HeroConfig>(() => {
    try {
      const saved = localStorage.getItem('tripbudget_hero');
      if (saved) {
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

  // Load latest Cloud DB data on application mount
  useEffect(() => {
    let isMounted = true;
    const loadCloud = async () => {
      setIsSyncingCloud(true);
      const data = await fetchCloudData();
      if (data && isMounted) {
        if (data.destinations && Array.isArray(data.destinations) && data.destinations.length > 0 && data.destinations[0].hero_image && data.destinations[0].satisfaction_scores) {
          setDestinations(data.destinations);
        }
        if (data.slides && Array.isArray(data.slides) && data.slides.length > 0 && data.slides[0].title) {
          setSlides(data.slides);
        }
        if (data.heroConfig && data.heroConfig.titleLine1) {
          setHeroConfig(data.heroConfig);
        }
        setIsCloudSynced(true);
        setLastSyncedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString('vi-VN') : new Date().toLocaleTimeString('vi-VN'));
      }
      if (isMounted) setIsSyncingCloud(false);
    };

    loadCloud();
    return () => { isMounted = false; };
  }, []);

  const pushStateToCloud = async (d = destinations, s = slides, h = heroConfig) => {
    setIsSyncingCloud(true);
    const ok = await saveCloudData({ destinations: d, slides: s, heroConfig: h });
    setIsCloudSynced(ok);
    if (ok) setLastSyncedAt(new Date().toLocaleTimeString('vi-VN'));
    setIsSyncingCloud(false);
    return ok;
  };

  const syncWithCloud = async () => {
    return await pushStateToCloud(destinations, slides, heroConfig);
  };

  const fetchFromCloud = async () => {
    setIsSyncingCloud(true);
    const data = await fetchCloudData();
    if (data) {
      if (data.destinations) setDestinations(data.destinations);
      if (data.slides) setSlides(data.slides);
      if (data.heroConfig) setHeroConfig(data.heroConfig);
      setIsCloudSynced(true);
      setLastSyncedAt(new Date().toLocaleTimeString('vi-VN'));
      setIsSyncingCloud(false);
      return true;
    }
    setIsSyncingCloud(false);
    return false;
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
    pushStateToCloud(destinations, updated, heroConfig);
    notifyStateChange();
  };

  const updateSlide = (slide: JourneySlide) => {
    const updated = slides.map((s) => (s.id === slide.id ? slide : s));
    setSlides(updated);
    pushStateToCloud(destinations, updated, heroConfig);
    notifyStateChange();
  };

  const deleteSlide = (id: string) => {
    const updated = slides.filter((s) => s.id !== id);
    setSlides(updated);
    pushStateToCloud(destinations, updated, heroConfig);
    notifyStateChange();
  };

  // Hero Actions
  const updateHeroConfig = (config: HeroConfig) => {
    setHeroConfig(config);
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
      }
      if (parsed.slides && Array.isArray(parsed.slides)) {
        setSlides(parsed.slides);
      }
      if (parsed.heroConfig) {
        setHeroConfig(parsed.heroConfig);
      }
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
    localStorage.removeItem('admin_tripbudget_dataset_500');
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
