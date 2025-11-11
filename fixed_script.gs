// ===== 설정 값 =====
const CONFIG = {
  SHEET_NAMES: {
    STAFF: '담당자관리',
    SCHEDULE: '일정관리',
    PAYMENT: '결제창관리',
    STATS: '통계 뷰어',        
    BACKUP: '데이터백업'    
  },

  SCHEDULE_COLS: {
    START_DATE: 1,      // A열 - 시작일
    END_DATE: 2,        // B열 - 종료일
    ROUND: 3,           // C열 - 차수 (1차, 2차 등)
    TITLE: 4,           // D열 - 일정명
    STAFF: 5,           // E열 - 담당자
    CONTENT: 6,         // F열 - 내용
    PAYMENT_DONE: 7,    // G열 - 결제완료 (읽기전용)
    // H, I열 - 비고란
    STAFF_CHANGED: 10,  // J열 - 담당자변경 체크
    CANCELLED: 11,      // K열 - 일정취소
    PERSONAL_EVENT_ID: 12,  // L열 - 개인 캘린더
    OLD_STAFF: 13       // M열 - 이전담당자 (자동)
  },

  PAYMENT_COLS: {
    TRANSFER: 1,        // A열 - 결제창 전달
    COMPLETE: 2,        // B열 - 결제완료
    DATE: 3,            // C열 - 날짜
    TITLE: 4,           // D열 - 일정명
    STAFF: 5,           // E열 - 담당자
    PERSONAL_EVENT_ID: 6  // F열 - 개인 캘린더 이벤트ID
  },

  STAFF_COLS: {
    NAME: 1,
    EMAIL: 2,
    COLOR: 3,
    ACTIVE: 4,
    PERSONAL_CAL: 5
  },

  WARNING_COLOR: '#ffff00'
};

// ===== 스프레드시트 열릴 때 메뉴 추가 =====
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📅 메뉴')
    .addItem('👥 담당자 등록 완료', 'setupNewStaff')  // ← 새로운 메뉴
    .addSeparator()
    .addItem('🔄 드롭다운 새로고침', 'updateStaffDropdown')
    .addItem('🔄 캘린더 동기화', 'syncAll')
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

    '【담당자 등록하기】\n' +
  
    '1. 담당자관리 시트에 담당자 정보(성함,이메일) 입력\n' +
    '2. 메뉴 → "담당자 등록 완료" 클릭\n' +
    '   → 개인 캘린더 생성\n' +
    '   → 스프레드시트 편집 권한 부여\n' +
    '   → 모든 캘린더 공유\n' +
    '3. 메뉴 → "드롭다운 새로고침" 클릭 -> 일정관리 담당자 목록 업데이트\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【일정 등록하기】\n' +

    '1. 일정관리 시트에 일정 입력\n' +
    '  • 파란행, 상태값 기입필수!\n' +
    '2. 상태값 필터링 (완료 제외) → 메뉴 → "캘린더 동기화" 클릭\n' +
    '3. 개인 캘린더 자동 생성(수정) + 결제창에 추가됨\n\n' +
    '  • 동기화는 화면상 표기된 일정만 반영이 되므로 필터링 필수\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【일정 삭제하기】\n' +

    '1. 입력된 일정(파란색)은 첫등록시와 동일해야함\n' +
    '  • 달라졌다면 시트내 [캘린더ID, 결제창관리시트] 캘린더내 [일정] 수동으로 삭제필요!\n' +
    '2. 일정취소 체크 → 상태값(수정)\n' +
    '3. 상태값 필터링 (완료 제외) → 메뉴 → "캘린더 동기화" 클릭\n' +
    '4. 캘린더ID가 없어지면 캘린더 일정 삭제성공!\n\n' +
    '  • 동기화는 화면상 표기된 일정만 반영이 되므로 필터링 필수\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【결제 처리하기】\n' +

    '1. 결제창관리 시트로 이동\n' +
    '2. A열(결제창 전달) 체크\n' +
    '3. B열(결제완료) 체크\n' +
    '4. 일정관리시트로 가서 G열체크여부 확인\n' +
    '5. 상태값 수정 → 상태값 필터링 (완료 제외)\n' +
    '6. 메뉴 → "캘린더 동기화" 클릭\n' +
    '7. 캘린더에 [결완] 표시됨\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【담당자 변경하기】\n' +

    '1. J열(담당자변경) 체크박스를 먼저 체크\n' +
    '   → M열에 현재 담당자 자동 저장됨\n' +
    '2. E열(담당자)을 새 담당자로 변경\n' +
    '3. 상태값 필터링 (완료 제외) → 메뉴 → "캘린더 동기화" 클릭\n' +
    '4. 자동으로 이전 담당자 캘린더에서 삭제\n' +
    '5. 새 담당자 캘린더에 일정 생성\n' +
    '6. J열, M열 자동 초기화\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【⚠️ 주의사항】\n' +

    '• L열(캘린더ID), M열(이전담당자)은 자동 입력되므로 수정 금지!\n' +
    '• 담당자 변경 시: 반드시 J열 체크 먼저 → E열 담당자 변경 순서!\n' +
    '• 캘린더에 등록할 일정은 신규,수정건 반드시 상태값적용, 필터링 후 "캘린더 동기화"\n' +
    '• 신규건은 동기화 후 캘린더ID 입력되면 캘린더에 일정 생성완료\n' +
    '• 문제 발생 시 → "시스템 점검" 확인\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【데이터집계 및 백업 안내】\n' +

    '• 통계뷰어는 최근 3개월 일정 자동 표시\n' +
    '• 매달 1일, 두달전 일정은 자동 백업\n' +
    '• 약 10분마다 자동 갱신\n' +
    '• 데이터시트는 수정 금지\n';

  ui.alert('📘 사용 설명서', helpText, ui.ButtonSet.OK);
}

