"""
예식장 예약 모니터링 프로그램
GUI 메인 프로그램
"""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
from tkcalendar import DateEntry
from datetime import datetime, timedelta
import json
import os
import threading
import time
import sys
import uuid
import socket
from wedding_checker import WeddingChecker
from auto_reservation import AutoReservation, RESERVATION_INFO
from notification_manager import NotificationManager


def check_authorization():
    """
    허가된 MAC 주소/IP에서만 실행 가능하도록 체크
    """
    # 허용된 MAC 주소 목록 (하드코딩)
    ALLOWED_MACS = [
        "7c:f3:cd:37:de:78",  # 첫 번째 컴퓨터 (changong)
        # "00:00:00:00:00:00",  # 두 번째 컴퓨터 (MAC 주소를 받으면 여기 수정)
    ]

    # 허용된 IP 주소 목록 (선택사항)
    ALLOWED_IPS = [
        # "192.168.0.100",  # 예시
    ]

    # MAC 주소 체크가 비활성화되어 있으면 통과
    if not ALLOWED_MACS:
        return True

    # 현재 컴퓨터의 MAC 주소 가져오기
    current_mac = ':'.join(['{:02x}'.format((uuid.getnode() >> elements) & 0xff)
                            for elements in range(0,2*6,2)][::-1])

    # 현재 컴퓨터의 IP 주소 가져오기
    try:
        current_ip = socket.gethostbyname(socket.gethostname())
    except:
        current_ip = "Unknown"

    print(f"현재 MAC: {current_mac}")
    print(f"현재 IP: {current_ip}")

    # MAC 주소 체크
    if ALLOWED_MACS and current_mac.lower() not in [mac.lower() for mac in ALLOWED_MACS]:
        messagebox.showerror("인증 실패", "이 프로그램은 현재 컴퓨터에서 실행할 수 없습니다.")
        return False

    # IP 주소 체크 (선택사항)
    if ALLOWED_IPS and current_ip not in ALLOWED_IPS:
        messagebox.showerror("인증 실패", "이 프로그램은 현재 IP에서 실행할 수 없습니다.")
        return False

    return True


