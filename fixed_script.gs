// ===== 설정 값 =====
const CONFIG = {
  CALENDAR_ID: 'af8c11023a2934352642684e298afed25b9794967420f9940f7d351bf253de90@group.calendar.google.com',

  SHEET_NAMES: {
    STAFF: '담당자관리',
    SCHEDULE: '일정관리',
    PAYMENT: '결제창관리'
  },

  SCHEDULE_COLS: {
    START_DATE: 1,      // A열 - 시작일
    END_DATE: 2,        // B열 - 종료일
    ROUND: 3,           // C열 - 차수 (1차, 2차 등)
    TITLE: 4,           // D열 - 일정명
    STAFF: 5,           // E열 - 담당자
    CONTENT: 6,         // F열 - 내용
    PAYMENT_DONE: 7,    // G열 - 결제완료 (읽기전용)
    // H, I, J열 - 비고란
    CANCELLED: 11,      // K열 - 일정취소
    EVENT_ID: 12,       // L열 - 팀 캘린더
    PERSONAL_EVENT_ID: 13  // M열 - 개인 캘린더
  },

  PAYMENT_COLS: {
    TRANSFER: 1,        // A열 - 결제창 전달
    COMPLETE: 2,        // B열 - 결제완료
    DATE: 3,            // C열 - 날짜
    TITLE: 4,           // D열 - 일정명
    STAFF: 5,           // E열 - 담당자
    EVENT_ID: 6,        // F열 - 팀 캘린더 이벤트ID (숨김)
    PERSONAL_EVENT_ID: 7  // G열 - 개인 캘린더 이벤트ID (숨김)
  },

  STAFF_COLS: {
    NAME: 1,
    EMAIL: 2,
    COLOR: 3,
    ACTIVE: 4,
    PERSONAL_CAL: 5
  },

  // 노란색 배경색 코드
  WARNING_COLOR: '#ffff00'
};

// ===== 스프레드시트 열릴 때 메뉴 추가 =====
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📅 일정 관리')
    .addItem('👥 개인 캘린더 생성', 'createPersonalCalendars')
    .addItem('➕ 관리자 추가', 'addAdmin')
    .addSeparator()
    .addItem('🔄 드롭다운 새로고침', 'updateStaffDropdown')
    .addItem('🔄 전체 동기화', 'syncAll')
    .addSeparator()
    .addItem('📘 사용 설명서', 'showHelp')
    .addItem('⚙️ 시스템 점검', 'systemCheck')
    .addToUi();
}

// ===== UI: 사용 설명서 =====
function showHelp() {
  const ui = SpreadsheetApp.getUi();
  const helpText =
    '📘 일정 관리 시스템 사용법\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【최초 1회 설정】\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '1. 담당자관리 시트에 담당자 정보 입력\n' +
    '2. 메뉴 → "개인 캘린더 생성" 클릭\n' +
    '3. 메뉴 → "드롭다운 새로고침" 클릭\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【일정 등록하기】\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '1. 일정관리 시트에 일정 입력\n' +
    '   • 시작일, 종료일, 차수, 일정명, 담당자 필수!\n' +
    '2. 메뉴 → "전체 동기화" 클릭\n' +
    '3. 캘린더 자동 생성 + 결제창에 추가됨\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【결제 처리하기】\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '1. 결제창관리 시트로 이동\n' +
    '2. A열(결제창 전달) 체크\n' +
    '3. B열(결제완료) 체크\n' +
    '4. 메뉴 → "전체 동기화" 클릭\n' +
    '5. 캘린더에 [결완] 표시됨\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【관리자 추가하기】\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '메뉴 → "관리자 추가" → 이메일 입력\n' +
    '→ 스프레드시트 + 캘린더 자동 공유됨\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【⚠️ 주의사항】\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '• L, M열(이벤트ID)은 절대 수정 금지!\n' +
    '• 일정 수정 후 반드시 "전체 동기화"\n' +
    '• 문제 발생 시 → "시스템 점검" 확인';

  ui.alert('📘 사용 설명서', helpText, ui.ButtonSet.OK);
}

