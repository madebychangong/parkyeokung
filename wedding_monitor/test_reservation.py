"""
예약 폼 작성 테스트
실제 예약 신청 버튼은 누르지 않고, 폼 작성까지만 테스트
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import NoAlertPresentException
from webdriver_manager.chrome import ChromeDriverManager
from datetime import datetime
import time

# 테스트할 예약 정보
TEST_INFO = {
    "groom_name": "황태준",
    "groom_tel": "010-3096-0329",
    "groom_email": "hwangt222@naver.com",
    "bride_name": "박여경",
    "bride_tel": "010-3895-8291",
    "bride_email": "finnkaypee@gmail.com",
    "expected_people": "250~300명",
    "etc_message": "예약 테스트입니다."
}

# 테스트할 날짜와 시간대 (실제 예약 가능한 날짜로 변경 필요)
TEST_DATE = "2025-11-09"  # 예약 가능한 날짜
TEST_TIME = "17:00"  # 오후 5시


def test_reservation_form():
    """예약 폼 작성 테스트"""

    print("=" * 60)
    print("예약 폼 작성 테스트 시작")
    print("=" * 60)
    print(f"\n테스트 날짜: {TEST_DATE}")
    print(f"테스트 시간: {TEST_TIME}")
    print(f"신랑: {TEST_INFO['groom_name']} ({TEST_INFO['groom_tel']})")
    print(f"신부: {TEST_INFO['bride_name']} ({TEST_INFO['bride_tel']})")
    print(f"예상 인원: {TEST_INFO['expected_people']}")
    print("\n주의: 브라우저가 열립니다. 폼 작성을 확인하세요.")
    print("최종 '예약 신청' 버튼은 자동으로 클릭하지 않습니다.\n")

    # Selenium 설정 (브라우저 보이게)
    chrome_options = Options()
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    # headless 모드 OFF - 브라우저 보이게

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

        print(f"[1/5] 페이지 접속: {url}")
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
        print(f"\n[2/5] 예약 가능 버튼 찾는 중...")

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
            print(f"   날짜 {TEST_DATE}의 {TEST_TIME} 시간대가 예약 가능한지 확인하세요.")
            input("\n아무 키나 눌러 브라우저를 종료하세요...")
            return False

        # 버튼 클릭
        print(f"      버튼 클릭...")
        target_link.click()
        time.sleep(3)

        # 3. 예약 폼 입력
        print(f"\n[3/5] 예약 폼 작성 중...")

        try:
            # 예상 인원
            person_radio = driver.find_element(
                By.CSS_SELECTOR,
                f"input[name='person'][value='{TEST_INFO['expected_people']}']"
            )
            driver.execute_script("arguments[0].click();", person_radio)
            print(f"      ✓ 예상 인원: {TEST_INFO['expected_people']}")

            # 신랑 이름
            driver.find_element(By.NAME, "name").send_keys(TEST_INFO['groom_name'])
            print(f"      ✓ 신랑 이름: {TEST_INFO['groom_name']}")

            # 신랑 구분
            groom_radio = driver.find_element(By.CSS_SELECTOR, "input[name='type'][value='신랑']")
            driver.execute_script("arguments[0].click();", groom_radio)

            # 신랑 연락처
            driver.find_element(By.NAME, "tel").send_keys(TEST_INFO['groom_tel'])
            print(f"      ✓ 신랑 연락처: {TEST_INFO['groom_tel']}")

            # 신부 이름
            driver.find_element(By.NAME, "spouse_name").send_keys(TEST_INFO['bride_name'])
            print(f"      ✓ 신부 이름: {TEST_INFO['bride_name']}")

            # 신부 구분
            bride_radio = driver.find_element(By.CSS_SELECTOR, "input[name='spouse_type'][value='신부']")
            driver.execute_script("arguments[0].click();", bride_radio)

            # 신부 연락처
            driver.find_element(By.NAME, "spouse_tel").send_keys(TEST_INFO['bride_tel'])
            print(f"      ✓ 신부 연락처: {TEST_INFO['bride_tel']}")

            # 신랑 이메일
            driver.find_element(By.NAME, "email").send_keys(TEST_INFO['groom_email'])
            print(f"      ✓ 신랑 이메일: {TEST_INFO['groom_email']}")

            # 신부 이메일
            driver.find_element(By.NAME, "spouse_email").send_keys(TEST_INFO['bride_email'])
            print(f"      ✓ 신부 이메일: {TEST_INFO['bride_email']}")

            # 기타 문의
            if TEST_INFO.get('etc_message'):
                driver.find_element(By.NAME, "content").send_keys(TEST_INFO['etc_message'])
                print(f"      ✓ 기타 문의: {TEST_INFO['etc_message']}")

            time.sleep(1)

        except Exception as e:
            print(f"\n❌ 폼 입력 실패: {e}")
            import traceback
            traceback.print_exc()
            input("\n아무 키나 눌러 브라우저를 종료하세요...")
            return False

        # 4. 개인정보 동의 체크
        print(f"\n[4/5] 개인정보 동의 체크...")

        try:
            agree_checkbox = driver.find_element(By.ID, "term_agree")
            driver.execute_script("arguments[0].click();", agree_checkbox)
            print(f"      ✓ 개인정보 동의 체크 완료")

        except Exception as e:
            print(f"\n❌ 동의 체크 실패: {e}")
            import traceback
            traceback.print_exc()
            input("\n아무 키나 눌러 브라우저를 종료하세요...")
            return False

        # 5. 사용자 확인
        print(f"\n[5/5] 폼 작성 완료!")
        print("\n" + "=" * 60)
        print("✅ 테스트 성공!")
        print("=" * 60)
        print("\n브라우저에서 작성된 내용을 확인하세요.")
        print("주의: '예약 신청' 버튼을 누르면 실제로 예약이 신청됩니다!")
        print("\n테스트를 종료하려면 아무 키나 누르세요...")
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
    print("2. 브라우저가 열리고 자동으로 폼을 작성합니다.")
    print("3. 최종 '예약 신청' 버튼은 자동으로 클릭하지 않습니다.")
    print("4. 테스트 완료 후 브라우저를 수동으로 종료하거나 Enter를 누르세요.\n")

    response = input("테스트를 시작하시겠습니까? (y/N): ")

    if response.lower() == 'y':
        success = test_reservation_form()

        if success:
            print("\n✅ 모든 테스트가 성공적으로 완료되었습니다!")
        else:
            print("\n❌ 테스트 실패. 위의 오류 메시지를 확인하세요.")
    else:
        print("\n테스트 취소됨")
