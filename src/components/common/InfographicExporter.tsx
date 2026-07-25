import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import confetti from 'canvas-confetti';
import { Download, FileText, CheckCircle2, Printer } from 'lucide-react';
import { OptimizationResult } from '../../types';
import { useData } from '../../context/DataContext';

interface ExporterProps {
  result: any;
  timelineElementId: string;
}

export const InfographicExporter: React.FC<ExporterProps> = ({
  result,
  timelineElementId
}) => {
  const { theme } = useData();
  const isLight = theme === 'light';

  const [exporting, setExporting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const handleExportPdf = async () => {
    setExporting(true);
    setSuccess(false);

    try {
      const element = document.getElementById(timelineElementId);
      if (!element) {
        throw new Error('Khóa phần tử lịch trình không tìm thấy');
      }

      // 1. Capture timeline container using html2canvas with CORS-safe fallback
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: isLight ? '#FAF7F2' : '#14100c',
        scrollX: 0,
        scrollY: 0,
        logging: false,
        // Ignore external CORS images if they taint canvas
        ignoreElements: (el) => {
          if (el.tagName === 'IMG') {
            const src = (el as HTMLImageElement).src;
            if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
              return true; // Ignore external network images to prevent CORS taint errors
            }
          }
          return false;
        }
      });

      // Check valid canvas
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas rendering produced zero dimensions');
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // 2. Create PDF document with jsPDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Page 1
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Multi-page if content spans past A4 height
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      // 3. Save File
      const sanitizeName = (result.destination?.name || 'VietNam').split('-')[0].trim().replace(/\s+/g, '_');
      const fileName = `TripBudget_LichTrinh_${sanitizeName}.pdf`;
      pdf.save(fileName);

      // Trigger Celebration
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 }
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);

    } catch (err) {
      console.error('PDF Export Error:', err);
      // Failsafe Fallback: Trigger browser native print/PDF save dialog
      window.print();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className={`rounded-2xl p-2.5 sm:p-3 border shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 font-sans transition-colors duration-500 ${
        isLight
          ? 'bg-[#FAF7F2] border-[#E5DEC9] text-[#231F1D]'
          : 'bg-[#14100c] border-amber-950/60 text-white'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
            isLight
              ? 'bg-[#B8860B]/15 text-[#B8860B] border-[#B8860B]/30'
              : 'bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/40'
          }`}
        >
          <FileText className="w-4 h-4" />
        </div>
        <div>
          <h4 className={`font-bold text-xs font-serif ${isLight ? 'text-[#231F1D]' : 'text-white'}`}>
            Xuất Lịch Trình PDF
          </h4>
          <p className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Tải cẩm nang chi tiêu & lịch trình chi tiết
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleExportPdf}
          disabled={exporting}
          className={`px-4 py-2 rounded-xl font-extrabold text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg cursor-pointer shrink-0 ${
            success
              ? 'bg-emerald-500 text-slate-950'
              : isLight
              ? 'bg-[#B8860B] hover:bg-[#a07509] text-white'
              : 'bg-[#d4af37] hover:bg-amber-400 text-[#0C0805]'
          }`}
        >
          {success ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Đã Tải PDF!</span>
            </>
          ) : (
            <>
              <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-bounce' : ''}`} />
              <span>{exporting ? 'Đang Tạo PDF...' : 'Tải File PDF'}</span>
            </>
          )}
        </button>

        {/* Nút In / Lưu PDF Trực Tiếp Bằng Trình Duyệt (Native Fallback) */}
        <button
          onClick={() => window.print()}
          className={`p-2 rounded-xl border transition-all cursor-pointer shadow-md ${
            isLight
              ? 'bg-white hover:bg-amber-100/60 text-[#231F1D] border-[#E5DEC9]'
              : 'bg-[#0C0805] hover:bg-[#1a140f] text-slate-300 border-amber-950/60 hover:border-[#d4af37]'
          }`}
          title="In hoặc Lưu PDF bằng Trình duyệt"
        >
          <Printer className={`w-4 h-4 ${isLight ? 'text-[#B8860B]' : 'text-[#d4af37]'}`} />
        </button>
      </div>
    </div>
  );
};
