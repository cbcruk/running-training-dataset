# TODO / 로드맵

골격은 구조적으로 완성됐다: **8개 `intensity_model` 앵커**와 **9개 워크아웃 계열**이 모두
채워져 있다. 모든 행이 `status: draft`이며 사람이 검증한 것은 없다. 행 수와 등급 총계는
`vp run verify`가 생성하는 [`docs/counts.md`](counts.md)에 있다.

이 문서는 그것을 단단하게 만드는 작업 목록이다. 의도적으로 구체적이다: 각 항목이 정확한
행을 지목하고, 할 값이 _없는_ 경로도 그렇게 표시한다.

아래에서 숫자가 **Net:** 줄 안에 나오면 그건 역사적 변화량이다 — 하나의 결정이 무엇을
움직였는지를 그 시점에 고정한 값이다. 현재 상태는 언제나 `counts.md`다.

---

## 1. 검증: `draft` → `verified`

`validate.ts`는 생성기가 `status: verified`를 쓰는 것을 금지한다(L4 사람 서명 게이트).
그래서 이건 **설계상 사람의 일**이다 — 이 절은 사람이 훑어 가는 체크리스트이지 스크립트가
닫을 수 있는 것이 아니다.

### 1a. 인용 정규화 (선행, 기계적) — **완료**

같은 참조가 서로 다른 형태로 나타났고, 그중 하나는 틀렸다. 다른 무엇을 검증하기 전에
고쳐야 했다. 검증자는 각 소스를 한 번 확인해야지 같은 것의 세 가지 표기를 확인해서는 안
되기 때문이다.

`systems.json`과 `workouts.json`의 모든 `cite`를 감사해 아래 세 건의 불일치를 정확히
찾았고 그 외에는 없었다. 전부 정규화됐으며 `validate.ts`가 정책을 강제하므로 다시 갈라질
수 없다.

- [x] **정책: 하나의 참조, 하나의 문자열 — 어디서나 전체 형태.** `test.evidence.cite`의
      축약형은 **허용되지 않는다.** 이유는 §1b의 목적에 있다: 사람이 각 소스를 한 번
      확인하는 방식은 소스가 모든 행에서 같게 읽힐 때만 성립한다. 두 표기는 두 소스로
      보이고 하나로 grep되지 않는다.
- [x] **기계 강제.** `validate.ts`가 모든 cite를 제1저자 + 연도로 묶고, 한 묶음에 서로
      다른 문자열이 둘 이상이면 변형을 출력하며 실패한다. 일부러 변형을 다시 넣어
      확인했다.
- [x] **Billat, 세 가지 형태 / 틀린 이니셜.** 이니셜을 **`LV`**(Véronique L. Billat)로
      바로잡고 두 개의 부분 제목을 하나의 정규 문자열로 합쳐, 네 곳 전부에서 쓴다
      (`vo2max-intervals`, 그리고 `vo2max-30-30`의 claim과 test):
      `Billat LV (2001). Interval training for performance: a scientific and empirical practice. Part I: aerobic interval training. Sports Med 31(1).`
- [x] **Egan & Zierath (2013).** `long-run`의 test에 있던 축약형을 claim이 이미 쓰던 전체
      참조로 확장.
- [x] **McHugh (2003).** `downhill-repeats`에서 같은 처리.

_문자열_ 을 정규화한 것이 소스가 주장을 뒷받침하는지에 대해서는 아무 말도 하지 않는다는
점에 유의할 것 — 그건 아래 §1b이고 여전히 열려 있다. 특히 Billat 2001은 30/30 프로토콜에
대해 따로 확인이 필요하다.

이 수정의 더 강한 버전은 인용을 id로 키를 잡은 참조 파일로 빼내
(`anchors.json`과 `adaptations.json`이 이미 쓰는 패턴) 행이 문자열을 반복하는 대신 참조를
가리키게 하는 것이다. 같은 소스가 여러 행에 나타날 만큼 코퍼스가 커지면 할 값이 있다.
현재 규모는 검증기 가드로 충분하다.

### 1b. 소스가 뒷받침하는지 확인

