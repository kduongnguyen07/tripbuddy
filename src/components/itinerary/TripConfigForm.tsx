import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sliders,
  Sparkles,
  Users,
  Calendar,
  Wallet,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Hotel,
  Utensils,
  Ticket,
  Compass,
  ArrowRight,
  RotateCcw,
  SkipForward,
  Info,
  Tag,
  Star,
  Plus,
  Minus,
} from 'lucide-react';
import {
  DestinationId,
  PriorityLevel,
  Priorities,
  Preferences,
  LodgingStyle,
  FoodStyle,
  ActivityStyle,
  DestinationRecommendation,
  GeneratePlanRequest,
} from '../../types';
import { recommendDestinationsApi } from '../../services/api';
import { useData } from '../../context/DataContext';

interface TripConfigFormProps {
  onGeneratePlan: (req: GeneratePlanRequest) => void;
  loading: boolean;
  infeasibleError: string | null;
}

// Detailed Destination Meta Preview Data
const DESTINATION_META: Record<
  DestinationId,
  {
    name: string;
    region: string;
    typeLabel: string;
    heroImage: string;
    description: string;
    tags: string[];
    highlights: string[];
    minBudgetPerDay: string;
    rating: number;
  }
> = {
  'ha-noi': {
    name: 'Hà Nội',
    region: 'Miền Bắc',
    typeLabel: 'Thành Phố Văn Hóa',
    heroImage: 'https://images.unsplash.com/photo-1509030450996-93f2e3d84074?auto=format&fit=crop&w=1200&q=80',
    description: 'Thủ đô ngàn năm văn hiến với Phố Cổ 36 phố phường, Hồ Gươm, Văn Miếu và ẩm thực đặc sản tinh tế.',
    tags: ['Thành Phố', 'Văn Hóa', 'Lịch Sử', 'Phố Cổ', 'Ẩm Thực'],
    highlights: ['Phố cổ Hà Nội', 'Văn Miếu Quốc Tử Giám', 'Hồ Hoàn Kiếm & Chùa Trấn Quốc', 'Phở bò gia truyền & Cà phê trứng'],
    minBudgetPerDay: '800.000 đ/người',
    rating: 4.9,
  },
  hue: {
    name: 'Huế',
    region: 'Miền Trung',
    typeLabel: 'Cố Đô Di Sản',
    heroImage: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80',
    description: 'Cố đô di sản tĩnh lặng với Quần thể di tích Đại Nội, Lăng tẩm các vua triều Nguyễn và dòng Sông Hương thơ mộng.',
    tags: ['Di Sản', 'Lịch Sử', 'Cố Đô', 'Sông Hương', 'Ẩm Thực Cung Đình'],
    highlights: ['Đại Nội Cố Đô Huế', 'Lăng Khải Định & Tự Đức', 'Chùa Thiên Mụ & Sông Hương', 'Bún bò Huế & Bánh nậm lọc'],
    minBudgetPerDay: '750.000 đ/người',
    rating: 4.8,
  },
  'da-nang': {
    name: 'Đà Nẵng',
    region: 'Miền Trung',
    typeLabel: 'Thành Phố Biển Năng Động',
    heroImage: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80',
    description: 'Thành phố biển đáng sống hàng đầu Việt Nam với bãi biển Mỹ Khê top thế giới, Cầu Rồng và Sun World Bà Nà Hills.',
    tags: ['Biển', 'Thành Phố', 'Hiện Đại', 'Nghỉ Dưỡng', 'Bà Nà Hills'],
    highlights: ['Bãi biển Mỹ Khê', 'Sun World Ba Na Hills (Cầu Vàng)', 'Bán đảo Sơn Trà & Chùa Linh Ứng', 'Cầu Rồng phun lửa'],
    minBudgetPerDay: '950.000 đ/người',
    rating: 4.9,
  },
  'da-lat': {
    name: 'Đà Lạt',
    region: 'Tây Nguyên',
    typeLabel: 'Cao Nguyên Mộng Mơ',
    heroImage: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80',
    description: 'Thành phố ngàn hoa trên cao nguyên với khí hậu se lạnh, rừng thông thơ mộng và hàng trăm quán cà phê check-in.',
    tags: ['Núi Đồi', 'Thiên Nhiên', 'Khí Hậu Mát Mẻ', 'Mộng Mơ', 'Check-in'],
    highlights: ['Hồ Tuyền Lâm & Hồ Xuân Hương', 'Thác Datanla & Đỉnh Langbiang', 'Quảng trường Lâm Viên', 'Cà phê view đồi thông'],
    minBudgetPerDay: '850.000 đ/người',
    rating: 4.8,
  },
  'phu-quoc': {
    name: 'Phú Quốc',
    region: 'Miền Nam',
    typeLabel: 'Đảo Ngọc Đỉnh Cao',
    heroImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80',
    description: 'Thiên đường nghỉ dưỡng biển đảo với cát trắng hoang sơ, biển ngọc bích, hoàng hôn lãng mạn và resort 5 sao.',
    tags: ['Đảo', 'Biển', 'Sang Trọng', 'Resort 5 Sao', 'Hoàng Hôn'],
    highlights: ['Bãi Sao & Bãi Khem', 'VinWonders & Vinpearl Safari', 'Sunset Town & Cầu Hôn', 'Bún quậy & Hải sản tươi'],
    minBudgetPerDay: '1.200.000 đ/người',
    rating: 4.9,
  },
};