// ===== UI: 시스템 점검 =====
function systemCheck() {
  const ui = SpreadsheetApp.getUi();

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let report = '⚙️ 시스템 점검 결과\n\n';

    const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
    const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);
    const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);

    report += scheduleSheet ? '✅ 일정관리 시트: 정상\n' : '❌ 일정관리 시트: 없음\n';
    report += staffSheet ? '✅ 담당자관리 시트: 정상\n' : '❌ 담당자관리 시트: 없음\n';
    report += paymentSheet ? '✅ 결제창관리 시트: 정상\n' : '❌ 결제창관리 시트: 없음\n';

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

    if (scheduleSheet) {
      const scheduleData = scheduleSheet.getDataRange().getValues();
      let totalSchedules = 0;
      let withEventId = 0;
      let cancelled = 0;

      for (let i = 1; i < scheduleData.length; i++) {
        const startDate = scheduleData[i][CONFIG.SCHEDULE_COLS.START_DATE - 1];
        const endDate = scheduleData[i][CONFIG.SCHEDULE_COLS.END_DATE - 1];
        const title = scheduleData[i][CONFIG.SCHEDULE_COLS.TITLE - 1];
        const staff = scheduleData[i][CONFIG.SCHEDULE_COLS.STAFF - 1];

        if (startDate && endDate && title && staff) {
          totalSchedules++;

          const eventId = scheduleData[i][CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1];
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

    report += '\n💡 미연동 일정이 있다면 "캘린더 동기화"를 실행하세요.';

    ui.alert('⚙️ 시스템 점검', report, ui.ButtonSet.OK);
    Logger.log('✅ 시스템 점검 완료');

  } catch(e) {
    ui.alert('❌ 오류', '시스템 점검 실패: ' + e.message, ui.ButtonSet.OK);
    Logger.log('❌ 시스템 점검 오류: ' + e.message);
  }
}

// ===== 담당자 등록 완료 (통합 함수) =====
function setupNewStaff() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    '👥 담당자 등록 완료',
    '담당자관리 시트에서 새로 추가된 담당자를 확인하고\n다음 작업을 자동으로 수행합니다:\n\n' +
    '✅ 개인 캘린더 생성\n' +
    '✅ 스프레드시트 편집 권한 부여\n' +
    '✅ 모든 개인 캘린더 공유\n\n' +
    '계속하시겠습니까?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);
  const staffData = staffSheet.getDataRange().getValues();

  let calendarCreated = 0;
  let permissionGranted = 0;
  let calendarShared = 0;
  let skipped = 0;
  let errors = 0;
  const errorMessages = [];

  try {
    // 기존 모든 캘린더 ID 목록 가져오기
    const existingCalendars = [];
    for (let i = 1; i < staffData.length; i++) {
      const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];
      const personalCalId = staffData[i][CONFIG.STAFF_COLS.PERSONAL_CAL - 1];
      
      if (isActive === true && personalCalId) {
        existingCalendars.push(personalCalId);
      }
    }

    // 담당자 처리
    for (let i = 1; i < staffData.length; i++) {
      const name = staffData[i][CONFIG.STAFF_COLS.NAME - 1];
      const email = staffData[i][CONFIG.STAFF_COLS.EMAIL - 1];
      const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];
      const existingCalId = staffData[i][CONFIG.STAFF_COLS.PERSONAL_CAL - 1];

      if (!name || !email || isActive !== true) {
        continue;
      }

      // 1️⃣ 개인 캘린더 생성 (없는 경우만)
      let personalCalId = existingCalId;
      
      if (!existingCalId) {
        try {
          const calendarName = `개인 일정 - ${name}`;
          const calendar = CalendarApp.createCalendar(calendarName);

          const colorCode = staffData[i][CONFIG.STAFF_COLS.COLOR - 1];
          if (colorCode) {
            calendar.setColor(colorCode.toString());
          }

          personalCalId = calendar.getId();
          staffSheet.getRange(i + 1, CONFIG.STAFF_COLS.PERSONAL_CAL).setValue(personalCalId);
          
          calendarCreated++;
          Logger.log('✅ 개인 캘린더 생성: ' + name);
          
          Utilities.sleep(1000);
          
        } catch(createError) {
          Logger.log('❌ 캘린더 생성 오류 (' + name + '): ' + createError.message);
          errorMessages.push(`${name}: 캘린더 생성 실패`);
          errors++;
          continue;
        }
      } else {
        skipped++;
        Logger.log('⏭️ 개인 캘린더 이미 존재: ' + name);
      }

      // 2️⃣ 스프레드시트 편집 권한 부여
      try {
        const editors = ss.getEditors().map(e => e.getEmail());
        
        if (!editors.includes(email)) {
          ss.addEditor(email);
          permissionGranted++;
          Logger.log('✅ 스프레드시트 편집 권한 부여: ' + email);
        } else {
          Logger.log('⏭️ 이미 편집자: ' + email);
        }
      } catch(permError) {
        Logger.log('⚠️ 편집 권한 부여 실패 (' + email + '): ' + permError.message);
        errorMessages.push(`${name}: 편집 권한 부여 실패`);
      }

      // 3️⃣ 담당자 본인 캘린더에 owner 권한
      if (personalCalId) {
        try {
          Calendar.Acl.insert({
            role: 'owner',
            scope: {
              type: 'user',
              value: email
            }
          }, personalCalId);
          Logger.log('✅ 본인 캘린더 owner 권한: ' + email);
        } catch(shareError) {
          Logger.log('⚠️ 본인 캘린더 공유 실패: ' + email + ' - ' + shareError.message);
        }
      }

      // 4️⃣ 모든 기존 캘린더를 이 담당자에게 공유
      if (existingCalendars.length > 0) {
        existingCalendars.forEach(calId => {
          if (calId !== personalCalId) {  // 본인 캘린더 제외
            try {
              Calendar.Acl.insert({
                role: 'owner',
                scope: {
                  type: 'user',
                  value: email
                }
              }, calId);
              calendarShared++;
              Logger.log(`✅ 기존 캘린더 공유 (${email}에게): ${calId}`);
            } catch(shareErr) {
              Logger.log(`⚠️ 기존 캘린더 공유 실패: ${shareErr.message}`);
            }
          }
        });
      }

      // 5️⃣ 이 담당자의 캘린더를 모든 기존 담당자에게 공유
      if (personalCalId) {
        for (let j = 1; j < staffData.length; j++) {
          if (j === i) continue;  // 본인 제외
          
          const otherEmail = staffData[j][CONFIG.STAFF_COLS.EMAIL - 1];
          const otherActive = staffData[j][CONFIG.STAFF_COLS.ACTIVE - 1];
          
          if (otherEmail && otherActive === true) {
            try {
              Calendar.Acl.insert({
                role: 'owner',
                scope: {
                  type: 'user',
                  value: otherEmail
                }
              }, personalCalId);
              Logger.log(`✅ 새 캘린더 공유 (${otherEmail}에게): ${name}`);
            } catch(shareErr) {
              Logger.log(`⚠️ 새 캘린더 공유 실패: ${shareErr.message}`);
            }
          }
        }
      }
    }

    // 결과 메시지
    let message = '✅ 담당자 등록 완료!\n\n';
    message += `【처리 결과】\n`;
    message += `• 개인 캘린더 생성: ${calendarCreated}개\n`;
    message += `• 캘린더 건너뜀: ${skipped}개\n`;
    message += `• 스프레드시트 권한 부여: ${permissionGranted}명\n`;
    message += `• 캘린더 공유: ${calendarShared}건\n`;

    if (errors > 0) {
      message += `\n【오류】\n`;
      errorMessages.forEach(msg => {
        message += `⚠️ ${msg}\n`;
      });
    }

    message += '\n📧 각 담당자는 이메일에서 초대를 수락해주세요!';
    message += '\n💡 이제 "드롭다운 새로고침"을 실행하세요.';

    ui.alert('✅ 완료', message, ui.ButtonSet.OK);
    Logger.log('✅ 담당자 등록 완료');

  } catch(e) {
    ui.alert('❌ 오류', '담당자 등록 중 오류 발생: ' + e.message, ui.ButtonSet.OK);
    Logger.log('❌ 담당자 등록 오류: ' + e.message);
  }
}

