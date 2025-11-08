"""
예약 확인 로직
서울대 연구공원 웨딩홀, 서울대 이라운지 예약 상황 크롤링 및 변화 감지
"""

import json
import os
from datetime import datetime, timedelta
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import UnexpectedAlertPresentException, NoAlertPresentException
from webdriver_manager.chrome import ChromeDriverManager
import requests
from bs4 import BeautifulSoup
import time


class WeddingChecker:
    """예식장 예약 상황 확인 및 변화 감지"""

    def __init__(self, data_file='wedding_data.json'):
        self.data_file = data_file
        self.previous_data = self.load_data()

    def load_data(self):
        """이전 데이터 로드"""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"데이터 로드 실패: {e}")
                return self._get_empty_data()
        return self._get_empty_data()

    def save_data(self, data):
        """현재 데이터 저장"""
        data['last_update'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        try:
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"데이터 저장 실패: {e}")

    def _get_empty_data(self):
        """빈 데이터 구조"""
        return {
            'last_update': None,
            'research_park': {},
            'elounge': {}
        }

    def check_research_park(self, target_dates, time_slots):
        """
        서울대 연구공원 웨딩홀 확인

        Args:
            target_dates: 확인할 날짜 리스트 ['2025-11-01', ...]
            time_slots: 확인할 시간대 {'11:00': True, '13:00': True, ...}

        Returns:
            dict: 날짜별 시간대별 예약 상황
        """
        print("연구공원 웨딩홀 확인 중...")

        result = {}

        # Selenium 설정
        chrome_options = Options()
        chrome_options.add_argument('--headless')  # 백그라운드 실행
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')

        driver = None

        try:
            # ChromeDriver 자동 설치 및 실행
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)

            # 날짜를 년월별로 그룹화
            dates_by_month = {}
            for date_str in target_dates:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                year_month = f"{date_obj.year}-{date_obj.month:02d}"
                if year_month not in dates_by_month:
                    dates_by_month[year_month] = []
                dates_by_month[year_month].append(date_str)

            # 월별로 페이지 로드
            for year_month, dates in dates_by_month.items():
                try:
                    year, month = year_month.split('-')

                    # 예약 페이지 접속
                    url = f"https://www.snuwedding.co.kr/snu/reservation?year={year}&month={month}"
                    print(f"페이지 접속: {url}")
                    driver.get(url)

                    # 페이지 로딩 대기
                    time.sleep(2)

                    # Alert 팝업 처리
                    try:
                        alert = driver.switch_to.alert
                        alert_text = alert.text
                        print(f"Alert 감지 ({year_month}): {alert_text}")
                        alert.accept()

                        # "아직 오픈하지 않은 구간" 메시지면 해당 월 전체 스킵
                        if "오픈하지 않은" in alert_text or "아직" in alert_text:
                            print(f"{year_month}는 아직 예약 오픈 전입니다. 스킵합니다.")
                            continue

                    except NoAlertPresentException:
                        # Alert가 없으면 정상 진행
                        pass

                    # 해당 월의 모든 날짜 파싱
                    for date_str in dates:
                        date_status = self._parse_research_park_date(driver, date_str, time_slots)
                        if date_status:
                            result[date_str] = date_status
                            print(f"{date_str}: {date_status}")

                except UnexpectedAlertPresentException as e:
                    print(f"월 {year_month} 처리 중 Alert 발생: {e}")
                    try:
                        alert = driver.switch_to.alert
                        print(f"Alert Text: {alert.text}")
                        alert.accept()
                    except:
                        pass
                    continue

                except Exception as e:
                    print(f"월 {year_month} 처리 중 오류: {e}")
                    import traceback
                    traceback.print_exc()
                    continue

        except Exception as e:
            print(f"연구공원 크롤링 오류: {e}")
            import traceback
            traceback.print_exc()

        finally:
            if driver:
                driver.quit()

        return result

    def _parse_research_park_date(self, driver, date_str, time_slots):
        """연구구원 특정 날짜의 예약 상황 파싱"""
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            day = date_obj.day

            # reservation-list__record 중에서 해당 날짜 찾기
            records = driver.find_elements(By.CSS_SELECTOR, "div.reservation-list__record")

            target_record = None
            for record in records:
                # 첫 번째 div에서 날짜 추출
                day_div = record.find_element(By.CSS_SELECTOR, "div")
                day_text = day_div.text.strip()  # 예: "01 (토)" 또는 "09 (일)"

                # 날짜 숫자만 추출
                day_num = int(day_text.split()[0])

                if day_num == day:
                    target_record = record
                    break

            if not target_record:
                return None

            # 해당 날짜의 a 태그들 가져오기 (5개: 11시, 13시, 15시, 17시, 18:30)
            links = target_record.find_elements(By.TAG_NAME, "a")

            if len(links) != 5:
                print(f"경고: 날짜 {date_str}의 시간대 개수가 5개가 아님 ({len(links)}개)")
                return None

            # 시간대 매핑 (순서대로)
            time_keys = ['11:00', '13:00', '15:00', '17:00', '18:30']

            date_status = {}

            for i, time_key in enumerate(time_keys):
                # 해당 시간대가 활성화되어 있는지 확인
                if not time_slots.get(time_key, False):
                    continue

                link = links[i]

                # class="avail"이 있으면 예약가능, 없으면 예약완료
                link_classes = link.get_attribute('class')
                is_available = 'avail' in (link_classes or '')

                date_status[time_key] = "예약가능" if is_available else "예약완료"

            return date_status if date_status else None

        except UnexpectedAlertPresentException:
            # Alert 예외는 상위로 전달
            raise

        except Exception as e:
            print(f"날짜 파싱 오류 ({date_str}): {e}")
            import traceback
            traceback.print_exc()
            return None

    def check_elounge(self, target_dates, time_slots):
        """
        서울대 이라운지 확인

        Args:
            target_dates: 확인할 날짜 리스트
            time_slots: 확인할 시간대 {'11:00': True, '14:00': True, '17:00': True}

        Returns:
            dict: 날짜별 시간대별 예약 상황
        """
        print("이라운지 확인 중...")

        result = {}

        # TODO: 실제 이라운지 캘린더 URL 필요
        # 현재는 더미 데이터 반환
        # 실제 구현 시 네이버 캘린더 크롤링 로직 추가

        try:
            # 네이버 공개 캘린더 크롤링
            # URL은 실제 이라운지 캘린더 URL로 변경 필요
            calendar_url = "NAVER_CALENDAR_URL_HERE"

            # requests로 HTML 가져오기
            # response = requests.get(calendar_url)
            # soup = BeautifulSoup(response.text, 'html.parser')

            # 날짜별로 확인
            for date_str in target_dates:
                date_status = {}

                # 시간대별 확인
                for time_key in ['11:00', '14:00', '17:00']:
                    if not time_slots.get(time_key, False):
                        continue

                    # TODO: 실제 캘린더에서 파싱
                    # title 속성에서 "완료" 또는 "가능" 찾기
                    # 현재는 더미 데이터
                    date_status[time_key] = "완료"  # or "가능"

                if date_status:
                    result[date_str] = date_status

        except Exception as e:
            print(f"이라운지 크롤링 오류: {e}")

        return result

    def detect_changes(self, current_data):
        """
        변화 감지: 예약완료 → 예약가능 변화 찾기

        Args:
            current_data: 현재 예약 상황

        Returns:
            list: 변화 목록 [{'venue': ..., 'date': ..., 'time': ..., 'change': ...}, ...]
        """
        changes = []

        # 연구공원 변화 확인
        current_rp = current_data.get('research_park', {})
        previous_rp = self.previous_data.get('research_park', {})

        for date_str, times in current_rp.items():
            for time_key, status in times.items():
                prev_status = previous_rp.get(date_str, {}).get(time_key)

                # 예약완료 → 예약가능 변화 감지
                if prev_status == "예약완료" and status == "예약가능":
                    changes.append({
                        'venue': 'research_park',
                        'venue_name': '서울대 연구공원 웨딩홀',
                        'date': date_str,
                        'time': time_key,
                        'change': '예약완료 → 예약가능'
                    })

        # 이라운지 변화 확인
        current_el = current_data.get('elounge', {})
        previous_el = self.previous_data.get('elounge', {})

        for date_str, times in current_el.items():
            for time_key, status in times.items():
                prev_status = previous_el.get(date_str, {}).get(time_key)

                # 완료 → 가능 변화 감지
                if prev_status == "완료" and status == "가능":
                    changes.append({
                        'venue': 'elounge',
                        'venue_name': '서울대 이라운지',
                        'date': date_str,
                        'time': time_key,
                        'change': '완료 → 가능'
                    })

        return changes

    def get_target_dates(self, config):
        """
        설정에서 확인할 날짜 목록 생성

        Args:
            config: 사용자 설정

        Returns:
            list: 확인할 날짜 리스트 ['2026-11-01', ...]
        """
        target_dates = set()

        date_mode = config.get('date_mode', {})

        # 방법 1: 기간으로 모니터링
        if date_mode.get('use_range', False):
            range_config = date_mode.get('range', {})
            start_date = datetime.strptime(range_config['start'], '%Y-%m-%d')
            end_date = datetime.strptime(range_config['end'], '%Y-%m-%d')
            weekdays = range_config.get('weekdays', ['토', '일'])

            current_date = start_date
            while current_date <= end_date:
                weekday_kr = ['월', '화', '수', '목', '금', '토', '일'][current_date.weekday()]
                if weekday_kr in weekdays:
                    target_dates.add(current_date.strftime('%Y-%m-%d'))
                current_date += timedelta(days=1)

        # 방법 2: 특정 날짜만 모니터링
        if date_mode.get('use_specific', False):
            specific_dates = date_mode.get('specific_dates', [])
            target_dates.update(specific_dates)

        return sorted(list(target_dates))


# 테스트 코드
if __name__ == "__main__":
    checker = WeddingChecker()

    # 테스트용 설정
    test_config = {
        'date_mode': {
            'use_range': True,
            'range': {
                'start': '2026-11-01',
                'end': '2026-11-30',
                'weekdays': ['토', '일']
            },
            'use_specific': False,
            'specific_dates': []
        },
        'time_settings': {
            'research_park': {
                '11:00': {'enabled': True},
                '13:00': {'enabled': True},
                '15:00': {'enabled': True},
                '17:00': {'enabled': True},
                '18:30': {'enabled': False}
            },
            'elounge': {
                '11:00': {'enabled': True},
                '14:00': {'enabled': True},
                '17:00': {'enabled': True}
            }
        }
    }

    # 확인할 날짜 생성
    target_dates = checker.get_target_dates(test_config)
    print(f"확인할 날짜 수: {len(target_dates)}")
    print(f"첫 3개 날짜: {target_dates[:3]}")

    # 연구공원 확인 (실제 크롤링)
    # time_slots = {k: v['enabled'] for k, v in test_config['time_settings']['research_park'].items()}
    # rp_data = checker.check_research_park(target_dates[:1], time_slots)
    # print(f"연구공원 데이터: {rp_data}")