검증기는 `cite`가 인용처럼 _생겼는지_ (연도가 있는지)와 참조가 어디서나 같게 읽히는지
(§1a)를 검사한다. 소스가 _그 행이 주장하는 것을 말하는지_ 는 검사할 수 없다. 그것이 검증
패스의 요점이고 **설계상 사람의 일**이다 — `validate.ts`가 생성기의 `status: verified`를
금지하는 이유는, 소스가 주장을 뒷받침한다고 기계가 단언하는 것이 이 데이터셋이 피하려는
바로 그 실패이기 때문이다.

**체크리스트는 [`docs/verification.md`](verification.md)**이고, `vp run verify`가 데이터에서
생성하므로 서술하는 행과 어긋날 수 없다. 각 소스를 그것에 달린 모든 주장에 매핑하고 확인할
문장을 그대로 인용해서, 검증자가 소스 하나를 읽고 그것의 모든 행을 한 번에 정리할 수 있게
한다.

작업지는 소스를 **열지 않고** 답할 수 있는 질문 셋으로 시작한다. 등급을 가장 많이 움직일
질문이기 때문이다.

**질문 1은 해결됐다.** 반증 가능한 문장에 한 번도 붙지 않은 소스에 관한 것이었다 — 당시
13개 중 5개. 결정과 그 결과:

- **리뷰 논문에는 대조할 명제를 준다.** `polarized-80-20`(Seiler), `critical-speed`(Jones &
  Vanhatalo), `hrr-karvonen`(Karvonen)이 이제 그 소스가 무엇을 보였어야 하는지를 진술하는
  `claim.proposition`을 싣는다. 그 명제들은 **확인받기 위해 쓰인 것이지 확인된 것이
  아니다** — 등급은 그대로이고 행은 여전히 `draft`다.
- **정경 텍스트는 `tradition`으로 내려가고, 그러면 cite가 제거된다.** 방법이 자기를
  서술하는 것은 그것이 작동한다는 근거가 아니다. `lydiard`와 `pfitzinger`에 적용했고 —
  그리고 **`daniels`** 에도. 작업지의 트리아지는 _소스_ 로 묶기 때문에 이걸 놓쳤다: Daniels
  책은 다른 곳에서 워크아웃 명제에 붙어 있어 미부착으로 보이지 않았지만, `daniels` 훈련법
  행은 같은 결함을 갖고 있었다. 같은 사례, 같은 처방.
- **같은 규칙을 distribution 층에도 적용했고**, 이건 트리아지가 다루지 않던 부분이다.
  `daniels`, `pfitzinger`, `critical-speed`의 distribution이 `tradition`으로 내려갔다.
  `critical-speed.distribution`의 Jones 인용은 그냥 잘못 붙어 있었다 — 그 리뷰는 CS/W′
  모델에 관한 것이지 피라미드형 세션 분포에 관한 것이 아니고, 그 모델 주장은 이제 훈련법의
  `claim`에 산다. `polarized-80-20.distribution`은 Seiler를 유지한다. 인용과 필드가 실제로
  맞는 유일한 distribution이고, 명시적 `zones`를 가진 유일한 것이기도 하다.

Net: **plausible 23 → 17, tradition 48 → 54**, 그리고 미부착 소스는 남지 않았다.

**되돌아오지 못하게 기계로 강제했다.** `system.schema.json`에 `claim` 객체가 생겼고,
`validate.ts`는 루트 근거가 `tradition` 이상을 주장하면서 `claim.proposition`이 없는 훈련법을
실패시킨다 — 무엇의 근거인지 아무것도 없는 근거는 확인도 반증도 될 수 없다. 명제를 지워보고
실패하는 것을 확인했다.

**질문 2와 3도 해결됐고**, 데이터를 실제로 세어보니 둘 다 예상보다 멀리 갔다.

