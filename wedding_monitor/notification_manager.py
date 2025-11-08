"""
통합 알림 관리자
텔레그램 2개 동시 알림 발송 + SOLAPI (구 CoolSMS)
"""

import asyncio
from telegram import Bot
from telegram.error import TelegramError
from datetime import datetime, timezone
import requests
import hmac
import hashlib
import secrets


class NotificationManager:
    """
    통합 알림 관리자
    텔레그램 봇 2개에 동시 알림 전송
    """

    def __init__(self, config):
        self.config = config
        self.telegram_enabled = config.get('telegram', {}).get('enabled', True)
        self.sms_enabled = config.get('sms', {}).get('enabled', False)

        # 텔레그램 봇 2개 초기화
        if self.telegram_enabled:
            self._init_telegram()

        # SMS 초기화
        if self.sms_enabled:
            self._init_sms()

    def _init_telegram(self):
        """텔레그램 봇 2개 초기화"""
        telegram_config = self.config.get('telegram', {})

        # 텔레그램 1
        groom_config = telegram_config.get('groom', {})
        if groom_config.get('bot_token') and groom_config.get('chat_id'):
            self.groom_bot = Bot(token=groom_config['bot_token'])
            self.groom_chat_id = groom_config['chat_id']
            self.groom_enabled = True
        else:
            self.groom_enabled = False

        # 텔레그램 2
        bride_config = telegram_config.get('bride', {})
        if bride_config.get('bot_token') and bride_config.get('chat_id'):
            self.bride_bot = Bot(token=bride_config['bot_token'])
            self.bride_chat_id = bride_config['chat_id']
            self.bride_enabled = True
        else:
            self.bride_enabled = False

    def _init_sms(self):
        """SOLAPI (구 CoolSMS) 초기화 (API 정보 하드코딩)"""
        # 하드코딩된 API 정보
        self.sms_api_key = 'NCSCPNC7FTNKV0SZ'
        self.sms_api_secret = 'CWEIJDIRZAXL76F2NG879T8J9P6SCNGM'
        self.sms_from_number = '010-6454-5181'

        # 수신번호만 config에서 로드
        sms_config = self.config.get('sms', {})
        self.sms_to_numbers = sms_config.get('to_numbers', [])  # 리스트

    def _create_auth_header(self):
        """SOLAPI HMAC-SHA256 인증 헤더 생성"""
        # 현재 시간 (ISO 8601 형식)
        date_time = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # 랜덤 salt 생성 (32자 hex)
        salt = secrets.token_hex(16)

        # HMAC-SHA256 서명 생성
        data = date_time + salt
        signature = hmac.new(
            self.sms_api_secret.encode(),
            data.encode(),
            hashlib.sha256
        ).hexdigest()

        # Authorization 헤더
        return f"HMAC-SHA256 apiKey={self.sms_api_key}, date={date_time}, salt={salt}, signature={signature}"

    def _send_coolsms(self, message):
        """SOLAPI (구 CoolSMS) 메시지 전송"""
        if not all([self.sms_api_key, self.sms_api_secret,
                    self.sms_from_number, self.sms_to_numbers]):
            print("SMS 설정이 완전하지 않습니다.")
            return False

        try:
            # SOLAPI API 엔드포인트
            url = "https://api.solapi.com/messages/v4/send-many/detail"

            # 인증 헤더 생성
            auth_header = self._create_auth_header()

            headers = {
                'Authorization': auth_header,
                'Content-Type': 'application/json'
            }

            # SMS 내용 (80자 제한)
            sms_content = message[:80] if len(message) > 80 else message

            # 여러 수신자에게 전송
            messages = []
            for to_number in self.sms_to_numbers:
                messages.append({
                    'to': to_number.replace('-', ''),  # 하이픈 제거
                    'from': self.sms_from_number.replace('-', ''),
                    'text': sms_content
                })

            data = {
                'messages': messages
            }

            response = requests.post(url, headers=headers, json=data)

            if response.status_code == 200:
                print(f"SMS 전송 성공: {len(self.sms_to_numbers)}명")
                return True
            else:
                print(f"SMS 전송 실패: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            print(f"SMS 전송 오류: {e}")
            return False

    async def _send_telegram_async(self, bot, chat_id, message):
        """비동기 텔레그램 메시지 전송"""
        try:
            await bot.send_message(
                chat_id=chat_id,
                text=message,
                parse_mode='HTML'
            )
            return True
        except TelegramError as e:
            print(f"텔레그램 전송 실패: {e}")
            return False

    def send_notification(self, message, notification_type='info'):
        """
        통합 알림 전송 (텔레그램 + SMS)

        Args:
            message: 알림 메시지
            notification_type: 'info' | 'critical'
        """
        success = True

        # 텔레그램 전송
        if self.telegram_enabled:
            telegram_success = asyncio.run(self._send_to_all_bots(message))
            success &= telegram_success
        else:
            print("텔레그램 알림이 비활성화되어 있습니다.")

        # SMS 전송 (활성화된 경우)
        if self.sms_enabled:
            sms_success = self._send_coolsms(message)
            success &= sms_success

        return success

    async def _send_to_all_bots(self, message):
        """모든 활성화된 봇에게 동시 전송"""
        tasks = []

        # 텔레그램 1 전송
        if self.groom_enabled:
            tasks.append(self._send_telegram_async(
                self.groom_bot,
                self.groom_chat_id,
                f"📱 [텔레그램 1]\n\n{message}"
            ))

        # 텔레그램 2 전송
        if self.bride_enabled:
            tasks.append(self._send_telegram_async(
                self.bride_bot,
                self.bride_chat_id,
                f"📱 [텔레그램 2]\n\n{message}"
            ))

        if not tasks:
            print("활성화된 텔레그램 봇이 없습니다.")
            return False

        # 동시 전송
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 하나라도 성공하면 True
        return any(result is True for result in results)

    def format_availability_alert(self, venue_name, date, time, status_change):
        """예약 가능 알림 포맷"""
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        message = f"""
━━━━━━━━━━━━━━━━
🔔 예약 가능 발견!

📍 {venue_name}
📅 {date}
⏰ {time}

상태 변경: {status_change}

발견 시각: {current_time}
━━━━━━━━━━━━━━━━
"""
        return message.strip()

    def format_auto_reservation_start(self, venue_name, date, time, person1_name, person2_name):
        """자동 예약 시작 알림 포맷"""
        message = f"""
━━━━━━━━━━━━━━━━
⏳ 자동 예약 시도 중...

📍 {venue_name}
📅 {date}
⏰ {time}

예약자: {person1_name}, {person2_name}

잠시만 기다려주세요...
━━━━━━━━━━━━━━━━
"""
        return message.strip()

    def format_auto_reservation_success(self, venue_name, date, time, person1_info, person2_info):
        """자동 예약 성공 알림 포맷"""
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        message = f"""
━━━━━━━━━━━━━━━━
✅ 예약 신청 완료!

📍 {venue_name}
📅 {date}
⏰ {time}

신청 정보:
👤 {person1_info['name']} ({person1_info['tel']})
👤 {person2_info['name']} ({person2_info['tel']})

⚠️ 중요!
직원 확인 후 전화 연락 예정
계약금 입금 전까지는 예약 미확정

신청 시각: {current_time}
━━━━━━━━━━━━━━━━
"""
        return message.strip()

    def format_auto_reservation_failure(self, venue_name, date, time, reason):
        """자동 예약 실패 알림 포맷"""
        message = f"""
━━━━━━━━━━━━━━━━
❌ 예약 신청 실패

📍 {venue_name}
📅 {date}
⏰ {time}

실패 사유: {reason}

🔄 수동으로 재시도해주세요
🌐 https://www.snuwedding.co.kr/snu/reservation
━━━━━━━━━━━━━━━━
"""
        return message.strip()


# 테스트 코드
if __name__ == "__main__":
    # 테스트용 config
    test_config = {
        'telegram': {
            'enabled': True,
            'groom': {
                'bot_token': 'YOUR_GROOM_BOT_TOKEN',
                'chat_id': 'YOUR_GROOM_CHAT_ID'
            },
            'bride': {
                'bot_token': 'YOUR_BRIDE_BOT_TOKEN',
                'chat_id': 'YOUR_BRIDE_CHAT_ID'
            }
        }
    }

    notifier = NotificationManager(test_config)

    # 테스트 메시지
    test_message = notifier.format_availability_alert(
        venue_name="서울대 연구공원 웨딩홀",
        date="2026년 11월 01일 (일)",
        time="오전 11시",
        status_change="예약완료 → 예약가능"
    )

    print("테스트 메시지:")
    print(test_message)
    print("\n실제 전송하려면 bot_token과 chat_id를 설정하세요.")