// ===== L열 색상 초기화 =====
function clearEventIdColors() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '색상 초기화',
    'L열의 노란색 배경을 모두 제거하시겠습니까?',
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
    scheduleSheet.getRange(2, CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID, lastRow - 1, 1).setBackground(null);

    ui.alert('✅ 완료', 'L열의 색상이 초기화되었습니다.', ui.ButtonSet.OK);
    Logger.log('✅ L열 색상 초기화 완료');

  } catch(e) {
    ui.alert('❌ 오류', '색상 초기화 실패: ' + e.message, ui.ButtonSet.OK);
    Logger.log('❌ 색상 초기화 오류: ' + e.message);
  }
}

// ===== L열 수정 감지 =====
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

  // 다양한 형식의 true 값 처리 (true, "TRUE", "true", 1 등)
  if (paymentDone === true || paymentDone === 'TRUE' || paymentDone === 'true' || paymentDone === 1) {
    eventTitle += ' [결완]';
  }

  eventTitle += ` ${title}`;

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

// ===== 이벤트ID로 담당자 찾기 (담당자 변경 감지용, Calendar API) =====
// ⚠️ 더 이상 사용되지 않음 - M열(이전담당자)로 대체됨. 성능 문제로 제거됨.
// 이 함수는 담당자 수만큼 Calendar API를 호출하여 매우 느렸음 (5초/건)
function getStaffByEventId(eventId) {
  if (!eventId) return null;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);
  const staffData = staffSheet.getDataRange().getValues();

  for (let i = 1; i < staffData.length; i++) {
    const name = staffData[i][CONFIG.STAFF_COLS.NAME - 1];
    const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];
    const personalCalId = staffData[i][CONFIG.STAFF_COLS.PERSONAL_CAL - 1];

    if (isActive === true && personalCalId) {
      try {
        // Calendar API로 이벤트 조회 (존재하면 성공, 없으면 예외 발생)
        Calendar.Events.get(personalCalId, eventId);
        return name;  // 이벤트가 존재하면 담당자명 반환
      } catch(e) {
        // 이벤트가 없으면 다음 캘린더 확인
        continue;
      }
    }
  }

  return null;
}

