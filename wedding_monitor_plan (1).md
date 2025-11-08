# 예식장 예약 모니터링 프로그램 구상서

## 📋 프로젝트 개요

### 목적
서울대 연구공원 웨딩홀과 서울대 이라운지 예식장의 예약 가능 날짜를 자동으로 모니터링하고, 날짜가 비면 텔레그램으로 알림을 받거나 자동으로 예약 신청하는 프로그램

### 대상 예식장
1. **서울대 연구공원 웨딩홀**
   - URL: https://www.snuwedding.co.kr/snu/reservation
   - 시간대: 오전 11시, 오후 1시, 3시, 5시, 6시 30분 (5개)
   - 기능: 예약 가능 알림 + 자동 예약 신청

2. **서울대 이라운지**
   - URL: 네이버 캘린더 (공개)
   - 시간대: 11:00, 14:00, 17:00 (3개)
   - 기능: 예약 가능 알림만

---

## 🎯 주요 기능

### 1. 날짜 모니터링
- **기간 설정**: 시작일~종료일 범위 선택, 토요일/일요일/둘다 선택 가능
- **특정 날짜 설정**: 원하는 날짜만 개별 선택 (예: 11월 29일, 3월 4일, 6월 8일)
- **중복 설정 가능**: 기간 + 특정 날짜 동시 사용 가능

### 2. 시간대별 동작 설정

#### 서울대 연구공원 웨딩홀
각 시간대마다 선택 가능:
- **알림 + 자동예약**: 예약 가능 감지 시 자동으로 예약 신청 후 결과 알림
- **알림만**: 예약 가능 감지 시 텔레그램 알림만 전송

#### 서울대 이라운지
- **알림만**: 예약 가능 감지 시 텔레그램 알림만 전송 (자동 예약 불가)

### 3. 자동 예약 신청 (연구공원만)
- 예약 가능 감지 시 자동으로 예약 폼 작성 및 제출
- 예약 정보는 코드에 하드코딩 (auto_reservation.py 파일 수정)
- 예약 성공/실패 여부를 텔레그램으로 알림

### 4. 알림 시스템
**텔레그램 알림 (1차 구현)**
- 예약 가능 발견 알림
- 자동 예약 진행 상황 알림
- 예약 성공/실패 결과 알림
- 완전 무료, 설정 간단

**문자(SMS) 알림 (선택적 확장)**
- 나중에 필요 시 추가 가능
- 중요 알림만 문자 전송 옵션
- 건당 소액 과금 (9~15원)

### 5. 확인 주기
- 1시간마다 자동 확인
- 변화 감지: "예약완료 → 예약가능" 또는 "완료 → 가능"

---

## 🖥️ 프로그램 구조

### 파일 구성
```
wedding_monitor/
├── main.py                    # GUI 메인 프로그램
├── wedding_checker.py         # 예약 확인 로직
├── auto_reservation.py        # 자동 예약 기능
├── notification_manager.py    # 통합 알림 관리 (텔레그램 + SMS)
├── config.json               # 사용자 설정 저장
├── wedding_data.json         # 예약 현황 데이터
└── requirements.txt          # 필요 패키지
```

### GUI 화면 구성

