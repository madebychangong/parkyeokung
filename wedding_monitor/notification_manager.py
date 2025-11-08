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
        """텔레그램 봇 초기화 (하드코딩)"""
        # 하드코딩된 텔레그램 정보
        self.bot_token = "8226395653:AAELjJQhqoQYHIRGC5yrlHL3SAn_U37CNyM"
        self.chat_id = "-5021213184"

        # 봇 초기화
        self.telegram_bot = Bot(token=self.bot_token)
        self.telegram_bot_enabled = True

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
            # Create new event loop for each call to avoid "Event loop is closed" error
            print(f"[DEBUG] 텔레그램 전송 시작: '{message[:50]}...'")
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                print(f"[DEBUG] Event loop 생성됨: {loop}")
                telegram_success = loop.run_until_complete(self._send_to_all_bots(message))
                print(f"[DEBUG] 텔레그램 전송 결과: {telegram_success}")
                success &= telegram_success
            except Exception as e:
                print(f"[DEBUG] 텔레그램 전송 중 예외 발생: {e}")
                import traceback
                traceback.print_exc()
                success = False
            finally:
                print(f"[DEBUG] Event loop 닫는 중...")
                loop.close()
                print(f"[DEBUG] Event loop 닫힘")
        else:
            print("텔레그램 알림이 비활성화되어 있습니다.")

        # SMS 전송 (활성화된 경우)
        if self.sms_enabled:
            sms_success = self._send_coolsms(message)
            success &= sms_success

        return success

    async def _send_to_all_bots(self, message):
        """텔레그램 그룹방에 메시지 전송"""
        if not self.telegram_bot_enabled:
            print("텔레그램 봇이 비활성화되어 있습니다.")
            return False

        # 텔레그램 그룹방에 전송
        return await self._send_telegram_async(
            self.telegram_bot,
            self.chat_id,
            f"🔔 {message}"
        )

    def format_availability_alert(self, venue_name, date, time, status_change, venue_code=None):
        """예약 가능 알림 포맷 (45자 이내)"""
        # 날짜 축약: "2026년 11월 01일 (일)" -> "11/01(일)"
        import re
        date_match = re.search(r'(\d+)월 (\d+)일 \((.)\)', date)
        if date_match:
            month, day, weekday = date_match.groups()
            date_short = f"{month}/{day}({weekday})"
        else:
            date_short = date[:10]  # fallback

        # 시간 축약: "오전 11시" -> "오전11시" (공백 제거)
        time_short = time.replace(' ', '')

        # 예식장 이름 축약
        if '연구공원' in venue_name:
            venue_short = '연구공원'
        elif '이라운지' in venue_name:
            venue_short = '이라운지'
        else:
            venue_short = venue_name[:5]

        # 이라운지는 전화번호 포함
        if '이라운지' in venue_name or venue_code == 'elounge':
            message = f"{date_short} {time_short} {venue_short} 가능 ☎02-875-7761"
        else:
            message = f"{date_short} {time_short} {venue_short} 예약가능"

        return message

    def format_auto_reservation_start(self, venue_name, date, time, person1_name, person2_name):
        """자동 예약 시작 알림 포맷 (45자 이내)"""
        # 날짜 축약
        import re
        date_match = re.search(r'(\d+)월 (\d+)일 \((.)\)', date)
        if date_match:
            month, day, weekday = date_match.groups()
            date_short = f"{month}/{day}({weekday})"
        else:
            date_short = date[:10]

        # 시간 축약
        time_short = time.replace(' ', '')

        # 예식장 축약
        venue_short = '연구공원' if '연구공원' in venue_name else venue_name[:5]

        message = f"{date_short} {time_short} {venue_short} 자동예약 시도중"
        return message

    def format_auto_reservation_success(self, venue_name, date, time, person1_info, person2_info):
        """자동 예약 성공 알림 포맷 (45자 이내)"""
        # 날짜 축약
        import re
        date_match = re.search(r'(\d+)월 (\d+)일 \((.)\)', date)
        if date_match:
            month, day, weekday = date_match.groups()
            date_short = f"{month}/{day}({weekday})"
        else:
            date_short = date[:10]

        # 시간 축약
        time_short = time.replace(' ', '')

        # 예식장 축약
        venue_short = '연구공원' if '연구공원' in venue_name else venue_name[:5]

        message = f"{date_short} {time_short} {venue_short} 예약신청 완료!"
        return message

    def format_auto_reservation_failure(self, venue_name, date, time, reason):
        """자동 예약 실패 알림 포맷 (45자 이내)"""
        # 날짜 축약
        import re
        date_match = re.search(r'(\d+)월 (\d+)일 \((.)\)', date)
        if date_match:
            month, day, weekday = date_match.groups()
            date_short = f"{month}/{day}({weekday})"
        else:
            date_short = date[:10]

        # 시간 축약
        time_short = time.replace(' ', '')

        # 예식장 축약
        venue_short = '연구공원' if '연구공원' in venue_name else venue_name[:5]

        # 실패 사유 축약 (20자 이내)
        reason_short = reason[:20] if len(reason) > 20 else reason

        message = f"{date_short} {time_short} {venue_short} 예약실패"
        return message


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
