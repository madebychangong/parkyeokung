"""
빈 폼으로 예약 신청 버튼 테스트
폼을 채우지 않고 예약 신청 버튼을 눌러서 검증 메시지 확인
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import NoAlertPresentException
from webdriver_manager.chrome import ChromeDriverManager
from datetime import datetime
import time

# 테스트할 날짜와 시간대 (실제 예약 가능한 날짜로 변경 필요)
TEST_DATE = "2025-11-09"  # 예약 가능한 날짜
TEST_TIME = "17:00"  # 오후 5시


def test_empty_submit():
    """빈 폼으로 예약 신청 테스트"""

    print("=" * 60)
    print("빈 폼 제출 테스트 시작")
    print("=" * 60)
    print(f"\n테스트 날짜: {TEST_DATE}")
    print(f"테스트 시간: {TEST_TIME}")
    print("\n목적: 폼 검증 메시지 확인")
    print("폼을 채우지 않고 예약 신청 버튼을 눌러봅니다.\n")

    # Selenium 설정 (브라우저 보이게)
    chrome_options = Options()
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')

    driver = None

    try:
        # ChromeDriver 실행
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.maximize_window()

        # 1. 예약 페이지 접속
        date_parts = TEST_DATE.split('-')
        year, month = date_parts[0], date_parts[1]
        url = f"https://www.snuwedding.co.kr/snu/reservation?year={year}&month={month}"

        print(f"[1/3] 페이지 접속: {url}")
        driver.get(url)
        time.sleep(3)

        # Alert 처리
        try:
            alert = driver.switch_to.alert
            alert_text = alert.text
            print(f"      Alert 감지: {alert_text}")
            alert.accept()

            if "오픈하지 않은" in alert_text or "아직" in alert_text:
                print(f"\n❌ 실패: {alert_text}")
                return False

        except NoAlertPresentException:
            pass

        # 2. 예약 가능 버튼 찾기 및 클릭
        print(f"\n[2/3] 예약 가능 버튼 클릭...")

        date_obj = datetime.strptime(TEST_DATE, '%Y-%m-%d')
        day = date_obj.day

        time_slot_index = {
            '11:00': 0,
            '13:00': 1,
            '15:00': 2,
            '17:00': 3,
            '18:30': 4
        }
        time_index = time_slot_index.get(TEST_TIME)

        if time_index is None:
            print(f"❌ 잘못된 시간대: {TEST_TIME}")
            return False

        # reservation-list__record에서 해당 날짜 찾기
        records = driver.find_elements(By.CSS_SELECTOR, "div.reservation-list__record")

        target_link = None
        for record in records:
            day_div = record.find_element(By.CSS_SELECTOR, "div")
            day_text = day_div.text.strip()
            day_num = int(day_text.split()[0])

            if day_num == day:
                links = record.find_elements(By.TAG_NAME, "a")

                if len(links) > time_index:
                    link = links[time_index]
                    link_classes = link.get_attribute('class')

                    if 'avail' in (link_classes or ''):
                        target_link = link
                        print(f"      예약 가능 버튼 발견!")
                        break

        if not target_link:
            print(f"❌ 예약 가능 버튼을 찾을 수 없습니다.")
            input("\n아무 키나 눌러 브라우저를 종료하세요...")
            return False

        # 버튼 클릭
        print(f"      버튼 클릭...")
        target_link.click()
        time.sleep(3)

        # 3. 폼을 채우지 않고 바로 예약 신청 버튼 클릭
        print(f"\n[3/3] 빈 폼 상태로 예약 신청 버튼 클릭...")
        print(f"      폼 입력 스킵 - 검증 메시지 확인 목적")

        try:
            # 예약 신청 버튼 찾기
            reserve_btn = driver.find_element(By.ID, "reserve-btn")
            print(f"      예약 신청 버튼 클릭!")
            reserve_btn.click()
            time.sleep(2)

            # Alert 확인
            try:
                alert = driver.switch_to.alert
                alert_text = alert.text
                print(f"\n✅ 검증 Alert 감지:")
                print(f"      메시지: {alert_text}")
                alert.accept()

                print(f"\n폼 검증이 작동합니다!")

            except NoAlertPresentException:
                print(f"\n⚠️ Alert 없음 - 페이지 변경 확인")
                time.sleep(1)

                # 현재 URL 확인
                current_url = driver.current_url
                print(f"      현재 URL: {current_url}")

                # 페이지 소스에서 에러 메시지 찾기
                page_source = driver.page_source
                if "필수" in page_source or "입력" in page_source:
                    print(f"      페이지에 검증 메시지가 있을 수 있습니다.")

        except Exception as e:
            print(f"\n❌ 버튼 클릭 실패: {e}")
            import traceback
            traceback.print_exc()

        # 사용자 확인
        print("\n" + "=" * 60)
        print("브라우저에서 결과를 확인하세요.")
        print("=" * 60)
        print("\n종료하려면 아무 키나 누르세요...")
        input()

        return True

    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        input("\n아무 키나 눌러 브라우저를 종료하세요...")
        return False

    finally:
        if driver:
            driver.quit()
            print("\n브라우저 종료됨")


if __name__ == "__main__":
    print("\n⚠️  주의 사항:")
    print("1. TEST_DATE와 TEST_TIME을 실제 예약 가능한 날짜/시간으로 수정하세요.")
    print("2. 폼을 채우지 않고 예약 신청 버튼을 눌러 검증을 확인합니다.")
    print("3. 브라우저가 열리고 자동으로 진행됩니다.\n")

    response = input("테스트를 시작하시겠습니까? (y/N): ")

    if response.lower() == 'y':
        success = test_empty_submit()

        if success:
            print("\n✅ 테스트 완료!")
        else:
            print("\n❌ 테스트 실패")
    else:
        print("\n테스트 취소됨")
