# Architecture

## 방향

PalPalWorld는 유지보수성과 확장성을 위해 monorepo 구조를 사용한다.

```txt
apps/web
apps/realtime-server
packages/shared
packages/game-core
```

## 레이어 역할

### apps/web

브라우저에서 실행되는 게임 클라이언트.

담당:

- Next.js 앱 라우팅
- Canvas 기반 2D 렌더링
- 모바일/PC 입력 처리
- HUD, 인벤토리, 제작, 건설 UI
- Socket.IO 클라이언트 연결

### apps/realtime-server

실시간 게임 서버.

담당:

- 플레이어 접속/퇴장
- 월드 인스턴스 관리
- 위치/입력 동기화
- 채팅
- 서버 권위 게임 상태 관리
- 채집, 제작, 건설, 몬스터, 전투 같은 도메인 서비스 실행
- 추후 Redis, DB 연동

현재 서버 도메인 구조:

```txt
apps/realtime-server/src/
  index.ts                    소켓 이벤트 연결만 담당
  world/WorldState.ts          월드 상태 저장
  inventory/InventoryStore.ts  플레이어 인벤토리 저장/소모/추가
  resources/ResourceService.ts 채집 판정/드랍/리스폰
  crafting/CraftingService.ts  제작 재료 소모/결과 지급
  buildings/BuildingService.ts 건설 판정/건물 생성
  creatures/CreatureService.ts 몬스터 종족/개체 생명주기/스탯 계산
  combat/CombatService.ts      전투 판정/피해/처치 드랍
  traits/TraitService.ts       특성 효과 계산
```

### packages/shared

클라이언트와 서버가 공유하는 타입/상수/프로토콜/콘텐츠 카탈로그.

담당:

- Entity 타입
- Socket event 타입
- 아이템/몬스터/속성 enum
- 공용 DTO
- 지역/자원/몬스터/특성/제작/건설 카탈로그

현재 콘텐츠 카탈로그:

```txt
packages/shared/src/catalog.ts
  TRAIT_CATALOG
  ITEM_CATALOG
  REGION_CATALOG
  RESOURCE_CATALOG
  CREATURE_CATALOG
  CRAFTING_RECIPES
  BUILDING_CATALOG
  STARTER_RESOURCE_NODES
  STARTER_CREATURE_SPAWNS
```

### packages/game-core

렌더링, 네트워크, DB에 의존하지 않는 순수 게임 로직.

담당:

- 포획 확률 계산
- 전투 피해 계산
- 속성 상성 계산
- 이동/거리 계산
- 작업 생산량 계산

## 중요한 원칙

### 1. 서버 권위 구조

중요한 판정은 서버가 결정한다.

- 피해량
- 포획 성공 여부
- 아이템 획득
- 제작 완료
- 건설 성공 여부
- 탈것 탑승 가능 여부
- 거래
- 경험치 획득

클라이언트는 입력과 표시를 담당한다.

### 2. 콘텐츠는 데이터 카탈로그에 둔다

지역, 자원, 몬스터, 몬스터 개체 특성, 드랍 테이블, 제작법, 건물 재료는 코드 곳곳에 하드코딩하지 않는다.

새 자원을 추가할 때:

1. `ItemId` 또는 관련 타입 확인
2. `ITEM_CATALOG`에 아이템 추가
3. `RESOURCE_CATALOG`에 채집 자원 추가
4. 필요한 지역의 `resourceTypes`에 추가
5. 필요하면 `STARTER_RESOURCE_NODES` 또는 추후 맵 스폰 테이블에 배치

새 몬스터를 추가할 때:

1. `CREATURE_CATALOG`에 종족 추가
2. 드랍 테이블 추가
3. 작업 적성 추가
4. `traitPool`에 해당 종족이 가질 수 있는 특성 후보 추가
5. 탈것 가능 몬스터라면 `mount` 정의 추가
6. 지역의 `creatureSpeciesIds`에 추가
7. 스폰 테이블에 배치

새 몬스터 특성을 추가할 때:

1. `TraitEffectType`이 기존 효과로 표현 가능한지 확인
2. 불가능하면 `TraitEffectType`에 새 효과 타입 추가
3. `TRAIT_CATALOG`에 특성 추가
4. 필요한 몬스터의 `traitPool`에 특성 ID 추가
5. 효과 적용 로직은 `TraitService` 또는 도메인 서비스에서 처리