// ===== UI: 시스템 점검 =====
function systemCheck() {
  const ui = SpreadsheetApp.getUi();

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let report = '⚙️ 시스템 점검 결과\n\n';

    // 1. 팀 캘린더 확인
    const teamCalendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    if (teamCalendar) {
      report += '✅ 팀 캘린더: 정상\n';
    } else {
      report += '❌ 팀 캘린더: 연결 실패\n';
    }

    // 2. 시트 확인
    const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
    const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);
    const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);

    report += scheduleSheet ? '✅ 일정관리 시트: 정상\n' : '❌ 일정관리 시트: 없음\n';
    report += staffSheet ? '✅ 담당자관리 시트: 정상\n' : '❌ 담당자관리 시트: 없음\n';
    report += paymentSheet ? '✅ 결제창관리 시트: 정상\n' : '❌ 결제창관리 시트: 없음\n';

    // 3. G열 보호 확인
    if (scheduleSheet) {
      const protections = scheduleSheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
      let gColProtected = false;
      for (let i = 0; i < protections.length; i++) {
        const range = protections[i].getRange();
        if (range.getColumn() === CONFIG.SCHEDULE_COLS.PAYMENT_DONE) {
          gColProtected = true;
          break;
        }
      }
      report += gColProtected ? '✅ G열 보호: 설정됨\n' : '⚠️ G열 보호: 미설정 (메뉴에서 설정 필요)\n';
    }

    // 4. 담당자 확인
    if (staffSheet) {
      const staffData = staffSheet.getDataRange().getValues();
      let activeCount = 0;
      let personalCalCount = 0;

      for (let i = 1; i < staffData.length; i++) {
        const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];
        const personalCal = staffData[i][CONFIG.STAFF_COLS.PERSONAL_CAL - 1];

        if (isActive === true) {
          activeCount++;
          if (personalCal) {
            personalCalCount++;
          }
        }
      }

      report += '\n【담당자 현황】\n';
      report += '활성 담당자: ' + activeCount + '명\n';
      report += '개인 캘린더: ' + personalCalCount + '/' + activeCount + '개\n';
    }

    // 5. 일정 현황
    if (scheduleSheet) {
      const scheduleData = scheduleSheet.getDataRange().getValues();
      let totalSchedules = 0;
      let withEventId = 0;
      let cancelled = 0;

      for (let i = 1; i < scheduleData.length; i++) {
        const startDate = scheduleData[i][CONFIG.SCHEDULE_COLS.START_DATE - 1];
        const endDate = scheduleData[i][CONFIG.SCHEDULE_COLS.END_DATE - 1];
        const round = scheduleData[i][CONFIG.SCHEDULE_COLS.ROUND - 1];
        const title = scheduleData[i][CONFIG.SCHEDULE_COLS.TITLE - 1];
        const staff = scheduleData[i][CONFIG.SCHEDULE_COLS.STAFF - 1];

        if (startDate && endDate && round && title && staff) {
          totalSchedules++;

          const eventId = scheduleData[i][CONFIG.SCHEDULE_COLS.EVENT_ID - 1];
          if (eventId) {
            withEventId++;
          }

          const isCancelled = scheduleData[i][CONFIG.SCHEDULE_COLS.CANCELLED - 1];
          if (isCancelled === true) {
            cancelled++;
          }
        }
      }

      report += '\n【일정 현황】\n';
      report += '전체 일정: ' + totalSchedules + '개\n';
      report += '캘린더 연동: ' + withEventId + '개\n';
      report += '취소된 일정: ' + cancelled + '개\n';
      report += '미연동 일정: ' + (totalSchedules - withEventId - cancelled) + '개\n';
    }

    report += '\n💡 미연동 일정이 있다면 "전체 동기화"를 실행하세요.';

    ui.alert('⚙️ 시스템 점검', report, ui.ButtonSet.OK);
    Logger.log('✅ 시스템 점검 완료');

  } catch(e) {
    ui.alert('❌ 오류', '시스템 점검 실패: ' + e.message, ui.ButtonSet.OK);
    Logger.log('❌ 시스템 점검 오류: ' + e.message);
  }
}

// ===== 관리자 추가 =====
function addAdmin() {
  const ui = SpreadsheetApp.getUi();

  // 이메일 입력 받기
  const response = ui.prompt(
    '➕ 관리자 추가',
    '추가할 관리자의 이메일 주소를 입력하세요:\n\n' +
    '자동으로 다음 권한이 부여됩니다:\n' +
    '• 스프레드시트 편집 권한\n' +
    '• 팀 캘린더 편집 권한\n' +
    '• 모든 개인 캘린더 보기 권한',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const email = response.getResponseText().trim();

  if (!email) {
    ui.alert('❌ 오류', '이메일 주소를 입력해주세요.', ui.ButtonSet.OK);
    return;
  }

  // 이메일 형식 간단 검증
  if (!email.includes('@') || !email.includes('.')) {
    ui.alert('❌ 오류', '올바른 이메일 형식이 아닙니다.', ui.ButtonSet.OK);
    return;
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);

    let success = 0;
    let errors = 0;
    const errorMessages = [];

    // 1. 스프레드시트 편집자로 추가
    try {
      ss.addEditor(email);
      success++;
      Logger.log('✅ 스프레드시트 편집자 추가: ' + email);
    } catch(e) {
      errors++;
      errorMessages.push('스프레드시트 권한: ' + e.message);
      Logger.log('❌ 스프레드시트 권한 추가 실패: ' + e.message);
    }

    // 2. 팀 캘린더 공유 (편집 권한)
    try {
      Calendar.Acl.insert({
        role: 'writer',
        scope: {
          type: 'user',
          value: email
        }
      }, CONFIG.CALENDAR_ID);
      success++;
      Logger.log('✅ 팀 캘린더 공유: ' + email);
    } catch(e) {
      errors++;
      errorMessages.push('팀 캘린더: ' + e.message);
      Logger.log('❌ 팀 캘린더 공유 실패: ' + e.message);
    }

    // 3. 모든 개인 캘린더 공유 (읽기 권한)
    const staffData = staffSheet.getDataRange().getValues();
    let sharedCalendars = 0;

    for (let i = 1; i < staffData.length; i++) {
      const name = staffData[i][CONFIG.STAFF_COLS.NAME - 1];
      const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];
      const personalCalId = staffData[i][CONFIG.STAFF_COLS.PERSONAL_CAL - 1];

      if (isActive === true && personalCalId) {
        try {
          Calendar.Acl.insert({
            role: 'reader',
            scope: {
              type: 'user',
              value: email
            }
          }, personalCalId);
          sharedCalendars++;
          Logger.log('✅ 개인 캘린더 공유 (' + name + '): ' + email);
        } catch(e) {
          Logger.log('⚠️ 개인 캘린더 공유 실패 (' + name + '): ' + e.message);
        }
      }
    }

    // 결과 메시지
    let message = `관리자 추가 완료!\n\n이메일: ${email}\n\n`;
    message += `【부여된 권한】\n`;
    if (success > 0) {
      message += `✅ 스프레드시트 편집 권한\n`;
      message += `✅ 팀 캘린더 편집 권한\n`;
      if (sharedCalendars > 0) {
        message += `✅ 개인 캘린더 ${sharedCalendars}개 보기 권한\n`;
      }
    }

    if (errors > 0) {
      message += `\n【오류 발생】\n`;
      errorMessages.forEach(msg => {
        message += `⚠️ ${msg}\n`;
      });
    }

    message += '\n💡 관리자가 이메일에서 초대를 수락해야 합니다.';

    ui.alert('✅ 완료', message, ui.ButtonSet.OK);
    Logger.log('✅ 관리자 추가 완료: ' + email + ' (성공: ' + success + ', 오류: ' + errors + ', 캘린더: ' + sharedCalendars + ')');

  } catch(e) {
    ui.alert('❌ 오류', '관리자 추가 중 오류 발생: ' + e.message, ui.ButtonSet.OK);
    Logger.log('❌ 관리자 추가 오류: ' + e.message);
  }
}

