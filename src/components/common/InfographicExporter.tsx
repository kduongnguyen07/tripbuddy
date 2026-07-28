import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import confetti from 'canvas-confetti';
import { Download, FileText, CheckCircle2, Printer, AlertCircle } from 'lucide-react';
import type { MaterializedPlan } from '../../types';
import { PdfItineraryDocument } from '../itinerary/PdfItineraryDocument';
import { useData } from '../../context/DataContext';

interface ExporterProps {
  plan: MaterializedPlan;
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete) return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => {
      image.removeEventListener('load', finish);
      image.removeEventListener('error', finish);
      resolve();
    };
    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', finish, { once: true });
    window.setTimeout(finish, 3500);
  });
}

async function waitForPdfAssets(root: HTMLElement): Promise<void> {
  if ('fonts' in document) {
    await document.fonts.ready;
  }

  await Promise.all(Array.from(root.querySelectorAll('img')).map(waitForImage));
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

function safeFileSegment(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'VietNam';
}

export const InfographicExporter: React.FC<ExporterProps> = ({ plan }) => {
  const { theme } = useData();
  const isLight = theme === 'light';
  const documentRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canExport = plan.status === 'success' && Boolean(plan.daily_itinerary?.length);

  const handleExportPdf = async () => {
    if (!canExport || exporting || !documentRef.current) return;

    setExporting(true);
    setSuccess(false);
    setError(null);

    try {
      const root = documentRef.current;
      await waitForPdfAssets(root);

      const pages = Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-page]'));
      if (pages.length === 0) throw new Error('Không tìm thấy nội dung PDF để xuất.');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let index = 0; index < pages.length; index += 1) {
        const canvas = await html2canvas(pages[index], {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#fffdf9',
          logging: false,
          windowWidth: pages[index].scrollWidth,
          windowHeight: pages[index].scrollHeight,
        });

        if (canvas.width === 0 || canvas.height === 0) throw new Error(`Không thể tạo trang ${index + 1}.`);
        if (index > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, pdfWidth, pdfHeight, `itinerary-page-${index}`, 'FAST');
      }

      const destination = safeFileSegment(plan.destination?.name?.split('-')[0].trim() || 'VietNam');
      const date = new Date().toISOString().slice(0, 10);
      pdf.save(`TripBudget_LichTrinh_${destination}_${date}.pdf`);

      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
      setSuccess(true);
      window.setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error('PDF export failed:', err);
      setError(err instanceof Error ? err.message : 'Không thể tạo PDF. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PdfItineraryDocument plan={plan} documentRef={documentRef} />
      <div className={`rounded-2xl p-2.5 sm:p-3 border shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 font-sans transition-colors duration-500 ${
        isLight ? 'bg-[#FAF7F2] border-[#E5DEC9] text-[#231F1D]' : 'bg-[#14100c] border-amber-950/60 text-white'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
            isLight ? 'bg-[#B8860B]/15 text-[#B8860B] border-[#B8860B]/30' : 'bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/40'
          }`}>
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h4 className={`font-bold text-xs font-serif ${isLight ? 'text-[#231F1D]' : 'text-white'}`}>Xuất Lịch Trình PDF</h4>
            <p className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Cẩm nang ngân sách và lịch trình đầy đủ</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={!canExport || exporting}
            className={`px-4 py-2 rounded-xl font-extrabold text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shrink-0 ${
              !canExport ? 'bg-slate-400 text-white cursor-not-allowed' : success ? 'bg-emerald-500 text-slate-950' : isLight ? 'bg-[#B8860B] hover:bg-[#a07509] text-white cursor-pointer' : 'bg-[#d4af37] hover:bg-amber-400 text-[#0C0805] cursor-pointer'
            }`}
          >
            {success ? <><CheckCircle2 className="w-3.5 h-3.5" /><span>Đã tải PDF!</span></> : <><Download className={`w-3.5 h-3.5 ${exporting ? 'animate-bounce' : ''}`} /><span>{exporting ? 'Đang tạo PDF...' : 'Tải file PDF'}</span></>}
          </button>
          <button
            onClick={() => window.print()}
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-md ${
              isLight ? 'bg-white hover:bg-amber-100/60 text-[#231F1D] border-[#E5DEC9]' : 'bg-[#0C0805] hover:bg-[#1a140f] text-slate-300 border-amber-950/60 hover:border-[#d4af37]'
            }`}
            title="In hoặc lưu bằng trình duyệt"
          >
            <Printer className={`w-4 h-4 ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`} />
          </button>
        </div>
        {error && <p role="alert" className="w-full flex items-center gap-1.5 text-[10px] text-red-500"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
      </div>
    </>
  );
};
