/**
 * 뷰 계층 자신의 타입. 이 파일 옆의 데이터 타입은 JSON Schema에서 생성되지만 이것들은
 * 아니다. 뷰가 어떻게 호출되는지를 서술하고, 그건 스키마가 말할 바가 아니다.
 */
import type { Workout } from './index.d.ts'

/** 앵커가 읽는 물리량. 묶음은 축을 보여줄 뿐 다리를 놓지 않는다. */
export interface Construct {
  id: string
  label: string
  note: string
}

export interface AdaptCategory {
  id: string
  label: string
}

/** 어떤 앵커를 싣는 워크아웃과, 그것이 그 워크아웃의 주앵커인지. */
export interface AnchorUse {
  w: Workout
  primary: boolean
}

/** switching_cost의 한쪽. 그것이 닿는 앵커로 인덱싱된다. */
export interface AnchorSwitch {
  to: string
  from: string
  silent?: boolean
  note?: string
  from_anchor?: string
  side: 'in' | 'out'
}