```
┌───────────────────────────────────────────────────┐
│         예식장 예약 모니터링 프로그램             │
├───────────────────────────────────────────────────┤
│                                                   │
│  📅 모니터링 설정                                 │
│                                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  방법 1: 기간으로 모니터링                        │
│  ☐ 기간 설정 사용                                 │
│                                                   │
│  시작일: [2025-11-01 📅]  종료일: [2026-06-30 📅]│
│  확인 요일: ○ 토요일만  ○ 일요일만  ○ 토/일 둘다 │
│                                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  방법 2: 특정 날짜만 모니터링                     │
│  ☐ 특정 날짜 사용                                 │
│                                                   │
│  [+ 날짜 추가]  [일괄 추가]                       │
│  선택된 날짜 목록: (날짜 추가/삭제 가능)          │
│                                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  ⏰ 시간대별 동작 설정                             │
│                                                   │
│  서울대 연구공원 웨딩홀                           │
│  ☑ 오전 11시    ● 알림+자동예약  ○ 알림만        │
│  ☑ 오후 1시     ● 알림+자동예약  ○ 알림만        │
│  ☑ 오후 3시     ● 알림+자동예약  ○ 알림만        │
│  ☑ 오후 5시     ○ 알림+자동예약  ● 알림만        │
│  ☐ 오후 6시30분                                   │
│                                                   │
│  서울대 이라운지 (알림만)                         │
│  ☑ 11:00       (자동 예약 불가)                   │
│  ☑ 14:00       (자동 예약 불가)                   │
│  ☑ 17:00       (자동 예약 불가)                   │
│                                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  📝 자동 예약 정보                                 │
│                                                   │
│  신랑: 홍길동 (010-1234-5678)                     │
│  신부: 김영희 (010-5678-1234)                     │
│  예상인원: 300~400명                              │
│                                                   │
│  💡 정보 수정: auto_reservation.py 파일 수정      │
│                                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  🔔 알림 설정                                     │
│                                                   │
│  📱 텔레그램 (필수)                               │
│  Bot Token: [________________]                    │
│  Chat ID:   [________________]                    │
│                                                   │
│  💬 문자(SMS) (선택 - 나중에 추가 가능)           │
│  ☐ SMS 알림 사용 (현재 비활성)                    │
│  서비스: ○ 네이버 클라우드  ○ 쿨SMS              │
│  발신번호: [________________] (등록 필요)         │
│  수신번호: [________________]                     │
│  API Key:  [________________]                     │
│  문자 발송: ○ 중요 알림만  ○ 모든 알림           │
│                                                   │
│  확인 주기: [1] 시간마다                          │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 시작하기 │  │   중지   │  │   종료   │       │
│  └──────────┘  └──────────┘  └──────────┘       │
│                                                   │
├───────────────────────────────────────────────────┤
│  📊 모니터링 상태                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  상태: 대기중 / 모니터링 중 / 중지됨             │
│  마지막 확인: -                                   │
│  다음 확인: -                                     │
│                                                   │
│  🔔 알림 기록 (최근 10개)                         │
│  (발견된 예약 가능 날짜 표시)                     │
└───────────────────────────────────────────────────┘
```

---

## 🔄 작동 흐름

### 전체 프로세스
```
1. 사용자가 설정 입력
   - 날짜 범위/특정 날짜 선택
   - 시간대별 동작 설정
   - 텔레그램 정보 입력
   ↓
2. [시작하기] 클릭
   ↓
3. 첫 번째 데이터 수집
   - 두 예식장의 현재 예약 상황 확인
   - wedding_data.json에 저장 (기준 데이터)
   ↓
4. 1시간마다 반복 실행:
   ├─ 서울대 연구공원 웨딩홀 확인
   │  ├─ 설정된 날짜의 예약 상황 크롤링
   │  ├─ 이전 데이터와 비교
   │  ├─ "예약완료 → 예약가능" 변화 감지
   │  ├─ 자동예약 설정 시간대?
   │  │  ├─ Yes → 자동 예약 시도
   │  │  │         └─ 성공/실패 알림
   │  │  └─ No → 알림만 전송
   │  └─ 텔레그램 알림
   │
   ├─ 서울대 이라운지 확인
   │  ├─ 설정된 날짜의 예약 상황 확인
   │  ├─ 이전 데이터와 비교
   │  ├─ "완료 → 가능" 변화 감지
   │  └─ 텔레그램 알림만
   │
   └─ 새로운 데이터 저장
   ↓
5. 1시간 대기
   ↓
6. 4번으로 돌아가서 반복
```

