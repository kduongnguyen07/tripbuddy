import type { RefObject, SyntheticEvent } from 'react';
import type { DailyItineraryDayPlan, MaterializedPlan, PlanServiceItem } from '../../types';
import { getFallbackSvg } from '../../utils/imageUtils';

interface PdfItineraryDocumentProps {
  plan: MaterializedPlan;
  documentRef: RefObject<HTMLDivElement>;
}

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

const SLOT_LABELS: Record<string, string> = {
  overnight: 'Lưu trú đêm',
  breakfast: 'Ăn sáng',
  morning: 'Tham quan sáng',
  lunch: 'Ăn trưa',
  afternoon: 'Hoạt động chiều',
  dinner: 'Ăn tối',
  evening: 'Trải nghiệm tối',
};

function formatVnd(value: number | undefined): string {
  return `${Math.max(0, value || 0).toLocaleString('vi-VN')} đ`;
}

function destinationName(plan: MaterializedPlan): string {
  return plan.destination?.name?.split('-')[0].trim() || 'Chuyến đi Việt Nam';
}

function safeImageSource(source: string | undefined, title: string): string {
  return source?.trim() || getFallbackSvg(title);
}

function replaceWithFallback(event: SyntheticEvent<HTMLImageElement>, title: string) {
  const image = event.currentTarget;
  image.onerror = null;
  image.src = getFallbackSvg(title);
}

function PageFooter({ page, totalPages }: { page: number; totalPages: number }) {
  return (
    <div style={{ marginTop: 'auto', paddingTop: 18, borderTop: '1px solid #e8dfcf', display: 'flex', justifyContent: 'space-between', color: '#766d61', fontSize: 11 }}>
      <span>TripBuddy - Cẩm nang lịch trình</span>
      <span>Trang {page}/{totalPages}</span>
    </div>
  );
}

function BudgetCard({ label, value, accent }: { label: string; value: number | undefined; accent: string }) {
  return (
    <div style={{ border: '1px solid #ece3d5', borderRadius: 14, padding: '14px 15px', background: '#fffcf7' }}>
      <div style={{ color: '#766d61', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: accent, fontFamily: 'Georgia, serif', fontSize: 21, fontWeight: 700, marginTop: 5 }}>{formatVnd(value)}</div>
    </div>
  );
}

function EventRow({ event }: { event: PlanServiceItem }) {
  const tags = event.tags.slice(0, 3);
  const price = event.display_cost_vnd ?? event.total_cost_vnd;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '74px 76px 1fr 102px', gap: 14, alignItems: 'center', minHeight: 105, padding: '12px 0', borderBottom: '1px solid #eee7dc' }}>
      <div>
        <div style={{ color: '#9b7418', fontSize: 14, fontWeight: 800 }}>{event.start_time || '08:00'}</div>
        <div style={{ color: '#887f73', fontSize: 11, marginTop: 3 }}>đến {event.end_time || '09:00'}</div>
      </div>
      <img
        src={safeImageSource(event.image_url, event.name)}
        crossOrigin="anonymous"
        onError={(event) => replaceWithFallback(event, event.currentTarget.alt)}
        alt={event.name}
        style={{ width: 76, height: 76, borderRadius: 12, objectFit: 'cover', border: '1px solid #e7dcc9', background: '#f5efe6' }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#9b7418', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{SLOT_LABELS[event.slot || ''] || event.slot || 'Hoạt động'}</div>
        <div style={{ color: '#2a241e', fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 700, lineHeight: 1.25, marginTop: 4 }}>{event.name}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
          <span style={{ color: '#8e6512', fontSize: 11, fontWeight: 700 }}>★ {event.rating.toFixed(1)}</span>
          {tags.map((tag) => (
            <span key={tag} style={{ color: '#665c50', background: '#f4eddf', borderRadius: 99, fontSize: 10, padding: '2px 7px' }}>#{tag}</span>
          ))}
        </div>
      </div>
      <div style={{ color: '#8e6512', fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 700, textAlign: 'right' }}>{price === 0 ? 'Miễn phí' : formatVnd(price)}</div>
    </div>
  );
}

function DayPage({ plan, day, page, totalPages }: { plan: MaterializedPlan; day: DailyItineraryDayPlan; page: number; totalPages: number }) {
  const name = destinationName(plan);

  return (
    <section data-pdf-page style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #d2a83b', paddingBottom: 18 }}>
        <div>
          <div style={eyebrowStyle}>TRIPBUDDY / LỊCH TRÌNH CHI TIẾT</div>
          <h2 style={{ color: '#2a241e', fontFamily: 'Georgia, serif', fontSize: 31, lineHeight: 1.05, margin: '8px 0 0' }}>Ngày {day.day} - Khám phá {name}</h2>
        </div>
        <div style={{ color: '#8e6512', fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, textAlign: 'right' }}>{formatVnd(day.total_cost_vnd)}</div>
      </div>

      <div style={{ color: '#766d61', fontSize: 12, marginTop: 11 }}>Lịch trình được tối ưu theo ngân sách và các ưu tiên đã chọn.</div>

      <div style={{ marginTop: 18 }}>
        {day.events.map((event) => <EventRow key={`${event.id}-${event.slot}`} event={event} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18 }}>
        <BudgetCard label="Lưu trú" value={day.costs.stay} accent="#3e86a9" />
        <BudgetCard label="Ẩm thực" value={day.costs.food} accent="#9b7418" />
        <BudgetCard label="Hoạt động" value={day.costs.activity} accent="#397d60" />
      </div>

      <PageFooter page={page} totalPages={totalPages} />
    </section>
  );
}

