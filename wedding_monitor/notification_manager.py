"""
통합 알림 관리자
텔레그램 2개 (신랑용, 신부용) 동시 알림 발송
"""

import asyncio
from telegram import Bot
from telegram.error import TelegramError
from datetime import datetime


class NotificationManager:
    """
    통합 알림 관리자
    신랑용/신부용 텔레그램 봇 2개에 동시 알림 전송
    """

    def __init__(self, config):
        self.config = config
        self.telegram_enabled = config.get('telegram', {}).get('enabled', True)

        # 텔레그램 봇 2개 초기화
        if self.telegram_enabled:
            self._init_telegram()

    def _init_telegram(self):
        """텔레그램 봇 2개 초기화"""
        telegram_config = self.config.get('telegram', {})

        # 신랑용 텔레그램
        groom_config = telegram_config.get('groom', {})
        if groom_config.get('bot_token') and groom_config.get('chat_id'):
            self.groom_bot = Bot(token=groom_config['bot_token'])
            self.groom_chat_id = groom_config['chat_id']
            self.groom_enabled = True
        else:
            self.groom_enabled = False

        # 신부용 텔레그램
        bride_config = telegram_config.get('bride', {})
        if bride_config.get('bot_token') and bride_config.get('chat_id'):
            self.bride_bot = Bot(token=bride_config['bot_token'])
            self.bride_chat_id = bride_config['chat_id']
            self.bride_enabled = True
        else:
            self.bride_enabled = False

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
        통합 알림 전송 (신랑용, 신부용 동시 발송)

        Args:
            message: 알림 메시지
            notification_type: 'info' | 'critical'
        """
        if not self.telegram_enabled:
            print("텔레그램 알림이 비활성화되어 있습니다.")
            return False

        # 비동기 전송을 위한 이벤트 루프 실행
        return asyncio.run(self._send_to_all_bots(message))

    async def _send_to_all_bots(self, message):
        """모든 활성화된 봇에게 동시 전송"""
        tasks = []

        # 신랑용 봇 전송
        if self.groom_enabled:
            tasks.append(self._send_telegram_async(
                self.groom_bot,
                self.groom_chat_id,
                f"👰‍♂️ [신랑용 알림]\n\n{message}"
            ))

        # 신부용 봇 전송
        if self.bride_enabled:
            tasks.append(self._send_telegram_async(
                self.bride_bot,
                self.bride_chat_id,
                f"👰‍♀️ [신부용 알림]\n\n{message}"
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

    def format_auto_reservation_start(self, venue_name, date, time, groom_name, bride_name):
        """자동 예약 시작 알림 포맷"""
        message = f"""
━━━━━━━━━━━━━━━━
⏳ 자동 예약 시도 중...

📍 {venue_name}
📅 {date}
⏰ {time}

👰‍♂️ 신랑: {groom_name}
👰‍♀️ 신부: {bride_name}

잠시만 기다려주세요...
━━━━━━━━━━━━━━━━
"""
        return message.strip()

    def format_auto_reservation_success(self, venue_name, date, time, groom_info, bride_info):
        """자동 예약 성공 알림 포맷"""
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        message = f"""
━━━━━━━━━━━━━━━━
✅ 예약 신청 완료!

📍 {venue_name}
📅 {date}
⏰ {time}

신청 정보:
👰‍♂️ 신랑: {groom_info['name']}
📞 {groom_info['tel']}
👰‍♀️ 신부: {bride_info['name']}
📞 {bride_info['tel']}

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