// ===== G열 보호 설정 =====
function protectPaymentColumn() {
  const ui = SpreadsheetApp.getUi();

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);

    if (!scheduleSheet) {
      ui.alert('❌ 오류', '일정관리 시트를 찾을 수 없습니다.', ui.ButtonSet.OK);
      return;
    }

    // 기존 보호 제거
    const protections = scheduleSheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    for (let i = 0; i < protections.length; i++) {
      const range = protections[i].getRange();
      if (range.getColumn() === CONFIG.SCHEDULE_COLS.PAYMENT_DONE) {
        protections[i].remove();
      }
    }

    // G열 전체 보호 (헤더 제외)
    const range = scheduleSheet.getRange('G2:G1000');
    const protection = range.protect().setDescription('결제완료 칸 (결제창관리에서만 수정 가능)');

    // 경고만 표시 (스크립트는 수정 가능하도록)
    protection.setWarningOnly(true);

    ui.alert('✅ 완료', 'G열(결제완료) 경고 설정이 완료되었습니다.\n수동 수정 시 경고가 표시되며, 결제창관리에서 자동 업데이트됩니다.', ui.ButtonSet.OK);
    Logger.log('✅ G열 경고 설정 완료');

  } catch(e) {
    ui.alert('❌ 오류', 'G열 보호 설정 실패: ' + e.message, ui.ButtonSet.OK);
    Logger.log('❌ G열 보호 설정 오류: ' + e.message);
  }
}

// ===== L, M열 색상 초기화 =====
function clearEventIdColors() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '색상 초기화',
    'L, M열의 노란색 배경을 모두 제거하시겠습니까?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);

    if (!scheduleSheet) {
      ui.alert('❌ 오류', '일정관리 시트를 찾을 수 없습니다.', ui.ButtonSet.OK);
      return;
    }

    const lastRow = scheduleSheet.getLastRow();

    // L열 색상 제거
    scheduleSheet.getRange(2, CONFIG.SCHEDULE_COLS.EVENT_ID, lastRow - 1, 1).setBackground(null);

    // M열 색상 제거
    scheduleSheet.getRange(2, CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID, lastRow - 1, 1).setBackground(null);

    ui.alert('✅ 완료', 'L, M열의 색상이 초기화되었습니다.', ui.ButtonSet.OK);
    Logger.log('✅ L, M열 색상 초기화 완료');

  } catch(e) {
    ui.alert('❌ 오류', '색상 초기화 실패: ' + e.message, ui.ButtonSet.OK);
    Logger.log('❌ 색상 초기화 오류: ' + e.message);
  }
}

// ===== L, M열 수정 감지 =====
function markEventIdModified(sheet, row, col) {
  try {
    sheet.getRange(row, col).setBackground(CONFIG.WARNING_COLOR);
    Logger.log('⚠️ 이벤트ID 수정 감지: ' + row + '행, ' + col + '열');
  } catch(e) {
    Logger.log('❌ 색상 표시 오류: ' + e.message);
  }
}