const pageStyle = {
  boxSizing: 'border-box' as const,
  width: PAGE_WIDTH,
  height: PAGE_HEIGHT,
  padding: '58px 56px 42px',
  display: 'flex',
  flexDirection: 'column' as const,
  background: '#fffdf9',
  color: '#2a241e',
  fontFamily: 'Arial, sans-serif',
  overflow: 'hidden',
};

const eyebrowStyle = {
  color: '#9b7418',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.13em',
};

export function PdfItineraryDocument({ plan, documentRef }: PdfItineraryDocumentProps) {
  const itinerary = plan.daily_itinerary || [];
  const budget = plan.budget;
  const trip = plan.trip;
  const totalPages = itinerary.length + 1;
  const name = destinationName(plan);

  return (
    <div ref={documentRef} aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, width: PAGE_WIDTH, pointerEvents: 'none', zIndex: -1 }}>
      <section data-pdf-page style={pageStyle}>
        <div style={{ position: 'relative', height: 270, borderRadius: 20, overflow: 'hidden', background: '#20180f' }}>
          <img
            src={safeImageSource(plan.destination?.hero_image, name)}
            crossOrigin="anonymous"
            onError={(event) => replaceWithFallback(event, event.currentTarget.alt)}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.62 }}
          />
          <div style={{ position: 'absolute', inset: 0, padding: 30, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'linear-gradient(0deg, rgba(24,17,10,0.88), rgba(24,17,10,0.05))' }}>
            <div style={{ color: '#f2cb64', fontSize: 11, fontWeight: 800, letterSpacing: '0.14em' }}>TRIPBUDDY</div>
            <h1 style={{ color: '#ffffff', fontFamily: 'Georgia, serif', fontSize: 42, lineHeight: 1.04, margin: '7px 0 0' }}>Cẩm nang lịch trình {name}</h1>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20 }}>
          <div style={tripInfoStyle}><strong>{trip?.people || 0}</strong><span>Khách du lịch</span></div>
          <div style={tripInfoStyle}><strong>{trip?.num_days || itinerary.length}</strong><span>Ngày trải nghiệm</span></div>
          <div style={tripInfoStyle}><strong>{trip?.nights || 0}</strong><span>Đêm lưu trú</span></div>
        </div>

        <div style={{ marginTop: 26 }}>
          <div style={eyebrowStyle}>TỔNG QUAN NGÂN SÁCH</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 10 }}>
            <BudgetCard label="Tổng ngân sách" value={budget?.total_vnd} accent="#8e6512" />
            <BudgetCard label="Đã phân bổ" value={budget?.allocated_vnd} accent="#397d60" />
            <BudgetCard label="Còn dư" value={budget?.remaining_vnd} accent="#3e86a9" />
            <BudgetCard label="Bình quân / người" value={budget?.per_person_vnd} accent="#7057a3" />
          </div>
        </div>

        <div style={{ marginTop: 21, padding: '15px 17px', borderRadius: 14, background: '#f7f0e3', border: '1px solid #ead9b6' }}>
          <div style={{ ...eyebrowStyle, fontSize: 10 }}>PHÂN BỔ THEO HẠNG MỤC</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 9, fontSize: 12 }}>
            <div><strong style={{ color: '#3e86a9' }}>Lưu trú</strong><br />{formatVnd(budget?.allocations.stay.amount_vnd)} ({budget?.allocations.stay.percentage || 0}%)</div>
            <div><strong style={{ color: '#9b7418' }}>Ẩm thực</strong><br />{formatVnd(budget?.allocations.food.amount_vnd)} ({budget?.allocations.food.percentage || 0}%)</div>
            <div><strong style={{ color: '#397d60' }}>Hoạt động</strong><br />{formatVnd(budget?.allocations.activity.amount_vnd)} ({budget?.allocations.activity.percentage || 0}%)</div>
          </div>
        </div>

        <div style={{ marginTop: 18, color: '#6e5b2d', fontSize: 12, lineHeight: 1.5 }}>Lưu ý: Lịch trình này chưa bao gồm chi phí di chuyển và các chi phí phát sinh khác.</div>
        <PageFooter page={1} totalPages={totalPages} />
      </section>

      {itinerary.map((day, index) => (
        <DayPage key={day.day} plan={plan} day={day} page={index + 2} totalPages={totalPages} />
      ))}
    </div>
  );
}

const tripInfoStyle = {
  border: '1px solid #e9dfd0',
  borderRadius: 13,
  padding: '13px 14px',
  background: '#fffaf2',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 4,
  color: '#766d61',
  fontSize: 11,
};