### 자동 예약 프로세스 (연구공원만)
```
1. 예약 가능 감지
   ↓
2. Selenium으로 브라우저 실행
   ↓
3. 예약 페이지 접속
   - javascript:send_chk() 실행
   ↓
4. 예약 폼 자동 입력
   - 신랑/신부 정보
   - 연락처, 이메일
   - 예상 인원
   ↓
5. 개인정보 동의 체크박스 클릭
   ↓
6. send_frm() 함수 실행 (예약 신청)
   ↓
7. 성공/실패 확인
   ↓
8. 텔레그램으로 결과 알림
```

---

## 📊 데이터 구조

### config.json (사용자 설정)
```json
{
  "date_mode": {
    "use_range": true,
    "range": {
      "start": "2025-11-01",
      "end": "2026-06-30",
      "weekdays": ["토", "일"]
    },
    "use_specific": true,
    "specific_dates": [
      "2025-11-29",
      "2026-03-04",
      "2026-06-08"
    ]
  },
  "time_settings": {
    "research_park": {
      "11:00": {"enabled": true, "auto_reserve": true},
      "13:00": {"enabled": true, "auto_reserve": true},
      "15:00": {"enabled": true, "auto_reserve": true},
      "17:00": {"enabled": true, "auto_reserve": false},
      "18:30": {"enabled": false, "auto_reserve": false}
    },
    "elounge": {
      "11:00": {"enabled": true},
      "14:00": {"enabled": true},
      "17:00": {"enabled": true}
    }
  },
  "telegram": {
    "bot_token": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz",
    "chat_id": "123456789"
  },
  "sms": {
    "enabled": false,
    "service": "naver",
    "from_number": "",
    "to_number": "",
    "api_key": "",
    "api_secret": "",
    "send_critical_only": true
  },
  "check_interval_hours": 1
}
```

### wedding_data.json (예약 현황)
```json
{
  "last_update": "2025-11-08T14:23:15",
  "research_park": {
    "2026-11-01": {
      "11:00": "예약완료",
      "13:00": "예약완료",
      "15:00": "예약완료",
      "17:00": "예약가능",
      "18:30": "예약가능"
    }
  },
  "elounge": {
    "2026-11-01": {
      "11:00": "완료",
      "14:00": "완료",
      "17:00": "가능"
    }
  }
}
```

### auto_reservation.py (예약 정보 하드코딩)
```python
RESERVATION_INFO = {
    # 신랑 정보
    "groom_name": "홍길동",
    "groom_tel": "010-1234-5678",
    "groom_email": "groom@email.com",
    
    # 신부 정보
    "bride_name": "김영희",
    "bride_tel": "010-5678-1234",
    "bride_email": "bride@email.com",
    
    # 예상 인원: "250~300명" / "300~400명" / "400명 이상"
    "expected_people": "300~400명",
    
    # 기타 문의사항 (선택)
    "etc_message": ""
}
```

---

## 📱 알림 시스템

### 텔레그램 알림 (1차 구현)

현재 버전에서는 텔레그램만 구현하며, 나중에 필요 시 SMS를 쉽게 추가할 수 있도록 확장 가능한 구조로 설계합니다.

### 텔레그램 알림 예시

### 1. 예약 가능 발견 (알림만)
```
━━━━━━━━━━━━━━━━
🔔 예약 가능 발견!

📍 서울대 연구공원 웨딩홀
📅 2026년 11월 01일 (일)
⏰ 오후 5시

상태 변경: 예약완료 → 예약가능

⚠️ 수동 예약 시간대
직접 예약해주세요!

📞 [전화하기]
🌐 [예약하기]

발견 시각: 2025-11-08 14:23:15
━━━━━━━━━━━━━━━━
```

### 2. 자동 예약 진행 중
```
━━━━━━━━━━━━━━━━
⏳ 자동 예약 시도 중...

📍 서울대 연구공원 웨딩홀
📅 2026년 11월 01일 (일)
⏰ 오전 11시

신랑: 홍길동 (010-1234-5678)
신부: 김영희 (010-5678-1234)

잠시만 기다려주세요...
━━━━━━━━━━━━━━━━
```

