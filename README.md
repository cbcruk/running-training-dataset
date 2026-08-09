# Running Training Dataset

[![CI](https://github.com/cbcruk/running-training-dataset/actions/workflows/ci.yml/badge.svg)](https://github.com/cbcruk/running-training-dataset/actions/workflows/ci.yml)
[![Pages](https://github.com/cbcruk/running-training-dataset/actions/workflows/pages.yml/badge.svg)](https://github.com/cbcruk/running-training-dataset/actions/workflows/pages.yml)

러닝 **훈련법**의 브라우징 카탈로그 — 각 훈련법이 무엇에 베팅하는지, 실행 비용은 얼마인지, 갈아탈 때 무슨 일이 벌어지는지, 그리고 실제로 알려진 것은 어디까지인지.

**라이브: [cbcruk.github.io/running-training-dataset](https://cbcruk.github.io/running-training-dataset/)**

여러 방법을 시도해 보는 사람을 위한 것. 훑기는 가볍게, 속은 정직하게.

[exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)의 형태를 참고했지만 원자가 다르므로 스키마도 다르다.

**언어: 한국어 전용.** 산문은 한국어이고, 영어는 *번역이 아니라 데이터*인 곳에만 남는다 — 통칭(`calls_it`), 정규 명칭, 귀속, 인용. 근거는 [ADR 0006](docs/adr/0006-korean-only-dataset.md), [ADR 0007](docs/adr/0007-korean-repo-prose.md).

**상태: 초기.** 모든 행이 `status: draft`이며 사람이 검증한 인용은 하나도 없다. 여덟 개 `intensity_model` 앵커 전부가 최소 한 훈련법에서 쓰이고, 아홉 개 워크아웃 계열이 모두 채워져 있다. 행 수와 등급 분포는 [`docs/counts.md`](docs/counts.md)에 생성된다.

---

## 훈련법이 입구, 워크아웃이 디테일 뷰

아무도 `threshold-continuous`를 시도하지 않는다. 사람들은 **Hansons**를 시도한다. 브라우징 단위는 훈련법이고, 워크아웃은 조연이다.

각 훈련법 행은 **`bet`**으로 시작한다 — 한 문장, 남들과 다르게 무엇에 걸고 있는지:

| 훈련법            | bet                                                 |
| ----------------- | --------------------------------------------------- |
| `daniels`         | 노력보다 정확한 강도가 중요하다.                    |
| `hansons`         | 롱런을 제한하고 대신 한 주 전체를 피로한 채로 둔다. |
| `polarized-80-20` | 중간 강도는 낭비다.                                 |

한 문장, 클릭 가능하고, 정직하게 — 내기는 사실 주장이 아니기 때문이다. 강제된다: 90자를 넘거나 한 문장을 넘으면 검증 오류. 문단이 필요하다면 그건 `philosophy`이고, 그 필드가 따로 있다.

**`commitment`**은 방법을 고르는 사람의 첫 필터다. 애초에 이걸 실행할 수 있는가? Hansons는 주 6일에 ~60km이고 타협이 없다 — 누적 피로가 전제이기 때문이다. 80/20은 주 5세션 이상이어야 비율이 의미를 갖는다(3세션이면 2.4 대 0.6이라는 표현 불가능한 수가 된다). 이 제약을 명시하는 곳은 거의 없다.

**`switching_cost`**은 정확히 이 페르소나를 위해 존재하고 다른 어디에도 없다. 훈련법을 바꾸면 강도 앵커가 조용히 바뀐다:

- daniels → hansons: `daniels-vdot -> race_pace_ref`, **silent**. "tempo"라는 말은 살아남는데 그 뜻이 역치에서 마라톤 페이스로 뒤집힌다. 더 나쁜 건 앵커가 _측정된 피트니스_ 에서 _희망_ 으로 옮겨간다는 점이다.
- daniels → polarized: Daniels의 T 세션은 polarized가 비우라고 말하는 존에 정확히 놓인다. 가장 좋아하던 세션이 금지되는데, 양쪽 다 근거가 있다고 주장한다.

`anchor_change`는 `intensity_model`에서 유도되므로 **기계 검증된다.** 자기가 연결하는 두 훈련법과 모순되는 전환 비용은 쓸 수 없다.

---

## 워크아웃 스키마가 exercises-dataset의 것이 아닌 이유

**원자는 동작이 아니라 세션이다.** exercises-dataset에는 세트·렙·부하가 없다 — 의도적으로. 벤치프레스는 어떤 프로그램에서든 벤치프레스이고, 동작 _자체_ 가 내용이다. 러닝에는 동작이 하나뿐이다. 원자는 _구조_ 일 수밖에 없고, 그러면 처방이 행 안으로 들어온다. 선택이 아니라 강제다.

**이름은 필드가 아니라 조인이다.** Daniels의 "tempo run"은 역치다. Hansons의 "tempo run"은 _마라톤 페이스_ 다. 워크아웃 행에 `name: "tempo run"`을 넣는 순간 데이터셋은 태어나면서부터 틀린다. 워크아웃 행은 훈련법 중립적인 id를 갖고, `usage.json`이 `(system, workout) -> calls_it`을 매핑한다. "tempo run"을 검색하면 여러 행이 나오고 _왜_ 다른지가 보인다.

**강도는 배열이고 `rpe_10`은 필수다.** 앵커는 깔끔하게 변환되지 않으므로 각자 `confidence`를 갖는다. 최소 두 개가 강제된다 — 앵커 하나만 있으면 앵커들이 서로 불일치한다는 사실이 감춰진다. 정확히 하나는 `rpe_10`이어야 한다: 장비도, 테스트도, 모델도, 훈련법 소속도 요구하지 않는 유일한 앵커라서 훈련법 사이의 유일한 보편 교환 통화이자 모든 행을 그릴 수 있는 유일한 축이다. `maxContains: 1`이 렌더러를 결정적으로 유지하고, 어떤 종류든 모델 중복은 검증 오류다 — 한 모델에 두 값은 뉘앙스가 아니라 행이 자기 자신과 불일치하는 것이다.

대가는 실재하며 말해둘 값이 있다: **RPE는 가장 부정확한 앵커다.** 그것을 보편 축으로 강제한다는 건 차트의 y축이 구조적으로 주관적이라는 뜻이다. 렌더된 SVG의 두 축 모두 도식이다 — x는 명목 페이스를 가정하고 y는 지각된 노력이다. 라벨이 그렇게 말한다.

**어휘는 평평한 목록이 아니라 분류 체계다.** 참조 파일(`anchors.json`, `adaptations.json`)은 "이걸 온톨로지로 만들어야 하나?"에 대한 이 프로젝트의 답이다 — 그렇다, 단 RDF/OWL이 아니라 가볍고 서술적인 쪽으로. `data/adaptations.json`은 평평한 `target_adaptation` enum을 거친 생리 범주(central-cardiovascular, peripheral-aerobic, metabolic, neuromuscular, structural, skill)로 묶고 각각에 정의를 붙인다. **서술적일 뿐이다**: 워크아웃이 무엇을 _표적으로 삼는다고 주장되는지_ 를 이름 붙이고 묶을 뿐, 워크아웃이 결과를 _만들어낸다_ 고 주장하지 않는다 — 그런 추론은 `expected_improvement`의 함정을 다시 여는 일이다. `validate.ts`는 워크아웃이 쓰는 모든 `target_adaptation`에 항목이 있을 것을 요구한다.

**측정 계층은 변환이 아니라 하강이다.** `data/anchors.json`은 `intensity_model`별로 무엇이 있어야 측정되는지(`daniels-vdot` → 레이스/TT + 페이스, `lactate_mmol` → 젖산 측정기)와, 그것이 없을 때의 정직한 `fallback`을 기록한다 — `rpe_10` 쪽으로 내려가면서 _무엇을 잃는지 명시하고_, 숫자로 치환하지 않는다. 앵커가 변환되지 않는다는 사실이 젖산→HR 표가 없는 이유다: 측정기 없는 러너는 RPE로 떨어지고 젖산 기반 훈련법의 정의적 통제를 잃는다(그 행 스스로 그렇게 적고 있다). 각 앵커는 `construct`도 갖는다 — 읽는 물리량(`perception` / `pace` / `heart-rate` / `metabolic`) — 이것이 앵커를 묶으면서 _변환 불가능성을 눈에 보이게_ 한다: 두 `pace` 앵커(`daniels-vdot` = 측정된 피트니스, `race_pace_ref` = 목표)는 서로 변환되지 않고, 두 `heart-rate` 앵커(최대 대 예비량)에서 같은 "70%"는 다른 bpm이다. 묶음은 축을 보여줄 뿐 다리를 놓지 않는다. `validate.ts`는 훈련법이나 워크아웃이 쓰는 모든 앵커에 항목이 있을 것을 요구하고, 정확히 한 항목 — `rpe_10` — 만이 `equipment_free`이자 유일한 `perception` construct임을 강제한다. exercises-dataset이 `equipment`로 그리는 장비 축이 여기서는 이것이다.

**미디어가 공짜다.** exercises-dataset의 진짜 자산은 Gym visual에서 라이선스한 GIF 1,324개이고 라이선스 부채가 핵심이다. 러닝에는 보여줄 애니메이션이 없다. 시각물은 페이스/강도 프로파일이고, 이는 `structure`의 순수 함수다. `scripts/render.ts`가 생성한다.

**1,324행이 아니라 워크아웃 ~20개, 훈련법 ~12개.** 웨이트는 조합 폭발이 있다(동작 × 장비 × 각도 × 그립). 러닝은 아니다. 깊은 행이 얕은 행을 이긴다.

---

## 가이드가 아니라 주장

이 영역에서 증명을 가진 사람은 아무도 없었다. n=1에는 반사실이 없다: 12주 동안 빨라진 러너는 "훈련이 통했다"와 "어차피 좋아질 참이었다"를 분리할 수 없다. 그가 가진 건 통제되지 않은 상관이지 입증이 아니다.

그래서 행은 가설이다. `claim.proposition`은 반증 가능한 한 문장이고, `test`는 그것을 반증할 절차다.

### 근거 등급은 기계로 강제된다

| tier        | 뜻                        | `cite`    | 추가 조건                      |
| ----------- | ------------------------- | --------- | ------------------------------ |
| `consensus` | 분야가 동의한다           | **2개 ↑** | `status: verified`, claim 전용 |
| `plausible` | 연구됐고, 논쟁 중         | **필수**  |                                |
| `tradition` | 다들 하는데 아무도 모른다 | **금지**  |                                |

**`consensus`는 생성기가 도달할 수 없는 유일한 등급이다.** 나머지 둘은 소스가 문장을 얼마나 뒷받침하는지를 말하고, 그건 손에 있는 소스로 확인된다. `consensus`는 어떤 단일 소스도 진술하지 않는 것 — 분야가 동의한다는 것 — 을 주장하므로, 독립 참조 두 개 이상에 그중 하나는 그 동의를 보고하는 리뷰나 교과서여야 하고, `status: verified`가 기록하는 사람의 읽기 뒤로 잠긴다. 이 맞물림은 의도적이다: `status`는 _사람이 읽었는가_ 에 답하고 tier는 _얼마나 뒷받침되는가_ 에 답하는데, 최상위 등급에서만 전자가 후자의 전제 조건이 된다. `test` 슬롯에도 닫혀 있는데, 이유는 다음 절에 있다.

예전에는 "교과서"가 정의의 전부였고 그건 양쪽으로 너무 느슨했다: 코치가 자기 방법을 서술한 책을 받아들였고, 서지만 보고 등급을 매기도록 유도했다. 이제 바는 참조가 어떻게 생겼는지가 아니라 무엇이 참이어야 하는지를 말한다.

**`source`는 출처, `cite`는 효능이다.** 다른 주장이고 스키마가 둘을 갈라놓는다. 정경 텍스트 — Daniels의 _Running Formula_, Lydiard의 _Running to the Top_ — 는 방법이 무엇을 **처방하는지**의 권위 있는 기록이다. 그것이 **작동한다**는 건 별개의 질문이고, 방법이 자기를 서술하는 것으로는 답할 수 없다. 그래서 `source`는 `attribution` 옆에 앉고, `tradition`을 포함한 모든 등급에서 허용되며, 어떤 등급도 정당화하지 않는다. 훈련법과 워크아웃이 모두 갖는다: 책의 효능 인용을 워크아웃에서 떼어내는 일이 그 워크아웃을 누가 어디서 정의했는지의 기록까지 지워서는 안 된다. `validate.ts`는 `source`를 `cite`와 같은 인용 기준으로 검사하고, "하나의 참조, 하나의 문자열" 규칙에 포함시키며, 같은 저작을 둘 다로 올린 행을 거부한다 — 그 붕괴가 바로 이 분리가 막으려는 것이다.

**자기 서술은 소스 단위가 아니라 명제 단위로 판정된다.** 저자가 방법을 갖고 있다는 이유로 책이 근거 자격을 잃지는 않는다. 자격을 잃는 건 그 책이 뒷받침하는 문장을 그 방법을 채택하지 않고는 물을 수 없을 때다. 판별 기준은 명제가 저자의 어휘 없이 살아남는가다. _젖산 정상상태 부근의 지속 주행이 그 정상상태를 위로 민다_ 는 살아남는다 — 젖산 정상상태는 Daniels의 개념이 아니고, 이 주장은 거짓일 수 있다. _역치 볼륨을 cruise interval로 쪼개면 역치 시간을 더 축적한다_ 는 살아남지 못한다: 권장되는 바로 그 구조를 전제하므로 책이 그것의 근거가 될 수 없고, 대신 그 행의 `source`가 된다.

**빈 `source`는 어떤 종류의 빈칸인지 말해야 한다.** `source`는 있으면 렌더되고 없으면 아무 말도 하지 않으므로, 문서화된 훈련법과 그렇지 않은 훈련법이 브라우징 중에 똑같아 보였다 — 그리고 하나의 빈칸이 서로 다른 두 사실을 덮고 있었다: 아직 아무도 기록하지 않은 텍스트와, 인용할 텍스트가 아예 없는 훈련법. 필수 **`provenance`** enum이 대신 그것을 진술한다: `recorded`(텍스트가 `source`에 있음), `unrecorded`(텍스트는 있으나 여기 기록되지 않음), `uncitable`(없으므로 이 칸은 계속 비어 있음). `validate.ts`가 `source`와 묶는다 — `recorded`는 반드시 하나를 내놓아야 하고 나머지 둘은 가져서는 안 된다 — 그래서 라벨이 그 아래 행과 어긋날 수 없다. tier 옆에 배지로 렌더되되 의도적으로 다르게 생겼다: 색 스케일을 공유하면 독립된 두 질문이 하나의 평결로 합쳐진다. 워크아웃에서는 라벨이 부분적으로 유도 가능하므로 검사된다: `attribution: null`은 아무도 정식화하지 않았다는 뜻이라 권위 있는 텍스트가 존재할 수 없고, 그 행은 `uncitable`이어야 한다 — `unrecorded`로 표시하면 영원히 채울 수 없는 일이 누군가의 작업 목록에 올라간다.

**모든 카운트는 데이터에서 생성되는 [`docs/counts.md`](docs/counts.md)에 있다.** 등급 분포, 출처 상태, 반증 가능성. 여기서는 숫자를 인용하지 않는다. 손으로 쓴 것들이 이미 낡았기 때문이다 — 이 파일은 한때 관찰 불가능한 test가 열셋일 때 둘이라고 적고 있었다. 산문으로 말할 값이 있는 건 총계가 아니라 형태다: `tradition`이 지배하고, 그 비율을 억지로 뒤집으면 프로젝트가 죽는다.

기여 가이드라인이 아니라 스키마/CI 층에서 강제된다. 아래 각 규칙은 [`scripts/rules.ts`](scripts/rules.ts)의 `add(...)` 하나이고 안정된 id를 갖는다. 논증을 거쳐 생긴 규칙에는 그것이 잡으려는 방식으로 정확히 데이터를 깨뜨리는 테스트가 붙어 있다:

- `tier: tradition` + `cite` → 위반. 인용이 있다면 그건 관행이 아니다.
- `(연도)` 없는 `cite` → 위반. URL은 인용이 아니다.
- 한 참조를 두 가지로 표기 → 위반. 소스는 모든 행에서 동일하게 읽혀야 한다. 그렇지 않으면 한 번 확인한 검증자가 같은 소스인 줄 알 수 없다.
- `claim.proposition` 없이 `tradition` 이상을 주장하는 훈련법 → 위반. 무엇의 근거인지 아무것도 진술되지 않은 근거는 확인도 반증도 될 수 없고, 인용은 반증 불가능한 채로 놓인다.
- 한 행에서 같은 참조가 `source`이자 `cite` → 위반. 출처와 효능은 다른 주장이다.
- 자기 `claim`이 이미 인용한 참조를 인용하는 `test` → 위반. test는 claim에서 파생된 절차이므로 claim의 소스를 재사용하면 한 번의 읽기가 두 개의 주장으로 계산된다. 기준은 비포함이 아니라 서로소다 — 반론은 참조 하나하나에 걸린다.
- `test`에 `tier: consensus` → 위반. test는 자기 교란을 달고 있는 현장 관측 휴리스틱이지 정착된 발견이 아니다.
- `status: verified`가 아닌 행에 `tier: consensus` → 위반. 최상위 등급은 `status`가 기록하는 사람의 읽기를 요구한다.
- `attribution: null`인데 `provenance: uncitable`이 아닌 워크아웃 → 위반. 아무도 정식화하지 않았다면 권위 있는 텍스트가 존재할 수 없다.
- 어떤 주기에서 강조하는 워크아웃이 그 주기에 배치돼 있지 않으면 → 위반. `base`·`build`·`peak`·`taper`·`offseason`은 훈련법과 워크아웃이 양쪽에서 쓰는 한 어휘이고, 둘이 어긋나면 페이지가 서로 모순되는 두 문장을 아무 표시 없이 렌더한다.
- 존재하지 않는 파일을 가리키는 주석 → 위반. 산문은 아무것도 검사하지 않던 유일한 부분이었고, 두 번의 이름 변경을 거치며 참조 열여섯 개가 낡은 뒤에야 발견됐다. 의도적인 예외는 `scripts/comment-refs.ts`에 적혀 있다.
- 검증 원장에 읽은 기록이 없는 인용을 가진 행이 `status: verified` → 위반. 무엇이 확인됐는지 말하지 않는 서명은 서명이 아니다.
- 원장 항목이 없는 행·경로를 가리키거나, 확인했다는 인용이 데이터에 없거나, 기각한 인용이 데이터에 남아 있으면 → 위반. 원장과 데이터는 양방향으로 맞아야 한다.
- `id`/`canonical_name`의 통칭 → 위반. 그건 `usage.json`에 속한다.
- 한 문장을 넘는 `bet` → 위반.
- `intensity_model`과 모순되는 `switching_cost.anchor_change` → 위반.
- `rpe_10`이 정확히 하나가 아니거나 모델이 중복된 `intensity.anchors` → 위반.

### `expected_improvement`이 아니라 `test`

유혹적인 필드는 "이걸 하면 → 저걸 얻는다"이다. 이 프로젝트의 신뢰를 무너뜨릴 유일한 필드다.

워크아웃에 개선을 귀속시킬 수 없다. 초보자는 _어떤_ 자극에도 좋아지고, 반사실은 0이 아니다. 반응 편차가 평균을 압도한다 — 표준화된 프로그램이 _같은_ 프로토콜에서 VO2max 변화 ~0%부터 +40% 이상까지를 만들어내므로, 평균을 발표하는 건 양쪽 꼬리 모두에게 거짓말이다. 그리고 단서는 JSON 경계를 넘지 못한다: 여기서 종착점은 툴콜링이고, `expected_improvement: "-2min"`은 하류에서 근거 있는 사실이 된다. 모델은 필드를 읽지 헤지를 읽지 않는다. 그건 환각의 _원천_ 이 된다.

대신 각 행은 반증 절차를 싣는다:

```json
"test": {
  "detectable": true,
  "what":        "같은 페이스에서 평균 HR 5~10bpm 하락",
  "when_weeks":  { "min": 2, "max": 4 },
  "confounds":   [ { "factor": "heat-acclimation", "severity": "high",
                     "shares_mechanism": true, "note": "..." } ],
  "if_absent":   "4주 무변화는 실패가 아니다...",
  "evidence":    { "tier": "tradition" }
}
```

**`if_absent`**은 `detectable: true`일 때 필수다. 영가설 해석이 없으면 주장은 반증 불가능하고, 그러면 주장이 아니다.

**`confounds`**는 `minItems: 1`을 강제 장치로 쓴다. 현실의 모든 신호에는 교란이 최소 하나 있다. 하나도 못 대겠다면 안 찾아본 것이다. `shares_mechanism: true`는 가장 나쁜 종류를 표시한다 — 주장과 _같은 생리_ 를 통해 작용해서 관찰로는 분리 불가능한 교란. 이 데이터셋에서 가장 믿을 만한 신호가 그것을 갖고 있다: **easy-run의 HR 하락은 혈장량 팽창이고, 열순응도 그렇다.** 봄에 시작해 여름에 측정하면, 계절과 훈련이 같은 기전을 같은 방향으로 같은 타임스케일에 밀었다. 가이드 프레이밍("HR 내려감 = 좋음")에서는 보이지 않고, 가설 프레이밍만이 "다른 무엇이 이걸 만들 수 있는가"를 묻게 만든다.

`shares_mechanism: true`에 `severity`가 `high` 미만이면 위반이다 — 기전적 구별 불가능성은 정의상 심각하다. _(이 규칙은 첫 실행에서 시드 데이터 자신의 불일치를 잡아냈고, 그게 요점이다.)_

**`test` 슬롯은 자기 근거를 스스로 벌어야 한다.** 시드 데이터에서는 단 하나도 그러지 못했다: 인용을 가진 test 여덟 개 전부가 자기 claim의 참조를 글자 그대로 재사용했고, 그래서 tier는 claim이 이미 말한 것 외에 아무것도 말하지 않은 채 모든 카운트를 두 배로 부풀렸다. test는 claim에서 _파생된_ 절차이고, 그 지위는 claim의 지위에서 `confounds`가 이미 깎아내는 만큼을 뺀 값이다. test가 인용해도 되는 건 **측정**에 관한 소스이고, 그건 구조적으로 claim의 소스와 서로소다. `validate.ts`가 이제 그 서로소를 요구한다. 최상위 등급은 test에 아예 닫혀 있다: 행 스스로 교란과 기전적으로 구별 불가능하다고 선언한 신호가 동시에 분야가 정착시킨 것일 수는 없다.

`detectable: false`인 행 — [`docs/counts.md`](docs/counts.md) 참조 — 은 `what`, `when_weeks`, `confounds`, `if_absent`를 **가질 수 없다.** 관찰 불가능한 영가설은 해석될 수 없다. 대신 어떤 현장 관측도 이 질문을 해결하지 못하는 이유를 `mechanism`에 싣고, 데이터셋이 거기서 제공할 수 있는 전부는 이것이다: 이건 믿음이다 — 주당 몇 분을 쓸지는 당신이 정하라.

---

## 하지 않을 것

**사용자 결과 수집.** 가설 프레이밍에서 자연스러운 다음 걸음은 "사용자가 실험을 돌리게 하고 결과를 모으자"이다. 그건 `expected_improvement`을 다시 발명하는 일이고 문헌 기반보다 _더 나쁘다_: 자기선택적이고, 통제되지 않고, 생존 편향에 걸린다 — 좋아진 사람은 계속 기록하고 그만둔 사람은 기록을 멈춘다. n=10,000은 과학처럼 보이지만 순수한 고반응자 증폭이고, 이제 Jack Daniels 대신 당신 이름을 달고 있다. 러닝은 특히 n-of-1 엄밀성에 적대적이다: 워시아웃도 블라인딩도 없고, 피험자는 비가역적으로 변하며, 결과 지표는 테스트로 학습한 페이싱 기술에 오염된다.

**공식과 예측.** Riegel, VDOT, TRIMP, CS/D-prime은 형태가 다른 별개의 프로젝트다(카탈로그 행이 아니라 정의역을 가진 함수). 렌더러가 거리 구간에 명목 페이스를 가정하고 출력을 "도식"이라고 라벨하는 건 정확히 이 문을 열지 않기 위해서다.

**가이드가 되는 것.** 데이터는 가설이고, 표현 계층은 조회일 수 있다. 인식론은 JSON에, 편의는 UI에. 반대는 절대 안 된다.

## 구조

```
data/
  systems.json       # 브라우징 개체. bet / commitment / switching_cost
  workouts.json      # 디테일 뷰. claim / test / structure / intensity
  usage.json         # (system, workout) -> calls_it. 충돌 표
  anchors.json       # 측정 계층. intensity_model별 requires + fallback (-> RPE)
  adaptations.json   # target_adaptation 분류: 거친 범주 + 정의
  verified.json      # 검증 원장. 손으로 쓰고 생성되지 않는다 — 사람이 읽었다는 유일한 기록
  schema/*.json      # JSON Schema 2020-12
scripts/
  rules.ts           # check(data) -> Finding[]. 모든 규칙, I/O 없음. 테스트가 rule id를 가리킨다
  evidence.ts        # 행의 근거 그래프를 걷는 유일한 워커 (순수)
  dataset.ts         # load(root) -> Dataset, 그리고 테스트에서 한 행을 깨는 patch()
  validate.ts        # rules.ts 위의 CLI: 읽고, 검사하고, 찍고, exit code
  types.ts           # data/schema/*.json -> src/types/ (생성물, 커밋됨, CI 검증)
  verify.ts          # data -> docs/verification.md (§1b 작업지) + docs/counts.md
  comment-refs.ts    # 주석이 이름을 부르는 파일과, 그게 아직 있는지
  svg.ts             # structure -> 도식 SVG (순수, 시각물의 유일한 원천)
  render.ts          # svg.ts로 SVG를 out/에 쓴다
  prerender.tsx      # 라우터를 통해 엔트리당 실제 HTML 파일 하나를 dist/에 쓴다
index.html           # 브라우즈 UI 셸
public/
  sw.js              # 서비스 워커: 오프라인에서도 카탈로그를 볼 수 있게
src/
  types/             # 스키마에서 생성 + 손으로 쓴 뷰 계약
  data.tsx           # JSON -> 타입 붙은 행, 역인덱스, 엔트리별 페이지 메타
  router.tsx         # 라우트 트리, 브라우저와 프리렌더러가 함께 구동
  components/        # React 컴포넌트 (ADR 0002), Node에서도 문자열로 렌더된다
  main.tsx           # 브라우저 셸: 크롬, 키보드 조회, 최근 본 항목, SW
  style.css          # tier 배지는 시각적 무게를 갖는다. tradition이 consensus로 읽혀선 안 된다
CONTEXT.md           # 용어집: 이 프로젝트가 쓰는 말과 쓰지 않는 말
docs/
  TODO.md            # 작업 목록: 검증, 대칭성, 얕은 필드
  verification.md    # 생성물 - 각 소스가 무엇을 뒷받침해야 하는지, 행 단위로
  counts.md          # 생성물 - 등급, 출처, 반증 가능성. 산문은 여기를 가리킨다
  adr/               # 아키텍처 결정과 그것을 만든 추론
```

```
vp install
vp run validate && vp run render   # 검사 + SVG 쓰기
vp dev                             # 브라우즈 UI (훈련법 -> 워크아웃 상세, "tempo run" 충돌 검색)
vp run build                       # dist/에 정적 번들, 엔트리당 HTML 파일 하나
```

브라우즈 UI는 JSON을 직접 읽고 도식 차트를 CLI가 쓰는 것과 같은 `scripts/svg.ts`로 렌더하므로, 시각물이 데이터에서 벗어날 수 없다.

모든 엔트리는 실제 문서이기도 하다. `scripts/prerender.tsx`가 훈련법·워크아웃·앵커마다 HTML 파일 하나씩을 쓴다 — 각자의 `<title>`, description, canonical URL, 그리고 마크업 안에 엔트리의 내용까지 — 브라우저가 렌더하는 것과 같은 `src/components/`에서. 그래서 `/anchor/rpe_10`에 처음 들어와도 JavaScript 없이 읽히고 서버 재작성 규칙이 필요 없으며, 클라이언트 번들은 그 위에서 즉시·무리로드 조회로 업그레이드한다. 그 분리가 [ADR 0001](docs/adr/0001-dictionary-shape.md)의 주제다.

한 번 로드되면 사전처럼 읽힌다: `/`(또는 `s`)로 검색창에 뛰고, `↑`/`↓`로 결과를 훑고, `Enter`로 열고, `Esc`로 지운다. 마지막에 연 여덟 개가 홈에 남는다. 그리고 전체 코퍼스가 번들에 실리므로 서비스 워커가 카탈로그를 오프라인에서도 볼 수 있게 만든다 — 한 번도 열지 않은 엔트리까지, 이미 기기에 있는 데이터로 클라이언트가 렌더할 수 있기 때문이다.

## 알려진 미해결 문제

가까운 작업 목록 — 검증(`draft` → `verified`), `switching_cost` 대칭성, 얕은 필드의 깊이 — 은 [`docs/TODO.md`](docs/TODO.md)에 구체적으로 추적된다.

아키텍처 결정과 그 추론은 [`docs/adr/`](docs/adr/)에 있다.
[ADR 0008](docs/adr/0008-verification-ledger.md)은 사람이 소스를 읽었다는 사실에 자리를 준다 — 검증 원장.
[ADR 0007](docs/adr/0007-korean-repo-prose.md)은 저장소 산문을 한국어로 쓰기로 하고 그 경계를 긋는다.
[ADR 0006](docs/adr/0006-korean-only-dataset.md)은 데이터셋에서 영어를 제거한 이유를 기록한다.
[ADR 0005](docs/adr/0005-comments-as-agent-context.md)는 파일 상단 주석을 에이전트 대면 컨텍스트로 다루고 검사 가능하게 만든다.
[ADR 0004](docs/adr/0004-tanstack-router.md)는 브라우즈 계층을 TanStack Router로 확정하고 툴체인 질문을 닫는다.
[ADR 0003](docs/adr/0003-nub-runtime.md)은 스크립트를 nub에서 실행하기로 하고 중간 SSR 빌드를 없앤다.
[ADR 0002](docs/adr/0002-component-model.md)는 React 컴포넌트로의 이동을 기록한다.
[ADR 0001](docs/adr/0001-dictionary-shape.md)은 왜 이것을 사전으로 다루는지 — 클라이언트 인덱스로 감싼 프리렌더 엔트리 — 그리고 따라서 왜 데이터가 JSON으로 남는지, 왜 전체 코퍼스를 의도적으로 앞에서 로드하는지, 왜 웹 프레임워크를 도입하지 않는지를 기록한다.

- ~~**카드 뷰가 등급을 평평하게 만든다.**~~ 해결됨. 모든 훈련법·워크아웃 카드에 tier 배지가 붙고 `consensus`/`plausible`/`tradition`에 의도적으로 다른 시각 무게를 준다 — 각각 채운 배경, 외곽선, 흐린 점선 외곽선 — 그래서 브라우징이 `tradition`을 정착된 것으로 읽히게 만들 수 없다. 앞으로 추가되는 어떤 카드에도 이 제약이 유지된다.
- **아직 아무것도 검증되지 않았다.** 모든 훈련법과 워크아웃이 `status: draft`다. 인용은 정규화되고 기계로 강제되지만(하나의 참조, 하나의 문자열), 그건 소스가 어디서나 같게 _읽힌다_ 는 뜻일 뿐 그것이 붙은 주장을 뒷받침한다는 뜻이 아니다. 검증 체크리스트는 [`docs/TODO.md`](docs/TODO.md#1-검증-draft--verified)에 있다.
- **Daniels의 볼륨 상한은 기억에서 온 것**이고 `tradition` + draft로 표시돼 있다. 원문과 대조할 것.
- **VDOT 표는 편집 저작물이다.** 스크래핑하지 말 것. 필요하면 Daniels & Gilbert (1979) _Oxygen Power_ 의 공개된 방정식에서 다시 유도할 것. VDOT는 상표다. Purdy Points와 WMA 연령 보정표도 같은 함정.
- **선행 사례 미확인.** GoldenCheetah가 분석 쪽의 참조 구현이지만 그건 엔진이지 지식 베이스가 아니다. 이 카탈로그 같은 것이 없는지 확인할 것.
- **한국어 사용자에게 헤드라인 기능이 영어로만 남아 있다.** `calls_it`이 전부 영어라 "템포"로 검색하면 아무것도 나오지 않는다. 한국어 통칭은 번역이 아니라 새 데이터 수집이고, `system: null` 통칭 행으로 들어가야 한다 — [ADR 0006](docs/adr/0006-korean-only-dataset.md), [`docs/TODO.md`](docs/TODO.md).