### 3. 종족 데이터와 개체 데이터는 분리한다

중요한 규칙:

```txt
CREATURE_CATALOG = 종족 기본값
CreaturePublicState = 필드에 스폰된 한 마리 개체 상태
OwnedCreatureState = 포획 후 플레이어가 보유한 한 마리 개체 상태
```

예시:

```txt
풀토끼 종족:
- 기본 HP
- 기본 공격력
- 작업 적성
- 가질 수 있는 특성 후보 traitPool
- 탈것 가능 여부 mount

스폰된 풀토끼 개체:
- 현재 HP
- 레벨
- 위치
- 실제 부여된 traitIds

포획된 풀토끼 개체:
- 주인 ownerPlayerId
- 닉네임
- 실제 부여된 traitIds
- 스태미나
- 탑승 상태
```

이렇게 나눠야 교배, 포획, 탈것, 개체 강화, 거점 노동을 나중에 쉽게 확장할 수 있다.

### 4. 공용 타입 우선

소켓 이벤트나 API payload는 반드시 `packages/shared`에 타입을 먼저 정의한다.

### 5. 게임 규칙 분리

포획률, 데미지, 생산량 같은 계산은 클라이언트나 서버 내부에 직접 쓰지 않고 `game-core` 함수를 사용한다.

특성 보정은 다음 순서로 적용한다.

```txt
기본 종족 스탯
→ 레벨 보정
→ 개체 traitIds 보정
→ 장비/버프 보정
→ 최종 판정
```

### 6. 도메인 서비스 분리

서버의 `index.ts`는 소켓 이벤트를 서비스에 연결하는 역할만 한다.

금지:

- `index.ts`에 제작 재료 계산 직접 작성
- `index.ts`에 드랍 테이블 직접 작성
- `index.ts`에 건물 배치 규칙 직접 작성
- `index.ts`에 특성 계산 직접 작성

권장:

- `ResourceService`
- `CraftingService`
- `BuildingService`
- `CreatureService`
- `CombatService`
- `TraitService`
- `CaptureService`
- `MountService`
- `BaseService`
- `BreedingService`

### 7. 포획/탈것 확장 예정 구조

포획 시스템은 다음 구조로 추가한다.

```txt
client:try_capture
→ CaptureService
→ 대상 몬스터 HP/상태/희귀도/포획구/특성 보정 확인
→ 성공 시 OwnedCreatureState 생성
→ 필드 CreaturePublicState 제거 또는 비활성화
→ server:owned_creatures_updated 전송
```

탈것 시스템은 다음 구조로 추가한다.

```txt
client:mount_creature
→ MountService
→ OwnedCreatureState 확인
→ CREATURE_CATALOG[speciesId].mount 확인
→ 필요 안장/레벨/스태미나 확인
→ PlayerPublicState.mountedCreatureId 설정
→ 이동 속도 보정
```

### 8. 모바일 퍼스트 UI

모바일 화면에서 먼저 조작 가능한지 확인한다.

- 하단 엄지 영역에 이동/액션 버튼 배치
- 작은 버튼 금지
- 긴 목록은 바텀시트 패턴 사용
- 가로/세로 화면 모두 대응 가능하게 설계

## 네트워크 이벤트

```txt
client:join_world
client:player_input
client:chat_message
client:interact_entity
client:craft_item
client:use_item
client:place_building
client:try_capture
client:mount_creature
client:dismount_creature

server:world_snapshot
server:inventory_updated
server:owned_creatures_updated
server:entity_spawned
server:entity_updated
server:entity_removed
server:chat_message
server:toast
```

## 저장소 전략

초기 MVP:

- 메모리 기반 월드 상태
- JSON 또는 SQLite 임시 저장 가능

서비스 확장:

- PostgreSQL: 유저, 캐릭터, 인벤토리, 포획 몬스터, 거점
- Redis: 세션, 월드 샤드 상태, pub/sub
- Object Storage: 맵/이미지/리플레이/로그

## 배포 전략

- `apps/web`: Vercel 배포에 적합
- `apps/realtime-server`: Render, Fly.io, Railway, VPS 등 WebSocket 지원 서버에 배포

Vercel serverless function은 지속 WebSocket 서버에 적합하지 않으므로 실시간 서버는 별도 배포를 권장한다.