const DESTINATIONS: { id: DestinationId; name: string; region: string }[] = [
  { id: 'ha-noi', name: 'Hà Nội', region: 'Miền Bắc' },
  { id: 'hue', name: 'Huế', region: 'Miền Trung' },
  { id: 'da-nang', name: 'Đà Nẵng', region: 'Miền Trung' },
  { id: 'da-lat', name: 'Đà Lạt', region: 'Tây Nguyên' },
  { id: 'phu-quoc', name: 'Phú Quốc', region: 'Miền Nam' },
];

const PRIORITY_OPTIONS: { value: PriorityLevel; label: string }[] = [
  { value: 'none', label: 'Không ưu tiên' },
  { value: 'normal', label: 'Bình thường' },
  { value: 'important', label: 'Quan trọng' },
  { value: 'very_important', label: 'Rất quan trọng' },
];

// Section 2: Preferences Options
const LODGING_STYLES: { id: LodgingStyle; label: string; icon: string }[] = [
  { id: 'casual', label: 'Khách Sạn', icon: '🏨' },
  { id: 'check_in', label: 'Homestay', icon: '🏡' },
  { id: 'luxury', label: 'Resort Cao Cấp', icon: '🏖️' },
  { id: 'scenic_view', label: 'Villa View Đẹp', icon: '🏰' },
  { id: 'nature', label: 'Gần Thiên Nhiên', icon: '🌲' },
  { id: 'street_food', label: 'Gần Phố Cổ / Trung Tâm', icon: '🏮' },
];

const FOOD_STYLES: { id: FoodStyle; label: string; icon: string }[] = [
  { id: 'seafood', label: 'Hải Sản Tươi Sống', icon: '🦀' },
  { id: 'local_specialty', label: 'Đặc Sản Địa Phương', icon: '🍲' },
  { id: 'asian_food', label: 'Buffet / Món Á', icon: '🍣' },
  { id: 'casual', label: 'Quán Ăn Bình Dân', icon: '🥢' },
  { id: 'fine_dining', label: 'Nhà Hàng Cao Cấp', icon: '🍷' },
  { id: 'vegetarian', label: 'Món Chay / Healthy', icon: '🥗' },
  { id: 'western_food', label: 'Món Âu', icon: 'Steak' },
  { id: 'fast_food', label: 'Thức Ăn Nhanh', icon: '🍔' },
];

const ACTIVITY_STYLES: { id: ActivityStyle; label: string; icon: string }[] = [
  { id: 'culture', label: 'Tham Quan Di Tích', icon: '🏛️' },
  { id: 'check_in', label: 'Check-in Sống Ảo', icon: '📸' },
  { id: 'nature', label: 'Thiên Nhiên Cảnh Quan', icon: '🏞️' },
  { id: 'history', label: 'Văn Hóa & Lịch Sử', icon: '📜' },
  { id: 'shopping', label: 'Mua Sắm & Chợ Đêm', icon: '🛍️' },
  { id: 'entertainment', label: 'Giải Trí & Vui Chơi', icon: '🎡' },
  { id: 'street_food', label: 'Ẩm Thực Đường Phố', icon: '🍢' },
];

