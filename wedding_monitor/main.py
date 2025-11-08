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
from wedding_checker import WeddingChecker
from auto_reservation import AutoReservation, RESERVATION_INFO
from notification_manager import NotificationManager


class WeddingMonitorGUI:
    """예식장 예약 모니터링 GUI"""

    def __init__(self, root):
        self.root = root
        self.root.title("예식장 예약 모니터링 프로그램")
        self.root.geometry("800x700")

        self.config_file = "config.json"
        self.monitoring = False
        self.monitoring_thread = None

        # 설정 로드
        self.config = self.load_config()

        # 스크롤 가능한 메인 프레임 생성
        self.create_scrollable_frame()

        # GUI 구성
        self.create_widgets()

        # 설정 적용
        self.apply_config()

    def create_scrollable_frame(self):
        """스크롤 가능한 메인 프레임 생성"""
        # Canvas와 Scrollbar
        canvas = tk.Canvas(self.root)
        scrollbar = ttk.Scrollbar(self.root, orient="vertical", command=canvas.yview)

        # 스크롤 가능한 프레임
        self.scrollable_frame = ttk.Frame(canvas, padding="10")

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

        # ========== 날짜 모니터링 설정 ==========
        date_frame = ttk.LabelFrame(self.scrollable_frame, text="📅 모니터링 설정", padding="10")
        date_frame.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=5, columnspan=2)

        # 방법 1: 기간으로 모니터링
        self.use_range_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(date_frame, text="기간 설정", variable=self.use_range_var).grid(
            row=0, column=0, sticky=tk.W, padx=5
        )

        date_row = ttk.Frame(date_frame)
        date_row.grid(row=1, column=0, sticky=tk.W, padx=20)

        ttk.Label(date_row, text="시작:").pack(side=tk.LEFT, padx=2)
        self.start_date = DateEntry(date_row, width=10, background='darkblue',
                                     foreground='white', borderwidth=2, date_pattern='yyyy-mm-dd')
        self.start_date.pack(side=tk.LEFT, padx=2)

        ttk.Label(date_row, text="종료:").pack(side=tk.LEFT, padx=5)
        self.end_date = DateEntry(date_row, width=10, background='darkblue',
                                   foreground='white', borderwidth=2, date_pattern='yyyy-mm-dd')
        self.end_date.pack(side=tk.LEFT, padx=2)

        weekday_row = ttk.Frame(date_frame)
        weekday_row.grid(row=2, column=0, sticky=tk.W, padx=20, pady=2)

        ttk.Label(weekday_row, text="요일:").pack(side=tk.LEFT, padx=2)
        self.weekday_var = tk.StringVar(value="both")
        ttk.Radiobutton(weekday_row, text="토", variable=self.weekday_var, value="sat").pack(side=tk.LEFT)
        ttk.Radiobutton(weekday_row, text="일", variable=self.weekday_var, value="sun").pack(side=tk.LEFT)
        ttk.Radiobutton(weekday_row, text="토/일", variable=self.weekday_var, value="both").pack(side=tk.LEFT)

        # 방법 2: 특정 날짜
        ttk.Separator(date_frame, orient='horizontal').grid(row=3, column=0, sticky=(tk.W, tk.E), pady=5)

        self.use_specific_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(date_frame, text="특정 날짜", variable=self.use_specific_var).grid(
            row=4, column=0, sticky=tk.W, padx=5
        )

        specific_row = ttk.Frame(date_frame)
        specific_row.grid(row=5, column=0, sticky=(tk.W, tk.E), padx=20)

        self.specific_date_picker = DateEntry(specific_row, width=12, background='darkblue',
                                               foreground='white', borderwidth=2, date_pattern='yyyy-mm-dd')
        self.specific_date_picker.pack(side=tk.LEFT, padx=2)

        ttk.Button(specific_row, text="추가", command=self.add_specific_date, width=8).pack(side=tk.LEFT, padx=2)
        ttk.Button(specific_row, text="삭제", command=self.remove_specific_date, width=8).pack(side=tk.LEFT, padx=2)

        # 특정 날짜 리스트
        list_frame = ttk.Frame(date_frame)
        list_frame.grid(row=6, column=0, sticky=(tk.W, tk.E), padx=20, pady=2)

        self.specific_dates_listbox = tk.Listbox(list_frame, height=4, width=40)
        self.specific_dates_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        list_scroll = ttk.Scrollbar(list_frame, orient="vertical", command=self.specific_dates_listbox.yview)
        list_scroll.pack(side=tk.RIGHT, fill=tk.Y)
        self.specific_dates_listbox.config(yscrollcommand=list_scroll.set)

        # ========== 시간대별 동작 설정 ==========
        time_frame = ttk.LabelFrame(self.scrollable_frame, text="⏰ 시간대별 설정", padding="10")
        time_frame.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=5, columnspan=2)

        # 연구공원
        ttk.Label(time_frame, text="연구공원 웨딩홀", font=('', 9, 'bold')).grid(
            row=0, column=0, columnspan=3, sticky=tk.W, pady=2
        )

        self.rp_time_vars = {}
        self.rp_action_vars = {}
        rp_times = [
            ('11:00', '11시'), ('13:00', '13시'), ('15:00', '15시'),
            ('17:00', '17시'), ('18:30', '18:30')
        ]

        for i, (time_key, time_label) in enumerate(rp_times, start=1):
            self.rp_time_vars[time_key] = tk.BooleanVar(value=True)
            self.rp_action_vars[time_key] = tk.StringVar(value="auto")

            ttk.Checkbutton(time_frame, text=time_label, variable=self.rp_time_vars[time_key]).grid(
                row=i, column=0, sticky=tk.W, padx=5
            )
            ttk.Radiobutton(time_frame, text="자동예약", variable=self.rp_action_vars[time_key],
                            value="auto").grid(row=i, column=1, sticky=tk.W, padx=2)
            ttk.Radiobutton(time_frame, text="알림만", variable=self.rp_action_vars[time_key],
                            value="notify").grid(row=i, column=2, sticky=tk.W, padx=2)

        ttk.Separator(time_frame, orient='horizontal').grid(
            row=6, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=5
        )

        # 이라운지
        ttk.Label(time_frame, text="이라운지 (알림만)", font=('', 9, 'bold')).grid(
            row=7, column=0, columnspan=3, sticky=tk.W, pady=2
        )

        self.el_time_vars = {}
        el_times = [('11:00', '11시'), ('14:00', '14시'), ('17:00', '17시')]

        for i, (time_key, time_label) in enumerate(el_times, start=8):
            self.el_time_vars[time_key] = tk.BooleanVar(value=True)
            ttk.Checkbutton(time_frame, text=time_label, variable=self.el_time_vars[time_key]).grid(
                row=i, column=0, columnspan=3, sticky=tk.W, padx=5
            )

        # ========== 자동 예약 정보 ==========
        auto_frame = ttk.LabelFrame(self.scrollable_frame, text="📝 예약 정보", padding="10")
        auto_frame.grid(row=2, column=0, sticky=(tk.W, tk.E), pady=5, columnspan=2)

        info_text = f"{RESERVATION_INFO['groom_name']} ({RESERVATION_INFO['groom_tel']}), {RESERVATION_INFO['bride_name']} ({RESERVATION_INFO['bride_tel']})\n예상인원: {RESERVATION_INFO['expected_people']}   💡 수정: auto_reservation.py"

        ttk.Label(auto_frame, text=info_text, justify=tk.LEFT, wraplength=700).grid(
            row=0, column=0, sticky=tk.W
        )

        # ========== 알림 설정 (텔레그램 2개) ==========
        notif_frame = ttk.LabelFrame(self.scrollable_frame, text="🔔 텔레그램 설정", padding="10")
        notif_frame.grid(row=3, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5)

        # 2열 레이아웃으로 변경
        # 텔레그램 1
        ttk.Label(notif_frame, text="텔레그램 1", font=('', 9, 'bold')).grid(
            row=0, column=0, sticky=tk.W, padx=5, pady=2
        )

        ttk.Label(notif_frame, text="Bot Token:").grid(row=1, column=0, sticky=tk.W, padx=5)
        self.groom_bot_token = ttk.Entry(notif_frame, width=35)
        self.groom_bot_token.grid(row=2, column=0, padx=5, pady=2, sticky=(tk.W, tk.E))

        ttk.Label(notif_frame, text="Chat ID:").grid(row=3, column=0, sticky=tk.W, padx=5)
        self.groom_chat_id = ttk.Entry(notif_frame, width=35)
        self.groom_chat_id.grid(row=4, column=0, padx=5, pady=2, sticky=(tk.W, tk.E))

        # 텔레그램 2
        ttk.Label(notif_frame, text="텔레그램 2", font=('', 9, 'bold')).grid(
            row=0, column=1, sticky=tk.W, padx=5, pady=2
        )

        ttk.Label(notif_frame, text="Bot Token:").grid(row=1, column=1, sticky=tk.W, padx=5)
        self.bride_bot_token = ttk.Entry(notif_frame, width=35)
        self.bride_bot_token.grid(row=2, column=1, padx=5, pady=2, sticky=(tk.W, tk.E))

        ttk.Label(notif_frame, text="Chat ID:").grid(row=3, column=1, sticky=tk.W, padx=5)
        self.bride_chat_id = ttk.Entry(notif_frame, width=35)
        self.bride_chat_id.grid(row=4, column=1, padx=5, pady=2, sticky=(tk.W, tk.E))

        # 확인 주기
        interval_row = ttk.Frame(notif_frame)
        interval_row.grid(row=5, column=0, columnspan=2, sticky=tk.W, padx=5, pady=5)

        ttk.Label(interval_row, text="확인 주기:").pack(side=tk.LEFT, padx=2)
        self.check_interval = ttk.Spinbox(interval_row, from_=1, to=24, width=5)
        self.check_interval.set(1)
        self.check_interval.pack(side=tk.LEFT, padx=2)
        ttk.Label(interval_row, text="시간마다").pack(side=tk.LEFT, padx=2)

        # ========== 제어 버튼 ==========
        control_frame = ttk.Frame(self.scrollable_frame)
        control_frame.grid(row=4, column=0, columnspan=2, pady=10)

        self.start_btn = ttk.Button(control_frame, text="시작하기", command=self.start_monitoring, width=12)
        self.start_btn.grid(row=0, column=0, padx=5)

        self.stop_btn = ttk.Button(control_frame, text="중지", command=self.stop_monitoring,
                                    width=12, state=tk.DISABLED)
        self.stop_btn.grid(row=0, column=1, padx=5)

        ttk.Button(control_frame, text="설정 저장", command=self.save_config, width=12).grid(row=0, column=2, padx=5)

        # ========== 모니터링 상태 ==========
        status_frame = ttk.LabelFrame(self.scrollable_frame, text="📊 상태", padding="10")
        status_frame.grid(row=5, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5)

        self.status_label = ttk.Label(status_frame, text="상태: 대기중")
        self.status_label.grid(row=0, column=0, sticky=tk.W)

        self.last_check_label = ttk.Label(status_frame, text="마지막 확인: -")
        self.last_check_label.grid(row=1, column=0, sticky=tk.W)

        self.next_check_label = ttk.Label(status_frame, text="다음 확인: -")
        self.next_check_label.grid(row=2, column=0, sticky=tk.W)

        # ========== 알림 기록 ==========
        log_frame = ttk.LabelFrame(self.scrollable_frame, text="🔔 로그", padding="10")
        log_frame.grid(row=6, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5)

        self.log_text = scrolledtext.ScrolledText(log_frame, height=10, width=90)
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E))

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
                'enabled': True,
                'groom': {'bot_token': '', 'chat_id': ''},
                'bride': {'bot_token': '', 'chat_id': ''}
            },
            'check_interval_hours': 1
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
        groom = telegram.get('groom', {})
        bride = telegram.get('bride', {})

        self.groom_bot_token.insert(0, groom.get('bot_token', ''))
        self.groom_chat_id.insert(0, groom.get('chat_id', ''))
        self.bride_bot_token.insert(0, bride.get('bot_token', ''))
        self.bride_chat_id.insert(0, bride.get('chat_id', ''))

        # 확인 주기
        self.check_interval.set(self.config.get('check_interval_hours', 1))

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
                'enabled': True,
                'groom': {
                    'bot_token': self.groom_bot_token.get().strip(),
                    'chat_id': self.groom_chat_id.get().strip()
                },
                'bride': {
                    'bot_token': self.bride_bot_token.get().strip(),
                    'chat_id': self.bride_chat_id.get().strip()
                }
            },
            'check_interval_hours': int(self.check_interval.get())
        }

        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            self.config = config
            messagebox.showinfo("성공", "설정이 저장되었습니다.")
        except Exception as e:
            messagebox.showerror("오류", f"설정 저장 실패: {e}")

    def start_monitoring(self):
        """모니터링 시작"""
        self.save_config()

        if not (self.groom_bot_token.get().strip() or self.bride_bot_token.get().strip()):
            messagebox.showwarning("경고", "최소 1개의 텔레그램 설정이 필요합니다.")
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
        self.status_label.config(text="상태: 중지됨")
        self.log_message("모니터링 중지")

    def monitoring_loop(self):
        """모니터링 루프"""
        checker = WeddingChecker()
        notifier = NotificationManager(self.config)
        auto_reserve = AutoReservation()

        check_interval_hours = self.config.get('check_interval_hours', 1)

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

                next_check_time = datetime.now() + timedelta(hours=check_interval_hours)
                self.next_check_label.config(text=f"다음 확인: {next_check_time.strftime('%Y-%m-%d %H:%M:%S')}")

                for _ in range(check_interval_hours * 3600):
                    if not self.monitoring:
                        break
                    time.sleep(1)

            except Exception as e:
                self.log_message(f"오류: {e}")
                time.sleep(60)

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
                venue_name, date_formatted, time_label, status_change
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
    root = tk.Tk()
    app = WeddingMonitorGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