### 3. 자동 예약 성공
```
━━━━━━━━━━━━━━━━
✅ 예약 신청 완료!

📍 서울대 연구공원 웨딩홀
📅 2026년 11월 01일 (일)
⏰ 오전 11시

신청 정보:
👰‍♂️ 신랑: 홍길동
📞 010-1234-5678
👰‍♀️ 신부: 김영희
📞 010-5678-1234

⚠️ 중요!
직원 확인 후 전화 연락 예정
계약금 입금 전까지는 예약 미확정

신청 시각: 2025-11-08 14:23:15
━━━━━━━━━━━━━━━━
```

### 4. 자동 예약 실패
```
━━━━━━━━━━━━━━━━
❌ 예약 신청 실패

📍 서울대 연구공원 웨딩홀
📅 2026년 11월 01일 (일)
⏰ 오전 11시

실패 사유: 다른 사람이 먼저 신청함

🔄 수동으로 재시도해주세요
🌐 [예약 페이지 열기]
━━━━━━━━━━━━━━━━
```

### 5. 이라운지 알림
```
━━━━━━━━━━━━━━━━
🔔 예약 가능 발견!

📍 서울대 이라운지
📅 2026년 5월 10일 (토)
⏰ 17:00

상태 변경: 완료 → 가능

⚠️ 수동 예약 필요
아래 방법으로 예약하세요:

📞 전화 예약: 02-XXXX-XXXX
🌐 예약 페이지: [링크]

발견 시각: 2025-11-08 14:23:15
━━━━━━━━━━━━━━━━
```

---

## 🛠️ 기술 스택

### 필요 패키지
```txt
# GUI
tkinter              # 기본 내장
tkcalendar>=1.6.1   # 달력 UI

# 웹 크롤링
selenium>=4.15.0    # 브라우저 자동화
beautifulsoup4>=4.12.0  # HTML 파싱
requests>=2.31.0    # HTTP 요청

# 알림 (텔레그램)
python-telegram-bot>=20.0  # 텔레그램 봇

# 알림 (SMS - 선택사항, 나중에 추가 가능)
# requests 패키지로 API 호출 가능 (별도 패키지 불필요)

# 스케줄링
schedule>=1.2.0     # 작업 스케줄링

# 유틸리티
python-dateutil>=2.8.0  # 날짜 처리
```

### 크롤링 방법

#### 서울대 연구공원 웨딩홀
- **방법**: Selenium (JavaScript 동적 로딩)
- **URL 패턴**: `https://www.snuwedding.co.kr/snu/reservation?year=2026&month=11`
- **감지 조건**: `class="avail"` 요소 확인

#### 서울대 이라운지
- **방법**: Requests + BeautifulSoup (정적 HTML)
- **URL**: 네이버 공개 캘린더
- **감지 조건**: `title` 속성에서 "완료" → "가능" 변화

---

## 🚀 실행 환경

### PC 버전 (메인)
- **실행 방식**: GUI 프로그램
- **확인 주기**: 1시간마다 무제한
- **장점**: 설정 변경 쉬움, 실시간 상태 확인
- **단점**: PC를 계속 켜놓아야 함

### PythonAnywhere 버전 (백업)
- **실행 방식**: 설정 파일 기반 자동 실행
- **확인 주기**: 하루 1번 (무료 플랜)
- **장점**: PC 안 켜놓아도 됨
- **단점**: 확인 주기 제한적

---

## ⚠️ 주의사항

### 법적/윤리적 고려사항
1. **자동 예약은 예약 "신청"만 가능**
   - 계약금 입금 후 직원 확인 필요
   - 완전 자동 확정 예약 불가

