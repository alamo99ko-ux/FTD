import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plane,
  RotateCcw,
  Send,
} from 'lucide-react';
import {
  createSafeDocumentId,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  getOptionLabel,
  INITIAL_FORM_VALUES,
  MAX_TEXT_LENGTH,
  Q1_OPTIONS,
  Q2_OPTIONS,
  Q3_OPTIONS,
  Q4_OPTIONS,
  QUESTION_TITLES,
  SURVEY_HEADER,
  type ChoiceOption,
  type SurveyFormValues,
} from '../surveyData';

type QuestionKey = keyof SurveyFormValues;

const QUESTION_DOM_IDS: Record<QuestionKey, string> = {
  trainingStage: 'question-1',
  ftdImpact: 'question-2',
  ftdNecessity: 'question-3',
  ftdOperationMode: 'question-4',
  neededSubjects: 'question-5',
  unnecessaryReasons: 'question-6',
  groundTrainingSuggestions: 'question-7',
};

const ORDERED_KEYS: QuestionKey[] = [
  'trainingStage',
  'ftdImpact',
  'ftdNecessity',
  'ftdOperationMode',
  'neededSubjects',
  'unnecessaryReasons',
  'groundTrainingSuggestions',
];

function validateValues(values: SurveyFormValues): Partial<Record<QuestionKey, string>> {
  const errors: Partial<Record<QuestionKey, string>> = {};

  if (!values.trainingStage) {
    errors.trainingStage = '필수 질문입니다. 현재 훈련 진행 위치를 선택해 주세요.';
  }
  if (!values.ftdImpact) {
    errors.ftdImpact = '필수 질문입니다. FTD 비행 연습의 영향을 선택해 주세요.';
  }
  if (values.neededSubjects.trim().length > MAX_TEXT_LENGTH) {
    errors.neededSubjects = `최대 ${MAX_TEXT_LENGTH.toLocaleString()}자까지 입력할 수 있습니다.`;
  }
  if (values.unnecessaryReasons.trim().length > MAX_TEXT_LENGTH) {
    errors.unnecessaryReasons = `최대 ${MAX_TEXT_LENGTH.toLocaleString()}자까지 입력할 수 있습니다.`;
  }
  if (values.groundTrainingSuggestions.trim().length > MAX_TEXT_LENGTH) {
    errors.groundTrainingSuggestions = `최대 ${MAX_TEXT_LENGTH.toLocaleString()}자까지 입력할 수 있습니다.`;
  }

  return errors;
}

interface RadioQuestionCardProps<T extends string> {
  id: string;
  title: string;
  name: string;
  options: ChoiceOption<T>[];
  value: T | '';
  required?: boolean;
  error?: string;
  onChange: (value: T | '') => void;
}