// ===== 일정 생성 (Calendar API) =====
function createEvent(calendarId, rowData, rowNumber, staffColorMap) {
  try {
    if (!calendarId) {
      Logger.log('⚠️ 캘린더 ID 없음');
      return null;
    }

    const startDateValue = rowData[CONFIG.SCHEDULE_COLS.START_DATE - 1];
    const endDateValue = rowData[CONFIG.SCHEDULE_COLS.END_DATE - 1];
    const round = rowData[CONFIG.SCHEDULE_COLS.ROUND - 1];
    const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1];
    const staff = rowData[CONFIG.SCHEDULE_COLS.STAFF - 1];
    const content = rowData[CONFIG.SCHEDULE_COLS.CONTENT - 1];
    const paymentDone = rowData[CONFIG.SCHEDULE_COLS.PAYMENT_DONE - 1];

    if (!startDateValue || !endDateValue || !title || !staff) {
      Logger.log('❌ 필수 값 누락 (시작일, 종료일, 일정명, 담당자는 필수)');
      return null;
    }

    const { startDateTime, endDateTime } = parseEventDateTime(startDateValue, endDateValue);
    const eventTitle = buildEventTitle(staff, round || '', title, paymentDone);
    const description = content || '';
    // 성능 최적화: 캐시에서 색상 가져오기 (없으면 함수 호출)
    const colorCode = staffColorMap ? (staffColorMap[staff] || 1) : getStaffColor(staff);

    // Calendar API 형식으로 날짜 변환 (yyyy-MM-dd)
    const startDateStr = Utilities.formatDate(startDateTime, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const endDateStr = Utilities.formatDate(endDateTime, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    // Calendar API로 이벤트 생성
    const event = Calendar.Events.insert({
      summary: eventTitle,
      description: description,
      start: { date: startDateStr },
      end: { date: endDateStr },
      colorId: colorCode.toString()
    }, calendarId);

    Logger.log('✅ 일정 생성 완료: ' + eventTitle);
    return event.id;

  } catch(e) {
    Logger.log('❌ 일정 생성 오류: ' + e.message);
    return null;
  }
}

// ===== 일정 업데이트 (Calendar API) =====
function updateEvent(calendarId, eventId, rowData, rowNumber, staffColorMap) {
  try {
    Logger.log(`⏳ ${rowNumber}행 업데이트 시작...`);

    if (!calendarId || !eventId) {
      Logger.log('⚠️ 캘린더 ID 또는 이벤트 ID 없음');
      return false;
    }

    const startDateValue = rowData[CONFIG.SCHEDULE_COLS.START_DATE - 1];
    const endDateValue = rowData[CONFIG.SCHEDULE_COLS.END_DATE - 1];
    const round = rowData[CONFIG.SCHEDULE_COLS.ROUND - 1];
    const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1];
    const staff = rowData[CONFIG.SCHEDULE_COLS.STAFF - 1];
    const content = rowData[CONFIG.SCHEDULE_COLS.CONTENT - 1];
    const paymentDone = rowData[CONFIG.SCHEDULE_COLS.PAYMENT_DONE - 1];

    Logger.log(`  📝 제목: ${title}, G열: ${paymentDone}`);

    if (!startDateValue || !endDateValue || !title || !staff) {
      Logger.log('❌ 필수 값 누락');
      return false;
    }

    const { startDateTime, endDateTime } = parseEventDateTime(startDateValue, endDateValue);
    const eventTitle = buildEventTitle(staff, round || '', title, paymentDone);
    Logger.log(`  🏷️ 생성된 제목: ${eventTitle}`);
    const description = content || '';
    // 성능 최적화: 캐시에서 색상 가져오기 (없으면 함수 호출)
    const colorCode = staffColorMap ? (staffColorMap[staff] || 1) : getStaffColor(staff);

    // Calendar API 형식으로 날짜 변환 (yyyy-MM-dd)
    const startDateStr = Utilities.formatDate(startDateTime, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const endDateStr = Utilities.formatDate(endDateTime, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    // Calendar API로 이벤트 업데이트 (patch는 제공된 필드만 업데이트)
    Logger.log(`  🌐 Calendar API 호출 중... (eventId: ${eventId.substring(0, 10)}...)`);
    const apiStartTime = new Date().getTime();

    Calendar.Events.patch({
      summary: eventTitle,
      description: description,
      start: { date: startDateStr },
      end: { date: endDateStr },
      colorId: colorCode.toString()
    }, calendarId, eventId);

    const apiDuration = new Date().getTime() - apiStartTime;
    Logger.log(`  ✅ Calendar API 완료 (${apiDuration}ms): ${eventTitle}`);
    return true;

  } catch(e) {
    Logger.log('❌ 일정 업데이트 오류: ' + e.message);
    return false;
  }
}

// ===== 일정 삭제 (Calendar API) =====
function deleteEvent(calendarId, eventId, rowNumber) {
  try {
    if (!calendarId || !eventId) {
      Logger.log('⚠️ 캘린더 ID 또는 이벤트 ID 없음');
      return false;
    }

    // Calendar API로 이벤트 삭제
    Calendar.Events.remove(calendarId, eventId);
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
      const rowEventId = scheduleData[i][CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1];

      if (rowEventId === eventId) {
        Logger.log('✅ 일정 찾음: ' + (i + 1) + '행');
        return i + 1;
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

    for (let i = paymentData.length - 1; i >= 1; i--) {
      const rowEventId = paymentData[i][CONFIG.PAYMENT_COLS.PERSONAL_EVENT_ID - 1];

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
    const round = rowData[CONFIG.SCHEDULE_COLS.ROUND - 1];
    const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1];
    const combinedTitle = round ? `${title} [${round}]` : title;
    const staff = rowData[CONFIG.SCHEDULE_COLS.STAFF - 1];
    const eventId = rowData[CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1];

    if (!startDate || !endDate || !title || !staff || !eventId) {
      Logger.log('⚠️ 결제창 추가 실패: 필수 값 누락 (이벤트ID 필요)');
      return;
    }

    const dateRange = Utilities.formatDate(new Date(startDate), Session.getScriptTimeZone(), 'yyyy-MM-dd') +
                      ' ~ ' +
                      Utilities.formatDate(new Date(endDate), Session.getScriptTimeZone(), 'yyyy-MM-dd');

    const lastRow = paymentSheet.getLastRow();
    const newRow = lastRow + 1;

    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.TRANSFER).insertCheckboxes();
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.COMPLETE).insertCheckboxes();
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.DATE).setValue(dateRange);
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.TITLE).setValue(combinedTitle);
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.STAFF).setValue(staff);
    paymentSheet.getRange(newRow, CONFIG.PAYMENT_COLS.PERSONAL_EVENT_ID).setValue(eventId);

    Logger.log('✅ 결제창 추가 완료: ' + title + ' (이벤트ID: ' + eventId + ')');

  } catch(e) {
    Logger.log('❌ 결제창 추가 오류: ' + e.message);
  }
}

