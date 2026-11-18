import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Lock,
  LogIn,
  LogOut,
  Trash2,
} from 'lucide-react';
import {
  ADMIN_EMAIL,
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInAdmin,
  signOutAdmin,
} from '../firebase';
import {
  getOptionLabel,
  Q1_OPTIONS,
  Q2_OPTIONS,
  Q3_OPTIONS,
  Q4_OPTIONS,
  QUESTION_TITLES,
  type ChoiceOption,
  type StoredSurveyResponse,
  type TrainingStage,
} from '../surveyData';

type DashboardViewMode = 'summary' | 'individual';
type StageFilter = 'ALL' | TrainingStage;

const STAGE_FILTERS: { value: StageFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'PPL', label: 'PPL' },
  { value: 'IR', label: 'IR' },
  { value: 'CPL', label: 'CPL' },
  { value: 'IP Time building', label: 'IP Time building' },
];

function formatKoreanDateTime(ms: number): string {
  if (!ms) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

function escapeCsvCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

interface DistributionBlockProps<T extends string> {
  title: string;
  options: ChoiceOption<T>[];
  values: string[];
}

function DistributionBlock<T extends string>({
  title,
  options,
  values,
}: DistributionBlockProps<T>) {
  const total = values.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold text-slate-900 leading-snug">{title}</h3>
        <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0 pt-0.5">
          응답 {total}건
        </span>
      </div>

      <div className="space-y-3">
        {options.map((option) => {
          const count = values.filter((v) => v === option.value).length;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={option.value} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-slate-700 leading-snug">{option.label}</span>
                <span className="font-mono tabular-nums text-xs font-medium text-slate-600 shrink-0">
                  {count}명 ({pct}%)
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-700 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ResponsesDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [responses, setResponses] = useState<StoredSurveyResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [viewMode, setViewMode] = useState<DashboardViewMode>('summary');
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [asyncError, setAsyncError] = useState<Error | null>(null);

  if (asyncError) {
    throw asyncError;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      if (currentUser.email === ADMIN_EMAIL && currentUser.emailVerified) {
        setIsAdmin(true);
        setAuthReady(true);
        return;
      }

      try {
        const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
        setIsAdmin(adminDoc.exists() && Boolean(currentUser.emailVerified));
      } catch {
        setIsAdmin(false);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user || !isAdmin) {
      setResponses([]);
      return;
    }

    setLoadingResponses(true);
    const collectionPath = 'survey_responses';
    const q = query(collection(db, collectionPath), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: StoredSurveyResponse[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const createdAt = data.createdAt as Timestamp | undefined;
          return {
            id: docSnap.id,
            trainingStage: data.trainingStage,
            ftdImpact: data.ftdImpact,
            ftdNecessity: data.ftdNecessity,
            ftdOperationMode: data.ftdOperationMode,
            neededSubjects: data.neededSubjects,
            unnecessaryReasons: data.unnecessaryReasons,
            groundTrainingSuggestions: data.groundTrainingSuggestions,
            createdAtMs: createdAt ? createdAt.toMillis() : 0,
          };
        });
        setResponses(items);
        setLoadingResponses(false);
      },
      (error) => {
        setLoadingResponses(false);
        try {
          handleFirestoreError(error, OperationType.LIST, collectionPath);
        } catch (formattedError) {
          setAsyncError(formattedError as Error);
        }
      },
    );

    return () => unsubscribe();
  }, [authReady, user, isAdmin]);

  const filteredResponses = useMemo(() => {
    if (stageFilter === 'ALL') return responses;
    return responses.filter((r) => r.trainingStage === stageFilter);
  }, [responses, stageFilter]);

  useEffect(() => {
    if (selectedIndex >= filteredResponses.length) {
      setSelectedIndex(Math.max(0, filteredResponses.length - 1));
    }
  }, [filteredResponses.length, selectedIndex]);

  const metrics = useMemo(() => {
    const total = filteredResponses.length;
    if (total === 0) {
      return {
        total: 0,
        positiveImpactPct: 0,
        neededPct: 0,
        regularCurriculumPct: 0,
      };
    }

    const positiveImpact = filteredResponses.filter(
      (r) => r.ftdImpact === 'a' || r.ftdImpact === 'b',
    ).length;
    const needed = filteredResponses.filter(
      (r) => r.ftdNecessity === 'a' || r.ftdNecessity === 'b',
    ).length;
    const regularCurriculum = filteredResponses.filter(
      (r) => r.ftdOperationMode === 'a',
    ).length;

    return {
      total,
      positiveImpactPct: Math.round((positiveImpact / total) * 100),
      neededPct: Math.round((needed / total) * 100),
      regularCurriculumPct: Math.round((regularCurriculum / total) * 100),
    };
  }, [filteredResponses]);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInAdmin();
    } catch (error) {
      const msg = error instanceof Error ? error.message : '로그인에 실패했습니다.';
      setAuthError(`Google 로그인 중 문제가 발생했습니다: ${msg}`);
    }
  };

  const handleDeleteResponse = async (id: string) => {
    setDeletingId(id);
    const path = `survey_responses/${id}`;
    try {
      await deleteDoc(doc(db, 'survey_responses', id));
      setConfirmDeleteId(null);
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.DELETE, path);
      } catch (formattedError) {
        setAsyncError(formattedError as Error);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      '제출일시',
      '1.훈련진행위치',
      '2.FTD영향',
      '3.FTD필요성',
      '4.희망운영방식',
      '5.필요과목및단계',
      '6.불필요이유',
      '7.사전지상교육개선의견',
    ];

    const rows = filteredResponses.map((r) => [
      formatKoreanDateTime(r.createdAtMs),
      getOptionLabel(Q1_OPTIONS, r.trainingStage),
      getOptionLabel(Q2_OPTIONS, r.ftdImpact),
      getOptionLabel(Q3_OPTIONS, r.ftdNecessity),
      getOptionLabel(Q4_OPTIONS, r.ftdOperationMode),
      r.neededSubjects,
      r.unnecessaryReasons,
      r.groundTrainingSuggestions,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ftd-survey-responses-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!authReady) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        인증 상태를 확인하고 있습니다...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-slate-200 border-t-[6px] border-t-sky-700 bg-white p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          <Lock className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-lg font-bold text-slate-900">설문 응답 결과 조회 (관리자 전용)</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            응답자가 작성한 의견 보호를 위해 설문 결과 통계 및 개별 응답은 관리자 Google 계정 로그인 후 확인할 수 있습니다.
          </p>
        </div>
        {authError && (
          <p className="text-sm text-rose-700 font-medium">{authError}</p>
        )}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSignIn}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogIn className="w-4 h-4" aria-hidden="true" />
            <span>관리자 Google 로그인</span>
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-4">
        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-lg font-bold text-slate-900">접근 권한이 없습니다</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            현재 로그인된 계정(<span className="font-medium text-slate-900">{user.email}</span>)에는 응답 결과 조회 권한이 없습니다. 관리자 계정으로 다시 로그인해 주세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void signOutAdmin()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          <span>로그아웃</span>
        </button>
      </div>
    );
  }

  const currentIndividual = filteredResponses[selectedIndex];

  return (
    <div className="space-y-4">
      {/* Admin Control Card */}
      <div className="rounded-xl border border-slate-200 border-t-[6px] border-t-sky-700 bg-white p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              응답 <span className="font-mono tabular-nums text-sky-700">{responses.length}</span>개
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              관리자: {user.email} · 익명 응답 실시간 집계
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredResponses.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>CSV 내보내기</span>
            </button>
            <button
              type="button"
              onClick={() => void signOutAdmin()}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>

        {/* Sub-view tabs + Stage Filter */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode('summary')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'summary'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              요약 통계
            </button>
            <button
              type="button"
              onClick={() => setViewMode('individual')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'individual'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              개별 보기
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
            {STAGE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setStageFilter(f.value);
                  setSelectedIndex(0);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  stageFilter === f.value
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadingResponses ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          응답 데이터를 불러오는 중입니다...
        </div>
      ) : filteredResponses.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center space-y-2">
          <p className="text-base font-semibold text-slate-800">아직 수집된 응답이 없습니다</p>
          <p className="text-sm text-slate-500">
            설문 작성 탭에서 응답을 제출하면 이곳에 실시간으로 통계와 의견이 표시됩니다.
          </p>
        </div>
      ) : viewMode === 'summary' ? (
        <div className="space-y-4">
          {/* 4-column KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">표시 중인 응답</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {metrics.total}건
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">긍정적 영향 (a+b)</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-sky-700">
                {metrics.positiveImpactPct}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">필요성 공감 (a+b)</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-sky-700">
                {metrics.neededPct}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">정규 커리큘럼 선호</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {metrics.regularCurriculumPct}%
              </p>
            </div>
          </div>

          <DistributionBlock
            title={QUESTION_TITLES.q1}
            options={Q1_OPTIONS}
            values={filteredResponses.map((r) => r.trainingStage)}
          />
          <DistributionBlock
            title={QUESTION_TITLES.q2}
            options={Q2_OPTIONS}
            values={filteredResponses.map((r) => r.ftdImpact)}
          />
          <DistributionBlock
            title={QUESTION_TITLES.q3}
            options={Q3_OPTIONS}
            values={filteredResponses.map((r) => r.ftdNecessity)}
          />
          <DistributionBlock
            title={QUESTION_TITLES.q4}
            options={Q4_OPTIONS}
            values={filteredResponses.map((r) => r.ftdOperationMode)}
          />

          {/* Qualitative Summaries Q5, Q6, Q7 */}
          {[
            {
              title: QUESTION_TITLES.q5,
              items: filteredResponses.map((r) => ({
                id: r.id,
                stage: r.trainingStage,
                createdAtMs: r.createdAtMs,
                text: r.neededSubjects,
              })),
            },
            {
              title: QUESTION_TITLES.q6,
              items: filteredResponses.map((r) => ({
                id: r.id,
                stage: r.trainingStage,
                createdAtMs: r.createdAtMs,
                text: r.unnecessaryReasons,
              })),
            },
            {
              title: QUESTION_TITLES.q7,
              items: filteredResponses.map((r) => ({
                id: r.id,
                stage: r.trainingStage,
                createdAtMs: r.createdAtMs,
                text: r.groundTrainingSuggestions,
              })),
            },
          ].map((section, sIdx) => (
            <div key={sIdx} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-base font-semibold text-slate-900 leading-snug">
                  {section.title}
                </h3>
                <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0 pt-0.5">
                  응답 {section.items.length}건
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto pr-1">
                {section.items.map((item) => (
                  <div key={item.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{item.stage}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {formatKoreanDateTime(item.createdAtMs)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : currentIndividual ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
                disabled={selectedIndex === 0}
                aria-label="이전 응답"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-mono tabular-nums text-slate-700 px-2">
                {selectedIndex + 1} / {filteredResponses.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelectedIndex((i) => Math.min(filteredResponses.length - 1, i + 1))
                }
                disabled={selectedIndex >= filteredResponses.length - 1}
                aria-label="다음 응답"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono tabular-nums text-slate-500">
                제출: {formatKoreanDateTime(currentIndividual.createdAtMs)}
              </span>

              {confirmDeleteId !== currentIndividual.id ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(currentIndividual.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>삭제</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={deletingId === currentIndividual.id}
                    onClick={() => void handleDeleteResponse(currentIndividual.id)}
                    className="rounded px-2.5 py-1 text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    {deletingId === currentIndividual.id ? '삭제 중...' : '삭제 확인'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          </div>

          <dl className="space-y-5 text-sm">
            <div>
              <dt className="font-semibold text-slate-900 mb-1">{QUESTION_TITLES.q1}</dt>
              <dd className="text-slate-700">
                {getOptionLabel(Q1_OPTIONS, currentIndividual.trainingStage)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900 mb-1">{QUESTION_TITLES.q2}</dt>
              <dd className="text-slate-700">
                {getOptionLabel(Q2_OPTIONS, currentIndividual.ftdImpact)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900 mb-1">{QUESTION_TITLES.q3}</dt>
              <dd className="text-slate-700">
                {getOptionLabel(Q3_OPTIONS, currentIndividual.ftdNecessity)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900 mb-1">{QUESTION_TITLES.q4}</dt>
              <dd className="text-slate-700">
                {getOptionLabel(Q4_OPTIONS, currentIndividual.ftdOperationMode)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900 mb-1">{QUESTION_TITLES.q5}</dt>
              <dd className="text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-lg border border-slate-200 p-3.5">
                {currentIndividual.neededSubjects}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900 mb-1">{QUESTION_TITLES.q6}</dt>
              <dd className="text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-lg border border-slate-200 p-3.5">
                {currentIndividual.unnecessaryReasons}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900 mb-1">{QUESTION_TITLES.q7}</dt>
              <dd className="text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-lg border border-slate-200 p-3.5">
                {currentIndividual.groundTrainingSuggestions}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}