**질문 2는 `consensus` 행에 관한 것이었다.** 결함은 최상위 등급이 작업지 자신의 절차 밖에
있다는 점이었다. 이 파일이 묻는 질문은 _이 소스가 그렇게 말하는가_ 인데, `consensus`는
**분야가 동의한다**를 주장하고 그건 어떤 단일 소스도 진술하지 않는다. Convertino를 읽어서
확립할 수 있는 최대치는 Convertino가 하는 말이다. 그래서 바를 확인 가능하게 다시 썼다 —
**독립 참조 두 개 이상, 그중 하나는 그 동의를 보고하는 리뷰나 교과서** — 그리고 그 두 번째
다리는 논문을 열어야만 정리되므로 사람 서명 게이트를 물려받는다: `tier: consensus`는 이제
`status: verified`를 요구한다.

- **`consensus`가 비었다, 3 → 0.** 바를 엄격히 적용하면 손에 있는 것으로 살아남는 행이
  없다. `easy-run.claim`은 독립 리뷰 둘을 갖지만, 그것들이 _동의를 보고한다_ 는 것이야말로
  아래 Faude에서 방금 실패한 그 추론이다. 그것과 `threshold-continuous.claim` 모두 누군가
  읽을 때까지 `plausible`이다.
- **`test`는 `consensus`에 아예 닫혔다.** test는 현장 관측 휴리스틱이고 데이터셋 스스로
  그렇게 말한다: `confounds`는 최소 하나를 요구하고, 가장 나쁜 종류는 관찰로 분리
  불가능하다. `easy-run.test`는 정확히 그런 교란 _과_ 최상위 등급을 함께 달고 있었다.
- **Faude의 인용이 의미가 바뀌는 지점을 넘어 잘려 있었다.** "Lactate threshold concepts."
  라고 적혀 있었는데, 그 논문의 제목은 "Lactate threshold concepts: **how valid are
  they?**" — 그 개념들이 얼마나 서로 맞지 않는지를 다루는 리뷰가 동의의 근거로 인용되고
  있었다. 수정했다. §1a의 규칙은 한 참조가 두 가지로 쓰인 것을 잡지만, 한 가지로 잘못 쓰인
  것은 잡지 못한다.

**질문 3은 `tradition`을 넘는 관찰 불가능한 test에 관한 것이었다.** 답이 질문보다 컸다:
**데이터의 인용을 가진 test 전부가 자기 claim의 참조를 글자 그대로 재사용하고 있었다 —
관찰 가능한 것까지 포함해 여덟 개 전부.** `test.evidence` 슬롯은 자기 소스를 가진 적이 한
번도 없었고, 그래서 그 등급은 claim의 등급을 두 번 센 것이었으며 모든 총계가 그만큼
부풀어 있었다.

- **test의 cite는 claim의 것과 서로소여야 한다.** 단순한 비포함이 아니다 — 중복 계상이라는
  반론은 참조 하나하나에 걸리므로, claim이 `[A]`를 인용할 때 test가 `[A, B]`를 인용해도
  여전히 `A`가 두 번 세어진다. 여덟 개 전부 `tradition`으로 내려갔다. test가 인용해도 되는
  것은 **측정**에 관한 소스이고, 그건 구조적으로 서로소다.

**자기 서술은 이제 소스 단위가 아니라 명제 단위로 판정한다.** 질문 1이 훈련법 층에서 정경
텍스트를 `tradition`으로 내렸지만, 등급표가 `consensus`를 "교과서"라고 부르고 있었던 탓에
같은 Daniels 책이 `daniels` 행에서는 자격을 잃고 `threshold-continuous`에서는 최상위 등급을
떠받치고 있었다. 판별 기준: **저자의 방법을 채택하지 않고 그 명제를 물을 수 있는가?** 젖산
정상상태는 Daniels의 개념이 아니므로 `threshold-continuous.claim`은 인용을 유지한다.
`cruise-intervals`와 `rep-intervals`는 권장되는 구조 자체를 전제하므로 `tradition`으로
내려갔고 책은 그들의 `source`가 됐다.

전체 Net: **consensus 3 → 0, plausible 17 → 10, tradition 62 → 72**. 인용을 가진 주장이
정확히 반이 됐다. 살아 있는 수치는 생성물인 [`docs/counts.md`](counts.md)에 있다 — 이
파일과 README의 손으로 쓴 총계는 이미 한 번 낡았었다.