// ===== 결제창에 없으면 추가 (중복 방지 - 이벤트ID로 확인) =====
function addToPaymentSheetIfNotExists(rowData, paymentEventIdSet) {
  try {
    const eventId = rowData[CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1];

    if (!eventId) {
      Logger.log('⚠️ 이벤트ID 없음 - 결제창 추가 건너뜀');
      return;
    }

    // 성능 최적화: Set에서 빠르게 확인 (없으면 시트 읽기)
    if (paymentEventIdSet) {
      if (paymentEventIdSet.has(eventId)) {
        Logger.log('⏭️ 결제창에 이미 존재: 이벤트ID ' + eventId);
        return;
      }
      // Set에 추가하여 다음 호출 시 중복 방지
      paymentEventIdSet.add(eventId);
    } else {
      // 캐시 없을 때 (하위 호환성)
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);
      const paymentData = paymentSheet.getDataRange().getValues();

      for (let i = 1; i < paymentData.length; i++) {
        const rowEventId = paymentData[i][CONFIG.PAYMENT_COLS.PERSONAL_EVENT_ID - 1];

        if (rowEventId === eventId) {
          Logger.log('⏭️ 결제창에 이미 존재: 이벤트ID ' + eventId);
          return;
        }
      }
    }

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

// ===== 자동 실행: 일정관리 ↔ 결제창 동기화 =====
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  const row = e.range.getRow();
  const col = e.range.getColumn();

  if (row === 1) return;

  if (sheetName === CONFIG.SHEET_NAMES.SCHEDULE && col === CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID) {
    markEventIdModified(sheet, row, col);
    return;
  }

  // J열(담당자변경) 체크 시 현재 담당자를 M열에 자동 저장
  if (sheetName === CONFIG.SHEET_NAMES.SCHEDULE && col === CONFIG.SCHEDULE_COLS.STAFF_CHANGED) {
    const checked = e.value;
    if (checked === true || checked === 'TRUE') {
      const currentStaff = sheet.getRange(row, CONFIG.SCHEDULE_COLS.STAFF).getValue();
      if (currentStaff) {
        sheet.getRange(row, CONFIG.SCHEDULE_COLS.OLD_STAFF).setValue(currentStaff);
        Logger.log(`📝 이전담당자 저장: ${row}행, ${currentStaff}`);
      }
    }
    return;
  }

  if (sheetName === CONFIG.SHEET_NAMES.PAYMENT && (col === CONFIG.PAYMENT_COLS.TRANSFER || col === CONFIG.PAYMENT_COLS.COMPLETE)) {
    const paymentSheet = sheet;
    const transferChecked = paymentSheet.getRange(row, CONFIG.PAYMENT_COLS.TRANSFER).getValue();
    const completeChecked = paymentSheet.getRange(row, CONFIG.PAYMENT_COLS.COMPLETE).getValue();
    const eventId = paymentSheet.getRange(row, CONFIG.PAYMENT_COLS.PERSONAL_EVENT_ID).getValue();

    if (!eventId) {
      Logger.log('⚠️ 결제창에 이벤트ID 없음 - 일정을 찾을 수 없습니다');
      return;
    }

    const paymentDone = (transferChecked === true && completeChecked === true);

    const scheduleRow = findScheduleRowByEventId(eventId);
    if (scheduleRow) {
      const scheduleSheet = e.source.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
      scheduleSheet.getRange(scheduleRow, CONFIG.SCHEDULE_COLS.PAYMENT_DONE).setValue(paymentDone);
      Logger.log('✅ 일정관리 G열 업데이트: ' + scheduleRow + '행 → ' + paymentDone);
    }
  }
}


