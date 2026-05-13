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
- Phaser 기반 2D 렌더링
- 모바일/PC 입력 처리
- HUD, 인벤토리, 거점 UI
- Socket.IO 클라이언트 연결

### apps/realtime-server

실시간 게임 서버.

담당:

- 플레이어 접속/퇴장
- 방 또는 월드 인스턴스 관리
- 위치/입력 동기화
- 채팅
- 서버 권위 게임 상태 관리
- 추후 Redis, DB 연동

### packages/shared

클라이언트와 서버가 공유하는 타입/상수/프로토콜.

담당:

- Entity 타입
- Socket event 타입
- 아이템/몬스터/속성 enum
- 공용 DTO

### packages/game-core

렌더링, 네트워크, DB에 의존하지 않는 순수 게임 로직.

담당:

- 포획 확률 계산
- 전투 피해 계산
- 경험치/레벨 계산
- 작업 생산량 계산
- 상태이상 계산

## 중요한 원칙

### 1. 서버 권위 구조

중요한 판정은 서버가 결정한다.

- 피해량
- 포획 성공 여부
- 아이템 획득
- 제작 완료
- 거래
- 경험치 획득

클라이언트는 입력과 표시를 담당한다.

### 2. 공용 타입 우선

소켓 이벤트나 API payload는 반드시 `packages/shared`에 타입을 먼저 정의한다.

### 3. 게임 규칙 분리

포획률, 데미지, 생산량 같은 계산은 클라이언트나 서버 내부에 직접 쓰지 않고 `game-core` 함수를 사용한다.

### 4. 모바일 퍼스트 UI

모바일 화면에서 먼저 조작 가능한지 확인한다.

- 하단 엄지 영역에 이동/액션 버튼 배치
- 작은 버튼 금지
- 긴 목록은 바텀시트 패턴 사용
- 가로/세로 화면 모두 대응 가능하게 설계

## 네트워크 이벤트 초안

```txt
client:join_world
client:player_input
client:chat_message
client:interact_entity
client:use_item
client:place_building

server:world_snapshot
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

- PostgreSQL: 유저, 캐릭터, 인벤토리, 몬스터, 거점
- Redis: 세션, 월드 샤드 상태, pub/sub
- Object Storage: 맵/이미지/리플레이/로그

## 배포 전략

- `apps/web`: Vercel 배포에 적합
- `apps/realtime-server`: Render, Fly.io, Railway, VPS 등 WebSocket 지원 서버에 배포

Vercel serverless function은 지속 WebSocket 서버에 적합하지 않으므로 실시간 서버는 별도 배포를 권장한다.