class WeddingMonitorGUI:
    """예식장 예약 모니터링 GUI"""

    def __init__(self, root):
        self.root = root
        self.root.title("예식장 예약 모니터링 프로그램")
        self.root.geometry("800x600")

        # AppData 폴더에 설정 저장
        self.config_file = self._get_config_path()
        self.monitoring = False
        self.monitoring_thread = None

        # 설정 로드
        self.config = self.load_config()

        # 스타일 설정 (LabelFrame 여백 최소화)
        self.setup_styles()

        # 스크롤 가능한 메인 프레임 생성
        self.create_scrollable_frame()

        # GUI 구성
        self.create_widgets()

        # 설정 적용
        self.apply_config()

    @staticmethod
    def _get_config_path():
        """설정 파일 경로 가져오기"""
        if os.name == 'nt':  # Windows
            base_dir = os.environ.get('APPDATA', os.path.expanduser('~'))
            app_dir = os.path.join(base_dir, 'WeddingMonitor')
        else:  # Linux, Mac
            app_dir = os.path.expanduser('~/.wedding_monitor')

        # 디렉토리가 없으면 생성
        os.makedirs(app_dir, exist_ok=True)
        return os.path.join(app_dir, 'config.json')

    @staticmethod
    def _reset_wedding_data():
        """모니터링 시작 시 wedding_data.json 리셋"""
        if os.name == 'nt':  # Windows
            base_dir = os.environ.get('APPDATA', os.path.expanduser('~'))
            app_dir = os.path.join(base_dir, 'WeddingMonitor')
        else:  # Linux, Mac
            app_dir = os.path.expanduser('~/.wedding_monitor')

        data_file = os.path.join(app_dir, 'wedding_data.json')

        # 파일이 존재하면 삭제
        if os.path.exists(data_file):
            try:
                os.remove(data_file)
                print(f"[DEBUG] wedding_data.json 리셋 완료")
            except Exception as e:
                print(f"[DEBUG] wedding_data.json 삭제 실패: {e}")

    def setup_styles(self):
        """ttk 스타일 설정"""
        style = ttk.Style()

        # Compact LabelFrame 스타일 생성
        style.configure('Compact.TLabelframe',
                       borderwidth=1,
                       relief='solid')
        style.configure('Compact.TLabelframe.Label',
                       font=('', 9))

    def create_scrollable_frame(self):
        """스크롤 가능한 메인 프레임 생성"""
        # Canvas와 Scrollbar
        canvas = tk.Canvas(self.root)
        scrollbar = ttk.Scrollbar(self.root, orient="vertical", command=canvas.yview)

        # 스크롤 가능한 프레임
        self.scrollable_frame = ttk.Frame(canvas, padding="2")

        # 2열 레이아웃을 위한 column weight 설정
        self.scrollable_frame.columnconfigure(0, weight=1)
        self.scrollable_frame.columnconfigure(1, weight=1)

        # row 간격 최소화
        for i in range(10):  # row 0~9
            self.scrollable_frame.rowconfigure(i, minsize=0, weight=0)

        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        # 마우스 휠 스크롤 지원
        def on_mouse_wheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        canvas.bind_all("<MouseWheel>", on_mouse_wheel)

        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

    def create_widgets(self):
        """GUI 위젯 생성"""

        # ========== 날짜 모니터링 설정 (왼쪽 열) ==========
        date_frame = ttk.Frame(self.scrollable_frame, relief='solid', borderwidth=1, padding=(5, 5))
        date_frame.grid(row=0, column=0, rowspan=2, sticky=(tk.W, tk.E, tk.N), pady=2, padx=(0, 3))

        # 제목
        ttk.Label(date_frame, text="📅 모니터링 설정", font=('', 9, 'bold')).grid(
            row=0, column=0, sticky=tk.W, padx=0, pady=(0, 3)
        )

        # 방법 1: 기간으로 모니터링
        self.use_range_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(date_frame, text="기간 설정", variable=self.use_range_var).grid(
            row=1, column=0, sticky=tk.W, padx=3
        )

        date_row = ttk.Frame(date_frame)
        date_row.grid(row=2, column=0, sticky=tk.W, padx=15, pady=1)

        ttk.Label(date_row, text="시작:").pack(side=tk.LEFT, padx=2)
        self.start_date = DateEntry(date_row, width=10, background='darkblue',
                                     foreground='white', borderwidth=2, date_pattern='yyyy-mm-dd')
        self.start_date.pack(side=tk.LEFT, padx=2)

        ttk.Label(date_row, text="종료:").pack(side=tk.LEFT, padx=5)
        self.end_date = DateEntry(date_row, width=10, background='darkblue',
                                   foreground='white', borderwidth=2, date_pattern='yyyy-mm-dd')
        self.end_date.pack(side=tk.LEFT, padx=2)

        weekday_row = ttk.Frame(date_frame)
        weekday_row.grid(row=3, column=0, sticky=tk.W, padx=15, pady=1)

        ttk.Label(weekday_row, text="요일:").pack(side=tk.LEFT, padx=2)
        self.weekday_var = tk.StringVar(value="both")
        ttk.Radiobutton(weekday_row, text="토", variable=self.weekday_var, value="sat").pack(side=tk.LEFT)
        ttk.Radiobutton(weekday_row, text="일", variable=self.weekday_var, value="sun").pack(side=tk.LEFT)
        ttk.Radiobutton(weekday_row, text="토/일", variable=self.weekday_var, value="both").pack(side=tk.LEFT)

        # 방법 2: 특정 날짜
        ttk.Separator(date_frame, orient='horizontal').grid(row=4, column=0, sticky=(tk.W, tk.E), pady=3)

        self.use_specific_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(date_frame, text="특정 날짜", variable=self.use_specific_var).grid(
            row=5, column=0, sticky=tk.W, padx=3
        )

        specific_row = ttk.Frame(date_frame)
        specific_row.grid(row=6, column=0, sticky=(tk.W, tk.E), padx=15, pady=1)

        self.specific_date_picker = DateEntry(specific_row, width=12, background='darkblue',
                                               foreground='white', borderwidth=2, date_pattern='yyyy-mm-dd')
        self.specific_date_picker.pack(side=tk.LEFT, padx=2)

        ttk.Button(specific_row, text="추가", command=self.add_specific_date, width=8).pack(side=tk.LEFT, padx=2)
        ttk.Button(specific_row, text="삭제", command=self.remove_specific_date, width=8).pack(side=tk.LEFT, padx=2)

        # 특정 날짜 리스트
        list_frame = ttk.Frame(date_frame)
        list_frame.grid(row=7, column=0, sticky=(tk.W, tk.E), padx=15, pady=1)

        self.specific_dates_listbox = tk.Listbox(list_frame, height=3, width=40)
        self.specific_dates_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        list_scroll = ttk.Scrollbar(list_frame, orient="vertical", command=self.specific_dates_listbox.yview)
        list_scroll.pack(side=tk.RIGHT, fill=tk.Y)
        self.specific_dates_listbox.config(yscrollcommand=list_scroll.set)

        # ========== 시간대별 동작 설정 (왼쪽 열) ==========
        time_frame = ttk.Frame(self.scrollable_frame, relief='solid', borderwidth=1, padding=(5, 5))
        time_frame.grid(row=2, column=0, sticky=(tk.W, tk.E, tk.N), pady=2, padx=(0, 3))

        # 제목
        ttk.Label(time_frame, text="⏰ 시간대별 설정", font=('', 9, 'bold')).grid(
            row=0, column=0, columnspan=6, sticky=tk.W, padx=0, pady=(0, 3)
        )

        # 연구공원 (왼쪽)
        ttk.Label(time_frame, text="연구공원 웨딩홀", font=('', 9, 'bold')).grid(
            row=1, column=0, columnspan=3, sticky=tk.W, pady=1
        )

        self.rp_time_vars = {}
        self.rp_action_vars = {}
        rp_times = [
            ('11:00', '11시'), ('13:00', '13시'), ('15:00', '15시'),
            ('17:00', '17시'), ('18:30', '18:30')
        ]

        for i, (time_key, time_label) in enumerate(rp_times, start=2):
            self.rp_time_vars[time_key] = tk.BooleanVar(value=True)
            self.rp_action_vars[time_key] = tk.StringVar(value="auto")

            ttk.Checkbutton(time_frame, text=time_label, variable=self.rp_time_vars[time_key]).grid(
                row=i, column=0, sticky=tk.W, padx=3
            )
            ttk.Radiobutton(time_frame, text="자동예약", variable=self.rp_action_vars[time_key],
                            value="auto").grid(row=i, column=1, sticky=tk.W, padx=2)
            ttk.Radiobutton(time_frame, text="알림만", variable=self.rp_action_vars[time_key],
                            value="notify").grid(row=i, column=2, sticky=tk.W, padx=2)

        # 구분선
        ttk.Separator(time_frame, orient='vertical').grid(
            row=1, column=3, rowspan=9, sticky=(tk.N, tk.S), padx=5
        )

        # 이라운지 (오른쪽)
        ttk.Label(time_frame, text="이라운지 (알림만)", font=('', 9, 'bold')).grid(
            row=1, column=4, columnspan=2, sticky=tk.W, pady=1
        )

        self.el_time_vars = {}
        el_times = [('11:00', '11시'), ('14:00', '14시'), ('17:00', '17시')]

        for i, (time_key, time_label) in enumerate(el_times, start=2):
            self.el_time_vars[time_key] = tk.BooleanVar(value=True)
            ttk.Checkbutton(time_frame, text=time_label, variable=self.el_time_vars[time_key]).grid(
                row=i, column=4, columnspan=2, sticky=tk.W, padx=3
            )

        # ========== 자동 예약 정보 (오른쪽 열) ==========
        auto_frame = ttk.Frame(self.scrollable_frame, relief='solid', borderwidth=1, padding=(5, 5))
        auto_frame.grid(row=0, column=1, sticky=(tk.W, tk.E, tk.N), pady=2, padx=(3, 0))

        # 제목
        ttk.Label(auto_frame, text="📝 예약 정보", font=('', 9, 'bold')).grid(
            row=0, column=0, sticky=tk.W, padx=0, pady=(0, 3)
        )

        info_text = f"{RESERVATION_INFO['groom_name']} ({RESERVATION_INFO['groom_tel']}), {RESERVATION_INFO['bride_name']} ({RESERVATION_INFO['bride_tel']})\n예상인원: {RESERVATION_INFO['expected_people']}   💡 수정: auto_reservation.py"

        ttk.Label(auto_frame, text=info_text, justify=tk.LEFT, wraplength=350).grid(
            row=1, column=0, sticky=tk.W
        )

        # ========== 알림 설정 (오른쪽 열) ==========
        notif_frame = ttk.Frame(self.scrollable_frame, relief='solid', borderwidth=1, padding=(5, 5))
        notif_frame.grid(row=1, column=1, sticky=(tk.W, tk.E, tk.N), pady=2, padx=(3, 0))

        # 제목
        ttk.Label(notif_frame, text="🔔 알림 설정", font=('', 9, 'bold')).grid(
            row=0, column=0, columnspan=2, sticky=tk.W, padx=0, pady=(0, 3)
        )

        # 텔레그램 활성화 체크박스
        self.telegram_enabled_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(notif_frame, text="텔레그램 알림 사용", variable=self.telegram_enabled_var).grid(
            row=1, column=0, sticky=tk.W, padx=3, pady=2
        )

        # 텔레그램 테스트 버튼
        ttk.Button(notif_frame, text="📱 테스트 발송", command=self.test_telegram, width=15).grid(
            row=1, column=1, padx=3, pady=2, sticky=tk.W
        )

        # 확인 주기
        interval_row = ttk.Frame(notif_frame)
        interval_row.grid(row=2, column=0, columnspan=2, sticky=tk.W, padx=3, pady=2)

        ttk.Label(interval_row, text="확인 주기:").pack(side=tk.LEFT, padx=2)
        self.check_interval = ttk.Spinbox(interval_row, from_=1, to=1440, width=5)
        self.check_interval.set(5)
        self.check_interval.pack(side=tk.LEFT, padx=2)
        ttk.Label(interval_row, text="분마다").pack(side=tk.LEFT, padx=2)

        # ========== SMS 설정 (오른쪽 열) ==========
        sms_frame = ttk.Frame(self.scrollable_frame, relief='solid', borderwidth=1, padding=(5, 5))
        sms_frame.grid(row=2, column=1, sticky=(tk.W, tk.E, tk.N), pady=2, padx=(3, 0))

        # 제목
        ttk.Label(sms_frame, text="📨 SMS 설정", font=('', 9, 'bold')).grid(
            row=0, column=0, columnspan=2, sticky=tk.W, padx=0, pady=(0, 3)
        )

        # SMS 활성화 체크박스
        self.sms_enabled_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(sms_frame, text="SMS 알림 사용", variable=self.sms_enabled_var).grid(
            row=1, column=0, columnspan=2, sticky=tk.W, padx=3, pady=2
        )

        # 수신번호 입력
        ttk.Label(sms_frame, text="수신번호 1:").grid(row=2, column=0, sticky=tk.W, padx=3)
        self.sms_to_number1 = ttk.Entry(sms_frame, width=35)
        self.sms_to_number1.grid(row=2, column=1, padx=3, pady=1, sticky=(tk.W, tk.E))

        ttk.Label(sms_frame, text="수신번호 2:").grid(row=3, column=0, sticky=tk.W, padx=3)
        self.sms_to_number2 = ttk.Entry(sms_frame, width=35)
        self.sms_to_number2.grid(row=3, column=1, padx=3, pady=1, sticky=(tk.W, tk.E))

        # SMS 테스트 버튼
        ttk.Button(sms_frame, text="📱 테스트 발송", command=self.test_sms, width=15).grid(
            row=4, column=1, padx=3, pady=5, sticky=tk.E
        )

        # ========== 제어 버튼 (하단 전체) ==========
        control_frame = ttk.Frame(self.scrollable_frame)
        control_frame.grid(row=3, column=0, columnspan=2, pady=3)

        self.start_btn = ttk.Button(control_frame, text="시작하기", command=self.start_monitoring, width=12)
        self.start_btn.grid(row=0, column=0, padx=5)

        self.stop_btn = ttk.Button(control_frame, text="중지", command=self.stop_monitoring,
                                    width=12, state=tk.DISABLED)
        self.stop_btn.grid(row=0, column=1, padx=5)

        ttk.Button(control_frame, text="설정 저장", command=self.save_config, width=12).grid(row=0, column=2, padx=5)

        # ========== 모니터링 상태 (하단 전체) ==========
        status_frame = ttk.Frame(self.scrollable_frame, relief='solid', borderwidth=1, padding=(5, 5))
        status_frame.grid(row=4, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=0)

        # 제목
        ttk.Label(status_frame, text="📊 상태", font=('', 9, 'bold')).grid(
            row=0, column=0, sticky=tk.W, padx=0, pady=(0, 3)
        )

        self.status_label = ttk.Label(status_frame, text="상태: 대기중")
        self.status_label.grid(row=1, column=0, sticky=tk.W)

        self.last_check_label = ttk.Label(status_frame, text="마지막 확인: -")
        self.last_check_label.grid(row=2, column=0, sticky=tk.W)

        self.next_check_label = ttk.Label(status_frame, text="다음 확인: -")
        self.next_check_label.grid(row=3, column=0, sticky=tk.W)

        # ========== 알림 기록 (하단 전체) ==========
        log_frame = ttk.Frame(self.scrollable_frame, relief='solid', borderwidth=1, padding=(5, 5))
        log_frame.grid(row=5, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=0)

        # 제목
        ttk.Label(log_frame, text="🔔 로그", font=('', 9, 'bold')).grid(
            row=0, column=0, sticky=tk.W, padx=0, pady=(0, 3)
        )

        self.log_text = scrolledtext.ScrolledText(log_frame, height=8, width=90)
        self.log_text.grid(row=1, column=0, sticky=(tk.W, tk.E))

    def add_specific_date(self):
        """특정 날짜 추가"""
        date_str = self.specific_date_picker.get_date().strftime('%Y-%m-%d')

        # 중복 체크
        current_dates = self.specific_dates_listbox.get(0, tk.END)
        if date_str not in current_dates:
            self.specific_dates_listbox.insert(tk.END, date_str)
        else:
            messagebox.showinfo("알림", "이미 추가된 날짜입니다.")

    def remove_specific_date(self):
        """선택한 특정 날짜 삭제"""
        selected = self.specific_dates_listbox.curselection()
        if selected:
            self.specific_dates_listbox.delete(selected[0])
        else:
            messagebox.showinfo("알림", "삭제할 날짜를 선택하세요.")

    def load_config(self):
        """설정 로드"""
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"설정 로드 실패: {e}")
                return self.get_default_config()
        return self.get_default_config()

    def get_default_config(self):
        """기본 설정"""
        return {
            'date_mode': {
                'use_range': True,
                'range': {
                    'start': (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
                    'end': (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d'),
                    'weekdays': ['토', '일']
                },
                'use_specific': False,
                'specific_dates': []
            },
            'time_settings': {
                'research_park': {
                    '11:00': {'enabled': True, 'auto_reserve': True},
                    '13:00': {'enabled': True, 'auto_reserve': True},
                    '15:00': {'enabled': True, 'auto_reserve': True},
                    '17:00': {'enabled': True, 'auto_reserve': False},
                    '18:30': {'enabled': False, 'auto_reserve': False}
                },
                'elounge': {
                    '11:00': {'enabled': True},
                    '14:00': {'enabled': True},
                    '17:00': {'enabled': True}
                }
            },
            'telegram': {
                'enabled': True
            },
            'sms': {
                'enabled': False,
                'to_numbers': []
            },
            'check_interval_minutes': 5
        }

    def apply_config(self):
        """설정 적용"""
        # 날짜 설정
        date_mode = self.config.get('date_mode', {})
        self.use_range_var.set(date_mode.get('use_range', True))

        if 'range' in date_mode:
            range_config = date_mode['range']
            self.start_date.set_date(datetime.strptime(range_config['start'], '%Y-%m-%d'))
            self.end_date.set_date(datetime.strptime(range_config['end'], '%Y-%m-%d'))

            weekdays = range_config.get('weekdays', ['토', '일'])
            if weekdays == ['토']:
                self.weekday_var.set('sat')
            elif weekdays == ['일']:
                self.weekday_var.set('sun')
            else:
                self.weekday_var.set('both')

        self.use_specific_var.set(date_mode.get('use_specific', False))
        specific_dates = date_mode.get('specific_dates', [])
        for date_str in specific_dates:
            self.specific_dates_listbox.insert(tk.END, date_str)

        # 시간 설정
        time_settings = self.config.get('time_settings', {})
        rp_settings = time_settings.get('research_park', {})
        for time_key, settings in rp_settings.items():
            if time_key in self.rp_time_vars:
                self.rp_time_vars[time_key].set(settings.get('enabled', False))
                action = 'auto' if settings.get('auto_reserve', False) else 'notify'
                self.rp_action_vars[time_key].set(action)

        el_settings = time_settings.get('elounge', {})
        for time_key, settings in el_settings.items():
            if time_key in self.el_time_vars:
                self.el_time_vars[time_key].set(settings.get('enabled', False))

        # 텔레그램 설정
        telegram = self.config.get('telegram', {})
        self.telegram_enabled_var.set(telegram.get('enabled', True))

        # SMS 설정
        sms = self.config.get('sms', {})
        self.sms_enabled_var.set(sms.get('enabled', False))

        # 수신번호 2개
        to_numbers = sms.get('to_numbers', [])
        if len(to_numbers) > 0:
            self.sms_to_number1.insert(0, to_numbers[0])
        if len(to_numbers) > 1:
            self.sms_to_number2.insert(0, to_numbers[1])

        # 확인 주기
        self.check_interval.set(self.config.get('check_interval_minutes', 5))

    def save_config(self):
        """설정 저장"""
        weekday_map = {'sat': ['토'], 'sun': ['일'], 'both': ['토', '일']}

        # Listbox에서 특정 날짜 가져오기
        specific_dates = list(self.specific_dates_listbox.get(0, tk.END))

        config = {
            'date_mode': {
                'use_range': self.use_range_var.get(),
                'range': {
                    'start': self.start_date.get_date().strftime('%Y-%m-%d'),
                    'end': self.end_date.get_date().strftime('%Y-%m-%d'),
                    'weekdays': weekday_map[self.weekday_var.get()]
                },
                'use_specific': self.use_specific_var.get(),
                'specific_dates': specific_dates
            },
            'time_settings': {
                'research_park': {
                    time_key: {
                        'enabled': var.get(),
                        'auto_reserve': self.rp_action_vars[time_key].get() == 'auto'
                    }
                    for time_key, var in self.rp_time_vars.items()
                },
                'elounge': {
                    time_key: {'enabled': var.get()}
                    for time_key, var in self.el_time_vars.items()
                }
            },
            'telegram': {
                'enabled': self.telegram_enabled_var.get()
            },
            'sms': {
                'enabled': self.sms_enabled_var.get(),
                'to_numbers': [num for num in [
                    self.sms_to_number1.get().strip(),
                    self.sms_to_number2.get().strip()
                ] if num]
            },
            'check_interval_minutes': int(self.check_interval.get())
        }

        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            self.config = config
            messagebox.showinfo("성공", "설정이 저장되었습니다.")
        except Exception as e:
            messagebox.showerror("오류", f"설정 저장 실패: {e}")

    def test_telegram(self):
        """텔레그램 테스트 발송"""
        # 임시 config 생성
        temp_config = {
            'telegram': {
                'enabled': True
            },
            'sms': {
                'enabled': False
            }
        }

        try:
            # NotificationManager 생성 및 테스트 메시지 전송
            notifier = NotificationManager(temp_config)

            test_message = """━━━━━━━━━━━━━━━━
📱 텔레그램 테스트 발송
━━━━━━━━━━━━━━━━

텔레그램 연동 테스트 메시지입니다.
설정이 정상적으로 완료되었습니다!"""

            self.log_message("텔레그램 테스트 발송 중...")
            success = notifier.send_notification(test_message, notification_type='info')

            if success:
                messagebox.showinfo("성공", "텔레그램 테스트 발송 완료!\n그룹방을 확인하세요.")
                self.log_message("텔레그램 테스트 발송 성공")
            else:
                messagebox.showerror("실패", "텔레그램 발송 실패. 로그를 확인하세요.")
                self.log_message("텔레그램 테스트 발송 실패")

        except Exception as e:
            messagebox.showerror("오류", f"텔레그램 테스트 발송 오류:\n{str(e)}")
            self.log_message(f"텔레그램 테스트 오류: {e}")

    def test_sms(self):
        """SMS 테스트 발송"""
        # 수신번호 확인
        to_number1 = self.sms_to_number1.get().strip()
        to_number2 = self.sms_to_number2.get().strip()

        if not to_number1 and not to_number2:
            messagebox.showwarning("경고", "최소 1개의 수신번호를 입력하세요.")
            return

        # 임시 config 생성
        temp_config = {
            'telegram': {
                'enabled': False
            },
            'sms': {
                'enabled': True,
                'to_numbers': [num for num in [to_number1, to_number2] if num]
            }
        }

        try:
            # NotificationManager 생성 및 테스트 메시지 전송
            notifier = NotificationManager(temp_config)

            test_message = """
━━━━━━━━━━━━━━━━
📱 SMS 테스트 발송
━━━━━━━━━━━━━━━━

SOLAPI 연동 테스트 메시지입니다.
설정이 정상적으로 완료되었습니다!
"""

            self.log_message("SMS 테스트 발송 중...")
            success = notifier._send_coolsms(test_message.strip())

            if success:
                messagebox.showinfo("성공", f"SMS 테스트 발송 완료!\n수신번호: {', '.join(temp_config['sms']['to_numbers'])}")
                self.log_message("SMS 테스트 발송 성공")
            else:
                messagebox.showerror("실패", "SMS 발송 실패. 로그를 확인하세요.")
                self.log_message("SMS 테스트 발송 실패")

        except Exception as e:
            messagebox.showerror("오류", f"SMS 테스트 발송 오류:\n{str(e)}")
            self.log_message(f"SMS 테스트 오류: {e}")

    def start_monitoring(self):
        """모니터링 시작"""
        self.save_config()

        # 텔레그램 또는 SMS 중 하나는 활성화되어야 함
        if not (self.telegram_enabled_var.get() or self.sms_enabled_var.get()):
            messagebox.showwarning("경고", "텔레그램 또는 SMS 중 최소 1개를 활성화하세요.")
            return

        self.monitoring = True
        self.start_btn.config(state=tk.DISABLED)
        self.stop_btn.config(state=tk.NORMAL)
        self.status_label.config(text="상태: 모니터링 중")

        self.monitoring_thread = threading.Thread(target=self.monitoring_loop, daemon=True)
        self.monitoring_thread.start()

        self.log_message("모니터링 시작")

    def stop_monitoring(self):
        """모니터링 중지"""
        self.monitoring = False
        self.start_btn.config(state=tk.NORMAL)
        self.stop_btn.config(state=tk.DISABLED)
        self.status_label.config(text="상태: 중지 요청됨 (현재 작업 완료 후 중지)")
        self.log_message("모니터링 중지 요청 (현재 크롤링이 완료되면 중지됩니다)")

    def monitoring_loop(self):
        """모니터링 루프"""
        # 모니터링 시작 시 이전 데이터 리셋 (예약 상태가 바뀔 수 있으므로)
        self._reset_wedding_data()

        checker = WeddingChecker()
        notifier = NotificationManager(self.config)
        auto_reserve = AutoReservation()

        check_interval_minutes = self.config.get('check_interval_minutes', 5)

        while self.monitoring:
            try:
                self.update_status("확인 중...")
                current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                self.last_check_label.config(text=f"마지막 확인: {current_time}")

                target_dates = checker.get_target_dates(self.config)
                new_data = checker._get_empty_data()

                # 연구공원 확인
                rp_time_slots = {k: v['enabled'] for k, v in self.config['time_settings']['research_park'].items()}
                rp_data = checker.check_research_park(target_dates, rp_time_slots)
                new_data['research_park'] = rp_data

                # 이라운지 확인
                el_time_slots = {k: v['enabled'] for k, v in self.config['time_settings']['elounge'].items()}
                el_data = checker.check_elounge(target_dates, el_time_slots)
                new_data['elounge'] = el_data

                # 변화 감지
                changes = checker.detect_changes(new_data)

                for change in changes:
                    self.handle_change(change, notifier, auto_reserve)

                checker.save_data(new_data)
                checker.previous_data = new_data

                self.update_status("대기 중...")

                next_check_time = datetime.now() + timedelta(minutes=check_interval_minutes)
                self.next_check_label.config(text=f"다음 확인: {next_check_time.strftime('%Y-%m-%d %H:%M:%S')}")

                for _ in range(check_interval_minutes * 60):
                    if not self.monitoring:
                        break
                    time.sleep(1)

            except Exception as e:
                self.log_message(f"오류: {e}")
                time.sleep(60)

        # 루프 종료 후 상태 업데이트
        self.update_status("중지됨")
        self.log_message("모니터링이 완전히 중지되었습니다")

    def handle_change(self, change, notifier, auto_reserve):
        """변화 처리"""
        venue = change['venue']
        venue_name = change['venue_name']
        date = change['date']
        time_key = change['time']
        status_change = change['change']

        date_obj = datetime.strptime(date, '%Y-%m-%d')
        date_kr = date_obj.strftime('%Y년 %m월 %d일')
        weekday_kr = ['월', '화', '수', '목', '금', '토', '일'][date_obj.weekday()]
        date_formatted = f"{date_kr} ({weekday_kr})"

        time_label = self.get_time_label(time_key)

        if venue == 'research_park':
            rp_settings = self.config['time_settings']['research_park'][time_key]
            auto_reserve_enabled = rp_settings.get('auto_reserve', False)

            if auto_reserve_enabled:
                self.log_message(f"[자동예약 시도] {venue_name} {date_formatted} {time_label}")

                start_msg = notifier.format_auto_reservation_start(
                    venue_name, date_formatted, time_label,
                    RESERVATION_INFO['groom_name'], RESERVATION_INFO['bride_name']
                )
                notifier.send_notification(start_msg)

                result = auto_reserve.reserve(date, time_key)

                if result['success']:
                    success_msg = notifier.format_auto_reservation_success(
                        venue_name, date_formatted, time_label,
                        {'name': RESERVATION_INFO['groom_name'], 'tel': RESERVATION_INFO['groom_tel']},
                        {'name': RESERVATION_INFO['bride_name'], 'tel': RESERVATION_INFO['bride_tel']}
                    )
                    notifier.send_notification(success_msg, 'critical')
                    self.log_message(f"[자동예약 성공] {venue_name} {date_formatted} {time_label}")

                    # 중복 예약 방지를 위해 프로그램 종료
                    self.log_message("=" * 60)
                    self.log_message("🎉 자동예약이 완료되었습니다!")
                    self.log_message("중복 예약을 방지하기 위해 모니터링을 종료합니다.")
                    self.log_message("=" * 60)
                    self.monitoring = False
                    self.update_status("자동예약 완료 - 모니터링 종료")
                else:
                    failure_msg = notifier.format_auto_reservation_failure(
                        venue_name, date_formatted, time_label, result['message']
                    )
                    notifier.send_notification(failure_msg)
                    self.log_message(f"[자동예약 실패] {venue_name} {date_formatted} {time_label}")
            else:
                alert_msg = notifier.format_availability_alert(
                    venue_name, date_formatted, time_label, status_change
                )
                notifier.send_notification(alert_msg)
                self.log_message(f"[예약 가능] {venue_name} {date_formatted} {time_label}")

        elif venue == 'elounge':
            alert_msg = notifier.format_availability_alert(
                venue_name, date_formatted, time_label, status_change, venue_code='elounge'
            )
            notifier.send_notification(alert_msg)
            self.log_message(f"[예약 가능] {venue_name} {date_formatted} {time_label}")

    def get_time_label(self, time_key):
        """시간 키를 라벨로 변환"""
        time_mapping = {
            '11:00': '오전 11시', '13:00': '오후 1시', '14:00': '14:00',
            '15:00': '오후 3시', '17:00': '오후 5시', '18:30': '오후 6시30분'
        }
        return time_mapping.get(time_key, time_key)

    def update_status(self, status):
        """상태 업데이트"""
        self.root.after(0, lambda: self.status_label.config(text=f"상태: {status}"))

    def log_message(self, message):
        """로그 메시지 추가"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}\n"
        self.root.after(0, lambda: self._append_log(log_entry))

    def _append_log(self, log_entry):
        """로그 텍스트에 추가"""
        self.log_text.insert(tk.END, log_entry)
        self.log_text.see(tk.END)


def main():
    # 인증 체크
    if not check_authorization():
        sys.exit(1)

    root = tk.Tk()
    app = WeddingMonitorGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
