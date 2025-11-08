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
        서울대 이라운지 확인 (네이버 캘린더)

        Args:
            target_dates: 확인할 날짜 리스트
            time_slots: 확인할 시간대 {'11:00': True, '14:00': True, '17:00': True}

        Returns:
            dict: 날짜별 시간대별 예약 상황
        """
        print("이라운지 확인 중...")

        result = {}

        # Selenium 설정
        chrome_options = Options()
        chrome_options.add_argument('--headless')
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

            # 네이버 캘린더 URL
            calendar_url = "https://calendar.naver.com/publicCalendar?publishedKey=d435b7f03ff45dc2504e74adc1938d28665aa33926a644bf2117b77a87e13d72028903d0e9f0ecae"

            # 캘린더 페이지 접속 (첫 1회만)
            print(f"이라운지 캘린더 접속")
            driver.get(calendar_url)
            time.sleep(3)

            # 월별로 처리
            for year_month, dates in dates_by_month.items():
                try:
                    target_year, target_month = year_month.split('-')
                    target_year = int(target_year)
                    target_month = int(target_month)

                    print(f"목표 월: {target_year}년 {target_month}월")

                    # 현재 표시된 월로 이동
                    self._navigate_to_month(driver, target_year, target_month)

                    # 해당 월의 모든 날짜 파싱
                    for date_str in dates:
                        date_status = self._parse_elounge_date(driver, date_str, time_slots)
                        if date_status:
                            result[date_str] = date_status
                            print(f"{date_str}: {date_status}")

                except Exception as e:
                    print(f"월 {year_month} 처리 중 오류: {e}")
                    import traceback
                    traceback.print_exc()
                    continue

        except Exception as e:
            print(f"이라운지 크롤링 오류: {e}")
            import traceback
            traceback.print_exc()

        finally:
            if driver:
                driver.quit()

        return result

    def _navigate_to_month(self, driver, target_year, target_month):
        """네이버 캘린더에서 목표 년월로 이동"""
        max_attempts = 24  # 최대 24개월(2년) 이동

        for attempt in range(max_attempts):
            try:
                # 현재 표시된 년월 확인
                # 네이버 캘린더의 년월 표시 요소 찾기 (여러 가능성 시도)
                current_year_month_text = None

                # 시도 1: .calendar_title 같은 클래스
                try:
                    year_month_elem = driver.find_element(By.CSS_SELECTOR, ".month_title, .calendar_title, .title")
                    current_year_month_text = year_month_elem.text.strip()
                except:
                    pass

                # 시도 2: h2, h3 태그
                if not current_year_month_text:
                    try:
                        year_month_elem = driver.find_element(By.CSS_SELECTOR, "h2, h3")
                        current_year_month_text = year_month_elem.text.strip()
                    except:
                        pass

                # 시도 3: span 태그에서 "년" 포함된 것 찾기
                if not current_year_month_text:
                    try:
                        spans = driver.find_elements(By.TAG_NAME, "span")
                        for span in spans:
                            text = span.text.strip()
                            if "년" in text and "월" in text:
                                current_year_month_text = text
                                break
                    except:
                        pass

                if not current_year_month_text:
                    print(f"[DEBUG] 현재 년월 표시를 찾을 수 없음")
                    break

                # "오늘" 같은 불필요한 텍스트 제거
                current_year_month_text = current_year_month_text.replace('오늘', '').replace('Today', '').strip()

                print(f"[DEBUG] 현재 표시된 년월: {current_year_month_text}")

                # "2025년 5월" 또는 "2025.05" 형식에서 년월 추출
                import re
                # 형식 1: "2025년 11월"
                match = re.search(r'(\d{4})년\s*(\d{1,2})월', current_year_month_text)
                if not match:
                    # 형식 2: "2025.11"
                    match = re.search(r'(\d{4})[./\-](\d{1,2})', current_year_month_text)

                if not match:
                    print(f"[DEBUG] 년월 파싱 실패: {current_year_month_text}")
                    break

                current_year = int(match.group(1))
                current_month = int(match.group(2))

                print(f"[DEBUG] 현재: {current_year}년 {current_month}월, 목표: {target_year}년 {target_month}월")

                # 목표 월에 도달했는지 확인
                if current_year == target_year and current_month == target_month:
                    print(f"[DEBUG] ✅ 목표 월에 도달: {target_year}년 {target_month}월")
                    return True

                # 월 비교 (년월을 숫자로 변환)
                current_ym = current_year * 12 + current_month
                target_ym = target_year * 12 + target_month

                if current_ym < target_ym:
                    # 다음 달로 이동
                    print(f"[DEBUG] 다음 달 버튼 클릭")
                    next_btn = driver.find_element(By.CSS_SELECTOR, "button.btn_next")
                    next_btn.click()
                    time.sleep(1)
                else:
                    # 이전 달로 이동
                    print(f"[DEBUG] 이전 달 버튼 클릭")
                    prev_btn = driver.find_element(By.CSS_SELECTOR, "button.btn_prev")
                    prev_btn.click()
                    time.sleep(1)

            except Exception as e:
                print(f"[DEBUG] 월 이동 중 오류: {e}")
                import traceback
                traceback.print_exc()
                break

        print(f"[DEBUG] ❌ 목표 월로 이동 실패 (최대 시도 횟수 초과)")
        return False

    def _parse_elounge_date(self, driver, date_str, time_slots):
        """이라운지 특정 날짜의 예약 상황 파싱"""
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            year = date_obj.year
            month = date_obj.month
            day = date_obj.day

            print(f"[DEBUG] 이라운지 날짜 파싱: {year}년 {month}월 {day}일")

            # 모든 날짜 셀 찾기
            date_cells = driver.find_elements(By.CSS_SELECTOR, "td[dayindex]")
            print(f"[DEBUG] 찾은 날짜 셀 개수: {len(date_cells)}")

            target_cell = None
            for cell in date_cells:
                # 날짜 텍스트 찾기
                try:
                    day_strong = cell.find_element(By.CSS_SELECTOR, "strong._move_day_view")
                    day_text = day_strong.text.strip()
                    day_num = int(day_text)

                    if day_num == day:
                        # disable 클래스가 없는지 확인 (다른 월 날짜 제외)
                        cell_classes = cell.get_attribute('class')
                        is_disabled = 'disable' in (cell_classes or '')
                        print(f"[DEBUG] {day}일 셀 발견, disable={is_disabled}, classes={cell_classes}")

                        if not is_disabled:
                            target_cell = cell
                            print(f"[DEBUG] ✅ {day}일 타겟 셀 확정")
                            break
                        else:
                            print(f"[DEBUG] {day}일은 다른 월의 날짜 (disable 클래스 있음)")
                except:
                    continue

            if not target_cell:
                print(f"[DEBUG] ❌ {date_str}의 타겟 셀을 찾지 못함")
                return None

            date_status = {}

            # 전체 캘린더에서 ._schedule div 찾기 (key 속성에 날짜 정보 포함)
            print(f"[DEBUG] 날짜 {date_str} 파싱 시작, 활성화된 시간대: {time_slots}")

            # 모든 ._schedule div 찾기
            all_schedules = driver.find_elements(By.CSS_SELECTOR, "div._schedule")
            print(f"[DEBUG] 전체 캘린더의 ._schedule div 개수: {len(all_schedules)}")

            # key 속성에 날짜 포함된 스케줄 찾기 (예: "2026-05-09" in key)
            matched_schedules = []
            for schedule_div in all_schedules:
                try:
                    key = schedule_div.get_attribute('key')
                    if key and date_str in key:
                        matched_schedules.append(schedule_div)
                        print(f"[DEBUG] 매칭된 스케줄 발견: key={key[:80]}...")
                except:
                    continue

            print(f"[DEBUG] {date_str}에 매칭된 스케줄 개수: {len(matched_schedules)}")

            # 매칭된 스케줄에서 시간과 상태 추출
            for schedule_div in matched_schedules:
                try:
                    # div 내부의 a[title] 찾기
                    link = schedule_div.find_element(By.CSS_SELECTOR, "a[title]")
                    title = link.get_attribute('title')  # 예: "11:00 완료" 또는 "17:00 가능"

                    print(f"[DEBUG] 파싱한 title: '{title}'")

                    if not title:
                        print(f"[DEBUG] title이 비어있음, 스킵")
                        continue

                    # 시간과 상태 분리
                    parts = title.split()
                    if len(parts) >= 2:
                        time_str = parts[0]  # "11:00", "14:00", "17:00"
                        status = parts[1]    # "완료", "가능"

                        print(f"[DEBUG] 파싱 결과 - 시간: '{time_str}', 상태: '{status}'")

                        # 시간대가 활성화되어 있는지 확인
                        if not time_slots.get(time_str, False):
                            print(f"[DEBUG] 시간대 '{time_str}'가 비활성화되어 있거나 없음, 스킵")
                            continue

                        # 중복 체크 후 추가
                        if time_str not in date_status:
                            # "완료" = 예약완료, "가능" = 예약가능
                            date_status[time_str] = "완료" if status == "완료" else "가능"
                            print(f"[DEBUG] date_status에 추가: {time_str} = {date_status[time_str]}")
                        else:
                            print(f"[DEBUG] {time_str}는 이미 추가됨, 스킵")

                except Exception as e:
                    print(f"[DEBUG] 스케줄 파싱 중 오류: {e}")
                    import traceback
                    traceback.print_exc()
                    continue

            print(f"[DEBUG] 최종 date_status: {date_status}")

            return date_status if date_status else None

        except Exception as e:
            print(f"이라운지 날짜 파싱 오류 ({date_str}): {e}")
            import traceback
            traceback.print_exc()
            return None

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

        print(f"[DEBUG] 연구공원 변화 감지 시작")
        print(f"[DEBUG] 이전 데이터 존재 여부: {bool(previous_rp)}")

        for date_str, times in current_rp.items():
            for time_key, status in times.items():
                prev_status = previous_rp.get(date_str, {}).get(time_key)

                print(f"[DEBUG] {date_str} {time_key}: 이전={prev_status}, 현재={status}")

                # 예약가능 상태 감지 (처음 발견 또는 변화)
                if status == "예약가능":
                    if prev_status is None:
                        # 처음 발견한 예약가능 - 알림 보내기
                        print(f"[DEBUG] ✅ 처음 발견한 예약가능! {date_str} {time_key}")
                        changes.append({
                            'venue': 'research_park',
                            'venue_name': '서울대 연구공원 웨딩홀',
                            'date': date_str,
                            'time': time_key,
                            'change': '예약가능 발견'
                        })
                    elif prev_status == "예약완료":
                        # 예약완료 → 예약가능 변화 - 알림 보내기
                        print(f"[DEBUG] ✅ 변화 감지! {date_str} {time_key}: 예약완료 → 예약가능")
                        changes.append({
                            'venue': 'research_park',
                            'venue_name': '서울대 연구공원 웨딩홀',
                            'date': date_str,
                            'time': time_key,
                            'change': '예약완료 → 예약가능'
                        })
                    else:
                        # 예약가능 유지 - 알림 안 보내기
                        print(f"[DEBUG] ℹ️  예약가능 유지 (변화 없음): {date_str} {time_key}")

        # 이라운지 변화 확인
        current_el = current_data.get('elounge', {})
        previous_el = self.previous_data.get('elounge', {})

        print(f"[DEBUG] 이라운지 변화 감지 시작")
        print(f"[DEBUG] 이전 데이터 존재 여부: {bool(previous_el)}")

        for date_str, times in current_el.items():
            for time_key, status in times.items():
                prev_status = previous_el.get(date_str, {}).get(time_key)

                print(f"[DEBUG] {date_str} {time_key}: 이전={prev_status}, 현재={status}")

                # 예약가능 상태 감지 (처음 발견 또는 변화)
                if status == "가능":
                    if prev_status is None:
                        # 처음 발견한 예약가능 - 알림 보내기
                        print(f"[DEBUG] ✅ 처음 발견한 예약가능! {date_str} {time_key}")
                        changes.append({
                            'venue': 'elounge',
                            'venue_name': '서울대 이라운지',
                            'date': date_str,
                            'time': time_key,
                            'change': '예약가능 발견'
                        })
                    elif prev_status == "완료":
                        # 완료 → 가능 변화 - 알림 보내기
                        print(f"[DEBUG] ✅ 변화 감지! {date_str} {time_key}: 완료 → 가능")
                        changes.append({
                            'venue': 'elounge',
                            'venue_name': '서울대 이라운지',
                            'date': date_str,
                            'time': time_key,
                            'change': '완료 → 가능'
                        })
                    else:
                        # 예약가능 유지 - 알림 안 보내기
                        print(f"[DEBUG] ℹ️  예약가능 유지 (변화 없음): {date_str} {time_key}")

        print(f"[DEBUG] 총 {len(changes)}개의 변화 감지됨")
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