///////////////////////////////////////////////////////////////////////////////////////
function syncAll() {
  const ui = SpreadsheetApp.getUi();
  const MAX_BATCH = 120;
  const MAX_EXECUTION_TIME = 5 * 60 * 1000;
  const startTime = new Date().getTime();

  const response = ui.alert(
    '⚙️ 캘린더 동기화',
    `현재 필터링된 일정을 동기화합니다.\n\n⚠️ 최대 ${MAX_BATCH}개까지 처리됩니다.\n\n계속하시겠습니까?`,
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SCHEDULE);
  const staffSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.STAFF);

  try {
    const filter = sheet.getFilter();
    if (!filter) {
      ui.alert('❌ 필터 필요', '먼저 필터를 설정해주세요!', ui.ButtonSet.OK);
      return;
    }

    // 직원 캘린더 & 색상 캐시 (성능 최적화: 한 번만 읽기)
    const staffData = staffSheet.getDataRange().getValues();
    const staffCalendarMap = {};
    const staffColorMap = {};
    for (let i = 1; i < staffData.length; i++) {
      const name = staffData[i][CONFIG.STAFF_COLS.NAME - 1];
      const isActive = staffData[i][CONFIG.STAFF_COLS.ACTIVE - 1];
      const calId = staffData[i][CONFIG.STAFF_COLS.PERSONAL_CAL - 1];
      const colorCode = staffData[i][CONFIG.STAFF_COLS.COLOR - 1];
      if (name && isActive === true && calId) {
        staffCalendarMap[name] = calId;
        staffColorMap[name] = colorCode || 1;  // 기본 색상 1
      }
    }

    // 결제창 이벤트ID 캐시 (성능 최적화: 한 번만 읽기)
    const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);
    const paymentData = paymentSheet.getDataRange().getValues();
    const paymentEventIdSet = new Set();
    for (let i = 1; i < paymentData.length; i++) {
      const eventId = paymentData[i][CONFIG.PAYMENT_COLS.PERSONAL_EVENT_ID - 1];
      if (eventId) {
        paymentEventIdSet.add(eventId);
      }
    }

    const allData = sheet.getDataRange().getValues();
    const totalRows = allData.length;
    let workRows = [];
    let skippedReasons = [];

    for (let i = 1; i < totalRows; i++) {
      const rowNumber = i + 1;
      if (sheet.isRowHiddenByFilter(rowNumber)) continue;
      const rowData = allData[i];
      const startDate = rowData[CONFIG.SCHEDULE_COLS.START_DATE - 1];
      const endDate = rowData[CONFIG.SCHEDULE_COLS.END_DATE - 1];
      const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1];
      const staff = rowData[CONFIG.SCHEDULE_COLS.STAFF - 1];
      const calId = staffCalendarMap[staff];

      if (!startDate || !endDate || !title || !staff || !calId) {
        let reason = `${rowNumber}행 스킵:`;
        if (!startDate) reason += ' 시작일없음';
        if (!endDate) reason += ' 종료일없음';
        if (!title) reason += ' 제목없음';
        if (!staff) reason += ' 담당자없음';
        if (staff && !calId) reason += ` ${staff}의캘린더ID없음`;
        skippedReasons.push(reason);
        continue;
      }
      workRows.push(i);
    }

    Logger.log(`📊 필터링 결과: ${workRows.length}개 처리 예정`);
    if (skippedReasons.length > 0) {
      Logger.log(`⚠️ 스킵된 행: ${skippedReasons.join(', ')}`);
    }

    if (workRows.length === 0) {
      ui.alert('⚠️ 처리할 일정 없음', '필터링된 일정이 없거나 모든 행이 필수 값 누락으로 스킵되었습니다.\n\n로그를 확인하세요.', ui.ButtonSet.OK);
      return;
    }

    const totalRowsToProcess = Math.min(workRows.length, MAX_BATCH);
    let processed = 0, errors = 0;
    let lastProcessedRow = 0, lastProcessedTitle = '';
    let flushCounter = 0;
    const FLUSH_INTERVAL = 15; // 15개마다 flush

    for (let w = 0; w < totalRowsToProcess; w++) {
      const elapsed = new Date().getTime() - startTime;
      if (elapsed > MAX_EXECUTION_TIME) {
        // 타임아웃 전에 남은 변경사항 저장
        if (flushCounter > 0) {
          SpreadsheetApp.flush();
        }
        ui.alert('⏱️ 타임아웃', `5분이 경과하여 안전하게 중단되었습니다.\n\n✅ 처리: ${processed}개\n📍 마지막 처리: ${lastProcessedRow}행 - ${lastProcessedTitle}`, ui.ButtonSet.OK);
        break;
      }
      const i = workRows[w];
      const rowNumber = i + 1;
      const rowData = allData[i];
      const startDate = rowData[CONFIG.SCHEDULE_COLS.START_DATE - 1];
      const endDate = rowData[CONFIG.SCHEDULE_COLS.END_DATE - 1];
      const title = rowData[CONFIG.SCHEDULE_COLS.TITLE - 1];
      const staff = rowData[CONFIG.SCHEDULE_COLS.STAFF - 1];
      const cancelled = rowData[CONFIG.SCHEDULE_COLS.CANCELLED - 1];
      const staffChanged = rowData[CONFIG.SCHEDULE_COLS.STAFF_CHANGED - 1];
      const personalEventId = rowData[CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1];
      const calId = staffCalendarMap[staff];

      // 방어 코드: calId 없으면 skip
      if (!calId) {
        Logger.log(`⚠️ ${rowNumber}행: ${staff} 담당자의 캘린더 ID 없음`);
        errors++;
        continue;
      }

      try {
        // === 담당자 변경 감지 (J열 체크됨) ===
        if (staffChanged === true && personalEventId) {
          // M열에서 이전 담당자 읽기 (Calendar API 호출 없음!)
          const oldStaff = rowData[CONFIG.SCHEDULE_COLS.OLD_STAFF - 1];

          if (oldStaff && oldStaff !== staff) {
            const oldCalId = staffCalendarMap[oldStaff];
            if (oldCalId) {
              deleteEvent(oldCalId, personalEventId, rowNumber);
              Logger.log(`🔄 담당자 변경: ${oldStaff} → ${staff} (${rowNumber}행)`);
            }
          }

          const newEventId = createEvent(calId, rowData, rowNumber, staffColorMap);
          if (newEventId) {
            sheet.getRange(rowNumber, CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID).setValue(newEventId);
            deleteFromPaymentSheetByEventId(personalEventId);
            // 수정: rowData 업데이트해서 전달 (flush 전이라 getValues() 사용 불가)
            const updatedRowData = rowData.slice();
            updatedRowData[CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1] = newEventId;
            addToPaymentSheetIfNotExists(updatedRowData, paymentEventIdSet);
          }

          // J열 체크 해제, M열 초기화
          sheet.getRange(rowNumber, CONFIG.SCHEDULE_COLS.STAFF_CHANGED).setValue(false);
          sheet.getRange(rowNumber, CONFIG.SCHEDULE_COLS.OLD_STAFF).clearContent();

          processed++; lastProcessedRow = rowNumber; lastProcessedTitle = title;
          flushCounter++;
          if (flushCounter >= FLUSH_INTERVAL) {
            SpreadsheetApp.flush();
            flushCounter = 0;
          }
          continue;
        }

        // === 취소 일정 ===
        if (cancelled === true && personalEventId) {
          deleteEvent(calId, personalEventId, rowNumber);
          deleteFromPaymentSheetByEventId(personalEventId);
          sheet.getRange(rowNumber, CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID).clearContent();
          processed++; lastProcessedRow = rowNumber; lastProcessedTitle = title;
          flushCounter++;
          if (flushCounter >= FLUSH_INTERVAL) {
            SpreadsheetApp.flush();
            flushCounter = 0;
          }
          continue;
        }

        // === 이벤트 생성/업데이트 ===
        if (!personalEventId) {
          const newEventId = createEvent(calId, rowData, rowNumber, staffColorMap);
          if (newEventId) {
            sheet.getRange(rowNumber, CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID).setValue(newEventId);
            // 신규 생성 시 결제창 추가
            const updatedRowData = rowData.slice();
            updatedRowData[CONFIG.SCHEDULE_COLS.PERSONAL_EVENT_ID - 1] = newEventId;
            addToPaymentSheetIfNotExists(updatedRowData, paymentEventIdSet);
          }
        } else {
          updateEvent(calId, personalEventId, rowData, rowNumber, staffColorMap);
        }

        processed++; lastProcessedRow = rowNumber; lastProcessedTitle = title;
        flushCounter++;
        if (flushCounter >= FLUSH_INTERVAL) {
          SpreadsheetApp.flush();
          flushCounter = 0;
        }
      } catch (err) {
        errors++;
        Logger.log(`❌ ${rowNumber}행 처리 오류 (${title}): ${err.message}`);
      }
    }

    // 마지막 남은 변경사항 flush
    if (flushCounter > 0) {
      SpreadsheetApp.flush();
    }

    ui.alert(
      '✅ 캘린더 동기화 완료',
      `처리: ${processed}개\n❌ 오류: ${errors}개\n📍 마지막 처리: ${lastProcessedRow}행 (${lastProcessedTitle})`,
      ui.ButtonSet.OK
    );
  } catch (e) {
    ui.alert('❌ 오류', `캘린더 동기화 중 오류: ${e.message}`, ui.ButtonSet.OK);
  }
}