그리고 어떤 스크립트도 대신할 수 없는 읽기 자체:

- [ ] 작업지를 소스 단위로 훑으며, 확인되는 행마다 체크한다.
- [ ] 늘이지 말고 내린다: 소스가 실제로 뒷받침하지 않는 `plausible`/`consensus` 행은
      `tradition`으로 내려야 하고, 그건 cite를 **제거**한다는 뜻이다.
- [ ] 읽은 결과는 [`data/verified.json`](../data/verified.json)에 적는다 — 누가·언제·무엇을
      확인했는지. 뒷받침하지 **않았다는** 기록도 결과이며, 그때는 인용을 데이터에서
      빼야 한다([ADR 0008](adr/0008-verification-ledger.md)).
- [ ] 한 행의 모든 인용이 원장에 확인 기록을 가진 뒤에만 그 행의 `status`가 `verified`로
      바뀔 수 있다. 행 단위로, 절대 일괄로 하지 않는다.
- [ ] **Daniels 볼륨 상한**(`daniels.volume_caps`)은 `tradition` + "기억에서"로 표시돼
      있다(README도 이미 명시). 승격 전에 T/I/R 상한 수치를 원문과 대조할 것.

**이것이 드러낸 긴장은 해결됐다.** 등급표가 방법이 _작동한다_ 는 근거와 방법이 _무엇인지_ 의
근거를 뒤섞고 있었다. `tradition`은 cite를 금지하므로, 정경 텍스트를 내리면 그 훈련법들이
무엇을 처방하는지의 기록이 인용 없이 남았다. `system.schema.json`에 효능의 `evidence`와
분리된 출처용 **`source`** 필드가 생겼다. `daniels`, `lydiard`, `pfitzinger`가 자기 책을
거기 싣는다 — 제거됐던 그 문자열 그대로이고 지어낸 것은 없다. `validate.ts`는 `source`를
`cite`와 같은 인용 기준으로 검사하고, 하나의 참조 하나의 문자열 규칙에 포함시키며, 한
저작을 둘 다로 올린 행을 거부한다.

- [ ] 나머지 열한 훈련법에는 `source`가 없다. 하나를 추가한다는 건 실제 텍스트를 손에 쥔다는
      뜻이다. 기억으로 채우지 말 것. 그중 무엇이 텍스트를 _기다리는_ 것이고 무엇이 영영
      가질 수 없는 것인지는 이제 행마다 기록돼 있다 — 1d 참조.

### 1d. 어느 행에 출처가 없는지, 그리고 왜인지 말하기

**필드는 추가됐고 채우는 일은 아직 열려 있다.** 위의 공백은 정작 중요한 자리에서 보이지
않았다. `source`는 있으면 렌더되고 없으면 아무 말도 하지 않으므로, 문서화된 세 훈련법과
그렇지 않은 열한 훈련법이 브라우징 중에 똑같아 보였다 — 독자가 무엇을 얼마나 믿을지 정하는
바로 그 순간에. 더 나쁜 건 하나의 빈칸이 서로 다른 두 사실을 덮고 있었다는 점이다: 아직
아무도 기록하지 않은 텍스트와, 인용할 텍스트가 아예 없는 훈련법.

`system.schema.json`에 필수 **`provenance`** enum이 생겼다 — `recorded` / `unrecorded` /
`uncitable` — 그리고 `validate.ts`에서 `source`와 묶였다(`recorded`는 반드시 source를
내놓아야 하고, 나머지 둘은 가져서는 안 된다). 그래서 라벨이 행에서 벗어날 수 없다. 카드와
상세 페이지 양쪽에서 tier 옆에 배지로 렌더되고, source 블록은 비어 있어도 페이지에 남아서
어떤 종류의 빈칸인지 말한다.

