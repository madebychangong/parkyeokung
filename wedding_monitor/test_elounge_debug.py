#!/usr/bin/env python3
"""
이라운지 디버그 테스트
"""

import sys
sys.path.insert(0, '/home/user/parkyeokung/wedding_monitor')

from wedding_checker import WeddingChecker
from datetime import datetime, timedelta

# 테스트용 설정
checker = WeddingChecker()

# 가까운 미래 날짜 하나만 테스트 (2025년 12월)
test_dates = ['2025-12-07']  # 토요일 하나만

# 시간대 설정
time_slots = {
    '11:00': True,
    '14:00': True,
    '17:00': True
}

print("=" * 60)
print("이라운지 디버그 테스트 시작")
print("=" * 60)
print(f"확인할 날짜: {test_dates}")
print(f"활성화된 시간대: {time_slots}")
print("=" * 60)

# 이라운지 확인
result = checker.check_elounge(test_dates, time_slots)

print("\n" + "=" * 60)
print("최종 결과:")
print("=" * 60)
print(result)