// ===== 통계 업데이트 =====
function updateStatistics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const src = ss.getSheetByName(CONFIG.SHEET_NAMES.PAYMENT);
  const stats = ss.getSheetByName(CONFIG.SHEET_NAMES.STATS);
  const backup = ss.getSheetByName(CONFIG.SHEET_NAMES.BACKUP);

  if (!src || !stats || !backup) {
    throw new Error("결제창관리 / 통계뷰어 / 데이터백업 시트 중 일부가 없습니다.");
  }

  const data = src.getDataRange().getValues().slice(1);
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const monthlyMap = new Map();
  const staffMap = new Map();
  const toBackup = [];

  data.forEach(row => {
    const dateRange = row[CONFIG.PAYMENT_COLS.DATE - 1];
    const influencer = row[CONFIG.PAYMENT_COLS.TITLE - 1];
    const staff = row[CONFIG.PAYMENT_COLS.STAFF - 1];
    if (!dateRange || !staff) return;

    const [startText] = String(dateRange).split("~").map(v => v.trim());
    const startDate = new Date(startText);
    if (isNaN(startDate)) return;

    if (startDate < threeMonthsAgo) {
      toBackup.push(row);
      return;
    }

    const ym = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap.has(ym)) monthlyMap.set(ym, []);
    monthlyMap.get(ym).push({ dateRange, influencer, staff });

    if (!staffMap.has(staff)) staffMap.set(staff, []);
    staffMap.get(staff).push({ dateRange, influencer, ym });
  });

  stats.clear();

  const months = [];
  for (let i = -1; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getMonth() + 1}월`;
    months.push({ ym, label });
  }

  const sortedStaffs = Array.from(staffMap.keys()).sort();
  const header = ["일정", "인플루언서명", "담당자"];
  const colGap = 1;
  let startCol = 1;

  months.forEach(({ ym, label }) => {
    const title = `📅 ${label} 일정 목록`;

    stats.getRange(1, startCol, 1, header.length)
      .merge()
      .setValue(title)
      .setFontWeight("bold")
      .setFontSize(10)
      .setBackground("#c7e1f5")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(false)
      .setBorder(true, true, true, true, true, true);

    stats.getRange(2, startCol, 1, header.length)
      .setValues([header])
      .setFontWeight("bold")
      .setBackground("#d9e1f2")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(false)
      .setBorder(true, true, true, true, true, true);

    const items = monthlyMap.get(ym)?.sort((a, b) => new Date(a.dateRange) - new Date(b.dateRange)) || [];
    let rows = items.map(it => [it.dateRange, it.influencer, it.staff]);
    if (rows.length === 0) rows = [["", "", ""]];

    stats.getRange(3, startCol, rows.length, header.length)
      .setValues(rows)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(false)
      .setBorder(true, true, true, true, true, true);

    startCol += header.length + colGap;
  });

  sortedStaffs.forEach((label) => {
    const title = `👤 ${label} 일정 목록`;

    stats.getRange(1, startCol, 1, header.length)
      .merge()
      .setValue(title)
      .setFontWeight("bold")
      .setFontSize(10)
      .setBackground("#f9d5b2")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(false)
      .setBorder(true, true, true, true, true, true);

    stats.getRange(2, startCol, 1, header.length)
      .setValues([header])
      .setFontWeight("bold")
      .setBackground("#fde9d9")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(false)
      .setBorder(true, true, true, true, true, true);

    const items = staffMap.get(label)?.sort((a, b) => new Date(a.dateRange) - new Date(b.dateRange)) || [];
    let rows = items.map(it => [it.dateRange, it.influencer, label]);
    if (rows.length === 0) rows = [["", "", ""]];

    stats.getRange(3, startCol, rows.length, header.length)
      .setValues(rows)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(false)
      .setBorder(true, true, true, true, true, true);

    startCol += header.length + colGap;
  });

  const totalRows = stats.getLastRow();
  for (let r = 1; r <= totalRows; r++) stats.setRowHeight(r, 26);

  if (toBackup.length > 0) {
    const header = ["일정", "인플루언서명", "담당자"];
    const monthGroups = {};

    toBackup.forEach(row => {
      const dateRange = row[CONFIG.PAYMENT_COLS.DATE - 1];
      const [startText] = String(dateRange).split("~").map(v => v.trim());
      const startDate = new Date(startText);
      if (isNaN(startDate)) return;
      const ym = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
      if (!monthGroups[ym]) monthGroups[ym] = [];
      monthGroups[ym].push(row);
    });

    Object.keys(monthGroups).sort().reverse().forEach(ym => {
      const rows = monthGroups[ym];
      const staffs = {};
      rows.forEach(r => {
        const staff = r[CONFIG.PAYMENT_COLS.STAFF - 1];
        if (!staffs[staff]) staffs[staff] = [];
        staffs[staff].push(r);
      });

      const blockHeight = 2 + rows.length + (Object.keys(staffs).length * (rows.length + 3));
      backup.insertRowsBefore(1, blockHeight + 2);

      let startRow = 1;

      backup.getRange(startRow, 1, 1, header.length)
        .merge()
        .setValue(`📅 ${ym} 일정 백업`)
        .setFontWeight("bold")
        .setBackground("#c7e1f5");
      startRow++;

      backup.getRange(startRow, 1, 1, header.length)
        .setValues([header])
        .setFontWeight("bold")
        .setBackground("#d9e1f2");
      startRow++;

      const monthRows = rows.map(r => [
        r[CONFIG.PAYMENT_COLS.DATE - 1],
        r[CONFIG.PAYMENT_COLS.TITLE - 1],
        r[CONFIG.PAYMENT_COLS.STAFF - 1]
      ]);
      backup.getRange(startRow, 1, monthRows.length, header.length)
        .setValues(monthRows)
        .setBorder(true, true, true, true, true, true);
      startRow += monthRows.length + 1;

      Object.keys(staffs).sort().forEach(staff => {
        backup.getRange(startRow, 1, 1, header.length)
          .merge()
          .setValue(`👤 ${staff} 일정 목록`)
          .setFontWeight("bold")
          .setBackground("#fde9d9");
        startRow++;

        backup.getRange(startRow, 1, 1, header.length)
          .setValues([header])
          .setFontWeight("bold")
          .setBackground("#f9d5b2");
        startRow++;

        const staffRows = staffs[staff].map(r => [
          r[CONFIG.PAYMENT_COLS.DATE - 1],
          r[CONFIG.PAYMENT_COLS.TITLE - 1],
          staff
        ]);
        backup.getRange(startRow, 1, staffRows.length, header.length)
          .setValues(staffRows)
          .setBorder(true, true, true, true, true, true);
        startRow += staffRows.length + 1;
      });
    });

    Logger.log(`📦 백업 완료: ${toBackup.length}행 (${Object.keys(monthGroups).length}개월) 이동됨`);
  }

  SpreadsheetApp.flush();
}
