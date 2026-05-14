import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Link2Off,
  MessageSquareText,
  PhoneCall,
  ShieldCheck,
  Users,
} from "lucide-react";

const features = [
  {
    title: "문자 위험도 검사",
    description: "긴급 표현, 링크 유도, 송금 요청, 개인정보 입력 요구를 함께 확인합니다.",
    icon: ClipboardCheck,
  },
  {
    title: "가족 확인 문구",
    description: "혼자 판단하기 어려울 때 가족이나 보호자에게 보낼 문구를 준비합니다.",
    icon: Users,
  },
  {
    title: "위험 요인별 점수",
    description: "링크 유도, 긴급성, 금전 요구, 개인정보 요구를 나누어 보여줍니다.",
    icon: BarChart3,
  },
  {
    title: "쉬운 대응 안내",
    description: "링크, 송금, 개인정보 입력을 멈추고 공식 앱·공식 홈페이지·대표 고객센터 확인을 안내합니다.",
    icon: Link2Off,
  },
];

const steps = [
  {
    title: "문자 입력",
    description: "의심되는 문자 내용을 붙여넣거나 예시 문자를 선택합니다.",
  },
  {
    title: "위험 가능성 확인",
    description: "AI가 문자 내용을 분석하고 스미싱 위험 가능성, 점수, 의심 요인을 판별합니다.",
  },
  {
    title: "결과 안내",
    description: "점수와 근거를 보고 가족 확인 문구와 AI 상세 설명을 함께 확인합니다.",
  },
];

export function SiteSections() {
  return (
    <>
      <section className="bg-white" id="why">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8">
          <div>
            <p className="text-sm font-black text-blue-700">The story behind it</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">왜 만들었나요?</h2>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
            <p className="text-lg leading-9 text-slate-700">
              스미싱 문자는 대부분 “지금 바로 눌러야 한다”는 불안감을 이용합니다.
              특히 가족 사칭, 택배 반송, 기관 안내처럼 익숙한 상황으로 위장하면 누구나 헷갈릴 수 있습니다.
            </p>
            <p className="mt-4 text-lg leading-9 text-slate-700">
              문자안심 체크는 사용자가 혼자 판단하지 않도록 위험 가능성과 확인해야 할 행동을
              쉬운 한국어로 정리해 주는 참고용 보안 보조 도구입니다.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#f5f7fb]" id="features">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-black text-blue-700">Why 문자안심 체크?</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">검사, 확인, 대응까지 한 흐름으로</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              기술 설명보다 사용자가 지금 무엇을 멈추고 누구에게 확인해야 하는지에 집중합니다.
            </p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article className="rounded-lg border border-slate-200 bg-white p-5" key={feature.title}>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-black text-slate-950">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white" id="how-it-works">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-black text-blue-700">How it works</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">3단계로 확인합니다</h2>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <article className="rounded-lg border border-slate-200 bg-white p-5" key={step.title}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 text-base font-black text-white">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-xl font-black text-slate-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-lg border border-blue-100 bg-blue-50 p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-black text-blue-800">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  Ready to check a message?
                </div>
                <h3 className="text-2xl font-black text-blue-950">의심 문자가 있다면 지금 확인해보세요.</h3>
                <p className="mt-3 text-sm leading-6 text-blue-900">
                  AI 판단 결과는 완벽하지 않을 수 있습니다. 조금이라도 의심되면 공식 앱, 공식 홈페이지, 대표 고객센터 번호로 직접 확인하세요.
                </p>
              </div>
              <a
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-base font-black text-white transition hover:bg-blue-800"
                href="#analyzer"
              >
                <MessageSquareText className="h-5 w-5" aria-hidden="true" />
                문자 검사하기
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            입력한 문자는 저장하지 않는 것을 기본 원칙으로 합니다.
          </div>
          <div className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-blue-700" aria-hidden="true" />
            의심되면 공식 앱, 공식 홈페이지, 대표 고객센터 번호로 확인하세요.
          </div>
        </div>
      </section>
    </>
  );
}