// ===== 공통 함수: 날짜 파싱 (종일 일정) =====
function parseEventDateTime(startDateValue, endDateValue) {
  const startDate = new Date(startDateValue);
  const endDate = new Date(endDateValue);

  // 종료일 다음날로 설정 (Google Calendar 종일 일정 규칙)
  const actualEndDate = new Date(endDate);
  actualEndDate.setDate(actualEndDate.getDate() + 1);

  return {
    startDateTime: startDate,
    endDateTime: actualEndDate,
    isAllDay: true
  };
}

// ===== 공통 함수: 일정 제목 생성 =====
function buildEventTitle(staff, round, title, paymentDone) {
  let eventTitle = `[${staff}]`;

  if (paymentDone === true) {
    eventTitle += ' [결완]';
  }

  // 제목을 먼저 붙이고
  eventTitle += ` ${title}`;

  // 라운드는 맨 마지막에 붙임
  if (round) {
    eventTitle += ` [${round}]`;
  }

  return eventTitle;
}



// ===== 담당자 색상 가져오기 =====
function getStaffColor(staffName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);
  const staffData = staffSheet.getDataRange().getValues();

  for (let i = 1; i < staffData.length; i++) {
    const name = staffData[i][CONFIG.STAFF_COLS.NAME - 1];
    const colorCode = staffData[i][CONFIG.STAFF_COLS.COLOR - 1];
    const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];

    if (name === staffName && isActive === true) {
      return colorCode;
    }
  }

  Logger.log('⚠️ 담당자를 찾을 수 없음: ' + staffName + ' (기본 색상 사용)');
  return 1;
}

// ===== 담당자의 개인 캘린더 ID 가져오기 =====
function getStaffPersonalCalendar(staffName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);
  const staffData = staffSheet.getDataRange().getValues();

  for (let i = 1; i < staffData.length; i++) {
    const name = staffData[i][CONFIG.STAFF_COLS.NAME - 1];
    const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];
    const personalCalId = staffData[i][CONFIG.STAFF_COLS.PERSONAL_CAL - 1];

    if (name === staffName && isActive === true) {
      return personalCalId;
    }
  }

  Logger.log('⚠️ 담당자의 개인 캘린더를 찾을 수 없음: ' + staffName);
  return null;
}

// ===== 통합 일정 생성 =====
function createEvent(calendarId, rowData, rowNumber) {
  try {
    if (!calendarId) {
      Logger.log('⚠️ 캘린더 ID 없음');
      return null;
    }

    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      Logger.log('❌ 캘린더를 찾을 수 없음: ' + calendarId);
      return null;
    }

    // 데이터 추출
    const startDateValue = rowData[CONFIG.SCHEDULE_COLS.START_DATE - 1];
    const endDateValue = rowData[CONFIG.SCHEDULE_COLS.END_DATE - 1];
    const round = rowData[CONFIG.SCHEDULE_COLS.ROUND - 1];
    const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1];
    const staff = rowData[CONFIG.SCHEDULE_COLS.STAFF - 1];
    const content = rowData[CONFIG.SCHEDULE_COLS.CONTENT - 1];
    const paymentDone = rowData[CONFIG.SCHEDULE_COLS.PAYMENT_DONE - 1];

    // 필수 값 확인 (A, B, C, D, E 모두 필요)
    if (!startDateValue || !endDateValue || !round || !title || !staff) {
      Logger.log('❌ 필수 값 누락 (시작일, 종료일, 차수, 일정명, 담당자는 필수)');
      return null;
    }

    // 날짜 파싱 (종일 일정)
    const { startDateTime, endDateTime } = parseEventDateTime(startDateValue, endDateValue);

    // 일정 제목
    const eventTitle = buildEventTitle(staff, round, title, paymentDone);

    // 일정 설명
    const description = content || '';

    // 종일 일정 생성
    const event = calendar.createAllDayEvent(eventTitle, startDateTime, endDateTime, {
      description: description
    });

    // 담당자 색상 적용
    const colorCode = getStaffColor(staff);
    event.setColor(colorCode.toString());

    Logger.log('✅ 일정 생성 완료: ' + eventTitle);
    return event.getId();

  } catch(e) {
    Logger.log('❌ 일정 생성 오류: ' + e.message);
    return null;
  }
}