2. **사이트 부하 최소화**
   - 1시간마다 확인 (과도한 요청 방지)
   - 예약 신청은 실제 의사가 있을 때만

3. **개인정보 보호**
   - 예약 정보는 로컬에만 저장
   - 텔레그램 봇 토큰 노출 주의

### 기술적 제약사항
1. **네트워크 연결 필수**
2. **Selenium 사용 시 브라우저 드라이버 필요** (ChromeDriver 등)
3. **사이트 구조 변경 시 수정 필요**
4. **SMS 사용 시 추가 요구사항** (나중에 필요 시):
   - SMS 서비스 가입 (네이버 클라우드, 쿨SMS 등)
   - 발신번호 등록 및 승인 (1~2일 소요)
   - 초기 충전금 필요 (5,000~10,000원)
   - 건당 9~15원 과금

---

## 📝 개발 순서

### Phase 1: 기본 구조
1. GUI 기본 틀 구성
2. 날짜 선택 기능 (tkcalendar)
3. 설정 저장/불러오기

### Phase 2: 크롤링 기능
1. 연구공원 웨딩홀 크롤링
2. 이라운지 크롤링
3. 데이터 비교 및 변화 감지

### Phase 3: 알림 기능
1. 텔레그램 봇 연동
2. 알림 메시지 포맷팅
3. 알림 기록 표시
4. 확장 가능한 알림 구조 설계 (SMS 나중에 추가 용이)

### Phase 4: 자동 예약
1. Selenium 자동화
2. 폼 입력 및 제출
3. 성공/실패 감지

### Phase 5: 통합 및 테스트
1. 전체 기능 통합
2. 에러 처리
3. 실전 테스트

### Phase 6: PythonAnywhere 버전
1. GUI 제거
2. 설정 파일 기반 실행
3. 스케줄 설정

### Phase 7: SMS 확장 (선택사항)
1. SMS 서비스 API 연동
2. 중요 알림만 문자 전송 로직
3. GUI에 SMS 설정 추가
4. 비용 관리 기능

---

## 📊 알림 시스템 아키텍처

### 확장 가능한 구조 설계

```python
# notification_manager.py

class NotificationManager:
    """
    통합 알림 관리자
    텔레그램은 기본 구현, SMS는 나중에 쉽게 추가 가능
    """
    
    def __init__(self, config):
        self.config = config
        self.telegram_enabled = config.get('telegram', {}).get('enabled', True)
        self.sms_enabled = config.get('sms', {}).get('enabled', False)
        
        # 텔레그램 초기화 (1차 구현)
        if self.telegram_enabled:
            self._init_telegram()
        
        # SMS 초기화 (나중에 구현)
        if self.sms_enabled:
            self._init_sms()
    
    def send_notification(self, message, notification_type='info'):
        """
        통합 알림 전송
        
        Args:
            message: 알림 메시지
            notification_type: 'info' | 'critical'
                - info: 일반 알림 (텔레그램만)
                - critical: 중요 알림 (텔레그램 + SMS)
        """
        success = True
        
        # 텔레그램 전송 (항상)
        if self.telegram_enabled:
            success &= self._send_telegram(message)
        
        # SMS 전송 (중요 알림만, SMS 활성화 시)
        if self.sms_enabled and notification_type == 'critical':
            success &= self._send_sms(message)
        
        return success
    
    def _init_telegram(self):
        """텔레그램 봇 초기화 (1차 구현)"""
        import telegram
        self.telegram_bot = telegram.Bot(
            token=self.config['telegram']['bot_token']
        )
        self.telegram_chat_id = self.config['telegram']['chat_id']
    
    def _send_telegram(self, message):
        """텔레그램 메시지 전송 (1차 구현)"""
        try:
            self.telegram_bot.send_message(
                chat_id=self.telegram_chat_id,
                text=message,
                parse_mode='HTML'
            )
            return True
        except Exception as e:
            print(f"텔레그램 전송 실패: {e}")
            return False
    
    def _init_sms(self):
        """SMS 초기화 (나중에 구현)"""
        # TODO: SMS 서비스별 초기화
        # - 네이버 클라우드
        # - 쿨SMS
        # - 알리고 등
        pass
    
    def _send_sms(self, message):
        """SMS 전송 (나중에 구현)"""
        # TODO: SMS API 호출
        # service = self.config['sms']['service']
        # if service == 'naver':
        #     return self._send_naver_sms(message)
        # elif service == 'coolsms':
        #     return self._send_coolsms(message)
        pass


# 사용 예시
notifier = NotificationManager(config)

# 일반 알림 (텔레그램만)
notifier.send_notification(
    message="예약 가능 발견!",
    notification_type='info'
)

# 중요 알림 (텔레그램 + SMS, SMS 활성화 시)
notifier.send_notification(
    message="자동 예약 성공!",
    notification_type='critical'
)
```