**워크아웃도 이제 같은 쌍을 갖는다.** 워크아웃 행에서 Daniels 인용 다섯 개를 떼어내는 일이
그 워크아웃들을 누가 정의했는지의 기록까지 지울 뻔했다 — `attribution`은 텍스트가 아니라
_이름_ 을 담는다. `cruise-intervals`와 `rep-intervals`는 책을 `source`로 삼아 `recorded`가
됐다. 워크아웃에서 라벨은 부분적으로 유도 가능하므로 검사된다: `attribution: null`은 아무도
정식화하지 않았다는 뜻이라 권위 있는 텍스트가 존재할 수 없고 `validate.ts`가 `uncitable`을
요구한다. 그런 행을 `unrecorded`로 표시하면 영원히 채울 수 없는 일이 이 목록에 올라간다.

현재 상태: [`docs/counts.md`](counts.md) 참조.

- [ ] `unrecorded` — 규정 텍스트는 존재하지만 여기 기록되지 않았다: `hansons`,
      `polarized-80-20`, `maf`, `bakken-doubles`, `critical-speed`, `hrr-karvonen`,
      `canova`, `galloway`, `first-furman`. 하나가 `recorded`로 옮겨질 때마다 그 행의
      서술을 무언가와 대조할 수 있게 된다. `polarized-80-20`, `critical-speed`,
      `hrr-karvonen`에서 혼동의 함정을 주의할 것: 방법을 _정의하는_ 논문이 이미 `cite`로
      쓰인 논문과 같은 경우가 많고, `validate.ts`는 한 저작을 둘 다로 올린 행을 거부한다.
      그것들은 별개의 서술 텍스트가 필요하며, 없으면 `unrecorded`로 남는다.
- [x] `uncitable` — `norwegian-singles`(아마추어 커뮤니티에서 형식화됐고 권위 있는 텍스트
      없음)와 `moderate-primary`(저자·연도 없는 코칭 에세이에서 옮김). 할 일이 없다. 이건
      대기 중이 아니라 진술된 상태다.

### 1c. 비목표 가드 (하지 **말** 것)

README에 따라, 검증은 다음으로 흘러가서는 안 된다: `expected_improvement` 추가, VDOT 표
스크래핑(필요하면 Daniels & Gilbert 1979에서 다시 유도), 사용자 결과 수집, CS/D′ 예측 엔진
구축.

---

## 2. `switching_cost` 대칭성

**원래 3개에 대해 완료.** 행렬은 한 방향이었다(새 9개 훈련법이 원래 3개를 가리켰지만 반대는
없었다). 아래 여덟 개의 값 높은 인바운드 항목이 추가되어, 원래 3개가 균형 잡힌 집합을
갖게 됐다: `daniels`(5), `hansons`(3), `polarized-80-20`(4).

`anchor_change`는 `<from>.intensity_model -> <this>.intensity_model`로 기계 검증되므로 각
항목에는 정확히 하나의 올바른 문자열이 있다:

- [x] `daniels` <- `pfitzinger` → `pct_hrmax -> daniels-vdot` (silent: 역치는 살아남고 앵커가 HR→페이스로 뒤집힘)
- [x] `daniels` <- `norwegian-singles` → `lactate_mmol -> daniels-vdot` (silent: 역치는 살아남고 목표가 올라감)
- [x] `daniels` <- `critical-speed` → `pct_cs -> daniels-vdot`
- [x] `hansons` <- `canova` → `race_pace_ref -> race_pace_ref` (같은 앵커, 비용은 구조적)
- [x] `hansons` <- `pfitzinger` → `pct_hrmax -> race_pace_ref` (silent: "tempo"가 역치→마라톤 페이스로 뒤집힘)
- [x] `polarized-80-20` <- `norwegian-singles` → `lactate_mmol -> pct_vo2max` (Z2 충돌, 반대편에서 본 것)
- [x] `polarized-80-20` <- `maf` → `pct_hrmax -> pct_vo2max`
- [x] `polarized-80-20` <- `lydiard` → `rpe_10 -> pct_vo2max`

**완료 — 새 훈련법들 사이의 교차 연결.** 사실에 부합하는 새-대-새 이주 경로 여섯 개를
추가해, 12개 훈련법 모두가 최소 2개의 인바운드 항목을 갖게 됐다:

- [x] `pfitzinger` <- `maf` → `pct_hrmax -> pct_hrmax` (loud: 금지했던 강도를 다시 들임)
- [x] `canova` <- `pfitzinger` → `pct_hrmax -> race_pace_ref` (silent: 앵커가 목표 페이스라는 희망으로 미끄러짐)
- [x] `norwegian-singles` <- `lydiard` → `rpe_10 -> lactate_mmol` (loud: 느낌 → 측정된 젖산)
- [x] `critical-speed` <- `hrr-karvonen` → `pct_hrr -> pct_cs` (loud: HR 예비량 → 페이스 경계)
- [x] `maf` <- `hrr-karvonen` → `pct_hrr -> pct_hrmax` (silent: HR 언어는 살아남고 천장이 내려감)
- [x] `first-furman` <- `pfitzinger` → `pct_hrmax -> race_pace_ref` (loud: 볼륨 역전)

의도적으로 전수가 아니다(12×12 = 132 전부는 노이즈가 된다). `lydiard`, `hrr-karvonen`,
`galloway`는 인바운드 2개로 두었다. 이주 _목적지_ 로는 드물기 때문이다. 실제 사람이 정말로
갈아탈 곳에만 더한다.

앞으로 추가할 항목에 대한 지침: `silent` 플래그와 `note`가 필요하고, `silent: true`는
**용어가 전환에서 살아남으면서 그 뜻이 바뀔 때**(위험한 경우)만 설정한다. 단순히 앵커가
다르다는 이유로는 안 된다.

---

## 3. 얕은 필드의 깊이

소스가 실제로 값을 명시하는 곳에만 채운다. 필드가 꽉 차 보이게 하려고 숫자를 지어내는 것이
등급 체계가 막으려는 바로 그 실패다.

### 3a. `volume_caps` — `daniels`와 `hansons`

대부분의 훈련법은 세션당 볼륨 상한을 진술하지 않고, 빈 필드가 정직하다. 문서화된 것만 추가할
것:

- [x] **`hansons`**: **16마일(~26km) 롱런 상한**을 `volume_cap`으로 형식화했다 —
      `zone: long-run`, `max_km: 26`, `max_pct_weekly: 30`(둘 중 작은 쪽이 규칙),
      `tier: tradition`이며 그 방법의 책에 문서화되어 있으나 상한 없는 롱런보다 우월하다는
      것은 검증되지 않았다는 note를 달았다. 더 이상 산문/용례에만 있지 않다.
- [ ] **`pfitzinger`**: 소스가 LT 런 지속 시간 한도를 진술하면 추가하고, 아니면 비워 둔다.

### 3b. `distribution.zones` — 현재 `polarized-80-20`에만

여덟 훈련법이 `distribution.model`은 갖지만 명시적 `zones` 분해는 없다.

- [ ] 인용된 소스가 세션 백분율을 주는 곳에만 `zones` 배열을 추가한다. `tradition` 등급
      distribution에는 백분율을 **지어내지 말고** `model`을 그대로 둔다.
- [ ] `norwegian-singles`(피라미드형, 역치 위주)가 소스가 그 분할을 뒷받침한다면 가장
      유력한 후보다.

### 3c. 빠진 `distribution` — `maf`, `hrr-karvonen`, `first-furman`

- [ ] 의도적으로 뺐다(처방 방법에는 내재적 세션 분포가 없다). 방어 가능한 `model` +
      `evidence`를 추가하거나, 왜 계속 빠져 있는지를 여기에 한 줄로 기록한다. 실제로 참이
      아닌 한 필드를 채우려고 `unstructured`를 넣지 말 것.

---

## 4. 사전 형태 완성

[ADR 0001](adr/0001-dictionary-shape.md)은 이것이 사전이라고 정한다: **발견**(검색엔진이나
공유 링크로 도착)을 위한 프리렌더 엔트리를, **사용**(찾아보기, 상호 참조, 비교)을 위한
클라이언트 인덱스로 감싼 것. **두 모드가 모두 제공되므로 이 절은 완료다.**

