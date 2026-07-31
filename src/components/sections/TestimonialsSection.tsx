import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

export const TestimonialsSection: React.FC = () => {
  const reviews = [
    {
      name: "Trần Anh Tuấn",
      role: "Traveler từ Hà Nội",
      text: "Thuật toán PuLP tính toán ngân sách rất chuẩn xác. Chuyến đi Ninh Bình 3 ngày của tôi tiết kiệm hơn 25% chi phí mà trải nghiệm dịch vụ ăn uống vẫn cực kỳ chất lượng!",
      rating: 5
    },
    {
      name: "Elena Rostova",
      role: "Du khách Quốc tế",
      text: "TripBuddy formatted my Vietnam itinerary perfectly. Ha Long Bay and Hoi An lantern night exceeded all expectations. Highly recommended!",
      rating: 5
    },
    {
      name: "Nguyễn Minh Châu",
      role: "Phượt thủ TP.HCM",
      text: "Bản đồ Mapbox hiển thị đầy đủ chủ quyền Hoàng Sa & Trường Sa rất uy tín. Thanh trượt tối ưu hóa chi phí phản hồi tức thì rất thông minh.",
      rating: 5
    },
    {
      name: "David Miller",
      role: "Nhiếp ảnh gia",
      text: "The combination of heritage pagodas and linear programming budget engine makes this the most sophisticated travel planner for Vietnam.",
      rating: 5
    }
  ];

  return (
    <section className="py-24 bg-slate-950 text-white relative overflow-hidden border-t border-slate-800">
      
      <div className="max-w-7xl mx-auto px-8 space-y-12 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest font-sans">Đánh Giá Từ Du Khách</span>
          <h2 className="text-4xl sm:text-5xl font-black font-serif tracking-tight">
            Traveler Voices & <span className="text-gradient-gold">Reviews</span>
          </h2>
        </div>

        {/* Reviews Grid matching Screenshot Section 6 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((rev, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 space-y-4 shadow-2xl relative"
            >
              <Quote className="w-8 h-8 text-amber-500/20 absolute top-6 right-6" />

              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: rev.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>

              <p className="text-slate-300 text-sm font-sans leading-relaxed italic">
                "{rev.text}"
              </p>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-sans">
                <div>
                  <span className="font-bold text-white block">{rev.name}</span>
                  <span className="text-slate-400 text-[11px]">{rev.role}</span>
                </div>
                <span className="text-amber-400 font-bold text-[10px] bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  Verified Traveler
                </span>
              </div>
            </motion.div>
          ))}
        </div>

      </div>

    </section>
  );
};