export const TripConfigForm: React.FC<TripConfigFormProps> = ({
  onGeneratePlan,
  loading,
  infeasibleError,
}) => {
  const { theme } = useData();
  const isLight = theme === 'light';

  // Step 1: Core Config, Step 2: Preferences
  const [step, setStep] = useState<1 | 2>(1);

  // Core Inputs (Numeric Input Boxes instead of Range Sliders)
  const [destinationId, setDestinationId] = useState<DestinationId>('ha-noi');
  const [suggestDestination, setSuggestDestination] = useState<boolean>(false);
  const [totalBudget, setTotalBudget] = useState<number>(10000000); // 10 triệu VNĐ
  const [people, setPeople] = useState<number>(2);
  const [numDays, setNumDays] = useState<number>(3);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Priorities
  const [priorities, setPriorities] = useState<Priorities>({
    stay: 'normal',
    food: 'important',
    activity: 'normal',
  });

  // Preferences
  const [preferences, setPreferences] = useState<Preferences>({
    lodging_styles: ['casual', 'scenic_view'],
    food_styles: ['local_specialty', 'seafood'],
    activity_styles: ['culture', 'nature'],
  });

  // Recommended Destinations (when suggest toggle is ON)
  const [recommendations, setRecommendations] = useState<DestinationRecommendation[]>([]);
  const [recommendLoading, setRecommendLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!suggestDestination) return;

    let isMounted = true;
    setRecommendLoading(true);

    recommendDestinationsApi({
      total_budget: totalBudget,
      people,
      num_days: numDays,
      priorities,
      preferences,
      limit: 4,
    })
      .then((data) => {
        if (isMounted) {
          setRecommendations(data);
          if (data.length > 0) {
            setDestinationId(data[0].destination.id as DestinationId);
          }
        }
      })
      .finally(() => {
        if (isMounted) setRecommendLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [suggestDestination, totalBudget, people, numDays, priorities]);

  // Active Destination Metadata for Preview Panel
  const currentMeta = DESTINATION_META[destinationId] || DESTINATION_META['ha-noi'];

  // Minimum required budget check for validation
  const minRequiredCost = (numDays > 1 ? 800000 : 0) + 500000 * numDays * people;
  const isBudgetTooLow = totalBudget > 0 && totalBudget < minRequiredCost;

  const toggleStyle = <T extends string>(list: T[], val: T): T[] => {
    if (list.includes(val)) {
      return list.filter((item) => item !== val);
    }
    return [...list, val];
  };

  const handleSubmit = () => {
    // Data Validation before submitting
    if (!totalBudget || totalBudget <= 0) {
      setValidationError('Vui lòng nhập tổng ngân sách hợp lệ (lớn hơn 0 VNĐ).');
      return;
    }
    if (!people || people <= 0) {
      setValidationError('Số người tham gia phải từ 1 người trở lên.');
      return;
    }
    if (!numDays || numDays <= 0 || numDays > 7) {
      setValidationError('Số ngày du lịch hỗ trợ từ 1 đến 7 ngày.');
      return;
    }
    if (isBudgetTooLow) {
      setValidationError(
        'Ngân sách hiện tại không đủ để xây dựng lịch trình phù hợp. Vui lòng tăng ngân sách hoặc rút ngắn thời gian chuyến đi.'
      );
      return;
    }

    setValidationError(null);
    onGeneratePlan({
      destination_id: destinationId,
      total_budget: totalBudget,
      people,
      num_days: numDays,
      priorities,
      preferences,
    });
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Step Indicator Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 ${
          isLight ? 'border-[#E5DEC9]' : 'border-amber-950/40'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <Sliders
              className={`w-6 h-6 ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`}
            />
            <h3
              className={`text-2xl font-extrabold font-serif ${
                isLight ? 'text-[#231F1D]' : 'text-white'
              }`}
            >
              Lập Kế Hoạch Chuyến Đi Du Lịch
            </h3>
          </div>
          <p
            className={`text-xs mt-1 font-sans ${
              isLight ? 'text-[#665E55]' : 'text-slate-400'
            }`}
          >
            {step === 1
              ? 'Bước 1/2: Nhập thông tin chuyến đi, điểm đến & ưu tiên chi phí'
              : 'Bước 2/2: Lựa chọn sở thích cá nhân (Lưu trú, Ẩm thực, Hoạt động) - Có thể bỏ qua'}
          </p>
        </div>

        {/* Step Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep(1)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              step === 1
                ? isLight
                  ? 'bg-[#B8860B] text-white shadow-md'
                  : 'bg-[#d4af37] text-[#0C0805] shadow-md font-extrabold'
                : isLight
                ? 'bg-[#FAF7F2] text-[#4A4238]'
                : 'bg-[#0C0805] text-slate-400'
            }`}
          >
            1. Thông Tin Cơ Bản
          </button>

          <button
            onClick={() => setStep(2)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              step === 2
                ? isLight
                  ? 'bg-[#B8860B] text-white shadow-md'
                  : 'bg-[#d4af37] text-[#0C0805] shadow-md font-extrabold'
                : isLight
                ? 'bg-[#FAF7F2] text-[#4A4238]'
                : 'bg-[#0C0805] text-slate-400'
            }`}
          >
            2. Lựa Chọn Sở Thích
          </button>
        </div>
      </div>

      {/* Validation / Infeasible Warning Alert */}
      {(validationError || infeasibleError || isBudgetTooLow) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl bg-amber-500/10 border-2 border-amber-500/50 text-amber-400 flex items-start gap-3.5 text-xs leading-relaxed shadow-xl"
        >
          <AlertTriangle className="w-6 h-6 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-extrabold block text-sm mb-1 text-amber-300">
              Thông Báo Ngân Sách & Dữ Liệu
            </span>
            {validationError ||
              infeasibleError ||
              'Ngân sách hiện tại không đủ để xây dựng lịch trình phù hợp. Vui lòng tăng ngân sách hoặc rút ngắn thời gian chuyến đi.'}
          </div>
        </motion.div>
      )}

      {/* STEP 1: CORE CONFIGURATION FORM */}
      {step === 1 && (
        <div className="space-y-8">
          {/* Destination Auto Suggestion Toggle */}
          <div
            className={`p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
              suggestDestination
                ? isLight
                  ? 'bg-amber-50 border-[#B8860B]/50'
                  : 'bg-amber-950/30 border-[#d4af37]/60'
                : isLight
                ? 'bg-[#FAF7F2] border-[#E5DEC9]'
                : 'bg-[#0C0805] border-amber-950/40'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold ${
                  suggestDestination
                    ? 'bg-[#d4af37] text-[#0C0805] shadow-lg'
                    : isLight
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-sm block">
                  Chế Độ Gợi Ý Điểm Đến Phù Hợp
                </span>
                <span
                  className={`text-xs block mt-0.5 ${
                    isLight ? 'text-[#665E55]' : 'text-slate-400'
                  }`}
                >
                  Khi bật: Hệ thống tự động đề xuất 3–5 địa điểm lý tưởng theo mức ngân sách & số ngày của bạn
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={suggestDestination}
                onChange={(e) => setSuggestDestination(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d4af37]"></div>
            </label>
          </div>

          {/* Destination Selection */}
          {!suggestDestination ? (
            <div className="space-y-3">
              <label
                className={`text-xs font-extrabold uppercase tracking-widest ${
                  isLight ? 'text-[#8A8075]' : 'text-slate-400'
                } flex items-center gap-2`}
              >
                <MapPin className="w-4 h-4 text-[#d4af37]" />
                Điểm Đến (Tỉnh / Thành Phố Tại Việt Nam):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {DESTINATIONS.map((dest) => (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => setDestinationId(dest.id)}
                    className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer font-sans ${
                      destinationId === dest.id
                        ? isLight
                          ? 'bg-[#B8860B] text-white border-[#B8860B] shadow-xl scale-105 font-bold'
                          : 'bg-[#d4af37] text-[#0C0805] border-[#d4af37] shadow-xl scale-105 font-black'
                        : isLight
                        ? 'bg-[#FAF7F2] hover:bg-[#F4F0E8] text-[#231F1D] border-[#E5DEC9]'
                        : 'bg-[#0C0805] hover:bg-slate-900 text-slate-300 border-amber-950/40'
                    }`}
                  >
                    <span className="block font-bold text-sm font-serif">
                      {dest.name}
                    </span>
                    <span className="text-[10px] opacity-80 block mt-0.5">{dest.region}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-[#d4af37] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Gợi Ý Điểm Đến Dành Cho Bạn:
              </label>

              {recommendLoading ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-[#0C0805] rounded-2xl border border-amber-950/40">
                  <div className="animate-spin w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full mx-auto mb-2"></div>
                  Đang tìm kiếm các điểm đến tốt nhất...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {recommendations.map((rec) => (
                    <button
                      key={rec.destination.id}
                      type="button"
                      onClick={() => setDestinationId(rec.destination.id as DestinationId)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        destinationId === rec.destination.id
                          ? isLight
                            ? 'bg-[#FAF7F2] border-[#B8860B] ring-2 ring-[#B8860B]'
                            : 'bg-[#1a140f] border-[#d4af37] ring-2 ring-[#d4af37]'
                          : isLight
                          ? 'bg-white border-[#E5DEC9]'
                          : 'bg-[#0C0805] border-amber-950/40 hover:border-amber-700'
                      }`}
                    >
                      <div>
                        <span className="font-extrabold text-sm block font-serif">
                          {rec.destination.name} ({rec.destination.region})
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Ước tính tối thiểu: {rec.estimated_minimum_cost_vnd.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-full bg-[#d4af37]/20 text-[#d4af37] font-black text-xs">
                          {rec.fit_score}% Phù hợp
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DESTINATION META PREVIEW CARD */}
          <AnimatePresence mode="wait">
            <motion.div
              key={destinationId}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="p-6 rounded-3xl bg-[#0C0805] border border-amber-950/60 shadow-2xl flex flex-col md:flex-row gap-6 items-start"
            >
              <div className="w-full md:w-56 h-40 rounded-2xl overflow-hidden relative shrink-0 border border-amber-950/50">
                <img
                  src={currentMeta.heroImage}
                  alt={currentMeta.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute bottom-2.5 left-2.5 text-xs font-black text-[#d4af37] font-serif flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-[#d4af37]" /> {currentMeta.rating} / 5.0
                </span>
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xl font-extrabold text-white font-serif">
                      {currentMeta.name}
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37] text-[11px] font-bold">
                      {currentMeta.typeLabel}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-slate-400">
                    Ước tính: <span className="text-emerald-400 font-black">{currentMeta.minBudgetPerDay}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {currentMeta.description}
                </p>

                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <Tag className="w-3 h-3 text-[#d4af37]" /> Thẻ Phân Loại Trải Nghiệm:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentMeta.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-xl bg-[#14100c] border border-amber-950/60 text-xs font-bold text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-950/40 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                  {currentMeta.highlights.map((item) => (
                    <span key={item} className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#d4af37]" /> {item}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* 1.1 BIỂU MẪU THÔNG TIN CƠ BẢN (NUMERIC INPUT FIELDS - KHÔNG DÙNG SLIDER KÉO THẢ) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Total Budget Numeric Input */}
            <div
              className={`p-5 rounded-3xl border space-y-3 ${
                isLight ? 'bg-[#FAF7F2] border-[#E5DEC9]' : 'bg-[#0C0805] border-amber-950/40'
              }`}
            >
              <label className="text-xs font-extrabold flex items-center gap-1.5 text-[#d4af37] uppercase tracking-wider">
                <Wallet className="w-4 h-4 text-[#d4af37]" /> Tổng Ngân Sách (VNĐ):
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="500000"
                  step="500000"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(Math.max(0, Number(e.target.value)))}
                  className={`w-full px-4 py-3 rounded-2xl border text-sm font-extrabold font-serif focus:outline-none focus:ring-2 transition-all ${
                    isLight
                      ? 'bg-white border-[#E5DEC9] text-[#231F1D] focus:ring-[#B8860B]'
                      : 'bg-[#14100c] border-amber-950/60 text-white focus:ring-[#d4af37]'
                  }`}
                  placeholder="Nhập tổng ngân sách chuyến đi..."
                />
              </div>

              {/* Formatted Currency Display Helper */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 text-[11px]">Định dạng:</span>
                <span className="font-black text-sm text-[#d4af37]">
                  {totalBudget > 0 ? `${totalBudget.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}
                </span>
              </div>

              {/* Quick Budget Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[5000000, 10000000, 15000000, 20000000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTotalBudget(preset)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                      totalBudget === preset
                        ? 'bg-[#d4af37] text-[#0C0805] border-[#d4af37] font-black'
                        : 'bg-[#14100c] text-slate-300 border-amber-950/40 hover:border-[#d4af37]/40'
                    }`}
                  >
                    {(preset / 1000000).toFixed(0)} Triệu đ
                  </button>
                ))}
              </div>
            </div>

            {/* People Count Input Box with Stepper Controls */}
            <div
              className={`p-5 rounded-3xl border space-y-3 ${
                isLight ? 'bg-[#FAF7F2] border-[#E5DEC9]' : 'bg-[#0C0805] border-amber-950/40'
              }`}
            >
              <label className="text-xs font-extrabold flex items-center gap-1.5 text-sky-400 uppercase tracking-wider">
                <Users className="w-4 h-4 text-sky-400" /> Số Người Tham Gia:
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPeople(Math.max(1, people - 1))}
                  className="w-11 h-11 rounded-2xl bg-[#14100c] hover:bg-sky-500 hover:text-white text-sky-400 border border-amber-950/60 font-black flex items-center justify-center transition-all cursor-pointer shrink-0"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <input
                  type="number"
                  min="1"
                  max="20"
                  value={people}
                  onChange={(e) =>
                    setPeople(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
                  }
                  className={`w-full py-3 rounded-2xl border text-center text-base font-extrabold font-serif focus:outline-none focus:ring-2 transition-all ${
                    isLight
                      ? 'bg-white border-[#E5DEC9] text-[#231F1D] focus:ring-sky-400'
                      : 'bg-[#14100c] border-amber-950/60 text-white focus:ring-sky-400'
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setPeople(Math.min(20, people + 1))}
                  className="w-11 h-11 rounded-2xl bg-[#14100c] hover:bg-sky-500 hover:text-white text-sky-400 border border-amber-950/60 font-black flex items-center justify-center transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <span className="text-[11px] text-slate-400 block text-center">
                Hỗ trợ nhóm từ <strong className="text-sky-400">1 đến 20 người</strong>
              </span>
            </div>

            {/* Num Days Input Box with Stepper Controls */}
            <div
              className={`p-5 rounded-3xl border space-y-3 ${
                isLight ? 'bg-[#FAF7F2] border-[#E5DEC9]' : 'bg-[#0C0805] border-amber-950/40'
              }`}
            >
              <label className="text-xs font-extrabold flex items-center gap-1.5 text-emerald-400 uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-emerald-400" /> Số Ngày Du Lịch (1-7 Ngày):
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNumDays(Math.max(1, numDays - 1))}
                  className="w-11 h-11 rounded-2xl bg-[#14100c] hover:bg-emerald-500 hover:text-white text-emerald-400 border border-amber-950/60 font-black flex items-center justify-center transition-all cursor-pointer shrink-0"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <input
                  type="number"
                  min="1"
                  max="7"
                  value={numDays}
                  onChange={(e) =>
                    setNumDays(Math.max(1, Math.min(7, Number(e.target.value) || 1)))
                  }
                  className={`w-full py-3 rounded-2xl border text-center text-base font-extrabold font-serif focus:outline-none focus:ring-2 transition-all ${
                    isLight
                      ? 'bg-white border-[#E5DEC9] text-[#231F1D] focus:ring-emerald-400'
                      : 'bg-[#14100c] border-amber-950/60 text-white focus:ring-emerald-400'
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setNumDays(Math.min(7, numDays + 1))}
                  className="w-11 h-11 rounded-2xl bg-[#14100c] hover:bg-emerald-500 hover:text-white text-emerald-400 border border-amber-950/60 font-black flex items-center justify-center transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <span className="text-[11px] text-slate-400 block text-center">
                Thời gian chuyến đi từ <strong className="text-emerald-400">1 đến 7 ngày</strong>
              </span>
            </div>
          </div>

          {/* Budget Priority Weights Section */}
          <div className="space-y-4 pt-2">
            <h4
              className={`text-xs font-extrabold uppercase tracking-widest ${
                isLight ? 'text-[#8A8075]' : 'text-slate-400'
              }`}
            >
              1.3. Thiết Lập Mức Ưu Tiên Chi Phí Chuyến Đi:
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Stay Priority */}
              <div
                className={`p-5 rounded-3xl border space-y-3 ${
                  isLight ? 'bg-[#FAF7F2] border-sky-200' : 'bg-[#0C0805] border-sky-900/30'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-sky-400">
                  <span className="flex items-center gap-2 font-serif text-sm">
                    <Hotel className="w-4 h-4" /> Lưu Trú
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setPriorities((prev) => ({ ...prev, stay: opt.value }))
                      }
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                        priorities.stay === opt.value
                          ? 'bg-sky-500 text-white border-sky-500 shadow-md'
                          : 'bg-[#14100c] text-slate-300 border-amber-950/40 hover:border-sky-500/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Food Priority */}
              <div
                className={`p-5 rounded-3xl border space-y-3 ${
                  isLight ? 'bg-[#FAF7F2] border-amber-200' : 'bg-[#0C0805] border-amber-900/30'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#d4af37]">
                  <span className="flex items-center gap-2 font-serif text-sm">
                    <Utensils className="w-4 h-4" /> Ẩm Thực
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setPriorities((prev) => ({ ...prev, food: opt.value }))
                      }
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                        priorities.food === opt.value
                          ? 'bg-[#d4af37] text-[#0C0805] border-[#d4af37] shadow-md font-black'
                          : 'bg-[#14100c] text-slate-300 border-amber-950/40 hover:border-[#d4af37]/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Priority */}
              <div
                className={`p-5 rounded-3xl border space-y-3 ${
                  isLight ? 'bg-[#FAF7F2] border-emerald-200' : 'bg-[#0C0805] border-emerald-900/30'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                  <span className="flex items-center gap-2 font-serif text-sm">
                    <Ticket className="w-4 h-4" /> Hoạt Động
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setPriorities((prev) => ({ ...prev, activity: opt.value }))
                      }
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                        priorities.activity === opt.value
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                          : 'bg-[#14100c] text-slate-300 border-amber-950/40 hover:border-emerald-500/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Row Step 1 */}
          <div className="flex justify-between items-center pt-4 border-t border-amber-950/40">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-3.5 rounded-2xl bg-[#0C0805] border border-amber-950/60 hover:border-[#d4af37] text-slate-200 text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all"
            >
              <span>Tiếp Tục Chọn Sở Thích (Bước 2)</span>
              <ArrowRight className="w-4 h-4 text-[#d4af37]" />
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={`py-4 px-8 font-black text-xs uppercase tracking-[0.15em] rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-2.5 cursor-pointer hover:scale-105 active:scale-95 ${
                isLight
                  ? 'bg-[#B8860B] hover:bg-[#9E7B1A] text-white'
                  : 'bg-[#d4af37] hover:bg-amber-400 text-[#0C0805]'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-[#0C0805] border-t-transparent rounded-full" />
                  <span>Đang Tối Ưu Lịch Trình...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 fill-current" />
                  <span>Tạo Lịch Trình Ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PREFERENCE FILTERING (OPTIONAL WITH SKIP) */}
      {step === 2 && (
        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-amber-950/40 pb-4">
            <div>
              <h4 className="text-lg font-extrabold text-[#d4af37] font-serif">
                2. Lựa Chọn Sở Thích Cá Nhân (Preference Filtering)
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Các câu hỏi thiết kế dạng lựa chọn nhiều đáp án (Multiple Choice). Bạn có thể bỏ qua nếu muốn hệ thống tự động tối ưu.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              className="text-xs font-black text-amber-400 hover:underline flex items-center gap-1.5 cursor-pointer px-4 py-2 rounded-xl bg-amber-950/30 border border-amber-950/60"
            >
              <SkipForward className="w-4 h-4" /> Bỏ qua & Tạo Lịch Trình Ngay
            </button>
          </div>

          {/* Lodging Styles Multiple Choice */}
          <div className="space-y-3">
            <span className="text-xs font-extrabold text-sky-400 block uppercase tracking-wider flex items-center gap-2">
              <Hotel className="w-4 h-4" /> Phong Cách Lưu Trú (Accommodation Style):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {LODGING_STYLES.map((style) => {
                const selected = preferences.lodging_styles.includes(style.id);
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() =>
                      setPreferences((prev) => ({
                        ...prev,
                        lodging_styles: toggleStyle(prev.lodging_styles, style.id),
                      }))
                    }
                    className={`p-3.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center ${
                      selected
                        ? 'bg-sky-500 text-white border-sky-400 shadow-xl scale-105'
                        : 'bg-[#0C0805] text-slate-300 border-amber-950/40 hover:border-sky-400/50'
                    }`}
                  >
                    <span className="text-xl">{style.icon}</span>
                    <span>{style.label}</span>
                    {selected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Food Styles Multiple Choice */}
          <div className="space-y-3">
            <span className="text-xs font-extrabold text-[#d4af37] block uppercase tracking-wider flex items-center gap-2">
              <Utensils className="w-4 h-4" /> Phong Cách Ẩm Thực (Food & Dining Style):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {FOOD_STYLES.map((style) => {
                const selected = preferences.food_styles.includes(style.id);
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() =>
                      setPreferences((prev) => ({
                        ...prev,
                        food_styles: toggleStyle(prev.food_styles, style.id),
                      }))
                    }
                    className={`p-3.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2.5 ${
                      selected
                        ? 'bg-[#d4af37] text-[#0C0805] border-[#d4af37] shadow-xl font-extrabold'
                        : 'bg-[#0C0805] text-slate-300 border-amber-950/40 hover:border-[#d4af37]/50'
                    }`}
                  >
                    <span className="text-lg">{style.icon}</span>
                    <span className="flex-1 text-left">{style.label}</span>
                    {selected && <CheckCircle2 className="w-4 h-4 text-[#0C0805]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activity Styles Multiple Choice */}
          <div className="space-y-3">
            <span className="text-xs font-extrabold text-emerald-400 block uppercase tracking-wider flex items-center gap-2">
              <Ticket className="w-4 h-4" /> Hoạt Động Yêu Thích (Activity Style):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ACTIVITY_STYLES.map((style) => {
                const selected = preferences.activity_styles.includes(style.id);
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() =>
                      setPreferences((prev) => ({
                        ...prev,
                        activity_styles: toggleStyle(prev.activity_styles, style.id),
                      }))
                    }
                    className={`p-3.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2.5 ${
                      selected
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-xl font-extrabold'
                        : 'bg-[#0C0805] text-slate-300 border-amber-950/40 hover:border-emerald-400/50'
                    }`}
                  >
                    <span className="text-lg">{style.icon}</span>
                    <span className="flex-1 text-left">{style.label}</span>
                    {selected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Row Step 2 */}
          <div className="flex justify-between items-center pt-6 border-t border-amber-950/40">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-3.5 rounded-2xl bg-[#0C0805] border border-amber-950/60 text-slate-300 text-xs font-extrabold flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-[#d4af37]" />
              <span>Quay Lại Bước 1</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={`py-4 px-8 font-black text-xs uppercase tracking-[0.15em] rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-2.5 cursor-pointer hover:scale-105 active:scale-95 ${
                isLight
                  ? 'bg-[#B8860B] hover:bg-[#9E7B1A] text-white'
                  : 'bg-[#d4af37] hover:bg-amber-400 text-[#0C0805]'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-[#0C0805] border-t-transparent rounded-full" />
                  <span>Đang Tối Ưu Lịch Trình...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 fill-current" />
                  <span>Tạo Lịch Trình Ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
