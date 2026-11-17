# AI 컨트롤 타워 v2 — 실행 계약 (Phase 1)

**Scope:** 4개 전문영역을 공통 작업 상태와 증거 기반 완료 판정으로 연결하기 위한 **독립적인 코드 계약**. 아직 실서비스 실행기에 연결되지 않았으며, 자동 배포·자동 주문·학생 데이터 읽기 기능이 없습니다. 이 폴더의 파일은 GitHub Pages 화면에 로드되지 않습니다.

## 현재 포함된 안전장치

- 고유 작업 ID / 영역: school, investment, personal, edujob.
- 상태: intake → planned → executing → verifying → completed. 별도 awaiting_approval, failed, blocked.
- 이메일·일정·파일·GitHub·배포·production 데이터·계정설정·거래 변경은 해당 **종류·범위**에 일치하는 사용자 승인과 만료시각 필요.
- 완료는 별도 검증자와 외부 증거 URL·확인시각 필요. 쓰기 변경은 L0 live authoritative 증거만 인정.
- 모델의 L3 추론·L4 제안, 과거 L2 스냅샷은 완료 증거가 아님.
- 실패 복구는 기본 재시도 2회까지만 허용. 무제한 자동 재실행 금지.
- publicStatus는 ID/영역/상태/시점만 반환하며 사용자 자료·자산수치·학생명렬은 배제.

## 중요한 제한

코드 자체는 승인 발언의 진위, 실제 외부 원문, URL 내용, 사용자의 신원을 검증할 수 없습니다. 호스트가 인증된 사용자 승인 이벤트만 전달하고, 실행자와 분리된 검증기가 live 소스를 독립 확인해야 합니다. 단순 JSON 위조로 '검증됨'을 입력하면 안 됩니다. 민감한 학생·금융정보, 토큰, 문서 본문, 실제 교사 계정 URL은 작업 원장이나 공개 저장소에 저장하지 않습니다.

## 영역별 다음 연결

1. 학교: MY TEACHER OS의 교사 전용 Apps Script↔15개 반 Google Sheets 원본 대조. 실제 교사 계정·owner-only·학생정보 비공개 검증 전 완료 금지.
2. 에듀잡: source registry 완전성 + 공식공고 원문 대조 + publication 최신성 분리. 기존 fail-closed/LKG 유지.
3. 투자: 토스증권만 계좌 사실원, Longbridge는 분석원. 실행 결과를 실제 매매로 추정하지 않음.
4. 개인: 정책·시세 공식 최신 원문과 주요 결정의 승인·비용 검증.

### 기술적 후속 단계
- private durable store (작업 ID, 상태, 승인, 증거 **메타데이터만**) 구축. 파일 복제 대신 원천 시스템 참조.
- 전용 도구 어댑터와 검증기 구현 및 중단/재개/만료/회귀 테스트.
- production 변경은 영역별 승인 범위, 자동 회귀테스트, 롤백 경로를 충족한 건만 수행.

추적 이슈: #111. 기존 main, Apps Script, 성적원본, jobs.json, 공개 페이지를 이 첫 PR에서 변경하지 않습니다.

테스트: `node --test control-tower-v2/tests/*.test.mjs`.