// ===== 통합 일정 업데이트 =====
function updateEvent(calendarId, eventId, rowData, rowNumber) {
  try {
    if (!calendarId || !eventId) {
      Logger.log('⚠️ 캘린더 ID 또는 이벤트 ID 없음');
      return false;
    }

    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      Logger.log('❌ 캘린더를 찾을 수 없음: ' + calendarId);
      return false;
    }

    const event = calendar.getEventById(eventId);
    if (!event) {
      Logger.log('❌ 이벤트를 찾을 수 없음: ' + eventId);
      return false;
    }

    // 데이터 추출
    const startDateValue = rowData[CONFIG.SCHEDULE_COLS.START_DATE - 1];
    const endDateValue = rowData[CONFIG.SCHEDULE_COLS.END_DATE - 1];
    const round = rowData[CONFIG.SCHEDULE_COLS.ROUND - 1];
    const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1];
    const staff = rowData[CONFIG.SCHEDULE_COLS.STAFF - 1];
    const content = rowData[CONFIG.SCHEDULE_COLS.CONTENT - 1];
    const paymentDone = rowData[CONFIG.SCHEDULE_COLS.PAYMENT_DONE - 1];

    // 필수 값 확인
    if (!startDateValue || !endDateValue || !round || !title || !staff) {
      Logger.log('❌ 필수 값 누락');
      return false;
    }

    // 날짜 파싱 (종일 일정)
    const { startDateTime, endDateTime } = parseEventDateTime(startDateValue, endDateValue);

    // 일정 제목
    const eventTitle = buildEventTitle(staff, round, title, paymentDone);

    // 일정 설명
    const description = content || '';

    // 이벤트 업데이트
    event.setTitle(eventTitle);
    event.setAllDayDates(startDateTime, endDateTime);
    event.setDescription(description);

    // 담당자 색상 적용
    const colorCode = getStaffColor(staff);
    event.setColor(colorCode.toString());

    Logger.log('✅ 일정 업데이트 완료: ' + eventTitle);
    return true;

  } catch(e) {
    Logger.log('❌ 일정 업데이트 오류: ' + e.message);
    return false;
  }
}

// ===== 통합 일정 삭제 =====
function deleteEvent(calendarId, eventId, rowNumber) {
  try {
    if (!calendarId || !eventId) {
      Logger.log('⚠️ 캘린더 ID 또는 이벤트 ID 없음');
      return false;
    }

    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      Logger.log('❌ 캘린더를 찾을 수 없음: ' + calendarId);
      return false;
    }

    const event = calendar.getEventById(eventId);
    if (!event) {
      Logger.log('⚠️ 삭제할 이벤트를 찾을 수 없음: ' + eventId);
      return false;
    }

    event.deleteEvent();
    Logger.log('✅ 캘린더 이벤트 삭제 완료');
    return true;

  } catch(e) {
    Logger.log('❌ 이벤트 삭제 오류: ' + e.message);
    return false;
  }
}

// ===== 결제창에서 일정 찾기 (이벤트ID로 매칭) =====
function findScheduleRowByEventId(eventId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
    const scheduleData = scheduleSheet.getDataRange().getValues();

    Logger.log('🔍 이벤트ID로 일정 검색: ' + eventId);

    for (let i = 1; i < scheduleData.length; i++) {
      const rowEventId = scheduleData[i][CONFIG.SCHEDULE_COLS.EVENT_ID - 1];

      if (rowEventId === eventId) {
        Logger.log('✅ 일정 찾음: ' + (i + 1) + '행');
        return i + 1; // 행번호 반환
      }
    }

    Logger.log('⚠️ 일정을 찾을 수 없음 (이벤트ID: ' + eventId + ')');
    return null;

  } catch(e) {
    Logger.log('❌ 일정 찾기 오류: ' + e.message);
    return null;
  }
}

// ===== 결제창에서 행 삭제 (이벤트ID로 매칭) =====
function deleteFromPaymentSheetByEventId(eventId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);
    const paymentData = paymentSheet.getDataRange().getValues();

    // 뒤에서부터 검색 (삭제 시 인덱스 변경 방지)
    for (let i = paymentData.length - 1; i >= 1; i--) {
      const rowEventId = paymentData[i][CONFIG.PAYMENT_COLS.EVENT_ID - 1];

      if (rowEventId === eventId) {
        paymentSheet.deleteRow(i + 1);
        Logger.log('✅ 결제창에서 행 삭제 완료: ' + (i + 1) + '행 (이벤트ID: ' + eventId + ')');
        return true;
      }
    }

    Logger.log('⚠️ 결제창에서 해당 행을 찾지 못함 (이벤트ID: ' + eventId + ')');
    return false;

  } catch(e) {
    Logger.log('❌ 결제창 행 삭제 오류: ' + e.message);
    return false;
  }
}

// ===== 결제창에 자동 추가 (이벤트ID 포함) =====
function addToPaymentSheet(rowData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);

    const startDate = rowData[CONFIG.SCHEDULE_COLS.START_DATE - 1];
    const endDate = rowData[CONFIG.SCHEDULE_COLS.END_DATE - 1];
    const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1];
    const staff = rowData[CONFIG.SCHEDULE_COLS.STAFF - 1];
    const eventId = rowData[CONFIG.SCHEDULE_COLS.EVENT_ID - 1];
    const personalEventId = rowData[CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1];

    if (!startDate || !endDate || !title || !staff || !eventId) {
      Logger.log('⚠️ 결제창 추가 실패: 필수 값 누락 (이벤트ID 필요)');
      return;
    }

    // 날짜 형식: "시작일 ~ 종료일"
    const dateRange = Utilities.formatDate(new Date(startDate), Session.getScriptTimeZone(), 'yyyy-MM-dd') +
                      ' ~ ' +
                      Utilities.formatDate(new Date(endDate), Session.getScriptTimeZone(), 'yyyy-MM-dd');

    const lastRow = paymentSheet.getLastRow();
    const newRow = lastRow + 1;

    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.TRANSFER).insertCheckboxes();
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.COMPLETE).insertCheckboxes();
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.DATE).setValue(dateRange);
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.TITLE).setValue(title);
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.STAFF).setValue(staff);
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.EVENT_ID).setValue(eventId);
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.PERSONAL_EVENT_ID).setValue(personalEventId);

    Logger.log('✅ 결제창 추가 완료: ' + title + ' (이벤트ID: ' + eventId + ')');

  } catch(e) {
    Logger.log('❌ 결제창 추가 오류: ' + e.message);
  }
}