function RadioQuestionCard<T extends string>({
  id,
  title,
  name,
  options,
  value,
  required = false,
  error,
  onChange,
}: RadioQuestionCardProps<T>) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-label`}
      className={`rounded-xl bg-white p-6 sm:p-7 border transition-colors duration-150 ${
        error
          ? 'border-rose-400 ring-1 ring-rose-200'
          : 'border-slate-200 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/10'
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <h2
          id={`${id}-label`}
          className="text-base sm:text-[17px] font-semibold text-slate-900 leading-snug"
        >
          {title}
          {required && (
            <>
              {' '}
              <span className="text-rose-600 font-semibold" aria-label="필수 항목">
                *
              </span>
            </>
          )}
        </h2>
        {!required && value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            선택 해제
          </button>
        )}
      </div>

      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-required={required}
        className="space-y-2.5"
      >
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex items-start gap-3.5 rounded-lg border px-4 py-3 min-h-[46px] cursor-pointer transition-colors duration-150 ${
                isSelected
                  ? 'border-sky-600 bg-sky-50/70 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isSelected
                    ? 'border-sky-700 bg-white'
                    : 'border-slate-400 bg-white'
                }`}
              >
                {isSelected && (
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-700" />
                )}
              </span>
              <span className="text-[15px] leading-relaxed font-normal">
                {option.label}
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 text-sm font-medium text-rose-700"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}

interface TextQuestionCardProps {
  id: string;
  title: string;
  value: string;
  placeholder: string;
  helperText: string;
  required?: boolean;
  error?: string;
  onChange: (value: string) => void;
}

function TextQuestionCard({
  id,
  title,
  value,
  placeholder,
  helperText,
  required = false,
  error,
  onChange,
}: TextQuestionCardProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-label`}
      className={`rounded-xl bg-white p-6 sm:p-7 border transition-colors duration-150 ${
        error
          ? 'border-rose-400 ring-1 ring-rose-200'
          : 'border-slate-200 focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-600/10'
      }`}
    >
      <div className="mb-2">
        <label
          id={`${id}-label`}
          htmlFor={`${id}-input`}
          className="block text-base sm:text-[17px] font-semibold text-slate-900 leading-snug"
        >
          {title}
          {required && (
            <>
              {' '}
              <span className="text-rose-600 font-semibold" aria-label="필수 항목">
                *
              </span>
            </>
          )}
        </label>
      </div>

      <p className="text-[13px] text-slate-500 mb-4 leading-relaxed">{helperText}</p>

      <textarea
        id={`${id}-input`}
        rows={3}
        maxLength={MAX_TEXT_LENGTH}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-required={required}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-lg border px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 leading-relaxed resize-y min-h-[104px] transition-colors focus:outline-none ${
          error
            ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500'
            : 'border-slate-200 bg-slate-50/50 focus:bg-white focus:border-sky-700'
        }`}
      />

      <div className="mt-2.5 flex items-center justify-between gap-4">
        <div className="min-h-[20px]">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 text-sm font-medium text-rose-700"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-400 shrink-0">
          {value.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}
        </span>
      </div>
    </section>
  );
}

export function SurveyForm() {
  const [values, setValues] = useState<SurveyFormValues>(INITIAL_FORM_VALUES);
  const [showValidation, setShowValidation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<SurveyFormValues | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [bannerLoadFailed, setBannerLoadFailed] = useState(false);
  const [asyncError, setAsyncError] = useState<Error | null>(null);

  if (asyncError) {
    throw asyncError;
  }

  const validationErrors = useMemo(() => validateValues(values), [values]);
  const visibleErrors = showValidation ? validationErrors : {};

  const requiredCompletedCount = useMemo(() => {
    let count = 0;
    if (values.trainingStage) count += 1;
    if (values.ftdImpact) count += 1;
    return count;
  }, [values.trainingStage, values.ftdImpact]);

  const completedCount = useMemo(() => {
    let count = 0;
    if (values.trainingStage) count += 1;
    if (values.ftdImpact) count += 1;
    if (values.ftdNecessity) count += 1;
    if (values.ftdOperationMode) count += 1;
    if (values.neededSubjects.trim()) count += 1;
    if (values.unnecessaryReasons.trim()) count += 1;
    if (values.groundTrainingSuggestions.trim()) count += 1;
    return count;
  }, [values]);

  const updateField = <K extends QuestionKey>(key: K, value: SurveyFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (confirmClear) {
      setConfirmClear(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateValues(values);
    const firstErrorKey = ORDERED_KEYS.find((k) => Boolean(errors[k]));

    if (firstErrorKey) {
      setShowValidation(true);
      const element = document.getElementById(QUESTION_DOM_IDS[firstErrorKey]);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    const docId = createSafeDocumentId();
    const collectionPath = 'survey_responses';

    try {
      const payload = {
        trainingStage: values.trainingStage,
        ftdImpact: values.ftdImpact,
        ftdNecessity: values.ftdNecessity,
        ftdOperationMode: values.ftdOperationMode,
        neededSubjects: values.neededSubjects.trim().slice(0, MAX_TEXT_LENGTH),
        unnecessaryReasons: values.unnecessaryReasons.trim().slice(0, MAX_TEXT_LENGTH),
        groundTrainingSuggestions: values.groundTrainingSuggestions
          .trim()
          .slice(0, MAX_TEXT_LENGTH),
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, collectionPath, docId), payload);
      setSubmittedRecord({
        ...values,
        neededSubjects: payload.neededSubjects,
        unnecessaryReasons: payload.unnecessaryReasons,
        groundTrainingSuggestions: payload.groundTrainingSuggestions,
      });
      setShowValidation(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, `${collectionPath}/${docId}`);
      } catch (formattedError) {
        setAsyncError(formattedError as Error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setValues(INITIAL_FORM_VALUES);
    setShowValidation(false);
    setConfirmClear(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitAnother = () => {
    setSubmittedRecord(null);
    setShowSummary(false);
    setValues(INITIAL_FORM_VALUES);
    setShowValidation(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (submittedRecord) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 border-t-[6px] border-t-sky-700 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-start gap-3.5">
            <CheckCircle2
              className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="space-y-2 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {SURVEY_HEADER.title}
              </h1>
              <p className="text-base font-semibold text-emerald-700">
                응답이 정상적으로 기록되었습니다.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed pt-1">
                소중한 의견을 제출해 주셔서 감사합니다. 제출하신 내용은 본교(수색) 비행교육원 사전 지상교육 및 FTD(Metor·RTD) 활용 방안 개선을 위한 기초 자료로 활용됩니다.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleSubmitAnother}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              다른 응답 제출
            </button>

            <button
              type="button"
              onClick={() => setShowSummary((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 py-2 px-3 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>내가 제출한 응답 보기</span>
              {showSummary ? (
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {showSummary && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-semibold text-slate-900">제출 응답 내역</h2>
              <span className="text-xs text-slate-500">익명 제출 · 이메일 미수집</span>
            </div>

            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-semibold text-slate-800 mb-1">{QUESTION_TITLES.q1}</dt>
                <dd className="text-slate-600">
                  {getOptionLabel(Q1_OPTIONS, submittedRecord.trainingStage)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800 mb-1">{QUESTION_TITLES.q2}</dt>
                <dd className="text-slate-600">
                  {getOptionLabel(Q2_OPTIONS, submittedRecord.ftdImpact)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800 mb-1">{QUESTION_TITLES.q3}</dt>
                <dd className="text-slate-600">
                  {getOptionLabel(Q3_OPTIONS, submittedRecord.ftdNecessity)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800 mb-1">{QUESTION_TITLES.q4}</dt>
                <dd className="text-slate-600">
                  {getOptionLabel(Q4_OPTIONS, submittedRecord.ftdOperationMode)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800 mb-1">{QUESTION_TITLES.q5}</dt>
                <dd className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {submittedRecord.neededSubjects || '미응답'}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800 mb-1">{QUESTION_TITLES.q6}</dt>
                <dd className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {submittedRecord.unnecessaryReasons || '미응답'}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800 mb-1">{QUESTION_TITLES.q7}</dt>
                <dd className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {submittedRecord.groundTrainingSuggestions || '미응답'}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Header Banner Image Card */}
      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-[16/6] sm:aspect-[16/5] relative">
        {!bannerLoadFailed ? (
          <img
            src="/src/assets/images/ftd_cockpit_banner_1794988666546.jpg"
            alt="비행교육원 FTD 시뮬레이션 조종실 전경"
            referrerPolicy="no-referrer"
            onError={() => setBannerLoadFailed(true)}
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-900 via-sky-950 to-slate-800 flex items-center justify-center">
            <div className="flex items-center gap-3 text-sky-200/80">
              <Plane className="w-7 h-7" aria-hidden="true" />
              <span className="text-sm font-medium tracking-wide">
                수색 비행교육원 FTD 시뮬레이션 설문
              </span>
            </div>
          </div>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent pointer-events-none"
        />
      </div>

      {/* Form Header & Instructions Card */}
      <div className="rounded-xl border border-slate-200 border-t-[6px] border-t-sky-700 bg-white p-6 sm:p-8 shadow-xs">
        <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight leading-snug text-balance">
          {SURVEY_HEADER.title}
        </h1>

        <div className="mt-4 space-y-2.5 text-[15px] text-slate-700 leading-relaxed">
          {SURVEY_HEADER.paragraphs.map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3.5 space-y-1.5 text-sm text-slate-700">
          {SURVEY_HEADER.notices.map((notice, idx) => (
            <p key={idx} className="leading-relaxed">
              <span className="font-semibold text-sky-800 mr-1.5">*</span>
              {notice}
            </p>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <span className="font-medium text-rose-700">
            * 표시는 필수 질문입니다 (1번, 2번 문항 필수)
          </span>
          <span className="text-slate-500 font-mono tabular-nums">
            필수 {requiredCompletedCount} / 2 · 전체 {completedCount} / 7
          </span>
        </div>
      </div>

      {/* Validation Alert Summary */}
      {showValidation && Object.keys(validationErrors).length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50 px-5 py-4 flex items-start gap-3 text-sm text-rose-800"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              아직 답변하지 않은 필수 항목(1~2번)이 {Object.keys(validationErrors).length}개 있습니다.
            </p>
            <p className="text-rose-700 mt-0.5">
              표시된 필수 문항을 확인한 후 다시 제출해 주세요.
            </p>
          </div>
        </div>
      )}

      {/* Question 1 (Required) */}
      <RadioQuestionCard
        id={QUESTION_DOM_IDS.trainingStage}
        title={QUESTION_TITLES.q1}
        name="trainingStage"
        options={Q1_OPTIONS}
        value={values.trainingStage}
        required={true}
        error={visibleErrors.trainingStage}
        onChange={(val) => updateField('trainingStage', val)}
      />

      {/* Question 2 (Required) */}
      <RadioQuestionCard
        id={QUESTION_DOM_IDS.ftdImpact}
        title={QUESTION_TITLES.q2}
        name="ftdImpact"
        options={Q2_OPTIONS}
        value={values.ftdImpact}
        required={true}
        error={visibleErrors.ftdImpact}
        onChange={(val) => updateField('ftdImpact', val)}
      />

      {/* Question 3 (Optional) */}
      <RadioQuestionCard
        id={QUESTION_DOM_IDS.ftdNecessity}
        title={QUESTION_TITLES.q3}
        name="ftdNecessity"
        options={Q3_OPTIONS}
        value={values.ftdNecessity}
        required={false}
        error={visibleErrors.ftdNecessity}
        onChange={(val) => updateField('ftdNecessity', val)}
      />

      {/* Question 4 (Optional) */}
      <RadioQuestionCard
        id={QUESTION_DOM_IDS.ftdOperationMode}
        title={QUESTION_TITLES.q4}
        name="ftdOperationMode"
        options={Q4_OPTIONS}
        value={values.ftdOperationMode}
        required={false}
        error={visibleErrors.ftdOperationMode}
        onChange={(val) => updateField('ftdOperationMode', val)}
      />

      {/* Question 5 (Optional) */}
      <TextQuestionCard
        id={QUESTION_DOM_IDS.neededSubjects}
        title={QUESTION_TITLES.q5}
        value={values.neededSubjects}
        required={false}
        helperText="선택 입력 항목입니다. FTD 훈련이 필요하다고 생각하시는 경우 구체적인 과목이나 비행단계를 적어주세요."
        placeholder="예: 장주 비행 절차, 계기 접근(ILS/VOR) 훈련, 비정상 절차 연습 등"
        error={visibleErrors.neededSubjects}
        onChange={(val) => updateField('neededSubjects', val)}
      />

      {/* Question 6 (Optional) */}
      <TextQuestionCard
        id={QUESTION_DOM_IDS.unnecessaryReasons}
        title={QUESTION_TITLES.q6}
        value={values.unnecessaryReasons}
        required={false}
        helperText="선택 입력 항목입니다. FTD 훈련이 불필요하다고 생각하시는 경우 중요한 순서대로 이유를 적어주세요."
        placeholder="필요하지 않다고 생각하시는 이유를 중요한 순서대로 작성해 주세요."
        error={visibleErrors.unnecessaryReasons}
        onChange={(val) => updateField('unnecessaryReasons', val)}
      />

      {/* Question 7 (Optional) */}
      <TextQuestionCard
        id={QUESTION_DOM_IDS.groundTrainingSuggestions}
        title={QUESTION_TITLES.q7}
        value={values.groundTrainingSuggestions}
        required={false}
        helperText="선택 입력 항목입니다. 사전 지상교육 중 개선 및 반영이 필요한 사항을 자유롭게 작성해 주세요."
        placeholder="사전 지상교육 커리큘럼, 교보재, 스케줄 등 개선 의견을 자유롭게 기술해 주세요."
        error={visibleErrors.groundTrainingSuggestions}
        onChange={(val) => updateField('groundTrainingSuggestions', val)}
      />

      {/* Form Footer Actions */}
      <div className="pt-2 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-6 py-3 text-sm sm:text-[15px] font-semibold text-white hover:bg-sky-800 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>{isSubmitting ? '제출 중...' : '제출하기'}</span>
          </button>

          <span className="text-xs sm:text-sm text-slate-500 font-mono tabular-nums">
            필수 {requiredCompletedCount} / 2 완료
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>양식 지우기</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5">
              <span className="text-xs font-medium text-slate-700">입력 내용을 초기화할까요?</span>
              <button
                type="button"
                onClick={handleResetForm}
                className="rounded px-2.5 py-1 text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                초기화
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                취소
              </button>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
