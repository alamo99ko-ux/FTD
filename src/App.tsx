import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ResponsesDashboard } from './components/ResponsesDashboard';
import { SurveyForm } from './components/SurveyForm';

type AppTab = 'form' | 'responses';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('form');
  const [copied, setCopied] = useState(false);

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* Three-Zone Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-8 px-4 sm:px-6 h-16">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('form');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            수색 비행교육원 FTD 설문
          </a>

          <nav aria-label="설문 탐색" className="flex items-center gap-6 h-full">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`h-full inline-flex items-center border-b-2 px-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'form'
                  ? 'border-sky-700 text-sky-800 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              질문
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('responses')}
              className={`h-full inline-flex items-center border-b-2 px-1 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'responses'
                  ? 'border-sky-700 text-sky-800 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              응답
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => void handleCopyShareLink()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  <span>링크 복사됨</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>설문 공유</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Google Forms-style Centered Column */}
      <main id="top" className="flex-1 w-full mx-auto max-w-[780px] px-4 sm:px-6 py-6 sm:py-8">
        <ErrorBoundary>
          {activeTab === 'form' ? <SurveyForm /> : <ResponsesDashboard />}
        </ErrorBoundary>
      </main>

      <footer className="py-6 px-4 text-center text-xs text-slate-500">
        <span>본교(수색) 비행교육원 FTD(Metor · RTD) 활용 방안 설문</span>
        <span className="mx-2" aria-hidden="true">
          ·
        </span>
        <span>이메일 주소 미수집 익명 조사</span>
      </footer>
    </div>
  );
}