// ===== 결제창에 없으면 추가 (중복 방지 - 이벤트ID로 확인) =====
function addToPaymentSheetIfNotExists(rowData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);

    const eventId = rowData[CONFIG.SCHEDULE_COLS.EVENT_ID - 1];

    if (!eventId) {
      Logger.log('⚠️ 이벤트ID 없음 - 결제창 추가 건너뜀');
      return;
    }

    // 이미 존재하는지 확인 (이벤트ID로)
    const paymentData = paymentSheet.getDataRange().getValues();

    for (let i = 1; i < paymentData.length; i++) {
      const rowEventId = paymentData[i][CONFIG.PAYMENT_COLS.EVENT_ID - 1];

      if (rowEventId === eventId) {
        // 이미 존재함
        Logger.log('⏭️ 결제창에 이미 존재: 이벤트ID ' + eventId);
        return;
      }
    }

    // 없으면 추가
    addToPaymentSheet(rowData);

  } catch(e) {
    Logger.log('❌ 결제창 중복 확인 오류: ' + e.message);
  }
}

// ===== 담당자 드롭다운 새로고침 =====
function updateStaffDropdown() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);
    const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);

    const staffData = staffSheet.getDataRange().getValues();
    const activeStaff = [];

    for (let i = 1; i < staffData.length; i++) {
      const name = staffData[i][CONFIG.STAFF_COLS.NAME - 1];
      const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];

      if (name && isActive === true) {
        activeStaff.push(name);
      }
    }

    if (activeStaff.length === 0) {
      Logger.log('⚠️ 활성화된 담당자가 없습니다');
      return;
    }

    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(activeStaff, true)
      .build();

    const range = scheduleSheet.getRange('E2:E');
    range.setDataValidation(rule);

    Logger.log('✅ 드롭다운 업데이트 완료: ' + activeStaff.join(', '));

  } catch(error) {
    Logger.log('❌ 드롭다운 업데이트 오류: ' + error.message);
  }
}

// ===== 결제창 정보 업데이트 =====
function updatePaymentSheet(rowData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);
    const startDate = rowData[CONFIG.SCHEDULE_COLS.START_DATE - 1];
    const endDate = rowData[CONFIG.SCHEDULE_COLS.END_DATE - 1];
    const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1];
    const staff = rowData[CONFIG.SCHEDULE_COLS.STAFF - 1];

    if (!startDate || !endDate || !title || !staff) return;

    const dateRange = Utilities.formatDate(new Date(startDate), Session.getScriptTimeZone(), "yyyy-MM-dd") +
                      " ~ " +
                      Utilities.formatDate(new Date(endDate), Session.getScriptTimeZone(), "yyyy-MM-dd");
    const paymentData = paymentSheet.getDataRange().getValues();
    const searchDateStr = Utilities.formatDate(new Date(startDate), Session.getScriptTimeZone(), "yyyy-MM-dd");

    for (let i = 1; i < paymentData.length; i++) {
      const rowDateStr = paymentData[i][CONFIG.PAYMENT_COLS.DATE - 1];
      const rowTitle = paymentData[i][CONFIG.PAYMENT_COLS.TITLE - 1];
      const rowStaff = paymentData[i][CONFIG.PAYMENT_COLS.STAFF - 1];

      if (rowDateStr && rowDateStr.toString().includes(searchDateStr) && rowTitle === title && rowStaff === staff) {
        paymentSheet.getRange(i + 1, CONFIG.PAYMENT_COLS.DATE).setValue(dateRange);
        paymentSheet.getRange(i + 1, CONFIG.PAYMENT_COLS.TITLE).setValue(title);
        paymentSheet.getRange(i + 1, CONFIG.PAYMENT_COLS.STAFF).setValue(staff);
        return;
      }
    }

    const lastRow = paymentSheet.getLastRow();
    const newRow = lastRow + 1;
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.TRANSFER).insertCheckboxes();
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.COMPLETE).insertCheckboxes();
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.DATE).setValue(dateRange);
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.TITLE).setValue(title);
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.STAFF).setValue(staff);
  } catch(e) {
    Logger.log('❌ 결제창 업데이트 오류: ' + e.message);
  }
}