### SMS 확장 시 추가할 코드

나중에 SMS 기능이 필요하면 아래 함수만 구현하면 됩니다:

```python
def _send_naver_sms(self, message):
    """네이버 클라우드 SMS 전송"""
    import requests
    import time
    import hmac
    import hashlib
    import base64
    
    service_id = self.config['sms']['service_id']
    access_key = self.config['sms']['api_key']
    secret_key = self.config['sms']['api_secret']
    from_number = self.config['sms']['from_number']
    to_number = self.config['sms']['to_number']
    
    # 서명 생성
    timestamp = str(int(time.time() * 1000))
    uri = f"/sms/v2/services/{service_id}/messages"
    sign_message = f"POST {uri}\n{timestamp}\n{access_key}"
    signature = base64.b64encode(
        hmac.new(
            secret_key.encode(),
            sign_message.encode(),
            hashlib.sha256
        ).digest()
    ).decode()
    
    # API 요청
    url = f"https://sens.apigw.ntruss.com{uri}"
    headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'x-ncp-apigw-timestamp': timestamp,
        'x-ncp-apigw-api-key-id': access_key,
        'x-ncp-apigw-signature-v2': signature
    }
    data = {
        'type': 'SMS',
        'from': from_number,
        'content': message[:80],  # SMS는 80자 제한
        'messages': [{'to': to_number}]
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        return response.status_code == 202
    except Exception as e:
        print(f"SMS 전송 실패: {e}")
        return False
```

### 확장의 장점

✅ **1차 구현 (현재)**
- 텔레그램만 구현
- 코드 간단, 빠른 완성
- 완전 무료

✅ **2차 확장 (나중에)**
- SMS 함수 15~20줄만 추가
- 기존 코드 수정 불필요
- config.json에서 enabled만 true로 변경
- GUI에 설정 섹션만 추가

✅ **유연한 사용**
- 텔레그램만 사용 가능
- SMS만 사용 가능
- 둘 다 사용 가능
- 중요 알림만 SMS 가능

---

## 🎯 완성 후 사용 방법

### 초기 설정
1. 프로그램 실행
2. 텔레그램 봇 설정 (Bot Token, Chat ID)
3. 날짜 설정 (기간 또는 특정 날짜)
4. 시간대별 동작 설정
5. `auto_reservation.py` 파일에서 예약 정보 수정

### 일상 사용
1. 프로그램 실행 후 [시작하기] 클릭
2. PC 켜놓기 (절전 모드 해제)
3. 텔레그램 알림 대기
4. 자동 예약 성공 시 예식장 연락 대기

### 외출/여행 시
- PythonAnywhere 버전 실행
- 하루 1번이라도 확인 유지

### SMS 추가가 필요할 때 (선택사항)
1. SMS 서비스 가입 (네이버 클라우드 또는 쿨SMS)
2. 발신번호 등록 및 승인 대기 (1~2일)
3. API 키 발급
4. config.json에서 `sms.enabled`를 `true`로 변경
5. SMS 설정 정보 입력
6. 프로그램 재시작