- [x] **진짜 URL (프리렌더 + History API 라우팅).** 완료. 라우팅이 해시에서 History API로
      옮겨갔고, `scripts/prerender.tsx`가 엔트리마다 HTML 파일 하나씩을 `dist/`에 쓴다.
      각자의 title, description, canonical URL, OG 태그, 그리고 마크업 안의 엔트리 내용까지.
      마크업은 `src/components/`에서 온다 — 브라우저가 렌더하는 것과 같은 컴포넌트라서
      프리렌더 출력과 클라이언트 렌더 출력이 갈라질 수 없다(`svg.ts`가 차트에 이미 쓰는
      배치). CI가 라우트 수를 데이터와 대조하므로 조용한 회귀는 나갈 수 없다.
- [x] **키보드 우선 검색.** 완료. `/`(또는 `s`)가 검색창에 포커스하고, `↑`/`↓`가 결과를
      훑고, `Enter`가 강조된 것을 열고, `Esc`가 지운 뒤 포커스를 뗀다. 단축키는 검색창 아래
      인쇄되어 발견 가능하다.
- [x] **서비스 워커를 통한 오프라인.** 완료. `public/sw.js`가 셸과 콘텐츠 해시 자산을
      캐시한다. 내비게이션은 network-first(온라인이면 새 프리렌더 엔트리가 이긴다), 자산은
      cache-first. 전체 코퍼스가 번들에 실리므로 **한 번도 방문하지 않은** 엔트리도 셸
      폴백을 통해 오프라인에서 렌더된다 — 코퍼스 상주 결정의 보상이다.
- [x] **최근 본 항목.** 완료. `localStorage`에 보관하고 8개로 제한하며 최신순, 홈 라우트에만
      보인다. 렌더 후 브라우저 셸이 주입하고 절대 프리렌더되지 않는다: 디스크의 파일은
      모두에게 같게 읽혀야 한다.

이 목록에 **없는** 것에 주목할 것: 라우트별로 데이터를 쪼개 번들을 줄이는 일. 전체 코퍼스를
클라이언트에 들고 있는 것이 충돌 검색을 가능하게 하는 것이며, 비용이 아니라 기능이다.
그리고 위의 어떤 것에도 프레임워크를 도입하지 말 것 — ADR의 "하지 말 것" 목록 참조.

---

## 5. 한국어 통칭 (`system: null` 용례 행)

[ADR 0006](adr/0006-korean-only-dataset.md)이 데이터셋을 한국어 전용으로 만들면서 구멍
하나를 **드러냈다.** 만든 것이 아니다. 네이밍 조인은 이 프로젝트의 헤드라인 기능인데
`calls_it`이 전부 영어다. 한국어 사용자가 "템포"로 검색하면 아무것도 나오지 않고, 충돌
표는 `Tempo run` 대 `Tempo run`으로 보인다.

- [ ] `system: null` 용례 행으로 한국어 통칭을 수집한다. 스키마에 슬롯이 이미 있다 — "어느
      훈련법에도 속하지 않는 통칭"이 그 필드의 정의다.
- [ ] `calls_it`에 한국어를 **직접 넣지 말 것.** 그 필드는 "이 훈련법이 이렇게 부른다"는
      주장이고, Daniels는 자기 세션을 템포런이라고 부르지 않는다.
- [ ] `usage`에 `ko` 필드를 새로 파지 말 것. ADR 0006이 방금 지운 축을 다른 이름으로
      되살리는 일이다.
- [ ] 지어내지 말 것. §1b가 출처 없는 주장을 금지하는 것과 같은 이유로, 실제 용례를 근거로
      채운다.

---

## 재추출

`vp run verify`가 [`verification.md`](verification.md)(모든 소스와 거기 달린 주장)와
[`counts.md`](counts.md)(등급, 출처, 반증 가능성)를 `data/*.json`에서 곧바로 다시 만든다.
등급이나 인용이 바뀌면 실행할 것. 두 파일 모두 커밋되므로 CI가 낡은 사본을 잡는다.

여기 두 목록은 아직 손으로 추출한 것이고 행동하기 전에 다시 유도할 값이 있다: 인바운드
`switching_cost` 행렬(§2)과 `volume_caps` / `distribution` / `zones`가 없는 행(§3). 둘 다
아직 생성되지 않는다.
