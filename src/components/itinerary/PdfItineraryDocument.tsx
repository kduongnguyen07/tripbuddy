import type { CSSProperties, RefObject } from 'react';
import type { DailyItineraryDayPlan, MaterializedPlan, PlanServiceItem } from '../../types';

interface PdfItineraryDocumentProps {
  plan: MaterializedPlan;
  documentRef: RefObject<HTMLDivElement>;
}

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const DAYS_PER_PAGE = 2;
const MAX_EVENTS_PER_PAGE = 14;
const PDF_FONT = '"Segoe UI", Arial, sans-serif';

const SLOT_LABELS: Record<string, string> = {
  overnight: 'Lưu trú',
  breakfast: 'Ăn sáng',
  morning: 'Tham quan sáng',
  lunch: 'Ăn trưa',
  afternoon: 'Hoạt động chiều',
  dinner: 'Ăn tối',
  evening: 'Trải nghiệm tối',
  check_in: 'Nhận phòng',
  check_out: 'Trả phòng',
};

function formatVnd(value?: number): string {
  return `${Math.max(0, value || 0).toLocaleString('vi-VN')} đ`;
}

function destinationName(plan: MaterializedPlan): string {
  return plan.destination?.name?.split('-')[0].trim() || 'Việt Nam';
}

function cleanEventName(name: string): string {
  return name.replace(/^[^\p{L}\p{N}]+/u, '').trim() || name;
}

function groupDays(days: DailyItineraryDayPlan[]): DailyItineraryDayPlan[][] {
  const pages: DailyItineraryDayPlan[][] = [];
  let current: DailyItineraryDayPlan[] = [];
  let currentEventCount = 0;

  days.forEach((day) => {
    const wouldExceedDayLimit = current.length >= DAYS_PER_PAGE;
    const wouldExceedEventLimit = current.length > 0 && currentEventCount + day.events.length > MAX_EVENTS_PER_PAGE;

    if (wouldExceedDayLimit || wouldExceedEventLimit) {
      pages.push(current);
      current = [];
      currentEventCount = 0;
    }

    current.push(day);
    currentEventCount += day.events.length;
  });

  if (current.length > 0) pages.push(current);
  return pages;
}

const pageStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: PAGE_WIDTH,
  height: PAGE_HEIGHT,
  padding: '30px 38px 24px',
  display: 'flex',
  flexDirection: 'column',
  background: '#ffffff',
  color: '#26231f',
  fontFamily: PDF_FONT,
  fontSize: 11,
  lineHeight: 1.3,
  overflow: 'hidden',
  overflowWrap: 'anywhere',
  WebkitFontSmoothing: 'antialiased',
};

const labelStyle: CSSProperties = {
  color: '#8e6512',
  fontSize: 8,
  fontWeight: 700,
  letterSpacing: '0.07em',
  lineHeight: 1.35,
  textTransform: 'uppercase',
};

function PageFooter({ page, totalPages }: { page: number; totalPages: number }) {
  return (
    <div style={{ marginTop: 'auto', paddingTop: 7, borderTop: '1px solid #e8e3da', display: 'flex', justifyContent: 'space-between', color: '#847d73', fontSize: 8, lineHeight: 1.2 }}>
      <span>TripBuddy - Lịch trình tối ưu theo ngân sách</span>
      <span>Trang {page}/{totalPages}</span>
    </div>
  );
}

function DocumentHeader({ plan, days }: { plan: MaterializedPlan; days: DailyItineraryDayPlan[] }) {
  const firstDay = days[0]?.day;
  const lastDay = days[days.length - 1]?.day;
  const range = firstDay === lastDay ? `Ngày ${firstDay}` : `Ngày ${firstDay}-${lastDay}`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'end', paddingBottom: 8, borderBottom: '2px solid #b98a25' }}>
      <div style={{ minWidth: 0 }}>
        <div style={labelStyle}>TRIPBUDDY / LỊCH TRÌNH {range}</div>
        <div style={{ marginTop: 2, fontSize: 20, fontWeight: 700, lineHeight: 1.15 }}>{destinationName(plan)}</div>
      </div>
      <div style={{ color: '#6f685f', fontSize: 9, lineHeight: 1.2, whiteSpace: 'nowrap' }}>Bản tóm tắt A4</div>
    </div>
  );
}