---

## 📞 예상 결과

### 최상의 시나리오
```
예약 가능 발견 (14:23:15)
→ 자동 예약 시도 (14:23:20)
→ 예약 신청 완료 (14:23:35)
→ 텔레그램 알림 (14:23:37)
→ 예식장 전화 연락 대기
→ 계약금 입금 후 예약 확정
```

### 예상 소요 시간
- 예약 가능 감지: 최대 1시간 (확인 주기)
- 자동 예약 시도: 약 10~20초
- 전체 프로세스: 1시간 이내 완료

---

## 📚 참고사항

### HTML 구조 분석 결과

#### 연구공원 예약 가능 버튼
```html
<a href="javascript:send_chk(4,'2026-11-01','일');" class="avail">예약가능</a>
```

#### 연구공원 예약 폼
- 필수 입력: name, type, tel, spouse_name, spouse_type, spouse_tel, email, spouse_email
- 선택 입력: person (예상 인원), content (기타 문의)
- 제출: `javascript:send_frm()` 호출

#### 이라운지 캘린더
```html
<div class="_schedule">
  <a title="11:00 완료">11:00 완료</a>  <!-- 예약 불가 -->
  <a title="17:00 가능">17:00 가능</a>  <!-- 예약 가능 -->
</div>
```

---

## 📞 SMS vs 텔레그램 비교

### 텔레그램 (기본 구현, 강력 추천!)

**장점:**
- ✅ 완전 무료 (무제한)
- ✅ 설정 5분이면 끝
- ✅ 푸시 알림 빠르고 확실함
- ✅ 다양한 형식 지원 (텍스트, 링크, 버튼, 이미지 등)
- ✅ 여러 기기에서 확인 가능 (폰, PC, 태블릿)
- ✅ 메시지 검색 및 보관 용이
- ✅ 알림 히스토리 무제한

**단점:**
- ❌ 텔레그램 앱 설치 필요 (무료)

**비용:**
- 💰 0원 (영구 무료)

---

### SMS (선택적 확장)

**장점:**
- ✅ 앱 설치 불필요
- ✅ 모든 휴대폰에서 수신 가능
- ✅ 긴급성이 높은 알림에 적합

**단점:**
- ❌ 건당 과금 (9~15원)
- ❌ 초기 설정 복잡 (회원가입, 발신번호 등록, API 키 발급)
- ❌ 발신번호 등록에 1~2일 소요
- ❌ 최소 충전금 필요 (5,000~10,000원)
- ❌ 텍스트만 가능 (링크, 이미지 불가)
- ❌ 80자 제한 (LMS는 건당 30~40원)

**비용 예상:**
```
1시간마다 확인 → 예약 가능 발견 시에만 전송
→ 월 평균 2~5건 예상
→ 월 30~100원 정도

하지만 초기 충전 5,000원 필요
```

---

### 추천 사용 방식

**방안 1: 텔레그램만 사용 (추천!) 💯**
- 완전 무료
- 설정 간단
- 기능 충분함
- 대부분의 사용자에게 최적

**방안 2: 텔레그램 + SMS (선택)**
- 일반 알림: 텔레그램 (무료)
- 중요 알림: 텔레그램 + SMS (이중 확인)
- 예: 자동 예약 성공 시에만 문자 추가
- 월 20~40원 정도 추가 비용

**방안 3: SMS만 사용 (비추천)**
- 비용 발생
- 기능 제한적
- 설정 복잡
- 거의 모든 면에서 텔레그램이 우수함

---

### 결론

**일단 텔레그램으로 시작하고, 나중에 정말 필요하면 SMS 추가하는 것을 추천합니다!**

프로그램은 처음부터 확장 가능하게 설계되어 있어서, 나중에 SMS가 필요하면 쉽게 추가할 수 있습니다.

---

*최종 수정일: 2025-11-08*
