import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, LayoutDashboard, MapPin, Sparkles, Sliders, Download, Upload, RotateCcw, 
  Plus, Trash2, Edit3, Save, Check, Image as ImageIcon, BookOpen, DollarSign,
  Cloud, CloudUpload, CloudDownload, RefreshCw, Search, Bell, Calendar,
  TrendingUp, User, ChevronRight, CheckCircle2, ShieldCheck, Flame, Utensils,
  Globe, Monitor, Tablet, Smartphone, ExternalLink, Eye, Compass, List, Grid, Star
} from 'lucide-react';

import { useData } from '../../context/DataContext';
import { Destination, JourneySlide, HeroConfig, ActivityItem, TravelTipItem } from '../../types';
import { SafeImage } from '../common/SafeImage';
import fullDatasetRaw from '../../../backend/tripbuddy_full_dataset_500.json';
import { getServicesFromDb, addServiceDb, deleteServiceDb } from '../../services/neonDb';

type BulkServiceImport = Record<string, any>;

interface BulkImportIssue {
  row: number;
  message: string;
}

const BULK_IMPORT_BATCH_SIZE = 10;

function parseBulkServices(payload: unknown): { services: BulkServiceImport[]; issues: BulkImportIssue[] } {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { services?: unknown }).services)
      ? (payload as { services: unknown[] }).services
      : null;

  if (!rows) {
    return { services: [], issues: [{ row: 0, message: 'File phải là một mảng JSON dịch vụ.' }] };
  }

  const issues: BulkImportIssue[] = [];
  const ids = new Set<string>();
  const services = rows.flatMap((row, index) => {
    const rowNumber = index + 1;
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      issues.push({ row: rowNumber, message: 'Dòng phải là một đối tượng dịch vụ.' });
      return [];
    }

    const service = { ...row } as BulkServiceImport;
    const id = typeof service.id === 'string' ? service.id.trim() : '';
    const destinationId = typeof service.destination_id === 'string' ? service.destination_id.trim() : '';
    const name = typeof service.name === 'string' ? service.name.trim() : '';
    const price = Number(service.price);
    const rating = Number(service.rating);
    const duration = Number(service.duration_mins);

    if (!id) issues.push({ row: rowNumber, message: 'Thiếu ID dịch vụ.' });
    else if (ids.has(id)) issues.push({ row: rowNumber, message: `ID trùng: ${id}.` });
    else ids.add(id);
    if (!destinationId) issues.push({ row: rowNumber, message: 'Thiếu destination_id.' });
    if (!name) issues.push({ row: rowNumber, message: 'Thiếu tên dịch vụ.' });
    if (!service.category || typeof service.category !== 'string') issues.push({ row: rowNumber, message: 'Thiếu category.' });
    if (!Number.isFinite(price) || price < 0) issues.push({ row: rowNumber, message: 'price phải là số không âm.' });
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) issues.push({ row: rowNumber, message: 'rating phải nằm trong khoảng 0–5.' });
    if (!Number.isFinite(duration) || duration < 0) issues.push({ row: rowNumber, message: 'duration_mins phải là số không âm.' });
    if (service.coordinates != null && (!Array.isArray(service.coordinates) || service.coordinates.length !== 2 || service.coordinates.some((value: unknown) => !Number.isFinite(Number(value))))) {
      issues.push({ row: rowNumber, message: 'coordinates phải là [vĩ độ, kinh độ] hoặc null.' });
    }

    return [{
      ...service,
      id,
      destination_id: destinationId,
      name,
      price,
      rating,
      duration_mins: duration,
      tags: Array.isArray(service.tags)
        ? service.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
        : typeof service.tags === 'string'
          ? service.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
          : [],
    }];
  });

  return { services, issues };
}

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ isOpen, onClose }) => {
  const { 
    destinations, slides, heroConfig, 
    isCloudSynced, isSyncingCloud, lastSyncedAt, syncWithCloud, fetchFromCloud,
    addDestination, updateDestination, deleteDestination,
    addSlide, updateSlide, deleteSlide,
    updateHeroConfig, exportDataJSON, importDataJSON, resetToDefaults
  } = useData();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'services' | 'destinations' | 'hero' | 'slides' | 'backup' | 'guide'>('services');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 500 Dataset Services State - Initialized with 500 dataset, refreshed from Neon Postgres DB
  const [servicesList, setServicesList] = useState<any[]>(() => {
    return fullDatasetRaw as any[];
  });
  const [isServicesLoading, setIsServicesLoading] = useState<boolean>(false);
  const [bulkImportFileName, setBulkImportFileName] = useState<string | null>(null);
  const [bulkImportServices, setBulkImportServices] = useState<BulkServiceImport[]>([]);
  const [bulkImportIssues, setBulkImportIssues] = useState<BulkImportIssue[]>([]);
  const [isBulkImporting, setIsBulkImporting] = useState(false);

  const [serviceDestFilter, setServiceDestFilter] = useState<string>('ALL');
  const [serviceCatFilter, setServiceCatFilter] = useState<string>('ALL');
  const [serviceSearchQuery, setServiceSearchQuery] = useState<string>('');

  const [editingService, setEditingService] = useState<any | null>(null);
  const [isNewService, setIsNewService] = useState<boolean>(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Live Web Preview Device State
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [iframeKey, setIframeKey] = useState<number>(0);

  // Hero Form State
  const [heroForm, setHeroForm] = useState<HeroConfig>(heroConfig);

  // Destination Edit/Add & View Mode State
  const [destViewMode, setDestViewMode] = useState<'table' | 'grid'>('table');
  const [editingDest, setEditingDest] = useState<Partial<Destination> | null>(null);
  const [isNewDest, setIsNewDest] = useState(false);

  // Slide Edit/Add State
  const [editingSlide, setEditingSlide] = useState<Partial<JourneySlide> | null>(null);
  const [isNewSlide, setIsNewSlide] = useState(false);

  // JSON Import Text State
  const [jsonInput, setJsonInput] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Functional Instant Search Calculation with null guards
  const searchResults = searchQuery.trim() ? [
    ...(destinations || [])
      .filter(d => (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (d.region || '').toLowerCase().includes(searchQuery.toLowerCase()))
      .map(d => ({ type: 'destination' as const, id: d.id, title: d.name || '', subtitle: `${d.region || ''} • ${d.activities?.length || 0} dịch vụ`, data: d })),
    ...(slides || [])
      .filter(s => (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.category || '').toLowerCase().includes(searchQuery.toLowerCase()))
      .map(s => ({ type: 'slide' as const, id: s.id, title: `${s.title || ''} ${s.titleHighlight || ''}`, subtitle: `Slide: ${s.category || ''}`, data: s })),
    ...(heroConfig && ((heroConfig.titleLine1 || '').toLowerCase().includes(searchQuery.toLowerCase()) || (heroConfig.titleLine2 || '').toLowerCase().includes(searchQuery.toLowerCase()) || 'hero'.includes(searchQuery.toLowerCase())) ? [
      { type: 'hero' as const, id: 'hero_config', title: 'Cấu Hình Hero Banner Trang Chủ', subtitle: heroConfig.badge || '', data: heroConfig }
    ] : [])
  ] : [];

  // Filtered destinations for search in Destinations tab
  const filteredDestinations = (destinations || []).filter(d => 
    (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.region || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [serviceImageFilter, setServiceImageFilter] = useState<'ALL' | 'WITH_IMAGE' | 'NO_IMAGE'>('ALL');

  // Filtered Services logic for 500 dataset tab with null guards
  const filteredServices = (servicesList || []).filter((item) => {
    if (!item) return false;
    if (serviceDestFilter !== 'ALL' && item.destination_id !== serviceDestFilter) return false;
    if (serviceCatFilter !== 'ALL' && item.category !== serviceCatFilter) return false;
    
    // Image status filter
    const hasValidImage = Boolean(item.image_url && typeof item.image_url === 'string' && item.image_url.trim().length > 5);
    if (serviceImageFilter === 'WITH_IMAGE' && !hasValidImage) return false;
    if (serviceImageFilter === 'NO_IMAGE' && hasValidImage) return false;

    if (serviceSearchQuery.trim()) {
      const q = serviceSearchQuery.toLowerCase();
      const matchName = (item.name || '').toLowerCase().includes(q);
      const matchId = (item.id || '').toLowerCase().includes(q);
      const matchSub = (item.sub_category || '').toLowerCase().includes(q);
      const itemTags = Array.isArray(item.tags)
        ? item.tags
        : typeof item.tags === 'string'
        ? [item.tags]
        : [];
      const matchTags = itemTags.some((t: any) => typeof t === 'string' && t.toLowerCase().includes(q));
      return matchName || matchId || matchSub || matchTags;
    }
    return true;
  });

  const totalServicesCount = (servicesList || []).length;
  const servicesWithImageCount = (servicesList || []).filter(s => s.image_url && typeof s.image_url === 'string' && s.image_url.trim().length > 5).length;
  const servicesNoImageCount = totalServicesCount - servicesWithImageCount;


  const fetchServicesFromDb = async () => {
    setIsServicesLoading(true);
    try {
      const services = await getServicesFromDb();
      if (services && Array.isArray(services) && services.length > 0) {
        setServicesList(services);
      }
    } catch (err) {
      console.error('Lỗi khi kết nối Database lấy danh sách dịch vụ:', err);
    } finally {
      setIsServicesLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && activeTab === 'services') {
      fetchServicesFromDb();
    }
  }, [isOpen, activeTab]);

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService || !editingService.name) return;

    const tagsArray = typeof editingService.tags === 'string'
      ? editingService.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : Array.isArray(editingService.tags) ? editingService.tags : [];

    const itemToSave = {
      ...editingService,
      destination_id: editingService.destination_id || 'HAN',
      category: editingService.category || 'accommodation',
      sub_category: editingService.sub_category || 'standard',
      name: editingService.name,
      price: Number(editingService.price) || 0,
      rating: Number(editingService.rating) || 4.5,
      duration_mins: Number(editingService.duration_mins) || 60,
      tags: tagsArray,
      image_url: editingService.image_url || '',
      booking_url: editingService.booking_url || '',
      coordinates: Array.isArray(editingService.coordinates) && editingService.coordinates.length === 2
        ? editingService.coordinates.map((value: any) => Number(value))
        : null,
      geocoding_status: editingService.geocoding_status || 'pending',
      geocoding_confidence: editingService.geocoding_confidence == null ? null : Number(editingService.geocoding_confidence),
      geocoded_address: editingService.geocoded_address || '',
    };

    try {
      await addServiceDb(itemToSave);
      showToast(`Đã lưu thành công dịch vụ "${itemToSave.name}" vào Neon Postgres Database!`);
      await fetchServicesFromDb();
      setEditingService(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu dịch vụ vào Neon Postgres Database.');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (window.confirm(`Xác nhận xóa vĩnh viễn dịch vụ ID "${id}" khỏi Neon Postgres Database?`)) {
      try {
        await deleteServiceDb(id);
        showToast(`Đã xóa thành công dịch vụ ${id} khỏi Neon Postgres Database!`);
        await fetchServicesFromDb();
      } catch (err: any) {
        alert(err.message || 'Lỗi khi xóa dịch vụ khỏi Database.');
      }
    }
  };


  const handleExportDatasetJSON = () => {
    const jsonStr = JSON.stringify(servicesList, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tripbuddy_full_dataset_500.json';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất file dataset tripbuddy_full_dataset_500.json!');
  };

  const handleBulkServiceFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const { services, issues } = parseBulkServices(parsed);
      setBulkImportFileName(file.name);
      setBulkImportServices(services);
      setBulkImportIssues(issues);
    } catch {
      setBulkImportFileName(file.name);
      setBulkImportServices([]);
      setBulkImportIssues([{ row: 0, message: 'Không thể đọc JSON. Hãy xuất file mẫu từ nút "Xuất File Dataset" trước.' }]);
    }
  };

  const handleBulkServiceImport = async () => {
    if (!bulkImportServices.length || bulkImportIssues.length || isBulkImporting) return;
    if (!window.confirm(`Cập nhật ${bulkImportServices.length} dịch vụ từ file "${bulkImportFileName}"? Các dịch vụ trùng ID sẽ được ghi đè.`)) return;

    setIsBulkImporting(true);
    try {
      for (let start = 0; start < bulkImportServices.length; start += BULK_IMPORT_BATCH_SIZE) {
        const batch = bulkImportServices.slice(start, start + BULK_IMPORT_BATCH_SIZE);
        await Promise.all(batch.map((service) => addServiceDb(service)));
      }
      await fetchServicesFromDb();
      setBulkImportFileName(null);
      setBulkImportServices([]);
      showToast(`Đã cập nhật ${bulkImportServices.length} dịch vụ từ file JSON.`);
    } catch (error) {
      console.error('Bulk service import failed:', error);
      showToast('Import bị dừng do lỗi kết nối. Hãy xuất lại dữ liệu để kiểm tra các bản ghi đã cập nhật.');
    } finally {
      setIsBulkImporting(false);
    }
  };

  // Save Hero Config
  const handleSaveHero = (e: React.FormEvent) => {
    e.preventDefault();
    updateHeroConfig(heroForm);
    showToast('Đã lưu thay đổi thông tin trang chủ!');
  };

  // Activity Items Handlers for Destination
  const handleAddActivityItem = () => {
    if (!editingDest) return;
    const newAct: ActivityItem = {
      id: `act_${Date.now()}`,
      name: 'Dịch vụ / Hoạt động mới',
      cost: 150000,
      category: 'activities',
      duration_hrs: 2,
      score: 9.0
    };
    const currentActs = editingDest.activities || [];
    setEditingDest({ ...editingDest, activities: [...currentActs, newAct] });
  };

  const handleUpdateActivityItem = (index: number, updatedItem: ActivityItem) => {
    if (!editingDest || !editingDest.activities) return;
    const updatedList = [...editingDest.activities];
    updatedList[index] = updatedItem;
    setEditingDest({ ...editingDest, activities: updatedList });
  };

  const handleDeleteActivityItem = (index: number) => {
    if (!editingDest || !editingDest.activities) return;
    const updatedList = editingDest.activities.filter((_, i) => i !== index);
    setEditingDest({ ...editingDest, activities: updatedList });
  };

  // Travel Tips Handlers for Destination
  const handleAddTravelTip = () => {
    if (!editingDest) return;
    const currentTips = editingDest.travel_tips || [
      { title: 'Thời điểm lý tưởng', content: 'Nên lên kế hoạch du lịch trước từ 2 - 3 tuần để đảm bảo vé tham quan và khách sạn có mức giá tốt nhất.' },
      { title: 'Đặc sản nên thử', content: 'Thưởng thức các món ăn địa phương truyền thống tại các tuyến phố ẩm thực nổi tiếng.' },
      { title: 'Tối ưu chi phí', content: 'Sử dụng bộ công cụ kéo trượt bên dưới để tính toán chính xác tổng chi phí cho số ngày bạn dự định đi.' }
    ];
    setEditingDest({
      ...editingDest,
      travel_tips: [...currentTips, { title: 'Mẹo du lịch mới', content: 'Nội dung kinh nghiệm...' }]
    });
  };

  const handleUpdateTravelTip = (index: number, updatedTip: TravelTipItem) => {
    if (!editingDest) return;
    const currentTips = editingDest.travel_tips || [
      { title: 'Thời điểm lý tưởng', content: 'Nên lên kế hoạch du lịch trước từ 2 - 3 tuần để đảm bảo vé tham quan và khách sạn có mức giá tốt nhất.' },
      { title: 'Đặc sản nên thử', content: 'Thưởng thức các món ăn địa phương truyền thống tại các tuyến phố ẩm thực nổi tiếng.' },
      { title: 'Tối ưu chi phí', content: 'Sử dụng bộ công cụ kéo trượt bên dưới để tính toán chính xác tổng chi phí cho số ngày bạn dự định đi.' }
    ];
    const list = [...currentTips];
    list[index] = updatedTip;
    setEditingDest({ ...editingDest, travel_tips: list });
  };

  const handleDeleteTravelTip = (index: number) => {
    if (!editingDest) return;
    const currentTips = editingDest.travel_tips || [
      { title: 'Thời điểm lý tưởng', content: 'Nên lên kế hoạch du lịch trước từ 2 - 3 tuần để đảm bảo vé tham quan và khách sạn có mức giá tốt nhất.' },
      { title: 'Đặc sản nên thử', content: 'Thưởng thức các món ăn địa phương truyền thống tại các tuyến phố ẩm thực nổi tiếng.' },
      { title: 'Tối ưu chi phí', content: 'Sử dụng bộ công cụ kéo trượt bên dưới để tính toán chính xác tổng chi phí cho số ngày bạn dự định đi.' }
    ];
    const list = currentTips.filter((_, i) => i !== index);
    setEditingDest({ ...editingDest, travel_tips: list });
  };

  // Save Destination - Strict Postgres DB async operation
  const handleSaveDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDest || !editingDest.name) return;

    const formattedDest: Destination = {
      id: editingDest.id || `dest_${Date.now()}`,
      name: editingDest.name || 'Điểm đến mới',
      region: editingDest.region || 'Miền Bắc',
      coordinates: editingDest.coordinates || [105.85, 21.02],
      hero_image: editingDest.hero_image || 'https://images.unsplash.com/photo-1543355890-20bc0a26fda1?auto=format&fit=crop&w=1200&q=85',
      gallery_images: editingDest.gallery_images || [editingDest.hero_image || ''],
      satisfaction_scores: editingDest.satisfaction_scores || { stay: 9.0, food: 9.0, transport: 9.0, activities: 9.0 },
      activities: editingDest.activities && editingDest.activities.length > 0 ? editingDest.activities : [
        { id: `act_${Date.now()}`, name: 'Tham quan danh thắng', cost: 100000, category: 'activities', duration_hrs: 2, score: 9.0 }
      ],
      travel_tips: editingDest.travel_tips || [
        { title: 'Thời điểm lý tưởng', content: 'Nên lên kế hoạch du lịch trước từ 2 - 3 tuần để đảm bảo vé tham quan và khách sạn có mức giá tốt nhất.' },
        { title: 'Đặc sản nên thử', content: 'Thưởng thức các món ăn địa phương truyền thống tại các tuyến phố ẩm thực nổi tiếng.' },
        { title: 'Tối ưu chi phí', content: 'Sử dụng bộ công cụ kéo trượt bên dưới để tính toán chính xác tổng chi phí cho số ngày bạn dự định đi.' }
      ]
    };

    try {
      if (isNewDest) {
        await addDestination(formattedDest);
        showToast('Đã thêm điểm đến mới thành công vào Neon Postgres Database!');
      } else {
        await updateDestination(formattedDest);
        showToast('Đã lưu thông tin điểm đến vào Neon Postgres Database!');
      }
      setEditingDest(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu điểm đến vào Neon Postgres Database.');
    }
  };

  // Slide Feature Items Handlers
  const handleAddSlideFeature = () => {
    if (!editingSlide) return;
    const currentFeats = editingSlide.features || [];
    setEditingSlide({ ...editingSlide, features: [...currentFeats, 'Điểm đặc sắc mới'] });
  };

  const handleUpdateSlideFeature = (index: number, val: string) => {
    if (!editingSlide || !editingSlide.features) return;
    const updated = [...editingSlide.features];
    updated[index] = val;
    setEditingSlide({ ...editingSlide, features: updated });
  };

  const handleDeleteSlideFeature = (index: number) => {
    if (!editingSlide || !editingSlide.features) return;
    const updated = editingSlide.features.filter((_, i) => i !== index);
    setEditingSlide({ ...editingSlide, features: updated });
  };

  // Save Slide
  const handleSaveSlide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlide || !editingSlide.title) return;

    const formattedSlide: JourneySlide = {
      id: editingSlide.id || `slide_${Date.now()}`,
      category: editingSlide.category || 'DI SẢN & VĂN HÓA',
      title: editingSlide.title || 'Hành Trình Khám Phá',
      titleHighlight: editingSlide.titleHighlight || 'Đặc Sắc',
      description: editingSlide.description || 'Mô tả chuyến đi...',
      image: editingSlide.image || 'https://images.pexels.com/photos/28706873/pexels-photo-28706873.jpeg',
      imageCaptionTitle: editingSlide.imageCaptionTitle || editingSlide.title || 'Thắng cảnh',
      imageCaptionSub: editingSlide.imageCaptionSub || 'KỲ QUAN THẾ GIỚI',
      features: editingSlide.features && editingSlide.features.length > 0 ? editingSlide.features : ['Điểm đến nổi tiếng', 'Dự toán minh bạch']
    };

    if (isNewSlide) {
      addSlide(formattedSlide);
      showToast('Đã thêm slide trải nghiệm mới!');
    } else {
      updateSlide(formattedSlide);
      showToast('Đã cập nhật slide trải nghiệm!');
    }

    setEditingSlide(null);
  };

  // Export Backup File Download
  const handleDownloadBackup = () => {
    const jsonStr = exportDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tripbuddy_data_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất dữ liệu sao lưu hệ thống (.json) thành công!');
  };

  // Import JSON Submit
  const handleImportSubmit = () => {
    if (!jsonInput.trim()) return;
    const ok = importDataJSON(jsonInput);
    if (ok) {
      showToast('Nạp dữ liệu từ mã JSON thành công!');
      setJsonInput('');
    } else {
      showToast('Mã JSON không đúng cấu trúc!');
    }
  };

  // Factory Reset
  const handleResetFactory = () => {
    if (window.confirm('Xác nhận khôi phục toàn bộ dữ liệu hệ thống về mặc định ban đầu?')) {
      resetToDefaults();
      setHeroForm(heroConfig);
      showToast('Đã khôi phục dữ liệu gốc thành công!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md font-sans text-slate-800">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-[98vw] max-w-[98vw] h-[96vh] bg-[#f8fafc] border border-slate-200/80 rounded-[28px] overflow-hidden shadow-2xl flex flex-col md:flex-row relative"
      >
        {/* Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#d9f99d] text-slate-900 border border-lime-400 font-extrabold text-xs px-6 py-3 rounded-full shadow-xl flex items-center gap-2 font-sans tracking-wide"
            >
              <Check className="w-4 h-4 text-emerald-700" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LEFT SIDEBAR (Matching Elevate Design System) */}
        <aside className="w-full md:w-64 bg-slate-50/90 border-r border-slate-200/80 p-6 flex flex-col justify-between shrink-0 font-sans">
          <div className="space-y-8">
            
            {/* Brand Logo Header (tripbuddy.admin) */}
            <div className="flex items-center gap-2.5 font-sans font-black text-xl text-slate-900 tracking-tight">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
                ✈
              </div>
              <span className="font-extrabold">tripbuddy<span className="text-orange-500">.admin</span></span>
            </div>

            {/* Sidebar Navigation Menu */}
            <nav className="space-y-1.5 text-xs font-medium">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-[#d9f99d] text-slate-900 font-extrabold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setActiveTab('services')}
                className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'services'
                    ? 'bg-[#d9f99d] text-slate-900 font-extrabold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span className="truncate">Quản Lý 500 Dịch Vụ</span>
                <span className="ml-auto px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-black">
                  {servicesList.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('destinations')}
                className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'destinations'
                    ? 'bg-[#d9f99d] text-slate-900 font-extrabold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Điểm Đến & Bảng Giá</span>
              </button>

              <button
                onClick={() => setActiveTab('hero')}
                className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'hero'
                    ? 'bg-[#d9f99d] text-slate-900 font-extrabold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Banner Trang Chủ</span>
              </button>

              <button
                onClick={() => setActiveTab('slides')}
                className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'slides'
                    ? 'bg-[#d9f99d] text-slate-900 font-extrabold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Vòng Xoay Di Sản</span>
              </button>

              <button
                onClick={() => setActiveTab('backup')}
                className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'backup'
                    ? 'bg-[#d9f99d] text-slate-900 font-extrabold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                <Cloud className="w-4 h-4" />
                <span>Cloud & Sao Lưu</span>
              </button>

              <button
                onClick={() => setActiveTab('guide')}
                className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'guide'
                    ? 'bg-[#d9f99d] text-slate-900 font-extrabold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Hướng Dẫn</span>
              </button>
            </nav>

          </div>

          {/* Sidebar Footer Copyright */}
          <div className="pt-6 border-t border-slate-200/60 text-[11px] text-slate-400 font-medium">
            © 2026 TripBuddy Systems
          </div>
        </aside>

        {/* RIGHT MAIN WORKSPACE */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-hidden font-sans relative">
          
          {/* TOP NAVBAR (Matching Elevate Topbar) */}
          <header className="px-8 py-5 border-b border-slate-200/70 flex items-center justify-between gap-4 bg-white/60 backdrop-blur-sm shrink-0 relative z-30">
            
            {/* FUNCTIONAL SEARCH BAR WITH INSTANT RESULTS POPOVER */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input 
                type="text" 
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                placeholder="Tìm kiếm điểm đến, dịch vụ, giá thành..." 
                className="w-full bg-slate-100/90 border border-slate-200/80 rounded-full pl-10 pr-10 py-2 text-xs font-sans text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-400/50"
              />
              {searchQuery ? (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchFocused(false);
                  }}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <span className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded-md border border-slate-200">⌘K</span>
              )}

              {/* INSTANT SEARCH RESULTS POPOVER */}
              {isSearchFocused && searchQuery.trim() && (
                <div className="absolute top-12 left-0 right-0 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 z-50 max-h-80 overflow-y-auto space-y-1 font-sans">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                    Kết quả tìm kiếm ({searchResults.length})
                  </div>

                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 font-sans">
                      Không tìm thấy kết quả nào khớp với "{searchQuery}"
                    </div>
                  ) : (
                    searchResults.map((res, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          if (res.type === 'destination') {
                            setActiveTab('destinations');
                            setEditingDest(res.data as Destination);
                            setIsNewDest(false);
                          } else if (res.type === 'slide') {
                            setActiveTab('slides');
                            setEditingSlide(res.data as JourneySlide);
                            setIsNewSlide(false);
                          } else {
                            setActiveTab('hero');
                          }
                          setIsSearchFocused(false);
                        }}
                        className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{res.title}</div>
                          <div className="text-[11px] text-slate-500">{res.subtitle}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          res.type === 'destination' ? 'bg-orange-100 text-orange-700' : res.type === 'slide' ? 'bg-purple-100 text-purple-700' : 'bg-lime-100 text-lime-800'
                        }`}>
                          {res.type}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Topbar Right Controls */}
            <div className="flex items-center gap-3">
              
              {/* Cloud Sync Pill Badge */}
              <button
                onClick={async () => {
                  const ok = await syncWithCloud();
                  if (ok) showToast('Đã đồng bộ thành công dữ liệu lên Cloud DB!');
                }}
                disabled={isSyncingCloud}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  isCloudSynced
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>{isSyncingCloud ? 'Đang lưu...' : isCloudSynced ? 'Cloud Synced' : 'Sync Needed'}</span>
              </button>

              {/* Close Modal Button */}
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80 ml-1"
                title="Đóng bảng quản trị"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

          </header>

          {/* MAIN SCROLLABLE CONTENT BODY */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 font-sans">
            
            {/* TAB 0: DASHBOARD OVERVIEW WITH LIVE WEB PREVIEW */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 max-w-6xl mx-auto h-full flex flex-col">
                
                {/* Header & Quick Status Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4 shrink-0">
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight flex items-center gap-2">
                      <Eye className="w-6 h-6 text-orange-500" />
                      <span>Live Web Preview & System Status</span>
                    </h1>
                    <p className="text-xs text-slate-500 font-sans">Xem trước toàn bộ giao diện trang chủ website thời gian thực (Responsive Live Viewport).</p>
                  </div>

                  {/* Stats Badges */}
                  <div className="flex items-center gap-2 text-xs font-bold font-sans">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Site Online
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#d9f99d] text-slate-900 border border-lime-300">
                      {destinations.length} Điểm Đến Active
                    </span>
                    <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                      Cloud Restful Synced
                    </span>
                  </div>
                </div>

                {/* BROWSER MOCKUP INTERACTIVE PREVIEW CONTAINER */}
                <div className="flex-1 bg-white border border-slate-200/80 rounded-[28px] shadow-lg overflow-hidden flex flex-col min-h-[560px]">
                  
                  {/* Mockup Top Address Bar */}
                  <div className="bg-slate-100/90 border-b border-slate-200/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    
                    {/* Browser Window Controls */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-400" />
                        <span className="w-3 h-3 rounded-full bg-amber-400" />
                        <span className="w-3 h-3 rounded-full bg-emerald-400" />
                      </div>

                      <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-full px-4 py-1.5 text-xs text-slate-600 font-mono shadow-inner w-64 sm:w-80">
                        <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">https://tripbuddy-vietnam.vn</span>
                      </div>
                    </div>

                    {/* Viewport Width Switcher */}
                    <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-full text-xs font-bold">
                      <button 
                        onClick={() => setPreviewDevice('desktop')}
                        className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                          previewDevice === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        <span>Desktop</span>
                      </button>

                      <button 
                        onClick={() => setPreviewDevice('tablet')}
                        className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                          previewDevice === 'tablet' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Tablet className="w-3.5 h-3.5" />
                        <span>Tablet</span>
                      </button>

                      <button 
                        onClick={() => setPreviewDevice('mobile')}
                        className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                          previewDevice === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Mobile</span>
                      </button>
                    </div>

                    {/* Refresh & Open Site Actions */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIframeKey(prev => prev + 1)}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm transition-colors cursor-pointer"
                        title="Làm mới xem trước"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>

                      <a 
                        href="/"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <span>Mở Trang Web</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                  </div>

                  {/* Frame Container */}
                  <div className="flex-1 bg-slate-200/50 p-4 flex items-center justify-center overflow-auto">
                    <div 
                      className={`h-full transition-all duration-300 bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-300 ${
                        previewDevice === 'desktop' ? 'w-full' : previewDevice === 'tablet' ? 'w-[768px]' : 'w-[390px]'
                      }`}
                    >
                      <iframe 
                        key={iframeKey}
                        src={window.location.origin}
                        className="w-full h-full border-0"
                        title="TripBuddy Live Preview"
                      />
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB 6: 500 SERVICES & ACTIVITIES CATALOG MANAGER */}
            {activeTab === 'services' && (
              <div className="space-y-6 max-w-6xl mx-auto font-sans">
                {/* Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900 font-serif flex items-center gap-2">
                      <Sliders className="w-6 h-6 text-orange-500" />
                      <span>Quản Lý Tất Cả 500 Dịch Vụ & Hoạt Động (Full Dataset)</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Chỉnh sửa trực tiếp tên, giá tiền, rating, thẻ nhãn tag, ảnh minh họa và link đặt chỗ cho toàn bộ 500 dịch vụ du lịch.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleExportDatasetJSON}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="Tải về file tripbuddy_full_dataset_500.json"
                    >
                      <Download className="w-4 h-4" />
                      <span>Xuất File Dataset (.json)</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingService({
                          id: `SRV_${serviceDestFilter !== 'ALL' ? serviceDestFilter : 'HAN'}_${Date.now().toString().slice(-4)}`,
                          destination_id: serviceDestFilter !== 'ALL' ? serviceDestFilter : 'HAN',
                          category: serviceCatFilter !== 'ALL' ? serviceCatFilter : 'accommodation',
                          sub_category: 'hotel',
                          name: '',
                          price: 1000000,
                          rating: 4.5,
                          duration_mins: 60,
                          tags: ['luxury', 'scenic_view'],
                          image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
                          booking_url: '',
                          coordinates: null,
                          geocoding_status: 'pending',
                        });
                        setIsNewService(true);
                      }}
                      className="px-5 py-2 rounded-xl bg-[#d9f99d] hover:bg-lime-300 text-slate-900 font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm Dịch Vụ Mới</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs text-slate-700">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-extrabold text-slate-900">Cập nhật hàng loạt bằng JSON</p>
                      <p className="mt-1 text-slate-500">Xuất file hiện tại, chỉnh sửa trong trình soạn thảo, rồi chọn lại file. ID trùng sẽ được cập nhật; ID mới sẽ được thêm.</p>
                    </div>
                    <label className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 font-extrabold text-white shadow-sm transition-colors hover:bg-sky-500">
                      <Upload className="h-4 w-4" />
                      <span>Chọn file JSON</span>
                      <input type="file" accept="application/json,.json" className="hidden" onChange={handleBulkServiceFileSelected} />
                    </label>
                  </div>

                  {bulkImportFileName && (
                    <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-sky-100">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-semibold text-slate-700">File: {bulkImportFileName} · {bulkImportServices.length} dịch vụ trong file</span>
                        <button
                          type="button"
                          disabled={Boolean(bulkImportIssues.length) || !bulkImportServices.length || isBulkImporting}
                          onClick={handleBulkServiceImport}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 font-extrabold text-white transition-colors hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {isBulkImporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
                          <span>{isBulkImporting ? 'Đang import...' : 'Import và cập nhật'}</span>
                        </button>
                      </div>

                      {bulkImportIssues.length > 0 && (
                        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-rose-700">
                          <p className="font-extrabold">Cần sửa {bulkImportIssues.length} lỗi trước khi import:</p>
                          <ul className="mt-1 list-disc pl-4">
                            {bulkImportIssues.slice(0, 5).map((issue, index) => (
                              <li key={`${issue.row}-${index}`}>{issue.row ? `Dòng ${issue.row}: ` : ''}{issue.message}</li>
                            ))}
                          </ul>
                          {bulkImportIssues.length > 5 && <p className="mt-1">… và {bulkImportIssues.length - 5} lỗi khác.</p>}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Edit / Add Service Modal Form */}
                {editingService && (
                  <div className="bg-white p-6 sm:p-8 rounded-[28px] border-2 border-orange-400 shadow-xl space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-orange-500" />
                        <span>{isNewService ? 'Thêm Dịch Vụ Mới Vào Tập Dữ Liệu' : `Chỉnh Sửa Dịch Vụ: ${editingService.name || editingService.id}`}</span>
                      </h4>
                      <button onClick={() => setEditingService(null)} className="text-slate-400 hover:text-slate-700">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveService} className="space-y-4 text-xs font-sans">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Mã Dịch Vụ (ID)</label>
                          <input
                            type="text"
                            required
                            disabled={!isNewService}
                            value={editingService.id || ''}
                            onChange={(e) => setEditingService({ ...editingService, id: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-orange-500"
                            placeholder="Ví dụ: SRV_HAN_005"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Điểm Đến (Destination Code)</label>
                          <select
                            value={editingService.destination_id || 'HAN'}
                            onChange={(e) => setEditingService({ ...editingService, destination_id: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                          >
                            <option value="HAN">HAN - Hà Nội</option>
                            <option value="HUE">HUE - Huế</option>
                            <option value="DAD">DAD - Đà Nẵng</option>
                            <option value="DLD">DLD - Đà Lạt</option>
                            <option value="PQC">PQC - Phú Quốc</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Phân Loại (Category)</label>
                          <select
                            value={editingService.category || 'accommodation'}
                            onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                          >
                            <option value="accommodation">accommodation - Lưu Trú (Khách sạn/Resort)</option>
                            <option value="food">food - Ẩm Thực (Nhà hàng/Ăn uống)</option>
                            <option value="activity">activity - Tham Quan / Vui Chơi</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Tên Dịch Vụ / Địa Điểm</label>
                          <input
                            type="text"
                            required
                            value={editingService.name || ''}
                            onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-orange-500"
                            placeholder="Ví dụ: Khách sạn Hanoi Daewoo, Nhà Hàng Cố Đô..."
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Phân Loại Chi Tiết (Sub Category)</label>
                          <select
                            value={editingService.sub_category || 'hotel'}
                            onChange={(e) => setEditingService({ ...editingService, sub_category: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                          >
                            <option value="hotel">hotel - Khách sạn</option>
                            <option value="resort">resort - Resort nghỉ dưỡng</option>
                            <option value="homestay">homestay - Homestay</option>
                            <option value="villa">villa - Villa</option>
                            <option value="hostel">hostel - Hostel</option>
                            <option value="restaurant">restaurant - Nhà hàng</option>
                            <option value="street_food">street_food - Quán ăn bình dân</option>
                            <option value="cafe">cafe - Cà phê</option>
                            <option value="buffet">buffet - Buffet</option>
                            <option value="sightseeing">sightseeing - Tham quan thắng cảnh</option>
                            <option value="entertainment">entertainment - Vui chơi giải trí</option>
                            <option value="shopping">shopping - Mua sắm</option>
                            <option value="cultural">cultural - Văn hóa di sản</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Giá Tiền (VNĐ)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="10000"
                            value={editingService.price || 0}
                            onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-emerald-700 focus:outline-none focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Đánh Giá (Rating 1.0 - 5.0)</label>
                          <input
                            type="number"
                            step="0.1"
                            max="5.0"
                            min="1.0"
                            value={editingService.rating || 4.5}
                            onChange={(e) => setEditingService({ ...editingService, rating: parseFloat(e.target.value) })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-amber-600 focus:outline-none focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Thời Gian (Phút)</label>
                          <input
                            type="number"
                            min="0"
                            step="15"
                            value={editingService.duration_mins || 0}
                            onChange={(e) => setEditingService({ ...editingService, duration_mins: Number(e.target.value) })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Thẻ Nhãn Phân Loại Tags (Phân cách bằng dấu phẩy)</label>
                        <input
                          type="text"
                          value={Array.isArray(editingService.tags) ? editingService.tags.join(', ') : editingService.tags || ''}
                          onChange={(e) => setEditingService({ ...editingService, tags: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                          placeholder="Ví dụ: luxury, scenic_view, hotel, khach_san"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Đường Dẫn Ảnh Minh Họa (Image URL)</label>
                          <input
                            type="text"
                            value={editingService.image_url || ''}
                            onChange={(e) => setEditingService({ ...editingService, image_url: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                            placeholder="https://..."
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Link Đặt Chỗ (Booking Affiliate URL)</label>
                          <input
                            type="text"
                            value={editingService.booking_url || ''}
                            onChange={(e) => setEditingService({ ...editingService, booking_url: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                            placeholder="https://partner.tripbuddy.vn/..."
                          />
                        </div>
                      </div>

                      {/* Meal Types Selector for Food Category */}
                      {editingService.category === 'food' && (
                        <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/80 space-y-2">
                          <label className="block text-[11px] font-extrabold text-amber-900 uppercase flex items-center gap-1.5">
                            <Utensils className="w-3.5 h-3.5 text-amber-600" />
                            <span>Bữa Ăn Phù Hợp (Ăn Sáng, Ăn Trưa, Ăn Tối, Ăn Vặt, Ăn Đêm):</span>
                          </label>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {[
                              { id: 'breakfast', label: '🌅 Ăn Sáng' },
                              { id: 'lunch', label: '☀️ Ăn Trưa' },
                              { id: 'dinner', label: '🌙 Ăn Tối' },
                              { id: 'snack', label: '🍢 Ăn Vặt' },
                              { id: 'late_night', label: '🌌 Ăn Đêm' },
                            ].map((slot) => {
                              const currentMeals = (editingService.meal_type || 'breakfast,lunch,dinner').split(',').map((s: string) => s.trim());
                              const isChecked = currentMeals.includes(slot.id);

                              const toggleMealSlot = () => {
                                let updated: string[];
                                if (isChecked) {
                                  updated = currentMeals.filter((m: string) => m !== slot.id);
                                } else {
                                  updated = [...currentMeals, slot.id];
                                }
                                setEditingService({ ...editingService, meal_type: updated.join(',') });
                              };

                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  onClick={toggleMealSlot}
                                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 text-xs ${
                                    isChecked
                                      ? 'bg-amber-500 text-white shadow-sm font-extrabold'
                                      : 'bg-white text-slate-700 hover:bg-amber-100 border border-slate-200'
                                  }`}
                                >
                                  <span>{slot.label}</span>
                                  {isChecked && <Check className="w-3 h-3 text-white" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}


                      <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setEditingService(null)}
                          className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                        >
                          Hủy Bỏ
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                          <Save className="w-4 h-4" />
                          <span>Lưu Dịch Vụ Vừa Sửa</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Filter Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Destination Filter Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-bold text-slate-500 text-[11px] uppercase mr-1">Điểm Đến:</span>
                      {['ALL', 'HAN', 'HUE', 'DAD', 'DLD', 'PQC'].map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setServiceDestFilter(code)}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            serviceDestFilter === code
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {code === 'ALL' ? 'Tất Cả' : code}
                        </button>
                      ))}
                    </div>

                    {/* Category Filter Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-bold text-slate-500 text-[11px] uppercase mr-1">Phân Loại:</span>
                      {[
                        { id: 'ALL', label: 'Tất Cả' },
                        { id: 'accommodation', label: '🏨 Lưu Trú' },
                        { id: 'food', label: '🍲 Ẩm Thực' },
                        { id: 'activity', label: '🎟️ Tham Quan' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setServiceCatFilter(cat.id)}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            serviceCatFilter === cat.id
                              ? 'bg-orange-500 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Local Search Input */}
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={serviceSearchQuery}
                        onChange={(e) => setServiceSearchQuery(e.target.value)}
                        placeholder="Lọc tên, ID, tag..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                  </div>

                  {/* IMAGE STATUS CHECK & FILTER ROW (REQUIRED BY ADMIN) */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-700 text-xs uppercase flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-orange-500" />
                        <span>Bộ Lọc Trạng Thái Ảnh Minh Họa:</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setServiceImageFilter('ALL')}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            serviceImageFilter === 'ALL'
                              ? 'bg-slate-800 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Tất Cả ({totalServicesCount})
                        </button>

                        <button
                          type="button"
                          onClick={() => setServiceImageFilter('WITH_IMAGE')}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            serviceImageFilter === 'WITH_IMAGE'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          <span>✅ Đã Có Ảnh Minh Họa ({servicesWithImageCount})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setServiceImageFilter('NO_IMAGE')}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            serviceImageFilter === 'NO_IMAGE'
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 font-extrabold'
                          }`}
                        >
                          <span>⚠️ Chưa Có Ảnh ({servicesNoImageCount})</span>
                        </button>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-slate-400">
                      Hiển thị <strong>{filteredServices.length}</strong> / {servicesList.length} dịch vụ
                    </span>
                  </div>
                </div>

                {/* Services Data Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">
                  {isServicesLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
                      <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
                      <span className="text-xs font-bold font-sans">Đang đồng bộ danh sách dịch vụ từ Neon Postgres Database...</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[calc(96vh-240px)] overflow-y-auto">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-slate-100/90 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="p-3">ID & Trạng Thái Ảnh</th>
                          <th className="p-3">Tên Dịch Vụ / Hoạt Động</th>
                          <th className="p-3">Điểm Đến & Phân Loại</th>
                          <th className="p-3">Giá (VNĐ)</th>
                          <th className="p-3">Đánh Giá</th>
                          <th className="p-3">Thẻ Tags</th>
                          <th className="p-3 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredServices.slice(0, 150).map((srv) => {
                          const hasImg = Boolean(srv.image_url && typeof srv.image_url === 'string' && srv.image_url.trim().length > 5);

                          return (
                            <tr key={srv.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3">
                                <div className="flex items-center gap-2.5">
                                  {hasImg ? (
                                    <div className="relative shrink-0">
                                      <img
                                        src={srv.image_url}
                                        alt={srv.name}
                                        className="w-11 h-11 rounded-xl object-cover border-2 border-emerald-500/70 shadow-sm"
                                      />
                                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center shadow">
                                        ✓
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="w-11 h-11 rounded-xl bg-amber-50 border-2 border-dashed border-amber-300 text-amber-600 flex flex-col items-center justify-center shrink-0">
                                      <ImageIcon className="w-4 h-4" />
                                      <span className="text-[8px] font-black uppercase text-amber-700">Trống</span>
                                    </div>
                                  )}

                                  <div className="flex flex-col">
                                    <span className="font-mono text-[10px] text-slate-500 font-bold">{srv.id}</span>
                                    {hasImg ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 w-max mt-0.5">
                                        ✅ Đã có ảnh
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingService(srv);
                                          setIsNewService(false);
                                        }}
                                        className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300 w-max mt-0.5 cursor-pointer flex items-center gap-0.5"
                                        title="Click để dán URL ảnh minh họa"
                                      >
                                        <Plus className="w-2.5 h-2.5" /> Thêm ảnh
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>

                            <td className="p-3">
                              <span className="font-bold text-slate-900 text-xs block">{srv.name}</span>
                              {srv.category === 'food' && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {((srv.meal_type || 'breakfast,lunch,dinner').split(',')).map((m: string) => {
                                    const slotMap: Record<string, string> = {
                                      breakfast: '🌅 Sáng',
                                      lunch: '☀️ Trưa',
                                      dinner: '🌙 Tối',
                                      snack: '🍢 Ăn vặt',
                                      late_night: '🌌 Ăn đêm',
                                    };
                                    const label = slotMap[m.trim()] || m;
                                    return (
                                      <span key={m} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100/90 text-amber-900 border border-amber-300">
                                        {label}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              {srv.booking_url && (
                                <a
                                  href={srv.booking_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-sky-600 hover:underline flex items-center gap-1 mt-0.5"
                                >
                                  <ExternalLink className="w-3 h-3" /> Partner Booking URL
                                </a>
                              )}
                            </td>

                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-extrabold text-[10px]">
                                  {srv.destination_id}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 text-[10px] font-bold uppercase">
                                  {srv.sub_category || srv.category}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 font-extrabold text-emerald-700">
                              {Number(srv.price).toLocaleString('vi-VN')} đ
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-amber-500 flex items-center gap-1">
                                ⭐ {srv.rating}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {(Array.isArray(srv.tags) ? srv.tags : []).slice(0, 3).map((t: string) => (
                                  <span key={t} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingService(srv);
                                    setIsNewService(false);
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                  title="Chỉnh sửa dịch vụ"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteService(srv.id)}
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                                  title="Xóa dịch vụ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>


                    </table>
                  </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 1: DESTINATIONS & PRICING MANAGEMENT */}
            {activeTab === 'destinations' && (
              <div className="space-y-6 max-w-6xl mx-auto">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900">Quản Lý Điểm Đến & Bảng Giá Chi Tiết</h3>
                    <p className="text-xs text-slate-500">Cập nhật toàn bộ danh lam thắng cảnh, hệ số dịch vụ và từng mục giá thành PuLP.</p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingDest({
                        name: '',
                        region: 'Miền Bắc',
                        hero_image: 'https://images.unsplash.com/photo-1543355890-20bc0a26fda1?auto=format&fit=crop&w=1200&q=85',
                        satisfaction_scores: { stay: 9.0, food: 9.0, transport: 9.0, activities: 9.0 },
                        coordinates: [105.85, 21.02],
                        activities: [
                          { id: `act_${Date.now()}_1`, name: 'Thắng cảnh / Khách sạn mẫu', cost: 150000, category: 'activities', duration_hrs: 2, score: 9.0 }
                        ]
                      });
                      setIsNewDest(true);
                    }}
                    className="px-5 py-2.5 rounded-full bg-[#d9f99d] hover:bg-lime-300 text-slate-900 font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm Điểm Đến Mới</span>
                  </button>
                </div>

                {/* Edit Destination Form */}
                {editingDest && (
                  <div className="bg-white p-6 sm:p-8 rounded-[28px] border-2 border-lime-400 shadow-xl space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <h4 className="text-lg font-bold text-slate-900">
                        {isNewDest ? 'Thêm Điểm Đến Mới' : `Chỉnh Sửa: ${editingDest.name}`}
                      </h4>
                      <button onClick={() => setEditingDest(null)} className="text-slate-400 hover:text-slate-700">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveDestination} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tên Điểm Đến & Danh Thắng</label>
                          <input
                            type="text"
                            required
                            value={editingDest.name || ''}
                            onChange={(e) => setEditingDest({ ...editingDest, name: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lime-500"
                            placeholder="Ví dụ: Hà Nội - Thủ Đô Ngàn Năm..."
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Vùng Miền</label>
                          <select
                            value={editingDest.region || 'Miền Bắc'}
                            onChange={(e) => setEditingDest({ ...editingDest, region: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lime-500"
                          >
                            <option value="Miền Bắc">Miền Bắc</option>
                            <option value="Miền Trung">Miền Trung</option>
                            <option value="Miền Nam">Miền Nam</option>
                            <option value="Tây Nguyên">Tây Nguyên</option>
                            <option value="Tây Nam Bộ">Tây Nam Bộ</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Đường Dẫn Ảnh Đại Diện (Hero Image URL)</label>
                        <input
                          type="text"
                          required
                          value={editingDest.hero_image || ''}
                          onChange={(e) => setEditingDest({ ...editingDest, hero_image: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lime-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mô Tả Giới Thiệu Điểm Đến (Description)</label>
                        <textarea
                          rows={3}
                          value={editingDest.description || ''}
                          onChange={(e) => setEditingDest({ ...editingDest, description: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lime-500 font-sans"
                          placeholder="Mô tả giới thiệu chi tiết về điểm đến..."
                        />
                      </div>

                      {/* Scores Section */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hệ Số Chất Lượng & Chi Phí Dự Toán Ban Đầu</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Điểm Lưu Trú (1-10)</label>
                            <input
                              type="number"
                              step="0.1"
                              max="10"
                              min="1"
                              value={editingDest.satisfaction_scores?.stay || 9.0}
                              onChange={(e) => setEditingDest({
                                ...editingDest,
                                satisfaction_scores: { ...editingDest.satisfaction_scores!, stay: parseFloat(e.target.value) || 9.0 }
                              })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Điểm Ẩm Thực (1-10)</label>
                            <input
                              type="number"
                              step="0.1"
                              max="10"
                              min="1"
                              value={editingDest.satisfaction_scores?.food || 9.0}
                              onChange={(e) => setEditingDest({
                                ...editingDest,
                                satisfaction_scores: { ...editingDest.satisfaction_scores!, food: parseFloat(e.target.value) || 9.0 }
                              })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Điểm Di Chuyển (1-10)</label>
                            <input
                              type="number"
                              step="0.1"
                              max="10"
                              min="1"
                              value={editingDest.satisfaction_scores?.transport || 9.0}
                              onChange={(e) => setEditingDest({
                                ...editingDest,
                                satisfaction_scores: { ...editingDest.satisfaction_scores!, transport: parseFloat(e.target.value) || 9.0 }
                              })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Điểm Vui Chơi (1-10)</label>
                            <input
                              type="number"
                              step="0.1"
                              max="10"
                              min="1"
                              value={editingDest.satisfaction_scores?.activities || 9.0}
                              onChange={(e) => setEditingDest({
                                ...editingDest,
                                satisfaction_scores: { ...editingDest.satisfaction_scores!, activities: parseFloat(e.target.value) || 9.0 }
                              })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900"
                            />
                          </div>
                        </div>
                      </div>

                      {/* DETAILED ITEM & PRICES EDITOR SECTION */}
                      <div className="space-y-4 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                              <DollarSign className="w-4 h-4 text-lime-600" />
                              <span>Danh Sách Dịch Vụ, Hoạt Động & Giá Thành Chi Tiết</span>
                            </h5>
                            <p className="text-xs text-slate-500">Chỉnh sửa trực tiếp từng tên mục hoạt động và giá tiền (VND) hiển thị trên kế hoạch lịch trình.</p>
                          </div>

                          <button
                            type="button"
                            onClick={handleAddActivityItem}
                            className="px-4 py-1.5 rounded-full bg-lime-100 border border-lime-300 text-slate-900 text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-lime-200"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm Mục Giá Dịch Vụ</span>
                          </button>
                        </div>

                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                          {(editingDest.activities || []).map((item, idx) => (
                            <div key={item.id || idx} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                              
                              {/* Name */}
                              <div className="sm:col-span-3">
                                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Tên Hoạt Động / Dịch Vụ</label>
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleUpdateActivityItem(idx, { ...item, name: e.target.value })}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium"
                                />
                              </div>

                              {/* Image URL */}
                              <div className="sm:col-span-3">
                                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Link Ảnh (Image URL)</label>
                                <input
                                  type="text"
                                  value={item.image || ''}
                                  placeholder="Dán link ảnh..."
                                  onChange={(e) => handleUpdateActivityItem(idx, { ...item, image: e.target.value })}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700"
                                />
                              </div>

                              {/* Cost */}
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] text-slate-700 font-bold uppercase mb-1">Giá Vé (VND)</label>
                                <input
                                  type="number"
                                  step="10000"
                                  value={item.cost}
                                  onChange={(e) => handleUpdateActivityItem(idx, { ...item, cost: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-extrabold"
                                />
                              </div>

                              {/* Duration */}
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Thời Gian (Giờ)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  value={item.duration_hrs || 2.0}
                                  onChange={(e) => handleUpdateActivityItem(idx, { ...item, duration_hrs: parseFloat(e.target.value) || 1.0 })}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold"
                                />
                              </div>

                              {/* Score */}
                              <div className="sm:col-span-1">
                                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Điểm ★</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  max="10"
                                  min="1"
                                  value={item.score || 9.5}
                                  onChange={(e) => handleUpdateActivityItem(idx, { ...item, score: parseFloat(e.target.value) || 9.0 })}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-amber-600 font-extrabold"
                                />
                              </div>

                              {/* Delete Item */}
                              <div className="sm:col-span-1 flex justify-end pt-4 sm:pt-0">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteActivityItem(idx)}
                                  className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                            </div>
                          ))}
                        </div>

                      </div>

                      {/* TRAVEL TIPS EDITOR SECTION */}
                      <div className="space-y-4 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                              <BookOpen className="w-4 h-4 text-lime-600" />
                              <span>Cẩm Nang & Kinh Nghiệm Khám Phá (Travel Tips)</span>
                            </h5>
                            <p className="text-xs text-slate-500">Chỉnh sửa trực tiếp từng kinh nghiệm, thời điểm lý tưởng và mẹo tối ưu chi phí.</p>
                          </div>

                          <button
                            type="button"
                            onClick={handleAddTravelTip}
                            className="px-4 py-1.5 rounded-full bg-lime-100 border border-lime-300 text-slate-900 text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-lime-200"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm Kinh Nghiệm Mới</span>
                          </button>
                        </div>

                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                          {(editingDest.travel_tips || [
                            { title: 'Thời điểm lý tưởng', content: 'Nên lên kế hoạch du lịch trước từ 2 - 3 tuần để đảm bảo vé tham quan và khách sạn có mức giá tốt nhất.' },
                            { title: 'Đặc sản nên thử', content: 'Thưởng thức các món ăn địa phương truyền thống tại các tuyến phố ẩm thực nổi tiếng.' },
                            { title: 'Tối ưu chi phí', content: 'Sử dụng bộ công cụ kéo trượt bên dưới để tính toán chính xác tổng chi phí cho số ngày bạn dự định đi.' }
                          ]).map((tip, idx) => (
                            <div key={idx} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  value={tip.title}
                                  onChange={(e) => handleUpdateTravelTip(idx, { ...tip, title: e.target.value })}
                                  className="w-full max-w-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold"
                                  placeholder="Tiêu đề (VD: Thời điểm lý tưởng...)"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTravelTip(idx)}
                                  className="p-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <textarea
                                rows={2}
                                value={tip.content}
                                onChange={(e) => handleUpdateTravelTip(idx, { ...tip, content: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                                placeholder="Nội dung mẹo kinh nghiệm..."
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setEditingDest(null)}
                          className="px-5 py-2.5 rounded-full border border-slate-300 text-slate-700 text-xs font-bold uppercase"
                        >
                          Hủy Bỏ
                        </button>
                        <button
                          type="submit"
                          className="px-7 py-2.5 rounded-full bg-[#d9f99d] text-slate-900 text-xs font-extrabold uppercase shadow-md hover:bg-lime-300"
                        >
                          Lưu Điểm Đến & Giá Thành
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Destinations View Switcher & Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-100/70 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      Danh Sách Điểm Đến ({filteredDestinations.length}):
                    </span>
                    <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setDestViewMode('table')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          destViewMode === 'table'
                            ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>Bảng Chi Tiết (Table View)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDestViewMode('grid')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          destViewMode === 'grid'
                            ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Grid className="w-3.5 h-3.5" />
                        <span>Thẻ Khung Ảnh (Grid View)</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm điểm đến / vùng miền..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-lime-500 shadow-sm"
                    />
                  </div>
                </div>

                {/* TABLE VIEW: Dedicated High-Density Destinations Table */}
                {destViewMode === 'table' ? (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-sans border-collapse">
                        <thead>
                          <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px] tracking-wider">
                            <th className="py-3.5 px-4 text-center w-12">#</th>
                            <th className="py-3.5 px-4 w-16">Hình Ảnh</th>
                            <th className="py-3.5 px-4">Tên Điểm Đến & Danh Thắng</th>
                            <th className="py-3.5 px-4">Vùng Miền</th>
                            <th className="py-3.5 px-4 text-center">Đánh Giá (Rating)</th>
                            <th className="py-3.5 px-4 text-center">Số Dịch Vụ & Chi Phí</th>
                            <th className="py-3.5 px-4 text-right">Thao Tác QL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredDestinations.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-12 text-slate-400 italic">
                                Không tìm thấy điểm đến nào. Hãy tạo điểm đến mới.
                              </td>
                            </tr>
                          ) : (
                            filteredDestinations.map((dest, idx) => {
                              const rating = dest.satisfaction_scores
                                ? ((dest.satisfaction_scores.stay + dest.satisfaction_scores.food + dest.satisfaction_scores.activities) / 3).toFixed(1)
                                : '9.2';
                              return (
                                <tr key={dest.id} className="hover:bg-slate-50/80 transition-colors group">
                                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                      <SafeImage src={dest.hero_image} alt={dest.name} className="w-full h-full object-cover" />
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-extrabold text-sm text-slate-900">{dest.name}</div>
                                    <div className="text-[11px] text-slate-500 font-mono">ID: {dest.id}</div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-lime-100 text-lime-800 border border-lime-200">
                                      {dest.region}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 text-xs">
                                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                      <span>{rating}</span>
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="font-bold text-slate-800">{dest.activities?.length || 0} mục dịch vụ</div>
                                    <div className="text-[11px] font-bold text-lime-700 font-mono">
                                      ~{(dest.minimum_two_day_cost_vnd || 1500000).toLocaleString('vi-VN')} đ/ngày
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingDest(dest);
                                          setIsNewDest(false);
                                        }}
                                        className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                                        title="Chỉnh sửa điểm đến"
                                      >
                                        <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                                        <span>Sửa</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (window.confirm(`Xóa vĩnh viễn điểm đến "${dest.name}" khỏi danh sách?`)) {
                                            deleteDestination(dest.id);
                                            showToast(`Đã xóa vĩnh viễn: ${dest.name}`);
                                          }
                                        }}
                                        className="px-3.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                                        title="Xóa vĩnh viễn điểm đến"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Xóa</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* GRID VIEW: Destinations Cards Grid */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDestinations.map((dest) => (
                      <div key={dest.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                            <SafeImage src={dest.hero_image} alt={dest.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="overflow-hidden">
                            <span className="text-[10px] font-extrabold text-lime-700 uppercase tracking-wider">{dest.region}</span>
                            <h4 className="font-extrabold text-base text-slate-900 truncate">{dest.name}</h4>
                            <span className="text-xs text-slate-500 block">{dest.activities?.length || 0} mục dịch vụ / giá thành</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDest(dest);
                              setIsNewDest(false);
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                            <span>Sửa</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Xóa vĩnh viễn điểm đến "${dest.name}" khỏi danh sách?`)) {
                                deleteDestination(dest.id);
                                showToast(`Đã xóa vĩnh viễn: ${dest.name}`);
                              }
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* TAB 2: HERO BANNER CONFIG */}
            {activeTab === 'hero' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-200/80 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-extrabold text-slate-900">Cấu Hình Banner Trang Chủ (Hero)</h3>
                      <p className="text-xs text-slate-500">Thay đổi câu khẩu hiệu, hình ảnh phong cảnh nền và các nút bấm chính.</p>
                    </div>
                    <button 
                      onClick={handleSaveHero}
                      className="px-6 py-2.5 rounded-full bg-[#d9f99d] hover:bg-lime-300 text-slate-900 font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Lưu Cấu Hình</span>
                    </button>
                  </div>

                  <form onSubmit={handleSaveHero} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Thẻ Phụ (Sub-Badge)</label>
                        <input
                          type="text"
                          value={heroForm.badge}
                          onChange={(e) => setHeroForm({ ...heroForm, badge: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-lime-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tên Nút Bấm Action CTA</label>
                        <input
                          type="text"
                          value={heroForm.ctaButtonText}
                          onChange={(e) => setHeroForm({ ...heroForm, ctaButtonText: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-lime-500 font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tiêu Đề Dòng 1</label>
                        <input
                          type="text"
                          value={heroForm.titleLine1}
                          onChange={(e) => setHeroForm({ ...heroForm, titleLine1: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-lime-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tiêu Đề Dòng 2</label>
                        <input
                          type="text"
                          value={heroForm.titleLine2}
                          onChange={(e) => setHeroForm({ ...heroForm, titleLine2: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-lime-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Từ Nổi Bật (Màu Vàng)</label>
                        <input
                          type="text"
                          value={heroForm.titleHighlight}
                          onChange={(e) => setHeroForm({ ...heroForm, titleHighlight: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-lime-500 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Đường Dẫn Ảnh Phong Cảnh Nền (Hero Image URL)</label>
                      <input
                        type="text"
                        value={heroForm.backgroundImage}
                        onChange={(e) => setHeroForm({ ...heroForm, backgroundImage: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-lime-500 font-medium"
                      />
                    </div>

                    {/* Image Live Preview */}
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-bold text-slate-500 block uppercase">Xem Trước Giao Diện Banner:</span>
                      <div className="h-52 w-full rounded-2xl overflow-hidden border border-slate-200 relative bg-slate-900 shadow-inner">
                        <SafeImage src={heroForm.backgroundImage} alt="Hero preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4 text-center">
                          <div className="font-serif font-bold text-2xl text-white drop-shadow-md">
                            {heroForm.titleLine1} <br />
                            <span>{heroForm.titleLine2}</span> <span className="text-amber-300">{heroForm.titleHighlight}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </form>
                </div>
              </div>
            )}

            {/* TAB 3: SLIDES MANAGEMENT */}
            {activeTab === 'slides' && (
              <div className="space-y-6 max-w-6xl mx-auto">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900">Quản Lý Slide Trải Nghiệm (Vòng Xoay Di Sản)</h3>
                    <p className="text-xs text-slate-500">Quản lý các slide trải nghiệm, tựa đề, hình ảnh và danh sách điểm đặc sắc.</p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingSlide({
                        title: '',
                        titleHighlight: '',
                        category: 'DI SẢN & VĂN HÓA',
                        description: '',
                        image: 'https://images.pexels.com/photos/28706873/pexels-photo-28706873.jpeg',
                        imageCaptionTitle: 'Thắng cảnh',
                        imageCaptionSub: 'KỲ QUAN',
                        features: ['Điểm đến nổi tiếng', 'Dự toán minh bạch']
                      });
                      setIsNewSlide(true);
                    }}
                    className="px-5 py-2.5 rounded-full bg-[#d9f99d] hover:bg-lime-300 text-slate-900 font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm Slide Mới</span>
                  </button>
                </div>

                {/* Slide Edit Form */}
                {editingSlide && (
                  <div className="bg-white p-6 rounded-[28px] border-2 border-lime-400 shadow-xl space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <h4 className="text-lg font-bold text-slate-900">
                        {isNewSlide ? 'Thêm Slide Trải Nghiệm Mới' : `Chỉnh Sửa Slide: ${editingSlide.title}`}
                      </h4>
                      <button onClick={() => setEditingSlide(null)} className="text-slate-400 hover:text-slate-700">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveSlide} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tên Slide / Tiêu Đề</label>
                          <input
                            type="text"
                            required
                            value={editingSlide.title || ''}
                            onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lime-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Từ Nổi Bật (Màu Vàng)</label>
                          <input
                            type="text"
                            required
                            value={editingSlide.titleHighlight || ''}
                            onChange={(e) => setEditingSlide({ ...editingSlide, titleHighlight: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lime-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Danh Mục Thẻ (Category)</label>
                          <input
                            type="text"
                            required
                            value={editingSlide.category || ''}
                            onChange={(e) => setEditingSlide({ ...editingSlide, category: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lime-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mô Tả Chuyến Đi</label>
                        <textarea
                          rows={3}
                          required
                          value={editingSlide.description || ''}
                          onChange={(e) => setEditingSlide({ ...editingSlide, description: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lime-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Thẻ Phụ Góc Trên Ảnh (imageCaptionSub)</label>
                          <input
                            type="text"
                            required
                            value={editingSlide.imageCaptionSub || ''}
                            onChange={(e) => setEditingSlide({ ...editingSlide, imageCaptionSub: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lime-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tiêu Đề Hộp Chú Thích Hover Ảnh (imageCaptionTitle)</label>
                          <input
                            type="text"
                            required
                            value={editingSlide.imageCaptionTitle || ''}
                            onChange={(e) => setEditingSlide({ ...editingSlide, imageCaptionTitle: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lime-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Đường Dẫn Ảnh Minh Họa (Image URL)</label>
                        <input
                          type="text"
                          required
                          value={editingSlide.image || ''}
                          onChange={(e) => setEditingSlide({ ...editingSlide, image: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lime-500"
                        />
                      </div>

                      {/* FEATURE CARDS LIST EDITOR */}
                      <div className="space-y-3 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase">Danh Sách 4 Thẻ Điểm Nổi Bật (Features)</label>
                            <span className="text-[11px] text-slate-500">Chỉnh sửa nội dung các thẻ nhỏ hiển thị phía dưới tiêu đề slide.</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddSlideFeature}
                            className="px-3.5 py-1.5 rounded-full bg-lime-100 border border-lime-300 text-slate-900 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm Thẻ Nổi Bật</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(editingSlide.features || []).map((feat, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                              <input
                                type="text"
                                value={feat}
                                onChange={(e) => handleUpdateSlideFeature(idx, e.target.value)}
                                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteSlideFeature(idx)}
                                className="p-1.5 rounded-lg bg-red-50 text-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setEditingSlide(null)}
                          className="px-5 py-2 rounded-full border border-slate-300 text-slate-700 text-xs font-bold uppercase"
                        >
                          Hủy Bỏ
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2 rounded-full bg-[#d9f99d] text-slate-900 text-xs font-extrabold uppercase shadow-sm hover:bg-lime-300"
                        >
                          Lưu Slide Trải Nghiệm
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Slides Grid List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {slides.map((s) => (
                    <div key={s.id} className="bg-white border border-slate-200/80 rounded-2xl p-4 flex gap-4 items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                          <SafeImage src={s.image} alt={s.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="overflow-hidden">
                          <span className="text-[10px] font-bold text-lime-700 uppercase">{s.category}</span>
                          <h4 className="font-extrabold text-base text-slate-900 truncate">{s.title} {s.titleHighlight}</h4>
                          <p className="text-xs text-slate-500 line-clamp-1">{s.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setEditingSlide(s);
                            setIsNewSlide(false);
                          }}
                          className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Xóa slide "${s.title}"?`)) {
                              deleteSlide(s.id);
                              showToast(`Đã xóa: ${s.title}`);
                            }
                          }}
                          className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-xs font-bold cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: BACKUP & DATA PORTABILITY */}
            {activeTab === 'backup' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-200/80 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-2xl font-extrabold text-slate-900">Sao Lưu & Khôi Phục Dữ Liệu</h3>
                    <p className="text-xs text-slate-500">Xuất file dữ liệu dự phòng (.json), khôi phục dữ liệu hoặc đưa về cài đặt gốc.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Export */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                          <Download className="w-5 h-5 text-lime-600" />
                          <span>Xuất File Dự Phòng (.JSON)</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Tải toàn bộ nội dung website về máy tính dưới dạng file JSON an toàn.</p>
                      </div>
                      <button
                        onClick={handleDownloadBackup}
                        className="w-full py-3 rounded-full bg-[#d9f99d] hover:bg-lime-300 text-slate-900 font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-sm"
                      >
                        Tải File Backup Về Máy
                      </button>
                    </div>

                    {/* Reset */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-red-600 font-extrabold text-sm">
                          <RotateCcw className="w-5 h-5" />
                          <span>Khôi Phục Mặc Định (Factory Reset)</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Xóa toàn bộ các chỉnh sửa tạm và đưa website về dữ liệu mẫu ban đầu.</p>
                      </div>
                      <button
                        onClick={handleResetFactory}
                        className="w-full py-3 rounded-full bg-red-100 hover:bg-red-200 border border-red-300 text-red-700 font-extrabold text-xs uppercase tracking-wider cursor-pointer"
                      >
                        Khôi Phục Ban Đầu
                      </button>
                    </div>
                  </div>

                  {/* Import JSON */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                      <Upload className="w-5 h-5 text-lime-600" />
                      <span>Nhập Dữ Liệu Từ Chuỗi JSON</span>
                    </div>
                    <p className="text-xs text-slate-500">Dán nội dung mã JSON sao lưu vào ô dưới đây để nạp dữ liệu vào hệ thống:</p>

                    <textarea
                      rows={4}
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      placeholder="Dán mã JSON sao lưu vào đây..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-mono focus:outline-none focus:border-lime-500"
                    />

                    <button
                      onClick={handleImportSubmit}
                      className="px-6 py-2.5 rounded-full bg-[#d9f99d] hover:bg-lime-300 text-slate-900 font-extrabold text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Nạp Dữ Liệu Lên Website
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 5: SYSTEM OPERATIONAL GUIDE */}
            {activeTab === 'guide' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-200/80 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-6 h-6 text-lime-600" />
                      <span>Hướng Dẫn Quản Trị Vận Hành Hệ Thống</span>
                    </h3>
                    <p className="text-xs text-slate-500">Các thao tác quản lý dữ liệu, cập nhật bảng giá và bảo mật hệ thống.</p>
                  </div>

                  <div className="space-y-4 text-xs text-slate-700 leading-relaxed font-sans">
                    
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="font-extrabold text-sm text-slate-900">1. Quản Lý Điểm Đến & Giá Thành:</h4>
                      <p>Chuyển sang tab <strong className="text-slate-900">Điểm Đến & Bảng Giá</strong>. Bấm nút <strong className="text-slate-900">Sửa</strong> trên bất kỳ điểm đến nào để cập nhật tên, ảnh, hệ số dịch vụ và các mục giá thành chi tiết (giá khách sạn, ăn uống, di chuyển, vé tham quan VND).</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="font-extrabold text-sm text-slate-900">2. Thay Đổi Banner Trang Chủ:</h4>
                      <p>Chuyển sang tab <strong className="text-slate-900">Banner Trang Chủ</strong> để thay đổi câu khẩu hiệu, hình ảnh phong cảnh nền và nội dung các nút bấm chính. Có ô xem trước giao diện tự động.</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="font-extrabold text-sm text-slate-900">3. Sao Lưu & Bảo Mật Dữ Liệu:</h4>
                      <p>Định kỳ vào tab <strong className="text-slate-900">Cloud & Sao Lưu</strong> bấm <strong className="text-slate-900">Tải File Backup Về Máy</strong> để lưu giữ file cấu hình dự phòng (.json) an toàn.</p>
                    </div>

                  </div>
                </div>
              </div>
            )}

          </div>

        </main>
      </motion.div>
    </div>
  );
};
