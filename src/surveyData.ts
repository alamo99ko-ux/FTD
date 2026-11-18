export const MAX_TEXT_LENGTH = 2000;

export type TrainingStage = 'PPL' | 'IR' | 'CPL' | 'IP Time building';
export type FiveScaleCode = 'a' | 'b' | 'c' | 'd' | 'e';
export type OperationModeCode = 'a' | 'b' | 'c';

export interface SurveyFormValues {
  trainingStage: TrainingStage | '';
  ftdImpact: FiveScaleCode | '';
  ftdNecessity: FiveScaleCode | '';
  ftdOperationMode: OperationModeCode | '';
  neededSubjects: string;
  unnecessaryReasons: string;
  groundTrainingSuggestions: string;
}

export interface StoredSurveyResponse {
  id: string;
  trainingStage: TrainingStage;
  ftdImpact: FiveScaleCode;
  ftdNecessity: FiveScaleCode;
  ftdOperationMode: OperationModeCode;
  neededSubjects: string;
  unnecessaryReasons: string;
  groundTrainingSuggestions: string;
  createdAtMs: number;
}

export const INITIAL_FORM_VALUES: SurveyFormValues = {
  trainingStage: '',
  ftdImpact: '',
  ftdNecessity: '',
  ftdOperationMode: '',
  neededSubjects: '',
  unnecessaryReasons: '',
  groundTrainingSuggestions: '',
};

export const SURVEY_HEADER = {
  title: '실 비행 전 FTD 활용 방안에 대한 설문 조사',
  paragraphs: [
    '미래 하늘로의 꿈을 이루기 위해 헌신 노력하고 있는 조종사 여러분을 응원합니다.',
    '비행교육원 비행교육 입과전 FTD 시뮬레이션 비행 연습이 실비행훈련에 미치는 영향에 대해 여러분의 의견을 구하고자 합니다.',
    '이를 바탕으로 비행교육원은 비행교육 입과전 지상교육에 대하여 보다 효과적인 FTD 활용 방안을 마련할 것입니다.',
    '바쁜 일정이지만 후배 교육생들의 효율적인 교육 품질 향상을 위해 여러분의 의견을 부탁드립니다.',
  ],
  notices: [
    'FTD 는 본교(수색) 비행교육원 1층에 보유한 Metor 와 RTD 활용을 전제로 합니다.',
    '이메일주소는 수집되지않습니다.',
  ],
};

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  shortLabel: string;
}

export const Q1_OPTIONS: ChoiceOption<TrainingStage>[] = [
  { value: 'PPL', label: 'a. PPL', shortLabel: 'PPL' },
  { value: 'IR', label: 'b. IR', shortLabel: 'IR' },
  { value: 'CPL', label: 'c. CPL', shortLabel: 'CPL' },
  { value: 'IP Time building', label: 'd. IP Time building', shortLabel: 'IP Time building' },
];

export const Q2_OPTIONS: ChoiceOption<FiveScaleCode>[] = [
  { value: 'a', label: 'a. 매우 좋은 영향을 미친다.', shortLabel: '매우 좋은 영향' },
  { value: 'b', label: 'b. 약간의 좋은 영향을 미친다.', shortLabel: '약간의 좋은 영향' },
  { value: 'c', label: 'c. 그저 그렇다.', shortLabel: '그저 그렇다' },
  { value: 'd', label: 'd. 별로 좋지 않은 영향을 미친다.', shortLabel: '별로 좋지 않음' },
  { value: 'e', label: 'e. 매우 좋지 않은 영향을 미친다.', shortLabel: '매우 좋지 않음' },
];

export const Q3_OPTIONS: ChoiceOption<FiveScaleCode>[] = [
  { value: 'a', label: 'a. 매우 필요하다.', shortLabel: '매우 필요' },
  { value: 'b', label: 'b. 약간 필요하다.', shortLabel: '약간 필요' },
  { value: 'c', label: 'c. 그저 그렇다.', shortLabel: '그저 그렇다' },
  { value: 'd', label: 'd. 별로 필요하지 않다.', shortLabel: '별로 불필요' },
  { value: 'e', label: 'e. 매우 필요하지 않다.', shortLabel: '매우 불필요' },
];

export const Q4_OPTIONS: ChoiceOption<OperationModeCode>[] = [
  {
    value: 'a',
    label: 'a. 교관 지도하에 정규 커리큐럼으로 운영',
    shortLabel: '교관 지도 정규 커리큘럼',
  },
  {
    value: 'b',
    label: 'b. 정기 커리큐럼에 FTD 훈련시간을 배정하고 학생들 자율적으로 훈련',
    shortLabel: '정기 배정 후 자율 훈련',
  },
  {
    value: 'c',
    label: 'c. 강의 이외의 시간을 활용하여 개인 의사에 따라 FTD 훈련할 수 있도록 일정한 훈련시간을 배정하고 운영',
    shortLabel: '강의 외 개인 자율 배정',
  },
];

export const QUESTION_TITLES = {
  q1: '1. 현재 귀하의 훈련 진행 위치는 어디인가요?',
  q2: '2. 실비행 입과전 FTD 비행 연습이 비행훈련에 어떠한 영향을 미칩니까?',
  q3: '3. 실비행 입과전 FTD 비행 연습의 필요성은 어떠십니까?',
  q4: '4. 만약 FTD 훈련이 필요하다고 생각한다면 어느 방식의 훈련이 필요하다고 생각하십니까?',
  q5: '5. 만약 FTD 훈련이 필요하다고 생각한다면 어떤 과목이나 어는 비행단계가 필요하다고 생각하는지 의견을 적어주세요.',
  q6: '6. 만약 FTD 훈련이 필요없다고 생각한다면 이유가 무엇인지 중요한 순서대로 몇가지 의견을 적어주세요.',
  q7: '7. 실 비행전 비행교육원 사전 지상교육중 개선 및 반영해야 할 사항이 있다면 자유롭게 의견을 기술해 주시기 바랍니다.',
} as const;

export function getOptionLabel<T extends string>(
  options: ChoiceOption<T>[],
  value: string,
): string {
  return options.find((opt) => opt.value === value)?.label ?? value;
}