// ===== 자동 실행: 일정관리 ↔ 결제창 동기화 =====
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  const row = e.range.getRow();
  const col = e.range.getColumn();

  if (row === 1) return;

  // 일정관리 시트에서 L열(팀 이벤트ID)이 채워지면 → 결제창에 자동 추가
  if (sheetName === CONFIG.SHEET_NAMES.SCHEDULE && col === CONFIG.SCHEDULE_COLS.EVENT_ID) {
    const rowData = sheet.getRange(row, 1, 1, CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID).getValues()[0];
    const eventId = rowData[CONFIG.SCHEDULE_COLS.EVENT_ID - 1];

    if (eventId) {
      Logger.log('📝 L열에 이벤트ID 입력됨 → 결제창 추가 시도');
      addToPaymentSheetIfNotExists(rowData);
    }
    return;
  }

  // M열이 수정되면 경고 (개인 이벤트ID는 자동 생성됨)
  if (sheetName === CONFIG.SHEET_NAMES.SCHEDULE && col === CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID) {
    markEventIdModified(sheet, row, col);
    return;
  }

  // 결제창에서 A, B열 체크박스가 변경되면 → 일정관리의 G열 업데이트
  if (sheetName === CONFIG.SHEET_NAMES.PAYMENT && (col === CONFIG.PAYMENT_COLS.TRANSFER || col === CONFIG.PAYMENT_COLS.COMPLETE)) {
    const paymentSheet = sheet;
    const transferChecked = paymentSheet.getRange(row, CONFIG.PAYMENT_COLS.TRANSFER).getValue();
    const completeChecked = paymentSheet.getRange(row, CONFIG.PAYMENT_COLS.COMPLETE).getValue();
    const eventId = paymentSheet.getRange(row, CONFIG.PAYMENT_COLS.EVENT_ID).getValue();

    if (!eventId) {
      Logger.log('⚠️ 결제창에 이벤트ID 없음 - 일정을 찾을 수 없습니다');
      return;
    }

    const paymentDone = (transferChecked === true && completeChecked === true);

    // 이벤트ID로 일정관리 행 찾기
    const scheduleRow = findScheduleRowByEventId(eventId);
    if (scheduleRow) {
      const scheduleSheet = e.source.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
      scheduleSheet.getRange(scheduleRow, CONFIG.SCHEDULE_COLS.PAYMENT_DONE).setValue(paymentDone);
      Logger.log('✅ 일정관리 G열 업데이트: ' + scheduleRow + '행 → ' + paymentDone);
    }
  }
}

// ===== 개인 캘린더 자동 생성 =====
function createPersonalCalendars() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '개인 캘린더 생성',
    '이미 생성된 캘린더는 건너뜁니다.\n계속하시겠습니까?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);
  const staffData = staffSheet.getDataRange().getValues();

  let created = 0;
  let skipped = 0;
  let errors = 0;

  try {
    for (let i = 1; i < staffData.length; i++) {
      const name = staffData[i][CONFIG.STAFF_COLS.NAME - 1];
      const email = staffData[i][CONFIG.STAFF_COLS.EMAIL - 1];
      const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];
      const existingCalId = staffData[i][CONFIG.STAFF_COLS.PERSONAL_CAL - 1];

      if (!name || !email || isActive !== true) {
        continue;
      }

      if (existingCalId) {
        Logger.log('⏭️ 건너뜀 (이미 존재): ' + name);
        skipped++;
        continue;
      }

      try {
        // 개인 캘린더 생성
        const calendarName = `개인 일정 - ${name}`;
        const calendar = CalendarApp.createCalendar(calendarName);

        // 색상 설정
        const colorCode = staffData[i][CONFIG.STAFF_COLS.COLOR - 1];
        if (colorCode) {
          calendar.setColor(colorCode.toString());
        }

        const calendarId = calendar.getId();

        // 개인 캘린더 공유
        try {
          Calendar.Acl.insert({
            role: 'reader',
            scope: {
              type: 'user',
              value: email
            }
          }, calendarId);
          Logger.log('✅ 개인 캘린더 공유 완료: ' + email);
        } catch(shareError) {
          Logger.log('⚠️ 개인 캘린더 공유 실패: ' + email + ' - ' + shareError.message);
        }

        // 팀 공통 캘린더 공유
        try {
          Calendar.Acl.insert({
            role: 'reader',
            scope: {
              type: 'user',
              value: email
            }
          }, CONFIG.CALENDAR_ID);
          Logger.log('✅ 팀 캘린더 공유 완료: ' + email);
        } catch(teamShareError) {
          Logger.log('⚠️ 팀 캘린더 공유 실패: ' + email + ' - ' + teamShareError.message);
        }

        // 캘린더 ID 저장
        Logger.log('생성된 캘린더 ID: ' + calendarId);
        Logger.log('캘린더 이름: ' + calendar.getName());
        staffSheet.getRange(i + 1, CONFIG.STAFF_COLS.PERSONAL_CAL).setValue(calendarId);

        Logger.log('✅ 생성 완료: ' + name + ' (' + email + ')');
        created++;

        // API 제한 방지
        Utilities.sleep(1000);

      } catch(createError) {
        Logger.log('❌ 캘린더 생성 오류 (' + name + '): ' + createError.message);
        errors++;
      }
    }

    let message = `완료!\n\n생성: ${created}개\n건너뜀: ${skipped}개`;
    if (errors > 0) {
      message += `\n오류: ${errors}개`;
    }
    message += '\n\n📧 각 담당자는 이메일에서 "캘린더 추가"를 클릭해주세요!';

    ui.alert('✅ 개인 캘린더 생성 완료', message, ui.ButtonSet.OK);
    Logger.log(message);

  } catch(e) {
    ui.alert('❌ 오류', '개인 캘린더 생성 중 오류: ' + e.message, ui.ButtonSet.OK);
    Logger.log('❌ 오류: ' + e.message);
  }
}

