"""
자동 예약 기능
서울대 연구공원 웨딩홀 자동 예약 신청
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time


# ============================================
# 예약 정보 설정 (여기를 수정하세요!)
# ============================================
RESERVATION_INFO = {
    # 예약자 1 정보
    "groom_name": "홍길동",
    "groom_tel": "010-1234-5678",
    "groom_email": "groom@email.com",

    # 예약자 2 정보
    "bride_name": "김영희",
    "bride_tel": "010-5678-1234",
    "bride_email": "bride@email.com",

    # 예상 인원: "250~300명" / "300~400명" / "400명 이상"
    "expected_people": "300~400명",

    # 기타 문의사항 (선택)
    "etc_message": "예약 확인 부탁드립니다."
}


class AutoReservation:
    """자동 예약 실행"""

    def __init__(self, reservation_info=None):
        if reservation_info is None:
            self.info = RESERVATION_INFO
        else:
            self.info = reservation_info

    def reserve(self, date, time_slot, headless=True):
        """
        예약 신청 실행

        Args:
            date: 예약 날짜 (예: '2026-11-01')
            time_slot: 시간대 (예: '11:00')
            headless: 백그라운드 실행 여부

        Returns:
            dict: {'success': True/False, 'message': '결과 메시지'}
        """
        print(f"자동 예약 시도: {date} {time_slot}")

        # Selenium 설정
        chrome_options = Options()
        if headless:
            chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')

        driver = None

        try:
            # ChromeDriver 자동 설치 및 실행
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)

            # 1. 예약 페이지 접속
            date_parts = date.split('-')
            year, month = date_parts[0], date_parts[1]
            url = f"https://www.snuwedding.co.kr/snu/reservation?year={year}&month={month}"

            driver.get(url)
            time.sleep(2)

            # 2. 예약 가능 버튼 클릭
            # javascript:send_chk(4,'2026-11-01','일');
            weekday = self._get_weekday_kr(date)
            time_label = self._get_time_label(time_slot)

            # 예약 가능 링크 찾기
            try:
                # class="avail" 인 링크 중 해당 날짜와 시간이 맞는 것 찾기
                avail_links = driver.find_elements(
                    By.CSS_SELECTOR,
                    f"a.avail[href*='{date}']"
                )

                target_link = None
                for link in avail_links:
                    if time_label in link.text:
                        target_link = link
                        break

                if not target_link:
                    return {
                        'success': False,
                        'message': '예약 가능 버튼을 찾을 수 없습니다. 이미 예약되었을 수 있습니다.'
                    }

                # 버튼 클릭
                target_link.click()
                time.sleep(1)

            except Exception as e:
                return {
                    'success': False,
                    'message': f'예약 버튼 클릭 실패: {str(e)}'
                }

            # 3. 예약 폼 입력
            try:
                # 신랑 정보
                driver.find_element(By.NAME, "name").send_keys(self.info['groom_name'])
                driver.find_element(By.NAME, "tel").send_keys(self.info['groom_tel'])
                driver.find_element(By.NAME, "email").send_keys(self.info['groom_email'])

                # 신랑 구분 (라디오 버튼)
                groom_radio = driver.find_element(By.CSS_SELECTOR, "input[name='type'][value='신랑']")
                driver.execute_script("arguments[0].click();", groom_radio)

                # 신부 정보
                driver.find_element(By.NAME, "spouse_name").send_keys(self.info['bride_name'])
                driver.find_element(By.NAME, "spouse_tel").send_keys(self.info['bride_tel'])
                driver.find_element(By.NAME, "spouse_email").send_keys(self.info['bride_email'])

                # 신부 구분 (라디오 버튼)
                bride_radio = driver.find_element(By.CSS_SELECTOR, "input[name='spouse_type'][value='신부']")
                driver.execute_script("arguments[0].click();", bride_radio)

                # 예상 인원 (셀렉트 박스)
                people_select = driver.find_element(By.NAME, "person")
                for option in people_select.find_elements(By.TAG_NAME, "option"):
                    if self.info['expected_people'] in option.text:
                        option.click()
                        break

                # 기타 문의사항
                if self.info.get('etc_message'):
                    driver.find_element(By.NAME, "content").send_keys(self.info['etc_message'])

                # 개인정보 동의 체크박스
                agree_checkbox = driver.find_element(By.ID, "agree")
                driver.execute_script("arguments[0].click();", agree_checkbox)

                time.sleep(1)

            except Exception as e:
                return {
                    'success': False,
                    'message': f'폼 입력 실패: {str(e)}'
                }

            # 4. 예약 신청 제출
            try:
                # javascript:send_frm() 실행
                driver.execute_script("send_frm();")
                time.sleep(2)

                # 성공/실패 확인
                # alert 또는 페이지 변경 확인
                # 실제 사이트 구조에 따라 수정 필요

                return {
                    'success': True,
                    'message': '예약 신청이 완료되었습니다. 직원 확인 후 연락 예정입니다.'
                }

            except Exception as e:
                return {
                    'success': False,
                    'message': f'예약 제출 실패: {str(e)}'
                }

        except Exception as e:
            return {
                'success': False,
                'message': f'예약 프로세스 오류: {str(e)}'
            }

        finally:
            if driver:
                driver.quit()

    def _get_weekday_kr(self, date_str):
        """날짜에서 요일 추출 (한글)"""
        from datetime import datetime
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        weekdays_kr = ['월', '화', '수', '목', '금', '토', '일']
        return weekdays_kr[date_obj.weekday()]

    def _get_time_label(self, time_slot):
        """시간 슬롯을 한글 라벨로 변환"""
        time_mapping = {
            '11:00': '오전 11시',
            '13:00': '오후 1시',
            '15:00': '오후 3시',
            '17:00': '오후 5시',
            '18:30': '오후 6시30분'
        }
        return time_mapping.get(time_slot, time_slot)


# 테스트 코드
if __name__ == "__main__":
    print("=" * 50)
    print("자동 예약 테스트")
    print("=" * 50)
    print("\n현재 설정된 예약 정보:")
    print(f"신랑: {RESERVATION_INFO['groom_name']} ({RESERVATION_INFO['groom_tel']})")
    print(f"신부: {RESERVATION_INFO['bride_name']} ({RESERVATION_INFO['bride_tel']})")
    print(f"예상 인원: {RESERVATION_INFO['expected_people']}")
    print("\n실제 예약을 테스트하려면 아래 주석을 해제하세요.")
    print("주의: 실제 예약 신청이 진행됩니다!")
    print("=" * 50)

    # 실제 예약 테스트 (주의!)
    # auto_reserve = AutoReservation()
    # result = auto_reserve.reserve(
    #     date='2026-11-01',
    #     time_slot='11:00',
    #     headless=False  # 브라우저 보면서 실행
    # )
    # print(f"\n결과: {result}")
