스미싱 탐지 시스템의 기술적 접근 방법론

1. 규칙 기반 탐지(Rule-Based Detection)
   블랙리스트 URL, 정규표현식 패턴, 특정 키워드 필터를 활용한다.
   장점: 해석 용이, 빠른 처리 속도
   단점: 변형 공격(obfuscation)에 취약, 높은 오탐률(false positive)
   주요 규칙 예시:
   - 단축 URL 포함 여부(bit.ly, tinyurl, ow.ly 등)
   - 기관명 유사 도메인(예: "kgb-nts[.]kr", "국세청-환급[.]com")
   - 특수문자를 활용한 한글 우회("ㅏ" → "а" Cyrillic 대체 등)
   - [Web발신], [국외발신], [국제발신] 태그 + URL 조합
   - 비공식 TLD(.top, .xyz, .pw, .ink, .uno) 사용 여부

2. 머신러닝 기반 탐지(ML-Based Detection)
   TF-IDF, Word2Vec, FastText 등으로 벡터화 후 SVM, Random Forest,
   XGBoost 분류기를 사용한다. 특징(feature) 엔지니어링이 성능에 큰 영향을 미침.
   주요 피처:
   - 긴급성 어휘 빈도, 기관명 토큰, URL 포함 여부
   - 문자 길이, 특수기호 비율, 숫자 비율
   - 법령 번호 패턴, 계좌번호 패턴

3. 딥러닝 기반 탐지(DL-Based Detection)
   BERT, RoBERTa, KoBERT, KcELECTRA 등 사전학습 언어모델을 파인튜닝하여
   문맥(context)을 활용한 탐지를 수행한다.
   최신 연구(2024)에서 KoBERT fine-tuning 기반 분류기는
   F1-score 0.97 이상을 달성하였으나, 도메인 변이에 대한
   일반화 성능은 지속적인 모니터링이 필요하다.
   KcELECTRA는 한국어 특화 사전학습으로 한국어 스미싱 탐지에 적합하다.

4. 대조 학습(Contrastive Learning) 및 Few-shot 탐지
   레이블 데이터가 부족한 신종 스미싱 변종 탐지에 유리하다.
   정상 문자 vs. 스미싱 문자의 임베딩 공간 분리를 극대화한다.

5. RAG(Retrieval-Augmented Generation) 기반 설명 가능한 탐지
   스미싱 판단 근거를 자연어로 제공하는 설명 가능 AI(XAI) 접근.
   탐지 결과와 함께 "이 메시지에서 발견된 사회공학적 패턴: 긴급성 편향,
   권위 기관 사칭"과 같은 설명을 생성한다.

6. 패턴 기반 피처 추출(Pattern-Based Feature Extraction)
   탐지 모델의 전처리 단계에서 다음 패턴을 피처로 추출한다:
   - URL 패턴: 정상 도메인, 단축 URL, 변형 도메인 분류
   - 전화번호 패턴: 080/010/070 구분, 국제번호 여부
   - 금액 패턴: <MONEY> 토큰화, 소액/고액 분류
   - 기관명 패턴: 국세청, 건강보험공단, 경찰청, 검찰청 등 화이트리스트 비교
   - 긴급성 키워드: "즉시", "미확인 시", "정지", "차단", "소멸" 등

7. 임계값 최적화(Threshold Optimization)
   이진 분류에서 임계값(threshold)을 고정하지 않고 도메인별·시기별로
   동적 조정한다. 기본 임계값 0.7은 오탐(false positive)과 미탐(false negative)
   균형점이며, 민감 도메인(금융, 수사기관 사칭)에서는 0.5로 낮춰 적용한다.

8. 앙상블 접근(Ensemble Approach)
   규칙 기반 + ML 기반 + DL 기반을 결합하여 각 방법론의 약점을 보완한다.
   규칙 기반으로 명확한 스미싱을 먼저 필터링하고, DL 모델로 경계선 사례를 판단한다.