// ===== 전체 동기화 (결제창 포함) =====
function syncAll() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '전체 동기화',
    '모든 일정과 결제 정보를 캘린더에 동기화하시겠습니까?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
    const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    const scheduleData = scheduleSheet.getDataRange().getValues();

    // 2행부터 처리 (1행은 헤더)
    for (let i = 1; i < scheduleData.length; i++) {
      const rowData = scheduleData[i];
      const rowNumber = i + 1;

      // 필수 값 확인
      const startDate = rowData[CONFIG.SCHEDULE_COLS.START_DATE - 1];
      const endDate = rowData[CONFIG.SCHEDULE_COLS.END_DATE - 1];
      const round = rowData[CONFIG.SCHEDULE_COLS.ROUND - 1];
      const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1];
      const staff = rowData[CONFIG.SCHEDULE_COLS.STAFF - 1];

      if (!startDate || !endDate || !round || !title || !staff) {
        continue; // 빈 행 건너뛰기
      }

      const teamEventId = rowData[CONFIG.SCHEDULE_COLS.EVENT_ID - 1];
      const personalEventId = rowData[CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1];
      const cancelled = rowData[CONFIG.SCHEDULE_COLS.CANCELLED - 1];

      try {
        // 일정 취소된 경우
        if (cancelled === true) {
          if (teamEventId) {
            deleteEvent(CONFIG.CALENDAR_ID, teamEventId, rowNumber);
            deleteFromPaymentSheetByEventId(teamEventId);
          }
          if (personalEventId) {
            const personalCalId = getStaffPersonalCalendar(staff);
            if (personalCalId) {
              deleteEvent(personalCalId, personalEventId, rowNumber);
            }
          }
          scheduleSheet.getRange(rowNumber, CONFIG.SCHEDULE_COLS.EVENT_ID).clearContent();
          scheduleSheet.getRange(rowNumber, CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID).clearContent();
          processed++;
          continue;
        }

        // ===== L열에 이벤트ID가 이미 있으면 기존 이벤트 업데이트 =====
        if (teamEventId) {
          Logger.log('🔄 이미 존재 → 이벤트 업데이트: ' + rowNumber + '행');

          // 팀 캘린더 업데이트
          updateEvent(CONFIG.CALENDAR_ID, teamEventId, rowData, rowNumber);

          // 개인 캘린더 업데이트
          if (personalEventId) {
            const personalCalId = getStaffPersonalCalendar(staff);
            if (personalCalId) {
              updateEvent(personalCalId, personalEventId, rowData, rowNumber);
            }
          }

          processed++;
          continue;
        }

        // 이벤트ID 없으면 새로 생성
        const newTeamEventId = createEvent(CONFIG.CALENDAR_ID, rowData, rowNumber);
        if (newTeamEventId) {
          scheduleSheet.getRange(rowNumber, CONFIG.SCHEDULE_COLS.EVENT_ID).setValue(newTeamEventId);

          const personalCalId = getStaffPersonalCalendar(staff);
          if (personalCalId) {
            const newPersonalEventId = createEvent(personalCalId, rowData, rowNumber);
            if (newPersonalEventId) {
              scheduleSheet.getRange(rowNumber, CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID).setValue(newPersonalEventId);
            }
          }

          // 새로 생성된 이벤트를 결제창에도 추가
          SpreadsheetApp.flush(); // L, M열이 먼저 저장되도록
          const updatedRowData = scheduleSheet.getRange(rowNumber, 1, 1, CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID).getValues()[0];
          addToPaymentSheetIfNotExists(updatedRowData);
        }
        processed++;

        // 10개씩 처리할 때마다 flush
        if (processed % 10 === 0) {
          SpreadsheetApp.flush();
          Logger.log('💾 중간 저장: ' + processed + '개 처리됨');
        }

      } catch(error) {
        Logger.log('오류 (행 ' + rowNumber + '): ' + error.message);
        errors++;
      }
    }

    // 최종 flush
    SpreadsheetApp.flush();

    let message = `동기화 완료!\n\n처리: ${processed}개`;
    if (errors > 0) {
      message += `\n오류: ${errors}개`;
    }
    message += '\n\n💡 기존 일정은 업데이트, 새 일정은 생성되었습니다.';

    ui.alert('✅ 전체 동기화 완료', message, ui.ButtonSet.OK);
    Logger.log('✅ 전체 동기화 완료: 처리 ' + processed + '개, 오류 ' + errors + '개');

  } catch(e) {
    ui.alert('❌ 오류', '전체 동기화 중 오류: ' + e.message, ui.ButtonSet.OK);
    Logger.log('❌ 전체 동기화 오류: ' + e.message);
  }
}