function TripSummary({ plan }: { plan: MaterializedPlan }) {
  const budget = plan.budget;
  const trip = plan.trip;
  return (
    <div style={{ marginTop: 9, padding: '8px 10px', border: '1px solid #e7dfd1', borderRadius: 8, background: '#fcfaf6' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.25fr 1.25fr 1.1fr', gap: 10, alignItems: 'start' }}>
        <SummaryItem label="Chuyến đi" value={`${trip?.people || 0} khách / ${trip?.num_days || 0} ngày`} />
        <SummaryItem label="Ngân sách" value={formatVnd(budget?.total_vnd)} />
        <SummaryItem label="Đã phân bổ" value={formatVnd(budget?.allocated_vnd)} />
        <SummaryItem label="Còn dư" value={formatVnd(budget?.remaining_vnd)} />
      </div>
      <div style={{ marginTop: 6, paddingTop: 5, borderTop: '1px solid #ece5d9', color: '#6f685f', fontSize: 8.5, lineHeight: 1.3 }}>
        Phân bổ: Lưu trú {budget?.allocations.stay.percentage || 0}% · Ẩm thực {budget?.allocations.food.percentage || 0}% · Hoạt động {budget?.allocations.activity.percentage || 0}%
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...labelStyle, color: '#7d756a', fontSize: 7.5 }}>{label}</div>
      <div style={{ marginTop: 2, color: '#3a352f', fontSize: 11, fontWeight: 700, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function EventRow({ event }: { event: PlanServiceItem }) {
  const price = event.display_cost_vnd ?? event.total_cost_vnd;
  const slot = SLOT_LABELS[event.slot || ''] || event.slot || 'Hoạt động';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '76px minmax(0, 1fr) 94px', columnGap: 10, alignItems: 'center', minHeight: 39, padding: '4px 0', borderBottom: '1px solid #eee9e1' }}>
      <div style={{ minWidth: 0, color: '#625c54', fontSize: 9, lineHeight: 1.25, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        <strong style={{ color: '#8e6512', fontSize: 10 }}>{event.start_time || '08:00'}</strong>
        <span style={{ color: '#aaa196', margin: '0 3px' }}>-</span>
        {event.end_time || '09:00'}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#2b2824', fontSize: 11.5, fontWeight: 700, lineHeight: 1.25, overflowWrap: 'anywhere' }}>{cleanEventName(event.name)}</div>
        <div style={{ marginTop: 1, color: '#837a6e', fontSize: 8.5, lineHeight: 1.25 }}>
          <span style={{ color: '#8e6512', fontWeight: 700 }}>{slot}</span>
          <span style={{ margin: '0 5px', color: '#c2b9ac' }}>·</span>
          ★ {Number(event.rating || 0).toFixed(1)}
        </div>
      </div>
      <div style={{ minWidth: 0, color: '#765710', fontSize: 10.5, fontWeight: 700, lineHeight: 1.2, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {price === 0 ? 'Miễn phí' : formatVnd(price)}
      </div>
    </div>
  );
}

function DaySection({ day }: { day: DailyItineraryDayPlan }) {
  return (
    <section style={{ marginTop: 11 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'baseline', gap: 12, paddingBottom: 5, borderBottom: '1px solid #cba448' }}>
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h2 style={{ margin: 0, color: '#26231f', fontFamily: PDF_FONT, fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>Ngày {day.day}</h2>
          <span style={{ color: '#81786d', fontSize: 8.5, lineHeight: 1.2 }}>{day.events.length} mục lịch trình</span>
        </div>
        <div style={{ color: '#8e6512', fontSize: 12, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatVnd(day.total_cost_vnd)}</div>
      </div>
      <div>{day.events.map((event) => <EventRow key={`${event.id}-${event.slot}`} event={event} />)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 7, marginTop: 5 }}>
        <DayCost label="Lưu trú" value={day.costs.stay} />
        <DayCost label="Ẩm thực" value={day.costs.food} />
        <DayCost label="Hoạt động" value={day.costs.activity} />
      </div>
    </section>
  );
}

function DayCost({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ boxSizing: 'border-box', height: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, padding: '0 8px', borderRadius: 6, background: '#f7f0df', color: '#71695f', fontSize: 8.5, lineHeight: '14px' }}>
      <span style={{ display: 'flex', height: '100%', alignItems: 'center' }}>{label}</span>
      <strong style={{ display: 'flex', height: '100%', alignItems: 'center', color: '#38332e', fontSize: 9.5, lineHeight: '14px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatVnd(value)}</strong>
    </div>
  );
}

export function PdfItineraryDocument({ plan, documentRef }: PdfItineraryDocumentProps) {
  const itinerary = plan.daily_itinerary || [];
  const pages = groupDays(itinerary);
  const totalPages = pages.length;

  return (
    <div ref={documentRef} aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, width: PAGE_WIDTH, pointerEvents: 'none', zIndex: -1 }}>
      {pages.map((days, pageIndex) => (
        <section key={days.map((day) => day.day).join('-')} data-pdf-page lang="vi" style={pageStyle}>
          <DocumentHeader plan={plan} days={days} />
          {pageIndex === 0 && <TripSummary plan={plan} />}
          <div>{days.map((day) => <DaySection key={day.day} day={day} />)}</div>
          {pageIndex === totalPages - 1 && (
            <div style={{ marginTop: 8, color: '#7a6a43', fontSize: 8, lineHeight: 1.3 }}>
              Lưu ý: Chưa bao gồm chi phí di chuyển và các chi phí phát sinh khác.
            </div>
          )}
          <PageFooter page={pageIndex + 1} totalPages={totalPages} />
        </section>
      ))}
    </div>
  );
}
