# 예식장 예약 모니터링 프로그램

서울대 연구공원 웨딩홀과 이라운지 예약 가능 날짜를 자동 모니터링하고, 텔레그램 2개로 동시 알림을 받는 프로그램입니다.

## 주요 기능

- 2개 예식장 자동 모니터링 (연구공원 웨딩홀 + 이라운지)
- 텔레그램 2개 동시 알림 지원
- 자동 예약 기능 (연구공원만)
- 달력에서 특정 날짜 선택 추가
- 시간대별 자동예약/알림 설정

## 빠른 시작

### 1. 설치

```bash
pip install -r requirements.txt
```

### 2. 텔레그램 봇 2개 만들기

#### 텔레그램 1
1. 텔레그램에서 `@BotFather` 검색
2. `/newbot` 입력
3. 봇 이름 입력 (예: `웨딩알림1`)
4. 사용자명 입력 (예: `wedding_bot1_bot`, 반드시 `_bot`으로 끝)
5. **Bot Token 복사 저장**

#### 텔레그램 2
- 위와 같은 방법으로 두 번째 봇 생성
- 봇 이름: `웨딩알림2`
- 사용자명: `wedding_bot2_bot`

#### Chat ID 얻기
1. 텔레그램에서 `@userinfobot` 검색
2. `/start` 입력
3. **Chat ID 복사 저장**
4. 각 봇과 대화 시작 (`/start` 입력)

### 3. 예약 정보 설정

`auto_reservation.py` 파일 열기:

```python
RESERVATION_INFO = {
    # 예약자 1 정보
    "groom_name": "홍길동",           # ← 실제 이름
    "groom_tel": "010-1234-5678",    # ← 실제 전화번호
    "groom_email": "groom@email.com", # ← 실제 이메일

    # 예약자 2 정보
    "bride_name": "김영희",
    "bride_tel": "010-5678-1234",
    "bride_email": "bride@email.com",

    "expected_people": "300~400명",   # 250~300명 / 300~400명 / 400명 이상
    "etc_message": "예약 확인 부탁드립니다."
}
```

### 4. 실행

```bash
python main.py
```

## 사용 방법

### GUI 설정

1. **날짜 설정**
   - 기간: 시작일~종료일, 요일 선택
   - 특정 날짜: 달력에서 선택 후 `추가` 버튼

2. **시간대 설정**
   - 연구공원: 각 시간대마다 `자동예약` or `알림만`
   - 이라운지: 알림만 가능

3. **텔레그램 설정**
   - 텔레그램 1: Bot Token, Chat ID 입력
   - 텔레그램 2: Bot Token, Chat ID 입력

4. **설정 저장** → **시작하기**

### 알림 예시

**텔레그램 1:**
```
📱 [텔레그램 1]

🔔 예약 가능 발견!
📍 서울대 연구공원 웨딩홀
📅 2026년 11월 01일 (일)
⏰ 오전 11시
```

**텔레그램 2:** 동일한 알림 동시 수신

## 파일 구조

```
wedding_monitor/
├── main.py                    # GUI 프로그램 (실행!)
├── wedding_checker.py         # 예약 확인
├── auto_reservation.py        # 자동 예약 (정보 수정)
├── notification_manager.py    # 텔레그램 알림
├── requirements.txt           # 패키지
└── README.md
```

## 주의사항

- PC를 켜놓아야 함 (절전 모드 해제)
- Chrome 브라우저 필요
- 자동 예약은 "신청"만 가능 (계약금 입금은 수동)
- 텔레그램 Bot Token 노출 주의

## 문제 해결

**텔레그램 알림 안 옴**
- Bot Token, Chat ID 확인
- 각 봇과 대화 시작했는지 확인 (`/start`)

**ModuleNotFoundError**
```bash
pip install -r requirements.txt
```

**크롤링 실패**
- Chrome 브라우저 설치 확인
- 인터넷 연결 확인

## 실행 가능 시점

**지금 바로 가능합니다!**

패키지 설치 후 바로 실행하세요:
```bash
pip install -r requirements.txt
python main.py
```

텔레그램 설정만 입력하면 즉시 모니터링 시작 가능합니다.

---

행복한 결혼 준비 되세요! 💒
